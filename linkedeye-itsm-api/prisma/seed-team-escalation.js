// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — Seed Team Members, Escalation Policies & On-Call Schedules
// ═══════════════════════════════════════════════════════════

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('No-op: Team escalation seed data removed for fresh database setup.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
