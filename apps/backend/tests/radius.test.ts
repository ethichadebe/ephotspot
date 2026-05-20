import { buildApp } from '../src/app';
import * as radiusSvc from '../src/services/radiusService';

jest.mock('../src/services/radiusService');

const mock = radiusSvc.radiusService as jest.Mocked<typeof radiusSvc.radiusService>;

describe('RADIUS routes', () => {
  const app = buildApp();
  afterAll(() => app.close());
  beforeEach(() => jest.clearAllMocks());

  describe('POST /radius/authorize', () => {
    it('returns Access-Accept when user has balance', async () => {
      mock.checkAccess.mockResolvedValue({ allow: true });
      const res = await app.inject({
        method: 'POST',
        url: '/radius/authorize',
        payload: { username: 'user-1' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().reply).toBe('Access-Accept');
    });

    it('returns Access-Reject when user has no balance', async () => {
      mock.checkAccess.mockResolvedValue({ allow: false, reason: 'Insufficient data balance' });
      const res = await app.inject({
        method: 'POST',
        url: '/radius/authorize',
        payload: { username: 'user-1' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().reply).toBe('Access-Reject');
    });
  });

  describe('POST /radius/accounting', () => {
    it('processes Start packet and returns ok', async () => {
      mock.handleAccounting.mockResolvedValue(undefined);
      const res = await app.inject({
        method: 'POST',
        url: '/radius/accounting',
        payload: {
          radiusSessionId: 'sess-1',
          userId: 'user-1',
          nodeId: 'node-1',
          type: 'Start',
          inputOctets: 0,
          outputOctets: 0,
        },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().ok).toBe(true);
      expect(mock.handleAccounting).toHaveBeenCalledTimes(1);
    });

    it('processes Interim-Update packet', async () => {
      mock.handleAccounting.mockResolvedValue(undefined);
      const res = await app.inject({
        method: 'POST',
        url: '/radius/accounting',
        payload: {
          radiusSessionId: 'sess-1',
          userId: 'user-1',
          nodeId: 'node-1',
          type: 'Interim-Update',
          inputOctets: 52428800,
          outputOctets: 10485760,
        },
      });
      expect(res.statusCode).toBe(200);
    });

    it('processes Stop packet', async () => {
      mock.handleAccounting.mockResolvedValue(undefined);
      const res = await app.inject({
        method: 'POST',
        url: '/radius/accounting',
        payload: {
          radiusSessionId: 'sess-1',
          userId: 'user-1',
          nodeId: 'node-1',
          type: 'Stop',
          inputOctets: 52428800,
          outputOctets: 10485760,
        },
      });
      expect(res.statusCode).toBe(200);
    });
  });
});

describe('radiusService.checkAccess', () => {
  // Unit tests for the actual service logic (not mocked)
  const { radiusService } = jest.requireActual('../src/services/radiusService') as typeof radiusSvc;

  it('exports checkAccess and handleAccounting functions', () => {
    expect(typeof radiusService.checkAccess).toBe('function');
    expect(typeof radiusService.handleAccounting).toBe('function');
  });
});
