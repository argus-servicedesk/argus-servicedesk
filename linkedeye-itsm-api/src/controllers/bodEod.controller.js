// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — BOD/EOD Controller
// Beginning-of-Day / End-of-Day operational status
// ═══════════════════════════════════════════════════════════

const { prisma } = require('../config/database');
const { success, error } = require('../utils/helpers');
const bodEod = require('../services/bodEodService');
const logger = require('../utils/logger');

// ── Resolve org's monitoring config ────────────────────

async function resolveConfig(orgId) {
  const integration = await prisma.integration.findFirst({
    where: {
      ...(orgId ? { organizationId: orgId } : {}),
      status: 'ACTIVE',
      type: { in: ['PROMETHEUS', 'KUBERNETES_CLUSTER'] },
    },
    select: { id: true, config: true, organizationId: true },
  });

  let baseConfig = {};
  if (integration?.config) {
    try { baseConfig = JSON.parse(integration.config); } catch (e) { logger.warn('[BOD/EOD] Failed to parse integration config: %s', e.message); }
  }

  // Get org details for siteName
  const org = orgId ? await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, slug: true, name: true },
  }) : null;

  return {
    serverIp: baseConfig.serverIp || null,
    sshPort: parseInt(baseConfig.sshPort) || 4422,
    sshUser: baseConfig.sshUser || 'finadmin',
    redisHost: baseConfig.redisHost || 'localhost',
    redisPort: parseInt(baseConfig.redisPort) || 6379,
    redisPass: baseConfig.redisPass || '',
    siteName: org?.slug || 'prod',
    orgName: org?.name || null,
    orgSlug: org?.slug || null,
  };
}

// ── GET /api/v1/bod-eod/overview ───────────────────────
// Full overview: BOD + EOD + ADP + URL health

async function getOverview(req, res, next) {
  try {
    const cfg = await resolveConfig(req.organizationId);

    let data;
    if (cfg.serverIp) {
      // Try live Redis data
      try {
        const [overview, urlResult] = await Promise.allSettled([
          bodEod.getBodEodOverview(cfg),
          bodEod.getUrlCheckerStatus(cfg),
        ]);

        const overviewData = overview.status === 'fulfilled' ? overview.value : null;
        const urlData = urlResult.status === 'fulfilled' ? urlResult.value : null;

        // If we got real data with at least some keys, use it
        if (overviewData && (overviewData.bod.length || overviewData.eod.length || overviewData.adp.length)) {
          data = {
            bod: overviewData.bod,
            eod: overviewData.eod,
            adp: overviewData.adp,
            urlHealth: urlData?.urls || [],
            simulated: false,
            lastUpdated: overviewData.timestamp,
          };
        }
      } catch (err) {
        logger.warn('[BOD/EOD] Live data fetch failed, falling back to mock: %s', err.message);
      }
    }

    // No live data available — return empty with setup hint
    if (!data) {
      return success(res, {
        org: { name: cfg.orgName, slug: cfg.orgSlug },
        bod: [],
        eod: [],
        adp: [],
        urlHealth: [],
        simulated: false,
        needsSetup: !cfg.serverIp,
        setupMessage: cfg.serverIp
          ? 'Unable to connect to monitoring server. Check your integration configuration.'
          : 'BOD/EOD monitoring requires a configured integration. Go to Settings > Integrations to set up Prometheus or Kubernetes monitoring.',
        generatedAt: new Date().toISOString(),
      });
    }

    return success(res, {
      org: { name: cfg.orgName, slug: cfg.orgSlug },
      ...data,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) { next(err); }
}

// ── GET /api/v1/bod-eod/bod ────────────────────────────
// BOD checklist only

async function getBodChecklist(req, res, next) {
  try {
    const cfg = await resolveConfig(req.organizationId);

    let bodItems;
    if (cfg.serverIp) {
      try {
        const overview = await bodEod.getBodEodOverview(cfg);
        if (overview.bod.length) {
          return success(res, { bod: overview.bod, simulated: false, generatedAt: new Date().toISOString() });
        }
      } catch (err) {
        logger.warn('[BOD/EOD] BOD live fetch failed: %s', err.message);
      }
    }

    const mock = bodEod.getMockBodEodData();
    return success(res, { bod: mock.bod, simulated: true, generatedAt: new Date().toISOString() });
  } catch (err) { next(err); }
}

// ── GET /api/v1/bod-eod/eod ────────────────────────────
// EOD checklist only

async function getEodChecklist(req, res, next) {
  try {
    const cfg = await resolveConfig(req.organizationId);

    if (cfg.serverIp) {
      try {
        const overview = await bodEod.getBodEodOverview(cfg);
        if (overview.eod.length) {
          return success(res, { eod: overview.eod, simulated: false, generatedAt: new Date().toISOString() });
        }
      } catch (err) {
        logger.warn('[BOD/EOD] EOD live fetch failed: %s', err.message);
      }
    }

    const mock = bodEod.getMockBodEodData();
    return success(res, { eod: mock.eod, simulated: true, generatedAt: new Date().toISOString() });
  } catch (err) { next(err); }
}

module.exports = {
  getOverview,
  getBodChecklist,
  getEodChecklist,
};
