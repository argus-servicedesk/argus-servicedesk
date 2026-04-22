// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — AI Routes (Claude + OpenAI Fallback)
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { authenticate, checkPermission, requireMfa } = require('../middleware/auth');
const { cacheMiddleware } = require('../config/redis');
const ctrl = require('../controllers/ai.controller');

router.use(authenticate);
router.use(requireMfa);

router.get('/stats', checkPermission('reports', 'read'), cacheMiddleware('ai:stats', 30), ctrl.getAIStats);
router.get('/classifications', checkPermission('reports', 'read'), ctrl.getClassifications);
router.get('/suggestions', checkPermission('reports', 'read'), ctrl.getSuggestions);
router.post('/chat', checkPermission('reports', 'read'), ctrl.chat);

module.exports = router;
