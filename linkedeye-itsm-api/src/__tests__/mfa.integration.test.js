// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — MFA Integration Tests
// ═══════════════════════════════════════════════════════════

const request = require('supertest');
const speakeasy = require('speakeasy');
const { createTestOrg, createTestUser, getAuthToken, cleanup, TEST_PASSWORD } = require('./helpers');

// Skip integration tests if no database is available
const hasDb = !!process.env.DATABASE_URL;
const describeIfDb = hasDb ? describe : describe.skip;

let app;
if (hasDb) {
  app = require('../server');
}

describeIfDb('MFA Integration Tests', () => {
  let org, token;

  beforeAll(async () => {
    org = await createTestOrg();
  });

  afterAll(async () => {
    await cleanup(org.id);
  });

  describe('MFA Setup', () => {
    let setupUser, setupToken;

    beforeAll(async () => {
      setupUser = await createTestUser(org.id, 'ADMIN');
      setupToken = getAuthToken(setupUser);
    });

    test('should generate MFA setup with QR code and backup codes', async () => {
      const res = await request(app)
        .post('/api/v1/auth/mfa/setup')
        .set('Authorization', `Bearer ${setupToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('qrCode');
      expect(res.body.data).toHaveProperty('secret');
      expect(res.body.data).toHaveProperty('backupCodes');
      expect(res.body.data.backupCodes.length).toBe(10);
      expect(res.body.data.secret.length).toBeGreaterThan(0);
    });

    test('should reject MFA setup without auth', async () => {
      const res = await request(app)
        .post('/api/v1/auth/mfa/setup');

      expect(res.status).toBe(401);
    });
  });

  describe('Full MFA Flow: setup -> confirm -> login with MFA', () => {
    let mfaUser, mfaToken, mfaSecret;

    beforeAll(async () => {
      mfaUser = await createTestUser(org.id, 'ADMIN');
      mfaToken = getAuthToken(mfaUser);
    });

    test('step 1: setup MFA and get secret', async () => {
      const res = await request(app)
        .post('/api/v1/auth/mfa/setup')
        .set('Authorization', `Bearer ${mfaToken}`);

      expect(res.status).toBe(200);
      mfaSecret = res.body.data.secret;

      // Step 2: Generate valid TOTP and confirm
      const validTotp = speakeasy.totp({ secret: mfaSecret, encoding: 'base32' });

      const confirmRes = await request(app)
        .post('/api/v1/auth/mfa/confirm')
        .set('Authorization', `Bearer ${mfaToken}`)
        .send({
          token: validTotp,
          secret: mfaSecret,
          backupCodes: res.body.data.backupCodes,
        });

      expect(confirmRes.status).toBe(201);
      expect(confirmRes.body.success).toBe(true);
    });

    test('step 2: login should require MFA after enabling', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: mfaUser.email, password: TEST_PASSWORD });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data.requiresMfa).toBe(true);
    });

    test('step 3: login with valid MFA token should succeed', async () => {
      const mfaTotp = speakeasy.totp({ secret: mfaSecret, encoding: 'base32' });

      const mfaLoginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: mfaUser.email,
          password: TEST_PASSWORD,
          mfaToken: mfaTotp,
        });

      expect(mfaLoginRes.status).toBe(200);
      expect(mfaLoginRes.body.success).toBe(true);
      expect(mfaLoginRes.body.data).toHaveProperty('user');
      expect(mfaLoginRes.body.data).toHaveProperty('accessToken');
    });

    test('step 4: login with invalid MFA token should fail', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: mfaUser.email,
          password: TEST_PASSWORD,
          mfaToken: '000000',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('step 5: MFA status should show enabled', async () => {
      const res = await request(app)
        .get('/api/v1/auth/mfa/status')
        .set('Authorization', `Bearer ${mfaToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.enabled).toBe(true);
    });
  });

  describe('MFA Confirm Validation', () => {
    let valUser, valToken;

    beforeAll(async () => {
      valUser = await createTestUser(org.id, 'ENGINEER');
      valToken = getAuthToken(valUser);
    });

    test('should reject confirm with invalid TOTP token', async () => {
      // First setup
      const setupRes = await request(app)
        .post('/api/v1/auth/mfa/setup')
        .set('Authorization', `Bearer ${valToken}`);

      expect(setupRes.status).toBe(200);

      const confirmRes = await request(app)
        .post('/api/v1/auth/mfa/confirm')
        .set('Authorization', `Bearer ${valToken}`)
        .send({
          token: '000000',
          secret: setupRes.body.data.secret,
          backupCodes: setupRes.body.data.backupCodes,
        });

      expect(confirmRes.status).toBe(400);
    });
  });
});
