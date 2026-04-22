// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — Software Management Routes
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { authenticate, checkPermission, requireMfa } = require('../middleware/auth');
const { validateUUID, validatePagination } = require('../middleware/validator');
const { auditLog } = require('../middleware/audit');
const ctrl = require('../controllers/software.controller');

router.use(authenticate);
router.use(requireMfa);

// ─── Software CRUD ─────────────────────────────────────────
router.get('/', checkPermission('assets', 'read'), validatePagination, ctrl.listSoftware);
router.post('/', checkPermission('assets', 'create'), auditLog('Software'), ctrl.createSoftware);

// Static routes MUST come before :id param routes
router.get('/license-stats', checkPermission('assets', 'read'), ctrl.getLicenseStats);
router.post('/install', checkPermission('assets', 'create'), auditLog('SoftwareInstallation'), ctrl.installSoftware);
router.post('/uninstall/:installationId', checkPermission('assets', 'update'), auditLog('SoftwareInstallation'), ctrl.uninstallSoftware);
router.get('/installations/:assetId', checkPermission('assets', 'read'), validatePagination, ctrl.getInstallations);

// ─── Software by ID ────────────────────────────────────────
router.get('/:id', checkPermission('assets', 'read'), validateUUID, ctrl.getSoftware);
router.patch('/:id', checkPermission('assets', 'update'), validateUUID, auditLog('Software'), ctrl.updateSoftware);
router.delete('/:id', checkPermission('assets', 'delete'), validateUUID, auditLog('Software'), ctrl.deleteSoftware);

// ─── Versions ──────────────────────────────────────────────
router.post('/:id/versions', checkPermission('assets', 'create'), validateUUID, auditLog('SoftwareVersion'), ctrl.addVersion);
router.delete('/:id/versions/:versionId', checkPermission('assets', 'delete'), validateUUID, auditLog('SoftwareVersion'), ctrl.deleteVersion);

// ─── Licenses ──────────────────────────────────────────────
router.get('/:id/licenses', checkPermission('assets', 'read'), validateUUID, validatePagination, ctrl.listLicenses);
router.post('/:id/licenses', checkPermission('assets', 'create'), validateUUID, auditLog('SoftwareLicense'), ctrl.createLicense);
router.patch('/:id/licenses/:licenseId', checkPermission('assets', 'update'), validateUUID, auditLog('SoftwareLicense'), ctrl.updateLicense);
router.delete('/:id/licenses/:licenseId', checkPermission('assets', 'delete'), validateUUID, auditLog('SoftwareLicense'), ctrl.deleteLicense);

module.exports = router;
