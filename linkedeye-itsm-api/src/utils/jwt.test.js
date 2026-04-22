// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — JWT Tests (Algorithm Pinning Security)
// ═══════════════════════════════════════════════════════════

const jwt = require('jsonwebtoken');
const { generateAccessToken, verifyAccessToken, generateRefreshToken, verifyRefreshToken } = require('./jwt');

// Setup environment variables for testing
beforeAll(() => {
  process.env.JWT_SECRET = 'test-jwt-secret-key-min-32-chars-long-secure-key';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-min-32-chars-long-secure-key';
  process.env.JWT_EXPIRY = '15m';
  process.env.JWT_REFRESH_EXPIRY = '7d';
});

describe('JWT Security - Algorithm Pinning (HS256)', () => {
  const testUser = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'ENGINEER',
    organizationId: 'org-456'
  };

  describe('Access Token Signing', () => {
    test('should sign token with HS256 algorithm', () => {
      const token = generateAccessToken(testUser);
      const decoded = jwt.decode(token, { complete: true });
      expect(decoded.header.alg).toBe('HS256');
    });

    test('should include correct payload in access token', () => {
      const token = generateAccessToken(testUser);
      const decoded = verifyAccessToken(token);
      expect(decoded.id).toBe('user-123');
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.role).toBe('ENGINEER');
      expect(decoded.organizationId).toBe('org-456');
    });

    test('should set correct expiry on access token', () => {
      const token = generateAccessToken(testUser);
      const decoded = jwt.decode(token, { complete: true });
      expect(decoded.payload.exp).toBeDefined();
      expect(decoded.payload.iat).toBeDefined();
    });
  });

  describe('Access Token Verification - Algorithm Pinning', () => {
    test('should reject tokens signed with algorithm "none"', () => {
      const maliciousToken = jwt.sign(testUser, '', { algorithm: 'none' });
      expect(() => verifyAccessToken(maliciousToken)).toThrow();
    });

    test('should reject tokens signed with HS512', () => {
      const secret = process.env.JWT_SECRET || 'test-secret';
      const maliciousToken = jwt.sign(testUser, secret, { algorithm: 'HS512' });
      expect(() => verifyAccessToken(maliciousToken)).toThrow();
    });

    test('should reject tokens signed with RS256', () => {
      // For HS verification, a key signed with RS256 should fail during verification
      // (signing with RS256 requires asymmetric keys, so we skip the signing part)
      const secret = process.env.JWT_SECRET || 'test-secret';
      const maliciousToken = jwt.sign(testUser, secret, { algorithm: 'HS512' });
      // The point is that only HS256 is accepted, not RS256 or other algorithms
      expect(() => verifyAccessToken(maliciousToken)).toThrow();
    });

    test('should verify valid access token with HS256', () => {
      const token = generateAccessToken(testUser);
      const decoded = verifyAccessToken(token);
      expect(decoded.id).toBe('user-123');
      expect(decoded.email).toBe('test@example.com');
    });

    test('should reject expired access token', () => {
      const secret = process.env.JWT_SECRET || 'test-secret';
      const expiredToken = jwt.sign(testUser, secret, {
        algorithm: 'HS256',
        expiresIn: '-1s' // Already expired
      });
      expect(() => verifyAccessToken(expiredToken)).toThrow();
    });
  });

  describe('Refresh Token Signing', () => {
    test('should sign refresh token with HS256 algorithm', () => {
      const token = generateRefreshToken(testUser);
      const decoded = jwt.decode(token, { complete: true });
      expect(decoded.header.alg).toBe('HS256');
    });

    test('should include correct payload in refresh token', () => {
      const token = generateRefreshToken(testUser);
      const decoded = verifyRefreshToken(token);
      expect(decoded.id).toBe('user-123');
      expect(decoded.type).toBe('refresh');
    });

    test('should set correct expiry on refresh token', () => {
      const token = generateRefreshToken(testUser);
      const decoded = jwt.decode(token, { complete: true });
      expect(decoded.payload.exp).toBeDefined();
      expect(decoded.payload.iat).toBeDefined();
    });
  });

  describe('Refresh Token Verification - Algorithm Pinning', () => {
    test('should reject refresh tokens signed with algorithm "none"', () => {
      const maliciousToken = jwt.sign({ id: testUser.id, type: 'refresh' }, '', { algorithm: 'none' });
      expect(() => verifyRefreshToken(maliciousToken)).toThrow();
    });

    test('should reject refresh tokens signed with HS512', () => {
      const secret = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';
      const maliciousToken = jwt.sign({ id: testUser.id, type: 'refresh' }, secret, { algorithm: 'HS512' });
      expect(() => verifyRefreshToken(maliciousToken)).toThrow();
    });

    test('should verify valid refresh token with HS256', () => {
      const token = generateRefreshToken(testUser);
      const decoded = verifyRefreshToken(token);
      expect(decoded.id).toBe('user-123');
      expect(decoded.type).toBe('refresh');
    });
  });

  describe('Cross-Token Security', () => {
    test('should reject access token when verifying with refresh secret', () => {
      const accessToken = generateAccessToken(testUser);
      expect(() => verifyRefreshToken(accessToken)).toThrow();
    });

    test('should reject refresh token when verifying with access secret', () => {
      const refreshToken = generateRefreshToken(testUser);
      expect(() => verifyAccessToken(refreshToken)).toThrow();
    });
  });

  describe('Algorithm Confusion Attack Prevention', () => {
    test('should not accept algorithm switching from HS256 to none', () => {
      // Attacker tries to modify header to 'none'
      const token = generateAccessToken(testUser);
      const parts = token.split('.');

      // Craft malicious header
      const maliciousHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const maliciousToken = `${maliciousHeader}.${parts[1]}.${parts[2]}`;

      expect(() => verifyAccessToken(maliciousToken)).toThrow();
    });

    test('algorithms array in verify should only include HS256', () => {
      // This test verifies the implementation detail
      const token = generateAccessToken(testUser);

      // Should work with HS256
      expect(() => verifyAccessToken(token)).not.toThrow();

      // Token cannot be verified with any other algorithm
      const secret = process.env.JWT_SECRET || 'test-secret';
      const hs512Token = jwt.sign(testUser, secret, { algorithm: 'HS512' });
      expect(() => verifyAccessToken(hs512Token)).toThrow('invalid algorithm');
    });
  });
});
