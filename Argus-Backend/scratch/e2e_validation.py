"""
End-to-End Incident Management Validation Script
Simulates a real production incident engineer workflow.
Correct field values and URLs derived from actual models.
"""

import requests
import sys

BASE = "http://localhost:8001/api/v1"
PASS = "[PASS]"
FAIL = "[FAIL]"
WARN = "[WARN]"
results = []

def log(status, section, detail=""):
    symbol = PASS if status else FAIL
    msg = f"  {symbol} {section}"
    if detail:
        msg += f": {detail}"
    print(msg)
    results.append((status, section, detail))

def section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

# ─── 1. AUTHENTICATION ──────────────────────────────────────
section("1. AUTHENTICATION & RBAC")

r = requests.post(f"{BASE}/auth/login", json={"username": "admin@argus.com", "password": "AdminArgus123!"})
if r.status_code != 200:
    print(f"CRITICAL: Login failed ({r.status_code}). Exiting.")
    sys.exit(1)

data = r.json()["data"]
admin_token = data["access"]
admin_user = data["user"]
org_id = admin_user["organization"]
log(True, "Admin login", f"role={admin_user['role']}, org={admin_user['organization_name']}")

admin_h = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}

r = requests.get(f"{BASE}/auth/me", headers=admin_h)
log(r.status_code == 200, "GET /auth/me", f"username={r.json().get('data',{}).get('username','?')}")

r = requests.post(f"{BASE}/auth/login", json={"username": "admin@argus.com", "password": "WRONG_PASSWORD"})
log(r.status_code == 401, "Wrong password returns 401", f"status={r.status_code}")

# ─── 2. USER MANAGEMENT ─────────────────────────────────────
section("2. USER MANAGEMENT")

r = requests.get(f"{BASE}/auth/users", headers=admin_h)
users_ok = r.status_code == 200
users = r.json().get("data", []) if users_ok else []
log(users_ok, "GET /auth/users", f"count={len(users)}")

assignee_id = admin_user["id"]
for u in users:
    if u.get("id") != admin_user["id"]:
        assignee_id = u["id"]
        break

# ─── 3. INCIDENT LIFECYCLE ──────────────────────────────────
section("3. INCIDENT LIFECYCLE")

# Valid Impact values: ENTERPRISE, DEPARTMENT, TEAM, INDIVIDUAL
# Valid Urgency values: CRITICAL, HIGH, MEDIUM, LOW
inc_payload = {
    "short_description": "E2E TEST: Production DB Unresponsive",
    "description": "Primary DB cluster not accepting connections. All services impacted.",
    "priority": "P1",
    "impact": "ENTERPRISE",
    "urgency": "CRITICAL",
    "category": "Database",
    "subcategory": "Availability",
}
r = requests.post(f"{BASE}/incidents/", json=inc_payload, headers=admin_h)
if r.status_code == 201:
    incident = r.json()["data"]
    inc_id = incident["id"]
    inc_number = incident["number"]
    log(True, "Create P1 Incident", f"number={inc_number}, state={incident['state']}")
else:
    log(False, "Create P1 Incident", f"status={r.status_code}, err={r.text[:200]}")
    inc_id = None

