// Create default teams for orgs that don't have any
// Run: node scripts/seed-teams-all-orgs.js

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  console.log('No-op: Team seeding removed for fresh database setup.');
  console.log('Use the API or onboarding scripts to create teams for specific organizations.');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => p.$disconnect());
