// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — AI Agent Routes (Infrastructure Intelligence)
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { authenticate, checkPermission, requireMfa } = require('../middleware/auth');
const { cacheMiddleware } = require('../config/redis');
const ctrl = require('../controllers/aiAgent.controller');

router.use(authenticate);
router.use(requireMfa);

router.get('/cluster-health', checkPermission('reports', 'read'), cacheMiddleware('ai-agent:cluster', 60), ctrl.getClusterHealth);
router.get('/server-analysis', checkPermission('reports', 'read'), cacheMiddleware('ai-agent:server', 60), ctrl.getServerAnalysis);
router.get('/db-analysis', checkPermission('reports', 'read'), cacheMiddleware('ai-agent:db', 60), ctrl.getDBAnalysis);
router.get('/log-analysis', checkPermission('reports', 'read'), cacheMiddleware('ai-agent:logs', 30), ctrl.getLogAnalysis);
router.get('/incidents/:id/resolution-details', checkPermission('reports', 'read'), ctrl.getResolutionDetails);
router.get('/tips', checkPermission('reports', 'read'), cacheMiddleware('ai-agent:tips', 120), ctrl.getTips);
router.get('/assets/:id/live-metrics', checkPermission('reports', 'read'), cacheMiddleware('ai-agent:asset', 30), ctrl.getAssetLiveMetrics);
router.get('/assets/:id/metrics-history', checkPermission('reports', 'read'), cacheMiddleware('ai-agent:asset-history', 60), ctrl.getAssetMetricsHistory);
router.get('/grafana-dashboards', checkPermission('reports', 'read'), cacheMiddleware('ai-agent:grafana', 300), ctrl.getGrafanaDashboards);
router.get('/infrastructure-metrics', checkPermission('reports', 'read'), cacheMiddleware('ai-agent:infra', 30), ctrl.getInfrastructureMetrics);

module.exports = router;
