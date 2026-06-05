import 'dotenv/config';
import { jest } from '@jest/globals';
import request  from 'supertest';
import { Buffer } from 'buffer';
import app      from '../src/app.js';
import { connectTestDB, clearTestDB, closeTestDB } from './helpers/testDb.js';

const userA = { username: 'userone', email: 'usera@example.com', password: 'Test1234' };
const userB = { username: 'usertwo', email: 'userb@example.com', password: 'Test1234' };

let tokenA, userBId, chatId;

beforeAll(async () => await connectTestDB());
beforeEach(async () => {
  await clearTestDB();

  const resA = await request(app).post('/api/auth/register').send(userA);
  const resB = await request(app).post('/api/auth/register').send(userB);
  tokenA  = resA.body.accessToken;
  userBId = resB.body.user.id;

  const chatRes = await request(app)
    .post('/api/chats/private')
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ userId: userBId });
  chatId = chatRes.body.chat._id;
});
afterAll(async () => await closeTestDB());

describe('POST /api/messages/upload', () => {

  it('should send image message', async () => {
    const res = await request(app)
      .post('/api/messages/upload')
      .set('Authorization', `Bearer ${tokenA}`)
      .field('chatId', chatId)
      .attach('file', Buffer.from('fake-image'), {
        filename:    'photo.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.message.type).toBe('image');
    expect(res.body.message.attachment.key).toBeDefined();
    expect(res.body.message.attachment.url).toBeDefined();
  });

  it('should send PDF file message', async () => {
    const res = await request(app)
      .post('/api/messages/upload')
      .set('Authorization', `Bearer ${tokenA}`)
      .field('chatId', chatId)
      .attach('file', Buffer.from('fake-pdf'), {
        filename:    'document.pdf',
        contentType: 'application/pdf',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.message.type).toBe('file');
  });

  it('should fail with no file', async () => {
    const res = await request(app)
      .post('/api/messages/upload')
      .set('Authorization', `Bearer ${tokenA}`)
      .field('chatId', chatId);

    expect(res.statusCode).toBe(400);
  });

  it('should fail without chatId', async () => {
    const res = await request(app)
      .post('/api/messages/upload')
      .set('Authorization', `Bearer ${tokenA}`)
      .attach('file', Buffer.from('fake-image'), {
        filename:    'photo.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.statusCode).toBe(422);
  });

  it('should fail if not chat member', async () => {
    const resC = await request(app)
      .post('/api/auth/register')
      .send({ username: 'userc', email: 'userc@test.com', password: 'Test1234' });

    const res = await request(app)
      .post('/api/messages/upload')
      .set('Authorization', `Bearer ${resC.body.accessToken}`)
      .field('chatId', chatId)
      .attach('file', Buffer.from('fake-image'), {
        filename:    'photo.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.statusCode).toBe(404);
  });

});