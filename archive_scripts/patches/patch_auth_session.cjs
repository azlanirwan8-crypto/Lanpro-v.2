const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const importUaParser = `import { UAParser } from 'ua-parser-js';\n\n// Active sessions for concurrent control\nconst activeUserSessions = new Map<string, { token: string, ip: string, browser: string, device: string, lastActiveAt: number }>();\n`;

if (!code.includes('UAParser')) {
  code = code.replace(
    'import { Server } from "socket.io";',
    'import { Server } from "socket.io";\n' + importUaParser
  );
}

// modify login endpoint
const loginRegex = /app\.post\("\/api\/auth\/login", async \(req, res\) => \{[\s\S]*?const token = generateToken\(user\);/m;

const loginReplacement = `app.post("/api/auth/login", async (req, res) => {
    let connection;
    try {
      const { username, password, force } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ status: "error", message: "Username/Email dan Password wajib diisi." });
      }

      connection = await mysqlPool.getConnection();
      const [rows]: any = await connection.query(
        "SELECT * FROM Users WHERE username = ? OR email = ?",
        [username, username]
      );

      // Generic authentication error payload to prevent User Enumeration
      const genericAuthError = {
        status: "error",
        message: "Email atau password yang Anda masukkan salah."
      };

      if (rows.length === 0) {
        return res.status(401).json(genericAuthError);
      }

      const user = rows[0];
      const userId = user.id || user.uid;
      
      // Strict password verification with constant-time comparison
      if (!(await verifyPassword(password, user.passwordHash, user.username))) { 
        return res.status(401).json(genericAuthError);
      }

      if (user.status === 'rejected') { 
        return res.status(403).json({ status: "error", message: "Akun Anda telah ditolak oleh Admin." });
      }

      if (user.status === 'pending') { 
        return res.status(403).json({ status: "pending", message: "Akun Anda belum aktif. Silakan hubungi admin atau verifikasi email Anda." });
      }

      // --- SESSION COLLISION CHECK ---
      const activeSession = activeUserSessions.get(userId.toString());
      if (activeSession && !force) {
        // Cek jika sesi aktif belum expired (misal asumsi aktif jika lastActive < 24 jam)
        const ONE_DAY = 24 * 60 * 60 * 1000;
        if (Date.now() - activeSession.lastActiveAt < ONE_DAY) {
           return res.status(409).json({
             status: "conflict",
             message: "Akun Anda Masih Aktif di perangkat lain.",
             activeSession
           });
        }
      }

      const token = generateToken(user);
      
      // --- STORE SESSION METADATA ---
      const parser = new UAParser(req.headers['user-agent']);
      const browserInfo = parser.getBrowser();
      const osInfo = parser.getOS();
      const deviceInfo = parser.getDevice();
      
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown IP';
      const browser = \`\${browserInfo.name || 'Unknown Browser'} \${browserInfo.version || ''}\`.trim();
      let device = \`\${osInfo.name || 'Unknown OS'} \${osInfo.version || ''}\`.trim();
      if (deviceInfo.vendor || deviceInfo.model) {
        device += \` (\${deviceInfo.vendor || ''} \${deviceInfo.model || ''})\`.trim();
      }

      activeUserSessions.set(userId.toString(), {
        token,
        ip: String(ip),
        browser,
        device,
        lastActiveAt: Date.now()
      });

      if (force) {
        // Broadcast force logout event to old sessions
        io.emit("FORCE_LOGOUT_EVENT", { userId: userId.toString(), newToken: token });
      }`;

code = code.replace(loginRegex, loginReplacement);

// Add force-logout endpoint explicitly
const forceLogoutEndpoint = `
  app.post("/api/auth/force-logout", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) return res.status(400).json({ status: "error" });
      
      const connection = await mysqlPool.getConnection();
      const [rows]: any = await connection.query(
        "SELECT * FROM Users WHERE username = ? OR email = ?",
        [username, username]
      );
      connection.release();

      if (rows.length === 0) return res.status(401).json({ status: "error" });
      const user = rows[0];
      const userId = user.id || user.uid;

      if (!(await verifyPassword(password, user.passwordHash, user.username))) { 
        return res.status(401).json({ status: "error" });
      }

      const token = generateToken(user);
      
      const parser = new UAParser(req.headers['user-agent']);
      const browserInfo = parser.getBrowser();
      const osInfo = parser.getOS();
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown IP';
      const browser = \`\${browserInfo.name || 'Unknown'} \${browserInfo.version || ''}\`.trim();
      const device = \`\${osInfo.name || 'Unknown'} \${osInfo.version || ''}\`.trim();

      activeUserSessions.set(userId.toString(), {
        token,
        ip: String(ip),
        browser,
        device,
        lastActiveAt: Date.now()
      });

      io.emit("FORCE_LOGOUT_EVENT", { userId: userId.toString(), newToken: token });

      return res.json({
        status: "success",
        user: {
          id: user.id,
          uid: user.uid,
          username: user.username,
          displayName: user.displayName,
          email: user.email,
          role: user.role,
          status: user.status
        },
        token
      });
    } catch (e) {
      return res.status(500).json({ status: "error" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    const userId = req.body.userId;
    if (userId) activeUserSessions.delete(userId.toString());
    res.json({ status: "success" });
  });
`;

code = code.replace('app.post("/api/auth/register",', forceLogoutEndpoint + '\n\n  app.post("/api/auth/register",');

fs.writeFileSync('server.ts', code);
console.log("Patched server.ts with auth session logic");
