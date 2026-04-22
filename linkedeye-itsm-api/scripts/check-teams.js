// Check which orgs have teams and which have unassigned incidents
// Run: node scripts/check-teams.js

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  console.log('No-op: No demo data to check. Use this after real organizations and teams are created.');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => p.$disconnect());
