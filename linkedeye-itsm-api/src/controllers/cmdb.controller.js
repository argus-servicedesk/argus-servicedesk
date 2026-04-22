// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — CMDB Sub-Resource Controller
// Handles: CI Relationships, Network Connections, Financials,
//          Allocations, Disposal, Movements, IP Addresses
// ═══════════════════════════════════════════════════════════

const { prisma } = require('../config/database');
const { paginate, paginationMeta, success, error } = require('../utils/helpers');
const { getCreateOrgId } = require('../middleware/tenant');

// ─── HELPER: verify asset exists and belongs to tenant ───

async function verifyAsset(req) {
  const asset = await prisma.configurationItem.findUnique({ where: { id: req.params.id } });
  if (!asset) return null;
  if (req.tenantWhere?.organizationId && asset.organizationId !== req.tenantWhere.organizationId) return null;
  return asset;
}

// ═══════════════════════════════════════════════════════════
// CI RELATIONSHIPS
// ═══════════════════════════════════════════════════════════

// GET /api/v1/assets/:id/relationships
async function listRelationships(req, res, next) {
  try {
    const asset = await verifyAsset(req);
    if (!asset) return error(res, 'Asset not found', 404);

    const [parentRels, childRels] = await prisma.$transaction([
      prisma.cIRelationship.findMany({
        where: { parentId: req.params.id, ...req.tenantWhere },
        include: { child: { select: { id: true, name: true, type: true, status: true } } },
      }),
      prisma.cIRelationship.findMany({
        where: { childId: req.params.id, ...req.tenantWhere },
        include: { parent: { select: { id: true, name: true, type: true, status: true } } },
      }),
    ]);

    return success(res, { parentRelationships: parentRels, childRelationships: childRels });
  } catch (err) { next(err); }
}

// POST /api/v1/assets/:id/relationships
async function createRelationship(req, res, next) {
  try {
    const asset = await verifyAsset(req);
    if (!asset) return error(res, 'Asset not found', 404);

    const { childId, type, description } = req.body;
    if (!childId || !type) return error(res, 'childId and type are required', 400);
    if (childId === req.params.id) return error(res, 'Cannot create a relationship with itself', 400);

    const rel = await prisma.cIRelationship.create({
      data: {
        parentId: req.params.id,
        childId, type, description,
        organizationId: getCreateOrgId(req),
      },
      include: {
        parent: { select: { id: true, name: true, type: true } },
        child: { select: { id: true, name: true, type: true } },
      },
    });

    return success(res, rel, 201);
  } catch (err) {
    if (err.code === 'P2002') return error(res, 'This relationship already exists', 409);
    if (err.code === 'P2003') return error(res, 'Referenced CI not found', 400);
    next(err);
  }
}

// DELETE /api/v1/assets/:id/relationships/:relId
async function deleteRelationship(req, res, next) {
  try {
    const existing = await prisma.cIRelationship.findUnique({ where: { id: req.params.relId } });
    if (!existing) return error(res, 'Relationship not found', 404);
    if (req.tenantWhere?.organizationId && existing.organizationId !== req.tenantWhere.organizationId) {
      return error(res, 'Relationship not found', 404);
    }

    await prisma.cIRelationship.delete({ where: { id: req.params.relId } });
    return success(res, { message: 'Relationship deleted' });
  } catch (err) { next(err); }
}

// GET /api/v1/assets/:id/dependency-map
async function getDependencyMap(req, res, next) {
  try {
    const asset = await verifyAsset(req);
    if (!asset) return error(res, 'Asset not found', 404);

    const maxDepth = Math.min(parseInt(req.query.depth, 10) || 5, 10);
    const nodes = new Map();
    const edges = [];
    const visited = new Set();
    const queue = [{ id: req.params.id, depth: 0 }];

    nodes.set(req.params.id, { id: asset.id, name: asset.name, type: asset.type, status: asset.status, depth: 0 });

    while (queue.length > 0) {
      const { id: currentId, depth } = queue.shift();
      if (visited.has(currentId) || depth >= maxDepth) continue;
      visited.add(currentId);

      const rels = await prisma.cIRelationship.findMany({
        where: {
          OR: [{ parentId: currentId }, { childId: currentId }],
          ...req.tenantWhere,
        },
        include: {
          parent: { select: { id: true, name: true, type: true, status: true } },
          child: { select: { id: true, name: true, type: true, status: true } },
        },
      });

      for (const rel of rels) {
        edges.push({ id: rel.id, source: rel.parentId, target: rel.childId, type: rel.type });

        const other = rel.parentId === currentId ? rel.child : rel.parent;
        if (!nodes.has(other.id)) {
          nodes.set(other.id, { ...other, depth: depth + 1 });
          if (!visited.has(other.id)) {
            queue.push({ id: other.id, depth: depth + 1 });
          }
        }
      }
    }

    return success(res, { nodes: Array.from(nodes.values()), edges });
  } catch (err) { next(err); }
}

