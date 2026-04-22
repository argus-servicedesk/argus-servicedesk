// ===============================================================
// LinkedEye ITSM — Audit Trail Middleware
// Intercepts responses to log create/update/delete operations
// via the auditService for persistent, org-scoped audit logs.
// ===============================================================

const { logAudit } = require('../services/auditService');

/**
 * Express middleware that intercepts res.json() to fire-and-forget
 * an audit log entry for mutating requests (POST, PUT, PATCH, DELETE).
 *
 * Usage in routes:
 *   router.post('/', auditLog('Incident'), ctrl.createIncident);
 *
 * @param {string} resourceType - The entity type, e.g. "Incident", "Change"
 */
function auditLog(resourceType) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = (body) => {
      // Only audit mutating operations
      if (req.method !== 'GET' && req.method !== 'OPTIONS' && req.method !== 'HEAD') {
        const resourceId = req.params.id || body?.data?.id || '';
        const isSuccess = res.statusCode < 400;
        const method = req.method;

        // Map HTTP method to a readable action
        let actionVerb = 'accessed';
        if (method === 'POST') actionVerb = 'created';
        else if (method === 'PUT' || method === 'PATCH') actionVerb = 'updated';
        else if (method === 'DELETE') actionVerb = 'deleted';

        const action = `${resourceType.toLowerCase()}.${actionVerb}`;

        // Determine severity based on action type
        let severity = 'INFO';
        if (method === 'DELETE') severity = 'WARNING';
        if (!isSuccess) severity = 'WARNING';

        // Build before/after data
        const after = method === 'DELETE' ? null : (req.body || null);

        // Fire-and-forget — never block the response
        logAudit({
          organizationId: req.organizationId || req.tenantWhere?.organizationId || null,
          userId: req.user?.id || null,
          action,
          resourceType,
          resourceId: String(resourceId),
          before: null,
          after,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          severity,
          status: isSuccess ? 'SUCCESS' : 'FAILURE',
        }).catch(() => {});
      }

      return originalJson(body);
    };

    next();
  };
}

module.exports = { auditLog };
