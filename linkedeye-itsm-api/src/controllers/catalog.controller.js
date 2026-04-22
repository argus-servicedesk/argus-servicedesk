// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — Service Catalog Controller
// ═══════════════════════════════════════════════════════════

const { prisma } = require('../config/database');
const { emitToAll } = require('../config/socket');
const { paginate, paginationMeta, success, error } = require('../utils/helpers');
const { getCreateOrgId } = require('../middleware/tenant');
const logger = require('../utils/logger');

// ── Include shapes ─────────────────────────────────────

const ITEM_INCLUDE_LIST = {
  category: { select: { id: true, name: true, icon: true } },
  fulfillmentGroup: { select: { id: true, name: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
};

const ITEM_INCLUDE_DETAIL = {
  ...ITEM_INCLUDE_LIST,
  _count: { select: { requestItems: true } },
};

// ── Categories ─────────────────────────────────────────

async function listCategories(req, res, next) {
  try {
    const where = { ...req.tenantWhere };
    if (req.query.isActive !== undefined) where.isActive = req.query.isActive === 'true';

    const categories = await prisma.serviceCategory.findMany({
      where,
      include: {
        _count: { select: { catalogItems: true } },
        catalogItems: {
          where: { isActive: true },
          select: { id: true, name: true, shortDescription: true, type: true, icon: true, price: true, estimatedDays: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
    return success(res, categories);
  } catch (err) { next(err); }
}

async function createCategory(req, res, next) {
  try {
    const { name, description, icon, sortOrder } = req.body;
    const category = await prisma.serviceCategory.create({
      data: {
        name, description, icon,
        sortOrder: sortOrder || 0,
        createdById: req.user.id,
        organizationId: getCreateOrgId(req),
      },
    });
    emitToAll('catalog:category-created', { id: category.id, name: category.name });
    logger.info(`Catalog category created: ${category.name} by ${req.user.email}`);
    return success(res, category, 201);
  } catch (err) { next(err); }
}

async function updateCategory(req, res, next) {
  try {
    const existing = await prisma.serviceCategory.findUnique({ where: { id: req.params.id } });
    if (!existing) return error(res, 'Category not found', 404);
    if (req.tenantWhere.organizationId && existing.organizationId !== req.tenantWhere.organizationId) {
      return error(res, 'Category not found', 404);
    }

    const { name, description, icon, sortOrder, isActive } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (icon !== undefined) data.icon = icon;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;
    if (isActive !== undefined) data.isActive = isActive;

    const category = await prisma.serviceCategory.update({ where: { id: req.params.id }, data });
    return success(res, category);
  } catch (err) { next(err); }
}

async function deleteCategory(req, res, next) {
  try {
    const existing = await prisma.serviceCategory.findUnique({ where: { id: req.params.id } });
    if (!existing) return error(res, 'Category not found', 404);
    if (req.tenantWhere.organizationId && existing.organizationId !== req.tenantWhere.organizationId) {
      return error(res, 'Category not found', 404);
    }

    // Soft delete
    await prisma.serviceCategory.update({ where: { id: req.params.id }, data: { isActive: false } });
    return success(res, { message: 'Category deactivated' });
  } catch (err) { next(err); }
}

// ── Catalog Items ──────────────────────────────────────

async function listItems(req, res, next) {
  try {
    const { categoryId, type, search, isActive, sortBy, sortOrder } = req.query;
    const { skip, take, page, limit } = paginate(req.query.page, req.query.limit);

    const where = { ...req.tenantWhere };
    if (categoryId) where.categoryId = categoryId;
    if (type) where.type = type;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { shortDescription: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy = sortBy ? { [sortBy]: sortOrder || 'asc' } : { sortOrder: 'asc' };

    const [items, total] = await prisma.$transaction([
      prisma.catalogItem.findMany({ where, include: ITEM_INCLUDE_LIST, orderBy, skip, take }),
      prisma.catalogItem.count({ where }),
    ]);

    return success(res, items, 200, paginationMeta(total, page, limit));
  } catch (err) { next(err); }
}

async function getItem(req, res, next) {
  try {
    const item = await prisma.catalogItem.findUnique({
      where: { id: req.params.id },
      include: ITEM_INCLUDE_DETAIL,
    });
    if (!item) return error(res, 'Catalog item not found', 404);
    if (req.tenantWhere.organizationId && item.organizationId !== req.tenantWhere.organizationId) {
      return error(res, 'Catalog item not found', 404);
    }
    return success(res, item);
  } catch (err) { next(err); }
}

async function createItem(req, res, next) {
  try {
    const { name, shortDescription, description, categoryId, type, icon, price, currency, approvalRequired, fulfillmentGroupId, estimatedDays, formSchema } = req.body;

    const item = await prisma.catalogItem.create({
      data: {
        name, shortDescription, description,
        categoryId, type, icon,
        price: price || null,
        currency: currency || 'USD',
        approvalRequired: approvalRequired !== false,
        fulfillmentGroupId: fulfillmentGroupId || null,
        estimatedDays: estimatedDays || null,
        formSchema: formSchema || null,
        createdById: req.user.id,
        organizationId: getCreateOrgId(req),
      },
      include: ITEM_INCLUDE_LIST,
    });

    emitToAll('catalog:item-created', { id: item.id, name: item.name });
    logger.info(`Catalog item created: ${item.name} by ${req.user.email}`);
    return success(res, item, 201);
  } catch (err) { next(err); }
}

async function updateItem(req, res, next) {
  try {
    const existing = await prisma.catalogItem.findUnique({ where: { id: req.params.id } });
    if (!existing) return error(res, 'Catalog item not found', 404);
    if (req.tenantWhere.organizationId && existing.organizationId !== req.tenantWhere.organizationId) {
      return error(res, 'Catalog item not found', 404);
    }

    const { name, shortDescription, description, categoryId, type, icon, price, currency, approvalRequired, fulfillmentGroupId, estimatedDays, formSchema, isActive, sortOrder } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (shortDescription !== undefined) data.shortDescription = shortDescription;
    if (description !== undefined) data.description = description;
    if (categoryId !== undefined) data.categoryId = categoryId;
    if (type !== undefined) data.type = type;
    if (icon !== undefined) data.icon = icon;
    if (price !== undefined) data.price = price;
    if (currency !== undefined) data.currency = currency;
    if (approvalRequired !== undefined) data.approvalRequired = approvalRequired;
    if (fulfillmentGroupId !== undefined) data.fulfillmentGroupId = fulfillmentGroupId;
    if (estimatedDays !== undefined) data.estimatedDays = estimatedDays;
    if (formSchema !== undefined) data.formSchema = formSchema;
    if (isActive !== undefined) data.isActive = isActive;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;

    const item = await prisma.catalogItem.update({
      where: { id: req.params.id }, data, include: ITEM_INCLUDE_LIST,
    });

    emitToAll('catalog:item-updated', { id: item.id, name: item.name });
    return success(res, item);
  } catch (err) { next(err); }
}

async function deleteItem(req, res, next) {
  try {
    const existing = await prisma.catalogItem.findUnique({ where: { id: req.params.id } });
    if (!existing) return error(res, 'Catalog item not found', 404);
    if (req.tenantWhere.organizationId && existing.organizationId !== req.tenantWhere.organizationId) {
      return error(res, 'Catalog item not found', 404);
    }

    await prisma.catalogItem.update({ where: { id: req.params.id }, data: { isActive: false } });
    return success(res, { message: 'Catalog item deactivated' });
  } catch (err) { next(err); }
}

module.exports = {
  listCategories, createCategory, updateCategory, deleteCategory,
  listItems, getItem, createItem, updateItem, deleteItem,
};
