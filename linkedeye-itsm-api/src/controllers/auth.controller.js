// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — Auth Controller
// ═══════════════════════════════════════════════════════════

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { prisma } = require('../config/database');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { success, error } = require('../utils/helpers');
const logger = require('../utils/logger');
const { generateMfaSetup, verifyTotp, verifyBackupCode } = require('../services/mfaService');
const { blacklistToken, isBlacklisted, blacklistAllUserTokens } = require('../services/tokenBlacklist');

const SALT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION = 15 * 60 * 1000; // 15 min

// POST /api/v1/auth/login
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return error(res, 'Invalid credentials', 401);

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return error(res, 'Account locked. Try again later.', 423);
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      const attempts = user.loginAttempts + 1;
      const update = { loginAttempts: attempts };
      if (attempts >= MAX_LOGIN_ATTEMPTS) {
        update.lockedUntil = new Date(Date.now() + LOCK_DURATION);
        update.status = 'LOCKED';
      }
      await prisma.user.update({ where: { id: user.id }, data: update });
      return error(res, 'Invalid credentials', 401);
    }

    if (user.status === 'INACTIVE') return error(res, 'Account deactivated', 403);

    // ── MFA check ──────────────────────────────────────────
    const userMfa = await prisma.userMfa.findUnique({
      where: { userId: user.id },
    });

    if (userMfa) {
      const { mfaToken, backupCode } = req.body;

      if (!mfaToken && !backupCode) {
        // First login attempt — tell frontend MFA is required
        return res.status(200).json({
          success: true,
          data: {
            requiresMfa: true,
            userId: user.id,
            message: 'MFA verification required',
          },
        });
      }

      // Verify MFA token or backup code
      if (mfaToken) {
        const isValid = verifyTotp(mfaToken, userMfa.secret);
        if (!isValid) {
          return error(res, 'Invalid MFA token', 401);
        }
      } else if (backupCode) {
        const codes = JSON.parse(userMfa.backupCodes);
        const result = verifyBackupCode(backupCode, codes);
        if (!result.valid) {
          return error(res, 'Invalid backup code', 401);
        }
        // Update remaining backup codes
        await prisma.userMfa.update({
          where: { userId: user.id },
          data: { backupCodes: JSON.stringify(result.remaining) },
        });
      }
    }
    // ── End MFA check ──────────────────────────────────────

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Create session
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.session.create({
      data: {
        token: accessToken, refreshToken, userId: user.id,
        userAgent: req.get('user-agent'), ipAddress: req.ip, expiresAt,
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date(), loginAttempts: 0, lockedUntil: null, status: 'ACTIVE' },
    });

    // Set httpOnly cookies for web frontend (tokens also in body for mobile/API clients)
    res.cookie('accessToken', accessToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', maxAge: 15 * 60 * 1000, path: '/',
    });
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000, path: '/api/v1/auth/refresh',
    });

    // Fetch organization info if user belongs to one
    let organization = null;
    if (user.organizationId) {
      organization = await prisma.organization.findUnique({
        where: { id: user.organizationId },
        select: { id: true, name: true, slug: true, environment: true, fqdn: true, mfaRequired: true },
      });
    }

    logger.info(`User logged in: ${user.email} (org: ${organization?.slug || 'none'})`);
    return success(res, {
      accessToken, refreshToken, expiresIn: process.env.JWT_EXPIRY || '15m',
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, avatar: user.avatar, organizationId: user.organizationId },
      organization,
    });
  } catch (err) { next(err); }
}

