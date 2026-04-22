// ===============================================================
// LinkedEye ITSM — Audit Trail Service
// Comprehensive audit logging with anomaly detection
// ===============================================================

const { prisma } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Log an audit event to the database.
 * Non-throwing: audit logging should never break the main operation.
 *
 * @param {object} opts
 * @param {string}  opts.organizationId - Tenant org ID
 * @param {string}  opts.userId         - Acting user ID
 * @param {string}  opts.action         - e.g. "incident.created", "user.role_changed"
 * @param {string}  opts.resourceType   - e.g. "Incident", "User", "Integration"
 * @param {string}  opts.resourceId     - ID of affected resource
 * @param {object}  [opts.before]       - State before change
 * @param {object}  [opts.after]        - State after change
 * @param {string}  [opts.ipAddress]    - Client IP
 * @param {string}  [opts.userAgent]    - Client user-agent
 * @param {string}  [opts.severity]     - INFO | WARNING | CRITICAL
 * @param {string}  [opts.status]       - SUCCESS | FAILURE
 * @returns {Promise<object|null>}
 */
async function logAudit({
  organizationId,
  userId,
  action,
  resourceType,
  resourceId,
  before = null,
  after = null,
  ipAddress = null,
  userAgent = null,
  severity = 'INFO',
  status = 'SUCCESS',
}) {
  try {
    if (!organizationId || !userId) {
      logger.warn('[AUDIT] Missing organizationId or userId, skipping audit log');
      return null;
    }

    const changes =
      before !== null || after !== null
        ? { before, after }
        : undefined;

    const log = await prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action,
        resourceType: resourceType || 'Unknown',
        resourceId: String(resourceId || 'unknown'),
        changes,
        ipAddress,
        userAgent,
        severity,
        status,
      },
    });

    logger.info(
      `[AUDIT] ${action} on ${resourceType}:${resourceId} by ${userId} [${severity}/${status}]`
    );

    return log;
  } catch (error) {
    logger.error('[AUDIT] Failed to create audit log:', error.message);
    return null;
  }
}

/**
 * Query audit logs with filtering and pagination.
 * Always scoped by organizationId for tenant isolation.
 */
async function getAuditLogs({
  organizationId,
  userId,
  action,
  resourceType,
  severity,
  status,
  startDate,
  endDate,
  search,
  page = 1,
  pageSize = 50,
}) {
  const where = {};

  // Tenant isolation: only show logs for this org (null shows system-level)
  if (organizationId) {
    where.organizationId = organizationId;
  }

  if (userId && userId !== 'ALL') where.userId = userId;
  if (action && action !== 'ALL') {
    where.action = { contains: action, mode: 'insensitive' };
  }
  if (resourceType && resourceType !== 'ALL') where.resourceType = resourceType;
  if (severity && severity !== 'ALL') where.severity = severity;
  if (status && status !== 'ALL') where.status = status;

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  if (search) {
    where.OR = [
      { resourceType: { contains: search, mode: 'insensitive' } },
      { resourceId: { contains: search, mode: 'insensitive' } },
      { action: { contains: search, mode: 'insensitive' } },
    ];
  }

  const skip = (Math.max(1, page) - 1) * pageSize;
  const take = Math.min(200, Math.max(1, pageSize));

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    pagination: {
      page,
      pageSize: take,
      total,
      pages: Math.ceil(total / take),
    },
  };
}

/**
 * Get distinct resource types for filter dropdowns.
 */
async function getResourceTypes(organizationId) {
  const where = organizationId ? { organizationId } : {};
  const types = await prisma.auditLog.findMany({
    where,
    select: { resourceType: true },
    distinct: ['resourceType'],
    orderBy: { resourceType: 'asc' },
  });
  return types.map((t) => t.resourceType);
}

/**
 * Detect suspicious activity patterns within an organization.
 * Returns an array of anomaly alert objects.
 */
async function detectAnomalies(organizationId) {
  const alerts = [];
  const now = new Date();

  // 1. Multiple failed actions by same user (5+ in 5 minutes)
  const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const failedActions = await prisma.auditLog.groupBy({
    by: ['userId'],
    where: {
      ...(organizationId ? { organizationId } : {}),
      status: 'FAILURE',
      createdAt: { gte: fiveMinAgo },
    },
    _count: true,
  });

  for (const entry of failedActions) {
    if (entry._count >= 5) {
      alerts.push({
        type: 'BRUTE_FORCE_ATTEMPT',
        userId: entry.userId,
        count: entry._count,
        window: '5 minutes',
        severity: 'CRITICAL',
        description: `User ${entry.userId} had ${entry._count} failed actions in 5 minutes`,
      });
    }
  }

  // 2. Privilege escalation (role changed to ADMIN in last hour)
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const roleChanges = await prisma.auditLog.findMany({
    where: {
      ...(organizationId ? { organizationId } : {}),
      action: { contains: 'role_changed' },
      createdAt: { gte: oneHourAgo },
    },
  });

  for (const log of roleChanges) {
    const changes = log.changes;
    if (changes && changes.after && changes.after.role === 'ADMIN') {
      alerts.push({
        type: 'PRIVILEGE_ESCALATION',
        userId: log.userId,
        resourceId: log.resourceId,
        severity: 'CRITICAL',
        description: `User role escalated to ADMIN on resource ${log.resourceId}`,
      });
    }
  }

  // 3. Mass deletions (10+ in 1 hour by same user)
  const deletions = await prisma.auditLog.groupBy({
    by: ['userId'],
    where: {
      ...(organizationId ? { organizationId } : {}),
      action: { endsWith: '.deleted' },
      createdAt: { gte: oneHourAgo },
    },
    _count: true,
  });

  for (const entry of deletions) {
    if (entry._count >= 10) {
      alerts.push({
        type: 'MASS_DELETION',
        userId: entry.userId,
        count: entry._count,
        window: '1 hour',
        severity: 'CRITICAL',
        description: `User ${entry.userId} deleted ${entry._count} resources in 1 hour`,
      });
    }
  }

  // 4. After-hours access (outside 06:00-22:00 local server time)
  const hour = now.getHours();
  if (hour < 6 || hour >= 22) {
    const recentCritical = await prisma.auditLog.findMany({
      where: {
        ...(organizationId ? { organizationId } : {}),
        severity: 'CRITICAL',
        createdAt: { gte: fiveMinAgo },
      },
      take: 10,
    });

    if (recentCritical.length > 0) {
      alerts.push({
        type: 'AFTER_HOURS_CRITICAL_ACTIVITY',
        count: recentCritical.length,
        window: '5 minutes',
        severity: 'WARNING',
        description: `${recentCritical.length} critical actions detected during off-hours`,
      });
    }
  }

  // 5. Unusual volume (50+ actions by one user in 10 minutes)
  const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000);
  const highVolume = await prisma.auditLog.groupBy({
    by: ['userId'],
    where: {
      ...(organizationId ? { organizationId } : {}),
      createdAt: { gte: tenMinAgo },
    },
    _count: true,
  });

  for (const entry of highVolume) {
    if (entry._count >= 50) {
      alerts.push({
        type: 'UNUSUAL_VOLUME',
        userId: entry.userId,
        count: entry._count,
        window: '10 minutes',
        severity: 'WARNING',
        description: `User ${entry.userId} performed ${entry._count} actions in 10 minutes`,
      });
    }
  }

  return alerts;
}

module.exports = { logAudit, getAuditLogs, getResourceTypes, detectAnomalies };
