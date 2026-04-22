// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — Site Management Routes
// ═══════════════════════════════════════════════════════════

const router = require('express').Router();
const { authenticate, requireMfa } = require('../middleware/auth');
const ctrl = require('../controllers/site.controller');

router.use(authenticate);
router.use(requireMfa);
router.get('/', ctrl.listSites);
router.get('/:id', ctrl.getSite);
router.post('/', ctrl.createSite);
router.put('/:id', ctrl.updateSite);
router.delete('/:id', ctrl.deleteSite);
router.post('/:id/test-connectivity', ctrl.testConnectivity);

module.exports = router;
