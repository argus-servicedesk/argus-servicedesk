#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — Multi-Org Seed Script
// Seeds realistic ITSM data for organizations that have no data
// ═══════════════════════════════════════════════════════════

const https = require('https');

const API_BASE = 'https://fs-le-dev-inc-api.finspot.in/api/v1';
const ADMIN_EMAIL = 'rajkumar@santhira.com';
const ADMIN_PASSWORD = 'Admin@123';

// Helper: make HTTPS request (ignoring self-signed certs)
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
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          resolve({ raw: data, statusCode: res.statusCode });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ── Organization-specific seed data ──────────────────────

const ORG_SEED_DATA = {
  'TechVista Solutions': {
    users: [
      { email: 'admin@techvista.com', password: 'TechVista@2026!', firstName: 'Priya', lastName: 'Sharma', role: 'ADMIN' },
      { email: 'ops@techvista.com', password: 'TechVista@2026!', firstName: 'Arjun', lastName: 'Patel', role: 'ENGINEER' },
      { email: 'viewer@techvista.com', password: 'TechVista@2026!', firstName: 'Sneha', lastName: 'Reddy', role: 'VIEWER' },
    ],
    team: { name: 'Platform Engineering', description: 'Manages cloud infrastructure and CI/CD pipelines' },
    incidents: [
      { shortDescription: 'Production database connection pool exhausted', impact: 'HIGH', urgency: 'HIGH', description: 'MySQL connection pool hitting max limit of 200 connections. Application throwing connection timeout errors. Affecting all microservices.' },
      { shortDescription: 'SSL certificate expiring in 48 hours for api.techvista.com', impact: 'MEDIUM', urgency: 'HIGH', description: 'Let\'s Encrypt certificate for the main API domain expires April 10. Auto-renewal cron failed due to DNS validation issue.' },
      { shortDescription: 'Memory leak in payment processing service v2.4.1', impact: 'HIGH', urgency: 'MEDIUM', description: 'Payment service consuming 12GB RAM after 6 hours uptime. Heap dumps show growing HashMap in transaction cache. Requires restart every 6h.' },
      { shortDescription: 'Intermittent 502 errors on load balancer during peak hours', impact: 'MEDIUM', urgency: 'MEDIUM', description: 'Nginx ingress controller returning 502 Bad Gateway for 3-5% of requests between 10AM-2PM IST. Backend pods healthy.' },
      { shortDescription: 'Grafana dashboard loading slowly after data source migration', impact: 'LOW', urgency: 'LOW', description: 'After migrating from InfluxDB to Prometheus, some dashboards take 30+ seconds to load due to unoptimized PromQL queries.' },
    ],
    changes: [
      { shortDescription: 'Upgrade Kubernetes cluster from 1.27 to 1.29', type: 'NORMAL', riskLevel: 'HIGH', justification: 'K8s 1.27 reaches EOL. Need to upgrade for security patches and new features.', implementationPlan: 'Rolling upgrade: control plane first, then worker nodes in batches of 3.' },
      { shortDescription: 'Enable Redis Sentinel for high availability', type: 'STANDARD', riskLevel: 'MEDIUM', justification: 'Current single-node Redis is a SPOF. Sentinel provides automatic failover.' },
      { shortDescription: 'Emergency patch for Log4j CVE-2024-XXXXX', type: 'EMERGENCY', riskLevel: 'HIGH', justification: 'Critical RCE vulnerability in Log4j affecting 12 Java microservices.' },
    ],
    problems: [
      { shortDescription: 'Recurring OOM kills in Java services after JDK 17 migration', priority: 'P2', description: 'Multiple Java services experiencing OOM kills since JDK 17 migration. Suspect ZGC memory accounting differs from G1GC.' },
      { shortDescription: 'DNS resolution failures during pod scaling events', priority: 'P3', description: 'CoreDNS intermittently fails to resolve internal service names when HPA scales pods rapidly. Causes cascading timeouts.' },
    ],
    assets: [
      { name: 'prod-db-master-01', type: 'DATABASE', status: 'ACTIVE', hostname: 'prod-db-master-01.techvista.internal', ipAddress: '10.0.1.10', cpu: '16 vCPU', memory: '64 GB', storage: '2 TB NVMe', os: 'Ubuntu', osVersion: '22.04 LTS', environment: 'PRODUCTION', criticality: 'HIGH' },
      { name: 'k8s-worker-pool-a', type: 'SERVER', status: 'ACTIVE', hostname: 'k8s-worker-a.techvista.internal', ipAddress: '10.0.2.20', cpu: '32 vCPU', memory: '128 GB', storage: '500 GB SSD', os: 'Ubuntu', osVersion: '22.04 LTS', environment: 'PRODUCTION', criticality: 'HIGH' },
      { name: 'core-api-gateway', type: 'APPLICATION', status: 'ACTIVE', description: 'Kong API Gateway handling all ingress traffic', environment: 'PRODUCTION', criticality: 'HIGH' },
      { name: 'office-switch-floor2', type: 'NETWORK', status: 'ACTIVE', hostname: 'sw-floor2.techvista.internal', ipAddress: '10.0.100.2', manufacturer: 'Cisco', model: 'Catalyst 9300', environment: 'PRODUCTION', criticality: 'MEDIUM' },
      { name: 'staging-app-cluster', type: 'KUBERNETES_CLUSTER', status: 'ACTIVE', description: 'Staging K8s cluster for pre-prod testing', environment: 'STAGING', criticality: 'LOW' },
    ],
    alerts: [
      { alertname: 'HighCPUUsage', severity: 'warning', instance: '10.0.2.20:9100', description: 'CPU usage above 85% for 10 minutes on k8s-worker-pool-a' },
      { alertname: 'DiskSpaceCritical', severity: 'critical', instance: '10.0.1.10:9100', description: 'Disk usage at 94% on prod-db-master-01 /data partition' },
      { alertname: 'HighMemoryUsage', severity: 'warning', instance: '10.0.2.20:9100', description: 'Memory usage above 90% on k8s-worker-pool-a' },
    ],
  },

  'CloudNine Infra': {
    users: [
      { email: 'admin@cloudnine.io', password: 'CloudNine@2026!', firstName: 'Vikram', lastName: 'Singh', role: 'ADMIN' },
      { email: 'engineer@cloudnine.io', password: 'CloudNine@2026!', firstName: 'Meera', lastName: 'Krishnan', role: 'ENGINEER' },
      { email: 'manager@cloudnine.io', password: 'CloudNine@2026!', firstName: 'Rohit', lastName: 'Gupta', role: 'MANAGER' },
    ],
    team: { name: 'NOC Operations', description: 'Network Operations Center - 24x7 monitoring and incident response' },
    incidents: [
      { shortDescription: 'BGP peering session down with upstream ISP AS64512', impact: 'HIGH', urgency: 'HIGH', description: 'BGP session with primary ISP flapping since 03:00 UTC. Failover to secondary ISP active but bandwidth reduced by 60%.' },
      { shortDescription: 'VLAN 100 broadcast storm affecting DC-East rack C3', impact: 'HIGH', urgency: 'HIGH', description: 'Spanning tree misconfiguration causing broadcast storm. 40 servers in rack C3 experiencing packet loss >50%.' },
      { shortDescription: 'Firewall rule blocking legitimate API traffic from partner network', impact: 'MEDIUM', urgency: 'HIGH', description: 'New WAF rule deployed yesterday blocking requests with specific User-Agent strings. Partner integration broken.' },
      { shortDescription: 'NTP synchronization drift on all DC-West servers', impact: 'LOW', urgency: 'MEDIUM', description: 'NTP servers showing 500ms drift. Kerberos authentication intermittently failing due to clock skew.' },
    ],
    changes: [
      { shortDescription: 'Migrate from physical firewalls to Palo Alto VM-Series', type: 'NORMAL', riskLevel: 'HIGH', justification: 'Physical Fortinet appliances reaching end of life. VM-Series provides better integration with cloud workloads.' },
      { shortDescription: 'Implement 802.1X NAC on all access ports', type: 'STANDARD', riskLevel: 'MEDIUM', justification: 'Security audit finding: unauthorized devices accessing production network.' },
    ],
    problems: [
      { shortDescription: 'Intermittent packet loss on inter-DC MPLS link', priority: 'P2', description: 'Random 1-3% packet loss on MPLS link between DC-East and DC-West. Carrier reports no issues. Suspect CRC errors on fiber.' },
    ],
    assets: [
      { name: 'core-router-dc-east', type: 'NETWORK', status: 'ACTIVE', hostname: 'cr-east-01.cloudnine.internal', ipAddress: '10.10.0.1', manufacturer: 'Juniper', model: 'MX480', environment: 'PRODUCTION', criticality: 'HIGH' },
      { name: 'fw-dc-east-primary', type: 'NETWORK', status: 'ACTIVE', hostname: 'fw-east-01.cloudnine.internal', ipAddress: '10.10.0.5', manufacturer: 'Palo Alto', model: 'PA-5220', environment: 'PRODUCTION', criticality: 'HIGH' },
      { name: 'nms-server-01', type: 'SERVER', status: 'ACTIVE', hostname: 'nms-01.cloudnine.internal', ipAddress: '10.10.10.50', cpu: '8 vCPU', memory: '32 GB', os: 'CentOS', osVersion: '8 Stream', environment: 'PRODUCTION', criticality: 'MEDIUM' },
      { name: 'dns-primary', type: 'SERVER', status: 'ACTIVE', hostname: 'dns-01.cloudnine.internal', ipAddress: '10.10.10.53', cpu: '4 vCPU', memory: '8 GB', os: 'Ubuntu', osVersion: '22.04', environment: 'PRODUCTION', criticality: 'HIGH' },
    ],
    alerts: [
      { alertname: 'BGPSessionDown', severity: 'critical', instance: '10.10.0.1:9100', description: 'BGP session with AS64512 has been down for 15 minutes' },
      { alertname: 'HighPacketLoss', severity: 'warning', instance: '10.10.0.1:9100', description: 'Packet loss above 2% on interface xe-0/0/1' },
    ],
  },

  'MediTrack Health Systems': {
    users: [
      { email: 'admin@meditrack.health', password: 'MediTrack@2026!', firstName: 'Dr. Anita', lastName: 'Desai', role: 'ADMIN' },
      { email: 'it.support@meditrack.health', password: 'MediTrack@2026!', firstName: 'Karthik', lastName: 'Nair', role: 'ENGINEER' },
      { email: 'compliance@meditrack.health', password: 'MediTrack@2026!', firstName: 'Rashmi', lastName: 'Joshi', role: 'MANAGER' },
    ],
    team: { name: 'Health IT Support', description: 'Clinical systems support and HIPAA compliance' },
    incidents: [
      { shortDescription: 'EHR system unresponsive for outpatient department', impact: 'HIGH', urgency: 'HIGH', description: 'Electronic Health Records system hanging on patient search queries. Outpatient clinicians unable to access patient histories. 200+ patients affected.' },
      { shortDescription: 'DICOM image transfer failing between radiology and PACS', impact: 'HIGH', urgency: 'MEDIUM', description: 'CT/MRI images not transferring to PACS server. Radiologists manually transferring via USB. Backlog of 150 studies.' },
      { shortDescription: 'Pharmacy dispensing system showing incorrect drug interactions', impact: 'MEDIUM', urgency: 'HIGH', description: 'Drug interaction database update from vendor corrupted. False positives blocking valid prescriptions.' },
      { shortDescription: 'Patient portal password reset emails not being delivered', impact: 'LOW', urgency: 'MEDIUM', description: 'SMTP relay configuration changed by vendor. Patient portal users unable to reset passwords for 24 hours.' },
      { shortDescription: 'Biometric attendance system not syncing with HR payroll', impact: 'LOW', urgency: 'LOW', description: 'API integration between ZKTeco biometric devices and SAP HR module broken after SAP patch Tuesday update.' },
    ],
    changes: [
      { shortDescription: 'Upgrade EHR system to version 12.3 with HL7 FHIR support', type: 'NORMAL', riskLevel: 'HIGH', justification: 'Regulatory requirement for FHIR R4 compliance by Q2 2026. Current version lacks interoperability features.' },
      { shortDescription: 'Deploy endpoint DLP agents on all clinical workstations', type: 'STANDARD', riskLevel: 'LOW', justification: 'HIPAA audit finding: need DLP on all endpoints handling PHI.' },
      { shortDescription: 'Emergency database recovery after ransomware attempt', type: 'EMERGENCY', riskLevel: 'HIGH', justification: 'Ransomware detected on file server. Need to isolate and restore from air-gapped backup.' },
    ],
    problems: [
      { shortDescription: 'HL7 ADT message processing delays during shift changes', priority: 'P2', description: 'ADT (Admit-Discharge-Transfer) messages queue up during 7AM and 7PM shift changes, causing 15-minute delays in bed management updates.' },
      { shortDescription: 'Recurring SSL handshake failures with state health information exchange', priority: 'P3', description: 'TLS 1.3 handshake intermittently fails when sending CCD documents to state HIE. Suspect certificate chain issue.' },
    ],
    assets: [
      { name: 'ehr-app-server-01', type: 'SERVER', status: 'ACTIVE', hostname: 'ehr-app-01.meditrack.internal', ipAddress: '172.16.1.10', cpu: '24 vCPU', memory: '96 GB', storage: '1 TB SSD', os: 'Windows Server', osVersion: '2022', environment: 'PRODUCTION', criticality: 'HIGH' },
      { name: 'pacs-storage-array', type: 'STORAGE', status: 'ACTIVE', hostname: 'pacs-store.meditrack.internal', ipAddress: '172.16.1.20', storage: '50 TB', manufacturer: 'NetApp', model: 'FAS8200', environment: 'PRODUCTION', criticality: 'HIGH' },
      { name: 'ehr-database-cluster', type: 'DATABASE', status: 'ACTIVE', hostname: 'ehr-db.meditrack.internal', ipAddress: '172.16.1.30', cpu: '32 vCPU', memory: '256 GB', storage: '5 TB NVMe', os: 'Oracle Linux', osVersion: '8.6', environment: 'PRODUCTION', criticality: 'HIGH' },
      { name: 'patient-portal-web', type: 'APPLICATION', status: 'ACTIVE', description: 'Patient-facing portal for appointments, records, and messaging', environment: 'PRODUCTION', criticality: 'MEDIUM' },
    ],
    alerts: [
      { alertname: 'HighDiskIOLatency', severity: 'critical', instance: '172.16.1.30:9100', description: 'Disk I/O latency above 50ms on EHR database server' },
      { alertname: 'SSLCertExpiringSoon', severity: 'warning', instance: '172.16.1.10:9100', description: 'SSL certificate for patient portal expires in 7 days' },
      { alertname: 'ServiceDown', severity: 'critical', instance: '172.16.1.20:9100', description: 'PACS DICOM listener service is not responding' },
    ],
  },

  'FinEdge Banking': {
    users: [
      { email: 'admin@finedge.bank', password: 'FinEdge@2026!!', firstName: 'Suresh', lastName: 'Menon', role: 'ADMIN' },
      { email: 'devops@finedge.bank', password: 'FinEdge@2026!!', firstName: 'Divya', lastName: 'Iyer', role: 'ENGINEER' },
      { email: 'risk@finedge.bank', password: 'FinEdge@2026!!', firstName: 'Amit', lastName: 'Chopra', role: 'MANAGER' },
    ],
    team: { name: 'Core Banking Operations', description: 'Manages CBS, payment gateways, and regulatory systems' },
    incidents: [
      { shortDescription: 'NEFT/RTGS batch processing stuck in queue for 2 hours', impact: 'HIGH', urgency: 'HIGH', description: 'RBI payment gateway batch file processing halted. 4,500 transactions worth Rs 120 Cr pending. SLA breach imminent.' },
      { shortDescription: 'Mobile banking app crashing on Android 14 after OTP entry', impact: 'HIGH', urgency: 'HIGH', description: 'App crash affecting 35% of Android users. Stack trace shows null pointer in biometric module on Android 14 API level 34.' },
      { shortDescription: 'ATM switch showing duplicate transaction reversals', impact: 'MEDIUM', urgency: 'HIGH', description: 'Base24 ATM switch processing duplicate reversals for failed cash dispensations. 200 customers incorrectly debited twice.' },
      { shortDescription: 'Core banking EOD batch job failed at GL posting stage', impact: 'MEDIUM', urgency: 'MEDIUM', description: 'Finacle EOD job failed at stage 7 (GL posting). Interest calculation completed but GL entries not posted. Manual intervention needed.' },
    ],
    changes: [
      { shortDescription: 'Implement PCI-DSS v4.0 compliant tokenization for card data', type: 'NORMAL', riskLevel: 'HIGH', justification: 'RBI mandate for PCI-DSS v4.0 compliance by March 2026. Current v3.2.1 implementation needs upgrade.' },
      { shortDescription: 'Deploy API gateway for UPI 3.0 mandate', type: 'NORMAL', riskLevel: 'HIGH', justification: 'NPCI requiring UPI 3.0 support with enhanced security. Deadline: June 2026.' },
      { shortDescription: 'Emergency hotfix for SWIFT message format validation', type: 'EMERGENCY', riskLevel: 'HIGH', justification: 'SWIFT ISO 20022 migration causing MT103 messages to fail validation. Cross-border payments blocked.' },
    ],
    problems: [
      { shortDescription: 'Intermittent timeout on IMPS transactions during peak hours', priority: 'P1', description: 'IMPS transactions timing out between 10AM-12PM and 5PM-7PM. Transaction success rate drops from 99.2% to 94.1% during peak.' },
      { shortDescription: 'Reconciliation mismatch between CBS and payment aggregator', priority: 'P2', description: 'Daily reconciliation showing Rs 2-5 Lakh mismatch between Finacle CBS and Razorpay settlements. Suspect timezone handling in API.' },
    ],
    assets: [
      { name: 'cbs-finacle-primary', type: 'SERVER', status: 'ACTIVE', hostname: 'cbs-primary.finedge.internal', ipAddress: '192.168.1.10', cpu: '64 vCPU', memory: '512 GB', storage: '10 TB SAN', os: 'AIX', osVersion: '7.3', environment: 'PRODUCTION', criticality: 'HIGH' },
      { name: 'payment-gateway-cluster', type: 'APPLICATION', status: 'ACTIVE', description: 'Payment processing cluster handling UPI, NEFT, RTGS, IMPS', environment: 'PRODUCTION', criticality: 'HIGH' },
      { name: 'atm-switch-base24', type: 'APPLICATION', status: 'ACTIVE', description: 'ACI Base24 ATM/POS switching platform', environment: 'PRODUCTION', criticality: 'HIGH' },
      { name: 'hsm-thales-payshield', type: 'SERVER', status: 'ACTIVE', hostname: 'hsm-01.finedge.internal', ipAddress: '192.168.1.50', manufacturer: 'Thales', model: 'payShield 10K', environment: 'PRODUCTION', criticality: 'HIGH' },
      { name: 'mobile-banking-api', type: 'APPLICATION', status: 'ACTIVE', description: 'REST API backend for mobile banking app (iOS/Android)', environment: 'PRODUCTION', criticality: 'HIGH' },
    ],
    alerts: [
      { alertname: 'HighTransactionLatency', severity: 'critical', instance: '192.168.1.10:9100', description: 'CBS transaction response time above 5 seconds for IMPS channel' },
      { alertname: 'QueueDepthHigh', severity: 'warning', instance: '192.168.1.10:9100', description: 'NEFT batch queue depth exceeds 5000 messages' },
      { alertname: 'HSMKeyExpiryWarning', severity: 'warning', instance: '192.168.1.50:9100', description: 'HSM master key rotation due in 15 days' },
    ],
  },

  'EduSpark Academy': {
    users: [
      { email: 'admin@eduspark.edu', password: 'EduSpark@2026!', firstName: 'Prof. Lakshmi', lastName: 'Venkatesh', role: 'ADMIN' },
      { email: 'helpdesk@eduspark.edu', password: 'EduSpark@2026!', firstName: 'Naveen', lastName: 'Kumar', role: 'ENGINEER' },
      { email: 'coordinator@eduspark.edu', password: 'EduSpark@2026!', firstName: 'Aparna', lastName: 'Bose', role: 'OPERATOR' },
    ],
    team: { name: 'Campus IT Services', description: 'Manages LMS, student portal, and campus network infrastructure' },
    incidents: [
      { shortDescription: 'LMS Moodle server down during mid-semester examinations', impact: 'HIGH', urgency: 'HIGH', description: 'Moodle 4.3 server crashed during online exams. 2,000 students mid-exam. Apache process killed by OOM killer. Database connections maxed out.' },
      { shortDescription: 'Campus Wi-Fi access points not broadcasting SSID in Block-C', impact: 'MEDIUM', urgency: 'MEDIUM', description: 'Aruba IAP-315 access points in Block-C (Computer Science dept) not broadcasting. Controller shows APs in "down" state. Affects 500 students.' },
      { shortDescription: 'Student ERP fee payment gateway returning errors', impact: 'MEDIUM', urgency: 'HIGH', description: 'Payment gateway integration with SBI returning "Transaction Declined" for all card payments. UPI working. Last day for fee payment tomorrow.' },
      { shortDescription: 'Email forwarding rules creating mail loop for faculty accounts', impact: 'LOW', urgency: 'LOW', description: 'Google Workspace forwarding rules misconfigured causing mail loops. 50 faculty accounts receiving duplicate emails.' },
    ],
    changes: [
      { shortDescription: 'Migrate student email from on-prem Exchange to Google Workspace', type: 'NORMAL', riskLevel: 'MEDIUM', justification: 'On-premise Exchange 2016 reaching end of extended support. Google Workspace Education Plus license already procured.' },
      { shortDescription: 'Deploy new campus CCTV NVR system with AI analytics', type: 'STANDARD', riskLevel: 'LOW', justification: 'UGC mandate for AI-based surveillance on campus. Current analog system inadequate.' },
    ],
    problems: [
      { shortDescription: 'Moodle performance degradation with more than 500 concurrent users', priority: 'P2', description: 'Moodle response time exceeds 10 seconds when concurrent user count crosses 500. Current capacity inadequate for exam periods with 3000+ users.' },
    ],
    assets: [
      { name: 'lms-moodle-server', type: 'SERVER', status: 'ACTIVE', hostname: 'lms.eduspark.internal', ipAddress: '10.20.1.10', cpu: '8 vCPU', memory: '32 GB', storage: '500 GB', os: 'Ubuntu', osVersion: '22.04', environment: 'PRODUCTION', criticality: 'HIGH' },
      { name: 'student-erp-db', type: 'DATABASE', status: 'ACTIVE', hostname: 'erp-db.eduspark.internal', ipAddress: '10.20.1.20', cpu: '8 vCPU', memory: '32 GB', storage: '1 TB', os: 'Ubuntu', osVersion: '22.04', environment: 'PRODUCTION', criticality: 'HIGH' },
      { name: 'campus-wifi-controller', type: 'NETWORK', status: 'ACTIVE', hostname: 'wifi-ctrl.eduspark.internal', ipAddress: '10.20.100.1', manufacturer: 'Aruba', model: 'Mobility Controller 7210', environment: 'PRODUCTION', criticality: 'MEDIUM' },
      { name: 'video-lecture-cdn', type: 'APPLICATION', status: 'ACTIVE', description: 'Kaltura-based video streaming for recorded lectures', environment: 'PRODUCTION', criticality: 'MEDIUM' },
    ],
    alerts: [
      { alertname: 'HighMemoryUsage', severity: 'critical', instance: '10.20.1.10:9100', description: 'Memory usage at 97% on Moodle LMS server during exam period' },
      { alertname: 'DiskSpaceWarning', severity: 'warning', instance: '10.20.1.20:9100', description: 'Disk usage at 82% on student ERP database server' },
    ],
  },
};

