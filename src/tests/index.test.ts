import request from 'supertest';
import app from '../index';

describe('GET /', () => {
  it('should return 200 OK and the message', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Hello from Node.js TypeScript Backend');
  });
});
