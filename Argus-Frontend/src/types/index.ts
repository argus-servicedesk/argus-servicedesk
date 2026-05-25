// Argus Service Desk — TypeScript Type Definitions
// Matches Prisma schema. All date fields are ISO 8601 strings from API.

// ── Enums ──
export type Role = 'ADMIN' | 'MANAGER' | 'ENGINEER' | 'OPERATOR' | 'CLIENT' | 'VIEWER';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'LOCKED';
export type TeamMemberRole = 'LEAD' | 'MEMBER' | 'OBSERVER';

export type IncidentState = 'NEW' | 'IN_PROGRESS' | 'ON_HOLD' | 'ESCALATED' | 'RESOLVED' | 'CLOSED' | 'CANCELLED';
export type Impact = 'ENTERPRISE' | 'DEPARTMENT' | 'TEAM' | 'INDIVIDUAL';
export type Urgency = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type Priority = 'P1' | 'P2' | 'P3' | 'P4';
export type IncidentSource = 'MANUAL' | 'PROMETHEUS' | 'GRAFANA' | 'API' | 'EMAIL' | 'VOICE' | 'SLACK';

export type ChangeType = 'NORMAL' | 'STANDARD' | 'EMERGENCY';
export type ChangeState = 'NEW' | 'ASSESSMENT' | 'APPROVAL' | 'SCHEDULED' | 'IMPLEMENTING' | 'REVIEW' | 'CLOSED' | 'CANCELLED';
export type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type ClosureCode = 'SUCCESSFUL' | 'FAILED' | 'PARTIAL';

export type ProblemState = 'NEW' | 'INVESTIGATION' | 'RCA_IN_PROGRESS' | 'KNOWN_ERROR' | 'RESOLVED' | 'CLOSED';
export type ApprovalState = 'PENDING' | 'APPROVED' | 'REJECTED';

export type CIType = 'SERVER' | 'KUBERNETES_CLUSTER' | 'DATABASE' | 'APPLICATION' | 'NETWORK' | 'NETWORK_DEVICE' | 'SWITCH' | 'ROUTER' | 'FIREWALL' | 'STORAGE' | 'CONTAINER' | 'VM' | 'LOAD_BALANCER' | 'SOFTWARE' | 'END_USER_DEVICE' | 'MONITOR' | 'PERIPHERAL' | 'SIMCARD' | 'PHONE' | 'PRINTER' | 'RACK_UNIT' | 'PDU' | 'ENCLOSURE' | 'CABLE' | 'UPS';
export type CIStatus = 'LIVE' | 'MAINTENANCE' | 'DECOMMISSIONED' | 'PLANNED' | 'IN_STOCK' | 'RESERVED' | 'DISPOSED';

export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO';
export type AlertStatus = 'FIRING' | 'RESOLVED' | 'ACKNOWLEDGED' | 'SILENCED';
export type AlertSource = 'PROMETHEUS' | 'GRAFANA' | 'CUSTOM';
export type WorkNoteSource = 'MANUAL' | 'AI' | 'SYSTEM' | 'SLACK';
export type NotificationType = 'INCIDENT' | 'CHANGE' | 'PROBLEM' | 'ALERT' | 'SLA' | 'SYSTEM';
export type NotificationChannel = 'WEB' | 'EMAIL' | 'SMS' | 'SLACK' | 'VOICE';
export type IntegrationType = 'SLACK' | 'SERVICENOW' | 'PROMETHEUS' | 'GRAFANA' | 'LOKI' | 'EMAIL' | 'TWILIO' | 'MSG91' | 'KALEYRA' | 'WEBHOOK' | 'N8N';
export type IntegrationStatus = 'ACTIVE' | 'INACTIVE' | 'ERROR';
export type LinkType = 'CAUSED_BY' | 'RESOLVED_BY' | 'RELATED';
export type ProblemLinkType = 'CAUSED_BY' | 'RELATED' | 'SYMPTOM_OF';

