// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — Seed Finspot Real Teams
// Run: node prisma/seed-finspot-teams.js
// ═══════════════════════════════════════════════════════════

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('No-op: Finspot team seed data removed for fresh database setup.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
