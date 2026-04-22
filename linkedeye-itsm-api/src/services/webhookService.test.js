const { verifyWebhookSignature, generateWebhookSignature } = require('./webhookService');

describe('Webhook Service', () => {
  const secret = 'test-webhook-secret-key';
  const payload = '{"alert":"cpu_high","severity":"critical"}';

  test('should generate valid HMAC-SHA256 signature', () => {
    const signature = generateWebhookSignature(payload, secret);
    expect(typeof signature).toBe('string');
    expect(signature.length).toBe(64); // SHA256 hex = 64 chars
  });

  test('should verify valid signature', () => {
    const signature = generateWebhookSignature(payload, secret);
    expect(verifyWebhookSignature(payload, signature, secret)).toBe(true);
  });

  test('should reject invalid signature', () => {
    expect(verifyWebhookSignature(payload, 'a'.repeat(64), secret)).toBe(false);
  });

  test('should reject modified payload', () => {
    const signature = generateWebhookSignature(payload, secret);
    const modified = '{"alert":"modified"}';
    expect(verifyWebhookSignature(modified, signature, secret)).toBe(false);
  });

  test('should reject wrong secret', () => {
    const signature = generateWebhookSignature(payload, secret);
    expect(verifyWebhookSignature(payload, signature, 'wrong-secret')).toBe(false);
  });

  test('should reject empty signature', () => {
    expect(verifyWebhookSignature(payload, '', secret)).toBe(false);
  });

  test('should reject null/undefined inputs', () => {
    expect(verifyWebhookSignature(null, 'sig', secret)).toBe(false);
    expect(verifyWebhookSignature(payload, null, secret)).toBe(false);
    expect(verifyWebhookSignature(payload, 'sig', null)).toBe(false);
  });

  test('should handle different-length signature gracefully', () => {
    expect(verifyWebhookSignature(payload, 'short', secret)).toBe(false);
  });
});