// POST /api/v1/auth/signup (Public — self-registration)
async function signup(req, res, next) {
  try {
    const { email, password, firstName, lastName, phone } = req.body;

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return error(res, 'An account with this email already exists', 409);

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: { email, password: hashed, firstName, lastName, phone: phone || null, role: 'VIEWER', status: 'ACTIVE' },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, organizationId: true, createdAt: true },
    });

    // Auto-login: generate tokens + session
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.session.create({
      data: { token: accessToken, refreshToken, userId: user.id, userAgent: req.get('user-agent'), ipAddress: req.ip, expiresAt },
    });

    res.cookie('accessToken', accessToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', maxAge: 15 * 60 * 1000, path: '/',
    });
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000, path: '/api/v1/auth/refresh',
    });

    logger.info(`User self-registered: ${email}`);
    return success(res, {
      accessToken, refreshToken, expiresIn: process.env.JWT_EXPIRY || '15m',
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, avatar: null, organizationId: null },
      organization: null,
    }, 201);
  } catch (err) { next(err); }
}

// POST /api/v1/auth/register (Admin only)
async function register(req, res, next) {
  try {
    const { email, password, firstName, lastName, role, phone, department, jobTitle, organizationId } = req.body;
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    // Admin can assign org; default to admin's own org
    const orgId = organizationId || req.user.organizationId || null;
    const user = await prisma.user.create({
      data: { email, password: hashed, firstName, lastName, role: role || 'VIEWER', phone, department, jobTitle, organizationId: orgId },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, organizationId: true, createdAt: true },
    });
    logger.info(`User registered: ${email} by ${req.user.email}`);
    return success(res, user, 201);
  } catch (err) { next(err); }
}

// POST /api/v1/auth/refresh
async function refresh(req, res, next) {
  try {
    const token = req.body.refreshToken || req.cookies?.refreshToken;
    if (!token) return error(res, 'Refresh token required', 400);

    const decoded = verifyRefreshToken(token);

    // Token rotation: reject reused (blacklisted) refresh tokens
    if (decoded.jti && await isBlacklisted(decoded.jti)) {
      logger.warn(`Reuse of blacklisted refresh token detected for user ${decoded.id} (jti: ${decoded.jti})`);
      // Potential token theft — invalidate all sessions for this user
      await prisma.session.deleteMany({ where: { userId: decoded.id } });
      await blacklistAllUserTokens(decoded.id);
      return error(res, 'Token reuse detected. All sessions invalidated.', 401);
    }

    const session = await prisma.session.findFirst({ where: { refreshToken: token, userId: decoded.id } });
    if (!session) return error(res, 'Invalid session', 401);

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user || user.status !== 'ACTIVE') return error(res, 'User inactive', 401);

    // Blacklist the old refresh token before issuing new ones
    if (decoded.jti) {
      await blacklistToken(decoded.jti);
    }

    const newAccess = generateAccessToken(user);
    const newRefresh = generateRefreshToken(user);

    await prisma.session.update({
      where: { id: session.id },
      data: { token: newAccess, refreshToken: newRefresh, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });

    res.cookie('accessToken', newAccess, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', maxAge: 15 * 60 * 1000, path: '/',
    });
    res.cookie('refreshToken', newRefresh, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000, path: '/api/v1/auth/refresh',
    });

    return success(res, { accessToken: newAccess, refreshToken: newRefresh });
  } catch (err) { next(err); }
}

// POST /api/v1/auth/logout
async function logout(req, res, next) {
  try {
    // Blacklist the refresh token so it cannot be reused
    const refreshTokenValue = req.cookies?.refreshToken;
    if (refreshTokenValue) {
      try {
        const decoded = verifyRefreshToken(refreshTokenValue);
        if (decoded.jti) {
          await blacklistToken(decoded.jti);
        }
      } catch (_) { /* token already expired or invalid, ignore */ }
    }

    // Delete session from DB using the token from cookie or header
    const token = req.cookies?.accessToken || req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      await prisma.session.deleteMany({ where: { token } }).catch(() => {});
    }
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/api/v1/auth/refresh' });
    return success(res, { message: 'Logged out' });
  } catch (err) { next(err); }
}

