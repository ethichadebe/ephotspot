import { buildApp } from '../src/app';
import { signUserToken } from '../src/lib/jwt';
import * as peach from '../src/services/peachService';
import * as bango from '../src/services/bangoService';
import * as purchase from '../src/services/purchaseService';

jest.mock('../src/services/peachService');
jest.mock('../src/services/bangoService');
jest.mock('../src/services/purchaseService');
jest.mock('../src/lib/prisma', () => ({
  prisma: {
    dataPackage: { findUnique: jest.fn() },
  },
}));

import { prisma } from '../src/lib/prisma';

const mockPkg = { id: 'pkg-1gb', name: '1GB', dataMb: 1024, priceZar: '29.00', isActive: true };
const userToken = signUserToken('user-1', 'user');

describe('Payment routes', () => {
  const app = buildApp();
  afterAll(() => app.close());
  beforeEach(() => jest.clearAllMocks());

  describe('POST /payments/peach/initiate', () => {
    it('returns 400 when packageId missing', async () => {
      const res = await app.inject({
        method: 'POST', url: '/payments/peach/initiate',
        headers: { authorization: `Bearer ${userToken}` },
        payload: {},
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns checkout URL for valid package', async () => {
      (prisma.dataPackage.findUnique as jest.Mock).mockResolvedValue(mockPkg);
      (peach.initiateCheckout as jest.Mock).mockResolvedValue('https://checkout.example.com');
      const res = await app.inject({
        method: 'POST', url: '/payments/peach/initiate',
        headers: { authorization: `Bearer ${userToken}` },
        payload: { packageId: 'pkg-1gb' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().checkoutUrl).toBe('https://checkout.example.com');
    });

    it('returns 401 without token', async () => {
      const res = await app.inject({ method: 'POST', url: '/payments/peach/initiate', payload: { packageId: 'pkg-1gb' } });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /payments/peach/webhook', () => {
    it('ignores failed payment without modifying balance', async () => {
      (peach.verifyWebhookSignature as jest.Mock).mockReturnValue(true);
      (peach.isSuccessCode as jest.Mock).mockReturnValue(false);
      const res = await app.inject({
        method: 'POST', url: '/payments/peach/webhook',
        payload: { result: { code: '800.100.100' } },
      });
      expect(res.statusCode).toBe(200);
      expect(purchase.applyPurchase).not.toHaveBeenCalled();
    });

    it('applies purchase on successful payment', async () => {
      (peach.verifyWebhookSignature as jest.Mock).mockReturnValue(true);
      (peach.isSuccessCode as jest.Mock).mockReturnValue(true);
      (purchase.applyPurchase as jest.Mock).mockResolvedValue(undefined);
      const res = await app.inject({
        method: 'POST', url: '/payments/peach/webhook',
        payload: {
          result: { code: '000.000.000' },
          customParameters: { USER_ID: 'user-1', PACKAGE_ID: 'pkg-1gb' },
          amount: '29.00',
          id: 'ref-123',
        },
      });
      expect(res.statusCode).toBe(200);
      expect(purchase.applyPurchase).toHaveBeenCalledWith('user-1', 'pkg-1gb', 29, 'peach', 'ref-123');
    });

    it('returns 401 on invalid webhook signature', async () => {
      (peach.verifyWebhookSignature as jest.Mock).mockReturnValue(false);
      const res = await app.inject({ method: 'POST', url: '/payments/peach/webhook', payload: {} });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /payments/bango/initiate', () => {
    it('returns 400 when phone missing', async () => {
      const res = await app.inject({
        method: 'POST', url: '/payments/bango/initiate',
        headers: { authorization: `Bearer ${userToken}` },
        payload: { packageId: 'pkg-1gb' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('initiates carrier billing charge', async () => {
      (prisma.dataPackage.findUnique as jest.Mock).mockResolvedValue(mockPkg);
      (bango.initiateBangoCharge as jest.Mock).mockResolvedValue({ chargeId: 'ch-1', status: 'pending' });
      const res = await app.inject({
        method: 'POST', url: '/payments/bango/initiate',
        headers: { authorization: `Bearer ${userToken}` },
        payload: { packageId: 'pkg-1gb', phone: '+27821234567' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().chargeId).toBe('ch-1');
    });
  });

  describe('POST /payments/bango/callback', () => {
    it('applies purchase on successful Bango callback', async () => {
      (bango.processBangoCallback as jest.Mock).mockResolvedValue({
        success: true, userId: 'user-1', packageId: 'pkg-1gb', amountZar: 29, reference: 'ch-1',
      });
      (purchase.applyPurchase as jest.Mock).mockResolvedValue(undefined);
      const res = await app.inject({ method: 'POST', url: '/payments/bango/callback', payload: { status: 'SUCCESS' } });
      expect(res.statusCode).toBe(200);
      expect(purchase.applyPurchase).toHaveBeenCalledWith('user-1', 'pkg-1gb', 29, 'bango', 'ch-1');
    });

    it('does not apply purchase on failed Bango callback', async () => {
      (bango.processBangoCallback as jest.Mock).mockResolvedValue({
        success: false, userId: 'user-1', packageId: 'pkg-1gb', amountZar: 0, reference: '',
      });
      const res = await app.inject({ method: 'POST', url: '/payments/bango/callback', payload: { status: 'FAILED' } });
      expect(res.statusCode).toBe(200);
      expect(purchase.applyPurchase).not.toHaveBeenCalled();
    });
  });

  describe('purchaseService rollover logic', () => {
    it('isSuccessCode correctly identifies Peach success codes', () => {
      const { isSuccessCode } = jest.requireActual('../src/services/peachService') as typeof peach;
      expect(isSuccessCode('000.000.000')).toBe(true);
      expect(isSuccessCode('000.100.110')).toBe(true);
      expect(isSuccessCode('800.100.100')).toBe(false);
    });
  });
});
