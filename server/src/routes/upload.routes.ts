import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateJWT, AuthRequest } from '../middleware/auth';

const router = Router();

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Helper to determine file category
export function categorizeMimeType(mimetype: string, filename: string): 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'ARCHIVE' | 'OTHER' {
  const mime = mimetype.toLowerCase();
  const ext = path.extname(filename).toLowerCase();

  if (mime.startsWith('image/') || ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp'].includes(ext)) {
    return 'IMAGE';
  }
  if (mime.startsWith('video/') || ['.mp4', '.webm', '.mov', '.mkv', '.avi', '.m4v'].includes(ext)) {
    return 'VIDEO';
  }
  if (mime.startsWith('audio/') || ['.mp3', '.wav', '.m4a', '.ogg', '.aac', '.flac'].includes(ext)) {
    return 'AUDIO';
  }
  if (
    mime.includes('pdf') ||
    mime.includes('word') ||
    mime.includes('excel') ||
    mime.includes('spreadsheet') ||
    mime.includes('presentation') ||
    mime.includes('powerpoint') ||
    mime.includes('text') ||
    ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv'].includes(ext)
  ) {
    return 'DOCUMENT';
  }
  if (
    mime.includes('zip') ||
    mime.includes('tar') ||
    mime.includes('rar') ||
    mime.includes('compressed') ||
    ['.zip', '.rar', '.tar', '.gz', '.7z'].includes(ext)
  ) {
    return 'ARCHIVE';
  }

  return 'OTHER';
}

// Multer Disk Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate safe clean filename with timestamp and random hex
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_\-]/g, '_')
      .slice(0, 40);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${cleanBase}-${uniqueSuffix}${ext}`);
  },
});

// Multer upload instance (100MB max file size to support videos & archives)
const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB
  },
});

/**
 * POST /api/upload
 * Single file upload
 */
router.post('/', authenticateJWT, upload.single('file'), (req: AuthRequest, res: Response): void => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file was uploaded' });
      return;
    }

    const file = req.file;
    const fileType = categorizeMimeType(file.mimetype, file.originalname);
    const relativeUrl = `/uploads/${file.filename}`;

    res.status(201).json({
      success: true,
      file: {
        url: relativeUrl,
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        fileType,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'File upload failed' });
  }
});

/**
 * POST /api/upload/multiple
 * Upload up to 10 files in a single request
 */
router.post('/multiple', authenticateJWT, upload.array('files', 10), (req: AuthRequest, res: Response): void => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No files were uploaded' });
      return;
    }

    const uploaded = files.map((file) => ({
      url: `/uploads/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      fileType: categorizeMimeType(file.mimetype, file.originalname),
    }));

    res.status(201).json({
      success: true,
      files: uploaded,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Multiple file upload failed' });
  }
});

export default router;
