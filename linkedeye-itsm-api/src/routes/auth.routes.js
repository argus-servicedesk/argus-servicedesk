// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — Auth Routes
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate, validatePassword } = require('../middleware/validator');
const { authenticate, authorize } = require('../middleware/auth');
const { authLimiter, refreshLimiter } = require('../middleware/rateLimiter');
const ctrl = require('../controllers/auth.controller');

/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Authentication, registration, profile, and MFA
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Authenticate user
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *               mfaToken:
 *                 type: string
 *                 description: 6-digit TOTP code (if MFA enabled)
 *     responses:
 *       200:
 *         description: Login successful (or MFA required)
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', authLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  validate,
], ctrl.login);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request password reset email
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Reset email sent (always returns success)
 */
router.post('/forgot-password', authLimiter, [
  body('email').isEmail().normalizeEmail(),
  validate,
], ctrl.forgotPassword);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset password using token from email
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, newPassword]
 *             properties:
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired reset token
 */
router.post('/reset-password', authLimiter, [
  body('token').notEmpty(),
  ...validatePassword('newPassword'),
  validate,
], ctrl.resetPassword);

/**
 * @swagger
 * /auth/signup:
 *   post:
 *     summary: Self-service tenant signup (creates org + admin user)
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, firstName, lastName]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 description: "Min 12 chars, must include uppercase, lowercase, number, special char"
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *     responses:
 *       201:
 *         description: Organization and admin user created
 *       409:
 *         description: Email already registered
 */
router.post('/signup', authLimiter, [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  ...validatePassword('password'),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  validate,
], ctrl.signup);

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Admin registers a new user within their org
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, firstName, lastName]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [ADMIN, MANAGER, ENGINEER, OPERATOR, VIEWER]
 *     responses:
 *       201:
 *         description: User created
 *       403:
 *         description: Admin role required
 */
router.post('/register', authenticate, authorize('ADMIN'), [
  body('email').isEmail().normalizeEmail(),
  ...validatePassword('password'),
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty(),
  body('role').optional().isIn(['ADMIN', 'MANAGER', 'ENGINEER', 'OPERATOR', 'VIEWER']),
  validate,
], ctrl.register);

/**
 * @swagger
 * /auth/users:
 *   get:
 *     summary: List users in the current org
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 */
router.get('/users', authenticate, ctrl.listUsers);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token using httpOnly cookie
 *     tags: [Auth]
 *     security: []
 *     responses:
 *       200:
 *         description: New access token issued
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post('/refresh', refreshLimiter, ctrl.refresh);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout and clear refresh token
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post('/logout', authenticate, ctrl.logout);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Current user profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *   put:
 *     summary: Update current user profile
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.get('/me', authenticate, ctrl.getProfile);
router.put('/me', authenticate, ctrl.updateProfile);

/**
 * @swagger
 * /auth/change-password:
 *   post:
 *     summary: Change current user password
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [oldPassword, newPassword]
 *             properties:
 *               oldPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed
 *       401:
 *         description: Old password incorrect
 */
router.post('/change-password', authenticate, [
  body('oldPassword').notEmpty(),
  ...validatePassword('newPassword'),
  validate,
], ctrl.changePassword);

// ── MFA routes (all require authentication) ─────────────

/**
 * @swagger
 * /auth/mfa/setup:
 *   post:
 *     summary: Generate MFA secret and QR code
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: MFA secret and QR code URL
 *
 * /auth/mfa/confirm:
 *   post:
 *     summary: Confirm MFA setup with TOTP token
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, secret, backupCodes]
 *             properties:
 *               token:
 *                 type: string
 *                 description: 6-digit TOTP code
 *               secret:
 *                 type: string
 *               backupCodes:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: MFA enabled
 *
 * /auth/mfa:
 *   delete:
 *     summary: Disable MFA (requires password)
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: MFA disabled
 *
 * /auth/mfa/status:
 *   get:
 *     summary: Check if MFA is enabled for current user
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: MFA status
 */
router.post('/mfa/setup', authenticate, ctrl.setupMfa);
router.post('/mfa/confirm', authenticate, [
  body('token').isLength({ min: 6, max: 6 }).withMessage('TOTP token must be 6 digits'),
  body('secret').notEmpty().withMessage('Secret is required'),
  body('backupCodes').isArray({ min: 1 }).withMessage('Backup codes are required'),
  validate,
], ctrl.confirmMfa);
router.delete('/mfa', authenticate, [
  body('password').notEmpty().withMessage('Password is required'),
  validate,
], ctrl.disableMfa);
router.get('/mfa/status', authenticate, ctrl.getMfaStatus);

// ── Admin: Organization MFA Policy ─────────────────────
router.patch('/mfa/org-policy', authenticate, authorize('ADMIN'), [
  body('mfaRequired').isBoolean().withMessage('mfaRequired must be true or false'),
  validate,
], ctrl.setOrgMfaPolicy);

module.exports = router;
