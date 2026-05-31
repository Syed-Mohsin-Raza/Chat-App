import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import s3 from '../config/s3.js';

const BUCKET = process.env.AWS_BUCKET_NAME;

// ─── MIME type → extension fallback map ──────────────
const MIME_TO_EXT = {
  'image/jpeg':      'jpg',
  'image/png':       'png',
  'image/webp':      'webp',
  'image/gif':       'gif',
  'audio/mpeg':      'mp3',
  'audio/wav':       'wav',
  'audio/ogg':       'ogg',
  'audio/webm':      'webm',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

// ─── Safe extension extractor ─────────────────────────
const getExtension = (originalName, mimetype) => {
  const parts = originalName.split('.');

  // Has valid extension (more than one part and last part is short)
  if (parts.length > 1) {
    const ext = parts.pop().toLowerCase();
    // Valid extension = 2-5 chars, alphanumeric only
    if (/^[a-z0-9]{2,5}$/.test(ext)) {
      return ext;
    }
  }

  // Fallback to mimetype map
  if (MIME_TO_EXT[mimetype]) {
    return MIME_TO_EXT[mimetype];
  }

  // Last resort
  return 'bin';
};

// ─── Generate unique S3 key ───────────────────────────
const generateKey = (folder, originalName, mimetype) => {
  const ext = getExtension(originalName, mimetype);
  return `${folder}/${uuidv4()}.${ext}`;
};

// ─── Upload to S3 (private bucket) ───────────────────
export const uploadToS3 = async (file, folder) => {
  const key = generateKey(folder, file.originalname, file.mimetype);

  await s3.send(new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         key,
    Body:        file.buffer,
    ContentType: file.mimetype,
  }));

  return { key };
};

// ─── Generate presigned URL ───────────────────────────
export const getPresignedUrl = async (key, expiresIn = 3600) => {
  if (!key) return '';

  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn }
  );
};

// ─── Delete from S3 ───────────────────────────────────
export const deleteFromS3 = async (key) => {
  if (!key) return;
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
};