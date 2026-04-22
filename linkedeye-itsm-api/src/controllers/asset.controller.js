// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — CMDB / Asset Controller
// ═══════════════════════════════════════════════════════════

const { prisma } = require('../config/database');
const { paginate, paginationMeta, success, error } = require('../utils/helpers');
const { getCreateOrgId } = require('../middleware/tenant');

const INCLUDE_LIST = {
  owner: { select: { id: true, firstName: true, lastName: true, email: true } },
  supportGroup: { select: { id: true, name: true } },
  _count: { select: { alerts: true, incidents: true } },
};

const INCLUDE_DETAIL = {
  ...INCLUDE_LIST,
  incidents: { select: { id: true, number: true, shortDescription: true, state: true, priority: true }, orderBy: { createdAt: 'desc' }, take: 10 },
  alerts: { where: { status: 'FIRING' }, orderBy: { firedAt: 'desc' }, take: 10 },
  changes: { include: { change: { select: { id: true, number: true, shortDescription: true, state: true } } }, take: 10 },
  activities: { include: { user: { select: { id: true, firstName: true, lastName: true } } }, orderBy: { createdAt: 'desc' }, take: 20 },
  parentRelationships: { include: { child: { select: { id: true, name: true, type: true } } }, take: 20 },
  childRelationships: { include: { parent: { select: { id: true, name: true, type: true } } }, take: 20 },
  financials: { include: { vendor: { select: { id: true, name: true } } } },
  allocations: { orderBy: { createdAt: 'desc' }, take: 10 },
  disposal: true,
  movements: { orderBy: { movementDate: 'desc' }, take: 20 },
  ipAddresses: true,
};

// GET /api/v1/assets
async function listAssets(req, res, next) {
  try {
    const { type, status, search, ownerId, supportGroupId, sortBy, sortOrder } = req.query;
    const { skip, take, page, limit } = paginate(req.query.page, req.query.limit);

    const where = {};
    Object.assign(where, req.tenantWhere);
    if (type) where.type = type;
    if (status) where.status = status;
    if (ownerId) where.ownerId = ownerId;
    if (supportGroupId) where.supportGroupId = supportGroupId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { hostname: { contains: search, mode: 'insensitive' } },
        { ipAddress: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy = sortBy ? { [sortBy]: sortOrder || 'asc' } : { name: 'asc' };

    const [assets, total] = await prisma.$transaction([
      prisma.configurationItem.findMany({ where, include: INCLUDE_LIST, orderBy, skip, take }),
      prisma.configurationItem.count({ where }),
    ]);

    return success(res, assets, 200, paginationMeta(total, page, limit));
  } catch (err) { next(err); }
}

// GET /api/v1/assets/:id
async function getAsset(req, res, next) {
  try {
    const asset = await prisma.configurationItem.findUnique({ where: { id: req.params.id }, include: INCLUDE_DETAIL });
    if (!asset) return error(res, 'Asset not found', 404);
    if (req.tenantWhere?.organizationId && asset.organizationId !== req.tenantWhere.organizationId) return error(res, 'Asset not found', 404);
    return success(res, asset);
  } catch (err) { next(err); }
}

// POST /api/v1/assets
async function createAsset(req, res, next) {
  try {
    const asset = await prisma.configurationItem.create({
      data: { ...req.body, ownerId: req.body.ownerId || req.user.id, organizationId: getCreateOrgId(req) },
      include: INCLUDE_LIST,
    });

    await prisma.activity.create({
      data: { action: 'CREATED', description: `CI ${asset.name} created`, userId: req.user.id, configItemId: asset.id },
    });

    return success(res, asset, 201);
  } catch (err) { next(err); }
}

// PATCH /api/v1/assets/:id
async function updateAsset(req, res, next) {
  try {
    const existing = await prisma.configurationItem.findUnique({ where: { id: req.params.id } });
    if (!existing) return error(res, 'Asset not found', 404);
    if (req.tenantWhere?.organizationId && existing.organizationId !== req.tenantWhere.organizationId) return error(res, 'Asset not found', 404);

    const asset = await prisma.configurationItem.update({
      where: { id: req.params.id }, data: req.body, include: INCLUDE_LIST,
    });

    await prisma.activity.create({
      data: { action: 'UPDATED', description: `CI ${asset.name} updated`, userId: req.user.id, configItemId: asset.id },
    });

    return success(res, asset);
  } catch (err) { next(err); }
}

// DELETE /api/v1/assets/:id
async function deleteAsset(req, res, next) {
  try {
    await prisma.configurationItem.delete({ where: { id: req.params.id } });
    return success(res, { message: 'Asset deleted' });
  } catch (err) { next(err); }
}

// GET /api/v1/assets/stats
async function getAssetStats(req, res, next) {
  try {
    const tw = req.tenantWhere || {};
    const in90days = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    const [byType, byStatus, total, monitoringCount, liveCount, eolCount, warrantyCount, costAgg, topRiskAssets, byEnvironment, byCriticality, disposalCount, activeAllocationCount] =
      await prisma.$transaction([
        prisma.configurationItem.groupBy({ by: ['type'], where: { ...tw }, _count: true }),
        prisma.configurationItem.groupBy({ by: ['status'], where: { ...tw }, _count: true }),
        prisma.configurationItem.count({ where: { ...tw } }),
        prisma.configurationItem.count({ where: { ...tw, monitoringEnabled: true } }),
        prisma.configurationItem.count({ where: { ...tw, status: 'LIVE' } }),
        prisma.configurationItem.count({ where: { ...tw, endOfLife: { lte: in90days } } }),
        prisma.configurationItem.count({ where: { ...tw, warrantyExpiry: { lte: in90days } } }),
        prisma.configurationItem.aggregate({ where: { ...tw }, _sum: { purchaseCost: true, monthlyCost: true } }),
        prisma.configurationItem.findMany({
          where: { ...tw },
          orderBy: { alerts: { _count: 'desc' } },
          take: 20,
          select: {
            id: true, name: true, type: true, status: true, hostname: true,
            endOfLife: true, warrantyExpiry: true, monitoringEnabled: true, organizationId: true,
            _count: { select: { alerts: true, incidents: true } },
          },
        }),
        prisma.configurationItem.groupBy({ by: ['environment'], where: { ...tw, environment: { not: null } }, _count: true }),
        prisma.configurationItem.groupBy({ by: ['criticality'], where: { ...tw, criticality: { not: null } }, _count: true }),
        prisma.assetDisposal.count({ where: { ...tw } }),
        prisma.assetAllocation.count({ where: { ...tw, status: 'ALLOCATED' } }),
      ]);

    return success(res, {
      total, byType, byStatus, byEnvironment, byCriticality,
      liveCount,
      monitoringCoverage: monitoringCount,
      eolWarnings: eolCount,
      warrantyWarnings: warrantyCount,
      costTotals: { purchaseCost: costAgg._sum.purchaseCost, monthlyCost: costAgg._sum.monthlyCost },
      disposalCount,
      activeAllocationCount,
      topRiskAssets,
    });
  } catch (err) { next(err); }
}

// GET /api/v1/assets/topology
async function getTopologyData(req, res) {
  try {
    // Get all assets that are NETWORK, SERVER, FIREWALL, SWITCH, ROUTER, LOAD_BALANCER, STORAGE, DATABASE, APPLICATION, KUBERNETES_CLUSTER types
    const assets = await prisma.configurationItem.findMany({
      where: {
        ...req.tenantWhere,
        status: { not: 'DECOMMISSIONED' },
      },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        ipAddress: true,
        hostname: true,
        location: true,
        manufacturer: true,
        model: true,
        monitoringEnabled: true,
      },
      orderBy: { type: 'asc' },
    });

    // Get all network connections for these assets
    const assetIds = assets.map(a => a.id);
    const connections = await prisma.networkConnection.findMany({
      where: {
        OR: [
          { sourceDeviceId: { in: assetIds } },
          { destinationDeviceId: { in: assetIds } },
        ],
      },
      select: {
        id: true,
        sourceDeviceId: true,
        destinationDeviceId: true,
        sourcePort: true,
        destPort: true,
        connectionType: true,
        bandwidth: true,
        vlan: true,
        description: true,
      },
    });

    // Get CI relationships
    const relationships = await prisma.cIRelationship.findMany({
      where: {
        OR: [
          { parentId: { in: assetIds } },
          { childId: { in: assetIds } },
        ],
      },
      select: {
        id: true,
        parentId: true,
        childId: true,
        type: true,
        description: true,
      },
    });

    res.json({
      success: true,
      data: {
        nodes: assets,
        connections,
        relationships,
      },
    });
  } catch (error) {
    console.error('[Topology]', error);
    res.status(500).json({ success: false, error: 'Failed to fetch topology data' });
  }
}

