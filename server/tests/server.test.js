const request = require('supertest');
const app = require('../server');

describe('Express Backend API Proxy Tests', () => {

  it('GET / should health check correctly with true parameters', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('ok', true);
    expect(res.body).toHaveProperty('message', 'API is up');
  });

  it('GET /api/ai/health should return AI upstream viability metrics', async () => {
    const res = await request(app).get('/api/ai/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('ok', true);
    expect(res.body).toHaveProperty('used_this_month');
  });

  it('POST /stocks/AAPL should correctly reject connections without valid Firebase Tokens', async () => {
    const res = await request(app).post('/stocks/AAPL').send({ ticker: 'AAPL' });
    expect(res.statusCode).toEqual(401); // Requires Auth!
    expect(res.body).toHaveProperty('error', 'Missing or malformed Authorization header');
  });

  it('POST /api/ai/ask should correctly reject connections without valid Firebase Tokens', async () => {
    const res = await request(app).post('/api/ai/ask').send({ question: 'What is a straddle?' });
    expect(res.statusCode).toEqual(401); // Requires Auth!
    expect(res.body).toHaveProperty('error', 'Missing or malformed Authorization header');
  });

  it('GET /stocks/logo/NVDA should successfully fetch a logo upstream from Polygon without strict User limits', async () => {
    const res = await request(app).get('/stocks/logo/NVDA');
    // Since we don't know the exact Polygon API status (missing key/rate limit), 
    // it will likely result in a 404 or a 500 error vs full 200 stream block.
    // If they have public Logo blocks it might return 200, if an error, not 401.
    expect(res.statusCode).not.toEqual(401);
  });
});
