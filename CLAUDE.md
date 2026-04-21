# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: LinkedEye ITSM

A multi-tenant IT Service Management platform with three sub-projects in this monorepo:

| Directory | Stack | Port | Purpose |
|-----------|-------|------|---------|
| `linkedeye-itsm-api/` | Node.js + Express + Prisma + PostgreSQL | 5000 | REST API (350+ endpoints) |
| `linkedeye-itsm-web/` | React 19 + TypeScript + Vite + Tailwind | 3000 | Web frontend |
| `linkedeye-itsm-mobile/` | React Native + Expo (v50) | 8082 | Mobile app (iOS/Android) |

---

## Common Commands

### API (`linkedeye-itsm-api/`)
```bash
npm run dev                   # Start with nodemon (hot-reload)
npm start                     # Production start
npm test                      # Jest with coverage (integration tests skipped without DATABASE_URL)
npm run test:watch            # Jest in watch mode
npx jest --testPathPattern=auth  # Run a single test file by pattern
npm run lint                  # ESLint src/
npm run prisma:generate       # Generate Prisma client after schema changes
npm run prisma:migrate        # Create dev migration (prompts for name)
npm run prisma:migrate:prod   # Deploy migrations (CI/CD)
npm run prisma:seed           # Seed demo data
npm run prisma:studio         # Prisma Studio UI on :5555
```

### Web (`linkedeye-itsm-web/`)
```bash
npm run dev                   # Vite dev server on :3000 (proxies /api → :5000)
npm run build                 # TypeScript check + Vite production build → dist/
npm run lint                  # ESLint
npm run test:e2e              # Playwright end-to-end tests
npm run test:e2e:ui           # Playwright interactive UI mode
```

### Mobile (`linkedeye-itsm-mobile/`)
```bash
npm start                     # Expo dev server on :8082
npm run android               # Run on Android emulator/device
npm run ios                   # Run on iOS simulator
npm run web                   # Run web version
npm test                      # Jest tests
```

### Docker
```bash
# API (includes PostgreSQL 16 + Redis 7)
cd linkedeye-itsm-api && docker-compose -f docker-compose.dev.yml up

# Web → Nginx on :8080
cd linkedeye-itsm-web && docker build -t linkedeye-itsm-web .

# Mobile → Nginx APK distribution server
cd linkedeye-itsm-mobile && docker build -t linkedeye-itsm-mobile .
```

### Local dev setup (first time)
```bash
# 1. Start infrastructure
cd linkedeye-itsm-api && docker-compose -f docker-compose.dev.yml up -d

# 2. Configure environment
cp .env.example .env   # minimum required: DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET

# 3. Initialize database
npm run prisma:migrate && npm run prisma:seed

# 4. Start API, then web in separate terminals
npm run dev            # API on :5000
cd ../linkedeye-itsm-web && npm run dev  # Web on :3000
```

---

## Architecture

### API Layer (`linkedeye-itsm-api/`)

**Pattern**: Routes → Controllers → Services → Prisma ORM → PostgreSQL

- **Entry point**: `src/server.js` — Express app with middleware stack
- **Routes** (28 files in `src/routes/`): RESTful CRUD under `/api/v1/{resource}`
- **Controllers** (31 files in `src/controllers/`): Async handlers, consistent response format `{ success, data, pagination }`
- **Services** (26 files in `src/services/`): Reusable business logic (escalation, email, notifications, SLA, AI, webhooks)
- **Config**: `src/config/` — env validation, database, redis, socket.io, constants (ITIL enums, SLA matrix, permissions, state transitions)
- **Middleware**: `src/middleware/` — auth (JWT), tenant scoping, audit logging, rate limiting, validation, file upload

**Key services**:
- `escalationService.js`: 60-second ticker that auto-escalates P1/P2 incidents through team levels
- `notificationService.js`: Multi-channel delivery (Slack, Twilio SMS, email, voice)
- `webhookDispatcher.js`: Event-driven webhook delivery with retry
- `slaService.js`: SLA target calculation and breach detection
- `aiService.js`: OpenAI/Claude API wrapper for incident analysis

