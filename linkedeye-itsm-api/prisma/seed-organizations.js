// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — Seed: Client Organizations
// Run: node prisma/seed-organizations.js
// ═══════════════════════════════════════════════════════════

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('No-op: Organization seed data removed for fresh database setup.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
