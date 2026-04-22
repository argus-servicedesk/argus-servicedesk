# Argus Service Desk — Database Schema Documentation

## Overview

Argus Service Desk uses **PostgreSQL 16** with **Prisma ORM**. The schema supports multi-tenant ITIL-aligned service management with 40+ tables organized into 8 domains.

| Domain | Tables | Description |
|--------|--------|-------------|
| Multi-Tenancy | 2 | Organization, Site |
| User Management | 4 | User, Session, Team, TeamMember |
| ITIL Core | 4 | Incident, Change, Problem, Approval |
| CMDB | 12 | ConfigurationItem, CIRelationship, NetworkConnection, Vendor, AssetFinancial, AssetAllocation, AssetDisposal, AssetMovement, IPAddressInventory, ComputerComponent, Software*, Consumable* |
| Alerting | 1 | Alert |
| SLA & Escalation | 4 | SLADefinition, EscalationPolicy, EscalationRule, OnCallSchedule, EscalationLog |
| Communication | 5 | WorkNote, Notification, EmailQueue, SMSLog, VoiceCallLog |
| Support | 7 | Activity, Attachment, AuditLog, Integration, IntegrationWebhook, SlackIntegration, ScheduledJob |
| Linking | 3 | IncidentChange, IncidentProblem, ChangeCI |
| Software | 4 | Software, SoftwareVersion, SoftwareInstallation, SoftwareLicense |
| MFA | 1 | UserMfa |

---

## Entity Relationship Diagram (ERD)

### Core ITIL Relationships

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  ORGANIZATION    │     │      USER        │     │      TEAM        │
├──────────────────┤     ├──────────────────┤     ├──────────────────┤
│ id          PK   │◄────│ organizationId FK│     │ organizationId FK│
│ name      UNIQUE │     │ id          PK   │◄────│ managerId     FK │
│ slug      UNIQUE │     │ email     UNIQUE │     │ id          PK   │
│ environment ENUM │     │ password         │     │ name             │
│ serverIp         │     │ firstName        │     │ description      │
│ fqdn             │     │ lastName         │     │ email            │
│ isActive    BOOL │     │ role        ENUM │     │ slackChannel     │
└──────────────────┘     │ status      ENUM │     │ isActive    BOOL │
        │                │ department       │     └──────────────────┘
        │ 1:N            │ skills     ARRAY │          │      ▲
        ▼                └──────────────────┘          │ 1:N  │ N:1
┌──────────────────┐          │  ▲  │                  ▼      │
│      SITE        │          │  │  │         ┌──────────────────┐
├──────────────────┤     ┌────┘  │  └────┐    │  TEAM_MEMBER     │
│ id          PK   │     │       │       │    ├──────────────────┤
│ organizationId FK│     │       │       │    │ teamId       FK  │
│ name             │     │       │       │    │ userId       FK  │
│ code             │     │       │       │    │ role        ENUM │
│ serverIp         │     │       │       │    │ UNIQUE(team,user)│
│ prometheusUrl    │     │       │       │    └──────────────────┘
│ grafanaUrl       │     │       │       │
└──────────────────┘     │       │       │
                         ▼       │       ▼
              ┌─────────────┐    │    ┌─────────────┐
              │  INCIDENT   │    │    │   CHANGE     │
              ├─────────────┤    │    ├─────────────┤
              │ id       PK │    │    │ id       PK │
              │ number UNIQ │    │    │ number UNIQ │
              │ shortDesc   │    │    │ shortDesc   │
              │ state  ENUM │    │    │ type   ENUM │
              │ impact ENUM │    │    │ state  ENUM │
              │ urgency ENUM│    │    │ riskLevel   │
              │ priority    │    │    │ assignedToId│
              │ assignedToId│    │    │ createdById │
              │ createdById │    │    │ plannedStart│
              │ configItemId│    │    │ plannedEnd  │
              │ slaBreached │    │    │ closureCode │
              │ orgId    FK │    │    │ orgId    FK │
              └─────────────┘    │    └─────────────┘
                   │    │        │         │    │
                   │    │        │         │    │
              ┌────┘    │        │    ┌────┘    │
              ▼         │        │    ▼         │
    ┌───────────────┐   │        │  ┌──────────┐│
    │INCIDENT_CHANGE│   │        │  │ APPROVAL ││
    ├───────────────┤   │        │  ├──────────┤│
    │ incidentId FK │   │        │  │ changeId ││
    │ changeId   FK │   │        │  │approverId││
    │ linkType ENUM │   │        │  │state ENUM││
    └───────────────┘   │        │  └──────────┘│
                        │        │              │
              ┌─────────┘        │    ┌─────────┘
              ▼                  │    ▼
    ┌───────────────┐            │  ┌──────────┐
    │INCIDENT_PROBLEM│           │  │ CHANGE_CI│
    ├───────────────┤            │  ├──────────┤
    │ incidentId FK │            │  │ changeId │
    │ problemId  FK │◄───┐       │  │configItem│
    │ linkType ENUM │    │       │  └──────────┘
    └───────────────┘    │       │
                         │       │
                    ┌────┴───────┴──┐
                    │   PROBLEM     │
                    ├───────────────┤
                    │ id       PK   │
                    │ number  UNIQ  │
                    │ shortDesc     │
                    │ state    ENUM │
                    │ priority ENUM │
                    │ rootCause     │
                    │ isKnownError  │
                    │ assignedToId  │
                    │ createdById   │
                    │ orgId      FK │
                    └───────────────┘