if inc_id:
    # Retrieve
    r = requests.get(f"{BASE}/incidents/{inc_id}/", headers=admin_h)
    log(r.status_code == 200, "GET Incident by ID", f"number={r.json().get('data',{}).get('number','?')}")

    # Assign
    r = requests.patch(f"{BASE}/incidents/{inc_id}/", json={"assigned_to": assignee_id}, headers=admin_h)
    log(r.status_code == 200, "Assign incident to engineer")

    # IN_PROGRESS
    r = requests.patch(f"{BASE}/incidents/{inc_id}/", json={"state": "IN_PROGRESS"}, headers=admin_h)
    log(r.status_code == 200, "Transition: NEW -> IN_PROGRESS", f"state={r.json().get('data',{}).get('state','?')}")

    # Work notes
    r = requests.post(f"{BASE}/incidents/{inc_id}/work-notes/", json={"content": "Investigating DB logs. Failover triggered.", "is_internal": True}, headers=admin_h)
    log(r.status_code == 201, "Add internal work note")

    r = requests.post(f"{BASE}/incidents/{inc_id}/work-notes/", json={"content": "Update: Failover complete. Services restoring.", "is_internal": False}, headers=admin_h)
    log(r.status_code == 201, "Add public work note")

    # Timeline
    r = requests.get(f"{BASE}/incidents/{inc_id}/timeline/", headers=admin_h)
    timeline = r.json().get("data", [])
    log(r.status_code == 200 and len(timeline) > 0, "GET Incident Timeline", f"events={len(timeline)}")

    # ON_HOLD
    r = requests.patch(f"{BASE}/incidents/{inc_id}/", json={"state": "ON_HOLD", "hold_reason": "AWAITING_VENDOR"}, headers=admin_h)
    log(r.status_code == 200, "Transition: IN_PROGRESS -> ON_HOLD", f"state={r.json().get('data',{}).get('state','?')}")

    # Back to IN_PROGRESS
    r = requests.patch(f"{BASE}/incidents/{inc_id}/", json={"state": "IN_PROGRESS"}, headers=admin_h)
    log(r.status_code == 200, "Transition: ON_HOLD -> IN_PROGRESS", f"state={r.json().get('data',{}).get('state','?')}")

    # Resolve
    r = requests.patch(f"{BASE}/incidents/{inc_id}/", json={
        "state": "RESOLVED",
        "resolution_code": "PERMANENT_FIX",
        "resolution_notes": "Failover to replica DB completed. All services restored. RCA in progress."
    }, headers=admin_h)
    log(r.status_code == 200, "Transition: IN_PROGRESS -> RESOLVED", f"state={r.json().get('data',{}).get('state','?')}")

    # Close
    r = requests.patch(f"{BASE}/incidents/{inc_id}/", json={"state": "CLOSED"}, headers=admin_h)
    log(r.status_code == 200, "Transition: RESOLVED -> CLOSED", f"state={r.json().get('data',{}).get('state','?')}")

# ─── 4. SLA ENGINE ──────────────────────────────────────────
section("4. SLA ENGINE")

# SLA definitions root is /api/v1/sla/ with appliesTo param
r = requests.get(f"{BASE}/sla/?appliesTo=INCIDENT", headers=admin_h)
if r.status_code == 200:
    sla_defs = r.json().get("data", [])
    log(True, "GET SLA Definitions", f"count={len(sla_defs)}")
    for sla in sla_defs:
        log(True, f"  SLA {sla.get('priority','?')}",
            f"response={sla.get('response_time_minutes','?')}min, resolution={sla.get('resolution_time_minutes','?')}min, active={sla.get('is_active','?')}")
else:
    log(False, "GET SLA Definitions", f"status={r.status_code}, body={r.text[:100]}")

if inc_id:
    # SLA tasks path: /api/v1/sla/incidents/<id>/task-slas/
    r = requests.get(f"{BASE}/sla/incidents/{inc_id}/task-slas/", headers=admin_h)
    sla_tasks = r.json().get("data", [])
    log(r.status_code == 200, "GET SLA Tasks for Incident", f"tasks={len(sla_tasks)}")

# SLA update (PATCH P1)
r = requests.patch(f"{BASE}/sla/P1", json={"response_time_minutes": 15}, headers=admin_h)
log(r.status_code == 200, "PATCH SLA Definition (P1 response time)", f"status={r.status_code}")

# ─── 5. INCIDENT STATS ──────────────────────────────────────
section("5. INCIDENT STATISTICS")

r = requests.get(f"{BASE}/incidents/stats/", headers=admin_h)
if r.status_code == 200:
    stats = r.json().get("data", {})
    log(True, "GET Incident Stats", f"total={stats.get('total','?')}, open={stats.get('open','?')}, p1={stats.get('p1','?')}, breached={stats.get('sla_breached','?')}")
else:
    log(False, "GET Incident Stats", f"status={r.status_code}")

# ─── 6. PROBLEM MANAGEMENT ──────────────────────────────────
section("6. PROBLEM MANAGEMENT")

