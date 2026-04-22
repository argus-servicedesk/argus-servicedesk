// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — Report Routes
// ═══════════════════════════════════════════════════════════

const { Router } = require('express');
const { authenticate, authorize, checkPermission, requireMfa } = require('../middleware/auth');
const { incidentReport, changeReport, teamPerformanceReport, executiveSummary, incidentTrend } = require('../controllers/report.controller');

const router = Router();

router.use(authenticate);
router.use(requireMfa);

router.get('/incidents', checkPermission('reports', 'read'), incidentReport);
router.get('/incident-trend', checkPermission('reports', 'read'), incidentTrend);
router.get('/changes', checkPermission('reports', 'read'), changeReport);
router.get('/team-performance', checkPermission('reports', 'read'), authorize('ADMIN', 'MANAGER'), teamPerformanceReport);
router.get('/executive-summary', checkPermission('reports', 'read'), executiveSummary);

module.exports = router;
