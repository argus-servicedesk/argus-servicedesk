// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — Computer Component Controller
// ═══════════════════════════════════════════════════════════

const { prisma } = require('../config/database');
const { success, error } = require('../utils/helpers');
const { getCreateOrgId } = require('../middleware/tenant');

// GET /api/v1/assets/:id/components
async function listComponents(req, res, next) {
  try {
    const assetId = req.params.id;

    // Verify asset exists and tenant has access
    const asset = await prisma.configurationItem.findUnique({ where: { id: assetId } });
    if (!asset) return error(res, 'Asset not found', 404);
    if (req.tenantWhere?.organizationId && asset.organizationId !== req.tenantWhere.organizationId) {
      return error(res, 'Asset not found', 404);
    }

    const components = await prisma.computerComponent.findMany({
      where: { assetId },
      orderBy: { componentType: 'asc' },
    });

    return success(res, components);
  } catch (err) { next(err); }
}

// POST /api/v1/assets/:id/components
async function addComponent(req, res, next) {
  try {
    const assetId = req.params.id;

    const asset = await prisma.configurationItem.findUnique({ where: { id: assetId } });
    if (!asset) return error(res, 'Asset not found', 404);
    if (req.tenantWhere?.organizationId && asset.organizationId !== req.tenantWhere.organizationId) {
      return error(res, 'Asset not found', 404);
    }

    const { componentType, name, manufacturer, model, serialNumber, capacity, speed, interface: iface, slot, status, notes } = req.body;

    const component = await prisma.computerComponent.create({
      data: {
        componentType, name, manufacturer, model, serialNumber, capacity, speed, interface: iface, slot, status, notes,
        assetId,
        organizationId: getCreateOrgId(req),
      },
    });

    return success(res, component, 201);
  } catch (err) { next(err); }
}

// PATCH /api/v1/assets/:id/components/:componentId
async function updateComponent(req, res, next) {
  try {
    const { id: assetId, componentId } = req.params;

    const existing = await prisma.computerComponent.findUnique({ where: { id: componentId } });
    if (!existing || existing.assetId !== assetId) return error(res, 'Component not found', 404);
    if (req.tenantWhere?.organizationId && existing.organizationId !== req.tenantWhere.organizationId) {
      return error(res, 'Component not found', 404);
    }

    // Prevent changing assetId, organizationId, id, createdAt via body
    const { assetId: _a, organizationId: _o, id: _id, createdAt: _c, ...updateData } = req.body;

    const component = await prisma.computerComponent.update({
      where: { id: componentId },
      data: updateData,
    });

    return success(res, component);
  } catch (err) { next(err); }
}

// DELETE /api/v1/assets/:id/components/:componentId
async function removeComponent(req, res, next) {
  try {
    const { id: assetId, componentId } = req.params;

    const existing = await prisma.computerComponent.findUnique({ where: { id: componentId } });
    if (!existing || existing.assetId !== assetId) return error(res, 'Component not found', 404);
    if (req.tenantWhere?.organizationId && existing.organizationId !== req.tenantWhere.organizationId) {
      return error(res, 'Component not found', 404);
    }

    await prisma.computerComponent.delete({ where: { id: componentId } });
    return success(res, { message: 'Component removed' });
  } catch (err) { next(err); }
}

module.exports = { listComponents, addComponent, updateComponent, removeComponent };
