import crypto from 'crypto';
import path from 'path';

// --- SECURITY CONSTANTS ---
export const ALLOWED_EXTENSIONS = new Set([
  'pdf', 'docx', 'doc', 'xlsx', 'xls', 'csv', 
  'png', 'jpg', 'jpeg', 'webp', 'gif',
  'mp4', 'webm', 'mp3', 'wav', 'm4a', 
  'txt', 'zip'
]);

export const BLOCKED_EXTENSIONS = new Set([
  'exe', 'sh', 'php', 'js', 'jsx', 'ts', 'tsx', 'html', 'htm', 'svg',
  'bat', 'cmd', 'vbs', 'py', 'jar', 'msi', 'scr', 'pif', 'com', 'cpl',
  'php3', 'php4', 'php5', 'phtml', 'asp', 'aspx', 'jsp', 'cgi', 'pl'
]);

export const MAX_DOC_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_MEDIA_SIZE_BYTES = 120 * 1024 * 1024; // 120MB

// --- FILENAME SANITIZATION ---
export function sanitizeFilename(originalName: string): string {
  if (!originalName) return `file_${Date.now()}`;
  
  // Extract ext
  const ext = path.extname(originalName).toLowerCase().replace('.', '');
  const baseName = path.basename(originalName, path.extname(originalName));

  // Clean base name: remove path traversal, non-alphanumeric, spaces
  const cleanBase = baseName
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 50);

  const safeExt = ALLOWED_EXTENSIONS.has(ext) ? ext : 'bin';
  const randomSuffix = crypto.randomBytes(6).toString('hex');

  return `${cleanBase}_${Date.now()}_${randomSuffix}.${safeExt}`;
}

// --- CLIENT-SIDE VALIDATION ---
export function validateFileClient(
  file: File, 
  customMaxSize?: number
): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'File tidak ditemukan.' };
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  if (BLOCKED_EXTENSIONS.has(ext)) {
    return { 
      valid: false, 
      error: 'Gagal Mengunggah Dokumen: Format file tidak didukung atau berpotensi berbahaya.' 
    };
  }

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return { 
      valid: false, 
      error: `Gagal Mengunggah Dokumen: Format file .${ext} tidak didukung.` 
    };
  }

  const isMedia = ['mp4', 'webm', 'mp3', 'wav', 'm4a'].includes(ext);
  const maxSize = customMaxSize || (isMedia ? MAX_MEDIA_SIZE_BYTES : MAX_DOC_SIZE_BYTES);

  if (file.size > maxSize) {
    const limitMB = Math.round(maxSize / (1024 * 1024));
    return { 
      valid: false, 
      error: `Gagal Mengunggah Dokumen: Ukuran melebihi batas maksimum (Max ${limitMB}MB).` 
    };
  }

  return { valid: true };
}

