// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — Search Routes
// ═══════════════════════════════════════════════════════════

const { Router } = require('express');
const { authenticate, requireMfa } = require('../middleware/auth');
const { globalSearch } = require('../controllers/search.controller');

const router = Router();

router.get('/', authenticate, requireMfa, globalSearch);

module.exports = router;
