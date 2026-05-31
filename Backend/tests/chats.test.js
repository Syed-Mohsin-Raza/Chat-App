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

let tokenA, tokenB, userBId;

beforeAll(async () => await connectTestDB());

beforeEach(async () => {
  await clearTestDB();

  // Register both users
  const resA = await request(app).post('/api/auth/register').send(userA);
  const resB = await request(app).post('/api/auth/register').send(userB);

  tokenA  = resA.body.accessToken;
  tokenB  = resB.body.accessToken;
  userBId = resB.body.user.id;
});

afterAll(async () => await closeTestDB());

// ─── Private Chat ─────────────────────────────────────
describe('POST /api/chats/private', () => {

  it('should create private chat', async () => {
    const res = await request(app)
      .post('/api/chats/private')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ userId: userBId });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.chat.type).toBe('private');
    expect(res.body.chat.members).toHaveLength(2);
  });

  it('should return existing chat if already exists', async () => {
    // Create first time
    await request(app)
      .post('/api/chats/private')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ userId: userBId });

    // Create again
    const res = await request(app)
      .post('/api/chats/private')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ userId: userBId });

    expect(res.statusCode).toBe(200); // existing returned
    expect(res.body.chat.type).toBe('private');
  });

  it('should fail chatting with yourself', async () => {
    const resA = await request(app)
      .post('/api/auth/login')
      .send({ email: userA.email, password: userA.password });

    const myId = resA.body.user.id;

    const res = await request(app)
      .post('/api/chats/private')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ userId: myId });

    expect(res.statusCode).toBe(400);
  });

  it('should fail without token', async () => {
    const res = await request(app)
      .post('/api/chats/private')
      .send({ userId: userBId });

    expect(res.statusCode).toBe(401);
  });

  it('should fail with invalid userId', async () => {
    const res = await request(app)
      .post('/api/chats/private')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ userId: 'notavalidid' });

    expect(res.statusCode).toBe(422);
  });

});

// ─── Group Chat ───────────────────────────────────────
describe('POST /api/chats/group', () => {

  it('should create group chat', async () => {
    const res = await request(app)
      .post('/api/chats/group')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Test Group', members: [userBId] });

    expect(res.statusCode).toBe(201);
    expect(res.body.chat.type).toBe('group');
    expect(res.body.chat.name).toBe('Test Group');
  });

  it('should fail with no members', async () => {
    const res = await request(app)
      .post('/api/chats/group')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Test Group', members: [] });

    expect(res.statusCode).toBe(422);
  });

  it('should fail with no name', async () => {
    const res = await request(app)
      .post('/api/chats/group')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ members: [userBId] });

    expect(res.statusCode).toBe(422);
  });

});

// ─── Get My Chats ─────────────────────────────────────
describe('GET /api/chats', () => {

  it('should return my chats', async () => {
    // Create a chat first
    await request(app)
      .post('/api/chats/private')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ userId: userBId });

    const res = await request(app)
      .get('/api/chats')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.chats)).toBe(true);
    expect(res.body.chats).toHaveLength(1);
  });

  it('should return empty array if no chats', async () => {
    const res = await request(app)
      .get('/api/chats')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.chats).toHaveLength(0);
  });

});

// ─── Get Chat By ID ───────────────────────────────────
describe('GET /api/chats/:chatId', () => {

  it('should return chat by id', async () => {
    const created = await request(app)
      .post('/api/chats/private')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ userId: userBId });

    const chatId = created.body.chat._id;

    const res = await request(app)
      .get(`/api/chats/${chatId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.chat._id).toBe(chatId);
  });

  it('should fail if not a member', async () => {
    const created = await request(app)
      .post('/api/chats/private')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ userId: userBId });

    const chatId = created.body.chat._id;

    // Register third user
    const resC = await request(app)
      .post('/api/auth/register')
      .send({ username: 'userc', email: 'userc@test.com', password: 'Test1234' });

    const res = await request(app)
      .get(`/api/chats/${chatId}`)
      .set('Authorization', `Bearer ${resC.body.accessToken}`);

    expect(res.statusCode).toBe(404);
  });

});

// ─── Update Group ─────────────────────────────────────
describe('PUT /api/chats/:chatId', () => {

  it('should update group name as admin', async () => {
    const created = await request(app)
      .post('/api/chats/group')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Old Name', members: [userBId] });

    const chatId = created.body.chat._id;

    const res = await request(app)
      .put(`/api/chats/${chatId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'New Name' });

    expect(res.statusCode).toBe(200);
    expect(res.body.chat.name).toBe('New Name');
  });

  it('should fail if not admin', async () => {
    const created = await request(app)
      .post('/api/chats/group')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Test Group', members: [userBId] });

    const chatId = created.body.chat._id;

    const res = await request(app)
      .put(`/api/chats/${chatId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'Hacked Name' });

    expect(res.statusCode).toBe(403);
  });

});