r = requests.post(f"{BASE}/problems/", json={
    "short_description": "E2E TEST: DB Connection Pool exhaustion (recurring)",
    "description": "Root cause analysis for repeated DB outages.",
    "priority": "P2",
    "state": "OPEN"
}, headers=admin_h)
if r.status_code == 201:
    prob = r.json()["data"]
    prob_id = prob["id"]
    log(True, "Create Problem", f"number={prob.get('number','?')}")
    if inc_id:
        r = requests.post(f"{BASE}/incidents/{inc_id}/problems/", json={"problem_id": prob_id, "link_type": "CAUSED_BY"}, headers=admin_h)
        log(r.status_code in [200, 201], "Link Problem -> Incident", f"status={r.status_code}")
else:
    log(False, "Create Problem", f"status={r.status_code}, err={r.text[:200]}")

# ─── 7. CHANGE MANAGEMENT ───────────────────────────────────
section("7. CHANGE MANAGEMENT")

r = requests.post(f"{BASE}/changes/", json={
    "short_description": "E2E TEST: DB Failover Procedure Update",
    "description": "Update the failover runbook to prevent future incidents.",
    "type": "STANDARD",
    "priority": "P3",
    "state": "PLANNING"
}, headers=admin_h)
if r.status_code == 201:
    chg = r.json()["data"]
    chg_id = chg["id"]
    log(True, "Create Change", f"number={chg.get('number','?')}")
    if inc_id:
        r = requests.post(f"{BASE}/incidents/{inc_id}/changes/", json={"change_id": chg_id}, headers=admin_h)
        log(r.status_code in [200, 201], "Link Change -> Incident", f"status={r.status_code}")
else:
    log(False, "Create Change", f"status={r.status_code}, err={r.text[:200]}")

# ─── 8. TEAMS & ON-CALL ─────────────────────────────────────
section("8. TEAMS & ON-CALL")

r = requests.get(f"{BASE}/teams/", headers=admin_h)
if r.status_code == 200:
    teams = r.json().get("results", r.json().get("data", []))
    log(True, "GET Teams", f"count={len(teams)}")
else:
    log(False, "GET Teams", f"status={r.status_code}")

# Correct path: /teams/on-call/overview
r = requests.get(f"{BASE}/teams/on-call/overview", headers=admin_h)
log(r.status_code == 200, "GET On-Call Overview", f"status={r.status_code}")

# Create a team
r = requests.post(f"{BASE}/teams/", json={"name": "E2E Test Team", "description": "DB on-call team"}, headers=admin_h)
if r.status_code == 201:
    team_id = r.json()["data"]["id"]
    log(True, "Create Team", f"id={team_id}")
    r2 = requests.get(f"{BASE}/teams/{team_id}/on-call", headers=admin_h)
    log(r2.status_code == 200, "GET Team On-Call Schedule", f"status={r2.status_code}")
else:
    log(False, "Create Team", f"status={r.status_code}, err={r.text[:200]}")

# ─── 9. ASSET / CI MANAGEMENT ───────────────────────────────
section("9. ASSET / CI MANAGEMENT")

# Correct path: /assets/ (root) not /assets/cis/
r = requests.get(f"{BASE}/assets/", headers=admin_h)
if r.status_code == 200:
    ci_count = r.json().get("count", 0)
    log(True, "GET Configuration Items", f"count={ci_count}")
else:
    log(False, "GET Configuration Items", f"status={r.status_code}")

r = requests.get(f"{BASE}/assets/stats/", headers=admin_h)
if r.status_code == 200:
    stats = r.json().get("data", {})
    log(True, "GET Asset Stats", f"total={stats.get('total','?')}")
else:
    log(False, "GET Asset Stats", f"status={r.status_code}")

r = requests.get(f"{BASE}/assets/types/", headers=admin_h)
log(r.status_code == 200, "GET Asset Types/Choices", f"status={r.status_code}")

r = requests.get(f"{BASE}/assets/topology/", headers=admin_h)
log(r.status_code == 200, "GET Asset Topology", f"status={r.status_code}")

# ─── 10. INTEGRATIONS ───────────────────────────────────────
section("10. INTEGRATIONS")

r = requests.get(f"{BASE}/integrations/", headers=admin_h)
log(r.status_code == 200, "GET Integrations", f"status={r.status_code}")

