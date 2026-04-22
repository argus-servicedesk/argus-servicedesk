// Fix escalation rule notifyTargets to use actual User email addresses
// Run: node prisma/fix-escalation-targets.js

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  console.log('No-op: No demo escalation rules to fix. Use this after real data is created.');
}

main().catch(console.error).finally(() => p.$disconnect());
