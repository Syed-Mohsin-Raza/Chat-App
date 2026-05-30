import { jest } from '@jest/globals';

const redis = {
  hset:    jest.fn().mockResolvedValue('OK'),
  expire:  jest.fn().mockResolvedValue(1),
  hgetall: jest.fn().mockResolvedValue({
    accessToken: 'mock-token',
    ip: '',
    device: '',
    loginAt: Date.now().toString(),
  }),
  del:     jest.fn().mockResolvedValue(1),
  setex:   jest.fn().mockResolvedValue('OK'),
  get:     jest.fn().mockResolvedValue(null),
};

export default redis;