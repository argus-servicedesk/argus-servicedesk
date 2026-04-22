// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — Constants & Lookup Tables
// ═══════════════════════════════════════════════════════════

const INCIDENT_STATES = ['NEW', 'IN_PROGRESS', 'ON_HOLD', 'ESCALATED', 'RESOLVED', 'CLOSED', 'CANCELLED'];
const CHANGE_STATES = ['NEW', 'ASSESSMENT', 'APPROVAL', 'SCHEDULED', 'IMPLEMENTING', 'REVIEW', 'CLOSED', 'CANCELLED'];
const PROBLEM_STATES = ['NEW', 'INVESTIGATION', 'RCA_IN_PROGRESS', 'KNOWN_ERROR', 'RESOLVED', 'CLOSED'];

const PRIORITIES = ['P1', 'P2', 'P3', 'P4'];
const IMPACTS = ['ENTERPRISE', 'DEPARTMENT', 'TEAM', 'INDIVIDUAL'];
const URGENCIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

// Impact × Urgency → Priority
const PRIORITY_MATRIX = {
  ENTERPRISE: { CRITICAL: 'P1', HIGH: 'P1', MEDIUM: 'P2', LOW: 'P3' },
  DEPARTMENT: { CRITICAL: 'P1', HIGH: 'P2', MEDIUM: 'P2', LOW: 'P3' },
  TEAM:       { CRITICAL: 'P2', HIGH: 'P2', MEDIUM: 'P3', LOW: 'P4' },
  INDIVIDUAL: { CRITICAL: 'P2', HIGH: 'P3', MEDIUM: 'P4', LOW: 'P4' },
};

// SLA Defaults (minutes)
const SLA_DEFAULTS = {
  P1: { response: 5, resolution: 60 },
  P2: { response: 15, resolution: 240 },
  P3: { response: 60, resolution: 1440 },
  P4: { response: 240, resolution: 4320 },
};

// Valid incident state transitions
const INCIDENT_TRANSITIONS = {
  NEW:         ['IN_PROGRESS', 'ON_HOLD', 'CANCELLED'],
  IN_PROGRESS: ['ON_HOLD', 'ESCALATED', 'RESOLVED'],
  ON_HOLD:     ['IN_PROGRESS'],
  ESCALATED:   ['IN_PROGRESS', 'RESOLVED'],
  RESOLVED:    ['CLOSED', 'IN_PROGRESS'],
  CLOSED:      [],
  CANCELLED:   [],
};

const CHANGE_TRANSITIONS = {
  NEW:           ['ASSESSMENT', 'CANCELLED'],
  ASSESSMENT:    ['APPROVAL', 'CANCELLED'],
  APPROVAL:      ['SCHEDULED', 'CANCELLED'],
  SCHEDULED:     ['IMPLEMENTING', 'CANCELLED'],
  IMPLEMENTING:  ['REVIEW', 'CANCELLED'],
  REVIEW:        ['CLOSED', 'CANCELLED'],
  CLOSED:        [],
  CANCELLED:     [],
};

const PROBLEM_TRANSITIONS = {
  NEW:              ['INVESTIGATION'],
  INVESTIGATION:    ['RCA_IN_PROGRESS', 'KNOWN_ERROR'],
  RCA_IN_PROGRESS:  ['KNOWN_ERROR', 'RESOLVED'],
  KNOWN_ERROR:      ['RESOLVED'],
  RESOLVED:         ['CLOSED'],
  CLOSED:           [],
};

const ROLES = ['ADMIN', 'MANAGER', 'ENGINEER', 'OPERATOR', 'VIEWER'];