// ── Core Interfaces ──

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatar: string | null;
  roles: string[];
  roleNames?: string[];
  permissionCodes?: string[];
  permission_codes?: string[];
  permissions?: string[];
  status: UserStatus;
  organizationId: string | null;
  organization?: { id: string; name: string; slug: string } | null;
  department: string | null;
  jobTitle: string | null;
  timezone: string;
  mfaEnabled: boolean;
  skills: string[];
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  name: string;
  description: string | null;
  email: string | null;
  slackChannel: string | null;
  managerId: string | null;
  isActive: boolean;
  manager?: User | null;
  members?: TeamMember[];
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: TeamMemberRole;
  joinedAt: string;
  user?: User;
  team?: Team;
}

export interface Incident {
  id: string;
  number: string;
  shortDescription: string;
  description: string | null;
  state: IncidentState;
  impact: Impact;
  urgency: Urgency;
  priority: Priority;
  category: string | null;
  subcategory: string | null;
  assignedToId: string | null;
  assignmentGroupId: string | null;
  createdById: string;
  configItemId: string | null;
  parentId?: string | null;
  slaBreached: boolean;
  responseTime: string | null;
  resolutionTime: string | null;
  slaTargetResponse: string | null;
  slaTargetResolution: string | null;
  source: IncidentSource;
  sourceAlertId: string | null;
  sourceAlertName: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  holdReason: string | null;
  resolutionCode: string | null;
  resolutionNotes: string | null;
  createdAt: string;
  updatedAt: string;
  assignedTo?: User | null;
  assignmentGroup?: Team | null;
  createdBy?: User;
  configItem?: ConfigurationItem | null;
  parent?: Incident | null;
  childIncidents?: Incident[];
  childStatusSummary?: {
    total: number;
    new: number;
    inProgress: number;
    onHold: number;
    escalated: number;
    resolved: number;
    closed: number;
    cancelled: number;
    completionPercentage: number;
  } | null;
  hierarchyLevel?: number;
  rootParent?: Incident | null;
  workNotes?: WorkNote[];
  relatedAlerts?: Alert[];
  attachments?: Attachment[];
  activities?: Activity[];
  linkedChanges?: IncidentChange[];
  linkedProblems?: IncidentProblem[];
  availableTransitions?: IncidentState[];
  isAssignedToMe?: boolean;
  canEdit?: boolean;
}

export interface Change {
  id: string;
  number: string;
  shortDescription: string;
  description: string | null;
  type: ChangeType;
  state: ChangeState;
  riskLevel: RiskLevel;
  category: string | null;
  assignedToId: string | null;
  assignmentGroupId: string | null;
  createdById: string;
  justification: string | null;
  implementationPlan: string | null;
  rollbackPlan: string | null;
  testPlan: string | null;
  communicationPlan: string | null;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  affectedServices: string | null;
  downtime: number | null;
  userImpact: string | null;
  gitRepoUrl: string | null;
  gitBranch: string | null;
  gitCommitHash: string | null;
  pullRequestUrl: string | null;
  reviewNotes: string | null;
  closureCode: ClosureCode | null;
  createdAt: string;
  updatedAt: string;
  assignedTo?: User | null;
  assignmentGroup?: Team | null;
  createdBy?: User;
  approvals?: Approval[];
  affectedCIs?: ChangeCI[];
  workNotes?: WorkNote[];
  attachments?: Attachment[];
  activities?: Activity[];
  linkedIncidents?: IncidentChange[];
  availableTransitions?: ChangeState[];
  requiredFieldsForState?: Record<string, string[]>;
  isAssignedToMe?: boolean;
  canEdit?: boolean;
}

export interface Problem {
  id: string;
  number: string;
  shortDescription: string;
  description: string | null;
  state: ProblemState;
  priority: Priority;
  category: string | null;
  assignedToId: string | null;
  assignmentGroupId: string | null;
  createdById: string;
  rootCause: string | null;
  rootCauseAnalysis: any;
  workaround: string | null;
  workaroundEffective: boolean;
  permanentFix: string | null;
  fixImplemented: boolean;
  relatedChangeId: string | null;
  isKnownError: boolean;
  knownErrorId: string | null;
  createdAt: string;
  updatedAt: string;
  assignedTo?: User | null;
  assignmentGroup?: Team | null;
  createdBy?: User;
  workNotes?: WorkNote[];
  attachments?: Attachment[];
  activities?: Activity[];
  linkedIncidents?: IncidentProblem[];
  availableTransitions?: ProblemState[];
  isAssignedToMe?: boolean;
  canEdit?: boolean;
}

