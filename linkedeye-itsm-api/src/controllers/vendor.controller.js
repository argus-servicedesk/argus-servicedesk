// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — Vendor Controller
// ═══════════════════════════════════════════════════════════

const { prisma } = require('../config/database');
const { paginate, paginationMeta, success, error } = require('../utils/helpers');
const { getCreateOrgId } = require('../middleware/tenant');

// GET /api/v1/vendors
async function listVendors(req, res, next) {
  try {
    const { search, isActive } = req.query;
    const { skip, take, page, limit } = paginate(req.query.page, req.query.limit);

    const where = { ...req.tenantWhere };
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [vendors, total] = await prisma.$transaction([
      prisma.vendor.findMany({ where, orderBy: { name: 'asc' }, skip, take }),
      prisma.vendor.count({ where }),
    ]);

    return success(res, vendors, 200, paginationMeta(total, page, limit));
  } catch (err) { next(err); }
}

// GET /api/v1/vendors/:id
async function getVendor(req, res, next) {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id: req.params.id },
      include: {
        financials: {
          include: { asset: { select: { id: true, name: true, type: true } } },
          take: 20,
        },
      },
    });
    if (!vendor) return error(res, 'Vendor not found', 404);
    if (req.tenantWhere?.organizationId && vendor.organizationId !== req.tenantWhere.organizationId) {
      return error(res, 'Vendor not found', 404);
    }
    return success(res, vendor);
  } catch (err) { next(err); }
}

// POST /api/v1/vendors
async function createVendor(req, res, next) {
  try {
    const { name, contactPerson, email, phone, address, contractNumber, website, isActive } = req.body;
    if (!name) return error(res, 'Vendor name is required', 400);

    const vendor = await prisma.vendor.create({
      data: {
        name, contactPerson, email, phone, address, contractNumber, website,
        isActive: isActive !== undefined ? isActive : true,
        organizationId: getCreateOrgId(req),
      },
    });

    return success(res, vendor, 201);
  } catch (err) {
    if (err.code === 'P2002') return error(res, 'Vendor with this name already exists in your organization', 409);
    next(err);
  }
}

// PATCH /api/v1/vendors/:id
async function updateVendor(req, res, next) {
  try {
    const existing = await prisma.vendor.findUnique({ where: { id: req.params.id } });
    if (!existing) return error(res, 'Vendor not found', 404);
    if (req.tenantWhere?.organizationId && existing.organizationId !== req.tenantWhere.organizationId) {
      return error(res, 'Vendor not found', 404);
    }

    const { name, contactPerson, email, phone, address, contractNumber, website, isActive } = req.body;
    const vendor = await prisma.vendor.update({
      where: { id: req.params.id },
      data: { name, contactPerson, email, phone, address, contractNumber, website, isActive },
    });

    return success(res, vendor);
  } catch (err) {
    if (err.code === 'P2002') return error(res, 'Vendor with this name already exists in your organization', 409);
    next(err);
  }
}

// DELETE /api/v1/vendors/:id
async function deleteVendor(req, res, next) {
  try {
    const existing = await prisma.vendor.findUnique({ where: { id: req.params.id } });
    if (!existing) return error(res, 'Vendor not found', 404);
    if (req.tenantWhere?.organizationId && existing.organizationId !== req.tenantWhere.organizationId) {
      return error(res, 'Vendor not found', 404);
    }

    await prisma.vendor.delete({ where: { id: req.params.id } });
    return success(res, { message: 'Vendor deleted' });
  } catch (err) { next(err); }
}

module.exports = { listVendors, getVendor, createVendor, updateVendor, deleteVendor };
