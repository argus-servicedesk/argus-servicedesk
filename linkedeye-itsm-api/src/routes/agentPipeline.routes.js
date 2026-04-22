// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — Agent Pipeline Routes
// AI-powered automation replacing StackStorm
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { authenticate, authorize, checkPermission, requireMfa } = require('../middleware/auth');
const ctrl = require('../controllers/agentPipeline.controller');

router.use(authenticate);
router.use(requireMfa);

// Status & overview
router.get('/status', checkPermission('alerts', 'read'), ctrl.getStatus);

// Pipeline control (admin only)
router.post('/toggle', checkPermission('alerts', 'update'), authorize('ADMIN', 'MANAGER'), ctrl.togglePipeline);

// Remediation actions
router.get('/actions', checkPermission('alerts', 'read'), ctrl.listActions);
router.post('/actions/:actionId/toggle', checkPermission('alerts', 'update'), authorize('ADMIN', 'MANAGER'), ctrl.toggleAction);

// Notification rules
router.get('/notifications', checkPermission('alerts', 'read'), ctrl.listNotifications);
router.post('/notifications/:ruleId/toggle', checkPermission('alerts', 'update'), authorize('ADMIN', 'MANAGER'), ctrl.toggleNotification);

// Execution log
router.get('/executions', checkPermission('alerts', 'read'), ctrl.getExecutions);
router.get('/executions/:id', checkPermission('alerts', 'read'), ctrl.getExecution);

module.exports = router;
