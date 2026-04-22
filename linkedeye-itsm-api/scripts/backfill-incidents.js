// Backfill incidents: set category, team, and assignee for existing incidents
// Run: node scripts/backfill-incidents.js

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  console.log('No-op: No demo incidents to backfill. Use this after real incidents are created.');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => p.$disconnect());
