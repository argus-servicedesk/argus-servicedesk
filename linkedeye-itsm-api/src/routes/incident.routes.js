// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — Incident Routes
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { authenticate, checkPermission, requireMfa } = require('../middleware/auth');
const { validateIncidentCreate, validateIncidentUpdate, validateUUID, validatePagination, validateWorkNote } = require('../middleware/validator');
const { auditLog } = require('../middleware/audit');
const ctrl = require('../controllers/incident.controller');
const reportController = require('../controllers/incident-report.controller');

/**
 * @swagger
 * tags:
 *   - name: Incidents
 *     description: Incident management (ITIL)
 */

/**
 * @swagger
 * /incidents/ack:
 *   get:
 *     summary: One-click acknowledge from email (uses signed JWT in query)
 *     tags: [Incidents]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Incident acknowledged
 *       401:
 *         description: Invalid or expired token
 */
// ── Public one-click acknowledge (no auth — signed JWT in URL) ────────────────
// Must be defined BEFORE router.use(authenticate)
router.get('/ack', ctrl.acknowledgeFromEmail);

router.use(authenticate);
router.use(requireMfa);

// ── Report routes (specific paths must come before /:id param routes) ────────

/**
 * @swagger
 * /incidents/bulk-report:
 *   post:
 *     summary: Generate bulk incident report
 *     tags: [Incidents]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Bulk report generated
 */
// Bulk report — POST /api/v1/incidents/bulk-report
router.post('/bulk-report',
  checkPermission('incidents', 'read'),
  reportController.bulkReportValidation,
  reportController.generateBulkReport
);

// ── Standard CRUD ─────────────────────────────────────────────────────────────

/**
 * @swagger
 * /incidents:
 *   get:
 *     summary: List incidents
 *     tags: [Incidents]
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
 *         name: state
 *         schema:
 *           type: string
 *           enum: [NEW, OPEN, IN_PROGRESS, ON_HOLD, RESOLVED, CLOSED]
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [P1, P2, P3, P4]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated list of incidents
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
 *                     $ref: '#/components/schemas/Incident'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *   post:
 *     summary: Create incident
 *     tags: [Incidents]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               impact:
 *                 type: string
 *                 enum: [HIGH, MEDIUM, LOW]
 *               urgency:
 *                 type: string
 *                 enum: [HIGH, MEDIUM, LOW]
 *               assigneeId:
 *                 type: string
 *               teamId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Incident created
 *
 * /incidents/{id}:
 *   get:
 *     summary: Get incident by ID
 *     tags: [Incidents]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Incident details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Incident'
 *       404:
 *         description: Incident not found
 *   patch:
 *     summary: Update incident
 *     tags: [Incidents]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               state:
 *                 type: string
 *                 enum: [NEW, OPEN, IN_PROGRESS, ON_HOLD, RESOLVED, CLOSED]
 *               impact:
 *                 type: string
 *                 enum: [HIGH, MEDIUM, LOW]
 *               urgency:
 *                 type: string
 *                 enum: [HIGH, MEDIUM, LOW]
 *               assigneeId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Incident updated
 *   delete:
 *     summary: Delete incident
 *     tags: [Incidents]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Incident deleted
 *
 * /incidents/{id}/notes:
 *   post:
 *     summary: Add work note to incident
 *     tags: [Incidents]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *               isInternal:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Work note added
 *
 * /incidents/{id}/timeline:
 *   get:
 *     summary: Get incident timeline / activity log
 *     tags: [Incidents]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Timeline events
 *
 * /incidents/{id}/live-context:
 *   get:
 *     summary: Get live context (metrics, related alerts) for incident
 *     tags: [Incidents]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Live context data
 *
 * /incidents/{id}/escalation-logs:
 *   get:
 *     summary: Get escalation logs for incident
 *     tags: [Incidents]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Escalation log entries
 *
 * /incidents/{id}/report:
 *   get:
 *     summary: Generate single incident report
 *     tags: [Incidents]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Incident report
 */
router.get('/', checkPermission('incidents', 'read'), validatePagination, ctrl.listIncidents);
router.get('/:id', checkPermission('incidents', 'read'), validateUUID, ctrl.getIncident);
router.post('/', checkPermission('incidents', 'create'), validateIncidentCreate, auditLog('Incident'), ctrl.createIncident);
router.patch('/:id', checkPermission('incidents', 'update'), validateIncidentUpdate, auditLog('Incident'), ctrl.updateIncident);
router.delete('/:id', checkPermission('incidents', 'delete'), validateUUID, auditLog('Incident'), ctrl.deleteIncident);

router.post('/:id/notes', checkPermission('incidents', 'update'), validateUUID, validateWorkNote, ctrl.addWorkNote);
router.get('/:id/timeline', checkPermission('incidents', 'read'), validateUUID, ctrl.getTimeline);
router.get('/:id/live-context', checkPermission('incidents', 'read'), validateUUID, ctrl.getLiveContext);
router.get('/:id/escalation-logs', checkPermission('incidents', 'read'), validateUUID, ctrl.getEscalationLogs);
router.post('/:id/changes', checkPermission('incidents', 'update'), validateUUID, ctrl.linkChange);
router.post('/:id/problems', checkPermission('incidents', 'update'), validateUUID, ctrl.linkProblem);

// Single incident report — GET /api/v1/incidents/:id/report
router.get('/:id/report',
  checkPermission('incidents', 'read'),
  reportController.reportValidation,
  reportController.generateIncidentReport
);

module.exports = router;
