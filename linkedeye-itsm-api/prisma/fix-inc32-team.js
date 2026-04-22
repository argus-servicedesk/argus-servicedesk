// Reassign incident to a team and reset for escalation test
// Run: node prisma/fix-inc32-team.js

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  console.log('No-op: No demo incidents to fix. Use this after real incidents are created.');
}

main().catch(console.error).finally(() => p.$disconnect());
