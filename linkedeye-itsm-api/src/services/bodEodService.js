// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — BOD/EOD Service
// Reads Beginning-of-Day / End-of-Day operational status
// from Redis via SSH tunnel (same pattern as apmService)
// ═══════════════════════════════════════════════════════════

const { exec } = require('child_process');
const { promisify } = require('util');
const logger = require('../utils/logger');

const execAsync = promisify(exec);

// ── SSH helpers (reused from apmService pattern) ───────

function sshCmd(serverIp, sshPort = 4422, sshUser = 'finadmin') {
  return `ssh -p ${sshPort} -i /home/finadmin/.ssh/id_ed25519 \
    -o StrictHostKeyChecking=accept-new \
    -o ConnectTimeout=4 \
    -o BatchMode=yes \
    ${sshUser}@${serverIp}`;
}

async function remoteExec(serverIp, cmd, sshPort = 4422, sshUser = 'finadmin') {
  const full = `${sshCmd(serverIp, sshPort, sshUser)} "${cmd}"`;
  const { stdout } = await execAsync(full, { timeout: 5000 });
  return stdout.trim();
}

// ── Redis CLI helpers ──────────────────────────────────

async function redisCli(serverIp, sshPort, sshUser, redisHost, redisPort, redisPass, command) {
  const auth = redisPass ? `-a '${redisPass}'` : '';
  const cmd = `redis-cli -h ${redisHost} -p ${redisPort} ${auth} --no-auth-warning ${command} 2>/dev/null`;
  return remoteExec(serverIp, cmd, sshPort, sshUser);
}

async function redisKeys(serverIp, sshPort, sshUser, redisHost, redisPort, redisPass, pattern) {
  const raw = await redisCli(serverIp, sshPort, sshUser, redisHost, redisPort, redisPass, `keys "${pattern}"`);
  return raw ? raw.split('\n').filter(k => k && !k.startsWith('(') && !k.startsWith('Warning')) : [];
}

async function redisGet(serverIp, sshPort, sshUser, redisHost, redisPort, redisPass, key) {
  const raw = await redisCli(serverIp, sshPort, sshUser, redisHost, redisPort, redisPass, `get "${key}"`);
  if (!raw || raw === '(nil)' || raw.startsWith('(error)')) return null;
  try { return JSON.parse(raw); } catch { return { raw }; }
}

// ── Status decoder ─────────────────────────────────────

const STATUS_MAP = { 0: 'CRITICAL', 1: 'WARNING', 2: 'UP', 3: 'UNKNOWN', 5: 'EDITED' };

function decodeStatus(code) {
  return STATUS_MAP[parseInt(code, 10)] ?? 'UNKNOWN';
}

// ── Extract display name from Redis key ────────────────

