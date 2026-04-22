const express = require('express');
const router = express.Router();
const { authenticate, authorize, checkPermission, requireMfa } = require('../middleware/auth');
const { tenantContext } = require('../middleware/tenant');
const ctrl = require('../controllers/k8s.controller');

router.use(authenticate, tenantContext);
router.use(requireMfa);

// Cluster overview — nodes, pod counts, namespace summary
router.get('/overview', checkPermission('assets', 'read'), ctrl.clusterOverview);

// Pods in a namespace
router.get('/pods', checkPermission('assets', 'read'), ctrl.listPods);

// Deployments in a namespace
router.get('/deployments', checkPermission('assets', 'read'), ctrl.listDeployments);

// Warning events in a namespace
router.get('/events', checkPermission('assets', 'read'), ctrl.listEvents);

// Services in a namespace
router.get('/services', checkPermission('assets', 'read'), ctrl.listServices);

// Pod logs
router.get('/pods/:pod/logs', checkPermission('assets', 'read'), ctrl.podLogs);

// Loki log queries
router.get('/logs', checkPermission('assets', 'read'), ctrl.lokiLogs);
router.get('/logs/labels', checkPermission('assets', 'read'), ctrl.lokiLabels);
router.get('/logs/labels/:name/values', checkPermission('assets', 'read'), ctrl.lokiLabelValues);

// Sync K8s nodes → CMDB assets (ADMIN only)
router.post('/sync-assets', checkPermission('assets', 'create'), authorize('ADMIN'), ctrl.syncK8sAssets);

module.exports = router;
