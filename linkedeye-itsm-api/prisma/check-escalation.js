// Check escalation policies + incident team assignment
// Run: node prisma/check-escalation.js

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  console.log('No-op: No demo incidents to check. Use this after real incidents are created.');
}

main().catch(console.error).finally(() => p.$disconnect());
