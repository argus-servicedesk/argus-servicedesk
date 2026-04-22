// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — Problem Routes
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { authenticate, checkPermission, requireMfa } = require('../middleware/auth');
const { validateProblemCreate, validateProblemUpdate, validateUUID, validatePagination, validateWorkNote } = require('../middleware/validator');
const { auditLog } = require('../middleware/audit');
const ctrl = require('../controllers/problem.controller');

/**
 * @swagger
 * tags:
 *   - name: Problems
 *     description: Problem management (ITIL) with RCA and KEDB
 */

router.use(authenticate);
router.use(requireMfa);

/**
 * @swagger
 * /problems:
 *   get:
 *     summary: List problems
 *     tags: [Problems]
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
 *           enum: [NEW, OPEN, KNOWN_ERROR, RESOLVED, CLOSED]
 *     responses:
 *       200:
 *         description: Paginated list of problems
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
 *                     $ref: '#/components/schemas/Problem'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *   post:
 *     summary: Create problem
 *     tags: [Problems]
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
 *               priority:
 *                 type: string
 *                 enum: [P1, P2, P3, P4]
 *     responses:
 *       201:
 *         description: Problem created
 *
 * /problems/stats:
 *   get:
 *     summary: Get problem statistics
 *     tags: [Problems]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Problem stats (counts by state, priority, etc.)
 *
 * /problems/{id}:
 *   get:
 *     summary: Get problem by ID
 *     tags: [Problems]
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
 *         description: Problem details
 *       404:
 *         description: Problem not found
 *   patch:
 *     summary: Update problem
 *     tags: [Problems]
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
 *                 enum: [NEW, OPEN, KNOWN_ERROR, RESOLVED, CLOSED]
 *               priority:
 *                 type: string
 *                 enum: [P1, P2, P3, P4]
 *     responses:
 *       200:
 *         description: Problem updated
 *
 * /problems/{id}/rca:
 *   patch:
 *     summary: Update root cause analysis
 *     tags: [Problems]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rootCauseAnalysis:
 *                 type: object
 *     responses:
 *       200:
 *         description: RCA updated
 *
 * /problems/{id}/notes:
 *   post:
 *     summary: Add work note to problem
 *     tags: [Problems]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Work note added
 *
 * /problems/{id}/ai-rca:
 *   post:
 *     summary: Generate AI-powered root cause analysis
 *     tags: [Problems]
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
 *         description: AI-generated RCA
 */
router.get('/', checkPermission('problems', 'read'), validatePagination, ctrl.listProblems);
router.get('/stats', checkPermission('problems', 'read'), ctrl.getProblemStats);
router.get('/:id', checkPermission('problems', 'read'), validateUUID, ctrl.getProblem);
router.post('/', checkPermission('problems', 'create'), validateProblemCreate, auditLog('Problem'), ctrl.createProblem);
router.patch('/:id', checkPermission('problems', 'update'), validateProblemUpdate, auditLog('Problem'), ctrl.updateProblem);
router.patch('/:id/rca', checkPermission('problems', 'update'), validateUUID, ctrl.updateRCA);
router.post('/:id/notes', checkPermission('problems', 'update'), validateUUID, validateWorkNote, ctrl.addWorkNote);
router.post('/:id/ai-rca', checkPermission('problems', 'update'), validateUUID, ctrl.aiRCA);

module.exports = router;
