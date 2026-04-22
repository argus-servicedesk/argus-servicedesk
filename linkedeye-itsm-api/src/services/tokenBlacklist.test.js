// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — Token Blacklist Tests
// ═══════════════════════════════════════════════════════════

const mockRedis = {
  set: jest.fn().mockResolvedValue('OK'),
  get: jest.fn().mockResolvedValue(null),
};

jest.mock('../config/redis', () => ({
  getRedis: () => mockRedis,
}));

const { blacklistToken, isBlacklisted, blacklistAllUserTokens, isUserBlacklisted } = require('./tokenBlacklist');

describe('Token Blacklist', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should blacklist a token by JTI', async () => {
    await blacklistToken('test-jti-123');
    expect(mockRedis.set).toHaveBeenCalledWith('bl:test-jti-123', '1', 'EX', 604800);
  });

  test('should return true for blacklisted token', async () => {
    mockRedis.get.mockResolvedValueOnce('1');
    const result = await isBlacklisted('test-jti-123');
    expect(result).toBe(true);
    expect(mockRedis.get).toHaveBeenCalledWith('bl:test-jti-123');
  });

  test('should return false for non-blacklisted token', async () => {
    mockRedis.get.mockResolvedValueOnce(null);
    const result = await isBlacklisted('non-existent-jti');
    expect(result).toBe(false);
  });

  test('should fail open when Redis is down (isBlacklisted)', async () => {
    mockRedis.get.mockRejectedValueOnce(new Error('Redis connection refused'));
    const result = await isBlacklisted('some-jti');
    expect(result).toBe(false);
  });

  test('should blacklist all tokens for a user', async () => {
    await blacklistAllUserTokens('user-abc');
    expect(mockRedis.set).toHaveBeenCalledWith(
      'bl:user:user-abc',
      expect.any(String),
      'EX',
      604800
    );
  });

  test('should detect user-level blacklist', async () => {
    mockRedis.get.mockResolvedValueOnce('1711234567890');
    const result = await isUserBlacklisted('user-abc');
    expect(result).toBe(true);
  });

  test('should return false for non-blacklisted user', async () => {
    mockRedis.get.mockResolvedValueOnce(null);
    const result = await isUserBlacklisted('user-xyz');
    expect(result).toBe(false);
  });

  test('should fail open when Redis is down (isUserBlacklisted)', async () => {
    mockRedis.get.mockRejectedValueOnce(new Error('Redis connection refused'));
    const result = await isUserBlacklisted('user-abc');
    expect(result).toBe(false);
  });
});
