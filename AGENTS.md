<claude-mem-context>
# Memory Context

# [argus-servicedesk] recent context, 2026-05-23 10:37pm GMT+5:30

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision 🚨security_alert 🔐security_note
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 50 obs (20,134t read) | 676,591t work | 97% savings

### Apr 24, 2026
S20 User communication preference stored in claude-mem memory (Apr 24, 11:57 AM)
S21 Initialize claude-mem memory for argus-servicedesk project with terse communication preference (Apr 24, 11:58 AM)
S22 Frontend ITIL pages are in src/pages/ not src/components/ — subagent corrected earlier path assumption (Apr 24, 11:58 AM)
S23 Deep codebase exploration of argus-servicedesk ITIL modules (incidents, problems, changes) (Apr 24, 12:01 PM)
S24 Auth Store checkAuth: Org ID Resolution Fixed in Both Primary and Retry Paths (Apr 24, 12:01 PM)
S25 Debugging global route resolution bug in Argus ServiceDesk React app — all routes rendering Incidents page content (Apr 24, 12:18 PM)
S26 Frontend Rebuilt Successfully With Auth Store Fixes — New dist/ Contains Patched authStore and API Client (Apr 24, 12:18 PM)
S27 Full-stack audit and fix for Argus ServiceDesk routing bug — all routes rendering Incidents page content instead of their own components (Apr 24, 12:29 PM)
S28 Incidents detail page (UUID 48f6ae02-cc0d-4aa7-bb4a-d7d1ee2ff3fe) showing blank white page — root cause found and fixed across three backend apps (Apr 24, 12:31 PM)
### May 21, 2026
808 6:00a 🟣 Rewrote `useAuth` Hook with Granular Permission-Based Authorization
809 " 🔄 ITSM Panel Components Updated to Use `hasPermission()` for Action Guards
810 " 🟣 Backend User Model Extended to Support Keycloak Roles in `has_role()` and `role_names`
811 6:01a 🔵 Frontend Keycloak Configuration from `.env.example`
812 " 🔴 Fixed Role Key Normalization — Spaces Were Not Converted to Underscores
813 " 🔵 Full Scope of Frontend `canManage()` and Backend `can_manage_service_desk()` Usage
814 " 🔵 Django System Check Passes After All Backend RBAC Changes
815 6:05a 🔵 Django Incompatible with Python 3.14 — `cgi` Module Removed
816 6:06a 🟣 Keycloak SSO RBAC Integration — Full-Stack Implementation
817 " 🟣 Argus Frontend Production Build Successful — Vite 7.3.1, 2623 Modules
818 " 🔵 Database Connection Timeout on makemigrations — Backend DB Unreachable
819 6:08a 🔵 Incident Views Have Mixed RBAC Enforcement — Some Actions Not Yet Permission-Code Gated
820 " 🔄 Added `can_assign_service_record()` Helper and Unified Assignment RBAC Across All Views
821 " 🔴 Narrowed `isManager` Permission Detection in Frontend `useAuth` Hook
822 6:09a 🔵 Two Remaining `can_manage_service_desk()` Calls in incidents/views.py Not Yet Migrated
823 6:10a 🔴 Completed Incident RBAC Migration — All `can_manage_service_desk()` Calls Replaced with Permission Codes
824 " 🔄 Removed Last `can_manage_service_desk` Import from incidents/views.py
825 6:12a 🔵 Problems App Has No Dedicated Action Views — All Transitions via partial_update
826 " 🟣 Added Creation Permission Guards to All ITSM Create Endpoints
827 " 🟣 Fine-Grained Permission Codes Added to Problem RCA/Link and Service Request Fulfill/Close/Reopen Actions
828 6:16a 🔵 Django Incompatible with Python 3.14 — Missing `cgi` Module
829 " 🟣 Keycloak RBAC Integration Implemented Across Argus Full Stack
830 " 🔴 Replaced `can_manage_service_desk` with `user_has_permission` in Service Catalog Close Guard
831 " 🔵 Django Backend Runs Successfully Under Venv Python (Not System Python 3.14)
832 6:18a 🔵 Kimi WebBridge Daemon Requires Elevated Permissions to Start on Windows
833 6:19a 🔵 Keycloak Realm "ArgusService Desk" Running at localhost:8082 with Group Structure
834 6:20a 🔵 Keycloak Admin REST API Returns 401 When Called from Browser Context Without Bearer Token
835 6:21a 🔐 Keycloak Bootstrap Admin Credentials Stored in Docker Container Environment
836 " 🔵 Keycloak `kcadm.sh` CLI Accessible Inside Container for Admin Operations
837 6:22a 🔵 kcadm.sh Fails on Realm Names with Spaces — Requires URL-Encoded Realm Name
838 " 🔵 Keycloak "ArgusService Desk" Realm Has Legacy Roles — Missing New Granular RBAC Roles
847 6:26a 🔵 Django Incompatible with Python 3.14 — `cgi` Module Removed
848 " 🟣 60 Keycloak RBAC Roles Created for Argus Service Desk Realm
849 6:27a 🟣 Wildcard RBAC Roles Added to Keycloak for Argus Composite Role Hierarchy
850 6:29a 🟣 Keycloak Composite RBAC Role Hierarchy Fully Wired for Argus
851 6:33a 🔵 Django Incompatible with Python 3.14 — `cgi` Module Removed
852 6:34a 🔵 Keycloak "ArgusService Desk" Realm: Groups, Roles, and Users Enumerated
853 " 🔵 Argus RBAC Architecture: Keycloak → Django → React Permission Flow
854 " 🔴 Keycloak Composite RBAC Roles Partially Applied — Docker npipe Permission Failure
855 6:37a 🔵 Django Incompatible with Python 3.14 — Missing `cgi` Module
856 6:38a 🔵 Keycloak `kcadm.sh` Composite Role Assignment Times Out via `docker exec`
857 " 🔵 PowerShell `ConvertTo-Json` Unwraps Single-Element Arrays When Piped
858 6:49a 🔵 Django Incompatible with Python 3.14 — `cgi` Module Removed
862 6:50a 🟣 Keycloak RBAC Composite Role Tree Configured for ArgusService Desk Realm
863 " 🔵 Keycloak Group Structure for ArgusService Desk Realm
864 " 🟣 User Roles, Group Roles, and Group Memberships Assigned in Keycloak
865 " 🟣 Argus-Frontend Keycloak Client Hardened: PKCE S256, CORS, Groups Token Mapper
866 " 🔵 Argus-Frontend Auth Flow Uses PKCE (S256) with Authorization Code — Custom Implementation
867 " 🔵 Keycloak CORS Verified for All Three Configured Origins
868 " 🔵 Django Backend Keycloak Integration Settings and Role Sync Architecture
S55 Configure Keycloak RBAC for argus-servicedesk, then debug "Keycloak Login Failed" 500 error from the backend auth endpoint (May 21, 6:51 AM)
**Investigated**: - Existing Keycloak realm groups and their subgroup hierarchy
    - Keycloak client configuration for Argus-Frontend (redirect URIs, CORS origins, mappers, flow settings)
    - Django backend Keycloak integration settings in config/settings/base.py and apps/accounts/keycloak.py
    - Frontend PKCE login implementation in Argus-Frontend/src/lib/keycloak.ts
    - CORS preflight responses for all three configured origins against the Keycloak token endpoint
    - Effective composite role resolution per user via /users/{id}/role-mappings/realm/composite