const PERMISSIONS = {
  ADMIN:    { incidents: 'crud', changes: 'crud', problems: 'crud', assets: 'crud', alerts: 'crud', teams: 'crud', integrations: 'crud', users: 'crud', reports: 'read', catalog: 'crud', serviceRequests: 'crud', knowledgeBase: 'crud' },
  MANAGER:  { incidents: 'crud', changes: 'crud', problems: 'crud', assets: 'cru', alerts: 'cru', teams: 'cru', integrations: 'read', users: 'cru', reports: 'read', catalog: 'crud', serviceRequests: 'crud', knowledgeBase: 'crud' },
  ENGINEER: { incidents: 'cru', changes: 'cru', problems: 'cru', assets: 'cru', alerts: 'cru', teams: 'read', integrations: 'read', users: 'read', reports: 'read', catalog: 'read', serviceRequests: 'cru', knowledgeBase: 'cru' },
  OPERATOR: { incidents: 'cru', changes: 'read', problems: 'read', assets: 'read', alerts: 'cru', teams: 'read', integrations: 'read', users: 'read', reports: 'read', catalog: 'read', serviceRequests: 'cru', knowledgeBase: 'read' },
  VIEWER:   { incidents: 'read', changes: 'read', problems: 'read', assets: 'read', alerts: 'read', teams: 'read', integrations: 'read', users: 'read', reports: 'read', catalog: 'read', serviceRequests: 'cr', knowledgeBase: 'read' },
};

const ALLOWED_FILE_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv', 'text/x-log',
  'application/json', 'application/x-yaml',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const PAGINATION = { defaultPage: 1, defaultLimit: 25, maxLimit: 100 };

// ── Service Catalog & Requests ─────────────────────────

const SERVICE_REQUEST_STATES = ['NEW', 'APPROVAL', 'APPROVED', 'FULFILLMENT', 'FULFILLED', 'CLOSED', 'CANCELLED'];
const REQUEST_ITEM_STATES = ['PENDING', 'APPROVED', 'IN_PROGRESS', 'FULFILLED', 'CLOSED', 'CANCELLED'];
const CATALOG_ITEM_TYPES = ['HARDWARE', 'SOFTWARE', 'ACCESS', 'GENERAL', 'SERVICE'];

const SERVICE_REQUEST_TRANSITIONS = {
  NEW:         ['APPROVAL', 'APPROVED', 'CANCELLED'],
  APPROVAL:    ['APPROVED', 'CANCELLED'],
  APPROVED:    ['FULFILLMENT', 'CANCELLED'],
  FULFILLMENT: ['FULFILLED', 'CANCELLED'],
  FULFILLED:   ['CLOSED'],
  CLOSED:      [],
  CANCELLED:   [],
};

const REQUEST_ITEM_TRANSITIONS = {
  PENDING:     ['APPROVED', 'CANCELLED'],
  APPROVED:    ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['FULFILLED', 'CANCELLED'],
  FULFILLED:   ['CLOSED'],
  CLOSED:      [],
  CANCELLED:   [],
};

// ── Knowledge Base ─────────────────────────────────────

const KB_ARTICLE_STATES = ['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED'];

const KB_ARTICLE_TRANSITIONS = {
  DRAFT:     ['REVIEW', 'PUBLISHED'],
  REVIEW:    ['PUBLISHED', 'DRAFT'],
  PUBLISHED: ['ARCHIVED', 'DRAFT'],
  ARCHIVED:  ['DRAFT'],
};

module.exports = {
  INCIDENT_STATES, CHANGE_STATES, PROBLEM_STATES,
  PRIORITIES, IMPACTS, URGENCIES, PRIORITY_MATRIX, SLA_DEFAULTS,
  INCIDENT_TRANSITIONS, CHANGE_TRANSITIONS, PROBLEM_TRANSITIONS,
  ROLES, PERMISSIONS, ALLOWED_FILE_TYPES, MAX_FILE_SIZE, PAGINATION,
  SERVICE_REQUEST_STATES, REQUEST_ITEM_STATES, CATALOG_ITEM_TYPES,
  SERVICE_REQUEST_TRANSITIONS, REQUEST_ITEM_TRANSITIONS,
  KB_ARTICLE_STATES, KB_ARTICLE_TRANSITIONS,
};
