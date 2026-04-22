// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — Token Blacklist Service (Redis-backed)
// ═══════════════════════════════════════════════════════════

const { getRedis } = require('../config/redis');
const logger = require('../utils/logger');

const BLACKLIST_PREFIX = 'bl:';
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * Blacklist a refresh token (store its JTI in Redis with TTL)
 */
async function blacklistToken(jti) {
  try {
    await getRedis().set(`${BLACKLIST_PREFIX}${jti}`, '1', 'EX', REFRESH_TOKEN_TTL);
  } catch (error) {
    logger.error('Failed to blacklist token:', error.message);
  }
}

/**
 * Check if a token is blacklisted
 */
async function isBlacklisted(jti) {
  try {
    const result = await getRedis().get(`${BLACKLIST_PREFIX}${jti}`);
    return result === '1';
  } catch (error) {
    logger.error('Failed to check blacklist:', error.message);
    return false; // Fail open — don't lock users out if Redis is down
  }
}

/**
 * Blacklist all tokens for a user (on password change, account lock, etc.)
 */
async function blacklistAllUserTokens(userId) {
  try {
    await getRedis().set(`${BLACKLIST_PREFIX}user:${userId}`, Date.now().toString(), 'EX', REFRESH_TOKEN_TTL);
  } catch (error) {
    logger.error('Failed to blacklist user tokens:', error.message);
  }
}

/**
 * Check if user's tokens are globally blacklisted
 */
async function isUserBlacklisted(userId) {
  try {
    const result = await getRedis().get(`${BLACKLIST_PREFIX}user:${userId}`);
    return !!result;
  } catch (error) {
    return false;
  }
}

module.exports = { blacklistToken, isBlacklisted, blacklistAllUserTokens, isUserBlacklisted };
