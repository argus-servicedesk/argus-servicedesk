// ===============================================================
// LinkedEye ITSM — Audit Service Tests
// ===============================================================

// Mock Prisma before requiring the service
const mockCreate = jest.fn();
const mockFindMany = jest.fn();
const mockCount = jest.fn();
const mockGroupBy = jest.fn();

jest.mock('../config/database', () => ({
  prisma: {
    auditLog: {
      create: mockCreate,
      findMany: mockFindMany,
      count: mockCount,
      groupBy: mockGroupBy,
    },
  },
}));

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const { logAudit, getAuditLogs, getResourceTypes, detectAnomalies } = require('./auditService');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Audit Service', () => {
  // ── logAudit ───────────────────────────────────────────

  describe('logAudit', () => {
    test('should return null when organizationId is missing', async () => {
      const result = await logAudit({
        userId: 'user-1',
        action: 'test.action',
        resourceType: 'Test',
        resourceId: 'test-1',
      });
      expect(result).toBeNull();
      expect(mockCreate).not.toHaveBeenCalled();
    });

    test('should return null when userId is missing', async () => {
      const result = await logAudit({
        organizationId: 'org-1',
        action: 'test.action',
        resourceType: 'Test',
        resourceId: 'test-1',
      });
      expect(result).toBeNull();
      expect(mockCreate).not.toHaveBeenCalled();
    });

    test('should return null when both organizationId and userId are missing', async () => {
      const result = await logAudit({});
      expect(result).toBeNull();
    });

    test('should create audit log with all fields', async () => {
      const fakeLog = { id: 'log-1', action: 'incident.created' };
      mockCreate.mockResolvedValue(fakeLog);

      const result = await logAudit({
        organizationId: 'org-1',
        userId: 'user-1',
        action: 'incident.created',
        resourceType: 'Incident',
        resourceId: 'inc-1',
        before: null,
        after: { state: 'OPEN' },
        ipAddress: '10.0.0.1',
        userAgent: 'TestAgent/1.0',
        severity: 'INFO',
        status: 'SUCCESS',
      });

      expect(result).toEqual(fakeLog);
      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: 'org-1',
          userId: 'user-1',
          action: 'incident.created',
          resourceType: 'Incident',
          resourceId: 'inc-1',
          changes: { before: null, after: { state: 'OPEN' } },
          ipAddress: '10.0.0.1',
          userAgent: 'TestAgent/1.0',
          severity: 'INFO',
          status: 'SUCCESS',
        }),
      });
    });

    test('should omit changes when before and after are both null', async () => {
      mockCreate.mockResolvedValue({ id: 'log-2' });

      await logAudit({
        organizationId: 'org-1',
        userId: 'user-1',
        action: 'incident.viewed',
        resourceType: 'Incident',
        resourceId: 'inc-1',
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          changes: undefined,
        }),
      });
    });

    test('should default severity to INFO and status to SUCCESS', async () => {
      mockCreate.mockResolvedValue({ id: 'log-3' });

      await logAudit({
        organizationId: 'org-1',
        userId: 'user-1',
        action: 'test.action',
        resourceType: 'Test',
        resourceId: 'test-1',
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          severity: 'INFO',
          status: 'SUCCESS',
        }),
      });
    });

    test('should not throw when Prisma create fails', async () => {
      mockCreate.mockRejectedValue(new Error('DB connection lost'));

      const result = await logAudit({
        organizationId: 'org-1',
        userId: 'user-1',
        action: 'test.action',
        resourceType: 'Test',
        resourceId: 'test-1',
      });

      expect(result).toBeNull();
    });

    test('should use "Unknown" for missing resourceType', async () => {
      mockCreate.mockResolvedValue({ id: 'log-4' });

      await logAudit({
        organizationId: 'org-1',
        userId: 'user-1',
        action: 'test.action',
        resourceId: 'test-1',
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          resourceType: 'Unknown',
        }),
      });
    });

    test('should stringify resourceId when provided as non-string', async () => {
      mockCreate.mockResolvedValue({ id: 'log-5' });

      await logAudit({
        organizationId: 'org-1',
        userId: 'user-1',
        action: 'test.action',
        resourceType: 'Test',
        resourceId: 12345,
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          resourceId: '12345',
        }),
      });
    });
  });

  // ── getAuditLogs ───────────────────────────────────────

  describe('getAuditLogs', () => {
    test('should query with organizationId filter', async () => {
      const fakeLogs = [{ id: 'log-1' }];
      mockFindMany.mockResolvedValue(fakeLogs);
      mockCount.mockResolvedValue(1);

      const result = await getAuditLogs({ organizationId: 'org-1' });

      expect(result.logs).toEqual(fakeLogs);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: 'org-1' }),
        })
      );
    });

    test('should apply all filters', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      await getAuditLogs({
        organizationId: 'org-1',
        userId: 'user-1',
        action: 'incident',
        resourceType: 'Incident',
        severity: 'CRITICAL',
        status: 'FAILURE',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        page: 2,
        pageSize: 25,
      });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 'org-1',
            userId: 'user-1',
            resourceType: 'Incident',
            severity: 'CRITICAL',
            status: 'FAILURE',
          }),
          skip: 25,
          take: 25,
        })
      );
    });

    test('should apply search filter', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      await getAuditLogs({
        organizationId: 'org-1',
        search: 'incident',
      });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ resourceType: { contains: 'incident', mode: 'insensitive' } }),
            ]),
          }),
        })
      );
    });

    test('should cap pageSize at 200', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      await getAuditLogs({
        organizationId: 'org-1',
        pageSize: 500,
      });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 200 })
      );
    });

    test('should skip ALL filter values', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      await getAuditLogs({
        organizationId: 'org-1',
        userId: 'ALL',
        action: 'ALL',
        resourceType: 'ALL',
        severity: 'ALL',
        status: 'ALL',
      });

      const callArgs = mockFindMany.mock.calls[0][0];
      expect(callArgs.where).toEqual({ organizationId: 'org-1' });
    });
  });

  // ── getResourceTypes ───────────────────────────────────

  describe('getResourceTypes', () => {
    test('should return distinct resource types', async () => {
      mockFindMany.mockResolvedValue([
        { resourceType: 'Incident' },
        { resourceType: 'User' },
      ]);

      const result = await getResourceTypes('org-1');
      expect(result).toEqual(['Incident', 'User']);
    });
  });

  // ── detectAnomalies ────────────────────────────────────

  describe('detectAnomalies', () => {
    test('should return empty array when no anomalies exist', async () => {
      mockGroupBy.mockResolvedValue([]);
      mockFindMany.mockResolvedValue([]);

      const alerts = await detectAnomalies('org-1');
      expect(Array.isArray(alerts)).toBe(true);
      expect(alerts.length).toBe(0);
    });

    test('should detect brute force attempts (5+ failures in 5 min)', async () => {
      // First groupBy call: failed actions
      mockGroupBy
        .mockResolvedValueOnce([{ userId: 'attacker', _count: 7 }])
        // Second groupBy call: deletions
        .mockResolvedValueOnce([])
        // Third groupBy call: high volume
        .mockResolvedValueOnce([]);
      // findMany for role changes
      mockFindMany.mockResolvedValue([]);

      const alerts = await detectAnomalies('org-1');
      const bruteForce = alerts.find((a) => a.type === 'BRUTE_FORCE_ATTEMPT');
      expect(bruteForce).toBeDefined();
      expect(bruteForce.userId).toBe('attacker');
      expect(bruteForce.count).toBe(7);
      expect(bruteForce.severity).toBe('CRITICAL');
    });

    test('should detect privilege escalation', async () => {
      mockGroupBy
        .mockResolvedValueOnce([])  // failed actions
        .mockResolvedValueOnce([])  // deletions
        .mockResolvedValueOnce([]); // high volume

      mockFindMany.mockResolvedValueOnce([
        {
          userId: 'admin-user',
          resourceId: 'target-user',
          changes: { after: { role: 'ADMIN' } },
        },
      ]).mockResolvedValue([]); // after-hours (if applicable)

      const alerts = await detectAnomalies('org-1');
      const escalation = alerts.find((a) => a.type === 'PRIVILEGE_ESCALATION');
      expect(escalation).toBeDefined();
      expect(escalation.severity).toBe('CRITICAL');
    });

    test('should detect mass deletions (10+ in 1 hour)', async () => {
      mockGroupBy
        .mockResolvedValueOnce([])  // failed actions
        .mockResolvedValueOnce([{ userId: 'deleter', _count: 15 }]) // deletions
        .mockResolvedValueOnce([]); // high volume
      mockFindMany.mockResolvedValue([]);

      const alerts = await detectAnomalies('org-1');
      const massDel = alerts.find((a) => a.type === 'MASS_DELETION');
      expect(massDel).toBeDefined();
      expect(massDel.count).toBe(15);
      expect(massDel.severity).toBe('CRITICAL');
    });

    test('should detect unusual volume (50+ actions in 10 min)', async () => {
      mockGroupBy
        .mockResolvedValueOnce([])  // failed actions
        .mockResolvedValueOnce([])  // deletions
        .mockResolvedValueOnce([{ userId: 'bot-user', _count: 75 }]); // high volume
      mockFindMany.mockResolvedValue([]);

      const alerts = await detectAnomalies('org-1');
      const vol = alerts.find((a) => a.type === 'UNUSUAL_VOLUME');
      expect(vol).toBeDefined();
      expect(vol.count).toBe(75);
      expect(vol.severity).toBe('WARNING');
    });
  });
});
