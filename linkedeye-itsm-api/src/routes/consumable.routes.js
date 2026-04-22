// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — Consumable Routes
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { authenticate, checkPermission } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');
const ctrl = require('../controllers/consumable.controller');

router.use(authenticate);

router.get('/', checkPermission('assets', 'read'), ctrl.listConsumables);
router.get('/stats', checkPermission('assets', 'read'), ctrl.getConsumableStats);
router.post('/', checkPermission('assets', 'create'), auditLog('Consumable'), ctrl.createConsumable);
router.get('/:id', checkPermission('assets', 'read'), ctrl.getConsumable);
router.patch('/:id', checkPermission('assets', 'update'), auditLog('Consumable'), ctrl.updateConsumable);
router.delete('/:id', checkPermission('assets', 'delete'), auditLog('Consumable'), ctrl.deleteConsumable);
router.post('/:id/add-stock', checkPermission('assets', 'update'), auditLog('Consumable'), ctrl.addStock);
router.post('/:id/use', checkPermission('assets', 'update'), auditLog('Consumable'), ctrl.useStock);

module.exports = router;
