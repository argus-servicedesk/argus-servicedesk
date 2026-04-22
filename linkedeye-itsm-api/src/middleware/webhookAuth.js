// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — Webhook HMAC-SHA256 Signature Verification Middleware
// ═══════════════════════════════════════════════════════════

const { verifyWebhookSignature } = require('../services/webhookService');
const { prisma } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Middleware to verify incoming webhook signatures.
 * Expects:
 *   - X-Webhook-Signature header with HMAC-SHA256 hex digest
 *   - X-Organization-Id header or ?orgId= query param to identify the tenant
 *   - req.rawBody set by raw body parser (falls back to JSON.stringify(req.body))
 *
 * Looks up the Integration record to get the webhook secret,
 * then verifies the signature matches.
 */
async function verifyWebhookAuth(req, res, next) {
  const signature = req.headers['x-webhook-signature'];
  const organizationId = req.headers['x-organization-id'] || req.query.orgId || req.query.org_id;

  if (!signature) {
    return res.status(401).json({
      success: false,
      error: 'Missing X-Webhook-Signature header',
    });
  }

  if (!organizationId) {
    return res.status(400).json({
      success: false,
      error: 'Missing organization identifier (X-Organization-Id header or ?orgId= query)',
    });
  }

  try {
    // Find webhook integration for this org
    const integration = await prisma.integration.findFirst({
      where: {
        organizationId,
        type: { in: ['WEBHOOK', 'PROMETHEUS', 'GRAFANA'] },
        isActive: true,
      },
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: 'No active webhook integration found for this organization',
      });
    }

    // Extract secret from integration config
    let webhookSecret;
    try {
      const config = typeof integration.config === 'string'
        ? JSON.parse(integration.config)
        : integration.config;
      webhookSecret = config?.webhookSecret || config?.secret || config?.apiKey;
    } catch {
      webhookSecret = null;
    }

    if (!webhookSecret) {
      logger.warn(`Webhook integration ${integration.id} has no secret configured`);
      return res.status(500).json({
        success: false,
        error: 'Webhook secret not configured for this integration',
      });
    }

    // Get raw body for signature verification
    const rawBody = req.rawBody || JSON.stringify(req.body);

    if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      logger.warn(`Invalid webhook signature for org ${organizationId}`, {
        integrationId: integration.id,
      });
      return res.status(401).json({
        success: false,
        error: 'Invalid webhook signature',
      });
    }

    // Signature verified — attach org context
    req.organizationId = organizationId;
    req.integrationId = integration.id;
    next();
  } catch (error) {
    logger.error('Webhook auth error:', error);
    return res.status(500).json({
      success: false,
      error: 'Webhook verification failed',
    });
  }
}

module.exports = { verifyWebhookAuth };
