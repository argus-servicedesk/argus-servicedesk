// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — Service Catalog Routes
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { authenticate, checkPermission, requireMfa } = require('../middleware/auth');
const { validateCategoryCreate, validateCatalogItemCreate, validateCatalogItemUpdate, validateUUID, validatePagination } = require('../middleware/validator');
const { auditLog } = require('../middleware/audit');
const ctrl = require('../controllers/catalog.controller');

router.use(authenticate);
router.use(requireMfa);

// ── Categories ─────────────────────────────────────────
router.get('/categories', checkPermission('catalog', 'read'), ctrl.listCategories);
router.post('/categories', checkPermission('catalog', 'create'), validateCategoryCreate, auditLog('ServiceCategory'), ctrl.createCategory);
router.patch('/categories/:id', checkPermission('catalog', 'update'), validateUUID, auditLog('ServiceCategory'), ctrl.updateCategory);
router.delete('/categories/:id', checkPermission('catalog', 'delete'), validateUUID, auditLog('ServiceCategory'), ctrl.deleteCategory);

// ── Catalog Items ──────────────────────────────────────
router.get('/items', checkPermission('catalog', 'read'), validatePagination, ctrl.listItems);
router.get('/items/:id', checkPermission('catalog', 'read'), validateUUID, ctrl.getItem);
router.post('/items', checkPermission('catalog', 'create'), validateCatalogItemCreate, auditLog('CatalogItem'), ctrl.createItem);
router.patch('/items/:id', checkPermission('catalog', 'update'), validateCatalogItemUpdate, auditLog('CatalogItem'), ctrl.updateItem);
router.delete('/items/:id', checkPermission('catalog', 'delete'), validateUUID, auditLog('CatalogItem'), ctrl.deleteItem);

module.exports = router;
