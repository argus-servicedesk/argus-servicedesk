// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — Change Routes
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { authenticate, checkPermission, requireMfa } = require('../middleware/auth');
const { validateChangeCreate, validateChangeUpdate, validateUUID, validatePagination } = require('../middleware/validator');
const { auditLog } = require('../middleware/audit');
const ctrl = require('../controllers/change.controller');

/**
 * @swagger
 * tags:
 *   - name: Changes
 *     description: Change management (ITIL)
 */

router.use(authenticate);
router.use(requireMfa);

/**
 * @swagger
 * /changes:
 *   get:
 *     summary: List changes
 *     tags: [Changes]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *           enum: [NEW, ASSESSMENT, AUTHORIZED, SCHEDULED, IMPLEMENTING, REVIEW, CLOSED]
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [STANDARD, NORMAL, EMERGENCY]
 *     responses:
 *       200:
 *         description: Paginated list of changes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Change'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *   post:
 *     summary: Create change request
 *     tags: [Changes]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [STANDARD, NORMAL, EMERGENCY]
 *               risk:
 *                 type: string
 *                 enum: [HIGH, MEDIUM, LOW]
 *     responses:
 *       201:
 *         description: Change created
 *
 * /changes/{id}:
 *   get:
 *     summary: Get change by ID
 *     tags: [Changes]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Change details
 *       404:
 *         description: Change not found
 *   patch:
 *     summary: Update change request
 *     tags: [Changes]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               state:
 *                 type: string
 *               risk:
 *                 type: string
 *                 enum: [HIGH, MEDIUM, LOW]
 *     responses:
 *       200:
 *         description: Change updated
 *
 * /changes/{id}/submit:
 *   post:
 *     summary: Submit change for approval
 *     tags: [Changes]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Change submitted for approval
 *
 * /changes/{id}/approve:
 *   post:
 *     summary: Approve change request
 *     tags: [Changes]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Change approved
 *
 * /changes/{id}/reject:
 *   post:
 *     summary: Reject change request
 *     tags: [Changes]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Change rejected
 */
router.get('/', checkPermission('changes', 'read'), validatePagination, ctrl.listChanges);
router.get('/:id', checkPermission('changes', 'read'), validateUUID, ctrl.getChange);
router.post('/', checkPermission('changes', 'create'), validateChangeCreate, auditLog('Change'), ctrl.createChange);
router.patch('/:id', checkPermission('changes', 'update'), validateChangeUpdate, auditLog('Change'), ctrl.updateChange);

router.post('/:id/submit', checkPermission('changes', 'update'), validateUUID, ctrl.submitForApproval);
router.post('/:id/approve', authenticate, validateUUID, ctrl.approveChange);
router.post('/:id/reject', authenticate, validateUUID, ctrl.rejectChange);

module.exports = router;
