// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — IP Address Inventory Routes
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { authenticate, checkPermission, requireMfa } = require('../middleware/auth');
const { validateUUID, validatePagination } = require('../middleware/validator');
const { auditLog } = require('../middleware/audit');
const ctrl = require('../controllers/ipInventory.controller');

router.use(authenticate);
router.use(requireMfa);

router.get('/', checkPermission('assets', 'read'), validatePagination, ctrl.listIPAddresses);
router.get('/available', checkPermission('assets', 'read'), validatePagination, ctrl.listAvailable);
router.get('/:id', checkPermission('assets', 'read'), validateUUID, ctrl.getIPAddress);
router.post('/', checkPermission('assets', 'create'), auditLog('IPAddressInventory'), ctrl.createIPAddress);
router.patch('/:id', checkPermission('assets', 'update'), validateUUID, auditLog('IPAddressInventory'), ctrl.updateIPAddress);
router.delete('/:id', checkPermission('assets', 'delete'), validateUUID, auditLog('IPAddressInventory'), ctrl.deleteIPAddress);
router.post('/:id/assign', checkPermission('assets', 'update'), validateUUID, auditLog('IPAddressInventory'), ctrl.assignToAsset);
router.post('/:id/release', checkPermission('assets', 'update'), validateUUID, auditLog('IPAddressInventory'), ctrl.releaseFromAsset);

module.exports = router;
