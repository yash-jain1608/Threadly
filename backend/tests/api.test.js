import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
let app;
beforeAll(async () => { process.env.JWT_SECRET = 'test-secret'; process.env.NODE_ENV = 'test'; app = (await import('../src/app.js')).default; });

describe('guards and validation (no database needed)', () => {
  it('health check', async () => expect((await request(app).get('/api/health')).status).toBe(200));
  it('rejects unauthenticated cart/order/profile access', async () => {
    for (const p of ['/api/cart', '/api/orders', '/api/wishlist', '/api/auth/me']) expect((await request(app).get(p)).status).toBe(401);
  });
  it('blocks customers/anonymous from admin APIs', async () => {
    expect((await request(app).get('/api/admin/orders')).status).toBe(401);
    expect((await request(app).post('/api/products').send({})).status).toBe(401);
  });
  it('rejects invalid registration input', async () => {
    const r = await request(app).post('/api/auth/register').send({ name: 'A', email: 'nope', password: '123', role: 'admin' });
    expect(r.status).toBe(400);
  });
  it('rejects tampered tokens', async () => expect((await request(app).get('/api/cart').set('Authorization', 'Bearer abc.def.ghi')).status).toBe(401));
  it('404s unknown routes', async () => expect((await request(app).get('/api/nope')).status).toBe(404));
});
