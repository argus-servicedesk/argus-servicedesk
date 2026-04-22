// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — Auth Integration Tests
// ═══════════════════════════════════════════════════════════

const request = require('supertest');
const { createTestOrg, createTestUser, getAuthToken, cleanup, TEST_PASSWORD } = require('./helpers');

// Skip integration tests if no database is available (CI without DB)
const hasDb = !!process.env.DATABASE_URL;
const describeIfDb = hasDb ? describe : describe.skip;

let app;
if (hasDb) {
  app = require('../server');
}

describeIfDb('Auth Integration Tests', () => {
  let org, user, token;

  beforeAll(async () => {
    org = await createTestOrg();
    user = await createTestUser(org.id, 'ADMIN');
    token = getAuthToken(user);
  });

  afterAll(async () => {
    await cleanup(org.id);
  });

  describe('POST /api/v1/auth/login', () => {
    test('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: TEST_PASSWORD });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data.user.email).toBe(user.email);
      // Check httpOnly cookies are set
      expect(res.headers['set-cookie']).toBeDefined();
      const cookies = res.headers['set-cookie'].join('; ');
      expect(cookies).toContain('accessToken');
      expect(cookies).toContain('refreshToken');
      expect(cookies).toContain('HttpOnly');
    });

    test('should reject invalid password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: 'WrongPassword123!' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('should reject non-existent user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nonexistent-user@example.com', password: TEST_PASSWORD });

      expect(res.status).toBe(401);
    });

    test('should reject request with missing fields', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: user.email });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/auth/me (profile)', () => {
    test('should return user profile with valid token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(user.email);
      expect(res.body.data.firstName).toBe('Test');
      expect(res.body.data.role).toBe('ADMIN');
      // Should not return password
      expect(res.body.data.password).toBeUndefined();
    });

    test('should reject request without token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('should reject request with invalid token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalidtoken123');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    test('should issue new tokens with valid refresh token', async () => {
      // First login to get a valid refresh token
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: TEST_PASSWORD });

      expect(loginRes.status).toBe(200);
      const { refreshToken } = loginRes.body.data;

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      // New tokens should differ from old ones (token rotation)
      expect(res.body.data.refreshToken).not.toBe(refreshToken);
    });

    test('should reject request without refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('GET /health', () => {
    test('should return healthy status', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.database).toBe('connected');
    });
  });
});