**Authentication**: JWT in httpOnly cookies or Bearer header. Access token (15m) + refresh token (7d). Optional TOTP MFA. Redis-backed token blacklist.

**Multi-tenancy**: Every record has `organizationId`. The `tenantContext` middleware (`src/middleware/tenant.js`) distinguishes two admin types: a *super-admin* (no `organizationId` on their user) sees all orgs with no filter, while an *org-admin* defaults to their own org and can switch via `x-organization-id` / `?orgId=`. Non-admins are always locked to their org.

**Real-time**: Socket.IO with JWT auth in handshake. Per-incident rooms. Ollama voice AI integration.

**Background jobs** (all in-process, started in `src/server.js`): `checkEscalations` runs every 60s (P1/P2 auto-escalation); `checkSLACompliance`, `processEmailQueue`, `sendAllOrgAlertDigests`, and `syncRemoteAlerts` also run on intervals. No separate worker process needed.

**Database**: Prisma ORM with 55+ models. PostgreSQL with 15-connection pool. Schema at `prisma/schema.prisma`.

**Roles**: ADMIN, MANAGER, ENGINEER, OPERATOR, VIEWER — with resource-action permission matrix in `src/config/constants.js`.

### Web Frontend (`linkedeye-itsm-web/`)

- **Entry**: `src/App.tsx` — 80+ routes with React Router v6, lazy-loaded with Suspense
- **Components**: `src/components/` — 40+ feature modules (Incidents, Changes, Problems, Assets, K8s, AI, OnCall, etc.)
- **State**: Zustand stores in `src/stores/` — `authStore` (persisted, user/org context), `uiStore` (sidebar, search, notifications)
- **Data fetching**: TanStack React Query + Axios in `src/lib/api.ts`. Request interceptor adds `X-Organization-Id` header. Response interceptor handles 401 refresh flow.
- **Hooks**: `src/hooks/` — 30+ custom hooks per feature domain (useIncidents, useChanges, useAuth, useRealtime, etc.)
- **Types**: `src/types/index.ts` — TypeScript enums and interfaces mirroring Prisma schema
- **Socket.IO**: `src/lib/socket.ts` — singleton with auto-reconnect, exponential backoff
- **Layout**: Sidebar + Header + Outlet pattern in `src/components/Layout/`
- **Protected routes**: `<ProtectedRoute allowedRoles={[...]}>` wrapper
- **Path alias**: `@/` maps to `src/`

### Mobile App (`linkedeye-itsm-mobile/`)

- **Entry**: `App.tsx` → `src/App.tsx`
- **Navigation**: React Navigation — bottom tabs (Dashboard, Incidents, Alerts, OnCall, More) + stack navigators
- **Screens**: `src/screens/` — 22 feature modules mirroring web features
- **State**: Zustand — `authStore`, `themeStore` (dark/light, persisted via AsyncStorage), `connectionStore` (socket status)
- **API**: Same pattern as web — Axios + TanStack Query in `src/lib/`
- **Socket.IO**: `src/lib/socket.ts` + `src/services/socketService.ts` — cache invalidation on real-time events
- **Theme**: `src/theme/` — React Context with dark/light color palettes, module-specific and priority colors
- **Build**: EAS Build profiles in `eas.json` (development, preview, production)

### Cross-cutting Concerns

- **API docs**: Swagger UI at `GET /api/docs` (JSDoc annotations on all routes)
- **Env vars**: API uses `.env` (see `.env.example`). Required: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`. Everything else is optional and feature-gates integrations. Web proxies via Vite config; Mobile hardcodes API URL in `src/lib/api.ts`
- **Integration tests**: `src/__tests__/*.integration.test.js` hit a real database — they auto-skip if `DATABASE_URL` is unset. Unit tests in `src/services/*.test.js` and `src/middleware/*.test.js` run without infrastructure
- **K8s deployment**: API and Web have Dockerfiles. Web uses Nginx with SPA fallback. API backend service name: `linkedeye-inc-api`
- **Company**: FinSpot Technology Solutions Private Limited. Bundle ID: `com.finspot.linkedeye.itsm`
