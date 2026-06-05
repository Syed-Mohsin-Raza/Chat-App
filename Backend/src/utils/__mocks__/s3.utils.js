import { jest } from '@jest/globals';

export const uploadToS3     = jest.fn().mockResolvedValue({ key: 'avatars/mock-uuid.jpg' });
export const getPresignedUrl = jest.fn().mockResolvedValue('https://mock-s3-url.com/avatars/mock-uuid.jpg');
export const deleteFromS3   = jest.fn().mockResolvedValue(undefined);