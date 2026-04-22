// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — Asset / CMDB Routes
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { authenticate, checkPermission, requireMfa } = require('../middleware/auth');
const { validateUUID, validatePagination } = require('../middleware/validator');
const { auditLog } = require('../middleware/audit');
const ctrl = require('../controllers/asset.controller');
const cmdb = require('../controllers/cmdb.controller');

/**
 * @swagger
 * tags:
 *   - name: Assets
 *     description: Asset / CMDB management
 */

router.use(authenticate);
router.use(requireMfa);

/**
 * @swagger
 * /assets:
 *   get:
 *     summary: List configuration items / assets
 *     tags: [Assets]
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
 *         name: type
 *         schema:
 *           type: string
 *           enum: [SERVER, KUBERNETES_CLUSTER, DATABASE, APPLICATION, NETWORK, STORAGE, CONTAINER, VM, LOAD_BALANCER]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE, MAINTENANCE, RETIRED]
 *     responses:
 *       200:
 *         description: Paginated list of assets
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
 *                     $ref: '#/components/schemas/Asset'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *   post:
 *     summary: Create configuration item
 *     tags: [Assets]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, type]
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [SERVER, KUBERNETES_CLUSTER, DATABASE, APPLICATION, NETWORK, STORAGE, CONTAINER, VM, LOAD_BALANCER]
 *               environment:
 *                 type: string
 *     responses:
 *       201:
 *         description: Asset created
 *
 * /assets/stats:
 *   get:
 *     summary: Get asset statistics
 *     tags: [Assets]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Asset stats (counts by type, status)
 *
 * /assets/{id}:
 *   get:
 *     summary: Get asset by ID
 *     tags: [Assets]
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
 *         description: Asset details
 *       404:
 *         description: Asset not found
 *   patch:
 *     summary: Update asset
 *     tags: [Assets]
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
 *         description: Asset updated
 *   delete:
 *     summary: Delete asset
 *     tags: [Assets]
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
 *         description: Asset deleted
 */
router.get('/', checkPermission('assets', 'read'), validatePagination, ctrl.listAssets);
router.get('/stats', checkPermission('assets', 'read'), ctrl.getAssetStats);
router.get('/topology', checkPermission('assets', 'read'), ctrl.getTopologyData);
router.get('/live-metrics', checkPermission('assets', 'read'), ctrl.getAllAssetsLiveMetrics);
router.get('/:id', checkPermission('assets', 'read'), validateUUID, ctrl.getAsset);
router.post('/', checkPermission('assets', 'create'), auditLog('ConfigurationItem'), ctrl.createAsset);
router.patch('/:id', checkPermission('assets', 'update'), validateUUID, auditLog('ConfigurationItem'), ctrl.updateAsset);
router.delete('/:id', checkPermission('assets', 'delete'), validateUUID, auditLog('ConfigurationItem'), ctrl.deleteAsset);
router.get('/:id/hardware-metrics', checkPermission('assets', 'read'), validateUUID, ctrl.getAssetLiveHardwareMetrics);

// ─── CMDB Sub-Resources under /assets/:id ────────────────

// CI Relationships
router.get('/:id/relationships', checkPermission('assets', 'read'), validateUUID, cmdb.listRelationships);
router.post('/:id/relationships', checkPermission('assets', 'create'), validateUUID, auditLog('CIRelationship'), cmdb.createRelationship);
router.delete('/:id/relationships/:relId', checkPermission('assets', 'delete'), validateUUID, auditLog('CIRelationship'), cmdb.deleteRelationship);
router.get('/:id/dependency-map', checkPermission('assets', 'read'), validateUUID, cmdb.getDependencyMap);

// Network Connections
router.get('/:id/connections', checkPermission('assets', 'read'), validateUUID, cmdb.listConnections);
router.post('/:id/connections', checkPermission('assets', 'create'), validateUUID, auditLog('NetworkConnection'), cmdb.createConnection);
router.patch('/:id/connections/:connId', checkPermission('assets', 'update'), validateUUID, auditLog('NetworkConnection'), cmdb.updateConnection);
router.delete('/:id/connections/:connId', checkPermission('assets', 'delete'), validateUUID, auditLog('NetworkConnection'), cmdb.deleteConnection);

// Financials
router.get('/:id/financials', checkPermission('assets', 'read'), validateUUID, cmdb.getFinancials);
router.put('/:id/financials', checkPermission('assets', 'update'), validateUUID, auditLog('AssetFinancial'), cmdb.upsertFinancials);
router.delete('/:id/financials', checkPermission('assets', 'delete'), validateUUID, auditLog('AssetFinancial'), cmdb.deleteFinancials);

// Allocations
router.get('/:id/allocations', checkPermission('assets', 'read'), validateUUID, cmdb.listAllocations);
router.post('/:id/allocations', checkPermission('assets', 'create'), validateUUID, auditLog('AssetAllocation'), cmdb.createAllocation);
router.patch('/:id/allocations/:allocId', checkPermission('assets', 'update'), validateUUID, auditLog('AssetAllocation'), cmdb.updateAllocation);
router.post('/:id/allocations/:allocId/return', checkPermission('assets', 'update'), validateUUID, auditLog('AssetAllocation'), cmdb.returnAsset);

// Disposal
router.get('/:id/disposal', checkPermission('assets', 'read'), validateUUID, cmdb.getDisposal);
router.post('/:id/disposal', checkPermission('assets', 'create'), validateUUID, auditLog('AssetDisposal'), cmdb.createDisposal);
router.delete('/:id/disposal', checkPermission('assets', 'delete'), validateUUID, auditLog('AssetDisposal'), cmdb.deleteDisposal);

// Movements
router.get('/:id/movements', checkPermission('assets', 'read'), validateUUID, cmdb.listMovements);
router.post('/:id/movements', checkPermission('assets', 'create'), validateUUID, auditLog('AssetMovement'), cmdb.createMovement);

// IP Addresses (sub-resource view)
router.get('/:id/ip-addresses', checkPermission('assets', 'read'), validateUUID, cmdb.listAssetIPAddresses);

// Computer Components
const componentCtrl = require('../controllers/component.controller');
router.get('/:id/components', checkPermission('assets', 'read'), validateUUID, componentCtrl.listComponents);
router.post('/:id/components', checkPermission('assets', 'create'), validateUUID, componentCtrl.addComponent);
router.patch('/:id/components/:componentId', checkPermission('assets', 'update'), validateUUID, componentCtrl.updateComponent);
router.delete('/:id/components/:componentId', checkPermission('assets', 'delete'), validateUUID, componentCtrl.removeComponent);

module.exports = router;
