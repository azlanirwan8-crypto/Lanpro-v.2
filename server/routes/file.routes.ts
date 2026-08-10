import express from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import jwt from "jsonwebtoken";
import { authenticateJWT, getJwtSecret } from "../middleware/auth";
import { validateFileBuffer, sanitizeFilename, generatePresignedUrl, verifyPresignedToken } from "../../src/lib/fileSecurity";

const router = express.Router();

const isServerless = !!process.env.VERCEL || !!process.env.AWS_EXECUTION_ENV || process.cwd() === '/var/task' || process.cwd().includes('/var/task');
const GLOBAL_UPLOADS_DIR = isServerless ? '/tmp/uploads' : path.join(process.cwd(), 'uploads');
const upload = multer({ dest: GLOBAL_UPLOADS_DIR });

if (!fs.existsSync(GLOBAL_UPLOADS_DIR)) {
  fs.mkdirSync(GLOBAL_UPLOADS_DIR, { recursive: true });
}

// 🛡️ SECURE UPLOAD DOCUMENT ENDPOINT (Magic Bytes, Whitelist & Private Storage)
router.post("/api/v1/upload-document", authenticateJWT, upload.single('file'), async (req: any, res: any) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ 
        status: "error", 
        message: "Gagal Mengunggah Dokumen: File tidak ditemukan dalam request." 
      });
    }

    const fileBuffer = fs.readFileSync(file.path);
    const validation = validateFileBuffer(fileBuffer, file.originalname);

    if (!validation.valid) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(400).json({ 
        status: "error", 
        message: validation.error || "Gagal Mengunggah Dokumen: Format file tidak didukung atau ukuran melebihi batas maksimum (Max 10MB)." 
      });
    }

    const safeFilename = validation.sanitizedName || sanitizeFilename(file.originalname);
    const targetPath = path.join(GLOBAL_UPLOADS_DIR, safeFilename);

    // Store in private storage directory
    fs.renameSync(file.path, targetPath);

    const userId = req.user?.id || req.user?.uid || 'guest';
    const presignedUrl = generatePresignedUrl(safeFilename, userId, 60);

    return res.json({
      status: "success",
      message: "Dokumen berhasil diunggah dan diamankan.",
      data: {
        filename: safeFilename,
        originalName: file.originalname,
        size: fileBuffer.length,
        url: presignedUrl,
        protectedUrl: `/uploads/${safeFilename}?token=${presignedUrl.split('token=')[1]}`
      }
    });
  } catch (err: any) {
    console.error("POST /api/v1/upload-document error:", err);
    return res.status(500).json({ 
      status: "error", 
      message: "Gagal Mengunggah Dokumen: Terjadi kesalahan server (" + err.message + ")" 
    });
  }
});

// 🔒 SECURE STREAM / PRESIGNED URL ENDPOINT
router.get("/api/v1/files/secure-stream", async (req: any, res: any) => {
  try {
    const file = req.query.file as string;
    const expires = req.query.expires as string;
    const token = req.query.token as string;
    const uid = req.query.uid as string;

    if (!file) {
      return res.status(400).json({ status: "error", message: "Parameter 'file' wajib diisi." });
    }

    const safeFilename = path.basename(file);
    const filePath = path.join(GLOBAL_UPLOADS_DIR, safeFilename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ status: "error", message: "Dokumen tidak ditemukan." });
    }

    let isAuthorized = false;
    if (token && expires && uid) {
      isAuthorized = verifyPresignedToken(safeFilename, uid, expires, token);
    }

    if (!isAuthorized && req.headers?.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        const jwtToken = authHeader.split(' ')[1];
        try {
          jwt.verify(jwtToken, getJwtSecret());
          isAuthorized = true;
        } catch {}
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({
        status: "error",
        message: "Akses Ditolak: Presigned URL telah kadaluarsa atau token tidak valid."
      });
    }

    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; media-src 'self'; image-src 'self' data:; style-src 'unsafe-inline';");
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');

    return res.sendFile(filePath);
  } catch (err: any) {
    return res.status(500).json({ status: "error", message: "Terjadi kesalahan saat mengunduh dokumen." });
  }
});

export default router;
