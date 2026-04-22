// ═══════════════════════════════════════════════════════════
// Test: Send escalation email for a given incident
// Run: DATABASE_URL=... SMTP_PASS=... node prisma/send-test-escalation-email.js
// ═══════════════════════════════════════════════════════════

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('No-op: No demo incidents to send test emails for.');
  console.log('To use this script, populate it with a real incident number and target email.');
}

main()
  .catch(e => { console.error('Failed:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