r = requests.post(f"{BASE}/integrations/", json={
    "name": "E2E Test Slack",
    "type": "SLACK",
    "config": {"webhook_url": "https://hooks.slack.com/test"},
    "is_active": False
}, headers=admin_h)
log(r.status_code == 201, "Create Integration (Slack)", f"status={r.status_code}")

# ─── 11. MFA SETUP ──────────────────────────────────────────
section("11. MFA SETUP")

r = requests.get(f"{BASE}/auth/mfa/setup", headers=admin_h)
if r.status_code == 200:
    mfa_data = r.json().get("data", {})
    log(True, "GET MFA Setup (QR Code generated)", f"has_secret={bool(mfa_data.get('secret'))}, has_qr={bool(mfa_data.get('qrCode'))}")
else:
    log(False, "GET MFA Setup", f"status={r.status_code}, body={r.text[:150]}")

# ─── 12. PASSWORD RESET ─────────────────────────────────────
section("12. PASSWORD RESET FLOW")

r = requests.post(f"{BASE}/auth/forgot-password", json={"email": "admin@argus.com"})
log(r.status_code in [200, 204], "POST /forgot-password (safe response)", f"status={r.status_code}")

# ─── 13. AUDIT LOG ──────────────────────────────────────────
section("13. AUDIT LOG (DB check via ORM)")
print(f"  {WARN} Checking audit log via management shell...")
import subprocess, json as _json
result = subprocess.run(
    ["python", "manage.py", "shell", "-c",
     "from apps.common.models import AuditLog; count=AuditLog.objects.count(); "
     "recent=list(AuditLog.objects.values('action','description')[:3]); "
     "print(__import__('json').dumps({'count': count, 'recent': recent}))"],
    capture_output=True, text=True, cwd="."
)
try:
    output = [l for l in result.stdout.strip().split('\n') if l.startswith('{')][-1]
    audit_data = _json.loads(output)
    log(audit_data["count"] >= 0, "Audit log table accessible", f"total_entries={audit_data['count']}")
    for entry in audit_data.get("recent", []):
        print(f"    - [{entry.get('action')}] {entry.get('description','')[:60]}")
except Exception as e:
    log(False, "Audit log check", f"parse error: {e}")

# ─── 14. VIEWER RBAC CHECK ──────────────────────────────────
section("14. RBAC (VIEWER cannot mutate)")

import time
ts = int(time.time())
viewer_email = f"viewer_{ts}@test.com"

# Create a VIEWER user and check they can read but not write
viewer_signup = requests.post(f"{BASE}/auth/signup", json={
    "username": viewer_email,
    "email": viewer_email,
    "password": "Viewer123!@#Test",
    "first_name": "Viewer",
    "last_name": "E2E",
    "role": "VIEWER"
})
if viewer_signup.status_code == 201:
    viewer_token = viewer_signup.json()["data"]["access"]
    viewer_h = {"Authorization": f"Bearer {viewer_token}", "Content-Type": "application/json"}

    # VIEWER can read incidents
    r = requests.get(f"{BASE}/incidents/", headers=viewer_h)
    log(r.status_code == 200, "VIEWER: GET incidents (read OK)")

    # VIEWER cannot create incidents
    r = requests.post(f"{BASE}/incidents/", json={"short_description": "RBAC test"}, headers=viewer_h)
    log(r.status_code == 403, "VIEWER: POST incident blocked (403)", f"status={r.status_code}")
else:
    log(False, "Create Viewer user for RBAC test", f"status={viewer_signup.status_code}, err={viewer_signup.text[:100]}")

# ─── FINAL SUMMARY ──────────────────────────────────────────
section("VALIDATION SUMMARY")

total = len(results)
passed = sum(1 for ok, _, _ in results if ok)
failed = total - passed

print(f"\n  Total checks : {total}")
print(f"  Passed       : {passed} {PASS}")
print(f"  Failed       : {failed} {FAIL if failed else PASS}")
print(f"  Pass rate    : {passed/total*100:.1f}%\n")

if failed > 0:
    print("  Failed checks:")
    for ok, name, detail in results:
        if not ok:
            print(f"    {FAIL} {name}")
            if detail:
                print(f"         {detail}")
print()
