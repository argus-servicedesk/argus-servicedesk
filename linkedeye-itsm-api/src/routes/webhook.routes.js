// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — Webhook Routes (Inbound)
// ═══════════════════════════════════════════════════════════

const express = require('express');
const { Router } = require('express');
const {
  alertmanagerWebhook,
  grafanaWebhook,
  slackSlashCommand,
  slackInteractive,
  serviceNowWebhook,
  genericWebhook,
} = require('../controllers/webhook.controller');
const smsCtrl = require('../controllers/sms.controller');
const voiceCtrl = require('../controllers/voice.controller');
const { validateTwilioSignature } = require('../middleware/twilioAuth');
const { verifyWebhookAuth } = require('../middleware/webhookAuth');

const router = Router();

// ── Raw body parser for HMAC signature verification ─────────
// Captures the raw request body before JSON parsing so we can
// compute an HMAC over the exact bytes the sender signed.
const rawBodyParser = [
  express.raw({ type: 'application/json', limit: '10mb' }),
  (req, _res, next) => {
    if (Buffer.isBuffer(req.body)) {
      req.rawBody = req.body.toString('utf8');
      req.body = JSON.parse(req.rawBody);
    }
    next();
  },
];

// ── Externally-facing webhook endpoints ─────────────────────
// These accept payloads from tenant monitoring stacks.
// HMAC-SHA256 signature verification via X-Webhook-Signature header.

// Prometheus Alertmanager
router.post('/alertmanager', ...rawBodyParser, verifyWebhookAuth, alertmanagerWebhook);

// Grafana
router.post('/grafana', ...rawBodyParser, verifyWebhookAuth, grafanaWebhook);

// ServiceNow
router.post('/servicenow', ...rawBodyParser, verifyWebhookAuth, serviceNowWebhook);

// Generic
router.post('/generic', ...rawBodyParser, verifyWebhookAuth, genericWebhook);

// ── Slack endpoints (use Slack's own signature verification) ─
router.post('/slack/commands', slackSlashCommand);
router.post('/slack/interactive', slackInteractive);

// Twilio SMS/Voice webhooks — verified via X-Twilio-Signature (HMAC-SHA1)
router.post('/twilio/sms', validateTwilioSignature, smsCtrl.twilioInboundSMS);
router.post('/twilio/voice', validateTwilioSignature, voiceCtrl.twilioInboundVoice);
router.post('/twilio/speech', validateTwilioSignature, voiceCtrl.twilioSpeechInput);
router.post('/twilio/gather', validateTwilioSignature, voiceCtrl.twilioGather);
router.post('/twilio/status', validateTwilioSignature, voiceCtrl.twilioCallStatus);

// MSG91 delivery callback
router.post('/msg91/delivery', smsCtrl.msg91DeliveryCallback);

// Kaleyra delivery callback
router.post('/kaleyra/delivery', smsCtrl.kaleyraDeliveryCallback);

module.exports = router;
