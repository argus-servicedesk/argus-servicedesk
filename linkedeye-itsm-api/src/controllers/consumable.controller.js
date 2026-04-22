// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — Consumable Management Controller
// ═══════════════════════════════════════════════════════════

const { prisma } = require('../config/database');
const { paginate, paginationMeta, success, error } = require('../utils/helpers');
const { getCreateOrgId } = require('../middleware/tenant');

// GET /api/v1/consumables
async function listConsumables(req, res, next) {
  try {
    const { type, search, lowStock, sortBy, sortOrder } = req.query;
    const { skip, take, page, limit } = paginate(req.query.page, req.query.limit);

    const where = {};
    Object.assign(where, req.tenantWhere);
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { manufacturer: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
        { compatibleWith: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (lowStock === 'true') {
      // stockTotal - stockUsed <= stockMin
      where.AND = [
        ...(where.AND || []),
        {
          stockTotal: { gt: 0 },
        },
      ];
      // Prisma doesn't support computed field filters directly,
      // so we filter in-memory after fetching, or use raw.
      // For simplicity, we fetch all matching and post-filter.
    }

    const orderBy = sortBy ? { [sortBy]: sortOrder || 'asc' } : { name: 'asc' };

    if (lowStock === 'true') {
      // Fetch all matching items and filter in memory for low stock
      const allItems = await prisma.consumableItem.findMany({
        where,
        include: { _count: { select: { usageLogs: true } } },
        orderBy,
      });
      const filtered = allItems.filter(item => (item.stockTotal - item.stockUsed) <= item.stockMin);
      const total = filtered.length;
      const paged = filtered.slice(skip, skip + take);
      return success(res, paged, 200, paginationMeta(total, page, limit));
    }

    const [items, total] = await prisma.$transaction([
      prisma.consumableItem.findMany({
        where,
        include: { _count: { select: { usageLogs: true } } },
        orderBy,
        skip,
        take,
      }),
      prisma.consumableItem.count({ where }),
    ]);

    return success(res, items, 200, paginationMeta(total, page, limit));
  } catch (err) { next(err); }
}

// GET /api/v1/consumables/:id
async function getConsumable(req, res, next) {
  try {
    const item = await prisma.consumableItem.findUnique({
      where: { id: req.params.id },
      include: {
        usageLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
        _count: { select: { usageLogs: true } },
      },
    });
    if (!item) return error(res, 'Consumable not found', 404);
    if (req.tenantWhere?.organizationId && item.organizationId !== req.tenantWhere.organizationId) {
      return error(res, 'Consumable not found', 404);
    }
    return success(res, item);
  } catch (err) { next(err); }
}

// POST /api/v1/consumables
async function createConsumable(req, res, next) {
  try {
    const { name, type, manufacturer, model, compatibleWith, stockTotal, stockUsed, stockMin, location, cost, currency, notes } = req.body;

    const item = await prisma.consumableItem.create({
      data: {
        name, type, manufacturer, model, compatibleWith, stockTotal, stockUsed, stockMin, location, cost, currency, notes,
        organizationId: getCreateOrgId(req),
      },
      include: { _count: { select: { usageLogs: true } } },
    });
    return success(res, item, 201);
  } catch (err) { next(err); }
}

// PATCH /api/v1/consumables/:id
async function updateConsumable(req, res, next) {
  try {
    const existing = await prisma.consumableItem.findUnique({ where: { id: req.params.id } });
    if (!existing) return error(res, 'Consumable not found', 404);
    if (req.tenantWhere?.organizationId && existing.organizationId !== req.tenantWhere.organizationId) {
      return error(res, 'Consumable not found', 404);
    }

    const { id: _id, organizationId: _o, createdAt: _c, ...updateData } = req.body;

    const item = await prisma.consumableItem.update({
      where: { id: req.params.id },
      data: updateData,
      include: { _count: { select: { usageLogs: true } } },
    });
    return success(res, item);
  } catch (err) { next(err); }
}

// DELETE /api/v1/consumables/:id
async function deleteConsumable(req, res, next) {
  try {
    const existing = await prisma.consumableItem.findUnique({ where: { id: req.params.id } });
    if (!existing) return error(res, 'Consumable not found', 404);
    if (req.tenantWhere?.organizationId && existing.organizationId !== req.tenantWhere.organizationId) {
      return error(res, 'Consumable not found', 404);
    }

    await prisma.consumableItem.delete({ where: { id: req.params.id } });
    return success(res, { message: 'Consumable deleted' });
  } catch (err) { next(err); }
}

// POST /api/v1/consumables/:id/add-stock
async function addStock(req, res, next) {
  try {
    const { quantity, notes } = req.body;
    if (!quantity || quantity <= 0) return error(res, 'Quantity must be a positive number', 400);

    const existing = await prisma.consumableItem.findUnique({ where: { id: req.params.id } });
    if (!existing) return error(res, 'Consumable not found', 404);
    if (req.tenantWhere?.organizationId && existing.organizationId !== req.tenantWhere.organizationId) {
      return error(res, 'Consumable not found', 404);
    }

    const [item] = await prisma.$transaction([
      prisma.consumableItem.update({
        where: { id: req.params.id },
        data: { stockTotal: { increment: quantity } },
        include: { _count: { select: { usageLogs: true } } },
      }),
      prisma.consumableUsageLog.create({
        data: {
          consumableId: req.params.id,
          quantity,
          action: 'ADDED',
          performedBy: req.user.id,
          notes: notes || null,
        },
      }),
    ]);

    return success(res, item);
  } catch (err) { next(err); }
}

// POST /api/v1/consumables/:id/use
async function useStock(req, res, next) {
  try {
    const { quantity, assetId, notes } = req.body;
    if (!quantity || quantity <= 0) return error(res, 'Quantity must be a positive number', 400);

    const existing = await prisma.consumableItem.findUnique({ where: { id: req.params.id } });
    if (!existing) return error(res, 'Consumable not found', 404);
    if (req.tenantWhere?.organizationId && existing.organizationId !== req.tenantWhere.organizationId) {
      return error(res, 'Consumable not found', 404);
    }

    const available = existing.stockTotal - existing.stockUsed;
    if (quantity > available) return error(res, `Insufficient stock. Available: ${available}`, 400);

    const [item] = await prisma.$transaction([
      prisma.consumableItem.update({
        where: { id: req.params.id },
        data: { stockUsed: { increment: quantity } },
        include: { _count: { select: { usageLogs: true } } },
      }),
      prisma.consumableUsageLog.create({
        data: {
          consumableId: req.params.id,
          assetId: assetId || null,
          quantity,
          action: 'USED',
          performedBy: req.user.id,
          notes: notes || null,
        },
      }),
    ]);

    return success(res, item);
  } catch (err) { next(err); }
}

// GET /api/v1/consumables/stats
async function getConsumableStats(req, res, next) {
  try {
    const tw = req.tenantWhere || {};

    const [allItems, byType] = await prisma.$transaction([
      prisma.consumableItem.findMany({
        where: { ...tw },
        select: { stockTotal: true, stockUsed: true, stockMin: true, cost: true, type: true },
      }),
      prisma.consumableItem.groupBy({ by: ['type'], where: { ...tw }, _count: true }),
    ]);

    const totalItems = allItems.length;
    const lowStockCount = allItems.filter(i => (i.stockTotal - i.stockUsed) <= i.stockMin).length;
    const totalValue = allItems.reduce((sum, i) => sum + (i.cost || 0) * i.stockTotal, 0);

    return success(res, {
      totalItems,
      lowStockCount,
      totalValue,
      byType,
    });
  } catch (err) { next(err); }
}

module.exports = {
  listConsumables,
  getConsumable,
  createConsumable,
  updateConsumable,
  deleteConsumable,
  addStock,
  useStock,
  getConsumableStats,
};
