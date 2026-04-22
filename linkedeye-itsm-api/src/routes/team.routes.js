// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — Team Routes
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { authenticate, authorize, checkPermission, requireMfa } = require('../middleware/auth');
const { validateUUID, validatePagination, validate } = require('../middleware/validator');
const { body } = require('express-validator');
const ctrl = require('../controllers/team.controller');

/**
 * @swagger
 * tags:
 *   - name: Teams
 *     description: Team management, on-call schedules, and escalation policies
 */

router.use(authenticate);
router.use(requireMfa);

/**
 * @swagger
 * /teams:
 *   get:
 *     summary: List teams
 *     tags: [Teams]
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
 *     responses:
 *       200:
 *         description: Paginated list of teams
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
 *                     $ref: '#/components/schemas/Team'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *   post:
 *     summary: Create team
 *     tags: [Teams]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Team created
 *
 * /teams/on-call/overview:
 *   get:
 *     summary: Get on-call overview across all teams
 *     tags: [Teams]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: On-call overview
 *
 * /teams/{id}:
 *   get:
 *     summary: Get team by ID
 *     tags: [Teams]
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
 *         description: Team details with members
 *       404:
 *         description: Team not found
 *   patch:
 *     summary: Update team
 *     tags: [Teams]
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
 *         description: Team updated
 *
 * /teams/{id}/members:
 *   post:
 *     summary: Add member to team
 *     tags: [Teams]
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
 *             required: [userId]
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *               role:
 *                 type: string
 *                 enum: [LEAD, MEMBER, OBSERVER]
 *     responses:
 *       201:
 *         description: Member added
 *
 * /teams/{id}/members/{userId}:
 *   delete:
 *     summary: Remove member from team
 *     tags: [Teams]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Member removed
 *
 * /teams/{id}/on-call:
 *   get:
 *     summary: Get current on-call schedule for team
 *     tags: [Teams]
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
 *         description: On-call schedule
 *   post:
 *     summary: Create on-call schedule (ADMIN/MANAGER)
 *     tags: [Teams]
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
 *             required: [userId, startTime, endTime]
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *               isPrimary:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: On-call schedule created
 *
 * /teams/{id}/on-call/history:
 *   get:
 *     summary: Get on-call history for team
 *     tags: [Teams]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
 *     responses:
 *       200:
 *         description: Paginated on-call history
 *
 * /teams/{id}/escalation:
 *   get:
 *     summary: Get escalation policies for team
 *     tags: [Teams]
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
 *         description: Escalation policies
 *
 * /teams/{id}/escalation-policies:
 *   post:
 *     summary: Create escalation policy (ADMIN/MANAGER)
 *     tags: [Teams]
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
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Escalation policy created
 *
 * /teams/{id}/escalation-policies/{policyId}:
 *   put:
 *     summary: Update escalation policy (ADMIN/MANAGER)
 *     tags: [Teams]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: policyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Escalation policy updated
 *   delete:
 *     summary: Delete escalation policy (ADMIN/MANAGER)
 *     tags: [Teams]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: policyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Escalation policy deleted
 */
router.get('/', checkPermission('teams', 'read'), validatePagination, ctrl.listTeams);
router.get('/on-call/overview', checkPermission('teams', 'read'), ctrl.getOnCallOverview);
router.get('/:id', checkPermission('teams', 'read'), validateUUID, ctrl.getTeam);
router.post('/', checkPermission('teams', 'create'), [
  body('name').trim().isLength({ min: 2, max: 100 }),
  validate,
], ctrl.createTeam);
router.patch('/:id', checkPermission('teams', 'update'), validateUUID, ctrl.updateTeam);

router.post('/:id/members', checkPermission('teams', 'update'), validateUUID, [
  body('userId').isUUID(),
  body('role').optional().isIn(['LEAD', 'MEMBER', 'OBSERVER']),
  validate,
], ctrl.addMember);
router.delete('/:id/members/:userId', checkPermission('teams', 'update'), ctrl.removeMember);

router.get('/:id/on-call', checkPermission('teams', 'read'), validateUUID, ctrl.getOnCall);
router.get('/:id/on-call/history', checkPermission('teams', 'read'), validateUUID, validatePagination, ctrl.getOnCallHistory);
router.post('/:id/on-call', authorize('ADMIN', 'MANAGER'), validateUUID, [
  body('userId').isUUID(),
  body('startTime').isISO8601(),
  body('endTime').isISO8601(),
  body('isPrimary').optional().isBoolean(),
  validate,
], ctrl.createOnCallSchedule);
router.get('/:id/escalation', checkPermission('teams', 'read'), validateUUID, ctrl.getEscalationPolicies);
router.post('/:id/escalation-policies', authorize('ADMIN', 'MANAGER'), validateUUID, [
  body('name').trim().isLength({ min: 1, max: 100 }),
  validate,
], ctrl.createEscalationPolicy);
router.put('/:id/escalation-policies/:policyId', authorize('ADMIN', 'MANAGER'), validateUUID, ctrl.updateEscalationPolicy);
router.delete('/:id/escalation-policies/:policyId', authorize('ADMIN', 'MANAGER'), ctrl.deleteEscalationPolicy);

module.exports = router;
