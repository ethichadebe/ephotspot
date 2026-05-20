import { buildApp } from '../src/app';
import { signSuperAdminToken, signUserToken } from '../src/lib/jwt';

jest.mock('../src/lib/prisma', () => ({
  prisma: {
    dataPackage: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { prisma } from '../src/lib/prisma';
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const pkg1 = { id: 'pkg-1gb', name: '1GB Bundle', dataMb: 1024, priceZar: '29.00', isActive: true, createdAt: new Date(), updatedAt: new Date(), purchases: [] };
const pkg5 = { id: 'pkg-5gb', name: '5GB Bundle', dataMb: 5120, priceZar: '99.00', isActive: true, createdAt: new Date(), updatedAt: new Date(), purchases: [] };

describe('Packages API', () => {
  const app = buildApp();
  afterAll(() => app.close());
  beforeEach(() => jest.clearAllMocks());

  describe('GET /packages', () => {
    it('returns active packages without auth', async () => {
      (mockPrisma.dataPackage.findMany as jest.Mock).mockResolvedValue([pkg1, pkg5]);
      const res = await app.inject({ method: 'GET', url: '/packages' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveLength(2);
    });
  });

  describe('POST /packages', () => {
    it('returns 403 without super admin token', async () => {
      const token = signUserToken('op-1', 'operator');
      const res = await app.inject({
        method: 'POST', url: '/packages',
        headers: { authorization: `Bearer ${token}` },
        payload: { name: '2GB Bundle', dataMb: 2048, priceZar: 49 },
      });
      expect(res.statusCode).toBe(403);
    });

    it('creates package with super admin token', async () => {
      const token = signSuperAdminToken('admin-1');
      (mockPrisma.dataPackage.create as jest.Mock).mockResolvedValue({ ...pkg1, id: 'pkg-new' });
      const res = await app.inject({
        method: 'POST', url: '/packages',
        headers: { authorization: `Bearer ${token}` },
        payload: { name: '2GB Bundle', dataMb: 2048, priceZar: 49 },
      });
      expect(res.statusCode).toBe(201);
    });
  });

  describe('PATCH /packages/:id', () => {
    it('returns 403 without super admin token', async () => {
      const token = signUserToken('op-1', 'operator');
      const res = await app.inject({
        method: 'PATCH', url: '/packages/pkg-1gb',
        headers: { authorization: `Bearer ${token}` },
        payload: { priceZar: 35 },
      });
      expect(res.statusCode).toBe(403);
    });

    it('updates package with super admin token', async () => {
      const token = signSuperAdminToken('admin-1');
      (mockPrisma.dataPackage.update as jest.Mock).mockResolvedValue({ ...pkg1, priceZar: '35.00' });
      const res = await app.inject({
        method: 'PATCH', url: '/packages/pkg-1gb',
        headers: { authorization: `Bearer ${token}` },
        payload: { priceZar: 35 },
      });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('DELETE /packages/:id', () => {
    it('deactivates package (does not delete) with super admin token', async () => {
      const token = signSuperAdminToken('admin-1');
      (mockPrisma.dataPackage.update as jest.Mock).mockResolvedValue({ ...pkg1, isActive: false });
      const res = await app.inject({
        method: 'DELETE', url: '/packages/pkg-1gb',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(200);
      expect(mockPrisma.dataPackage.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isActive: false } })
      );
    });
  });
});
