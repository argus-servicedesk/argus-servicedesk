// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — Alert Routes
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { authenticate, checkPermission, requireMfa } = require('../middleware/auth');
const { validateUUID, validatePagination } = require('../middleware/validator');
const { webhookLimiter } = require('../middleware/rateLimiter');
const ctrl = require('../controllers/alert.controller');

/**
 * @swagger
 * tags:
 *   - name: Alerts
 *     description: Alert management and webhook ingestion
 */

/**
 * @swagger
 * /alerts/webhook:
 *   post:
 *     summary: Receive alert webhook (Prometheus/Grafana)
 *     tags: [Alerts]
 *     security: []
 *     description: Inbound webhook for Prometheus Alertmanager or Grafana. Uses signing secret for auth.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Alert(s) received
 *       429:
 *         description: Rate limit exceeded
 */
// Webhook endpoint (no auth — uses signing secret)
router.post('/webhook', webhookLimiter, ctrl.receiveWebhook);

// Authenticated routes
router.use(authenticate);
router.use(requireMfa);

/**
 * @swagger
 * /alerts:
 *   get:
 *     summary: List alerts
 *     tags: [Alerts]
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
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [CRITICAL, WARNING, INFO]
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *           enum: [FIRING, ACKNOWLEDGED, RESOLVED, EXPIRED]
 *     responses:
 *       200:
 *         description: Paginated list of alerts
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
 *                     $ref: '#/components/schemas/Alert'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *
 * /alerts/stats:
 *   get:
 *     summary: Get alert statistics
 *     tags: [Alerts]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Alert stats (counts by severity, state, etc.)
 *
 * /alerts/kb:
 *   get:
 *     summary: Get alert knowledge base entries
 *     tags: [Alerts]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Alert knowledge base
 *
 * /alerts/{id}:
 *   get:
 *     summary: Get alert by ID
 *     tags: [Alerts]
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
 *         description: Alert details
 *       404:
 *         description: Alert not found
 *
 * /alerts/{id}/acknowledge:
 *   post:
 *     summary: Acknowledge alert
 *     tags: [Alerts]
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
 *         description: Alert acknowledged
 *
 * /alerts/{id}/silence:
 *   post:
 *     summary: Silence alert
 *     tags: [Alerts]
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
 *         description: Alert silenced
 *
 * /alerts/{id}/create-incident:
 *   post:
 *     summary: Create incident from alert
 *     tags: [Alerts]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       201:
 *         description: Incident created from alert
 */
router.get('/', checkPermission('alerts', 'read'), validatePagination, ctrl.listAlerts);
router.get('/stats', checkPermission('alerts', 'read'), ctrl.getAlertStats);
router.get('/kb', checkPermission('alerts', 'read'), ctrl.getAlertKBEndpoint);
router.get('/:id', checkPermission('alerts', 'read'), validateUUID, ctrl.getAlert);
router.post('/:id/acknowledge', checkPermission('alerts', 'update'), validateUUID, ctrl.acknowledgeAlert);
router.post('/:id/silence', checkPermission('alerts', 'update'), validateUUID, ctrl.silenceAlert);
router.post('/:id/create-incident', checkPermission('incidents', 'create'), validateUUID, ctrl.createIncidentFromAlert);

module.exports = router;
