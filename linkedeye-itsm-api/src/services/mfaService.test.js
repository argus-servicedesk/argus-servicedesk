const { generateMfaSetup, verifyTotp, verifyBackupCode } = require('./mfaService');
const speakeasy = require('speakeasy');

describe('MFA Service', () => {
  describe('generateMfaSetup', () => {
    test('should generate MFA setup with secret, QR code, and backup codes', async () => {
      const setup = await generateMfaSetup('test@example.com');
      expect(setup.secret).toBeDefined();
      expect(setup.secret.length).toBeGreaterThan(0);
      expect(setup.qrCode).toMatch(/^data:image\/png/);
      expect(setup.backupCodes).toHaveLength(10);
      expect(setup.backupCodes[0]).toMatch(/^[A-F0-9]{8}$/);
      expect(setup.otpauthUrl).toContain('otpauth://totp/');
    });

    test('should include app name and email in otpauth URL', async () => {
      const setup = await generateMfaSetup('admin@linkedeye.io', 'LinkedEye ITSM');
      expect(setup.otpauthUrl).toContain('LinkedEye');
      expect(setup.otpauthUrl).toContain('admin%40linkedeye.io');
    });

    test('should generate unique secrets on each call', async () => {
      const setup1 = await generateMfaSetup('test@example.com');
      const setup2 = await generateMfaSetup('test@example.com');
      expect(setup1.secret).not.toEqual(setup2.secret);
    });
  });

  describe('verifyTotp', () => {
    test('should verify valid TOTP token', () => {
      const secret = speakeasy.generateSecret({ length: 32 }).base32;
      const token = speakeasy.totp({ secret, encoding: 'base32' });
      expect(verifyTotp(token, secret)).toBe(true);
    });

    test('should reject invalid TOTP token', () => {
      const secret = speakeasy.generateSecret({ length: 32 }).base32;
      expect(verifyTotp('000000', secret)).toBe(false);
    });

    test('should reject empty token', () => {
      const secret = speakeasy.generateSecret({ length: 32 }).base32;
      expect(verifyTotp('', secret)).toBe(false);
    });
  });

  describe('verifyBackupCode', () => {
    test('should verify and consume a valid backup code', () => {
      const codes = ['AABB1122', 'CCDD3344', 'EEFF5566'];
      const result = verifyBackupCode('AABB1122', codes);
      expect(result.valid).toBe(true);
      expect(result.remaining).toEqual(['CCDD3344', 'EEFF5566']);
    });

    test('should reject invalid backup code', () => {
      const codes = ['AABB1122', 'CCDD3344'];
      const result = verifyBackupCode('INVALID0', codes);
      expect(result.valid).toBe(false);
      expect(result.remaining).toEqual(codes);
    });

    test('should be case-insensitive for backup codes', () => {
      const codes = ['AABB1122'];
      const result = verifyBackupCode('aabb1122', codes);
      expect(result.valid).toBe(true);
      expect(result.remaining).toEqual([]);
    });

    test('should handle empty backup codes array', () => {
      const result = verifyBackupCode('AABB1122', []);
      expect(result.valid).toBe(false);
      expect(result.remaining).toEqual([]);
    });

    test('should only consume the first matching code', () => {
      const codes = ['AABB1122', 'AABB1122', 'CCDD3344'];
      const result = verifyBackupCode('AABB1122', codes);
      expect(result.valid).toBe(true);
      // Should remove only the first occurrence
      expect(result.remaining).toEqual(['AABB1122', 'CCDD3344']);
    });
  });
});
