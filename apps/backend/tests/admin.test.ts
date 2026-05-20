import { buildApp } from '../src/app';
import { signUserToken } from '../src/lib/jwt';

jest.mock('../src/lib/prisma', () => ({
  prisma: {
    user: { findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn(), count: jest.fn() },
    hotspotNode: { findMany: jest.fn(), findFirst: jest.fn() },
    operatorUser: { findFirst: jest.fn() },
    session: { count: jest.fn(), aggregate: jest.fn() },
    purchase: { aggregate: jest.fn() },
  },
}));
jest.mock('../src/services/mikrotikService', () => ({
  mikrotikService: { getActiveConnections: jest.fn() },
}));

import { prisma } from '../src/lib/prisma';
import { mikrotikService } from '../src/services/mikrotikService';

const opToken = signUserToken('op-1', 'operator');
const userToken = signUserToken('user-1', 'user');

const fakeUser = { id: 'u1', name: 'Test', phone: '+27821234567', isActive: true, balance: { remainingMb: 512 } };

describe('Operator admin API', () => {
  const app = buildApp();
  afterAll(() => app.close());
  beforeEach(() => jest.clearAllMocks());

  describe('Auth guard', () => {
    it('rejects non-operator token', async () => {
      const res = await app.inject({ method: 'GET', url: '/admin/users', headers: { authorization: `Bearer ${userToken}` } });
      expect(res.statusCode).toBe(403);
    });
    it('rejects missing token', async () => {
      const res = await app.inject({ method: 'GET', url: '/admin/users' });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /admin/users', () => {
    it('returns paginated users for operator', async () => {
      (prisma.user.findMany as jest.Mock).mockResolvedValue([fakeUser]);
      (prisma.user.count as jest.Mock).mockResolvedValue(1);
      const res = await app.inject({ method: 'GET', url: '/admin/users', headers: { authorization: `Bearer ${opToken}` } });
      expect(res.statusCode).toBe(200);
      expect(res.json().users).toHaveLength(1);
      expect(res.json().total).toBe(1);
    });
  });

  describe('GET /admin/users/:id', () => {
    it('returns 404 for user not on operator network', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      const res = await app.inject({ method: 'GET', url: '/admin/users/u-other', headers: { authorization: `Bearer ${opToken}` } });
      expect(res.statusCode).toBe(404);
    });

    it('returns user with balance and purchases', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({ ...fakeUser, purchases: [] });
      const res = await app.inject({ method: 'GET', url: '/admin/users/u1', headers: { authorization: `Bearer ${opToken}` } });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('PATCH /admin/users/:id/deactivate', () => {
    it('returns 404 when user not on operator network', async () => {
      (prisma.operatorUser.findFirst as jest.Mock).mockResolvedValue(null);
      const res = await app.inject({ method: 'PATCH', url: '/admin/users/u-other/deactivate', headers: { authorization: `Bearer ${opToken}` } });
      expect(res.statusCode).toBe(404);
    });

    it('deactivates user', async () => {
      (prisma.operatorUser.findFirst as jest.Mock).mockResolvedValue({ userId: 'u1', operatorId: 'op-1' });
      (prisma.user.update as jest.Mock).mockResolvedValue({ ...fakeUser, isActive: false });
      const res = await app.inject({ method: 'PATCH', url: '/admin/users/u1/deactivate', headers: { authorization: `Bearer ${opToken}` } });
      expect(res.statusCode).toBe(200);
      expect(res.json().isActive).toBe(false);
    });
  });

  describe('GET /admin/nodes', () => {
    it('returns operator nodes', async () => {
      (prisma.hotspotNode.findMany as jest.Mock).mockResolvedValue([{ id: 'n1', name: 'Node 1', isOnline: true }]);
      const res = await app.inject({ method: 'GET', url: '/admin/nodes', headers: { authorization: `Bearer ${opToken}` } });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveLength(1);
    });
  });

  describe('GET /admin/nodes/:id/sessions', () => {
    it('returns 404 for node not belonging to operator', async () => {
      (prisma.hotspotNode.findFirst as jest.Mock).mockResolvedValue(null);
      const res = await app.inject({ method: 'GET', url: '/admin/nodes/n-other/sessions', headers: { authorization: `Bearer ${opToken}` } });
      expect(res.statusCode).toBe(404);
    });

    it('returns active sessions for node', async () => {
      (prisma.hotspotNode.findFirst as jest.Mock).mockResolvedValue({ id: 'n1' });
      (mikrotikService.getActiveConnections as jest.Mock).mockResolvedValue([{ userId: 'u1', dataUsedMb: 50 }]);
      const res = await app.inject({ method: 'GET', url: '/admin/nodes/n1/sessions', headers: { authorization: `Bearer ${opToken}` } });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveLength(1);
    });
  });

  describe('GET /admin/stats', () => {
    it('returns stats scoped to operator', async () => {
      (prisma.user.count as jest.Mock).mockResolvedValue(42);
      (prisma.session.count as jest.Mock).mockResolvedValue(5);
      (prisma.hotspotNode.findMany as jest.Mock).mockResolvedValue([{ id: 'n1' }]);
      (prisma.session.aggregate as jest.Mock).mockResolvedValue({ _sum: { dataUsedMb: 1024 } });
      (prisma.purchase.aggregate as jest.Mock).mockResolvedValue({ _sum: { amountZar: 299 } });
      const res = await app.inject({ method: 'GET', url: '/admin/stats', headers: { authorization: `Bearer ${opToken}` } });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.totalUsers).toBe(42);
      expect(body.activeSessions).toBe(5);
      expect(body.dataConsumedTodayMb).toBe(1024);
      expect(body.revenueThisMonthZar).toBe(299);
    });
  });
});
