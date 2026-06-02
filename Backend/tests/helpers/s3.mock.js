import { jest } from '@jest/globals';

// Mock entire s3.utils.js
export const uploadToS3Mock    = jest.fn().mockResolvedValue({ key: 'test/mock-key.jpg' });
export const getPresignedUrlMock = jest.fn().mockResolvedValue('https://mock-presigned-url.com/test.jpg');
export const deleteFromS3Mock  = jest.fn().mockResolvedValue(undefined);