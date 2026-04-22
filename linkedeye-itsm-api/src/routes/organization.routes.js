// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — Organization Routes (Multi-Tenant)
// ═══════════════════════════════════════════════════════════

const router = require('express').Router();
const { body } = require('express-validator');
const { authenticate, authorize, requireMfa } = require('../middleware/auth');
const { validate } = require('../middleware/validator');
const { listOrganizations, getOrganization, createOrganization, updateOrganization } = require('../controllers/organization.controller');

router.use(authenticate);
router.use(requireMfa);

router.get('/', authorize('ADMIN'), listOrganizations);
router.get('/:id', authorize('ADMIN'), getOrganization);
router.post('/', authorize('ADMIN'), [
  body('name').trim().notEmpty().withMessage('Organization name is required'),
  body('slug').optional().trim().isSlug().withMessage('Slug must be URL-friendly'),
  validate,
], createOrganization);
router.patch('/:id', authorize('ADMIN'), [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('slug').optional().trim().isSlug().withMessage('Slug must be URL-friendly'),
  validate,
], updateOrganization);

module.exports = router;
