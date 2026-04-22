// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — Request Validators (express-validator)
// ═══════════════════════════════════════════════════════════

const { body, param, query, validationResult } = require('express-validator');
const { INCIDENT_STATES, CHANGE_STATES, PROBLEM_STATES, PRIORITIES, IMPACTS, URGENCIES, SERVICE_REQUEST_STATES, REQUEST_ITEM_STATES, CATALOG_ITEM_TYPES, KB_ARTICLE_STATES } = require('../config/constants');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }
  next();
}

// ── Incident ────────────────────────────────────────────

const validateIncidentCreate = [
  body('shortDescription').trim().isLength({ min: 3, max: 200 }).withMessage('Short description: 3-200 chars'),
  body('impact').optional().isIn(IMPACTS),
  body('urgency').optional().isIn(URGENCIES),
  body('category').optional().trim().isLength({ max: 100 }),
  body('subcategory').optional().trim().isLength({ max: 100 }),
  body('assignmentGroupId').optional().isUUID(),
  body('assignedToId').optional().isUUID(),
  body('configItemId').optional().isUUID(),
  body('description').optional().trim(),
  validate,
];

const validateIncidentUpdate = [
  param('id').isUUID(),
  body('state').optional().isIn(INCIDENT_STATES),
  body('priority').optional().isIn(PRIORITIES),
  body('assignedToId').optional().isUUID(),
  body('assignmentGroupId').optional().isUUID(),
  body('resolutionCode').optional().trim(),
  body('resolutionNotes').optional().trim(),
  validate,
];

// ── Change ──────────────────────────────────────────────

const validateChangeCreate = [
  body('shortDescription').trim().isLength({ min: 3, max: 200 }),
  body('type').optional().isIn(['NORMAL', 'STANDARD', 'EMERGENCY']),
  body('riskLevel').optional().isIn(['HIGH', 'MEDIUM', 'LOW']),
  body('justification').optional().trim(),
  body('implementationPlan').optional().trim(),
  body('rollbackPlan').optional().trim(),
  body('assignmentGroupId').optional().isUUID(),
  body('assignedToId').optional().isUUID(),
  validate,
];

const validateChangeUpdate = [
  param('id').isUUID(),
  body('state').optional().isIn(CHANGE_STATES),
  body('riskLevel').optional().isIn(['HIGH', 'MEDIUM', 'LOW']),
  body('closureCode').optional().isIn(['SUCCESSFUL', 'FAILED', 'PARTIAL']),
  validate,
];

// ── Problem ─────────────────────────────────────────────

const validateProblemCreate = [
  body('shortDescription').trim().isLength({ min: 3, max: 200 }),
  body('priority').optional().isIn(PRIORITIES),
  body('category').optional().trim(),
  body('assignmentGroupId').optional().isUUID(),
  body('assignedToId').optional().isUUID(),
  validate,
];

const validateProblemUpdate = [
  param('id').isUUID(),
  body('state').optional().isIn(PROBLEM_STATES),
  body('rootCause').optional().trim(),
  body('workaround').optional().trim(),
  validate,
];

// ── Common ──────────────────────────────────────────────

const validatePagination = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('sortBy').optional().trim(),
  query('sortOrder').optional().isIn(['asc', 'desc']),
  validate,
];

const validateUUID = [param('id').isUUID().withMessage('Invalid ID format'), validate];

const validateWorkNote = [
  body('content').trim().isLength({ min: 1, max: 10000 }).withMessage('Content required (max 10000 chars)'),
  body('isInternal').optional().isBoolean(),
  validate,
];

// ── Password Complexity ──────────────────────────────────

/**
 * Password validation with complexity requirements
 * - 12+ characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character (@$!%*?&)
 *
 * Usage: validatePassword('password') or validatePassword('newPassword')
 */
const validatePassword = (fieldName = 'password') => {
  return [
    body(fieldName)
      .trim()
      .isLength({ min: 12 })
      .withMessage('Password must be at least 12 characters'),
    body(fieldName)
      .matches(/^(?=.*[a-z])/)
      .withMessage('Password must contain at least one lowercase letter'),
    body(fieldName)
      .matches(/^(?=.*[A-Z])/)
      .withMessage('Password must contain at least one uppercase letter'),
    body(fieldName)
      .matches(/^(?=.*\d)/)
      .withMessage('Password must contain at least one number'),
    body(fieldName)
      .matches(/^(?=.*[@$!%*?&])/)
      .withMessage('Password must contain at least one special character (@$!%*?&)'),
  ];
};

