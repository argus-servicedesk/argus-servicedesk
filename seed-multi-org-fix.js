#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — Multi-Org Seed Script (Fixed)
// Fixes: correct enum values, rate limiting delays
// Seeds: incidents, assets, alerts for orgs created earlier
// ═══════════════════════════════════════════════════════════

const https = require('https');

const API_BASE = 'https://fs-le-dev-inc-api.finspot.in/api/v1';
const ADMIN_EMAIL = 'rajkumar@santhira.com';
const ADMIN_PASSWORD = 'Admin@123';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function apiRequest(method, path, body, token, orgId) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (orgId) headers['X-Organization-Id'] = orgId;

    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method,
      headers,
      rejectUnauthorized: false,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { resolve({ raw: data, statusCode: res.statusCode }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Corrected enums:
// Impact: ENTERPRISE, DEPARTMENT, TEAM, INDIVIDUAL
// Urgency: CRITICAL, HIGH, MEDIUM, LOW
// CIStatus: LIVE, MAINTENANCE, DECOMMISSIONED, PLANNED, IN_STOCK, DISPOSED, RESERVED, IN_TRANSIT
// Environment: PROD, DR, UAT, STAGING, DEV
// Criticality: HIGH, MEDIUM, LOW

const ORG_DATA = {
  'TechVista Solutions': {
    id: '3d300249-b75a-4cdb-a955-cabc3406912c',
    incidents: [
      { shortDescription: 'Production database connection pool exhausted', impact: 'ENTERPRISE', urgency: 'CRITICAL', description: 'MySQL connection pool hitting max limit of 200 connections. Application throwing connection timeout errors. Affecting all microservices.' },
      { shortDescription: 'SSL certificate expiring in 48 hours for api.techvista.com', impact: 'DEPARTMENT', urgency: 'HIGH', description: 'Lets Encrypt certificate for the main API domain expires April 10. Auto-renewal cron failed due to DNS validation issue.' },
      { shortDescription: 'Memory leak in payment processing service v2.4.1', impact: 'ENTERPRISE', urgency: 'HIGH', description: 'Payment service consuming 12GB RAM after 6 hours uptime. Heap dumps show growing HashMap in transaction cache. Requires restart every 6h.' },
      { shortDescription: 'Intermittent 502 errors on load balancer during peak hours', impact: 'DEPARTMENT', urgency: 'MEDIUM', description: 'Nginx ingress controller returning 502 Bad Gateway for 3-5% of requests between 10AM-2PM IST. Backend pods healthy.' },
      { shortDescription: 'Grafana dashboard loading slowly after data source migration', impact: 'INDIVIDUAL', urgency: 'LOW', description: 'After migrating from InfluxDB to Prometheus, some dashboards take 30+ seconds to load due to unoptimized PromQL queries.' },
    ],
    assets: [
      { name: 'prod-db-master-01', type: 'DATABASE', status: 'LIVE', hostname: 'prod-db-master-01.techvista.internal', ipAddress: '10.0.1.10', cpu: '16 vCPU', memory: '64 GB', storage: '2 TB NVMe', os: 'Ubuntu', osVersion: '22.04 LTS', environment: 'PROD', criticality: 'HIGH' },
      { name: 'k8s-worker-pool-a', type: 'SERVER', status: 'LIVE', hostname: 'k8s-worker-a.techvista.internal', ipAddress: '10.0.2.20', cpu: '32 vCPU', memory: '128 GB', storage: '500 GB SSD', os: 'Ubuntu', osVersion: '22.04 LTS', environment: 'PROD', criticality: 'HIGH' },
      { name: 'core-api-gateway', type: 'APPLICATION', status: 'LIVE', description: 'Kong API Gateway handling all ingress traffic', environment: 'PROD', criticality: 'HIGH' },
      { name: 'office-switch-floor2', type: 'NETWORK', status: 'LIVE', hostname: 'sw-floor2.techvista.internal', ipAddress: '10.0.100.2', manufacturer: 'Cisco', model: 'Catalyst 9300', environment: 'PROD', criticality: 'MEDIUM' },
      { name: 'staging-app-cluster', type: 'KUBERNETES_CLUSTER', status: 'LIVE', description: 'Staging K8s cluster for pre-prod testing', environment: 'STAGING', criticality: 'LOW' },
    ],
  },
  'CloudNine Infra': {
    id: 'dbd3c760-6a07-496c-b60b-8f8faff3a620',
    incidents: [
      { shortDescription: 'BGP peering session down with upstream ISP AS64512', impact: 'ENTERPRISE', urgency: 'CRITICAL', description: 'BGP session with primary ISP flapping since 03:00 UTC. Failover to secondary ISP active but bandwidth reduced by 60%.' },
      { shortDescription: 'VLAN 100 broadcast storm affecting DC-East rack C3', impact: 'ENTERPRISE', urgency: 'CRITICAL', description: 'Spanning tree misconfiguration causing broadcast storm. 40 servers in rack C3 experiencing packet loss >50%.' },
      { shortDescription: 'Firewall rule blocking legitimate API traffic from partner', impact: 'DEPARTMENT', urgency: 'HIGH', description: 'New WAF rule deployed yesterday blocking requests with specific User-Agent strings. Partner integration broken.' },
      { shortDescription: 'NTP synchronization drift on all DC-West servers', impact: 'TEAM', urgency: 'MEDIUM', description: 'NTP servers showing 500ms drift. Kerberos authentication intermittently failing due to clock skew.' },
    ],
    assets: [
      { name: 'core-router-dc-east', type: 'NETWORK', status: 'LIVE', hostname: 'cr-east-01.cloudnine.internal', ipAddress: '10.10.0.1', manufacturer: 'Juniper', model: 'MX480', environment: 'PROD', criticality: 'HIGH' },
      { name: 'fw-dc-east-primary', type: 'NETWORK', status: 'LIVE', hostname: 'fw-east-01.cloudnine.internal', ipAddress: '10.10.0.5', manufacturer: 'Palo Alto', model: 'PA-5220', environment: 'PROD', criticality: 'HIGH' },
      { name: 'nms-server-01', type: 'SERVER', status: 'LIVE', hostname: 'nms-01.cloudnine.internal', ipAddress: '10.10.10.50', cpu: '8 vCPU', memory: '32 GB', os: 'CentOS', osVersion: '8 Stream', environment: 'PROD', criticality: 'MEDIUM' },
      { name: 'dns-primary', type: 'SERVER', status: 'LIVE', hostname: 'dns-01.cloudnine.internal', ipAddress: '10.10.10.53', cpu: '4 vCPU', memory: '8 GB', os: 'Ubuntu', osVersion: '22.04', environment: 'PROD', criticality: 'HIGH' },
    ],
  },
  'MediTrack Health Systems': {
    id: 'b2cee3c1-c95e-4811-9f0e-de635f87c370',
    incidents: [
      { shortDescription: 'EHR system unresponsive for outpatient department', impact: 'ENTERPRISE', urgency: 'CRITICAL', description: 'Electronic Health Records system hanging on patient search queries. Outpatient clinicians unable to access patient histories. 200+ patients affected.' },
      { shortDescription: 'DICOM image transfer failing between radiology and PACS', impact: 'DEPARTMENT', urgency: 'HIGH', description: 'CT/MRI images not transferring to PACS server. Radiologists manually transferring via USB. Backlog of 150 studies.' },
      { shortDescription: 'Pharmacy dispensing system showing incorrect drug interactions', impact: 'DEPARTMENT', urgency: 'CRITICAL', description: 'Drug interaction database update from vendor corrupted. False positives blocking valid prescriptions.' },
      { shortDescription: 'Patient portal password reset emails not being delivered', impact: 'TEAM', urgency: 'MEDIUM', description: 'SMTP relay configuration changed by vendor. Patient portal users unable to reset passwords for 24 hours.' },
      { shortDescription: 'Biometric attendance system not syncing with HR payroll', impact: 'INDIVIDUAL', urgency: 'LOW', description: 'API integration between ZKTeco biometric devices and SAP HR module broken after SAP patch Tuesday update.' },
    ],
    assets: [
      { name: 'ehr-app-server-01', type: 'SERVER', status: 'LIVE', hostname: 'ehr-app-01.meditrack.internal', ipAddress: '172.16.1.10', cpu: '24 vCPU', memory: '96 GB', storage: '1 TB SSD', os: 'Windows Server', osVersion: '2022', environment: 'PROD', criticality: 'HIGH' },
      { name: 'pacs-storage-array', type: 'STORAGE', status: 'LIVE', hostname: 'pacs-store.meditrack.internal', ipAddress: '172.16.1.20', storage: '50 TB', manufacturer: 'NetApp', model: 'FAS8200', environment: 'PROD', criticality: 'HIGH' },
      { name: 'ehr-database-cluster', type: 'DATABASE', status: 'LIVE', hostname: 'ehr-db.meditrack.internal', ipAddress: '172.16.1.30', cpu: '32 vCPU', memory: '256 GB', storage: '5 TB NVMe', os: 'Oracle Linux', osVersion: '8.6', environment: 'PROD', criticality: 'HIGH' },
      { name: 'patient-portal-web', type: 'APPLICATION', status: 'LIVE', description: 'Patient-facing portal for appointments records and messaging', environment: 'PROD', criticality: 'MEDIUM' },
    ],
  },
  'FinEdge Banking': {
    id: 'f4916a85-4e94-4ce0-acc3-5cebcb8df881',
    incidents: [
      { shortDescription: 'NEFT RTGS batch processing stuck in queue for 2 hours', impact: 'ENTERPRISE', urgency: 'CRITICAL', description: 'RBI payment gateway batch file processing halted. 4500 transactions worth Rs 120 Cr pending. SLA breach imminent.' },
      { shortDescription: 'Mobile banking app crashing on Android 14 after OTP entry', impact: 'ENTERPRISE', urgency: 'HIGH', description: 'App crash affecting 35% of Android users. Stack trace shows null pointer in biometric module on Android 14 API level 34.' },
      { shortDescription: 'ATM switch showing duplicate transaction reversals', impact: 'DEPARTMENT', urgency: 'HIGH', description: 'Base24 ATM switch processing duplicate reversals for failed cash dispensations. 200 customers incorrectly debited twice.' },
      { shortDescription: 'Core banking EOD batch job failed at GL posting stage', impact: 'DEPARTMENT', urgency: 'MEDIUM', description: 'Finacle EOD job failed at stage 7 (GL posting). Interest calculation completed but GL entries not posted.' },
    ],
    assets: [
      { name: 'cbs-finacle-primary', type: 'SERVER', status: 'LIVE', hostname: 'cbs-primary.finedge.internal', ipAddress: '192.168.1.10', cpu: '64 vCPU', memory: '512 GB', storage: '10 TB SAN', os: 'AIX', osVersion: '7.3', environment: 'PROD', criticality: 'HIGH' },
      { name: 'payment-gateway-cluster', type: 'APPLICATION', status: 'LIVE', description: 'Payment processing cluster handling UPI NEFT RTGS IMPS', environment: 'PROD', criticality: 'HIGH' },
      { name: 'atm-switch-base24', type: 'APPLICATION', status: 'LIVE', description: 'ACI Base24 ATM POS switching platform', environment: 'PROD', criticality: 'HIGH' },
      { name: 'hsm-thales-payshield', type: 'SERVER', status: 'LIVE', hostname: 'hsm-01.finedge.internal', ipAddress: '192.168.1.50', manufacturer: 'Thales', model: 'payShield 10K', environment: 'PROD', criticality: 'HIGH' },
      { name: 'mobile-banking-api', type: 'APPLICATION', status: 'LIVE', description: 'REST API backend for mobile banking app', environment: 'PROD', criticality: 'HIGH' },
    ],
  },
  'EduSpark Academy': {
    id: 'a73beb76-df70-4471-b7f6-df850e9417fc',
    incidents: [
      { shortDescription: 'LMS Moodle server down during mid-semester examinations', impact: 'ENTERPRISE', urgency: 'CRITICAL', description: 'Moodle 4.3 server crashed during online exams. 2000 students mid-exam. Apache process killed by OOM killer.' },
      { shortDescription: 'Campus WiFi access points not broadcasting SSID in Block-C', impact: 'DEPARTMENT', urgency: 'MEDIUM', description: 'Aruba IAP-315 access points in Block-C not broadcasting. Controller shows APs in down state. Affects 500 students.' },
      { shortDescription: 'Student ERP fee payment gateway returning errors', impact: 'DEPARTMENT', urgency: 'HIGH', description: 'Payment gateway integration with SBI returning Transaction Declined for all card payments. UPI working.' },
      { shortDescription: 'Email forwarding rules creating mail loop for faculty', impact: 'INDIVIDUAL', urgency: 'LOW', description: 'Google Workspace forwarding rules misconfigured causing mail loops. 50 faculty accounts receiving duplicate emails.' },
    ],
    assets: [
      { name: 'lms-moodle-server', type: 'SERVER', status: 'LIVE', hostname: 'lms.eduspark.internal', ipAddress: '10.20.1.10', cpu: '8 vCPU', memory: '32 GB', storage: '500 GB', os: 'Ubuntu', osVersion: '22.04', environment: 'PROD', criticality: 'HIGH' },
      { name: 'student-erp-db', type: 'DATABASE', status: 'LIVE', hostname: 'erp-db.eduspark.internal', ipAddress: '10.20.1.20', cpu: '8 vCPU', memory: '32 GB', storage: '1 TB', os: 'Ubuntu', osVersion: '22.04', environment: 'PROD', criticality: 'HIGH' },
      { name: 'campus-wifi-controller', type: 'NETWORK', status: 'LIVE', hostname: 'wifi-ctrl.eduspark.internal', ipAddress: '10.20.100.1', manufacturer: 'Aruba', model: 'Mobility Controller 7210', environment: 'PROD', criticality: 'MEDIUM' },
      { name: 'video-lecture-cdn', type: 'APPLICATION', status: 'LIVE', description: 'Kaltura-based video streaming for recorded lectures', environment: 'PROD', criticality: 'MEDIUM' },
    ],
  },
};

async function main() {
  console.log('=== LinkedEye ITSM — Fix Seed (Incidents + Assets) ===\n');

  // Login
  console.log('Logging in...');
  const loginRes = await apiRequest('POST', '/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const TOKEN = loginRes.data.accessToken;
  console.log('Login OK.\n');

  for (const [orgName, data] of Object.entries(ORG_DATA)) {
    const orgId = data.id;
    console.log(`\n${'='.repeat(60)}`);
    console.log(`${orgName} (${orgId})`);
    console.log(`${'='.repeat(60)}`);

    // Check if incidents already exist
    const incCheck = await apiRequest('GET', '/incidents?limit=1', null, TOKEN, orgId);
    const hasIncidents = incCheck.success && incCheck.data && incCheck.data.length > 0;

    // Create assets first
    console.log('\n  >> Assets...');
    const assetIds = [];
    const assetCheck = await apiRequest('GET', '/assets?limit=1', null, TOKEN, orgId);
    if (assetCheck.success && assetCheck.data && assetCheck.data.length > 0) {
      console.log('     [SKIP] Assets already exist');
      // Get existing asset IDs
      const existingAssets = await apiRequest('GET', '/assets?limit=20', null, TOKEN, orgId);
      if (existingAssets.data) existingAssets.data.forEach(a => assetIds.push(a.id));
    } else {
      for (const asset of data.assets) {
        await sleep(500); // rate limit
        const res = await apiRequest('POST', '/assets', asset, TOKEN, orgId);
        if (res.success && res.data) {
          assetIds.push(res.data.id);
          console.log(`     [OK] ${asset.name} (${asset.type}) -> ${res.data.id}`);
        } else {
          console.log(`     [FAIL] ${asset.name}: ${JSON.stringify(res.error || res.details || res)}`);
        }
      }
    }

    // Create incidents
    if (hasIncidents) {
      console.log('\n  >> Incidents: [SKIP] already exist');
    } else {
      console.log('\n  >> Incidents...');
      for (let i = 0; i < data.incidents.length; i++) {
        await sleep(500);
        const inc = { ...data.incidents[i] };
        if (assetIds.length > 0) inc.configItemId = assetIds[i % assetIds.length];

        const res = await apiRequest('POST', '/incidents', inc, TOKEN, orgId);
        if (res.success && res.data) {
          console.log(`     [OK] ${res.data.number}: "${inc.shortDescription}" (${res.data.priority})`);

          // Update state for variety
          const states = ['NEW', 'OPEN', 'IN_PROGRESS', 'ON_HOLD', 'RESOLVED'];
          if (i > 0 && i < states.length) {
            await sleep(300);
            await apiRequest('PATCH', `/incidents/${res.data.id}`, { state: states[i] }, TOKEN, orgId);
          }
        } else {
          console.log(`     [FAIL] "${inc.shortDescription}": ${JSON.stringify(res.error || res.details || res)}`);
        }
      }
    }

    // Create alerts via webhook (simplified - without org resolution)
    console.log('\n  >> Alerts (direct DB via Prisma not available, using webhook)...');
    // We'll skip webhook alerts since they don't support org assignment via header
    // Instead, note that alerts were already attempted but the webhook doesn't support X-Organization-Id
    console.log('     [INFO] Webhook alerts require serverIp match or direct DB insert.');
    console.log('     [INFO] Skipping - alerts can be created later via Prometheus integration.');
  }

  // Also seed remaining items for EduSpark that got rate-limited
  console.log('\n\n>> Finishing EduSpark Academy rate-limited items...');
  const eduId = ORG_DATA['EduSpark Academy'].id;

  // Check if changes exist
  const chgCheck = await apiRequest('GET', '/changes?limit=1', null, TOKEN, eduId);
  if (!chgCheck.success || !chgCheck.data || chgCheck.data.length === 0) {
    console.log('  Creating changes for EduSpark...');
    const eduChanges = [
      { shortDescription: 'Migrate student email from on-prem Exchange to Google Workspace', type: 'NORMAL', riskLevel: 'MEDIUM', justification: 'On-premise Exchange 2016 reaching end of extended support.' },
      { shortDescription: 'Deploy new campus CCTV NVR system with AI analytics', type: 'STANDARD', riskLevel: 'LOW', justification: 'UGC mandate for AI-based surveillance on campus.' },
    ];
    for (const chg of eduChanges) {
      await sleep(500);
      const res = await apiRequest('POST', '/changes', chg, TOKEN, eduId);
      if (res.success && res.data) {
        console.log(`     [OK] CHG ${res.data.number}: "${chg.shortDescription}"`);
      } else {
        console.log(`     [FAIL] ${chg.shortDescription}: ${JSON.stringify(res.error || res)}`);
      }
    }
  } else {
    console.log('  [SKIP] EduSpark changes already exist');
  }

  // Check if problems exist
  const prbCheck = await apiRequest('GET', '/problems?limit=1', null, TOKEN, eduId);
  if (!prbCheck.success || !prbCheck.data || prbCheck.data.length === 0) {
    console.log('  Creating problems for EduSpark...');
    await sleep(500);
    const res = await apiRequest('POST', '/problems', {
      shortDescription: 'Moodle performance degradation with more than 500 concurrent users',
      priority: 'P2',
      description: 'Moodle response time exceeds 10 seconds when concurrent user count crosses 500.'
    }, TOKEN, eduId);
    if (res.success && res.data) {
      console.log(`     [OK] PRB ${res.data.number}: Moodle performance issue`);
    } else {
      console.log(`     [FAIL]: ${JSON.stringify(res.error || res)}`);
    }
  } else {
    console.log('  [SKIP] EduSpark problems already exist');
  }

  console.log('\n\n=== SEED FIX COMPLETE ===');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
