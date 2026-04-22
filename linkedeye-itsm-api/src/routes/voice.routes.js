// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — Voice Routes
// ═══════════════════════════════════════════════════════════

const { Router } = require('express');
const multer = require('multer');
const { authenticate, authorize, checkPermission, requireMfa } = require('../middleware/auth');
const { validatePagination, validateUUID } = require('../middleware/validator');
const ctrl = require('../controllers/voice.controller');

const router = Router();

// Multer for audio file uploads (in-memory, max 25MB)
const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg', 'audio/webm', 'audio/flac', 'audio/x-wav'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error(`Unsupported audio format: ${file.mimetype}`));
  },
});

// ── Authenticated Voice Endpoints ───────────────────────

router.use(authenticate);
router.use(requireMfa);

// Core voice pipeline
router.post('/transcribe', checkPermission('integrations', 'create'), audioUpload.single('audio'), ctrl.transcribe);
router.post('/synthesize', checkPermission('integrations', 'create'), ctrl.synthesize);
router.post('/chat', checkPermission('integrations', 'create'), audioUpload.single('audio'), ctrl.voiceChat);

// Outbound calls (admin/manager only)
router.post('/call', checkPermission('integrations', 'create'), authorize('ADMIN', 'MANAGER'), ctrl.makeCall);

// Call logs
router.get('/calls', checkPermission('integrations', 'read'), validatePagination, ctrl.getCallLogs);
router.get('/calls/:id', checkPermission('integrations', 'read'), validateUUID, ctrl.getCallLog);
router.get('/stats', checkPermission('integrations', 'read'), ctrl.getVoiceStats);

// Info
router.get('/languages', checkPermission('integrations', 'read'), ctrl.getSupportedLanguages);
router.get('/health', checkPermission('integrations', 'read'), ctrl.getHealth);

module.exports = router;
