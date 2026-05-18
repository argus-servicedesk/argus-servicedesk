<claude-mem-context>
# Memory Context

# [argus-servicedesk] recent context, 2026-05-18 12:14pm GMT+5:30

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision 🚨security_alert 🔐security_note
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 50 obs (19,915t read) | 586,331t work | 97% savings

### Apr 24, 2026
S20 User communication preference stored in claude-mem memory (Apr 24, 11:57 AM)
S19 Read memory for argus-servicedesk project (Apr 24, 11:57 AM)
S21 Initialize claude-mem memory for argus-servicedesk project with terse communication preference (Apr 24, 11:58 AM)
S22 Frontend ITIL pages are in src/pages/ not src/components/ — subagent corrected earlier path assumption (Apr 24, 11:58 AM)
S23 Deep codebase exploration of argus-servicedesk ITIL modules (incidents, problems, changes) (Apr 24, 12:01 PM)
S24 Auth Store checkAuth: Org ID Resolution Fixed in Both Primary and Retry Paths (Apr 24, 12:01 PM)
S25 Debugging global route resolution bug in Argus ServiceDesk React app — all routes rendering Incidents page content (Apr 24, 12:18 PM)
S26 Frontend Rebuilt Successfully With Auth Store Fixes — New dist/ Contains Patched authStore and API Client (Apr 24, 12:18 PM)
S27 Full-stack audit and fix for Argus ServiceDesk routing bug — all routes rendering Incidents page content instead of their own components (Apr 24, 12:29 PM)
S28 Incidents detail page (UUID 48f6ae02-cc0d-4aa7-bb4a-d7d1ee2ff3fe) showing blank white page — root cause found and fixed across three backend apps (Apr 24, 12:54 PM)
### May 17, 2026
656 4:57p 🔵 Two Submit Buttons Cause Playwright Strict Mode Violation — Catalog Item Selection Updates Placeholder
657 4:58p 🔵 Catalog Item Selection Fully Drives Dynamic State — VPN Item Has Custom formSchema Fields
658 4:59p 🟣 ServiceRequestCreate End-to-End Submit Verified — Request REQ202600003 Created Successfully
659 5:01p ✅ ServiceRequestList.tsx Deleted — Rewrite to Match IncidentList SNPage Layout Underway
660 5:04p 🟣 ServiceRequestList.tsx Rebuilt with SNPage sn-list-shell Pattern Matching IncidentList
661 " 🔴 ServiceRequestList Build Fails — Dual User Interface Causes first_name/username TypeScript Errors
662 " 🔴 ServiceRequestList personLabel Fixed with PersonSummary Intersection Type
663 5:05p 🟣 ServiceRequestList Production Build Succeeds — Both Service Request Components Now Ship
664 5:06p 🔵 Dev Server Died Between Sessions — Requires Restart with Elevated Permissions Each Time
665 5:15p 🔵 Django Incompatible with Python 3.14 — `cgi` Module Removed
666 " 🔵 Argus Frontend Vite Dev Server Port Conflict — Falls Back to Port 3004 but Remains Unreachable
667 5:16p 🔵 Full Port Map of argus-servicedesk Development Environment Revealed via netstat
668 5:17p 🔵 Argus Frontend Confirmed Live on Port 3003 — Auth Guard Redirects to /login
669 " 🔵 Argus Login Page Structure — Keycloak SSO + Email Auth, E2E Test Credentials Identified
670 5:28p 🔵 Python 3.14 Incompatibility with Django — `cgi` Module Removed
671 5:29p 🟣 ServiceRequestList Refactored to ServiceNow-Style UI
672 " 🔵 Argus Servicedesk — Breadth of Uncommitted Changes Across Both Backend and Frontend
### May 18, 2026
673 5:55a 🔵 Django Incompatible with Python 3.14 — `cgi` Module Removed
674 5:56a 🔵 Docker Desktop Not Running on argus-servicedesk Dev Machine
675 " 🔵 NOC Problems Page — Multi-Issue Fix Sprint Progress
676 " 🔵 Docker Desktop Now Running — Version 29.4.1 / Desktop 4.71.0
677 5:57a 🔵 argus-servicedesk Local Docker Stack — Full Container Inventory
678 " 🔵 argus-backend docker-compose.dev.yml — Service Architecture
679 5:58a 🔵 argus-backend Dockerized Successfully Using Python 3.11-slim
680 5:59a 🔵 argus-backend API Fully Healthy — Problems, Assets, and Stats Endpoints All Return 200
681 " 🔵 argus-frontend Not Running on Port 3003
682 6:00a 🔵 argus-frontend Dev Server Started on Port 3003 — Auth Guard Redirects /problems to Login
683 6:01a 🔵 NOC Login Succeeds — Browser Lands on /problems Page
684 6:02a 🟣 NOC Problems Page Renders Correctly — Zero Console Errors
685 " 🔵 Recharts Width=-1 Warning Persists on Dashboard Page
686 " 🔴 Problems API 400 Fix — `_problem_queryset_for_request` Helper for Service Desk Staff
687 " 🔴 Assets 403 Fix — `org_id(required=False)` for Service Desk Staff
688 " 🔴 Recharts Container Fix in DashboardOverview — minWidth={0} + overflow-hidden
689 6:03a 🔴 Recharts Warning Fixed — Replaced ResponsiveContainer with useChartSize Hook + Explicit Dimensions
690 6:05a 🟣 argus-frontend Production Build Succeeds — 2620 Modules, Zero TypeScript Errors
691 6:06a 🔵 Dashboard Crashed in Dev Server — Partial Patch Applied ResponsiveContainer Import Before JSX Fix
692 " 🔴 Dashboard Recharts Warning Fully Resolved — Zero Console Errors/Warnings on Fresh Load
693 6:07a 🟣 NOC Problems Page Fix Sprint — Complete and Fully Verified
694 6:17a 🔵 UI Alignment Issue Identified in Codex Node Editor
695 " 🔵 Argus ITSM Form Architecture: SNRecordGrid 4-Column Layout
696 " 🔴 Fixed Full-Width ITSM Row Misalignment via CSS Grid Column Pinning
697 6:37a 🔵 Django Incompatible with Python 3.14 — `cgi` Module Removed
698 6:39a 🔵 Incident Detail Page Layout Verified Correct for Wide Fields
699 " 🔵 Notifications Unread-Count Endpoint Returns 401 in Frontend Session
700 " 🔵 `browser_run_code_unsafe` Context Does Not Have Access to `setTimeout`
701 6:40a 🔵 Wide-Row Layout Audit Passes Across All Argus Service Desk Form Pages
702 6:41a ✅ `ServiceNowUI.tsx` Modified — Wide-Row Layout Fix
703 " 🔴 Fixed Wide-Row CSS Grid Layout in `ServiceNowUI.tsx` — Label Class and Column Span
704 6:43a ✅ Argus Frontend Production Build Succeeds After `ServiceNowUI.tsx` Layout Fix
705 12:13p 🔵 Admin Unable to Assign Groups and People

Access 586k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>