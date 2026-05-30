import 'dotenv/config';
import request from 'supertest';
import app from '../src/app.js';
import mongoose from 'mongoose'; // 1. Import mongoose
import { connectDB } from '../src/config/db.js'; // 2. Import your db connector

describe('Auth Routes', () => {

  // 3. Connect to the database before tests start
  beforeAll(async () => {
    await connectDB(); 

    await mongoose.connection.collection('users').deleteMany({ email: 'test@example.com' });
  });

  // 4. Clean up and close the database connection after tests finish
  afterAll(async () => {
    await mongoose.connection.collection('users').deleteMany({ email: 'test@example.com' });

    await mongoose.connection.close();
  });

  it('POST /api/auth/register — should register user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testuser',
        email:    'test@example.com',
        password: 'Test1234',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.accessToken).toBeDefined();
  });

  it('POST /api/auth/login — wrong password should 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'wrongpass' });

    expect(res.statusCode).toBe(401);
  });

});