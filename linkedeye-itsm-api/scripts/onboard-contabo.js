/**
 * Onboard a new organization — Template
 *
 * Usage: Update the ORG, SSH, INTEGRATIONS, and DEFAULT_TEAMS constants
 * with the actual organization details, then run:
 *   node scripts/onboard-contabo.js
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();

// -- Replace these with real values when onboarding --
const ORG = {
  name: 'CHANGE_ME',
  slug: 'change-me-le',
  environment: 'PROD',
  serverIp: '0.0.0.0',
  fqdn: 'change-me.example.com',
};

const SSH = {
  sshPort: 22,
  sshUser: 'admin',
  accessMethod: 'ssh',
};

const INTEGRATIONS = [
  // Example:
  // { name: 'org-prometheus', type: 'PROMETHEUS', config: JSON.stringify({ ...SSH, promPort: 30000, prometheusUrl: `http://${ORG.serverIp}:30000`, serverIp: ORG.serverIp }) },
  // { name: 'org-k8s', type: 'KUBERNETES_CLUSTER', config: JSON.stringify({ ...SSH, serverIp: ORG.serverIp, clusterName: 'org-k8s' }) },
  // { name: 'org-grafana', type: 'GRAFANA', config: JSON.stringify({ ...SSH, grafanaPort: 30010, grafanaExternalUrl: `http://${ORG.serverIp}:30010`, serverIp: ORG.serverIp }) },
];

const DEFAULT_TEAMS = [
  // Example:
  // { name: 'NOC', description: 'Network Operations Center' },
  // { name: 'Infrastructure', description: 'Server and cloud infrastructure management' },
  // { name: 'DevOps', description: 'CI/CD pipelines and platform automation' },
  // { name: 'DBA', description: 'Database administration' },
  // { name: 'App Support', description: 'Application-level support' },
];

async function main() {
  if (ORG.name === 'CHANGE_ME') {
    console.log('Template script: Update ORG, INTEGRATIONS, and DEFAULT_TEAMS with real values before running.');
    await p.$disconnect();
    return;
  }

  // 1. Create Organization
  let org = await p.organization.findFirst({ where: { slug: ORG.slug } });
  if (org) {
    console.log('Org already exists:', org.name, org.id);
  } else {
    org = await p.organization.create({ data: ORG });
    console.log('Created org:', org.name, org.id);
  }

  // 2. Create Admin User
  const email = `admin@${ORG.slug}.linkedeye.local`;
  let user = await p.user.findFirst({ where: { email } });
  if (user) {
    console.log('User already exists:', user.email);
  } else {
    const hash = await bcrypt.hash('CHANGE_PASSWORD', 12);
    user = await p.user.create({
      data: {
        email,
        password: hash,
        firstName: 'Admin',
        lastName: ORG.name,
        role: 'ADMIN',
        status: 'ACTIVE',
        organizationId: org.id,
      },
    });
    console.log('Created user:', user.email);
  }

  // 3. Create Integrations
  for (const integ of INTEGRATIONS) {
    const existing = await p.integration.findFirst({
      where: { name: integ.name, organizationId: org.id },
    });
    if (existing) {
      console.log('Integration exists:', integ.name);
      continue;
    }
    await p.integration.create({
      data: {
        name: integ.name,
        type: integ.type,
        config: integ.config,
        status: 'ACTIVE',
        organizationId: org.id,
      },
    });
    console.log('Created integration:', integ.name, '(' + integ.type + ')');
  }

  // 4. Create Default Teams
  for (const t of DEFAULT_TEAMS) {
    const existing = await p.team.findFirst({
      where: { name: t.name, organizationId: org.id },
    });
    if (existing) {
      console.log('Team exists:', t.name);
      continue;
    }
    await p.team.create({
      data: {
        name: t.name,
        description: t.description,
        managerId: user.id,
        organizationId: org.id,
      },
    });
    console.log('Created team:', t.name);
  }

  console.log('\n=== Onboarding Complete ===');
  console.log('Org ID:', org.id);
  console.log('Admin:', email);
  console.log('Integrations:', INTEGRATIONS.length);
  console.log('Teams:', DEFAULT_TEAMS.length);

  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
