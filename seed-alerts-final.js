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
      res.on('end', () => {
        console.log(`  [${res.statusCode}] ${data.substring(0, 200)}`);
        try { resolve(JSON.parse(data)); } catch(e) { resolve({ raw: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Alert webhook payloads per org. Since webhook can't assign org via header,
// alerts will be created without org assignment. But they'll still show up in the system.
// Each batch needs unique alertId (alertname:instance combo).

const ORG_ALERTS = [
  {
    orgName: 'TechVista',
    alerts: [
      { labels: { alertname: 'HighCPUUsage', severity: 'warning', instance: '10.0.2.20:9100', job: 'node_exporter' }, annotations: { description: 'CPU usage above 85% for 10 minutes on k8s-worker-pool-a', summary: 'High CPU on k8s-worker-pool-a' }, startsAt: new Date().toISOString(), status: 'firing' },
      { labels: { alertname: 'DiskSpaceCritical', severity: 'critical', instance: '10.0.1.10:9100', job: 'node_exporter' }, annotations: { description: 'Disk usage at 94% on prod-db-master-01 /data partition', summary: 'Critical disk space on DB server' }, startsAt: new Date().toISOString(), status: 'firing' },
      { labels: { alertname: 'HighMemoryUsage', severity: 'warning', instance: '10.0.2.21:9100', job: 'node_exporter' }, annotations: { description: 'Memory usage above 90% on k8s-worker-pool-b', summary: 'High memory on k8s worker' }, startsAt: new Date().toISOString(), status: 'firing' },
    ],
  },
  {
    orgName: 'CloudNine',
    alerts: [
      { labels: { alertname: 'BGPSessionDown', severity: 'critical', instance: '10.10.0.1:9100', job: 'snmp_exporter' }, annotations: { description: 'BGP session with AS64512 has been down for 15 minutes', summary: 'BGP peer down' }, startsAt: new Date().toISOString(), status: 'firing' },
      { labels: { alertname: 'HighPacketLoss', severity: 'warning', instance: '10.10.0.2:9100', job: 'snmp_exporter' }, annotations: { description: 'Packet loss above 2% on interface xe-0/0/1', summary: 'Packet loss on core link' }, startsAt: new Date().toISOString(), status: 'firing' },
    ],
  },
  {
    orgName: 'MediTrack',
    alerts: [
      { labels: { alertname: 'HighDiskIOLatency', severity: 'critical', instance: '172.16.1.30:9100', job: 'node_exporter' }, annotations: { description: 'Disk I/O latency above 50ms on EHR database server', summary: 'High disk latency on EHR DB' }, startsAt: new Date().toISOString(), status: 'firing' },
      { labels: { alertname: 'SSLCertExpiringSoon', severity: 'warning', instance: '172.16.1.10:9100', job: 'blackbox_exporter' }, annotations: { description: 'SSL certificate for patient portal expires in 7 days', summary: 'SSL cert expiring soon' }, startsAt: new Date().toISOString(), status: 'firing' },
      { labels: { alertname: 'ServiceDown', severity: 'critical', instance: '172.16.1.20:9100', job: 'node_exporter' }, annotations: { description: 'PACS DICOM listener service is not responding', summary: 'PACS service down' }, startsAt: new Date().toISOString(), status: 'firing' },
    ],
  },
  {
    orgName: 'FinEdge',
    alerts: [
      { labels: { alertname: 'HighTransactionLatency', severity: 'critical', instance: '192.168.1.10:9100', job: 'custom_exporter' }, annotations: { description: 'CBS transaction response time above 5 seconds for IMPS channel', summary: 'High CBS latency' }, startsAt: new Date().toISOString(), status: 'firing' },
      { labels: { alertname: 'QueueDepthHigh', severity: 'warning', instance: '192.168.1.11:9100', job: 'custom_exporter' }, annotations: { description: 'NEFT batch queue depth exceeds 5000 messages', summary: 'NEFT queue backup' }, startsAt: new Date().toISOString(), status: 'firing' },
      { labels: { alertname: 'HSMKeyExpiryWarning', severity: 'warning', instance: '192.168.1.50:9100', job: 'custom_exporter' }, annotations: { description: 'HSM master key rotation due in 15 days', summary: 'HSM key rotation needed' }, startsAt: new Date().toISOString(), status: 'firing' },
    ],
  },
  {
    orgName: 'EduSpark',
    alerts: [
      { labels: { alertname: 'HighMemoryUsageLMS', severity: 'critical', instance: '10.20.1.10:9100', job: 'node_exporter' }, annotations: { description: 'Memory usage at 97% on Moodle LMS server during exam period', summary: 'Critical memory on LMS' }, startsAt: new Date().toISOString(), status: 'firing' },
      { labels: { alertname: 'DiskSpaceWarningERP', severity: 'warning', instance: '10.20.1.20:9100', job: 'node_exporter' }, annotations: { description: 'Disk usage at 82% on student ERP database server', summary: 'Disk warning on ERP DB' }, startsAt: new Date().toISOString(), status: 'firing' },
    ],
  },
];

async function main() {
  console.log('=== Seeding Alerts via Webhook ===\n');

  for (const batch of ORG_ALERTS) {
    console.log(`\n${batch.orgName}:`);
    await sleep(2000); // Avoid rate limiting
    const res = await apiRequest('POST', '/alerts/webhook', { alerts: batch.alerts });
    if (res.success) {
      console.log(`  SUCCESS: ${res.data?.processed || 0} alert(s) created`);
    }
  }

  console.log('\n=== Done ===');
  console.log('Note: Alerts created via webhook are not org-scoped unless the instance IP');
  console.log('matches an organization.serverIp in the database. They will appear in the');
  console.log('global alert view but may not be org-filtered.');
}

main().catch(console.error);
