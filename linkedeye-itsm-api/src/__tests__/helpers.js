// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — Integration Test Helpers
// ═══════════════════════════════════════════════════════════

const { prisma } = require('../config/database');
const { generateAccessToken, generateRefreshToken } = require('../utils/jwt');
const bcrypt = require('bcryptjs');

/**
 * Create a test organization with a unique slug.
 */
async function createTestOrg() {
  return prisma.organization.create({
    data: {
      name: `Test Org ${Date.now()}`,
      slug: `test-org-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    },
  });
}

/**
 * Create a test user in the given organization.
 * Password defaults to 'TestPass123!@#' (meets 12-char complexity requirement).
 */
async function createTestUser(orgId, role = 'ADMIN') {
  const hashedPassword = await bcrypt.hash('TestPass123!@#', 10);
  return prisma.user.create({
    data: {
      email: `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`,
      firstName: 'Test',
      lastName: 'User',
      password: hashedPassword,
      role,
      organizationId: orgId,
    },
  });
}

/**
 * Generate a valid JWT access token for the given user.
 */
function getAuthToken(user) {
  return generateAccessToken({
    id: user.id,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId,
  });
}

/**
 * Generate a valid JWT refresh token for the given user.
 */
function getRefreshToken(user) {
  return generateRefreshToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });
}

/**
 * Clean up test data in the correct FK order.
 */
async function cleanup(orgId) {
  if (!orgId) return;
  try {
    // Delete in reverse-dependency order to avoid FK violations
    await prisma.escalationLog.deleteMany({ where: { incident: { organizationId: orgId } } }).catch(() => {});
    await prisma.activity.deleteMany({ where: { incident: { organizationId: orgId } } }).catch(() => {});
    await prisma.workNote.deleteMany({ where: { incident: { organizationId: orgId } } }).catch(() => {});
    await prisma.incidentChange.deleteMany({ where: { incident: { organizationId: orgId } } }).catch(() => {});
    await prisma.incidentProblem.deleteMany({ where: { incident: { organizationId: orgId } } }).catch(() => {});
    await prisma.attachment.deleteMany({ where: { incident: { organizationId: orgId } } }).catch(() => {});
    await prisma.incident.deleteMany({ where: { organizationId: orgId } });
    await prisma.alert.deleteMany({ where: { organizationId: orgId } }).catch(() => {});
    await prisma.session.deleteMany({ where: { user: { organizationId: orgId } } }).catch(() => {});
    await prisma.auditLog.deleteMany({ where: { organizationId: orgId } }).catch(() => {});
    await prisma.notification.deleteMany({ where: { user: { organizationId: orgId } } }).catch(() => {});
    await prisma.userMfa.deleteMany({ where: { user: { organizationId: orgId } } }).catch(() => {});
    await prisma.teamMember.deleteMany({ where: { team: { organizationId: orgId } } }).catch(() => {});
    await prisma.team.deleteMany({ where: { organizationId: orgId } }).catch(() => {});
    await prisma.user.deleteMany({ where: { organizationId: orgId } });
    await prisma.organization.delete({ where: { id: orgId } });
  } catch {
    /* ignore cleanup errors in tests */
  }
}

/** Test password that meets the 12-char complexity requirement */
const TEST_PASSWORD = 'TestPass123!@#';

module.exports = { createTestOrg, createTestUser, getAuthToken, getRefreshToken, cleanup, TEST_PASSWORD };
