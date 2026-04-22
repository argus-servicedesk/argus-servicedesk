// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — IP Address Inventory Controller
// ═══════════════════════════════════════════════════════════

const { prisma } = require('../config/database');
const { paginate, paginationMeta, success, error } = require('../utils/helpers');
const { getCreateOrgId } = require('../middleware/tenant');

// GET /api/v1/ip-inventory
async function listIPAddresses(req, res, next) {
  try {
    const { status, subnet, vlan, assetId, search } = req.query;
    const { skip, take, page, limit } = paginate(req.query.page, req.query.limit);

    const where = { ...req.tenantWhere };
    if (status) where.status = status;
    if (subnet) where.subnet = subnet;
    if (vlan) where.vlan = vlan;
    if (assetId) where.assetId = assetId;
    if (search) {
      where.OR = [
        { ipAddress: { contains: search, mode: 'insensitive' } },
        { dnsName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [ips, total] = await prisma.$transaction([
      prisma.iPAddressInventory.findMany({
        where,
        include: { asset: { select: { id: true, name: true, type: true, hostname: true } } },
        orderBy: { ipAddress: 'asc' },
        skip,
        take,
      }),
      prisma.iPAddressInventory.count({ where }),
    ]);

    return success(res, ips, 200, paginationMeta(total, page, limit));
  } catch (err) { next(err); }
}

// GET /api/v1/ip-inventory/available
async function listAvailable(req, res, next) {
  try {
    const { skip, take, page, limit } = paginate(req.query.page, req.query.limit);
    const where = { ...req.tenantWhere, status: 'AVAILABLE' };

    const [ips, total] = await prisma.$transaction([
      prisma.iPAddressInventory.findMany({ where, orderBy: { ipAddress: 'asc' }, skip, take }),
      prisma.iPAddressInventory.count({ where }),
    ]);

    return success(res, ips, 200, paginationMeta(total, page, limit));
  } catch (err) { next(err); }
}

// GET /api/v1/ip-inventory/:id
async function getIPAddress(req, res, next) {
  try {
    const ip = await prisma.iPAddressInventory.findUnique({
      where: { id: req.params.id },
      include: { asset: { select: { id: true, name: true, type: true, hostname: true, ipAddress: true } } },
    });
    if (!ip) return error(res, 'IP address record not found', 404);
    if (req.tenantWhere?.organizationId && ip.organizationId !== req.tenantWhere.organizationId) {
      return error(res, 'IP address record not found', 404);
    }
    return success(res, ip);
  } catch (err) { next(err); }
}

// POST /api/v1/ip-inventory
async function createIPAddress(req, res, next) {
  try {
    const { ipAddress, subnet, gateway, dnsName, assetId, status, vlan, notes } = req.body;
    if (!ipAddress) return error(res, 'IP address is required', 400);

    const ip = await prisma.iPAddressInventory.create({
      data: {
        ipAddress, subnet, gateway, dnsName, assetId,
        status: status || 'AVAILABLE',
        vlan, notes,
        organizationId: getCreateOrgId(req),
      },
    });

    return success(res, ip, 201);
  } catch (err) {
    if (err.code === 'P2002') return error(res, 'IP address already exists in your organization', 409);
    next(err);
  }
}

// PATCH /api/v1/ip-inventory/:id
async function updateIPAddress(req, res, next) {
  try {
    const existing = await prisma.iPAddressInventory.findUnique({ where: { id: req.params.id } });
    if (!existing) return error(res, 'IP address record not found', 404);
    if (req.tenantWhere?.organizationId && existing.organizationId !== req.tenantWhere.organizationId) {
      return error(res, 'IP address record not found', 404);
    }

    const { ipAddress, subnet, gateway, dnsName, assetId, status, vlan, notes } = req.body;
    const ip = await prisma.iPAddressInventory.update({
      where: { id: req.params.id },
      data: { ipAddress, subnet, gateway, dnsName, assetId, status, vlan, notes },
    });

    return success(res, ip);
  } catch (err) {
    if (err.code === 'P2002') return error(res, 'IP address already exists in your organization', 409);
    next(err);
  }
}

// DELETE /api/v1/ip-inventory/:id
async function deleteIPAddress(req, res, next) {
  try {
    const existing = await prisma.iPAddressInventory.findUnique({ where: { id: req.params.id } });
    if (!existing) return error(res, 'IP address record not found', 404);
    if (req.tenantWhere?.organizationId && existing.organizationId !== req.tenantWhere.organizationId) {
      return error(res, 'IP address record not found', 404);
    }

    await prisma.iPAddressInventory.delete({ where: { id: req.params.id } });
    return success(res, { message: 'IP address record deleted' });
  } catch (err) { next(err); }
}

// POST /api/v1/ip-inventory/:id/assign
async function assignToAsset(req, res, next) {
  try {
    const { assetId } = req.body;
    if (!assetId) return error(res, 'assetId is required', 400);

    const existing = await prisma.iPAddressInventory.findUnique({ where: { id: req.params.id } });
    if (!existing) return error(res, 'IP address record not found', 404);
    if (req.tenantWhere?.organizationId && existing.organizationId !== req.tenantWhere.organizationId) {
      return error(res, 'IP address record not found', 404);
    }
    if (existing.status === 'ASSIGNED') return error(res, 'IP address is already assigned', 400);

    const ip = await prisma.iPAddressInventory.update({
      where: { id: req.params.id },
      data: { assetId, status: 'ASSIGNED' },
      include: { asset: { select: { id: true, name: true, type: true } } },
    });

    return success(res, ip);
  } catch (err) { next(err); }
}

// POST /api/v1/ip-inventory/:id/release
async function releaseFromAsset(req, res, next) {
  try {
    const existing = await prisma.iPAddressInventory.findUnique({ where: { id: req.params.id } });
    if (!existing) return error(res, 'IP address record not found', 404);
    if (req.tenantWhere?.organizationId && existing.organizationId !== req.tenantWhere.organizationId) {
      return error(res, 'IP address record not found', 404);
    }
    if (existing.status !== 'ASSIGNED') return error(res, 'IP address is not currently assigned', 400);

    const ip = await prisma.iPAddressInventory.update({
      where: { id: req.params.id },
      data: { assetId: null, status: 'AVAILABLE' },
    });

    return success(res, ip);
  } catch (err) { next(err); }
}

module.exports = {
  listIPAddresses, listAvailable, getIPAddress, createIPAddress,
  updateIPAddress, deleteIPAddress, assignToAsset, releaseFromAsset,
};