```

### CMDB & Asset Relationships

```
                    ┌──────────────────────────────────┐
                    │     CONFIGURATION_ITEM (CI)       │
                    ├──────────────────────────────────┤
                    │ id              PK                │
                    │ name                              │
                    │ type            ENUM (23 types)   │
                    │ status          ENUM (8 states)   │
                    │ serialNumber                      │
                    │ assetTag                          │
                    │ manufacturer                      │
                    │ ipAddress / hostname / fqdn       │
                    │ cpu / memory / storage / os       │
                    │ environment     ENUM              │
                    │ criticality     ENUM              │
                    │ ownerId         FK → User         │
                    │ supportGroupId  FK → Team         │
                    │ organizationId  FK                │
                    │ siteId          FK → Site         │
                    └──────────────────────────────────┘
                      │    │    │    │    │    │    │
          ┌───────────┘    │    │    │    │    │    └──────────┐
          ▼                ▼    │    │    │    ▼               ▼
  ┌──────────────┐  ┌──────────┐│   │    │ ┌──────────┐ ┌──────────┐
  │ASSET_FINANCIAL│  │CI_RELAT- ││   │    │ │  ALERT   │ │IP_ADDRESS│
  ├──────────────┤  │IONSHIP   ││   │    │ ├──────────┤ │INVENTORY │
  │ assetId UNIQ │  ├──────────┤│   │    │ │ configId │ ├──────────┤
  │ purchaseDate │  │ parentId ││   │    │ │ severity │ │ ipAddress│
  │ invoiceNo    │  │ childId  ││   │    │ │ status   │ │ assetId  │
  │ unitPrice    │  │ type ENUM││   │    │ │ source   │ │ status   │
  │ vendorId  FK │  └──────────┘│   │    │ │ firedAt  │ │ vlan     │
  │ warrantyExp  │              │   │    │ └──────────┘ └──────────┘
  │ amcStartDate │              │   │    │
  │ amcEndDate   │              │   │    └──────────────┐
  └──────────────┘              │   │                   ▼
                                │   │            ┌──────────────┐
          ┌─────────────────────┘   │            │  COMPUTER    │
          ▼                         ▼            │  COMPONENT   │
  ┌──────────────┐          ┌──────────────┐     ├──────────────┤
  │ASSET_ALLOCAT-│          │NETWORK_CONN- │     │ assetId   FK │
  │ION           │          │ECTION        │     │ componentType│
  ├──────────────┤          ├──────────────┤     │ manufacturer │
  │ assetId   FK │          │ sourceId  FK │     │ capacity     │
  │ assignedUser │          │ destId    FK │     │ serialNumber │
  │ allocDate    │          │ sourcePort   │     └──────────────┘
  │ returnDate   │          │ bandwidth    │
  │ status  ENUM │          │ vlan         │
  └──────────────┘          └──────────────┘

  ┌──────────────┐     ┌──────────────┐
  │ASSET_DISPOSAL│     │ASSET_MOVEMENT│
  ├──────────────┤     ├──────────────┤
  │ assetId UNIQ │     │ assetId   FK │
  │ disposalDate │     │ fromLocation │
  │ method  ENUM │     │ toLocation   │
  │ approvedBy   │     │ movementDate │
  │ disposalValue│     │ movedById FK │
  └──────────────┘     └──────────────┘
