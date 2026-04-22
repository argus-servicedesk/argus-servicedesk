// Update all escalation rules to production delays
// Run: node prisma/update-escalation-delays.js

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  console.log('No-op: No demo escalation rules to update. Use this after real data is created.');
}

main().catch(console.error).finally(() => p.$disconnect());
