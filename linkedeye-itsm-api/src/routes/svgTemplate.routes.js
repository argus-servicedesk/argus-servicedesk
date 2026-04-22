// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — SVG Template Routes
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { authenticate, requireMfa } = require('../middleware/auth');
const ctrl = require('../controllers/svgTemplate.controller');

router.use(authenticate);
router.use(requireMfa);

// GET /api/v1/svg-templates — list all available templates
router.get('/', ctrl.listTemplates);

// GET /api/v1/svg-templates/:templateId — get a single template (optional ?ip= for IP substitution)
router.get('/:templateId', ctrl.getTemplate);

module.exports = router;
