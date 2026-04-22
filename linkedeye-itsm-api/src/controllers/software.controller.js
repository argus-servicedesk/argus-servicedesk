// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — Software Management Controller
// ═══════════════════════════════════════════════════════════

const { prisma } = require('../config/database');
const { paginate, paginationMeta, success, error } = require('../utils/helpers');
const { getCreateOrgId } = require('../middleware/tenant');

// ── Software CRUD ──────────────────────────────────────────

// GET /api/v1/software
async function listSoftware(req, res, next) {
  try {
    const { category, search, isOpenSource, sortBy, sortOrder } = req.query;
    const { skip, take, page, limit } = paginate(req.query.page, req.query.limit);

    const where = {};
    Object.assign(where, req.tenantWhere);
    if (category) where.category = category;
    if (isOpenSource !== undefined) where.isOpenSource = isOpenSource === 'true';
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { publisher: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy = sortBy ? { [sortBy]: sortOrder || 'asc' } : { name: 'asc' };

    const [items, total] = await prisma.$transaction([
      prisma.software.findMany({
        where,
        include: {
          _count: { select: { versions: true, licenses: true } },
          versions: { include: { _count: { select: { installations: true } } } },
        },
        orderBy,
        skip,
        take,
      }),
      prisma.software.count({ where }),
    ]);

    // Flatten installation count from versions
    const data = items.map((sw) => {
      const installationsCount = sw.versions.reduce((sum, v) => sum + v._count.installations, 0);
      const { versions, ...rest } = sw;
      return { ...rest, installationsCount };
    });

    return success(res, data, 200, paginationMeta(total, page, limit));
  } catch (err) { next(err); }
}

// GET /api/v1/software/:id
async function getSoftware(req, res, next) {
  try {
    const sw = await prisma.software.findUnique({
      where: { id: req.params.id },
      include: {
        versions: {
          include: { _count: { select: { installations: true } } },
          orderBy: { createdAt: 'desc' },
        },
        licenses: {
          include: { vendor: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { versions: true, licenses: true } },
      },
    });
    if (!sw) return error(res, 'Software not found', 404);
    if (req.tenantWhere?.organizationId && sw.organizationId !== req.tenantWhere.organizationId) {
      return error(res, 'Software not found', 404);
    }

    // Fetch installations separately with asset names
    const installations = await prisma.softwareInstallation.findMany({
      where: { version: { softwareId: sw.id }, ...req.tenantWhere },
      include: {
        asset: { select: { id: true, name: true, hostname: true, type: true } },
        version: { select: { id: true, version: true } },
        license: { select: { id: true, name: true, serialKey: true } },
      },
      orderBy: { installDate: 'desc' },
    });

    return success(res, { ...sw, installations });
  } catch (err) { next(err); }
}

// POST /api/v1/software
async function createSoftware(req, res, next) {
  try {
    const { name, publisher, category, description, website, isOpenSource } = req.body;
    const sw = await prisma.software.create({
      data: {
        name,
        publisher,
        category,
        description,
        website,
        isOpenSource: isOpenSource || false,
        organizationId: getCreateOrgId(req),
      },
    });
    return success(res, sw, 201);
  } catch (err) { next(err); }
}

// PATCH /api/v1/software/:id
async function updateSoftware(req, res, next) {
  try {
    const existing = await prisma.software.findUnique({ where: { id: req.params.id } });
    if (!existing) return error(res, 'Software not found', 404);
    if (req.tenantWhere?.organizationId && existing.organizationId !== req.tenantWhere.organizationId) {
      return error(res, 'Software not found', 404);
    }

    const { name, publisher, category, description, website, isOpenSource } = req.body;
    const sw = await prisma.software.update({
      where: { id: req.params.id },
      data: { name, publisher, category, description, website, isOpenSource },
    });
    return success(res, sw);
  } catch (err) { next(err); }
}

// DELETE /api/v1/software/:id
async function deleteSoftware(req, res, next) {
  try {
    const existing = await prisma.software.findUnique({ where: { id: req.params.id } });
    if (!existing) return error(res, 'Software not found', 404);
    if (req.tenantWhere?.organizationId && existing.organizationId !== req.tenantWhere.organizationId) {
      return error(res, 'Software not found', 404);
    }

    await prisma.software.delete({ where: { id: req.params.id } });
    return success(res, { message: 'Software deleted' });
  } catch (err) { next(err); }
}

// ── Versions ───────────────────────────────────────────────

// POST /api/v1/software/:id/versions
async function addVersion(req, res, next) {
  try {
    const existing = await prisma.software.findUnique({ where: { id: req.params.id } });
    if (!existing) return error(res, 'Software not found', 404);
    if (req.tenantWhere?.organizationId && existing.organizationId !== req.tenantWhere.organizationId) {
      return error(res, 'Software not found', 404);
    }

    const { version, arch, releaseDate, endOfSupport } = req.body;
    const ver = await prisma.softwareVersion.create({
      data: {
        softwareId: req.params.id,
        version,
        arch,
        releaseDate: releaseDate ? new Date(releaseDate) : null,
        endOfSupport: endOfSupport ? new Date(endOfSupport) : null,
      },
    });
    return success(res, ver, 201);
  } catch (err) { next(err); }
}

// DELETE /api/v1/software/:id/versions/:versionId
async function deleteVersion(req, res, next) {
  try {
    const ver = await prisma.softwareVersion.findUnique({ where: { id: req.params.versionId } });
    if (!ver || ver.softwareId !== req.params.id) return error(res, 'Version not found', 404);

    // Tenant check via parent software
    const sw = await prisma.software.findUnique({ where: { id: req.params.id } });
    if (req.tenantWhere?.organizationId && sw.organizationId !== req.tenantWhere.organizationId) {
      return error(res, 'Version not found', 404);
    }

    await prisma.softwareVersion.delete({ where: { id: req.params.versionId } });
    return success(res, { message: 'Version deleted' });
  } catch (err) { next(err); }
}

// ── Licenses ───────────────────────────────────────────────

// GET /api/v1/software/:id/licenses
async function listLicenses(req, res, next) {
  try {
    const { skip, take, page, limit } = paginate(req.query.page, req.query.limit);

    const where = { softwareId: req.params.id, ...req.tenantWhere };
    const [licenses, total] = await prisma.$transaction([
      prisma.softwareLicense.findMany({
        where,
        include: {
          vendor: { select: { id: true, name: true } },
          _count: { select: { installations: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.softwareLicense.count({ where }),
    ]);

    return success(res, licenses, 200, paginationMeta(total, page, limit));
  } catch (err) { next(err); }
}

// POST /api/v1/software/:id/licenses
async function createLicense(req, res, next) {
  try {
    const existing = await prisma.software.findUnique({ where: { id: req.params.id } });
    if (!existing) return error(res, 'Software not found', 404);
    if (req.tenantWhere?.organizationId && existing.organizationId !== req.tenantWhere.organizationId) {
      return error(res, 'Software not found', 404);
    }

    const { name, serialKey, type, status, quantity, purchaseDate, expiryDate, cost, currency, vendorId, poNumber, notes } = req.body;
    const license = await prisma.softwareLicense.create({
      data: {
        softwareId: req.params.id,
        name,
        serialKey,
        type,
        status,
        quantity: quantity || 1,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        cost,
        currency,
        vendorId,
        poNumber,
        notes,
        organizationId: getCreateOrgId(req),
      },
      include: { vendor: { select: { id: true, name: true } } },
    });
    return success(res, license, 201);
  } catch (err) { next(err); }
}

// PATCH /api/v1/software/:id/licenses/:licenseId
async function updateLicense(req, res, next) {
  try {
    const existing = await prisma.softwareLicense.findUnique({ where: { id: req.params.licenseId } });
    if (!existing || existing.softwareId !== req.params.id) return error(res, 'License not found', 404);
    if (req.tenantWhere?.organizationId && existing.organizationId !== req.tenantWhere.organizationId) {
      return error(res, 'License not found', 404);
    }

    const { name, serialKey, type, status, quantity, purchaseDate, expiryDate, cost, currency, vendorId, poNumber, notes } = req.body;
    const license = await prisma.softwareLicense.update({
      where: { id: req.params.licenseId },
      data: {
        name, serialKey, type, status, quantity,
        purchaseDate: purchaseDate !== undefined ? (purchaseDate ? new Date(purchaseDate) : null) : undefined,
        expiryDate: expiryDate !== undefined ? (expiryDate ? new Date(expiryDate) : null) : undefined,
        cost, currency, vendorId, poNumber, notes,
      },
      include: { vendor: { select: { id: true, name: true } } },
    });
    return success(res, license);
  } catch (err) { next(err); }
}

// DELETE /api/v1/software/:id/licenses/:licenseId
async function deleteLicense(req, res, next) {
  try {
    const existing = await prisma.softwareLicense.findUnique({ where: { id: req.params.licenseId } });
    if (!existing || existing.softwareId !== req.params.id) return error(res, 'License not found', 404);
    if (req.tenantWhere?.organizationId && existing.organizationId !== req.tenantWhere.organizationId) {
      return error(res, 'License not found', 404);
    }

    await prisma.softwareLicense.delete({ where: { id: req.params.licenseId } });
    return success(res, { message: 'License deleted' });
  } catch (err) { next(err); }
}

// GET /api/v1/software/license-stats
async function getLicenseStats(req, res, next) {
  try {
    const tw = req.tenantWhere || {};
    const now = new Date();
    const in30days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const [total, active, expired, expiringSoon, byType, byStatus, totalCost, usedSeats, totalSeats] =
      await prisma.$transaction([
        prisma.softwareLicense.count({ where: { ...tw } }),
        prisma.softwareLicense.count({ where: { ...tw, status: 'ACTIVE' } }),
        prisma.softwareLicense.count({ where: { ...tw, status: 'EXPIRED' } }),
        prisma.softwareLicense.count({
          where: { ...tw, status: 'ACTIVE', expiryDate: { gte: now, lte: in30days } },
        }),
        prisma.softwareLicense.groupBy({ by: ['type'], where: { ...tw }, _count: true }),
        prisma.softwareLicense.groupBy({ by: ['status'], where: { ...tw }, _count: true }),
        prisma.softwareLicense.aggregate({ where: { ...tw }, _sum: { cost: true } }),
        prisma.softwareLicense.aggregate({ where: { ...tw, status: 'ACTIVE' }, _sum: { usedCount: true } }),
        prisma.softwareLicense.aggregate({ where: { ...tw, status: 'ACTIVE' }, _sum: { quantity: true } }),
      ]);

    return success(res, {
      total,
      active,
      expired,
      expiringSoon,
      byType,
      byStatus,
      totalCost: totalCost._sum.cost || 0,
      compliance: {
        totalSeats: totalSeats._sum.quantity || 0,
        usedSeats: usedSeats._sum.usedCount || 0,
        availableSeats: (totalSeats._sum.quantity || 0) - (usedSeats._sum.usedCount || 0),
      },
    });
  } catch (err) { next(err); }
}

// ── Installations ──────────────────────────────────────────

// POST /api/v1/software/install
async function installSoftware(req, res, next) {
  try {
    const { assetId, versionId, licenseId } = req.body;
    if (!assetId || !versionId) return error(res, 'assetId and versionId are required', 400);

    // Verify asset exists and tenant owns it
    const asset = await prisma.configurationItem.findUnique({ where: { id: assetId } });
    if (!asset) return error(res, 'Asset not found', 404);
    if (req.tenantWhere?.organizationId && asset.organizationId !== req.tenantWhere.organizationId) {
      return error(res, 'Asset not found', 404);
    }

    // Verify version exists
    const ver = await prisma.softwareVersion.findUnique({ where: { id: versionId }, include: { software: true } });
    if (!ver) return error(res, 'Software version not found', 404);
    if (req.tenantWhere?.organizationId && ver.software.organizationId !== req.tenantWhere.organizationId) {
      return error(res, 'Software version not found', 404);
    }

    // If license provided, verify and increment usedCount
    if (licenseId) {
      const lic = await prisma.softwareLicense.findUnique({ where: { id: licenseId } });
      if (!lic) return error(res, 'License not found', 404);
      if (lic.status !== 'ACTIVE') return error(res, 'License is not active', 400);
      if (lic.usedCount >= lic.quantity) return error(res, 'No available license seats', 400);
      await prisma.softwareLicense.update({
        where: { id: licenseId },
        data: { usedCount: { increment: 1 } },
      });
    }

    const installation = await prisma.softwareInstallation.create({
      data: {
        assetId,
        versionId,
        licenseId: licenseId || null,
        installedBy: req.user.id,
        organizationId: getCreateOrgId(req),
      },
      include: {
        asset: { select: { id: true, name: true, hostname: true } },
        version: { select: { id: true, version: true, software: { select: { id: true, name: true } } } },
        license: { select: { id: true, name: true } },
      },
    });

    return success(res, installation, 201);
  } catch (err) { next(err); }
}

// POST /api/v1/software/uninstall/:installationId
async function uninstallSoftware(req, res, next) {
  try {
    const inst = await prisma.softwareInstallation.findUnique({ where: { id: req.params.installationId } });
    if (!inst) return error(res, 'Installation not found', 404);
    if (req.tenantWhere?.organizationId && inst.organizationId !== req.tenantWhere.organizationId) {
      return error(res, 'Installation not found', 404);
    }
    if (inst.uninstallDate) return error(res, 'Already uninstalled', 400);

    // Decrement license usedCount if linked
    if (inst.licenseId) {
      await prisma.softwareLicense.update({
        where: { id: inst.licenseId },
        data: { usedCount: { decrement: 1 } },
      });
    }

    const updated = await prisma.softwareInstallation.update({
      where: { id: req.params.installationId },
      data: { uninstallDate: new Date() },
      include: {
        asset: { select: { id: true, name: true, hostname: true } },
        version: { select: { id: true, version: true, software: { select: { id: true, name: true } } } },
      },
    });

    return success(res, updated);
  } catch (err) { next(err); }
}

// GET /api/v1/software/installations/:assetId
async function getInstallations(req, res, next) {
  try {
    const { skip, take, page, limit } = paginate(req.query.page, req.query.limit);

    const where = { assetId: req.params.assetId, ...req.tenantWhere };
    const [installations, total] = await prisma.$transaction([
      prisma.softwareInstallation.findMany({
        where,
        include: {
          version: {
            select: { id: true, version: true, arch: true, software: { select: { id: true, name: true, publisher: true, category: true } } },
          },
          license: { select: { id: true, name: true, type: true, status: true, serialKey: true } },
        },
        orderBy: { installDate: 'desc' },
        skip,
        take,
      }),
      prisma.softwareInstallation.count({ where }),
    ]);

    return success(res, installations, 200, paginationMeta(total, page, limit));
  } catch (err) { next(err); }
}

module.exports = {
  listSoftware, getSoftware, createSoftware, updateSoftware, deleteSoftware,
  addVersion, deleteVersion,
  listLicenses, createLicense, updateLicense, deleteLicense, getLicenseStats,
  installSoftware, uninstallSoftware, getInstallations,
};