export interface Approval {
  id: string;
  changeId: string;
  approverId: string;
  state: ApprovalState;
  comments: string | null;
  approvedAt: string | null;
  approver?: User;
}

export interface ConfigurationItem {
  id: string;
  name: string;
  type: CIType;
  status: CIStatus;
  category: string | null;
  subcategory: string | null;
  description: string | null;
  serialNumber: string | null;
  assetTag: string | null;
  manufacturer: string | null;
  model: string | null;
  version: string | null;
  location: string | null;
  rackPosition: string | null;
  dataCenter: string | null;
  ipAddress: string | null;
  macAddress: string | null;
  hostname: string | null;
  fqdn: string | null;
  cpu: string | null;
  memory: string | null;
  storage: string | null;
  os: string | null;
  osVersion: string | null;
  serviceName: string | null;
  managementIpAddress: string | null;
  environment: string | null;
  ownerId: string | null;
  supportGroupId: string | null;
  vendor: string | null;
  purchaseDate: string | null;
  warrantyExpiry: string | null;
  endOfLife: string | null;
  endOfSupport: string | null;
  purchaseCost: number | null;
  monthlyCost: number | null;
  costCenter: string | null;
  monitoringEnabled: boolean;
  prometheusJob: string | null;
  grafanaDashboard: string | null;
  lokiLabels: string | null;
  healthScore: number | null;
  lastSeenAt: string | null;
  externalId: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  owner?: User | null;
  supportGroup?: Team | null;
  site?: { id: string; name: string; environment: string } | null;
}

export interface Alert {
  id: string;
  alertId: string;
  name: string;
  severity: AlertSeverity;
  status: AlertStatus;
  source: AlertSource;
  description: string | null;
  metric: string | null;
  currentValue: string | null;
  threshold: string | null;
  labels: string | null;
  annotations: string | null;
  configItemId: string | null;
  incidentId: string | null;
  firedAt: string;
  resolvedAt: string | null;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  silenceUntil: string | null;
  configItem?: ConfigurationItem | null;
  incident?: Incident | null;
}

export interface WorkNote {
  id: string;
  content: string;
  isInternal: boolean;
  authorId: string;
  source: WorkNoteSource;
  incidentId: string | null;
  changeId: string | null;
  problemId: string | null;
  createdAt: string;
  author?: User;
}

export interface Activity {
  id: string;
  action: string;
  description: string | null;
  oldValue: string | null;
  newValue: string | null;
  userId: string | null;
  incidentId: string | null;
  changeId: string | null;
  problemId: string | null;
  configItemId: string | null;
  createdAt: string;
  user?: User | null;
}

export interface Attachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  incidentId: string | null;
  changeId: string | null;
  problemId: string | null;
  uploadedById: string;
  createdAt: string;
  uploadedBy?: User;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  readAt: string | null;
  channel: NotificationChannel;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldData: any;
  newData: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user?: User | null;
}

export interface SLADefinition {
  id: string;
  name: string;
  priority: Priority;
  responseTimeMinutes: number;
  resolutionTimeMinutes: number;
  businessHoursOnly: boolean;
  isActive: boolean;
}

export interface Integration {
  id: string;
  name: string;
  type: IntegrationType;
  status: IntegrationStatus;
  config: string | null;
  lastSyncAt: string | null;
  syncStatus: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Linking Tables ──
export interface IncidentChange {
  id: string;
  incidentId: string;
  changeId: string;
  linkType: LinkType;
  notes: string | null;
  incident?: Incident;
  change?: Change;
}

export interface IncidentProblem {
  id: string;
  incidentId: string;
  problemId: string;
  linkType: ProblemLinkType;
  notes: string | null;
  incident?: Incident;
  problem?: Problem;
}

export interface ChangeCI {
  id: string;
  changeId: string;
  configItemId: string;
  impactType: string | null;
  change?: Change;
  configItem?: ConfigurationItem;
}

// ── API Response ──
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface APIResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  pagination?: PaginationMeta;
}