// ═══════════════════════════════════════════════════════════
// NETWORK CONNECTIONS
// ═══════════════════════════════════════════════════════════

// GET /api/v1/assets/:id/connections
async function listConnections(req, res, next) {
  try {
    const asset = await verifyAsset(req);
    if (!asset) return error(res, 'Asset not found', 404);

    const connections = await prisma.networkConnection.findMany({
      where: {
        OR: [{ sourceDeviceId: req.params.id }, { destinationDeviceId: req.params.id }],
        ...req.tenantWhere,
      },
      include: {
        sourceDevice: { select: { id: true, name: true, type: true } },
        destinationDevice: { select: { id: true, name: true, type: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return success(res, connections);
  } catch (err) { next(err); }
}

// POST /api/v1/assets/:id/connections
async function createConnection(req, res, next) {
  try {
    const asset = await verifyAsset(req);
    if (!asset) return error(res, 'Asset not found', 404);

    const { destinationDeviceId, sourcePort, destPort, connectionType, bandwidth, vlan, description } = req.body;
    if (!destinationDeviceId) return error(res, 'destinationDeviceId is required', 400);

    const conn = await prisma.networkConnection.create({
      data: {
        sourceDeviceId: req.params.id,
        destinationDeviceId, sourcePort, destPort, connectionType, bandwidth, vlan, description,
        organizationId: getCreateOrgId(req),
      },
      include: {
        sourceDevice: { select: { id: true, name: true, type: true } },
        destinationDevice: { select: { id: true, name: true, type: true } },
      },
    });

    return success(res, conn, 201);
  } catch (err) {
    if (err.code === 'P2003') return error(res, 'Referenced device not found', 400);
    next(err);
  }
}

// PATCH /api/v1/assets/:id/connections/:connId
async function updateConnection(req, res, next) {
  try {
    const existing = await prisma.networkConnection.findUnique({ where: { id: req.params.connId } });
    if (!existing) return error(res, 'Connection not found', 404);
    if (req.tenantWhere?.organizationId && existing.organizationId !== req.tenantWhere.organizationId) {
      return error(res, 'Connection not found', 404);
    }

    const { sourcePort, destPort, connectionType, bandwidth, vlan, description } = req.body;
    const conn = await prisma.networkConnection.update({
      where: { id: req.params.connId },
      data: { sourcePort, destPort, connectionType, bandwidth, vlan, description },
      include: {
        sourceDevice: { select: { id: true, name: true, type: true } },
        destinationDevice: { select: { id: true, name: true, type: true } },
      },
    });

    return success(res, conn);
  } catch (err) { next(err); }
}

// DELETE /api/v1/assets/:id/connections/:connId
async function deleteConnection(req, res, next) {
  try {
    const existing = await prisma.networkConnection.findUnique({ where: { id: req.params.connId } });
    if (!existing) return error(res, 'Connection not found', 404);
    if (req.tenantWhere?.organizationId && existing.organizationId !== req.tenantWhere.organizationId) {
      return error(res, 'Connection not found', 404);
    }

    await prisma.networkConnection.delete({ where: { id: req.params.connId } });
    return success(res, { message: 'Connection deleted' });
  } catch (err) { next(err); }
}

// ═══════════════════════════════════════════════════════════
// ASSET FINANCIALS
// ═══════════════════════════════════════════════════════════

// GET /api/v1/assets/:id/financials
async function getFinancials(req, res, next) {
  try {
    const asset = await verifyAsset(req);
    if (!asset) return error(res, 'Asset not found', 404);

    const financials = await prisma.assetFinancial.findUnique({
      where: { assetId: req.params.id },
      include: { vendor: { select: { id: true, name: true, contactPerson: true, email: true } } },
    });

    return success(res, financials);
  } catch (err) { next(err); }
}

// PUT /api/v1/assets/:id/financials
async function upsertFinancials(req, res, next) {
  try {
    const asset = await verifyAsset(req);
    if (!asset) return error(res, 'Asset not found', 404);

    const {
      purchaseDate, invoiceNumber, quantity, unitPrice, totalPrice, vendorId,
      warrantyExpiry, amcStartDate, amcEndDate, amcVendor, currency, poNumber, supplierContact,
    } = req.body;

    const data = {
      purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
      invoiceNumber, quantity, unitPrice, totalPrice, vendorId,
      warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : undefined,
      amcStartDate: amcStartDate ? new Date(amcStartDate) : undefined,
      amcEndDate: amcEndDate ? new Date(amcEndDate) : undefined,
      amcVendor, currency, poNumber, supplierContact,
    };

    const financials = await prisma.assetFinancial.upsert({
      where: { assetId: req.params.id },
      create: { ...data, assetId: req.params.id, organizationId: getCreateOrgId(req) },
      update: data,
      include: { vendor: { select: { id: true, name: true } } },
    });

    return success(res, financials);
  } catch (err) {
    if (err.code === 'P2003') return error(res, 'Referenced vendor not found', 400);
    next(err);
  }
}

// DELETE /api/v1/assets/:id/financials
async function deleteFinancials(req, res, next) {
  try {
    const asset = await verifyAsset(req);
    if (!asset) return error(res, 'Asset not found', 404);

    const existing = await prisma.assetFinancial.findUnique({ where: { assetId: req.params.id } });
    if (!existing) return error(res, 'No financial record found for this asset', 404);

    await prisma.assetFinancial.delete({ where: { assetId: req.params.id } });
    return success(res, { message: 'Financial record deleted' });
  } catch (err) { next(err); }
}

// ═══════════════════════════════════════════════════════════
// ASSET ALLOCATIONS
// ═══════════════════════════════════════════════════════════

// GET /api/v1/assets/:id/allocations
async function listAllocations(req, res, next) {
  try {
    const asset = await verifyAsset(req);
    if (!asset) return error(res, 'Asset not found', 404);

    const { skip, take, page, limit } = paginate(req.query.page, req.query.limit);
    const where = { assetId: req.params.id, ...req.tenantWhere };

    const [allocations, total] = await prisma.$transaction([
      prisma.assetAllocation.findMany({
        where,
        include: { assignedUser: { select: { id: true, firstName: true, lastName: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip, take,
      }),
      prisma.assetAllocation.count({ where }),
    ]);

    return success(res, allocations, 200, paginationMeta(total, page, limit));
  } catch (err) { next(err); }
}

// POST /api/v1/assets/:id/allocations
async function createAllocation(req, res, next) {
  try {
    const asset = await verifyAsset(req);
    if (!asset) return error(res, 'Asset not found', 404);

    const { customerName, assignedUserId, allocationDate, notes } = req.body;

    const allocation = await prisma.assetAllocation.create({
      data: {
        assetId: req.params.id,
        customerName, assignedUserId,
        allocationDate: allocationDate ? new Date(allocationDate) : new Date(),
        status: 'ALLOCATED',
        notes,
        organizationId: getCreateOrgId(req),
      },
      include: { assignedUser: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });

    return success(res, allocation, 201);
  } catch (err) { next(err); }
}

// PATCH /api/v1/assets/:id/allocations/:allocId
async function updateAllocation(req, res, next) {
  try {
    const existing = await prisma.assetAllocation.findUnique({ where: { id: req.params.allocId } });
    if (!existing) return error(res, 'Allocation not found', 404);
    if (req.tenantWhere?.organizationId && existing.organizationId !== req.tenantWhere.organizationId) {
      return error(res, 'Allocation not found', 404);
    }

    const { customerName, assignedUserId, allocationDate, notes, status } = req.body;
    const allocation = await prisma.assetAllocation.update({
      where: { id: req.params.allocId },
      data: {
        customerName, assignedUserId, notes, status,
        allocationDate: allocationDate ? new Date(allocationDate) : undefined,
      },
      include: { assignedUser: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });

    return success(res, allocation);
  } catch (err) { next(err); }
}

// POST /api/v1/assets/:id/allocations/:allocId/return
async function returnAsset(req, res, next) {
  try {
    const existing = await prisma.assetAllocation.findUnique({ where: { id: req.params.allocId } });
    if (!existing) return error(res, 'Allocation not found', 404);
    if (req.tenantWhere?.organizationId && existing.organizationId !== req.tenantWhere.organizationId) {
      return error(res, 'Allocation not found', 404);
    }
    if (existing.status !== 'ALLOCATED') return error(res, 'Asset is not currently allocated', 400);

    const allocation = await prisma.assetAllocation.update({
      where: { id: req.params.allocId },
      data: {
        status: 'RETURNED',
        returnDate: new Date(),
        notes: req.body.notes || existing.notes,
      },
    });

    return success(res, allocation);
  } catch (err) { next(err); }
}

// ═══════════════════════════════════════════════════════════
// ASSET DISPOSAL
// ═══════════════════════════════════════════════════════════

// GET /api/v1/assets/:id/disposal
async function getDisposal(req, res, next) {
  try {
    const asset = await verifyAsset(req);
    if (!asset) return error(res, 'Asset not found', 404);

    const disposal = await prisma.assetDisposal.findUnique({
      where: { assetId: req.params.id },
      include: { approvedBy: { select: { id: true, firstName: true, lastName: true } } },
    });

    return success(res, disposal);
  } catch (err) { next(err); }
}

// POST /api/v1/assets/:id/disposal
async function createDisposal(req, res, next) {
  try {
    const asset = await verifyAsset(req);
    if (!asset) return error(res, 'Asset not found', 404);

    const existingDisposal = await prisma.assetDisposal.findUnique({ where: { assetId: req.params.id } });
    if (existingDisposal) return error(res, 'Disposal record already exists for this asset', 409);

    const { disposalDate, disposalQuantity, disposalValue, disposalMethod, remarks, approvedById } = req.body;

    const disposal = await prisma.assetDisposal.create({
      data: {
        assetId: req.params.id,
        disposalDate: disposalDate ? new Date(disposalDate) : new Date(),
        disposalQuantity, disposalValue, disposalMethod, remarks,
        approvedById: approvedById || req.user.id,
        organizationId: getCreateOrgId(req),
      },
      include: { approvedBy: { select: { id: true, firstName: true, lastName: true } } },
    });

    // Also update the CI status to DISPOSED
    await prisma.configurationItem.update({
      where: { id: req.params.id },
      data: { status: 'DISPOSED' },
    });

    return success(res, disposal, 201);
  } catch (err) { next(err); }
}

// DELETE /api/v1/assets/:id/disposal
async function deleteDisposal(req, res, next) {
  try {
    const asset = await verifyAsset(req);
    if (!asset) return error(res, 'Asset not found', 404);

    const existing = await prisma.assetDisposal.findUnique({ where: { assetId: req.params.id } });
    if (!existing) return error(res, 'No disposal record found for this asset', 404);

    await prisma.assetDisposal.delete({ where: { assetId: req.params.id } });
    return success(res, { message: 'Disposal record deleted' });
  } catch (err) { next(err); }
}

// ═══════════════════════════════════════════════════════════
// ASSET MOVEMENTS
// ═══════════════════════════════════════════════════════════

// GET /api/v1/assets/:id/movements
async function listMovements(req, res, next) {
  try {
    const asset = await verifyAsset(req);
    if (!asset) return error(res, 'Asset not found', 404);

    const { skip, take, page, limit } = paginate(req.query.page, req.query.limit);
    const where = { assetId: req.params.id, ...req.tenantWhere };

    const [movements, total] = await prisma.$transaction([
      prisma.assetMovement.findMany({
        where,
        include: { movedBy: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { movementDate: 'desc' },
        skip, take,
      }),
      prisma.assetMovement.count({ where }),
    ]);

    return success(res, movements, 200, paginationMeta(total, page, limit));
  } catch (err) { next(err); }
}

// POST /api/v1/assets/:id/movements
async function createMovement(req, res, next) {
  try {
    const asset = await verifyAsset(req);
    if (!asset) return error(res, 'Asset not found', 404);

    const { fromLocation, toLocation, movementDate, reason } = req.body;

    const movement = await prisma.assetMovement.create({
      data: {
        assetId: req.params.id,
        fromLocation: fromLocation || asset.location,
        toLocation, reason,
        movementDate: movementDate ? new Date(movementDate) : new Date(),
        movedById: req.user.id,
        organizationId: getCreateOrgId(req),
      },
      include: { movedBy: { select: { id: true, firstName: true, lastName: true } } },
    });

    // Update the CI's location to the new location
    if (toLocation) {
      await prisma.configurationItem.update({
        where: { id: req.params.id },
        data: { location: toLocation },
      });
    }

    return success(res, movement, 201);
  } catch (err) { next(err); }
}

// ═══════════════════════════════════════════════════════════
// IP ADDRESSES (sub-resource of asset)
// ═══════════════════════════════════════════════════════════

// GET /api/v1/assets/:id/ip-addresses
async function listAssetIPAddresses(req, res, next) {
  try {
    const asset = await verifyAsset(req);
    if (!asset) return error(res, 'Asset not found', 404);

    const ips = await prisma.iPAddressInventory.findMany({
      where: { assetId: req.params.id, ...req.tenantWhere },
      orderBy: { ipAddress: 'asc' },
    });

    return success(res, ips);
  } catch (err) { next(err); }
}

module.exports = {
  // Relationships
  listRelationships, createRelationship, deleteRelationship, getDependencyMap,
  // Network connections
  listConnections, createConnection, updateConnection, deleteConnection,
  // Financials
  getFinancials, upsertFinancials, deleteFinancials,
  // Allocations
  listAllocations, createAllocation, updateAllocation, returnAsset,
  // Disposal
  getDisposal, createDisposal, deleteDisposal,
  // Movements
  listMovements, createMovement,
  // IP Addresses
  listAssetIPAddresses,
};
