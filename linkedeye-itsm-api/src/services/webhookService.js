// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — Webhook HMAC-SHA256 Signature Service
// ═══════════════════════════════════════════════════════════

const crypto = require('crypto');

/**
 * Verify webhook signature using HMAC-SHA256
 * @param {string} payload - Raw request body as string
 * @param {string} signature - Signature from X-Webhook-Signature header
 * @param {string} secret - Webhook secret from Integration model
 * @returns {boolean} True if signature is valid
 */
function verifyWebhookSignature(payload, signature, secret) {
  if (!signature || !secret || !payload) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    // Buffers different lengths = signatures don't match
    return false;
  }
}

/**
 * Generate webhook signature for outbound webhooks
 * @param {string} payload - Request body as string
 * @param {string} secret - Webhook secret
 * @returns {string} Hex-encoded HMAC-SHA256 signature
 */
function generateWebhookSignature(payload, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
}

module.exports = { verifyWebhookSignature, generateWebhookSignature };