// GET /api/v1/assets/:id/hardware-metrics
async function getAssetLiveHardwareMetrics(req, res) {
  try {
    const { id } = req.params;
    const asset = await prisma.configurationItem.findUnique({
      where: { id },
      select: { id: true, name: true, type: true, ipAddress: true, prometheusJob: true },
    });
    if (!asset) return res.status(404).json({ success: false, error: 'Asset not found' });

    const hardwareMetrics = require('../services/hardwareMetricsService');
    const metrics = await hardwareMetrics.getAssetMetrics(asset);

    res.json({ success: true, data: metrics });
  } catch (error) {
    console.error('[HW Metrics]', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch hardware metrics' });
  }
}

// GET /api/v1/assets/live-metrics
async function getAllAssetsLiveMetrics(req, res) {
  try {
    const assets = await prisma.configurationItem.findMany({
      where: { ...req.tenantWhere, prometheusJob: { not: null }, status: 'LIVE' },
      select: { id: true, name: true, type: true, ipAddress: true, prometheusJob: true, manufacturer: true, model: true, hostname: true },
    });

    const hardwareMetrics = require('../services/hardwareMetricsService');
    // Query in parallel but limit concurrency
    const results = await Promise.all(assets.map(async (asset) => ({
      asset,
      metrics: await hardwareMetrics.getAssetMetrics(asset),
    })));

    res.json({ success: true, data: results });
  } catch (error) {
    console.error('[HW Metrics All]', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch hardware metrics' });
  }
}

module.exports = { listAssets, getAsset, createAsset, updateAsset, deleteAsset, getAssetStats, getTopologyData, getAssetLiveHardwareMetrics, getAllAssetsLiveMetrics };
