// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — Database Seed Script
// Run: npx prisma db seed
// ═══════════════════════════════════════════════════════════

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Database is fresh - no seed data');
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