// ── Service Catalog ─────────────────────────────────────

const validateCategoryCreate = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name: 2-100 chars'),
  body('description').optional().trim(),
  body('icon').optional().trim(),
  body('sortOrder').optional().isInt({ min: 0 }),
  validate,
];

const validateCatalogItemCreate = [
  body('name').trim().isLength({ min: 3, max: 200 }).withMessage('Name: 3-200 chars'),
  body('shortDescription').trim().isLength({ min: 3, max: 500 }).withMessage('Short description: 3-500 chars'),
  body('categoryId').isUUID().withMessage('Valid category ID required'),
  body('type').optional().isIn(CATALOG_ITEM_TYPES),
  body('price').optional().isFloat({ min: 0 }),
  body('approvalRequired').optional().isBoolean(),
  body('fulfillmentGroupId').optional().isUUID(),
  body('estimatedDays').optional().isInt({ min: 0 }),
  validate,
];

const validateCatalogItemUpdate = [
  param('id').isUUID(),
  body('name').optional().trim().isLength({ min: 3, max: 200 }),
  body('shortDescription').optional().trim().isLength({ min: 3, max: 500 }),
  body('type').optional().isIn(CATALOG_ITEM_TYPES),
  body('isActive').optional().isBoolean(),
  validate,
];

// ── Service Requests ───────────────────────────────────

const validateServiceRequestCreate = [
  body('shortDescription').trim().isLength({ min: 3, max: 200 }).withMessage('Short description: 3-200 chars'),
  body('items').isArray({ min: 1 }).withMessage('At least one item required'),
  body('items.*.catalogItemId').isUUID().withMessage('Valid catalog item ID required'),
  body('items.*.quantity').optional().isInt({ min: 1 }),
  body('priority').optional().isIn(PRIORITIES),
  validate,
];

const validateServiceRequestUpdate = [
  param('id').isUUID(),
  body('state').optional().isIn(SERVICE_REQUEST_STATES),
  body('assignedToId').optional().isUUID(),
  body('assignmentGroupId').optional().isUUID(),
  validate,
];

// ── Knowledge Base ─────────────────────────────────────

const validateKBCategoryCreate = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name: 2-100 chars'),
  body('description').optional().trim(),
  body('icon').optional().trim(),
  body('parentId').optional().isUUID(),
  body('sortOrder').optional().isInt({ min: 0 }),
  validate,
];

const validateKBArticleCreate = [
  body('title').trim().isLength({ min: 3, max: 300 }).withMessage('Title: 3-300 chars'),
  body('content').trim().isLength({ min: 10 }).withMessage('Content must be at least 10 chars'),
  body('categoryId').optional().isUUID(),
  body('tags').optional().isArray(),
  body('excerpt').optional().trim().isLength({ max: 500 }),
  validate,
];

const validateKBArticleUpdate = [
  param('id').isUUID(),
  body('title').optional().trim().isLength({ min: 3, max: 300 }),
  body('content').optional().trim().isLength({ min: 10 }),
  body('state').optional().isIn(KB_ARTICLE_STATES),
  body('categoryId').optional().isUUID(),
  body('tags').optional().isArray(),
  validate,
];

const validateKBFeedback = [
  body('helpful').isBoolean().withMessage('helpful must be true or false'),
  body('comment').optional().trim().isLength({ max: 1000 }),
  validate,
];

module.exports = {
  validate,
  validateIncidentCreate, validateIncidentUpdate,
  validateChangeCreate, validateChangeUpdate,
  validateProblemCreate, validateProblemUpdate,
  validatePagination, validateUUID, validateWorkNote,
  validatePassword,
  validateCategoryCreate, validateCatalogItemCreate, validateCatalogItemUpdate,
  validateServiceRequestCreate, validateServiceRequestUpdate,
  validateKBCategoryCreate, validateKBArticleCreate, validateKBArticleUpdate, validateKBFeedback,
};
