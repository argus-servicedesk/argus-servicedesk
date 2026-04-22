// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — Service Request Routes
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { authenticate, checkPermission, requireMfa } = require('../middleware/auth');
const { validateServiceRequestCreate, validateServiceRequestUpdate, validateUUID, validatePagination } = require('../middleware/validator');
const { auditLog } = require('../middleware/audit');
const ctrl = require('../controllers/serviceRequest.controller');

router.use(authenticate);
router.use(requireMfa);

// ── My requests (must be before /:id) ──────────────────
router.get('/my', ctrl.myServiceRequests);

// ── CRUD ───────────────────────────────────────────────
router.get('/', checkPermission('serviceRequests', 'read'), validatePagination, ctrl.listServiceRequests);
router.get('/:id', checkPermission('serviceRequests', 'read'), validateUUID, ctrl.getServiceRequest);
router.post('/', checkPermission('serviceRequests', 'create'), validateServiceRequestCreate, auditLog('ServiceRequest'), ctrl.createServiceRequest);
router.patch('/:id', checkPermission('serviceRequests', 'update'), validateServiceRequestUpdate, auditLog('ServiceRequest'), ctrl.updateServiceRequest);

// ── Approval actions ───────────────────────────────────
router.post('/:id/approve', checkPermission('serviceRequests', 'update'), validateUUID, auditLog('ServiceRequest'), ctrl.approveServiceRequest);
router.post('/:id/reject', checkPermission('serviceRequests', 'update'), validateUUID, auditLog('ServiceRequest'), ctrl.rejectServiceRequest);

module.exports = router;
