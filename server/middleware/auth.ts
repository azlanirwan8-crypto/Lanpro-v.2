import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

export interface UserSession {
  token: string;
  ip: string;
  browser: string;
  device: string;
  lastActiveAt: number;
  browserSessionId?: string;
}

export const activeUserSessions = new Map<string, UserSession>();

export const getJwtSecret = (): string => {
  return process.env.JWT_SECRET || '1231231231492340234wewefsfsdfsfwe534534tf5654654';
};

export const generateToken = (user: any): string => {
  return jwt.sign(
    { id: user.id, uid: user.uid, username: user.username, role: user.role, displayName: user.displayName },
    getJwtSecret(),
    { expiresIn: '2h' }
  );
};

export const verifyGlobalAdmin = (req: any, res: Response, next: NextFunction) => {
  if (req.user?.role === 'admin') {
    next();
  } else {
    res.status(403).json({ status: "error", message: "Akses ditolak: Hanya Global Admin yang memiliki izin." });
  }
};

export const authenticateJWT = (req: any, res: Response, next: NextFunction) => {
  const authHeader = req.headers?.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ 
      status: "error", 
      message: "Akses ditolak: Token autentikasi tidak ditemukan." 
    });
  }

  if (authHeader.startsWith('Bearer ')) {
    const parts = authHeader.split(' ');
    const token = parts.length === 2 ? parts[1] : null;
    
    if (!token) {
      return res.status(401).json({ 
        status: "error", 
        message: "Format token tidak valid." 
      });
    }

    jwt.verify(token, getJwtSecret(), (err: any, user: any) => {
      if (err) {
        return res.status(401).json({ 
          status: "error", 
          message: "Sesi Anda telah berakhir atau token tidak valid. Silakan login kembali." 
        });
      }

      // Single login concurrent session check
      const userId = user.id || user.uid;
      if (userId) {
        const activeSession = activeUserSessions.get(userId.toString());
        if (activeSession && activeSession.token !== token) {
          return res.status(401).json({
            status: "error",
            message: "Sesi Anda telah diakhiri karena akun Anda telah masuk di perangkat/browser lain."
          });
        }
      }

      req.user = user;
      next();
    });
  } else {
    res.status(401).json({ 
      status: "error", 
      message: "Akses ditolak: Format Authorization bukan Bearer." 
    });
  }
};
