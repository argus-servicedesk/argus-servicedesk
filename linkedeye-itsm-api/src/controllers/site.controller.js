// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — Site Management Controller
// ═══════════════════════════════════════════════════════════

const net = require('net');
const { prisma } = require('../config/database');
const { paginate, paginationMeta, success, error } = require('../utils/helpers');
const { getCreateOrgId } = require('../middleware/tenant');

const INCLUDE_LIST = {
  organization: { select: { id: true, name: true, slug: true } },
  _count: { select: { assets: true } },
};

const INCLUDE_DETAIL = {
  ...INCLUDE_LIST,
  assets: {
    select: { id: true, name: true, type: true, status: true, ipAddress: true, hostname: true },
    orderBy: { name: 'asc' },
    take: 50,
  },
};

// GET /api/v1/sites
async function listSites(req, res, next) {
  try {
    const { search, isActive, sortBy, sortOrder } = req.query;
    const { skip, take, page, limit } = paginate(req.query.page, req.query.limit);

    const where = {};
    Object.assign(where, req.tenantWhere);
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy = sortBy ? { [sortBy]: sortOrder || 'asc' } : { name: 'asc' };

    const [sites, total] = await prisma.$transaction([
      prisma.site.findMany({ where, include: INCLUDE_LIST, orderBy, skip, take }),
      prisma.site.count({ where }),
    ]);

    return success(res, sites, 200, paginationMeta(total, page, limit));
  } catch (err) { next(err); }
}

// GET /api/v1/sites/:id
async function getSite(req, res, next) {
  try {
    const site = await prisma.site.findUnique({ where: { id: req.params.id }, include: INCLUDE_DETAIL });
    if (!site) return error(res, 'Site not found', 404);
    if (req.tenantWhere?.organizationId && site.organizationId !== req.tenantWhere.organizationId) return error(res, 'Site not found', 404);
    return success(res, site);
  } catch (err) { next(err); }
}

// POST /api/v1/sites
async function createSite(req, res, next) {
  try {
    const { name, code } = req.body;
    if (!name || !code) return error(res, 'name and code are required', 400);

    const site = await prisma.site.create({
      data: { ...req.body, organizationId: getCreateOrgId(req) },
      include: INCLUDE_LIST,
    });

    return success(res, site, 201);
  } catch (err) {
    if (err.code === 'P2002') return error(res, 'A site with this code already exists in the organization', 409);
    next(err);
  }
}

// PUT /api/v1/sites/:id
async function updateSite(req, res, next) {
  try {
    const existing = await prisma.site.findUnique({ where: { id: req.params.id } });
    if (!existing) return error(res, 'Site not found', 404);
    if (req.tenantWhere?.organizationId && existing.organizationId !== req.tenantWhere.organizationId) return error(res, 'Site not found', 404);

    // Don't allow changing organizationId via update
    const { organizationId, ...updateData } = req.body;

    const site = await prisma.site.update({
      where: { id: req.params.id },
      data: updateData,
      include: INCLUDE_LIST,
    });

    return success(res, site);
  } catch (err) {
    if (err.code === 'P2002') return error(res, 'A site with this code already exists in the organization', 409);
    next(err);
  }
}

// DELETE /api/v1/sites/:id  (soft delete)
async function deleteSite(req, res, next) {
  try {
    const existing = await prisma.site.findUnique({ where: { id: req.params.id } });
    if (!existing) return error(res, 'Site not found', 404);
    if (req.tenantWhere?.organizationId && existing.organizationId !== req.tenantWhere.organizationId) return error(res, 'Site not found', 404);

    await prisma.site.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    return success(res, { message: 'Site deactivated' });
  } catch (err) { next(err); }
}

// POST /api/v1/sites/:id/test-connectivity
async function testConnectivity(req, res, next) {
  try {
    const site = await prisma.site.findUnique({ where: { id: req.params.id } });
    if (!site) return error(res, 'Site not found', 404);
    if (req.tenantWhere?.organizationId && site.organizationId !== req.tenantWhere.organizationId) return error(res, 'Site not found', 404);

    const results = { prometheus: null, redis: null };

    // Test Prometheus connectivity
    if (site.prometheusUrl) {
      try {
        const url = new URL('/api/v1/status/config', site.prometheusUrl);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const resp = await fetch(url.toString(), { signal: controller.signal });
        clearTimeout(timeout);
        results.prometheus = { status: resp.ok ? 'ok' : 'error', message: resp.ok ? 'Prometheus reachable' : `HTTP ${resp.status}` };
      } catch (e) {
        results.prometheus = { status: 'error', message: e.name === 'AbortError' ? 'Connection timed out (5s)' : e.message };
      }
    } else {
      results.prometheus = { status: 'error', message: 'No prometheusUrl configured' };
    }

    // Test Redis connectivity (TCP socket)
    if (site.redisHost) {
      try {
        await new Promise((resolve, reject) => {
          const socket = new net.Socket();
          socket.setTimeout(3000);
          socket.on('connect', () => { socket.destroy(); resolve(); });
          socket.on('timeout', () => { socket.destroy(); reject(new Error('Connection timed out (3s)')); });
          socket.on('error', (e) => { socket.destroy(); reject(e); });
          socket.connect(site.redisPort || 6379, site.redisHost);
        });
        results.redis = { status: 'ok', message: `Redis reachable at ${site.redisHost}:${site.redisPort || 6379}` };
      } catch (e) {
        results.redis = { status: 'error', message: e.message };
      }
    } else {
      results.redis = { status: 'error', message: 'No redisHost configured' };
    }

    return success(res, results);
  } catch (err) { next(err); }
}

module.exports = {
  listSites,
  getSite,
  createSite,
  updateSite,
  deleteSite,
  testConnectivity,
};
