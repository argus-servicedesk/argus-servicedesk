// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — BOD/EOD Routes
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { authenticate, checkPermission, requireMfa } = require('../middleware/auth');
const ctrl = require('../controllers/bodEod.controller');

router.use(authenticate);
router.use(requireMfa);

// Full overview (BOD + EOD + ADP + URL health)
router.get('/overview', checkPermission('reports', 'read'), ctrl.getOverview);

// Individual checklists
router.get('/bod', checkPermission('reports', 'read'), ctrl.getBodChecklist);
router.get('/eod', checkPermission('reports', 'read'), ctrl.getEodChecklist);

module.exports = router;
