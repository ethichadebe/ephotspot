import { buildApp } from '../src/app';
import { signSuperAdminToken, signUserToken } from '../src/lib/jwt';

jest.mock('../src/lib/prisma', () => ({
  prisma: {
    operator: { findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
    user: { count: jest.fn() },
    hotspotNode: { count: jest.fn() },
    session: { count: jest.fn() },
    purchase: { aggregate: jest.fn() },
    dataPackage: { findMany: jest.fn() },
  },
}));

import { prisma } from '../src/lib/prisma';

const superToken = signSuperAdminToken('admin-1');
const opToken = signUserToken('op-1', 'operator');

const fakeOp = { id: 'op-1', name: 'School', email: 'op@school.co.za', subscriptionStatus: 'active', isActive: true };

describe('Super admin API', () => {
  const app = buildApp();
  afterAll(() => app.close());
  beforeEach(() => jest.clearAllMocks());

  describe('Auth isolation', () => {
    it('rejects operator token on super admin routes', async () => {
      const res = await app.inject({ method: 'GET', url: '/super/operators', headers: { authorization: `Bearer ${opToken}` } });
      expect(res.statusCode).toBe(403);
    });

    it('rejects user token on super admin routes', async () => {
      const userToken = signUserToken('u-1', 'user');
      const res = await app.inject({ method: 'GET', url: '/super/operators', headers: { authorization: `Bearer ${userToken}` } });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('GET /super/operators', () => {
    it('lists all operators', async () => {
      (prisma.operator.findMany as jest.Mock).mockResolvedValue([fakeOp]);
      const res = await app.inject({ method: 'GET', url: '/super/operators', headers: { authorization: `Bearer ${superToken}` } });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveLength(1);
    });
  });

  describe('POST /super/operators', () => {
    it('creates operator and returns temp password', async () => {
      (prisma.operator.create as jest.Mock).mockResolvedValue(fakeOp);
      const res = await app.inject({
        method: 'POST', url: '/super/operators',
        headers: { authorization: `Bearer ${superToken}` },
        payload: { name: 'New School', email: 'new@school.co.za' },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json()).toHaveProperty('tempPassword');
      expect(res.json()).toHaveProperty('token');
    });

    it('returns 400 when email missing', async () => {
      const res = await app.inject({
        method: 'POST', url: '/super/operators',
        headers: { authorization: `Bearer ${superToken}` },
        payload: { name: 'New School' },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('PATCH /super/operators/:id/suspend', () => {
    it('suspends operator', async () => {
      (prisma.operator.update as jest.Mock).mockResolvedValue({ ...fakeOp, subscriptionStatus: 'suspended', isActive: false });
      const res = await app.inject({
        method: 'PATCH', url: '/super/operators/op-1/suspend',
        headers: { authorization: `Bearer ${superToken}` },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().subscriptionStatus).toBe('suspended');
    });
  });

  describe('GET /super/stats', () => {
    it('returns platform-wide stats', async () => {
      (prisma.user.count as jest.Mock).mockResolvedValue(500);
      (prisma.hotspotNode.count as jest.Mock).mockResolvedValue(10);
      (prisma.session.count as jest.Mock).mockResolvedValue(42);
      (prisma.purchase.aggregate as jest.Mock).mockResolvedValue({ _sum: { amountZar: 14700 } });
      const res = await app.inject({ method: 'GET', url: '/super/stats', headers: { authorization: `Bearer ${superToken}` } });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.totalUsers).toBe(500);
      expect(body.totalNodes).toBe(10);
      expect(body.activeSessions).toBe(42);
      expect(body.revenueThisMonthZar).toBe(14700);
    });
  });
});
