import multer from 'multer';

// ─── Allowed MIME types ───────────────────────────────
const MIME_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'],
  file:  [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
};

const ALL_MIME_TYPES = [
  ...MIME_TYPES.image,
  ...MIME_TYPES.audio,
  ...MIME_TYPES.file,
];

// ─── File size limits ─────────────────────────────────
const MB = 1024 * 1024;
const SIZE_LIMITS = {
  avatar:     5  * MB,   // 5MB
  attachment: 20 * MB,   // 20MB
};

// ─── Memory storage ───────────────────────────────────
// File stays in RAM as buffer → directly streamed to S3
// No disk usage ✅
const storage = multer.memoryStorage();

// ─── Avatar upload ────────────────────────────────────
// Images only, 5MB max, single file
export const uploadAvatar = multer({
  storage,
  limits:     { fileSize: SIZE_LIMITS.avatar },
  fileFilter: (req, file, cb) => {
    if (MIME_TYPES.image.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only images allowed for avatar'), false);
    }
  },
}).single('avatar');   // field name in form-data

// ─── Message attachment ───────────────────────────────
// Images + audio + files, 20MB max, single file
export const uploadAttachment = multer({
  storage,
  limits:     { fileSize: SIZE_LIMITS.attachment },
  fileFilter: (req, file, cb) => {
    if (ALL_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}`), false);
    }
  },
}).single('file');     // field name in form-data

// ─── Multer error handler ─────────────────────────────
// Must be used AFTER multer middleware in route
export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large',
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  next();
};

// ─── Detect message type from mimetype ───────────────
export const detectMessageType = (mimetype) => {
  if (MIME_TYPES.image.includes(mimetype)) return 'image';
  if (MIME_TYPES.audio.includes(mimetype)) return 'audio';
  return 'file';
};