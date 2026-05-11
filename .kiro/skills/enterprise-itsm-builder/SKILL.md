---
name: enterprise-itsm-builder
description: |
  Guides the AI through the systematic transformation of the Argus ServiceDesk ticketing system into an Enterprise ITSM Platform. 
  Trigger this skill whenever the user asks to "build enterprise ITSM features", "start phase 1 of ITSM", "implement RBAC for Argus", "build the SLA engine", or references the enterprise architecture phased roadmap. 
  It provides the exact implementation phases, architectural constraints, and context about the existing Django+React codebase.
---

# Enterprise ITSM Builder

You are tasked with transforming the Argus ServiceDesk from a basic ticketing system into a robust, scalable Enterprise ITSM Platform. 

## Codebase Context

Before starting any feature, be aware of the existing codebase structure:
- **Backend**: Django, DRF, Celery, Redis, PostgreSQL.
  - Apps live in `Argus-Backend/apps/`. Important existing apps include: `accounts`, `organizations`, `incidents`, `problems`, `changes`, `sla`, `teams`, `notifications`.
  - Do NOT create duplicate apps if one already exists. Extend existing models.
- **Frontend**: React, Vite, Tailwind CSS, Zustand, React Query.
  - Lives in `Argus-Frontend/`. Uses `src/components`, `src/hooks`, `src/stores`.

---

## Architectural Rules

1. **RBAC & Permissions**: Do NOT hardcode permissions. Implement a Permission Engine using DRF permission classes and middleware.
2. **Multi-Tenancy**: Tenant isolation is enterprise critical. Every ticket/record MUST contain an `organization_id`. Ensure queries are scoped to prevent Organization A from seeing Organization B's data.
3. **Microservices & Boundaries**: For features like the Notification Service, keep logic decoupled. Use Celery/Redis for asynchronous event processing.
4. **Event-Driven**: Utilize signals or message queues (Celery/Redis initially, Kafka/NATS later) for `incident.created`, `sla.breached`, etc.
5. **UI Aesthetics**: UI must feel premium, modern, and dynamic. Use rich aesthetics, smooth gradients, modern typography (Inter/Roboto), micro-animations, and avoid generic default browser styles. 

---

## Implementation Roadmap

Always verify which phase and step the user wants to work on. If the user doesn't specify, analyze the codebase to see what is missing and suggest the next logical step from this roadmap.

### PHASE 1: CORE ADMIN FOUNDATION (CRITICAL)
Without this, scaling becomes impossible.

- **Step 1.1: RBAC (Role-Based Access Control)**
  - *Models*: `users`, `roles`, `permissions`, `role_permissions`, `user_roles`.
  - *Roles*: Super Admin, Platform Admin, Org Admin, Incident Manager, Problem Manager, Change Manager, Operator, Viewer, End User, API Client, AI Agent.
  - *Granular Permissions*: `incident.create`, `change.approve`, `admin.user.manage`, etc.
  - *Implementation*: DRF permission classes tied to JWT/Auth middleware.
- **Step 1.2: Multi-Tenant Architecture**
  - *Models*: Ensure `organizations`, `projects`, `teams`, `users`, `tickets` have strict isolation boundaries based on `organization_id`.
- **Step 1.3: User Management Admin Panel**
  - *Features*: User CRUD, assign roles/teams, force logout/revoke tokens, track sessions (IP, browser, last activity).
  - *Future Auth Prep*: LDAP, OAuth2, SAML.
- **Step 1.4: Team & Escalation Management**
  - *Features*: Team definitions (Network, Database, SRE, etc.).
  - *Escalation Rules*: Configurable rules (e.g., P1 -> L1 -> 5 min -> L2).

### PHASE 2: OPERATIONS CONTROL LAYER
Making the system operationally intelligent.

- **Step 2.1: SLA Engine (Enterprise Differentiator)**
  - *Track*: Response SLA, Resolution SLA, Acknowledgement SLA.
  - *Logic*: Ticket Created -> Match Policy -> Start Timers -> Monitor Breach -> Trigger Escalation via Celery beat.
- **Step 2.2: Workflow Engine**
  - *Features*: Dynamic State Machine, Workflow DSL/JSON config.
  - *Logic*: Define conditions for state transitions (e.g., `from: Open, to: Resolved, conditions: ["approval_received"]`).
- **Step 2.3: Automation Rules Engine**
  - *Features*: Trigger -> Condition -> Action architecture.
  - *Example*: If severity=P1 -> assign SRE Team. 
- **Step 2.4: Notification System**
  - *Features*: Email, Slack, Teams, Webhook, Push. Templates, Retry Queue, Preferences. 
  - *Architecture*: Build as a decoupled service using Celery.

### PHASE 3: ENTERPRISE CONTROL CENTER
- **Step 3.1: CMDB (Configuration Management Database)**
  - *Entities*: Servers, Clusters, Apps, Cloud Resources.
- **Step 3.2: Service Dependency Graph**
  - *Features*: Graph-based relations (Service -> DB -> Nodes). Visual graph using D3/Cytoscape on the frontend.
- **Step 3.3: Audit Logging System**
  - *Track*: Store EVERYTHING (`who`, `what`, `when`, `before`, `after`, `ip`, `user_agent`) in `audit_logs`.
- **Step 3.4: Approval Engine**
  - *Features*: Parallel, Sequential, Conditional approvals for Change Management.

### PHASE 4: AI + OBSERVABILITY LAYER
- **Step 4.1: AI Correlation Engine**: Deduplicate and group alerts into single root causes.
- **Step 4.2: AI Ops Assistant**: MCP + LLM powered agent to query root causes and predict SLAs.
- **Step 4.3: Observability Integration**: Prometheus, Grafana, OpenTelemetry logs/traces to incident pipelines.

### PHASE 5: PLATFORM ENGINEERING
- **Step 5.1: API Gateway**: Rate limiting, tenant isolation, API keys.
- **Step 5.2: Event-Driven Bus**: Upgrade from Celery to Kafka/NATS/Redis Streams.
- **Step 5.3: Search System**: OpenSearch/Elasticsearch across tickets, logs, users.
- **Step 5.4: Analytics & Reporting**: MTTR, MTTD dashboards.
- **Step 5.5: Plugin System**: External syncs (Jira, ServiceNow).

---

## Your Workflow

When triggered to work on a step:
1. **Analyze**: Use `grep_search` and `mcp_claude-mem_smart_search` to find existing implementations related to the step.
2. **Plan**: Write a brief technical plan in the chat for the user to approve before writing code.
3. **Execute Backend**: Create/update Django models, DRF serializers, and views. Make sure to generate migrations.
4. **Execute Frontend**: Update Vite/React components ensuring premium aesthetics and proper TanStack Query usage.
5. **Test**: Ensure the code runs without breaking existing tests. Validate using the browser or command line tools.