// ── Dashboard ──
export interface DashboardData {
  incidents: {
    total: number;
    open: number;
    p1Count: number;
    p2Count: number;
    mttr: number;
    mtta: number;
    slaCompliancePercent: number;
    byState: Record<string, number>;
    byPriority: Record<string, number>;
    trend24h: Array<{ hour: string; count: number }>;
  };
  changes: {
    total: number;
    pending: number;
    implementing: number;
    successRate: number;
  };
  problems: {
    total: number;
    open: number;
    knownErrors: number;
  };
  alerts: {
    firing: number;
    resolved24h: number;
    critical: number;
    warning: number;
  };
  assets: {
    total: number;
    live: number;
    maintenance: number;
    monitoringEnabled: number;
  };
  recentIncidents: Incident[];
  recentChanges: Change[];
  activeAlerts: Alert[];
}

// ── Search ──
export interface SearchResult {
  type: string;
  id: string;
  number?: string;
  title: string;
  score: number;
  highlight?: string;
}

// ── SMS & Voice ──
export type SMSProvider = 'TWILIO' | 'MSG91' | 'KALEYRA';
export type SMSDirection = 'OUTBOUND' | 'INBOUND';
export type VoiceDirection = 'INBOUND' | 'OUTBOUND';
export type VoiceHandler = 'AI_BOT' | 'HUMAN' | 'IVR';

export interface SMSLog {
  id: string;
  recipient: string;
  message: string;
  templateId: string | null;
  provider: SMSProvider;
  status: string;
  messageId: string | null;
  cost: number | null;
  latency: number | null;
  direction: SMSDirection;
  incidentId: string | null;
  createdAt: string;
  incident?: { id: string; number: string; shortDescription: string } | null;
}

export interface SMSStats {
  total: number;
  sent: number;
  failed: number;
  inbound: number;
  successRate: string;
  byProvider: Array<{ provider: SMSProvider; count: number }>;
}

export interface SMSProviderStatus {
  name: SMSProvider;
  healthy: boolean;
  message: string;
}

export interface VoiceCallLog {
  id: string;
  callSid: string | null;
  direction: VoiceDirection;
  callerNumber: string | null;
  callerName: string | null;
  handler: VoiceHandler;
  duration: number | null;
  status: string | null;
  recordingUrl: string | null;
  transcript: string | null;
  sentiment: string | null;
  language: string | null;
  linkedIncidentId: string | null;
  createdAt: string;
}

export interface VoiceStats {
  total: number;
  inbound: number;
  outbound: number;
  aiHandled: number;
  averageDurationSeconds: number;
}

export interface VoiceLanguage {
  code: string;
  name: string;
}

// ── Input types ──
export interface CreateIncidentInput {
  shortDescription: string;
  description?: string;
  impact: Impact;
  urgency: Urgency;
  category?: string;
  subcategory?: string;
  assignmentGroupId?: string;
  assignedToId?: string;
  configItemId?: string;
  source?: IncidentSource;
}

export interface UpdateIncidentInput {
  shortDescription?: string;
  description?: string;
  state?: IncidentState;
  impact?: Impact;
  urgency?: Urgency;
  priority?: Priority;
  category?: string;
  assignedToId?: string | null;
  assignmentGroupId?: string | null;
  resolutionCode?: string;
  resolutionNotes?: string;
}

export interface IncidentFilters {
  state?: IncidentState | IncidentState[];
  priority?: Priority | Priority[];
  category?: string;
  assignedToId?: string;
  assignmentGroupId?: string;
  slaBreached?: boolean;
  source?: IncidentSource;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ── Service Catalog & Requests ──

export type ServiceRequestState = 'NEW' | 'APPROVAL' | 'APPROVED' | 'FULFILLMENT' | 'FULFILLED' | 'CLOSED' | 'CANCELLED';
export type RequestItemState = 'PENDING' | 'APPROVED' | 'IN_PROGRESS' | 'FULFILLED' | 'CLOSED' | 'CANCELLED';
export type CatalogItemType = 'HARDWARE' | 'SOFTWARE' | 'ACCESS' | 'GENERAL' | 'SERVICE';
export type KBArticleState = 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED';

export interface ServiceCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
  catalogItems?: CatalogItem[];
  _count?: { catalogItems: number };
  createdAt: string;
  updatedAt: string;
}

