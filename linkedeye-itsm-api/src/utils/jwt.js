// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — JWT Utilities
// ═══════════════════════════════════════════════════════════

const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, organizationId: user.organizationId || null },
    process.env.JWT_SECRET,
    {
      algorithm: 'HS256',  // Explicitly pin algorithm to prevent algorithm confusion attacks
      expiresIn: process.env.JWT_EXPIRY || '15m'
    }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { id: user.id, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    {
      algorithm: 'HS256',  // Explicitly pin algorithm to prevent algorithm confusion attacks
      expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',
      jwtid: uuidv4(), // Unique ID for blacklist-based token rotation
    }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET, {
    algorithms: ['HS256']  // Only accept HS256 — prevents algorithm confusion attacks
  });
}

function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
    algorithms: ['HS256']  // Only accept HS256 — prevents algorithm confusion attacks
  });
}

module.exports = { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken };
