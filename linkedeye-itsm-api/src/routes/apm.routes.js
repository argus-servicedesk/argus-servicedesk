// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — APM Routes
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { authenticate, checkPermission, requireMfa } = require('../middleware/auth');
const ctrl = require('../controllers/apm.controller');

router.use(authenticate);
router.use(requireMfa);

// Full overview (all metrics in one call)
router.get('/overview', checkPermission('assets', 'read'), ctrl.getOverview);

// Individual metric endpoints
router.get('/process-status', checkPermission('assets', 'read'), ctrl.getProcessStatus);
router.get('/url-status', checkPermission('assets', 'read'), ctrl.getUrlStatus);
router.get('/infra-metrics', checkPermission('assets', 'read'), ctrl.getInfraMetrics);
router.get('/infrastructure', checkPermission('assets', 'read'), ctrl.getInfraMetrics);   // alias used by frontend
router.get('/network', checkPermission('assets', 'read'), ctrl.getNetworkStatus);
router.get('/k8s-health', checkPermission('assets', 'read'), ctrl.getK8sHealth);
router.get('/k8s', checkPermission('assets', 'read'), ctrl.getK8sHealth);                 // alias used by frontend
router.get('/services', checkPermission('assets', 'read'), ctrl.getServiceHealth);
router.get('/active-alerts', checkPermission('assets', 'read'), ctrl.getActiveAlerts);

// Annotations
router.post('/annotations', checkPermission('assets', 'update'), ctrl.addAnnotation);

module.exports = router;
