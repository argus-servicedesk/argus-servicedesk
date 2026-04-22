// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM Platform — OpenAPI / Swagger Configuration
// ═══════════════════════════════════════════════════════════

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Argus ITSM Platform API',
      version: '2.0.0',
      description:
        'Multi-tenant ITSM SaaS platform API — Incidents, Changes, Problems, Assets, Alerts, Teams, On-Call, and more.',
      contact: {
        name: 'FinSpot Technology Solutions Private Limited',
      },
    },
    servers: [
      {
        url: '/api/v1',
        description: 'API v1',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'accessToken',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Error message' },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            pageSize: { type: 'integer', example: 20 },
            total: { type: 'integer', example: 100 },
            pages: { type: 'integer', example: 5 },
          },
        },
        Incident: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            number: { type: 'string', example: 'INC0000001' },
            title: { type: 'string' },
            description: { type: 'string' },
            state: {
              type: 'string',
              enum: ['NEW', 'OPEN', 'IN_PROGRESS', 'ON_HOLD', 'RESOLVED', 'CLOSED'],
            },
            priority: { type: 'string', enum: ['P1', 'P2', 'P3', 'P4'] },
            impact: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
            urgency: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
            source: {
              type: 'string',
              enum: ['MANUAL', 'PROMETHEUS', 'GRAFANA', 'API', 'EMAIL', 'VOICE', 'SLACK'],
            },
            organizationId: { type: 'string' },
            assigneeId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Change: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            number: { type: 'string', example: 'CHG0000001' },
            title: { type: 'string' },
            description: { type: 'string' },
            type: { type: 'string', enum: ['STANDARD', 'NORMAL', 'EMERGENCY'] },
            state: {
              type: 'string',
              enum: [
                'NEW',
                'ASSESSMENT',
                'AUTHORIZED',
                'SCHEDULED',
                'IMPLEMENTING',
                'REVIEW',
                'CLOSED',
              ],
            },
            risk: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
            organizationId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Problem: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            number: { type: 'string', example: 'PRB0000001' },
            title: { type: 'string' },
            description: { type: 'string' },
            state: {
              type: 'string',
              enum: ['NEW', 'OPEN', 'KNOWN_ERROR', 'RESOLVED', 'CLOSED'],
            },
            priority: { type: 'string', enum: ['P1', 'P2', 'P3', 'P4'] },
            rootCauseAnalysis: { type: 'object' },
            organizationId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Alert: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            severity: { type: 'string', enum: ['CRITICAL', 'WARNING', 'INFO'] },
            state: {
              type: 'string',
              enum: ['FIRING', 'ACKNOWLEDGED', 'RESOLVED', 'EXPIRED'],
            },
            source: { type: 'string' },
            organizationId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Asset: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            type: {
              type: 'string',
              enum: [
                'SERVER',
                'KUBERNETES_CLUSTER',
                'DATABASE',
                'APPLICATION',
                'NETWORK',
                'STORAGE',
                'CONTAINER',
                'VM',
                'LOAD_BALANCER',
              ],
            },
            status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'RETIRED'] },
            environment: { type: 'string' },
            organizationId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Team: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            organizationId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            role: {
              type: 'string',
              enum: ['ADMIN', 'MANAGER', 'ENGINEER', 'OPERATOR', 'VIEWER'],
            },
            organizationId: { type: 'string' },
          },
        },
        AuditLog: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            action: { type: 'string', example: 'incident.created' },
            resourceType: { type: 'string' },
            resourceId: { type: 'string' },
            severity: { type: 'string', enum: ['INFO', 'WARNING', 'CRITICAL'] },
            status: { type: 'string', enum: ['SUCCESS', 'FAILURE'] },
            changes: { type: 'object' },
            ipAddress: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