```

### Software & Licensing

```
  ┌──────────────┐     ┌──────────────────┐     ┌───────────────────┐
  │   SOFTWARE   │────▶│ SOFTWARE_VERSION  │────▶│ SOFTWARE_         │
  ├──────────────┤     ├──────────────────┤     │ INSTALLATION      │
  │ name         │     │ softwareId    FK │     ├───────────────────┤
  │ publisher    │     │ version          │     │ assetId        FK │
  │ category ENUM│     │ arch             │     │ versionId      FK │
  │ isOpenSource │     │ releaseDate      │     │ licenseId      FK │
  └──────┬───────┘     │ endOfSupport     │     │ installDate       │
         │             └──────────────────┘     └───────────────────┘
         │
         └────────────▶┌──────────────────┐
                       │ SOFTWARE_LICENSE  │
                       ├──────────────────┤
                       │ softwareId    FK │
                       │ serialKey        │
                       │ type        ENUM │
                       │ status      ENUM │
                       │ quantity / used   │
                       │ expiryDate        │
                       │ vendorId      FK │
                       └──────────────────┘
```

### SLA & Escalation

```
  ┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
  │SLA_DEFINITION│     │ESCALATION_POLICY │────▶│ ESCALATION_RULE  │
  ├──────────────┤     ├──────────────────┤     ├──────────────────┤
  │ priority ENUM│     │ teamId       FK  │     │ policyId     FK  │
  │ responseTime │     │ name             │     │ level       INT  │
  │ resolutionTm │     │ isActive    BOOL │     │ delayMinutes     │
  │ businessHrs  │     └──────────────────┘     │ notifyType  ENUM │
  │ orgId     FK │                              │ notifyTargets    │
  └──────────────┘     ┌──────────────────┐     └──────────────────┘
                       │ ONCALL_SCHEDULE  │
                       ├──────────────────┤     ┌──────────────────┐
                       │ teamId       FK  │     │ ESCALATION_LOG   │
                       │ userId       FK  │     ├──────────────────┤
                       │ startTime        │     │ incidentId   FK  │
                       │ endTime          │     │ level       INT  │
                       │ isPrimary   BOOL │     │ notifyType       │
                       └──────────────────┘     │ targetContact    │
                                                │ status           │
                                                └──────────────────┘
