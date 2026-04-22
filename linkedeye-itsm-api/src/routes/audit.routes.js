// ===============================================================
// LinkedEye ITSM — Audit Log Routes
// All audit routes require ADMIN or MANAGER role.
// ===============================================================

const { Router } = require('express');
const { authenticate, authorize, requireMfa } = require('../middleware/auth');
const {
  listAuditLogs,
  listResourceTypes,
  listAnomalies,
} = require('../controllers/audit.controller');

/**
 * @swagger
 * tags:
 *   - name: Audit
 *     description: Audit logs and anomaly detection (ADMIN/MANAGER only)
 */

const router = Router();

// All audit endpoints require authentication + ADMIN or MANAGER role
router.use(authenticate);
router.use(requireMfa);
router.use(authorize('ADMIN', 'MANAGER'));

/**
 * @swagger
 * /audit/logs:
 *   get:
 *     summary: Query audit logs with filtering and pagination
 *     tags: [Audit]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter by action (e.g. incident.created)
 *       - in: query
 *         name: resourceType
 *         schema:
 *           type: string
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [INFO, WARNING, CRITICAL]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [SUCCESS, FAILURE]
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Paginated audit logs
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
 *                     $ref: '#/components/schemas/AuditLog'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       403:
 *         description: ADMIN or MANAGER role required
 *
 * /audit:
 *   get:
 *     summary: Query audit logs (legacy alias for /audit/logs)
 *     tags: [Audit]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Paginated audit logs
 *
 * /audit/resource-types:
 *   get:
 *     summary: Get distinct resource types for filter dropdowns
 *     tags: [Audit]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of resource types
 *
 * /audit/anomalies:
 *   get:
 *     summary: Detect suspicious activity patterns
 *     tags: [Audit]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Anomaly detection results
 */
// Query audit logs with filtering and pagination
router.get('/logs', listAuditLogs);

// Legacy route: GET /api/v1/audit (same as /logs for backward compatibility)
router.get('/', listAuditLogs);

// Get distinct resource types for filter dropdowns
router.get('/resource-types', listResourceTypes);

// Anomaly detection: suspicious activity patterns
router.get('/anomalies', listAnomalies);

module.exports = router;