function extractName(key) {
  // Keys like "siteName:BOD:Database-Health" → "Database Health"
  const parts = key.split(':');
  const raw = parts[parts.length - 1] || key;
  return raw.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ── Parse a single check item from Redis ───────────────

function parseCheckItem(key, data) {
  const code = data?.status ?? data?.statusCode ?? data?.code ?? data?.state ?? 3;
  const statusCode = parseInt(code, 10);
  return {
    key,
    name: extractName(key),
    status: decodeStatus(statusCode),
    statusCode,
    message: data?.message || data?.msg || data?.description || '',
    type: data?.type || 'table',
    executedOn: data?.executedOn || data?.checked_at || data?.timestamp || new Date().toISOString(),
    data: data?.data || null,
    lastUpdated: data?.executedOn || data?.checked_at || data?.timestamp || new Date().toISOString(),
  };
}

// ══════════════════════════════════════════════════════════
// BOD/EOD Overview (from Redis)
// ══════════════════════════════════════════════════════════

async function getBodEodOverview(config) {
  const { serverIp, sshPort, sshUser, redisHost, redisPort, redisPass, siteName } = config;

  // Fetch all keys for each category
  const [bodKeys, eodKeys, adpKeys] = await Promise.all([
    redisKeys(serverIp, sshPort, sshUser, redisHost, redisPort, redisPass, `${siteName}:BOD:*`),
    redisKeys(serverIp, sshPort, sshUser, redisHost, redisPort, redisPass, `${siteName}:EOD:*`),
    redisKeys(serverIp, sshPort, sshUser, redisHost, redisPort, redisPass, `${siteName}:ADP:*`),
  ]);

  // Fetch values for all keys
  const fetchItems = async (keys) => {
    const items = [];
    for (const key of keys) {
      const data = await redisGet(serverIp, sshPort, sshUser, redisHost, redisPort, redisPass, key);
      items.push(parseCheckItem(key, data || {}));
    }
    return items;
  };

  const [bod, eod, adp] = await Promise.all([
    fetchItems(bodKeys),
    fetchItems(eodKeys),
    fetchItems(adpKeys),
  ]);

  return { bod, eod, adp, timestamp: new Date().toISOString() };
}

// ══════════════════════════════════════════════════════════
// URL Checker Status (from Redis)
// ══════════════════════════════════════════════════════════

async function getUrlCheckerStatus(config) {
  const { serverIp, sshPort, sshUser, redisHost, redisPort, redisPass, siteName } = config;
  const data = await redisGet(serverIp, sshPort, sshUser, redisHost, redisPort, redisPass, `${siteName}:BOD_URLChecker`);
  if (!data) return { urls: [], timestamp: new Date().toISOString() };

  // Data is typically an array or object of URL health entries
  const urls = Array.isArray(data) ? data : (data.urls || data.results || []);
  return {
    urls: urls.map(u => ({
      url: u.url || u.name || u.endpoint || '',
      httpStatus: u.httpStatus || u.http_status || u.code || 200,
      status: decodeStatus(u.status ?? u.statusCode ?? 2),
      statusCode: parseInt(u.status ?? u.statusCode ?? 2, 10),
      responseTime: u.responseTime || u.response_time || u.latency || null,
      lastChecked: u.lastChecked || u.checked_at || u.timestamp || new Date().toISOString(),
    })),
    timestamp: new Date().toISOString(),
  };
}

// ══════════════════════════════════════════════════════════
// Mock Data (demo / fallback when Redis unavailable)
// Matches LE's real Redis format:
//   { overallStatus, status (0|1|2|3|5), type, executedOn, data: [{ segment, isSuccess, status }] }
// ══════════════════════════════════════════════════════════

function getMockBodEodData() {
  const now = new Date();
  const ago = (mins) => new Date(now.getTime() - mins * 60000).toISOString();

  // ── BOD Items ──────────────────────────────────────────

  const bod = [
    {
      key: 'prod:BOD:Database-Health',
      name: 'Database Health',
      status: 'UP',
      statusCode: 2,
      executedOn: ago(2),
      type: 'table',
      message: 'All database checks passed',
      data: [
        { segment: 'PostgreSQL Primary (postgres.inc-raj-itsm-finspot / 10.106.233.77:5432) — Connection Pool', isSuccess: true, status: 2, detail: '15/15 connections active, pg_isready OK' },
        { segment: 'PostgreSQL Primary (172.16.0.56) — Replication Lag', isSuccess: true, status: 2, detail: 'Lag: 0.2s, WAL position in sync' },
        { segment: 'PostgreSQL Primary — Query Response Time', isSuccess: true, status: 2, detail: 'Avg: 12ms, P99: 45ms, 0 slow queries' },
        { segment: 'Redis Cache (redis.inc-raj-itsm-finspot / 10.96.68.212:6379) — Memory', isSuccess: true, status: 2, detail: '234 MB / 1 GB used (23%), 0 evictions' },
        { segment: 'Redis Cache — Connected Clients & Latency', isSuccess: true, status: 2, detail: '42 clients, ping latency: 0.1ms' },
      ],
      lastUpdated: ago(2),
    },
    {
      key: 'prod:BOD:Network-Connectivity',
      name: 'Network Connectivity',
      status: 'WARNING',
      statusCode: 1,
      executedOn: ago(3),
      type: 'table',
      message: '5/7 devices UP — srv-75 DOWN (maintenance), win-srv-57 high latency',
      data: [
        { segment: 'Core Router (core-router / 172.16.0.16) — ICMP Ping', isSuccess: true, status: 2, detail: 'RTT: 1.2ms, 0% packet loss, Cisco 4321' },
        { segment: 'FortiGate Firewall (fortigate-fw / 172.16.0.1) — WAN1 Throughput', isSuccess: true, status: 2, detail: '450 Mbps / 1 Gbps (45%), FortiGate 100F SNMP UP' },
        { segment: 'FortiGate Firewall (172.16.0.1) — WAN2 Backup Link', isSuccess: true, status: 2, detail: 'Standby, failover test passed, 0 drops' },
        { segment: 'srv-20 (fs-le-dev-srv20 / 172.16.0.20) — ICMP Ping', isSuccess: true, status: 2, detail: 'RTT: 0.4ms, Dell PowerEdge R740, iDRAC UP' },
        { segment: 'srv-13 (fs-le-dev-srv13 / 172.16.0.13) — ICMP Ping', isSuccess: true, status: 2, detail: 'RTT: 0.3ms, HPE ProLiant DL380, iLO UP' },
        { segment: 'srv-75 (fs-le-dev-srv75 / 172.16.0.75) — ICMP Ping', isSuccess: false, status: 0, detail: 'TIMEOUT — Node exporter DOWN, server in maintenance' },
        { segment: 'win-srv-57 (fs-le-win-srv57 / 172.16.0.57) — ICMP Ping', isSuccess: false, status: 1, detail: 'RTT: 12.4ms (high), Windows Exporter DOWN' },
      ],
      lastUpdated: ago(3),
    },
    {
      key: 'prod:BOD:DNS-Resolution',
      name: 'DNS Resolution',
      status: 'UP',
      statusCode: 2,
      executedOn: ago(1),
      type: 'table',
      message: 'All DNS checks passed',
      data: [
        { segment: 'Internal DNS - finspot.in A record', isSuccess: true, status: 2, detail: 'Resolved in 2ms' },
        { segment: 'External DNS - google.com resolution', isSuccess: true, status: 2, detail: 'Resolved in 8ms' },
        { segment: 'Reverse DNS - PTR for 10.0.1.1', isSuccess: true, status: 2, detail: 'gw.finspot.in' },
        { segment: 'DNS Zone Transfer - Secondary sync', isSuccess: true, status: 2, detail: 'Serial 2026040501, in sync' },
      ],
      lastUpdated: ago(1),
    },
    {
      key: 'prod:BOD:NTP-Sync',
      name: 'NTP Sync',
      status: 'UP',
      statusCode: 2,
      executedOn: ago(4),
      type: 'table',
      message: 'Time synchronization nominal',
      data: [
        { segment: 'Primary NTP Server (ntp1.finspot.in)', isSuccess: true, status: 2, detail: 'Offset: +0.003s' },
        { segment: 'Secondary NTP Server (ntp2.finspot.in)', isSuccess: true, status: 2, detail: 'Offset: -0.001s' },
        { segment: 'Max Clock Skew Across Nodes', isSuccess: true, status: 2, detail: '4.8ms (threshold: 50ms)' },
        { segment: 'Stratum Level', isSuccess: true, status: 2, detail: 'Stratum 2' },
      ],
      lastUpdated: ago(4),
    },
    {
      key: 'prod:BOD:Backup-Verification',
      name: 'Backup Verification',
      status: 'WARNING',
      statusCode: 1,
      executedOn: ago(8),
      type: 'table',
      message: 'Incremental backup delayed by 12 min',
      data: [
        { segment: 'Full Backup (Last Night 02:00)', isSuccess: true, status: 2, detail: 'Completed in 38 min, 24.6 GB' },
        { segment: 'Incremental Backup (06:00)', isSuccess: false, status: 1, detail: 'Delayed by 12 min, completed at 06:12' },
        { segment: 'Backup Size Validation', isSuccess: true, status: 2, detail: '24.6 GB (within 5% of expected)' },
        { segment: 'Encryption Verification', isSuccess: true, status: 2, detail: 'AES-256, checksum verified' },
      ],
      lastUpdated: ago(8),
    },
    {
      key: 'prod:BOD:Certificate-Expiry',
      name: 'Certificate Expiry',
      status: 'UP',
      statusCode: 2,
      executedOn: ago(5),
      type: 'table',
      message: 'All certs valid, nearest expiry in 47 days',
      data: [
        { segment: '*.finspot.in - Wildcard SSL', isSuccess: true, status: 2, detail: 'Expires in 47 days (2026-05-22)' },
        { segment: 'API Gateway Certificate', isSuccess: true, status: 2, detail: 'Expires in 183 days (2026-10-05)' },
        { segment: 'Grafana Dashboard Certificate', isSuccess: true, status: 2, detail: 'Expires in 92 days (2026-07-06)' },
        { segment: 'Vault TLS Certificate', isSuccess: true, status: 2, detail: 'Expires in 210 days (2026-11-01)' },
      ],
      lastUpdated: ago(5),
    },
    {
      key: 'prod:BOD:Disk-Space',
      name: 'Disk Space',
      status: 'UP',
      statusCode: 2,
      executedOn: ago(2),
      type: 'table',
      message: 'All mount points within threshold',
      data: [
        { segment: 'fs-le-dev-finspot (172.16.0.56) — / (root)', isSuccess: true, status: 2, detail: '42% used (21 GB / 50 GB), Ubuntu 24.04' },
        { segment: 'fs-le-dev-finspot (172.16.0.56) — /data', isSuccess: true, status: 2, detail: '62% used (310 GB / 500 GB), K8s PVCs' },
        { segment: 'srv-20 (172.16.0.20) — / (root)', isSuccess: true, status: 2, detail: '38% used (19 GB / 50 GB), Dell R740' },
        { segment: 'srv-22 (172.16.0.22) — / (root)', isSuccess: true, status: 2, detail: '55% used (27 GB / 50 GB), Dell R740' },
        { segment: 'srv-13 (172.16.0.13) — / (root)', isSuccess: true, status: 2, detail: '29% used (14 GB / 50 GB), HPE DL380' },
        { segment: 'win-srv-10 (172.16.0.10) — C: drive', isSuccess: true, status: 2, detail: '51% used (102 GB / 200 GB), Windows Server' },
      ],
      lastUpdated: ago(2),
    },
    {
      key: 'prod:BOD:Memory-Usage',
      name: 'Memory Usage',
      status: 'WARNING',
      statusCode: 1,
      executedOn: ago(1),
      type: 'table',
      message: 'Heap usage at 78%, GC frequency elevated',
      data: [
        { segment: 'Physical Memory Utilization', isSuccess: false, status: 1, detail: '12.4 GB / 16 GB (78%) - above 75% threshold' },
        { segment: 'Swap Usage', isSuccess: true, status: 2, detail: '0.8 GB / 4 GB (20%)' },
        { segment: 'OOM Killer Events (24h)', isSuccess: true, status: 2, detail: '0 events' },
        { segment: 'Cache Utilization', isSuccess: false, status: 1, detail: '3.1 GB cached, GC running every 45s (normal: 120s)' },
      ],
      lastUpdated: ago(1),
    },
  ];

  // ── ADP Items ──────────────────────────────────────────

  const adp = [
    {
      key: 'prod:ADP:Trade-Settlement',
      name: 'Trade Settlement',
      status: 'UP',
      statusCode: 2,
      executedOn: ago(3),
      type: 'table',
      message: 'T+1 settlement processing on schedule',
      data: [
        { segment: 'Settlement Batch Processing', isSuccess: true, status: 2, detail: 'Batch #4021 completed, 1,247 trades settled' },
        { segment: 'Reconciliation Engine', isSuccess: true, status: 2, detail: 'All 1,247 trades reconciled, 0 breaks' },
        { segment: 'Funds Transfer - NEFT/RTGS', isSuccess: true, status: 2, detail: 'INR 84.3 Cr transferred, all acknowledged' },
        { segment: 'Confirmation Dispatch', isSuccess: true, status: 2, detail: '1,247 confirmations sent via email + SWIFT' },
      ],
      lastUpdated: ago(3),
    },
    {
      key: 'prod:ADP:Order-Processing',
      name: 'Order Processing',
      status: 'UP',
      statusCode: 2,
      executedOn: ago(1),
      type: 'table',
      message: 'Queue depth: 12, avg latency: 45ms',
      data: [
        { segment: 'Order Queue Depth', isSuccess: true, status: 2, detail: '12 orders in queue (threshold: 500)' },
        { segment: 'Pending Orders', isSuccess: true, status: 2, detail: '3 pending validation' },
        { segment: 'Failed Orders (24h)', isSuccess: true, status: 2, detail: '0 failures' },
        { segment: 'Retry Queue', isSuccess: true, status: 2, detail: '0 orders in retry' },
      ],
      lastUpdated: ago(1),
    },
    {
      key: 'prod:ADP:Risk-Calculation',
      name: 'Risk Calculation',
      status: 'WARNING',
      statusCode: 1,
      executedOn: ago(6),
      type: 'table',
      message: 'VaR engine running 8% slower than baseline',
      data: [
        { segment: 'VaR Computation (95% CI)', isSuccess: true, status: 2, detail: 'Portfolio VaR: INR 2.1 Cr, computed in 34s' },
        { segment: 'Margin Requirements', isSuccess: true, status: 2, detail: 'Total margin: INR 12.8 Cr, adequate' },
        { segment: 'Stress Test Scenario Run', isSuccess: false, status: 1, detail: 'Completed in 4m 12s (baseline: 3m 52s, +8.6%)' },
        { segment: 'Exposure Limits Check', isSuccess: true, status: 2, detail: 'All counterparty limits within bounds' },
      ],
      lastUpdated: ago(6),
    },
    {
      key: 'prod:ADP:Margin-Call',
      name: 'Margin Call',
      status: 'UP',
      statusCode: 2,
      executedOn: ago(12),
      type: 'table',
      message: 'All margin calls processed before cutoff',
      data: [
        { segment: 'Margin Deficit Check', isSuccess: true, status: 2, detail: '2 accounts with deficit, total INR 45L' },
        { segment: 'Call Generation', isSuccess: true, status: 2, detail: '2 margin calls generated' },
        { segment: 'Notification Dispatch', isSuccess: true, status: 2, detail: 'Email + SMS sent to 2 counterparties' },
        { segment: 'Escalation Status', isSuccess: true, status: 2, detail: 'No escalation needed, all within T+0 window' },
      ],
      lastUpdated: ago(12),
    },
    {
      key: 'prod:ADP:Market-Data-Feed',
      name: 'Market Data Feed',
      status: 'UP',
      statusCode: 2,
      executedOn: ago(0.5),
      type: 'table',
      message: 'Real-time feed latency: 2ms',
      data: [
        { segment: 'NSE Feed Status', isSuccess: true, status: 2, detail: 'Connected, 12,450 ticks/sec' },
        { segment: 'BSE Feed Status', isSuccess: true, status: 2, detail: 'Connected, 3,820 ticks/sec' },
        { segment: 'Feed Latency (P99)', isSuccess: true, status: 2, detail: '2.1ms (threshold: 10ms)' },
        { segment: 'Data Freshness', isSuccess: true, status: 2, detail: 'Last tick: 0.3s ago' },
      ],
      lastUpdated: ago(0.5),
    },
  ];

  // ── EOD Items ──────────────────────────────────────────

  const eod = [
    {
      key: 'prod:EOD:Log-Rotation',
      name: 'Log Rotation',
      status: 'UP',
      statusCode: 2,
      executedOn: ago(15),
      type: 'table',
      message: 'Rotated 14 log files successfully',
      data: [
        { segment: 'Application Logs Rotated', isSuccess: true, status: 2, detail: '8 files rotated, oldest archived (7d retention)' },
        { segment: 'System Logs Archived', isSuccess: true, status: 2, detail: '6 files compressed to /archive/2026-04-04/' },
        { segment: 'Compressed Size', isSuccess: true, status: 2, detail: '2.8 GB compressed from 18.4 GB (85% ratio)' },
        { segment: 'Retention Policy Check', isSuccess: true, status: 2, detail: '30-day retention enforced, 12 old archives purged' },
      ],
      lastUpdated: ago(15),
    },
    {
      key: 'prod:EOD:Backup-Completion',
      name: 'Backup Completion',
      status: 'UP',
      statusCode: 2,
      executedOn: ago(20),
      type: 'table',
      message: 'Full backup completed in 42 min',
      data: [
        { segment: 'Full DB Backup (pg_dump)', isSuccess: true, status: 2, detail: '24.6 GB, completed in 38 min' },
        { segment: 'File System Backup (/data)', isSuccess: true, status: 2, detail: '142 GB incremental, 4 min' },
        { segment: 'Offsite Replication (S3)', isSuccess: true, status: 2, detail: 'Replicated to ap-south-1, verified' },
        { segment: 'Checksum Verification', isSuccess: true, status: 2, detail: 'SHA-256 match confirmed for all artifacts' },
      ],
      lastUpdated: ago(20),
    },
    {
      key: 'prod:EOD:Report-Generation',
      name: 'Report Generation',
      status: 'UP',
      statusCode: 2,
      executedOn: ago(18),
      type: 'table',
      message: 'All daily reports generated',
      data: [
        { segment: 'Daily P&L Report', isSuccess: true, status: 2, detail: 'Generated, emailed to 14 recipients' },
        { segment: 'MIS Report', isSuccess: true, status: 2, detail: 'Generated, uploaded to SharePoint' },
        { segment: 'Regulatory Report (SEBI)', isSuccess: true, status: 2, detail: 'Generated, pending manual review' },
        { segment: 'Audit Trail Report', isSuccess: true, status: 2, detail: '4,821 events logged, PDF generated' },
      ],
      lastUpdated: ago(18),
    },
    {
      key: 'prod:EOD:Alert-Summary',
      name: 'Alert Summary',
      status: 'CRITICAL',
      statusCode: 0,
      executedOn: ago(10),
      type: 'table',
      message: '3 unresolved P1 alerts pending review',
      data: [
        { segment: 'Total Alerts Today', isSuccess: true, status: 2, detail: '47 alerts triggered' },
        { segment: 'Critical Alerts Resolved', isSuccess: false, status: 0, detail: '5 of 8 critical resolved, 3 UNRESOLVED' },
        { segment: 'Open Warnings', isSuccess: false, status: 1, detail: '12 warnings still open' },
        { segment: 'Escalated to Management', isSuccess: false, status: 0, detail: '2 P1 alerts escalated, awaiting response' },
      ],
      lastUpdated: ago(10),
    },
    {
      key: 'prod:EOD:Incident-Review',
      name: 'Incident Review',
      status: 'UP',
      statusCode: 2,
      executedOn: ago(25),
      type: 'table',
      message: 'All incidents triaged and assigned',
      data: [
        { segment: 'Open P1 Incidents', isSuccess: true, status: 2, detail: '0 open (1 resolved today)' },
        { segment: 'Open P2 Incidents', isSuccess: true, status: 2, detail: '2 open, both within SLA' },
        { segment: 'SLA Breaches (24h)', isSuccess: true, status: 2, detail: '0 breaches' },
        { segment: 'Pending Approvals', isSuccess: true, status: 2, detail: '1 change request pending CAB approval' },
      ],
      lastUpdated: ago(25),
    },
  ];

  // ── URL Health ─────────────────────────────────────────

  const urlHealth = [
    { url: 'https://argus.inc.rmadhu.in', name: 'Argus ITSM Web', ip: '172.16.0.56 (Ingress)', httpStatus: 200, status: 'UP', statusCode: 2, responseTime: 145, lastChecked: ago(1) },
    { url: 'https://argus.inc.api.rmadhu.in/health', name: 'Argus ITSM API', ip: '172.16.0.56 (Ingress)', httpStatus: 200, status: 'UP', statusCode: 2, responseTime: 42, lastChecked: ago(1) },
    { url: 'https://argus.inc.mob.rmadhu.in', name: 'Argus Mobile Portal', ip: '172.16.0.56 (Ingress)', httpStatus: 200, status: 'UP', statusCode: 2, responseTime: 98, lastChecked: ago(1) },
    { url: 'http://grafana.fs-linkedeye.svc.cluster.local:3000/api/health', name: 'Grafana Monitoring', ip: '10.111.132.233 (ClusterIP)', httpStatus: 200, status: 'UP', statusCode: 2, responseTime: 89, lastChecked: ago(2) },
    { url: 'http://prometheus-svc.fs-linkedeye.svc.cluster.local:8080/api/v1/status/config', name: 'Prometheus', ip: '10.111.216.212 (ClusterIP)', httpStatus: 200, status: 'UP', statusCode: 2, responseTime: 34, lastChecked: ago(1) },
    { url: 'http://postgres.inc-raj-itsm-finspot.svc.cluster.local:5432', name: 'PostgreSQL Database', ip: '10.106.233.77 (ClusterIP)', httpStatus: 200, status: 'UP', statusCode: 2, responseTime: 3, lastChecked: ago(1) },
    { url: 'http://redis.inc-raj-itsm-finspot.svc.cluster.local:6379', name: 'Redis Cache', ip: '10.96.68.212 (ClusterIP)', httpStatus: 200, status: 'UP', statusCode: 2, responseTime: 1, lastChecked: ago(1) },
    { url: 'http://ollama.fs-linkedeye.svc.cluster.local:11434/api/tags', name: 'Ollama LLM (Qwen3 8B)', ip: '10.102.172.136 (ClusterIP)', httpStatus: 200, status: 'UP', statusCode: 2, responseTime: 67, lastChecked: ago(1) },
    { url: 'https://fs-le-dev-vault.finspot.in/v1/sys/health', name: 'HashiCorp Vault', ip: '172.16.0.56:30200 (NodePort)', httpStatus: 200, status: 'UP', statusCode: 2, responseTime: 112, lastChecked: ago(2) },
    { url: 'https://fs-le-dev-keycloak.finspot.in/realms/master', name: 'Keycloak SSO', ip: '172.16.0.56:30081 (NodePort)', httpStatus: 200, status: 'UP', statusCode: 2, responseTime: 234, lastChecked: ago(2) },
  ];

  return {
    bod,
    eod,
    adp,
    urlHealth,
    simulated: true,
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  getBodEodOverview,
  getUrlCheckerStatus,
  getMockBodEodData,
};
