// ===============================================================
// LinkedEye ITSM — Audit Log Controller
// Read-only API for querying audit logs and detecting anomalies.
// ===============================================================

const { getAuditLogs, getResourceTypes, detectAnomalies } = require('../services/auditService');
const { success, error } = require('../utils/helpers');

// GET /api/v1/audit/logs
async function listAuditLogs(req, res, next) {
  try {
    const {
      page = 1,
      pageSize = 50,
      action,
      resourceType,
      userId,
      severity,
      status,
      startDate,
      endDate,
      search,
    } = req.query;

    const organizationId = req.tenantWhere?.organizationId || req.organizationId;

    const result = await getAuditLogs({
      organizationId,
      userId,
      action,
      resourceType,
      severity,
      status,
      startDate,
      endDate,
      search,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10) || 50,
    });

    return success(res, result.logs, 200, result.pagination);
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/audit/resource-types
async function listResourceTypes(req, res, next) {
  try {
    const organizationId = req.tenantWhere?.organizationId || req.organizationId;
    const types = await getResourceTypes(organizationId);
    return success(res, types);
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/audit/anomalies
async function listAnomalies(req, res, next) {
  try {
    const organizationId = req.tenantWhere?.organizationId || req.organizationId;
    const alerts = await detectAnomalies(organizationId);
    return success(res, { alerts, count: alerts.length });
  } catch (err) {
    next(err);
  }
}

module.exports = { listAuditLogs, listResourceTypes, listAnomalies };
