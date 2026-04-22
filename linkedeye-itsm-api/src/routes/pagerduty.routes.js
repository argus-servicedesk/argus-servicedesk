// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — PagerDuty Routes
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { authenticate, authorize, checkPermission, requireMfa } = require('../middleware/auth');
const ctrl = require('../controllers/pagerduty.controller');

// Webhook endpoint — no auth (PagerDuty calls this)
router.post('/webhook', ctrl.handleWebhook);

// All other routes require auth
router.use(authenticate);
router.use(requireMfa);

// Connection management (admin only)
router.post('/validate', authorize('ADMIN', 'MANAGER'), ctrl.validate);
router.post('/connect', authorize('ADMIN'), ctrl.connect);
router.delete('/disconnect', authorize('ADMIN'), ctrl.disconnect);

// Read-only data (all authenticated users)
router.get('/status', checkPermission('integrations', 'read'), ctrl.getStatus);
router.get('/overview', checkPermission('integrations', 'read'), ctrl.getOverview);
router.get('/services', checkPermission('integrations', 'read'), ctrl.getServices);
router.get('/incidents', checkPermission('integrations', 'read'), ctrl.getIncidents);
router.get('/oncall', checkPermission('integrations', 'read'), ctrl.getOnCalls);
router.get('/escalation-policies', checkPermission('integrations', 'read'), ctrl.getEscalationPolicies);
router.get('/users', checkPermission('integrations', 'read'), ctrl.getUsers);
router.get('/stats', checkPermission('integrations', 'read'), ctrl.getStats);

module.exports = router;
