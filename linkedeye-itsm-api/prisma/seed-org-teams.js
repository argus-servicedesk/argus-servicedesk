// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — Per-Org Team Seed
// Run: node prisma/seed-org-teams.js
// ═══════════════════════════════════════════════════════════

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('No-op: Per-org team seed data removed for fresh database setup.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
