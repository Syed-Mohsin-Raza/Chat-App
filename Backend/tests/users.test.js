import 'dotenv/config';
import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import { connectTestDB, clearTestDB, closeTestDB } from './helpers/testDb.js';

const testUser = {
  username: 'testuser',
  email:    'test@example.com',
  password: 'Test1234',
};

let accessToken;
let userId;

beforeAll(async () => await connectTestDB());

beforeEach(async () => {
  await clearTestDB();
  // Register + login before each test
  const res = await request(app)
    .post('/api/auth/register')
    .send(testUser);
  accessToken = res.body.accessToken;
  userId = res.body.user.id;
});

afterAll(async () => await closeTestDB());

// ─── Get My Profile ───────────────────────────────────
describe('GET /api/users/me', () => {

  it('should return my profile', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.user.email).toBe(testUser.email);
    expect(res.body.user.password).toBeUndefined(); // never exposed
  });

  it('should fail without token', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.statusCode).toBe(401);
  });

});

// ─── Update Profile ───────────────────────────────────
describe('PUT /api/users/me', () => {

  it('should update username', async () => {
    const res = await request(app)
      .put('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ username: 'newusername' });

    expect(res.statusCode).toBe(200);
    expect(res.body.user.username).toBe('newusername');
  });

  it('should fail with username too short', async () => {
    const res = await request(app)
      .put('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ username: 'ab' });

    expect(res.statusCode).toBe(422);
  });

});

// ─── Search Users ─────────────────────────────────────
describe('GET /api/users/search', () => {

  it('should find users by username', async () => {
    const res = await request(app)
      .get('/api/users/search?q=test')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.users)).toBe(true);
  });

  it('should fail with short query', async () => {
    const res = await request(app)
      .get('/api/users/search?q=a')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.statusCode).toBe(400);
  });

});

// ─── Change Password ──────────────────────────────────
describe('PUT /api/users/me/password', () => {

  it('should change password successfully', async () => {
    const res = await request(app)
      .put('/api/users/me/password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        currentPassword: testUser.password,
        newPassword:     'NewPass1234',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should fail with wrong current password', async () => {
    const res = await request(app)
      .put('/api/users/me/password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        currentPassword: 'wrongpassword',
        newPassword:     'NewPass1234',
      });

    expect(res.statusCode).toBe(401);
  });

});