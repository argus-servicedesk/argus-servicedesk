const https = require('https');
const API_BASE = 'https://fs-le-dev-inc-api.finspot.in/api/v1';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function apiRequest(method, path, body, token, orgId) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (orgId) headers['X-Organization-Id'] = orgId;
    const options = { hostname: url.hostname, port: 443, path: url.pathname + url.search, method, headers, rejectUnauthorized: false };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve({ raw: data }); } });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Assets WITHOUT environment/criticality (those cause 500 — possibly migration not applied)
const ORG_ASSETS = {
  'TechVista Solutions': {
    id: '3d300249-b75a-4cdb-a955-cabc3406912c',
    assets: [
      { name: 'prod-db-master-01', type: 'DATABASE', status: 'LIVE', hostname: 'prod-db-master-01.techvista.internal', ipAddress: '10.0.1.10', cpu: '16 vCPU', memory: '64 GB', storage: '2 TB NVMe', os: 'Ubuntu', osVersion: '22.04 LTS', description: 'Primary MySQL production database server' },
      { name: 'k8s-worker-pool-a', type: 'SERVER', status: 'LIVE', hostname: 'k8s-worker-a.techvista.internal', ipAddress: '10.0.2.20', cpu: '32 vCPU', memory: '128 GB', storage: '500 GB SSD', os: 'Ubuntu', osVersion: '22.04 LTS', description: 'Kubernetes worker node pool A' },
      { name: 'core-api-gateway', type: 'APPLICATION', status: 'LIVE', description: 'Kong API Gateway handling all ingress traffic' },
      { name: 'office-switch-floor2', type: 'NETWORK', status: 'LIVE', hostname: 'sw-floor2.techvista.internal', ipAddress: '10.0.100.2', manufacturer: 'Cisco', model: 'Catalyst 9300', description: 'Floor 2 access layer switch' },
      { name: 'staging-app-cluster', type: 'KUBERNETES_CLUSTER', status: 'LIVE', description: 'Staging K8s cluster for pre-prod testing' },
    ],
  },
  'CloudNine Infra': {
    id: 'dbd3c760-6a07-496c-b60b-8f8faff3a620',
    assets: [
      { name: 'core-router-dc-east', type: 'NETWORK', status: 'LIVE', hostname: 'cr-east-01.cloudnine.internal', ipAddress: '10.10.0.1', manufacturer: 'Juniper', model: 'MX480', description: 'Core router for DC-East' },
      { name: 'fw-dc-east-primary', type: 'NETWORK', status: 'LIVE', hostname: 'fw-east-01.cloudnine.internal', ipAddress: '10.10.0.5', manufacturer: 'Palo Alto', model: 'PA-5220', description: 'Primary firewall DC-East' },
      { name: 'nms-server-01', type: 'SERVER', status: 'LIVE', hostname: 'nms-01.cloudnine.internal', ipAddress: '10.10.10.50', cpu: '8 vCPU', memory: '32 GB', os: 'CentOS', osVersion: '8 Stream', description: 'Network management system' },
      { name: 'dns-primary', type: 'SERVER', status: 'LIVE', hostname: 'dns-01.cloudnine.internal', ipAddress: '10.10.10.53', cpu: '4 vCPU', memory: '8 GB', os: 'Ubuntu', osVersion: '22.04', description: 'Primary DNS resolver' },
    ],
  },
  'MediTrack Health Systems': {
    id: 'b2cee3c1-c95e-4811-9f0e-de635f87c370',
    assets: [
      { name: 'ehr-app-server-01', type: 'SERVER', status: 'LIVE', hostname: 'ehr-app-01.meditrack.internal', ipAddress: '172.16.1.10', cpu: '24 vCPU', memory: '96 GB', storage: '1 TB SSD', os: 'Windows Server', osVersion: '2022', description: 'EHR application server' },
      { name: 'pacs-storage-array', type: 'STORAGE', status: 'LIVE', hostname: 'pacs-store.meditrack.internal', ipAddress: '172.16.1.20', storage: '50 TB', manufacturer: 'NetApp', model: 'FAS8200', description: 'PACS medical image storage' },
      { name: 'ehr-database-cluster', type: 'DATABASE', status: 'LIVE', hostname: 'ehr-db.meditrack.internal', ipAddress: '172.16.1.30', cpu: '32 vCPU', memory: '256 GB', storage: '5 TB NVMe', os: 'Oracle Linux', osVersion: '8.6', description: 'Oracle RAC database for EHR' },
      { name: 'patient-portal-web', type: 'APPLICATION', status: 'LIVE', description: 'Patient-facing portal for appointments records and messaging' },
    ],
  },
  'FinEdge Banking': {
    id: 'f4916a85-4e94-4ce0-acc3-5cebcb8df881',
    assets: [
      { name: 'cbs-finacle-primary', type: 'SERVER', status: 'LIVE', hostname: 'cbs-primary.finedge.internal', ipAddress: '192.168.1.10', cpu: '64 vCPU', memory: '512 GB', storage: '10 TB SAN', os: 'AIX', osVersion: '7.3', description: 'Infosys Finacle Core Banking Server' },
      { name: 'payment-gateway-cluster', type: 'APPLICATION', status: 'LIVE', description: 'Payment processing cluster handling UPI NEFT RTGS IMPS' },
      { name: 'atm-switch-base24', type: 'APPLICATION', status: 'LIVE', description: 'ACI Base24 ATM POS switching platform' },
      { name: 'hsm-thales-payshield', type: 'SERVER', status: 'LIVE', hostname: 'hsm-01.finedge.internal', ipAddress: '192.168.1.50', manufacturer: 'Thales', model: 'payShield 10K', description: 'Hardware Security Module for cryptographic operations' },
      { name: 'mobile-banking-api', type: 'APPLICATION', status: 'LIVE', description: 'REST API backend for mobile banking app' },
    ],
  },
  'EduSpark Academy': {
    id: 'a73beb76-df70-4471-b7f6-df850e9417fc',
    assets: [
      { name: 'lms-moodle-server', type: 'SERVER', status: 'LIVE', hostname: 'lms.eduspark.internal', ipAddress: '10.20.1.10', cpu: '8 vCPU', memory: '32 GB', storage: '500 GB', os: 'Ubuntu', osVersion: '22.04', description: 'Moodle LMS production server' },
      { name: 'student-erp-db', type: 'DATABASE', status: 'LIVE', hostname: 'erp-db.eduspark.internal', ipAddress: '10.20.1.20', cpu: '8 vCPU', memory: '32 GB', storage: '1 TB', os: 'Ubuntu', osVersion: '22.04', description: 'PostgreSQL database for Student ERP' },
      { name: 'campus-wifi-controller', type: 'NETWORK', status: 'LIVE', hostname: 'wifi-ctrl.eduspark.internal', ipAddress: '10.20.100.1', manufacturer: 'Aruba', model: 'Mobility Controller 7210', description: 'Centralized WiFi controller for campus' },
      { name: 'video-lecture-cdn', type: 'APPLICATION', status: 'LIVE', description: 'Kaltura-based video streaming for recorded lectures' },
    ],
  },
};

