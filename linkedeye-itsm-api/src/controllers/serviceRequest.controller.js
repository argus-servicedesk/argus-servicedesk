// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — Service Request Controller
// ═══════════════════════════════════════════════════════════

const { prisma } = require('../config/database');
const { emitToAll } = require('../config/socket');
const { paginate, paginationMeta, success, error, generateServiceRequestNumber } = require('../utils/helpers');
const { SERVICE_REQUEST_TRANSITIONS } = require('../config/constants');
const { getCreateOrgId } = require('../middleware/tenant');
const logger = require('../utils/logger');

// ── Include shapes ─────────────────────────────────────

const SR_INCLUDE_LIST = {
  requestedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
  assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
  assignmentGroup: { select: { id: true, name: true } },
  requestItems: {
    include: {
      catalogItem: { select: { id: true, name: true, shortDescription: true, type: true, icon: true } },
    },
  },
};

const SR_INCLUDE_DETAIL = {
  ...SR_INCLUDE_LIST,
  approvedBy: { select: { id: true, firstName: true, lastName: true } },
  activities: {
    include: { user: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  },
};

// ── List ───────────────────────────────────────────────

async function listServiceRequests(req, res, next) {
  try {
    const { state, priority, requestedById, assignedToId, search, dateFrom, dateTo, sortBy, sortOrder } = req.query;
    const { skip, take, page, limit } = paginate(req.query.page, req.query.limit);

    const where = { ...req.tenantWhere };
    if (state) where.state = state;
    if (priority) where.priority = priority;
    if (requestedById) where.requestedById = requestedById;
    if (assignedToId) where.assignedToId = assignedToId;
    if (search) {
      where.OR = [
        { shortDescription: { contains: search, mode: 'insensitive' } },
        { number: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const orderBy = sortBy ? { [sortBy]: sortOrder || 'desc' } : { createdAt: 'desc' };

    const [requests, total] = await prisma.$transaction([
      prisma.serviceRequest.findMany({ where, include: SR_INCLUDE_LIST, orderBy, skip, take }),
      prisma.serviceRequest.count({ where }),
    ]);

    return success(res, requests, 200, paginationMeta(total, page, limit));
  } catch (err) { next(err); }
}

// ── My Requests ────────────────────────────────────────

async function myServiceRequests(req, res, next) {
  try {
    const { skip, take, page, limit } = paginate(req.query.page, req.query.limit);

    const where = { requestedById: req.user.id };
    if (req.query.state) where.state = req.query.state;

    const [requests, total] = await prisma.$transaction([
      prisma.serviceRequest.findMany({ where, include: SR_INCLUDE_LIST, orderBy: { createdAt: 'desc' }, skip, take }),
      prisma.serviceRequest.count({ where }),
    ]);

    return success(res, requests, 200, paginationMeta(total, page, limit));
  } catch (err) { next(err); }
}

// ── Get ────────────────────────────────────────────────

async function getServiceRequest(req, res, next) {
  try {
    const sr = await prisma.serviceRequest.findUnique({
      where: { id: req.params.id },
      include: SR_INCLUDE_DETAIL,
    });
    if (!sr) return error(res, 'Service request not found', 404);
    if (req.tenantWhere.organizationId && sr.organizationId !== req.tenantWhere.organizationId) {
      return error(res, 'Service request not found', 404);
    }
    return success(res, sr);
  } catch (err) { next(err); }
}

// ── Create ─────────────────────────────────────────────

async function createServiceRequest(req, res, next) {
  try {
    const { shortDescription, description, priority, items } = req.body;
    const number = await generateServiceRequestNumber();
    const orgId = getCreateOrgId(req);

    // Check if any item requires approval
    const catalogItemIds = items.map(i => i.catalogItemId);
    const catalogItems = await prisma.catalogItem.findMany({
      where: { id: { in: catalogItemIds } },
      select: { id: true, approvalRequired: true, fulfillmentGroupId: true },
    });

    const needsApproval = catalogItems.some(ci => ci.approvalRequired);
    const initialState = needsApproval ? 'NEW' : 'APPROVED';

    // Get fulfillment group from first item that has one
    const fulfillmentItem = catalogItems.find(ci => ci.fulfillmentGroupId);

    const sr = await prisma.serviceRequest.create({
      data: {
        number,
        shortDescription,
        description: description || null,
        state: initialState,
        priority: priority || 'P3',
        requestedById: req.user.id,
        assignmentGroupId: fulfillmentItem?.fulfillmentGroupId || null,
        organizationId: orgId,
        requestItems: {
          create: items.map(item => ({
            catalogItemId: item.catalogItemId,
            quantity: item.quantity || 1,
            formData: item.formData || null,
            notes: item.notes || null,
          })),
        },
      },
      include: SR_INCLUDE_LIST,
    });

    // Activity log
    await prisma.activity.create({
      data: {
        action: 'CREATED',
        description: `Service request ${number} created`,
        userId: req.user.id,
        serviceRequestId: sr.id,
      },
    });

    emitToAll('serviceRequest:created', { id: sr.id, number: sr.number, state: sr.state });
    logger.info(`Service request created: ${sr.number} by ${req.user.email}`);
    return success(res, sr, 201);
  } catch (err) { next(err); }
}

// ── Update ─────────────────────────────────────────────

async function updateServiceRequest(req, res, next) {
  try {
    const existing = await prisma.serviceRequest.findUnique({ where: { id: req.params.id } });
    if (!existing) return error(res, 'Service request not found', 404);
    if (req.tenantWhere.organizationId && existing.organizationId !== req.tenantWhere.organizationId) {
      return error(res, 'Service request not found', 404);
    }

    // State transition validation
    if (req.body.state && req.body.state !== existing.state) {
      const allowed = SERVICE_REQUEST_TRANSITIONS[existing.state] || [];
      if (!allowed.includes(req.body.state)) {
        return error(res, `Cannot transition from ${existing.state} to ${req.body.state}`, 400);
      }
    }

    const data = {};
    const { state, assignedToId, assignmentGroupId, cancelReason } = req.body;
    if (state !== undefined) data.state = state;
    if (assignedToId !== undefined) data.assignedToId = assignedToId;
    if (assignmentGroupId !== undefined) data.assignmentGroupId = assignmentGroupId;
    if (cancelReason !== undefined) data.cancelReason = cancelReason;

    // Timestamp management
    if (data.state === 'FULFILLED') data.fulfilledAt = new Date();
    if (data.state === 'CLOSED') data.closedAt = new Date();

    const sr = await prisma.serviceRequest.update({
      where: { id: req.params.id }, data, include: SR_INCLUDE_LIST,
    });

    if (req.body.state && req.body.state !== existing.state) {
      await prisma.activity.create({
        data: {
          action: 'STATE_CHANGED',
          description: `State: ${existing.state} → ${req.body.state}`,
          oldValue: existing.state,
          newValue: req.body.state,
          userId: req.user.id,
          serviceRequestId: sr.id,
        },
      });
    }

    emitToAll('serviceRequest:updated', { id: sr.id, number: sr.number, state: sr.state });
    return success(res, sr);
  } catch (err) { next(err); }
}

// ── Approve ────────────────────────────────────────────

async function approveServiceRequest(req, res, next) {
  try {
    const existing = await prisma.serviceRequest.findUnique({
      where: { id: req.params.id },
      include: { requestItems: true },
    });
    if (!existing) return error(res, 'Service request not found', 404);
    if (!['NEW', 'APPROVAL'].includes(existing.state)) {
      return error(res, `Cannot approve request in state ${existing.state}`, 400);
    }

    // Approve all pending items
    await prisma.requestItem.updateMany({
      where: { serviceRequestId: req.params.id, state: 'PENDING' },
      data: { state: 'APPROVED' },
    });

    const sr = await prisma.serviceRequest.update({
      where: { id: req.params.id },
      data: {
        state: 'APPROVED',
        approvedById: req.user.id,
        approvedAt: new Date(),
      },
      include: SR_INCLUDE_LIST,
    });

    await prisma.activity.create({
      data: {
        action: 'APPROVED',
        description: `Request approved by ${req.user.firstName} ${req.user.lastName}`,
        userId: req.user.id,
        serviceRequestId: sr.id,
      },
    });

    emitToAll('serviceRequest:approved', { id: sr.id, number: sr.number });
    logger.info(`Service request approved: ${sr.number} by ${req.user.email}`);
    return success(res, sr);
  } catch (err) { next(err); }
}

// ── Reject ─────────────────────────────────────────────

async function rejectServiceRequest(req, res, next) {
  try {
    const existing = await prisma.serviceRequest.findUnique({ where: { id: req.params.id } });
    if (!existing) return error(res, 'Service request not found', 404);
    if (!['NEW', 'APPROVAL'].includes(existing.state)) {
      return error(res, `Cannot reject request in state ${existing.state}`, 400);
    }

    // Cancel all pending items
    await prisma.requestItem.updateMany({
      where: { serviceRequestId: req.params.id, state: 'PENDING' },
      data: { state: 'CANCELLED' },
    });

    const sr = await prisma.serviceRequest.update({
      where: { id: req.params.id },
      data: {
        state: 'CANCELLED',
        cancelReason: req.body.reason || 'Rejected',
      },
      include: SR_INCLUDE_LIST,
    });

    await prisma.activity.create({
      data: {
        action: 'REJECTED',
        description: `Request rejected by ${req.user.firstName} ${req.user.lastName}: ${req.body.reason || 'No reason provided'}`,
        userId: req.user.id,
        serviceRequestId: sr.id,
      },
    });

    emitToAll('serviceRequest:rejected', { id: sr.id, number: sr.number });
    return success(res, sr);
  } catch (err) { next(err); }
}

module.exports = {
  listServiceRequests, getServiceRequest, createServiceRequest,
  updateServiceRequest, myServiceRequests,
  approveServiceRequest, rejectServiceRequest,
};
