// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — Knowledge Base Routes
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { authenticate, checkPermission, requireMfa } = require('../middleware/auth');
const { validateKBCategoryCreate, validateKBArticleCreate, validateKBArticleUpdate, validateKBFeedback, validateUUID, validatePagination } = require('../middleware/validator');
const { auditLog } = require('../middleware/audit');
const ctrl = require('../controllers/knowledgeBase.controller');

// ── Public endpoint: published articles (for portal) ───
router.get('/articles/published', validatePagination, ctrl.listPublishedArticles);

// ── Authenticated routes ───────────────────────────────
router.use(authenticate);
router.use(requireMfa);

// Categories
router.get('/categories', checkPermission('knowledgeBase', 'read'), ctrl.listCategories);
router.post('/categories', checkPermission('knowledgeBase', 'create'), validateKBCategoryCreate, auditLog('KBCategory'), ctrl.createCategory);
router.patch('/categories/:id', checkPermission('knowledgeBase', 'update'), validateUUID, auditLog('KBCategory'), ctrl.updateCategory);

// Articles
router.get('/articles', checkPermission('knowledgeBase', 'read'), validatePagination, ctrl.listArticles);
router.get('/articles/:id', checkPermission('knowledgeBase', 'read'), validateUUID, ctrl.getArticle);
router.post('/articles', checkPermission('knowledgeBase', 'create'), validateKBArticleCreate, auditLog('KBArticle'), ctrl.createArticle);
router.patch('/articles/:id', checkPermission('knowledgeBase', 'update'), validateKBArticleUpdate, auditLog('KBArticle'), ctrl.updateArticle);

// Feedback
router.post('/articles/:id/feedback', validateUUID, validateKBFeedback, ctrl.submitFeedback);

module.exports = router;
