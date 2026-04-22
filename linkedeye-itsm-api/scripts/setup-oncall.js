// Set up on-call schedules
// Run: node scripts/setup-oncall.js

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  console.log('No-op: On-call setup removed for fresh database setup.');
  console.log('Use the API to create on-call schedules for specific users and teams.');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => p.$disconnect());
