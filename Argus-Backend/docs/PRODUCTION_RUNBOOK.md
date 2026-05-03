# Production runbook (Argus Service Desk)

## Secrets and configuration

- Do not commit `.env`. Use `Argus-Backend/.env.example` as a template.
- In production, load secrets from a vault (AWS Secrets Manager, Azure Key Vault, GCP Secret Manager, HashiCorp Vault).
- Set `DJANGO_DEBUG=false`.
- Use a `DJANGO_SECRET_KEY` of at least 50 random characters, or set a dedicated `JWT_SIGNING_KEY` (≥ 32 bytes) for HS256.
- Set `TRUSTED_PROXY_IPS` to the IPs of your reverse proxies if you rely on `X-Forwarded-For` for audit IP capture.
- `DB_PASSWORD` is required when `DEBUG` is false.

## Database backups and restore drill

- **Backup**: schedule logical dumps (e.g. `pg_dump`) nightly; store encrypted off-site with object versioning.
- **RPO/RTO**: document targets (e.g. RPO 1h, RTO 4h) and measure them in a quarterly restore drill.
- **Restore drill**: restore the latest backup to a staging cluster, run `migrate`, smoke-test `GET /health/` and `GET /api/v1/status/metrics/` with a service token.

## Deployments

- Run migrations before or as part of rolling out new app nodes: `python manage.py migrate --noinput`.
- Prefer rolling or blue/green deployments behind a load balancer; keep at least one old revision until health checks pass.
- **Rollback**: redeploy previous image/build; if a migration is backward-incompatible, restore DB from pre-deploy snapshot (avoid destructive migrations without expand/contract pattern).

## Background workers

- Run Celery workers for async tasks. Schedule `sla.sweep_open_incident_sla` via Celery Beat (e.g. every 2–5 minutes) so SLA milestones and breach flags stay current without relying on user traffic.

## Observability

- Ship JSON logs from the app to your log platform.
- Alert on HTTP 5xx rate, p95 latency, DB connection errors, and SLA breach counts.
- Use `GET /api/v1/status/metrics/` (authenticated) as a lightweight DB probe for synthetic checks.

## Compliance and audit

- Activity rows are append-only in Django admin; API consumers should treat them as immutable history.
- Export audit: query `activities` (and incident timeline API) filtered by `created_at` for compliance windows.
