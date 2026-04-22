// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — Vendor Routes
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { authenticate, authorize, requireMfa } = require('../middleware/auth');
const { validateUUID, validatePagination } = require('../middleware/validator');
const { auditLog } = require('../middleware/audit');
const ctrl = require('../controllers/vendor.controller');

router.use(authenticate);
router.use(requireMfa);

router.get('/', validatePagination, ctrl.listVendors);
router.get('/:id', validateUUID, ctrl.getVendor);
router.post('/', authorize('ADMIN', 'MANAGER'), auditLog('Vendor'), ctrl.createVendor);
router.patch('/:id', authorize('ADMIN', 'MANAGER'), validateUUID, auditLog('Vendor'), ctrl.updateVendor);
router.delete('/:id', authorize('ADMIN'), validateUUID, auditLog('Vendor'), ctrl.deleteVendor);

module.exports = router;