export interface CatalogItem {
  id: string;
  name: string;
  shortDescription: string;
  description: string | null;
  categoryId: string;
  type: CatalogItemType;
  icon: string | null;
  price: number | null;
  currency: string;
  approvalRequired: boolean;
  fulfillmentGroupId: string | null;
  estimatedDays: number | null;
  formSchema: Record<string, unknown> | null;
  isActive: boolean;
  category?: ServiceCategory;
  fulfillmentGroup?: { id: string; name: string } | null;
  _count?: { requestItems: number };
  createdAt: string;
  updatedAt: string;
}

export interface ServiceRequest {
  id: string;
  number: string;
  shortDescription: string;
  description: string | null;
  state: ServiceRequestState;
  priority: Priority;
  requestedById: string;
  assignedToId: string | null;
  assignmentGroupId: string | null;
  approvedById: string | null;
  approvedAt: string | null;
  fulfilledAt: string | null;
  closedAt: string | null;
  cancelReason: string | null;
  requestedBy?: User;
  assignedTo?: User | null;
  assignmentGroup?: { id: string; name: string } | null;
  approvedBy?: User | null;
  requestItems?: RequestItem[];
  activities?: Activity[];
  createdAt: string;
  updatedAt: string;
}

export interface RequestItem {
  id: string;
  serviceRequestId: string;
  catalogItemId: string;
  state: RequestItemState;
  quantity: number;
  formData: Record<string, unknown> | null;
  notes: string | null;
  catalogItem?: CatalogItem;
  createdAt: string;
  updatedAt: string;
}

export interface KBCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  parentId: string | null;
  isActive: boolean;
  children?: KBCategory[];
  _count?: { articles: number };
  createdAt: string;
  updatedAt: string;
}

export interface KBArticle {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  state: KBArticleState;
  categoryId: string | null;
  authorId: string;
  reviewerId: string | null;
  tags: string[];
  viewCount: number;
  publishedAt: string | null;
  author?: User;
  reviewer?: User | null;
  category?: KBCategory | null;
  feedback?: KBFeedback[];
  _count?: { feedback: number };
  createdAt: string;
  updatedAt: string;
}

export interface KBFeedback {
  id: string;
  articleId: string;
  userId: string;
  helpful: boolean;
  comment: string | null;
  user?: User;
  createdAt: string;
}

// Learning Hub / KT
export type LearningModuleType = 'ARTICLE' | 'SOP' | 'VIDEO' | 'TASK' | 'LINK';
export type LearningAudienceRole = 'NOC' | 'INFRA' | 'DEVOPS' | 'SOFTWARE' | 'SERVICE_DESK' | 'GENERAL';
export type LearningEnrollmentStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';

export interface LearningModule {
  id: string;
  order: number;
  title: string;
  module_type?: LearningModuleType;
  moduleType?: LearningModuleType;
  content: string;
  external_url?: string;
  externalUrl?: string;
  estimated_minutes?: number;
  estimatedMinutes?: number;
  is_required?: boolean;
  isRequired?: boolean;
  isCompleted?: boolean;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface LearningTrack {
  id: string;
  title: string;
  audience_role?: LearningAudienceRole;
  audienceRole?: LearningAudienceRole;
  description: string;
  team?: Team | null;
  owner?: User | null;
  is_active?: boolean;
  isActive?: boolean;
  modules?: LearningModule[];
  moduleCount?: number;
  enrollmentCount?: number;
  createdBy?: User | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface LearningEnrollment {
  id: string;
  track: LearningTrack;
  user?: User;
  assignedBy?: User | null;
  mentor?: User | null;
  due_date?: string | null;
  dueDate?: string | null;
  status: LearningEnrollmentStatus;
  completed_at?: string | null;
  completedAt?: string | null;
  isOverdue?: boolean;
  progressPercent: number;
  completedModules: number;
  totalModules: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface LearningSummary {
  total: number;
  assigned: number;
  inProgress: number;
  completed: number;
  overdue: number;
  dueSoon: number;
  averageProgress: number;
}