// --- SERVER-SIDE MAGIC BYTE VALIDATION ---
export function validateFileBuffer(
  buffer: Buffer, 
  originalName: string, 
  maxSizeBytes?: number
): { valid: boolean; error?: string; sanitizedName?: string } {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: 'File kosong atau tidak valid.' };
  }

  const ext = path.extname(originalName).toLowerCase().replace('.', '');

  if (BLOCKED_EXTENSIONS.has(ext) || !ALLOWED_EXTENSIONS.has(ext)) {
    return { 
      valid: false, 
      error: 'Gagal Mengunggah Dokumen: Format file tidak didukung atau berpotensi berbahaya.' 
    };
  }

  const isMedia = ['mp4', 'webm', 'mp3', 'wav', 'm4a'].includes(ext);
  const limit = maxSizeBytes || (isMedia ? MAX_MEDIA_SIZE_BYTES : MAX_DOC_SIZE_BYTES);

  if (buffer.length > limit) {
    const limitMB = Math.round(limit / (1024 * 1024));
    return { 
      valid: false, 
      error: `Gagal Mengunggah Dokumen: Ukuran melebihi batas maksimum (Max ${limitMB}MB).` 
    };
  }

  // 1. Check Executable Header Bytes (MZ, ELF, Shebang, Java Bytecode)
  if (buffer.length >= 2) {
    const magicHex = buffer.subarray(0, 4).toString('hex').toLowerCase();

    // Executable MZ (exe, dll)
    if (magicHex.startsWith('4d5a')) {
      return { valid: false, error: 'Gagal Mengunggah Dokumen: Terdeteksi file executable (.exe) yang dilarang!' };
    }
    // ELF (Linux binary)
    if (magicHex.startsWith('7f454c46')) {
      return { valid: false, error: 'Gagal Mengunggah Dokumen: Terdeteksi file binary ELF yang dilarang!' };
    }
    // Java bytecode
    if (magicHex.startsWith('cafebabe')) {
      return { valid: false, error: 'Gagal Mengunggah Dokumen: Terdeteksi Java bytecode yang dilarang!' };
    }
    // Shebang #!
    if (magicHex.startsWith('2321')) {
      return { valid: false, error: 'Gagal Mengunggah Dokumen: Terdeteksi script executable yang dilarang!' };
    }
  }

  // 2. Validate Specific Magic Bytes for Whitelisted Types
  if (buffer.length >= 4) {
    const headerHex = buffer.subarray(0, 12).toString('hex').toLowerCase();

    if (ext === 'pdf' && !headerHex.startsWith('25504446')) { // %PDF
      return { valid: false, error: 'Gagal Mengunggah Dokumen: Header file PDF tidak valid!' };
    }

    if (ext === 'png' && !headerHex.startsWith('89504e470d0a1a0a')) { // PNG header
      return { valid: false, error: 'Gagal Mengunggah Dokumen: Header file PNG tidak valid!' };
    }

    if ((ext === 'jpg' || ext === 'jpeg') && !headerHex.startsWith('ffd8ff')) { // JPEG header
      return { valid: false, error: 'Gagal Mengunggah Dokumen: Header file JPEG tidak valid!' };
    }

    if (ext === 'gif' && !headerHex.startsWith('47494638')) { // GIF8
      return { valid: false, error: 'Gagal Mengunggah Dokumen: Header file GIF tidak valid!' };
    }

    if ((ext === 'docx' || ext === 'xlsx' || ext === 'zip') && !headerHex.startsWith('504b0304')) { // PK zip header
      return { valid: false, error: 'Gagal Mengunggah Dokumen: Header file dokumen/ZIP tidak valid!' };
    }

    if (ext === 'webm' && !headerHex.startsWith('1a45dfa3')) {
      return { valid: false, error: 'Gagal Mengunggah Dokumen: Header file WebM tidak valid!' };
    }
  }

  // 3. Scan for malicious embedded scripts in SVG/HTML/Text files
  const first2048Str = buffer.subarray(0, 2048).toString('utf-8').toLowerCase();
  if (first2048Str.includes('<script') || first2048Str.includes('javascript:') || first2048Str.includes('onerror=')) {
    return { valid: false, error: 'Gagal Mengunggah Dokumen: File mengandung script atau payload berbahaya!' };
  }

  const sanitizedName = sanitizeFilename(originalName);
  return { valid: true, sanitizedName };
}

// --- PRESIGNED URL & SECURITY TOKEN GENERATION ---
const GET_SIGNING_SECRET = (): string => {
  return process.env.JWT_SECRET || 'lanpro-secure-storage-signing-key-v1';
};

export function generatePresignedUrl(
  filename: string, 
  userId: string, 
  expiresInMinutes: number = 60
): string {
  const cleanName = path.basename(filename);
  const expiresAt = Math.floor(Date.now() / 1000) + (expiresInMinutes * 60);
  const dataToSign = `${cleanName}:${userId}:${expiresAt}`;
  const token = crypto
    .createHmac('sha256', GET_SIGNING_SECRET())
    .update(dataToSign)
    .digest('hex');

  return `/api/v1/files/secure-stream?file=${encodeURIComponent(cleanName)}&expires=${expiresAt}&token=${token}&uid=${encodeURIComponent(userId)}`;
}

export function verifyPresignedToken(
  filename: string, 
  userId: string, 
  expiresStr: string, 
  tokenStr: string
): boolean {
  if (!filename || !userId || !expiresStr || !tokenStr) return false;

  const expiresAt = parseInt(expiresStr, 10);
  if (isNaN(expiresAt) || Math.floor(Date.now() / 1000) > expiresAt) {
    return false; // Token expired
  }

  const cleanName = path.basename(filename);
  const dataToSign = `${cleanName}:${userId}:${expiresAt}`;
  const expectedToken = crypto
    .createHmac('sha256', GET_SIGNING_SECRET())
    .update(dataToSign)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(tokenStr), Buffer.from(expectedToken));
  } catch {
    return false;
  }
}
