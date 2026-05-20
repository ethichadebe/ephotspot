import { buildApp } from '../src/app';
import { signUserToken } from '../src/lib/jwt';
import * as notifSvc from '../src/services/notificationService';

jest.mock('../src/services/notificationService');
const mockNotif = notifSvc.notificationService as jest.Mocked<typeof notifSvc.notificationService>;

const userToken = signUserToken('user-1', 'user');

describe('Notifications routes', () => {
  const app = buildApp();
  afterAll(() => app.close());
  beforeEach(() => jest.clearAllMocks());

  describe('POST /notifications/register', () => {
    it('returns 401 without token', async () => {
      const res = await app.inject({ method: 'POST', url: '/notifications/register', payload: { token: 'fcm-abc' } });
      expect(res.statusCode).toBe(401);
    });

    it('returns 400 when FCM token missing', async () => {
      const res = await app.inject({
        method: 'POST', url: '/notifications/register',
        headers: { authorization: `Bearer ${userToken}` },
        payload: {},
      });
      expect(res.statusCode).toBe(400);
    });

    it('registers FCM token for authenticated user', async () => {
      mockNotif.registerToken.mockResolvedValue(undefined);
      const res = await app.inject({
        method: 'POST', url: '/notifications/register',
        headers: { authorization: `Bearer ${userToken}` },
        payload: { token: 'fcm-token-abc123' },
      });
      expect(res.statusCode).toBe(200);
      expect(mockNotif.registerToken).toHaveBeenCalledWith('user-1', 'fcm-token-abc123');
    });
  });

  describe('notificationService.send', () => {
    it('exports required triggers', () => {
      const { notificationService: svc } = jest.requireActual('../src/services/notificationService') as typeof notifSvc;
      expect(typeof svc.send).toBe('function');
      expect(typeof svc.registerToken).toBe('function');
    });
  });
});
