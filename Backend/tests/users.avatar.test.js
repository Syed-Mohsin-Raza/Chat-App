import 'dotenv/config';
import { jest }  from '@jest/globals';
import request   from 'supertest';
import path      from 'path';
import { Buffer } from 'buffer';
import app       from '../src/app.js';
import { connectTestDB, clearTestDB, closeTestDB } from './helpers/testDb.js';

const testUser = {
  username: 'testuser',
  email:    'test@example.com',
  password: 'Test1234',
};

let accessToken;

beforeAll(async () => await connectTestDB());
beforeEach(async () => {
  await clearTestDB();
  const res  = await request(app).post('/api/auth/register').send(testUser);
  accessToken = res.body.accessToken;
});
afterAll(async () => await closeTestDB());

describe('POST /api/users/me/avatar', () => {

  it('should upload avatar successfully', async () => {
    const res = await request(app)
      .post('/api/users/me/avatar')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('avatar', Buffer.from('fake-image-data'), {
        filename:    'test.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.avatar.key).toBe('avatars/mock-uuid.jpg');
    expect(res.body.avatar.url).toBe('https://mock-s3-url.com/avatars/mock-uuid.jpg');
  });

  it('should fail with no file', async () => {
    const res = await request(app)
      .post('/api/users/me/avatar')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.statusCode).toBe(400);
  });

  it('should fail with non-image file', async () => {
    const res = await request(app)
      .post('/api/users/me/avatar')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('avatar', Buffer.from('fake-pdf-data'), {
        filename:    'test.pdf',
        contentType: 'application/pdf',
      });

    expect(res.statusCode).toBe(400);
  });

  it('should fail without token', async () => {
    const res = await request(app)
      .post('/api/users/me/avatar')
      .attach('avatar', Buffer.from('fake-image-data'), {
        filename:    'test.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.statusCode).toBe(401);
  });

});

describe('GET /api/users/me — with avatar URL', () => {

  it('should return presigned URL for avatar', async () => {
    // Upload avatar first
    await request(app)
      .post('/api/users/me/avatar')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('avatar', Buffer.from('fake-image-data'), {
        filename:    'test.jpg',
        contentType: 'image/jpeg',
      });

    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.user.avatar.url).toBeDefined();
    expect(res.body.user.avatar.key).toBeDefined();
  });

});