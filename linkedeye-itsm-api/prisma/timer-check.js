// Check escalation timer status for an incident
// Run: node prisma/timer-check.js

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  console.log('No-op: No demo incidents to check timers for.');
  console.log('To use this script, populate it with a real incident number.');
}

main().catch(console.error).finally(() => p.$disconnect());
