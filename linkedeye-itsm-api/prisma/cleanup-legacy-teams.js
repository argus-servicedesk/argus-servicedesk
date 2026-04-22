// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — Legacy Team Cleanup
// Run: node prisma/cleanup-legacy-teams.js
// ═══════════════════════════════════════════════════════════

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('No-op: Legacy team cleanup not needed for fresh database.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
