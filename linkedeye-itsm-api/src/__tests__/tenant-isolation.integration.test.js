// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — Multi-Tenant Isolation Integration Tests
// ═══════════════════════════════════════════════════════════

const request = require('supertest');
const { createTestOrg, createTestUser, getAuthToken, cleanup } = require('./helpers');
const { prisma } = require('../config/database');
const { generateIncidentNumber } = require('../utils/helpers');

// Skip integration tests if no database is available
const hasDb = !!process.env.DATABASE_URL;
const describeIfDb = hasDb ? describe : describe.skip;

let app;
if (hasDb) {
  app = require('../server');
}

describeIfDb('Multi-Tenant Isolation', () => {
  let org1, org2, user1, user2, token1, token2;
  let incidentOrg1;

  beforeAll(async () => {
    org1 = await createTestOrg();
    org2 = await createTestOrg();
    user1 = await createTestUser(org1.id, 'ADMIN');
    user2 = await createTestUser(org2.id, 'ADMIN');
    token1 = getAuthToken(user1);
    token2 = getAuthToken(user2);

    // Create an incident in org1
    const incNumber = await generateIncidentNumber();
    incidentOrg1 = await prisma.incident.create({
      data: {
        number: incNumber,
        shortDescription: 'Org1 Test Incident',
        description: 'This incident belongs to org1 only',
        organizationId: org1.id,
        createdById: user1.id,
      },
    });
  });

  afterAll(async () => {
    // Clean up incidents before orgs
    await prisma.incident.deleteMany({ where: { organizationId: { in: [org1.id, org2.id] } } }).catch(() => {});
    await cleanup(org1.id);
    await cleanup(org2.id);
  });

  test('user from org1 should see org1 incidents', async () => {
    const res = await request(app)
      .get('/api/v1/incidents')
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    // Every returned incident must belong to org1
    res.body.data.forEach((incident) => {
      expect(incident.organizationId).toBe(org1.id);
    });
  });

  test('user from org2 should NOT see org1 incidents', async () => {
    const res = await request(app)
      .get('/api/v1/incidents')
      .set('Authorization', `Bearer ${token2}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // None of org2's results should contain org1's data
    res.body.data.forEach((incident) => {
      expect(incident.organizationId).not.toBe(org1.id);
    });
  });

  test('user from org2 should NOT access org1 incident by ID', async () => {
    const res = await request(app)
      .get(`/api/v1/incidents/${incidentOrg1.id}`)
      .set('Authorization', `Bearer ${token2}`);

    // Should get 404 because tenant filtering hides org1's incident from org2
    expect([403, 404]).toContain(res.status);
  });

  test('user list should be scoped to own organization', async () => {
    const res1 = await request(app)
      .get('/api/v1/auth/users')
      .set('Authorization', `Bearer ${token1}`);

    expect(res1.status).toBe(200);
    expect(res1.body.success).toBe(true);
    // All returned users belong to org1
    res1.body.data.forEach((u) => {
      expect(u.organizationId).toBe(org1.id);
    });

    const res2 = await request(app)
      .get('/api/v1/auth/users')
      .set('Authorization', `Bearer ${token2}`);

    expect(res2.status).toBe(200);
    // All returned users belong to org2
    res2.body.data.forEach((u) => {
      expect(u.organizationId).toBe(org2.id);
    });

    // Cross-check: org1 users are not in org2's response
    const org1UserIds = res1.body.data.map((u) => u.id);
    const org2UserIds = res2.body.data.map((u) => u.id);
    org1UserIds.forEach((id) => {
      expect(org2UserIds).not.toContain(id);
    });
  });
});