**Learned**: - Realm has two group trees: /Clients (E2E Client) and /Teams (Devops Team, Infra Team, NOC, Software Team)
    - Django backend uses KEYCLOAK_SYNC_LOCAL_ROLES=true to sync Keycloak roles into Django on each request, and KEYCLOAK_AUTO_CREATE_USERS=true to provision users on first login
    - docker-compose.dev.yml sets KEYCLOAK_JWKS_URL to host.docker.internal:8082 while KEYCLOAK_ISSUER uses localhost:8082 — these must match the token's `iss` claim exactly
    - Frontend uses a hand-rolled PKCE (S256) auth code flow (no keycloak-js library); callback path is /auth/keycloak/callback
    - PowerShell gotcha: dotted attribute names on PSCustomObject require Add-Member -Force, not direct dot-notation assignment
    - VITE_KEYCLOAK_FORCE_LOGIN=true sends prompt=login on every auth request, forcing re-auth

**Completed**: - Applied full composite RBAC role tree to Keycloak realm via Admin REST API: 9 high-level roles (SUPER_ADMIN, ORG_ADMIN, MANAGER, TEAM_LEAD, NOC, OPERATOR, ENGINEER, CLIENT_USER, VIEWER) each aggregating granular permission child roles (incident:*, problem:*, change:*, service_request:*, etc.)
    - Assigned user roles: admin@argus.com → SUPER_ADMIN, e2e.client.0819@finspot.test → CLIENT_USER, e2e.engineer.0819@finspot.test → ENGINEER, noc@argus.com → NOC
    - Assigned group-level roles: E2E Client → CLIENT_USER; NOC group → NOC; Infra/Devops/Software teams → ENGINEER
    - Added users to groups: e2e.client to /Clients/E2E Client, e2e.engineer to /Teams/Devops Team, noc to /Teams/NOC
    - Hardened Argus-Frontend client: disabled directAccessGrantsEnabled, enforced PKCE S256, set redirect URIs and CORS origins for localhost:3000, 127.0.0.1:3000, servicedesk-dev.finspot.in
    - Added/updated OIDC groups mapper (oidc-group-membership-mapper) on Argus-Frontend client — groups claim now included in access and ID tokens with full path
    - Verified CORS preflight returns correct Allow-Origin for all three configured origins
    - Verified effective composite role resolution for all four users is correct

**Next Steps**: - Investigate the "Keycloak Login Failed" 500 error from the backend /api/v1/auth/keycloak-login endpoint
    - Check backend application logs to identify the crash point (JWT validation, user auto-creation, or role sync)
    - Likely suspects: KEYCLOAK_ISSUER mismatch between localhost vs host.docker.internal in the token iss claim, or KEYCLOAK_ROLE_MAP not mapping the new composite role names to Django roles


Access 677k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>