```

---

## Data Dictionary

### Enums Reference

#### User & Access Control

| Enum | Values | Description |
|------|--------|-------------|
| `Role` | ADMIN, MANAGER, ENGINEER, OPERATOR, VIEWER | User permission level |
| `UserStatus` | ACTIVE, INACTIVE, LOCKED | Account state |
| `TeamMemberRole` | LEAD, MEMBER, OBSERVER | Role within a team |

#### Incident Management

| Enum | Values | Description |
|------|--------|-------------|
| `IncidentState` | NEW, IN_PROGRESS, ON_HOLD, ESCALATED, RESOLVED, CLOSED, CANCELLED | Incident lifecycle |
| `Impact` | ENTERPRISE, DEPARTMENT, TEAM, INDIVIDUAL | Business impact scope |
| `Urgency` | CRITICAL, HIGH, MEDIUM, LOW | Time sensitivity |
| `Priority` | P1, P2, P3, P4 | Calculated from Impact × Urgency |
| `IncidentSource` | MANUAL, PROMETHEUS, GRAFANA, API, EMAIL, VOICE, SLACK | How incident was created |

#### Change Management

| Enum | Values | Description |
|------|--------|-------------|
| `ChangeType` | NORMAL, STANDARD, EMERGENCY | ITIL change classification |
| `ChangeState` | NEW, ASSESSMENT, APPROVAL, SCHEDULED, IMPLEMENTING, REVIEW, CLOSED, CANCELLED | Change lifecycle |
| `RiskLevel` | HIGH, MEDIUM, LOW | Risk assessment |
| `ClosureCode` | SUCCESSFUL, FAILED, PARTIAL | Implementation outcome |

#### Problem Management

| Enum | Values | Description |
|------|--------|-------------|
| `ProblemState` | NEW, INVESTIGATION, RCA_IN_PROGRESS, KNOWN_ERROR, RESOLVED, CLOSED | Problem lifecycle |

#### CMDB

| Enum | Values | Description |
|------|--------|-------------|
| `CIType` | SERVER, KUBERNETES_CLUSTER, DATABASE, APPLICATION, NETWORK, STORAGE, CONTAINER, VM, LOAD_BALANCER, END_USER_DEVICE, UPS, FIREWALL, SWITCH, ROUTER, PRINTER, MONITOR, PHONE, PERIPHERAL, RACK_UNIT, PDU, ENCLOSURE, CABLE, SIMCARD | Asset classification (23 types) |
| `CIStatus` | LIVE, MAINTENANCE, DECOMMISSIONED, PLANNED, IN_STOCK, DISPOSED, RESERVED, IN_TRANSIT | Asset lifecycle state |
| `Criticality` | HIGH, MEDIUM, LOW | Business criticality |
| `Environment` | PROD, DR, UAT, STAGING, DEV | Deployment environment |
| `CIRelationshipType` | DEPENDS_ON, RUNS_ON, CONNECTS_TO, HOSTS, CONTAINS, BACKED_BY | How CIs relate |

#### Alerting

| Enum | Values | Description |
|------|--------|-------------|
| `AlertSeverity` | CRITICAL, WARNING, INFO | Alert urgency |
| `AlertStatus` | FIRING, RESOLVED, ACKNOWLEDGED, SILENCED | Alert state |
| `AlertSource` | PROMETHEUS, GRAFANA, CUSTOM | Alert origin |

#### Communication

| Enum | Values | Description |
|------|--------|-------------|
| `NotificationType` | INCIDENT, CHANGE, PROBLEM, ALERT, SLA, SYSTEM | What triggered notification |
| `NotificationChannel` | WEB, EMAIL, SMS, SLACK, VOICE | Delivery method |
| `NotifyType` | SMS_NOTIFY, EMAIL_NOTIFY, SLACK_NOTIFY, VOICE_NOTIFY, ALL | Escalation notification |

---

### Table Details

#### Organization (Multi-Tenant Root)

| Column | Type | Nullable | Default | Constraint | Description |
|--------|------|----------|---------|------------|-------------|
| id | UUID | No | auto | PK | Organization identifier |
| name | String | No | - | UNIQUE | Display name |
| slug | String | No | - | UNIQUE | URL-safe identifier |
| environment | Environment | No | PROD | - | PROD/DR/UAT/DEV |
| serverIp | String | Yes | - | - | Primary server IP |
| fqdn | String | Yes | - | - | Fully qualified domain |
| description | String | Yes | - | - | Organization description |
| preferredLanguage | String | Yes | "en" | - | Locale preference |
| isActive | Boolean | No | true | IDX | Soft delete flag |

#### User

| Column | Type | Nullable | Default | Constraint | Description |
|--------|------|----------|---------|------------|-------------|
| id | UUID | No | auto | PK | User identifier |
| email | String | No | - | UNIQUE, IDX | Login email |
| password | String | No | - | - | bcrypt hash (12 rounds) |
| firstName | String | No | - | - | First name |
| lastName | String | No | - | - | Last name |
| phone | String | Yes | - | - | Phone number |
| avatar | String | Yes | - | - | Avatar URL |
| role | Role | No | VIEWER | IDX | Permission level |
| status | UserStatus | No | ACTIVE | IDX | Account state |
| department | String | Yes | - | - | Department name |
| jobTitle | String | Yes | - | - | Job title |
| timezone | String | No | Asia/Kolkata | - | IANA timezone |
| mfaEnabled | Boolean | No | false | - | MFA active flag |
| loginAttempts | Int | No | 0 | - | Failed login count |
| lockedUntil | DateTime | Yes | - | - | Lock expiry (15 min) |
| skills | String[] | No | [] | - | Technical skills array |
| organizationId | UUID | Yes | - | FK, IDX | Tenant (null = super admin) |

#### Incident

| Column | Type | Nullable | Default | Constraint | Description |
|--------|------|----------|---------|------------|-------------|
| id | UUID | No | auto | PK | Incident identifier |
| number | String | No | auto | UNIQUE, IDX | Display number (INC0000001) |
| shortDescription | String | No | - | - | One-line summary |
| description | String | Yes | - | - | Detailed description |
| state | IncidentState | No | NEW | IDX | Current lifecycle state |
| impact | Impact | No | INDIVIDUAL | - | Business impact |
| urgency | Urgency | No | LOW | - | Time urgency |
| priority | Priority | No | P4 | IDX | Computed priority |
| category | String | Yes | - | - | Service category |
| assignedToId | UUID | Yes | - | FK, IDX | Assigned engineer |
| assignmentGroupId | UUID | Yes | - | FK, IDX | Assigned team |
| createdById | UUID | No | - | FK | Creator |
| configItemId | UUID | Yes | - | FK | Affected CI |
| slaBreached | Boolean | No | false | IDX | SLA violation flag |
| responseTime | DateTime | Yes | - | - | First response time |
| resolutionTime | DateTime | Yes | - | - | Resolution timestamp |
| slaTargetResponse | DateTime | Yes | - | - | SLA response deadline |
| slaTargetResolution | DateTime | Yes | - | - | SLA resolution deadline |
| source | IncidentSource | No | MANUAL | - | Creation source |
| escalationLevel | Int | No | 0 | - | Current escalation tier |
| organizationId | UUID | Yes | - | FK, IDX | Tenant |

**Composite Indexes:** (orgId, state), (orgId, priority, state), (orgId, createdAt), (orgId, slaBreached)

#### ConfigurationItem (CI)

| Column | Type | Nullable | Default | Constraint | Description |
|--------|------|----------|---------|------------|-------------|
| id | UUID | No | auto | PK | CI identifier |
| name | String | No | - | IDX | Asset name |
| type | CIType | No | - | IDX | Asset type (23 options) |
| status | CIStatus | No | PLANNED | IDX | Lifecycle state |
| serialNumber | String | Yes | - | - | Hardware serial |
| assetTag | String | Yes | - | - | Organization asset tag |
| manufacturer | String | Yes | - | - | OEM name |
| model | String | Yes | - | - | Model number |
| ipAddress | String | Yes | - | - | Primary IP |
| hostname | String | Yes | - | - | DNS hostname |
| cpu | String | Yes | - | - | CPU specification |
| memory | String | Yes | - | - | RAM specification |
| storage | String | Yes | - | - | Storage specification |
| os | String | Yes | - | - | Operating system |
| osVersion | String | Yes | - | - | OS version |
| environment | Environment | Yes | - | - | PROD/DR/UAT/DEV |
| criticality | Criticality | Yes | - | - | Business criticality |
| ownerId | UUID | Yes | - | FK | Asset owner |
| supportGroupId | UUID | Yes | - | FK | Support team |
| purchaseCost | Float | Yes | - | - | Purchase price |
| monthlyCost | Float | Yes | - | - | Monthly opex |
| monitoringEnabled | Boolean | No | false | - | Prometheus monitoring |
| prometheusJob | String | Yes | - | - | Prometheus job name |
| organizationId | UUID | Yes | - | FK, IDX | Tenant |
| siteId | UUID | Yes | - | FK, IDX | Physical site |

#### Alert

| Column | Type | Nullable | Default | Constraint | Description |
|--------|------|----------|---------|------------|-------------|
| id | UUID | No | auto | PK | Alert identifier |
| alertId | String | No | - | UNIQUE(+orgId) | External alert ID |
| name | String | No | - | - | Alert rule name |
| severity | AlertSeverity | No | - | IDX | CRITICAL/WARNING/INFO |
| status | AlertStatus | No | FIRING | IDX | Current state |
| source | AlertSource | No | PROMETHEUS | - | Alert origin |
| metric | String | Yes | - | - | Metric name |
| currentValue | String | Yes | - | - | Current metric value |
| threshold | String | Yes | - | - | Alert threshold |
| configItemId | UUID | Yes | - | FK, IDX | Related CI |
| incidentId | UUID | Yes | - | FK | Auto-created incident |
| firedAt | DateTime | No | - | IDX | Alert fired time |
| organizationId | UUID | Yes | - | FK, IDX | Tenant |

---

## Key Business Rules

1. **Multi-Tenancy**: Every record has `organizationId`. Middleware auto-filters by tenant. Super admins (user.organizationId = null) can see all orgs.

2. **Incident Priority Matrix**: Priority = f(Impact, Urgency) per ITIL v4 best practices.

3. **SLA Calculation**: `slaService.js` computes response/resolution targets from `SLADefinition` per priority. Breach flag is set when target is exceeded.

4. **Escalation**: 60-second ticker in `escalationService.js` auto-escalates P1/P2 incidents through team escalation rules with SMS/Voice/Slack notifications.

5. **Change Approval**: Normal/Emergency changes require approvals (Approval table). Standard changes are pre-approved.

6. **Audit Trail**: All mutations are logged to `AuditLog` with old/new values, user, IP, and user agent.

7. **Number Sequences**: Incidents (INC), Changes (CHG), Problems (PRB) get auto-incrementing display numbers unique per tenant.

---

## DBDocs.io Schema (DBML)

To use with [dbdocs.io](https://dbdocs.io), the DBML file is at: `docs/schema.dbml`