async function main() {
  console.log('=== Seeding Assets (without environment/criticality) ===\n');

  const login = await apiRequest('POST', '/auth/login', { email: 'rajkumar@santhira.com', password: 'Admin@123' });
  const TOKEN = login.data.accessToken;

  // First, delete the test assets from TechVista
  console.log('Cleaning up test assets from TechVista...');
  const testAssets = await apiRequest('GET', '/assets?limit=50', null, TOKEN, '3d300249-b75a-4cdb-a955-cabc3406912c');
  if (testAssets.data) {
    for (const a of testAssets.data) {
      if (a.name.startsWith('test-') || a.name.startsWith('full-test')) {
        await apiRequest('DELETE', `/assets/${a.id}`, null, TOKEN, '3d300249-b75a-4cdb-a955-cabc3406912c');
        console.log(`  Deleted test asset: ${a.name}`);
        await sleep(300);
      }
    }
  }

  for (const [orgName, data] of Object.entries(ORG_ASSETS)) {
    console.log(`\n${orgName} (${data.id}):`);

    // Check existing
    const check = await apiRequest('GET', '/assets?limit=1', null, TOKEN, data.id);
    const realAssets = (check.data || []).filter(a => !a.name.startsWith('test-') && !a.name.startsWith('full-test'));
    if (realAssets.length > 0) {
      console.log(`  [SKIP] Already has ${realAssets.length} real asset(s)`);
      continue;
    }

    for (const asset of data.assets) {
      await sleep(500);
      const res = await apiRequest('POST', '/assets', asset, TOKEN, data.id);
      if (res.success && res.data) {
        console.log(`  [OK] ${asset.name} (${asset.type}) -> ${res.data.id}`);
      } else {
        console.log(`  [FAIL] ${asset.name}: ${JSON.stringify(res)}`);
      }
    }
  }

  console.log('\n=== Assets seeding complete ===');
}

main().catch(console.error);
