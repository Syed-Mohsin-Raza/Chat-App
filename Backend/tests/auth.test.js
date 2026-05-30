import 'dotenv/config';
import { beforeAll, jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import { connectTestDB, clearTestDB, closeTestDB } from './helpers/testDb.js';

// Test data
const testUser = {
  username: 'testuser',
  email:    'test@example.com',
  password: 'Test1234',
};

beforeAll(async () => await connectTestDB());
afterEach(async () => await clearTestDB());
afterAll(async () => await closeTestDB());

// ─── Register ─────────────────────────────────────────
describe('POST /api/auth/register', () => {

  it('should register successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user.email).toBe(testUser.email);
  });

  it('should fail with duplicate email', async () => {
    await request(app).post('/api/auth/register').send(testUser);
    const res = await request(app).post('/api/auth/register').send(testUser);

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('should fail with weak password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...testUser, password: '123' });

    expect(res.statusCode).toBe(422);
  });

  it('should fail with invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...testUser, email: 'notanemail' });

    expect(res.statusCode).toBe(422);
  });

});

// ─── Login ────────────────────────────────────────────
describe('POST /api/auth/login', () => {

  beforeEach(async () => {
    await request(app).post('/api/auth/register').send(testUser);
  });

  it('should login successfully', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password });

    expect(res.statusCode).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });

  it('should fail with wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: 'wrongpass' });

    expect(res.statusCode).toBe(401);
  });

  it('should fail with wrong email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'wrong@example.com', password: testUser.password });

    expect(res.statusCode).toBe(401);
  });

});

// ─── Logout ───────────────────────────────────────────
describe('POST /api/auth/logout', () => {

  beforeEach(async () => {
    await request(app).post('/api/auth/register').send(testUser);
  });

  it('should logout successfully', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password });

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
      .send({ refreshToken: loginRes.body.refreshToken });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should fail without token', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.statusCode).toBe(401);
  });

});