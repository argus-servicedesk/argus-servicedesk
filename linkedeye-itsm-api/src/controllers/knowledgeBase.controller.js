// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — Knowledge Base Controller
// ═══════════════════════════════════════════════════════════

const { prisma } = require('../config/database');
const { emitToAll } = require('../config/socket');
const { paginate, paginationMeta, success, error, generateSlug } = require('../utils/helpers');
const { KB_ARTICLE_TRANSITIONS } = require('../config/constants');
const { getCreateOrgId } = require('../middleware/tenant');
const logger = require('../utils/logger');

// ── Include shapes ─────────────────────────────────────

const ARTICLE_INCLUDE_LIST = {
  author: { select: { id: true, firstName: true, lastName: true, email: true } },
  category: { select: { id: true, name: true, icon: true } },
  _count: { select: { feedback: true } },
};

const ARTICLE_INCLUDE_DETAIL = {
  ...ARTICLE_INCLUDE_LIST,
  reviewer: { select: { id: true, firstName: true, lastName: true } },
  feedback: {
    include: { user: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  },
};

// ── Categories ─────────────────────────────────────────

async function listCategories(req, res, next) {
  try {
    const where = { ...req.tenantWhere };
    if (req.query.isActive !== undefined) where.isActive = req.query.isActive === 'true';

    const categories = await prisma.kBCategory.findMany({
      where,
      include: {
        _count: { select: { articles: true } },
        children: { select: { id: true, name: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });
    return success(res, categories);
  } catch (err) { next(err); }
}

async function createCategory(req, res, next) {
  try {
    const { name, description, icon, sortOrder, parentId } = req.body;
    const category = await prisma.kBCategory.create({
      data: {
        name, description, icon,
        sortOrder: sortOrder || 0,
        parentId: parentId || null,
        organizationId: getCreateOrgId(req),
      },
    });
    logger.info(`KB Category created: ${category.name} by ${req.user.email}`);
    return success(res, category, 201);
  } catch (err) { next(err); }
}

async function updateCategory(req, res, next) {
  try {
    const existing = await prisma.kBCategory.findUnique({ where: { id: req.params.id } });
    if (!existing) return error(res, 'Category not found', 404);
    if (req.tenantWhere.organizationId && existing.organizationId !== req.tenantWhere.organizationId) {
      return error(res, 'Category not found', 404);
    }

    const { name, description, icon, sortOrder, isActive, parentId } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (icon !== undefined) data.icon = icon;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;
    if (isActive !== undefined) data.isActive = isActive;
    if (parentId !== undefined) data.parentId = parentId;

    const category = await prisma.kBCategory.update({ where: { id: req.params.id }, data });
    return success(res, category);
  } catch (err) { next(err); }
}

// ── Articles ───────────────────────────────────────────

async function listArticles(req, res, next) {
  try {
    const { state, categoryId, search, tags, authorId, sortBy, sortOrder } = req.query;
    const { skip, take, page, limit } = paginate(req.query.page, req.query.limit);

    const where = { ...req.tenantWhere };
    if (state) where.state = state;
    if (categoryId) where.categoryId = categoryId;
    if (authorId) where.authorId = authorId;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (tags) {
      const tagList = Array.isArray(tags) ? tags : tags.split(',');
      where.tags = { hasSome: tagList };
    }

    const orderBy = sortBy ? { [sortBy]: sortOrder || 'desc' } : { createdAt: 'desc' };

    const [articles, total] = await prisma.$transaction([
      prisma.kBArticle.findMany({ where, include: ARTICLE_INCLUDE_LIST, orderBy, skip, take }),
      prisma.kBArticle.count({ where }),
    ]);

    return success(res, articles, 200, paginationMeta(total, page, limit));
  } catch (err) { next(err); }
}

async function listPublishedArticles(req, res, next) {
  try {
    const { search, categoryId, tags } = req.query;
    const { skip, take, page, limit } = paginate(req.query.page, req.query.limit);

    const where = { state: 'PUBLISHED' };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (categoryId) where.categoryId = categoryId;
    if (tags) {
      const tagList = Array.isArray(tags) ? tags : tags.split(',');
      where.tags = { hasSome: tagList };
    }

    const [articles, total] = await prisma.$transaction([
      prisma.kBArticle.findMany({ where, include: ARTICLE_INCLUDE_LIST, orderBy: { publishedAt: 'desc' }, skip, take }),
      prisma.kBArticle.count({ where }),
    ]);

    return success(res, articles, 200, paginationMeta(total, page, limit));
  } catch (err) { next(err); }
}

async function getArticle(req, res, next) {
  try {
    const article = await prisma.kBArticle.findUnique({
      where: { id: req.params.id },
      include: ARTICLE_INCLUDE_DETAIL,
    });
    if (!article) return error(res, 'Article not found', 404);
    if (req.tenantWhere?.organizationId && article.organizationId !== req.tenantWhere.organizationId) {
      return error(res, 'Article not found', 404);
    }

    // Increment view count (fire-and-forget)
    prisma.kBArticle.update({ where: { id: req.params.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});

    return success(res, article);
  } catch (err) { next(err); }
}

async function createArticle(req, res, next) {
  try {
    const { title, content, excerpt, categoryId, tags } = req.body;
    const slug = generateSlug(title);

    const article = await prisma.kBArticle.create({
      data: {
        title, slug, content, excerpt,
        categoryId: categoryId || null,
        tags: tags || [],
        authorId: req.user.id,
        organizationId: getCreateOrgId(req),
      },
      include: ARTICLE_INCLUDE_LIST,
    });

    emitToAll('kb:article-created', { id: article.id, title: article.title });
    logger.info(`KB Article created: "${article.title}" by ${req.user.email}`);
    return success(res, article, 201);
  } catch (err) { next(err); }
}

async function updateArticle(req, res, next) {
  try {
    const existing = await prisma.kBArticle.findUnique({ where: { id: req.params.id } });
    if (!existing) return error(res, 'Article not found', 404);
    if (req.tenantWhere.organizationId && existing.organizationId !== req.tenantWhere.organizationId) {
      return error(res, 'Article not found', 404);
    }

    // State transition validation
    if (req.body.state && req.body.state !== existing.state) {
      const allowed = KB_ARTICLE_TRANSITIONS[existing.state] || [];
      if (!allowed.includes(req.body.state)) {
        return error(res, `Cannot transition from ${existing.state} to ${req.body.state}`, 400);
      }
    }

    const data = {};
    const { title, content, excerpt, state, categoryId, tags, reviewerId } = req.body;
    if (title !== undefined) { data.title = title; data.slug = generateSlug(title); }
    if (content !== undefined) data.content = content;
    if (excerpt !== undefined) data.excerpt = excerpt;
    if (state !== undefined) data.state = state;
    if (categoryId !== undefined) data.categoryId = categoryId;
    if (tags !== undefined) data.tags = tags;
    if (reviewerId !== undefined) data.reviewerId = reviewerId;

    // Timestamp management
    if (data.state === 'PUBLISHED' && existing.state !== 'PUBLISHED') data.publishedAt = new Date();
    if (data.state === 'ARCHIVED') data.archivedAt = new Date();

    const article = await prisma.kBArticle.update({
      where: { id: req.params.id },
      data,
      include: ARTICLE_INCLUDE_LIST,
    });

    emitToAll('kb:article-updated', { id: article.id, state: article.state });
    return success(res, article);
  } catch (err) { next(err); }
}

// ── Feedback ───────────────────────────────────────────

async function submitFeedback(req, res, next) {
  try {
    const article = await prisma.kBArticle.findUnique({ where: { id: req.params.id } });
    if (!article) return error(res, 'Article not found', 404);

    const feedback = await prisma.kBFeedback.upsert({
      where: { articleId_userId: { articleId: req.params.id, userId: req.user.id } },
      update: { helpful: req.body.helpful, comment: req.body.comment || null },
      create: {
        articleId: req.params.id,
        userId: req.user.id,
        helpful: req.body.helpful,
        comment: req.body.comment || null,
      },
    });

    return success(res, feedback);
  } catch (err) { next(err); }
}

module.exports = {
  listCategories, createCategory, updateCategory,
  listArticles, listPublishedArticles, getArticle, createArticle, updateArticle,
  submitFeedback,
};
