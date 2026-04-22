#!/usr/bin/env node
// ── Test LinkedEye ITSM email templates ──────────────────
// Usage: node scripts/test-emails.js recipient@example.com
//
// This script is a template. To use it, configure SMTP env vars
// and provide sample data matching your actual incidents/organizations.

const TO = process.argv[2];

if (!TO) {
  console.log('Usage: node scripts/test-emails.js <recipient-email>');
  console.log('No demo data is pre-populated. Configure SMTP env vars and add sample data to this script.');
  process.exit(0);
}

console.log('No-op: Demo email data removed for fresh database setup.');
console.log('To use this script, add sample incident/change/alert data and configure SMTP env vars.');
