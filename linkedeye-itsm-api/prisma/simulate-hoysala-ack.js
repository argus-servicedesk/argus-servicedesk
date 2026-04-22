// Simulate clicking Acknowledge from an escalation email
// Run: node prisma/simulate-hoysala-ack.js

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  console.log('No-op: No demo incidents to simulate acknowledgement for.');
  console.log('To use this script, populate it with a real incident number and API base URL.');
}

main().catch(console.error).finally(() => p.$disconnect());
