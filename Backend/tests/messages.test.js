import 'dotenv/config';
import { jest } from '@jest/globals';
import request  from 'supertest';
import app      from '../src/app.js';
import { connectTestDB, clearTestDB, closeTestDB } from './helpers/testDb.js';

const userA = {
  username: 'userone',
  email:    'usera@example.com',
  password: 'Test1234',
};

const userB = {
  username: 'usertwo',
  email:    'userb@example.com',
  password: 'Test1234',
};

let tokenA, tokenB, userBId, chatId;

beforeAll(async () => await connectTestDB());

beforeEach(async () => {
  await clearTestDB();

  const resA = await request(app).post('/api/auth/register').send(userA);
  const resB = await request(app).post('/api/auth/register').send(userB);

  tokenA  = resA.body.accessToken;
  tokenB  = resB.body.accessToken;
  userBId = resB.body.user.id;

  // Create a private chat for message tests
  const chatRes = await request(app)
    .post('/api/chats/private')
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ userId: userBId });

  chatId = chatRes.body.chat._id;
});

afterAll(async () => await closeTestDB());

// ─── Send Message ─────────────────────────────────────
describe('POST /api/messages', () => {

  it('should send a text message', async () => {
    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ chatId, content: 'Hello!', type: 'text' });

    expect(res.statusCode).toBe(201);
    expect(res.body.message.content).toBe('Hello!');
    expect(res.body.message.type).toBe('text');
  });

  it('should fail with empty content for text message', async () => {
    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ chatId, content: '', type: 'text' });

    expect(res.statusCode).toBe(422);
  });

  it('should fail if not chat member', async () => {
    const resC = await request(app)
      .post('/api/auth/register')
      .send({ username: 'userc', email: 'userc@test.com', password: 'Test1234' });

    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${resC.body.accessToken}`)
      .send({ chatId, content: 'Hacked!', type: 'text' });

    expect(res.statusCode).toBe(404);
  });

  it('should fail without token', async () => {
    const res = await request(app)
      .post('/api/messages')
      .send({ chatId, content: 'Hello!' });

    expect(res.statusCode).toBe(401);
  });

});

// ─── Get Messages ─────────────────────────────────────
describe('GET /api/messages/:chatId', () => {

  it('should get messages with pagination', async () => {
    // Send 3 messages first
    await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ chatId, content: 'Message 1', type: 'text' });

    await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ chatId, content: 'Message 2', type: 'text' });

    await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ chatId, content: 'Message 3', type: 'text' });

    const res = await request(app)
      .get(`/api/messages/${chatId}?page=1&limit=10`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.messages).toHaveLength(3);
    expect(res.body.pagination.total).toBe(3);
    expect(res.body.pagination.hasMore).toBe(false);
  });

  it('should fail if not chat member', async () => {
    const resC = await request(app)
      .post('/api/auth/register')
      .send({ username: 'userc', email: 'userc@test.com', password: 'Test1234' });

    const res = await request(app)
      .get(`/api/messages/${chatId}`)
      .set('Authorization', `Bearer ${resC.body.accessToken}`);

    expect(res.statusCode).toBe(404);
  });

});

// ─── Mark As Read ─────────────────────────────────────
describe('PUT /api/messages/:messageId/read', () => {

  it('should mark message as read', async () => {
    const msgRes = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ chatId, content: 'Read me!', type: 'text' });

    const messageId = msgRes.body.message._id;

    const res = await request(app)
      .put(`/api/messages/${messageId}/read`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

});

// ─── Delete Message ───────────────────────────────────
describe('DELETE /api/messages/:messageId', () => {

  it('should soft delete own message', async () => {
    const msgRes = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ chatId, content: 'Delete me!', type: 'text' });

    const messageId = msgRes.body.message._id;

    const res = await request(app)
      .delete(`/api/messages/${messageId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should fail deleting someone else message', async () => {
    const msgRes = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ chatId, content: 'Not yours!', type: 'text' });

    const messageId = msgRes.body.message._id;

    const res = await request(app)
      .delete(`/api/messages/${messageId}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.statusCode).toBe(404);
  });

});