// ── Main seeding logic ────────────────────────────────────

async function main() {
  console.log('=== LinkedEye ITSM Multi-Org Seed Script ===\n');

  // 1. Login
  console.log('1. Logging in as super admin...');
  const loginRes = await apiRequest('POST', '/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  if (!loginRes.success && !loginRes.data?.accessToken) {
    console.error('Login failed:', JSON.stringify(loginRes));
    process.exit(1);
  }
  const TOKEN = loginRes.data.accessToken;
  console.log('   Login successful.\n');

  // 2. Get existing orgs
  console.log('2. Fetching existing organizations...');
  const orgsRes = await apiRequest('GET', '/organizations?limit=50', null, TOKEN);
  if (!orgsRes.success) {
    console.error('Failed to fetch orgs:', JSON.stringify(orgsRes));
    process.exit(1);
  }
  const existingOrgs = orgsRes.data || [];
  console.log(`   Found ${existingOrgs.length} existing org(s):`);
  existingOrgs.forEach(o => console.log(`     - ${o.name} (${o.id})`));
  console.log();

  // Build map of existing org names
  const existingOrgNames = new Set(existingOrgs.map(o => o.name));

  // 3. Create orgs that don't exist yet
  console.log('3. Creating organizations...');
  const orgMap = {}; // name -> id

  for (const orgName of Object.keys(ORG_SEED_DATA)) {
    if (existingOrgNames.has(orgName)) {
      const existing = existingOrgs.find(o => o.name === orgName);
      orgMap[orgName] = existing.id;
      console.log(`   [SKIP] "${orgName}" already exists (${existing.id})`);
    } else {
      const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
      const res = await apiRequest('POST', '/organizations', { name: orgName, slug }, TOKEN);
      if (res.success && res.data) {
        orgMap[orgName] = res.data.id;
        console.log(`   [CREATED] "${orgName}" -> ${res.data.id}`);
      } else {
        console.error(`   [ERROR] Creating "${orgName}":`, JSON.stringify(res));
        continue;
      }
    }
  }
  console.log();

  // 4. Seed data for each org
  for (const [orgName, seedData] of Object.entries(ORG_SEED_DATA)) {
    const orgId = orgMap[orgName];
    if (!orgId) {
      console.log(`   Skipping "${orgName}" — no org ID.`);
      continue;
    }

    console.log(`\n══════════════════════════════════════════`);
    console.log(`SEEDING: ${orgName} (${orgId})`);
    console.log(`══════════════════════════════════════════`);

    // Check if org already has data
    const incCheck = await apiRequest('GET', '/incidents?limit=1', null, TOKEN, orgId);
    if (incCheck.success && incCheck.data && incCheck.data.length > 0) {
      console.log(`   [SKIP] Org already has incident data. Skipping to avoid duplicates.`);
      continue;
    }

    // 4a. Register users
    console.log('\n  >> Registering users...');
    const userIds = [];
    for (const user of seedData.users) {
      const res = await apiRequest('POST', '/auth/register', user, TOKEN, orgId);
      if (res.success && res.data) {
        userIds.push(res.data.id);
        console.log(`     [OK] ${user.firstName} ${user.lastName} (${user.email}) -> ${res.data.id}`);
      } else {
        console.log(`     [WARN] ${user.email}: ${res.error || JSON.stringify(res)}`);
        // Try to get existing user list
      }
    }

    // Get all users for this org (in case some already existed)
    const usersRes = await apiRequest('GET', '/auth/users', null, TOKEN, orgId);
    const orgUsers = (usersRes.data || []).filter(u => u.id);
    console.log(`     Total users in org: ${orgUsers.length}`);

    // 4b. Create team
    console.log('\n  >> Creating team...');
    const teamRes = await apiRequest('POST', '/teams', seedData.team, TOKEN, orgId);
    if (teamRes.success && teamRes.data) {
      const teamId = teamRes.data.id;
      console.log(`     [OK] Team "${seedData.team.name}" -> ${teamId}`);

      // Add members
      for (let i = 0; i < Math.min(orgUsers.length, 2); i++) {
        const role = i === 0 ? 'LEAD' : 'MEMBER';
        const memberRes = await apiRequest('POST', `/teams/${teamId}/members`, { userId: orgUsers[i].id, role }, TOKEN, orgId);
        console.log(`     [MEMBER] ${orgUsers[i].firstName || orgUsers[i].email} as ${role}: ${memberRes.success ? 'OK' : memberRes.error || 'FAIL'}`);
      }
    } else {
      console.log(`     [WARN] Team creation: ${teamRes.error || JSON.stringify(teamRes)}`);
    }

    // 4c. Create assets
    console.log('\n  >> Creating assets...');
    const assetIds = [];
    for (const asset of seedData.assets) {
      const res = await apiRequest('POST', '/assets', asset, TOKEN, orgId);
      if (res.success && res.data) {
        assetIds.push(res.data.id);
        console.log(`     [OK] ${asset.name} (${asset.type}) -> ${res.data.id}`);
      } else {
        console.log(`     [WARN] ${asset.name}: ${res.error || JSON.stringify(res)}`);
      }
    }

    // 4d. Create incidents
    console.log('\n  >> Creating incidents...');
    const incidentIds = [];
    for (let i = 0; i < seedData.incidents.length; i++) {
      const inc = { ...seedData.incidents[i] };
      // Assign to a user and optionally link to an asset
      if (orgUsers.length > 1) inc.assignedToId = orgUsers[i % orgUsers.length]?.id;
      if (assetIds.length > 0) inc.configItemId = assetIds[i % assetIds.length];

      const res = await apiRequest('POST', '/incidents', inc, TOKEN, orgId);
      if (res.success && res.data) {
        incidentIds.push(res.data.id);
        console.log(`     [OK] INC ${res.data.number}: "${inc.shortDescription}" -> ${res.data.id}`);

        // Update state for variety
        const states = ['NEW', 'OPEN', 'IN_PROGRESS', 'ON_HOLD', 'RESOLVED'];
        if (i > 0 && i < states.length) {
          await apiRequest('PATCH', `/incidents/${res.data.id}`, { state: states[i] }, TOKEN, orgId);
          console.log(`          State -> ${states[i]}`);
        }
      } else {
        console.log(`     [WARN] "${inc.shortDescription}": ${res.error || JSON.stringify(res)}`);
      }
    }

    // 4e. Create changes
    console.log('\n  >> Creating changes...');
    for (let i = 0; i < seedData.changes.length; i++) {
      const chg = { ...seedData.changes[i] };
      if (orgUsers.length > 1) chg.assignedToId = orgUsers[i % orgUsers.length]?.id;

      const res = await apiRequest('POST', '/changes', chg, TOKEN, orgId);
      if (res.success && res.data) {
        console.log(`     [OK] CHG ${res.data.number}: "${chg.shortDescription}" (${chg.type}) -> ${res.data.id}`);
      } else {
        console.log(`     [WARN] "${chg.shortDescription}": ${res.error || JSON.stringify(res)}`);
      }
    }

    // 4f. Create problems
    console.log('\n  >> Creating problems...');
    for (let i = 0; i < seedData.problems.length; i++) {
      const prb = { ...seedData.problems[i] };
      if (orgUsers.length > 1) prb.assignedToId = orgUsers[i % orgUsers.length]?.id;

      const res = await apiRequest('POST', '/problems', prb, TOKEN, orgId);
      if (res.success && res.data) {
        console.log(`     [OK] PRB ${res.data.number}: "${prb.shortDescription}" (${prb.priority}) -> ${res.data.id}`);
      } else {
        console.log(`     [WARN] "${prb.shortDescription}": ${res.error || JSON.stringify(res)}`);
      }
    }

    // 4g. Create alerts via webhook
    console.log('\n  >> Creating alerts via webhook...');
    // Alerts via webhook don't support org header, so we'll use Prisma directly isn't possible.
    // Instead, we fire the webhook and they'll be unassigned to org.
    // Actually, the webhook resolves org from instance IP -> org.serverIp. We need direct DB.
    // Let's use the webhook anyway - they'll still show up as unscoped alerts.
    const webhookAlerts = seedData.alerts.map(a => ({
      status: 'firing',
      labels: {
        alertname: a.alertname,
        severity: a.severity,
        instance: a.instance || '127.0.0.1:9100',
        job: 'node_exporter',
        org_id: orgId,
      },
      annotations: {
        description: a.description,
        summary: a.description,
      },
      startsAt: new Date().toISOString(),
    }));

    const webhookRes = await apiRequest('POST', '/alerts/webhook', { alerts: webhookAlerts });
    if (webhookRes.success) {
      console.log(`     [OK] ${webhookRes.data?.processed || 0} alert(s) created via webhook`);
    } else {
      console.log(`     [WARN] Webhook: ${webhookRes.error || JSON.stringify(webhookRes)}`);
    }

    console.log(`\n  DONE seeding ${orgName}!`);
  }

  console.log('\n\n=== SEEDING COMPLETE ===');
  console.log('Summary of organizations seeded:');
  for (const [name, id] of Object.entries(orgMap)) {
    console.log(`  - ${name}: ${id}`);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
