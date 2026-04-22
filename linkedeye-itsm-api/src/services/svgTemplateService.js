// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — SVG Template Service
// Scans public/svg-templates/ and serves Jinja2 device diagrams
// ═══════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const TEMPLATES_DIR = path.join(__dirname, '..', '..', 'public', 'svg-templates');

// ── In-memory catalog & file cache ─────────────────────────
let catalog = [];            // [{ id, manufacturer, model, isStack, category }]
const fileCache = new Map(); // id → file content string

// ── Manufacturer prefix mapping ────────────────────────────
const MANUFACTURER_PREFIXES = [
  { prefix: 'fortigate_',  manufacturer: 'Fortinet' },
  { prefix: 'Cisco_',      manufacturer: 'Cisco' },
  { prefix: 'cisco_',      manufacturer: 'Cisco' },
  { prefix: 'Huawei_',     manufacturer: 'Huawei' },
  { prefix: 'Dell_',       manufacturer: 'Dell' },
  { prefix: 'Aruba_',      manufacturer: 'Aruba' },
  { prefix: 'Arista_',     manufacturer: 'Arista' },
  { prefix: 'arista_',     manufacturer: 'Arista' },
  { prefix: 'HPE_',        manufacturer: 'HPE' },
  { prefix: 'NetApp_',     manufacturer: 'NetApp' },
  { prefix: 'BARRACUDA_',  manufacturer: 'Barracuda' },
  { prefix: 'BIG_IP_',     manufacturer: 'F5' },
  { prefix: 'radware_',    manufacturer: 'Radware' },
  { prefix: 'router_',     manufacturer: 'Cisco' },
];

// Generic switch patterns (e.g. 24_switch, 48_switch, 32_switch, 24_stack_switch)
const GENERIC_SWITCH_RE = /^\d+_(stack_)?switch$/;

// ── Category detection ─────────────────────────────────────
function detectCategory(id, manufacturer) {
  const lower = id.toLowerCase();
  if (lower.includes('firewall') || lower.includes('ftd'))         return 'firewall';
  if (lower.includes('router') || lower.includes('isr'))           return 'router';
  if (lower.includes('aff_') || manufacturer === 'NetApp')         return 'storage';
  if (manufacturer === 'F5' || manufacturer === 'Radware'
      || lower.includes('big_ip') || lower.includes('barracuda')
      || lower.includes('defence_bro'))                            return 'loadbalancer';
  // Default: switch (most templates are switches)
  return 'switch';
}

// ── Parse a single filename into catalog entry ─────────────
function parseFilename(filename) {
  // Strip .j2 extension
  const id = filename.replace(/\.j2$/, '');

  // Detect stack — filename ends with _stack or contains _stack_ in the middle
  const isStack = /_stack$/.test(id) || /_stack_/.test(id) || /^fortigate_firewall_stack/.test(id);

  // Strip stack suffix/infix for model extraction
  let base = id
    .replace(/_stack$/, '')
    .replace(/^(\d+)_stack_(switch)$/, '$1_$2');

  // Determine manufacturer
  let manufacturer = 'Generic';
  let modelPart = base;

  // Check generic switch pattern first
  if (GENERIC_SWITCH_RE.test(base)) {
    manufacturer = 'Generic';
    modelPart = base;
  } else {
    for (const { prefix, manufacturer: mfg } of MANUFACTURER_PREFIXES) {
      if (base.startsWith(prefix) || base.toLowerCase().startsWith(prefix.toLowerCase())) {
        manufacturer = mfg;
        modelPart = base.slice(prefix.length);
        break;
      }
      // Handle fortigate_firewall_stack_* pattern
      if (prefix === 'fortigate_' && base.startsWith('fortigate_firewall_stack')) {
        manufacturer = mfg;
        modelPart = base.replace('fortigate_firewall_stack_', 'firewall_');
        if (base === 'fortigate_firewall_stack') modelPart = 'firewall';
        break;
      }
    }
  }

  // Build human-readable model: replace underscores with spaces/hyphens
  const model = modelPart.replace(/_/g, ' ').replace(/\s+/g, ' ').trim() || id;
  const category = detectCategory(id, manufacturer);

  return { id, manufacturer, model, isStack, category };
}

// ── Build catalog on startup ───────────────────────────────
function buildCatalog() {
  try {
    const files = fs.readdirSync(TEMPLATES_DIR).filter(f => f.endsWith('.j2'));
    catalog = files.map(parseFilename);
    logger.info(`[SVGTemplates] Catalog built: ${catalog.length} templates from ${TEMPLATES_DIR}`);
  } catch (err) {
    logger.error(`[SVGTemplates] Failed to scan templates directory: ${err.message}`);
    catalog = [];
  }
}

// Build on module load
buildCatalog();

// ── Public API ─────────────────────────────────────────────

function listTemplates() {
  return catalog;
}

function getTemplate(templateId) {
  if (fileCache.has(templateId)) {
    return fileCache.get(templateId);
  }
  const filePath = path.join(TEMPLATES_DIR, `${templateId}.j2`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  fileCache.set(templateId, content);
  return content;
}

function getTemplateWithIp(templateId, ip) {
  const content = getTemplate(templateId);
  if (content === null) return null;
  const safeIp = ip.replace(/\./g, '_');
  return content.replaceAll('__IP__', safeIp);
}

function getCatalogEntry(templateId) {
  return catalog.find(entry => entry.id === templateId) || null;
}

module.exports = {
  listTemplates,
  getTemplate,
  getTemplateWithIp,
  getCatalogEntry,
  buildCatalog,
};