// GET /api/v1/auth/me
async function getProfile(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, email: true, firstName: true, lastName: true, phone: true,
        avatar: true, role: true, department: true, jobTitle: true, timezone: true,
        mfaEnabled: true, lastLogin: true, skills: true, organizationId: true, createdAt: true,
        organization: { select: { id: true, name: true, slug: true, environment: true, fqdn: true } },
        teamMembers: { include: { team: { select: { id: true, name: true } } } },
      },
    });
    return success(res, user);
  } catch (err) { next(err); }
}

// PUT /api/v1/auth/me
async function updateProfile(req, res, next) {
  try {
    const { firstName, lastName, phone, timezone, avatar } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { firstName, lastName, phone, timezone, avatar },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, avatar: true, timezone: true },
    });
    return success(res, user);
  } catch (err) { next(err); }
}

// POST /api/v1/auth/change-password
async function changePassword(req, res, next) {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid) return error(res, 'Current password incorrect', 400);

    const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed, passwordChangedAt: new Date() } });
    // Invalidate all sessions + blacklist all refresh tokens
    await prisma.session.deleteMany({ where: { userId: user.id } });
    await blacklistAllUserTokens(user.id);
    return success(res, { message: 'Password changed. Please login again.' });
  } catch (err) { next(err); }
}

