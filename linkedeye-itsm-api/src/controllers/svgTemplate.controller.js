// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — SVG Template Controller
// ═══════════════════════════════════════════════════════════

const svgTemplateService = require('../services/svgTemplateService');

async function listTemplates(req, res) {
  try {
    const templates = svgTemplateService.listTemplates();
    return res.json({ success: true, data: templates });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function getTemplate(req, res) {
  try {
    const { templateId } = req.params;
    const { ip } = req.query;

    const entry = svgTemplateService.getCatalogEntry(templateId);
    if (!entry) {
      return res.status(404).json({ success: false, error: `Template '${templateId}' not found` });
    }

    const svg = ip
      ? svgTemplateService.getTemplateWithIp(templateId, ip)
      : svgTemplateService.getTemplate(templateId);

    if (svg === null) {
      return res.status(404).json({ success: false, error: `Template file for '${templateId}' not found` });
    }

    return res.json({
      success: true,
      data: {
        templateId: entry.id,
        manufacturer: entry.manufacturer,
        model: entry.model,
        svg,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  listTemplates,
  getTemplate,
};
