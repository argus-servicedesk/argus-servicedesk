// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — SMS Routes
// ═══════════════════════════════════════════════════════════

const { Router } = require('express');
const { authenticate, authorize, checkPermission, requireMfa } = require('../middleware/auth');
const { validatePagination, validateUUID } = require('../middleware/validator');
const ctrl = require('../controllers/sms.controller');

const router = Router();

// Authenticated routes
router.use(authenticate);
router.use(requireMfa);

// Send SMS
router.post('/send', checkPermission('integrations', 'create'), authorize('ADMIN', 'MANAGER', 'ENGINEER'), ctrl.sendSMS);
router.post('/bulk', checkPermission('integrations', 'create'), authorize('ADMIN', 'MANAGER'), ctrl.sendBulkSMS);

// SMS logs & stats
router.get('/logs', checkPermission('integrations', 'read'), validatePagination, ctrl.getSMSLogs);
router.get('/logs/:id', checkPermission('integrations', 'read'), validateUUID, ctrl.getSMSLog);
router.get('/stats', checkPermission('integrations', 'read'), ctrl.getSMSStats);

// Provider management
router.get('/providers', checkPermission('integrations', 'read'), authorize('ADMIN'), ctrl.getProviderStatus);
router.get('/delivery-status/:messageId', checkPermission('integrations', 'read'), ctrl.checkDeliveryStatus);

module.exports = router;