// GET /api/v1/auth/users
async function listUsers(req, res, next) {
  try {
    const { page = 1, limit = 25, search, role, status } = req.query;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const take = Math.min(100, Math.max(1, +limit));

    const tw = req.tenantWhere || {};
    const where = { ...tw };
    if (role && role !== 'ALL') where.role = role;
    if (status && status !== 'ALL') where.status = status;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, firstName: true, lastName: true,
          role: true, status: true, phone: true, avatar: true,
          department: true, jobTitle: true, timezone: true,
          mfaEnabled: true, skills: true,
          organizationId: true, lastLogin: true, createdAt: true, updatedAt: true,
          organization: { select: { id: true, name: true, slug: true, environment: true, fqdn: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(total / take);
    return success(res, users, 200, {
      total, page: +page, limit: take, totalPages,
      hasNext: +page < totalPages, hasPrev: +page > 1,
    });
  } catch (err) { next(err); }
}

// ═══════════════════════════════════════════════════════════
// MFA Endpoints
// ═══════════════════════════════════════════════════════════

// POST /api/v1/auth/mfa/setup — Generate TOTP secret and QR code
async function setupMfa(req, res, next) {
  try {
    const userId = req.user.userId || req.user.id;
    const existingMfa = await prisma.userMfa.findUnique({
      where: { userId },
    });

    if (existingMfa) {
      return error(res, 'MFA is already enabled. Disable it first to reconfigure.', 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    const setup = await generateMfaSetup(user.email);

    // Return setup data — user must confirm with a valid token via /mfa/confirm
    return success(res, {
      secret: setup.secret,
      qrCode: setup.qrCode,
      backupCodes: setup.backupCodes,
      message: 'Scan QR code with your authenticator app, then confirm with a token',
    });
  } catch (err) {
    logger.error('MFA setup error:', err);
    next(err);
  }
}

// POST /api/v1/auth/mfa/confirm — Verify TOTP token and enable MFA
async function confirmMfa(req, res, next) {
  const { token, secret, backupCodes } = req.body;

  if (!token || !secret || !backupCodes) {
    return error(res, 'Missing required fields: token, secret, backupCodes', 400);
  }

  try {
    const userId = req.user.userId || req.user.id;

    const existingMfa = await prisma.userMfa.findUnique({
      where: { userId },
    });
    if (existingMfa) {
      return error(res, 'MFA is already enabled', 400);
    }

    const isValid = verifyTotp(token, secret);
    if (!isValid) {
      return error(res, 'Invalid TOTP token. Please try again.', 400);
    }

    await prisma.$transaction([
      prisma.userMfa.create({
        data: {
          userId,
          secret,
          backupCodes: JSON.stringify(backupCodes),
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { mfaEnabled: true },
      }),
    ]);

    return success(res, { message: 'MFA enabled successfully. Save your backup codes securely.' }, 201);
  } catch (err) {
    logger.error('MFA confirm error:', err);
    next(err);
  }
}

// DELETE /api/v1/auth/mfa — Disable MFA (requires password)
async function disableMfa(req, res, next) {
  const { password } = req.body;

  if (!password) {
    return error(res, 'Password is required to disable MFA', 400);
  }

  try {
    const userId = req.user.userId || req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return error(res, 'Invalid password', 401);
    }

    await prisma.$transaction([
      prisma.userMfa.delete({ where: { userId: user.id } }),
      prisma.user.update({ where: { id: user.id }, data: { mfaEnabled: false } }),
    ]);

    logger.info(`MFA disabled for user: ${user.email}`);
    return success(res, { message: 'MFA disabled successfully' });
  } catch (err) {
    logger.error('Disable MFA error:', err);
    next(err);
  }
}

// GET /api/v1/auth/mfa/status — Check if MFA is enabled for current user
async function getMfaStatus(req, res, next) {
  try {
    const userId = req.user.userId || req.user.id;
    const mfa = await prisma.userMfa.findUnique({
      where: { userId },
    });

    return success(res, {
      enabled: !!mfa,
      enabledAt: mfa?.enabledAt || null,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/auth/forgot-password
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    // Always return success (don't reveal if email exists)
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const crypto = require('crypto');
      const token = crypto.randomBytes(32).toString('hex');
      const expiry = new Date(Date.now() + 3600000); // 1 hour
      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken: token, resetTokenExpiry: expiry },
      });
      // Send email (best effort)
      try {
        const { sendEmail } = require('../services/emailService');
        const { config } = require('../config/env');
        const resetUrl = `${config.frontendUrl}/reset-password?token=${token}`;
        await sendEmail(
          email,
          'LinkedEye ITSM — Password Reset',
          `<p>Click the link below to reset your password. This link expires in 1 hour.</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you did not request this, ignore this email.</p>`,
        );
      } catch (emailErr) {
        logger.warn(`Failed to send password reset email to ${email}: ${emailErr.message}`);
      }
    }
    return success(res, { message: 'If that email exists, a reset link has been sent.' });
  } catch (err) { next(err); }
}

// POST /api/v1/auth/reset-password
async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = req.body;
    const user = await prisma.user.findFirst({
      where: { resetToken: token, resetTokenExpiry: { gte: new Date() } },
    });
    if (!user) return error(res, 'Invalid or expired reset token', 400);
    const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hash, resetToken: null, resetTokenExpiry: null, passwordChangedAt: new Date() },
    });
    // Invalidate all sessions
    await prisma.session.deleteMany({ where: { userId: user.id } });
    await blacklistAllUserTokens(user.id);
    logger.info(`Password reset completed for user: ${user.email}`);
    return success(res, { message: 'Password reset successfully. Please login with your new password.' });
  } catch (err) { next(err); }
}

// PATCH /api/v1/auth/mfa/org-policy — Set organization MFA policy (ADMIN only)
async function setOrgMfaPolicy(req, res, next) {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { organizationId: true } });
    if (!user?.organizationId) return error(res, 'No organization associated with your account', 400);

    const org = await prisma.organization.update({
      where: { id: user.organizationId },
      data: { mfaRequired: req.body.mfaRequired },
      select: { id: true, name: true, mfaRequired: true },
    });

    logger.info(`MFA policy updated for org ${org.name}: mfaRequired=${org.mfaRequired} by ${req.user.email}`);
    return success(res, org);
  } catch (err) { next(err); }
}

module.exports = {
  login, signup, register, refresh, logout,
  getProfile, updateProfile, changePassword, listUsers,
  setupMfa, confirmMfa, disableMfa, getMfaStatus, setOrgMfaPolicy,
  forgotPassword, resetPassword,
};
