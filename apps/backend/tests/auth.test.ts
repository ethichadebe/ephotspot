import { buildApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { verifyUserToken } from '../src/lib/jwt';
import * as authService from '../src/services/authService';

jest.mock('../src/services/authService');

const mockAuthService = authService as jest.Mocked<typeof authService>;

const fakeUser = {
  id: 'user-1',
  phone: '+27821234567',
  email: null,
  name: 'Test User',
  googleId: null,
  facebookId: null,
  appleId: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Auth routes', () => {
  const app = buildApp();

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/google', () => {
    it('returns 400 when idToken is missing', async () => {
      const res = await app.inject({ method: 'POST', url: '/auth/google', payload: {} });
      expect(res.statusCode).toBe(400);
    });

    it('returns 200 with JWT when Google token is valid', async () => {
      mockAuthService.loginWithGoogle.mockResolvedValue({ token: 'fake-jwt', user: fakeUser as any });
      const res = await app.inject({
        method: 'POST',
        url: '/auth/google',
        payload: { idToken: 'google-id-token' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().token).toBe('fake-jwt');
    });
  });

  describe('POST /auth/facebook', () => {
    it('returns 400 when accessToken is missing', async () => {
      const res = await app.inject({ method: 'POST', url: '/auth/facebook', payload: {} });
      expect(res.statusCode).toBe(400);
    });

    it('returns 200 with JWT when Facebook token is valid', async () => {
      mockAuthService.loginWithFacebook.mockResolvedValue({ token: 'fake-jwt', user: fakeUser as any });
      const res = await app.inject({
        method: 'POST',
        url: '/auth/facebook',
        payload: { accessToken: 'fb-access-token' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().token).toBe('fake-jwt');
    });
  });

  describe('POST /auth/apple', () => {
    it('returns 400 when identityToken is missing', async () => {
      const res = await app.inject({ method: 'POST', url: '/auth/apple', payload: {} });
      expect(res.statusCode).toBe(400);
    });

    it('returns 200 with JWT when Apple token is valid', async () => {
      mockAuthService.loginWithApple.mockResolvedValue({ token: 'fake-jwt', user: fakeUser as any });
      const res = await app.inject({
        method: 'POST',
        url: '/auth/apple',
        payload: { identityToken: 'apple-id-token' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().token).toBe('fake-jwt');
    });
  });

  describe('POST /auth/phone/request', () => {
    it('returns 400 when phone is missing', async () => {
      const res = await app.inject({ method: 'POST', url: '/auth/phone/request', payload: {} });
      expect(res.statusCode).toBe(400);
    });

    it('returns 200 and sends OTP', async () => {
      mockAuthService.requestPhoneOtp.mockResolvedValue(undefined);
      const res = await app.inject({
        method: 'POST',
        url: '/auth/phone/request',
        payload: { phone: '+27821234567' },
      });
      expect(res.statusCode).toBe(200);
      expect(mockAuthService.requestPhoneOtp).toHaveBeenCalledWith('+27821234567');
    });
  });

  describe('POST /auth/phone/verify', () => {
    it('returns 400 when phone or code is missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/phone/verify',
        payload: { phone: '+27821234567' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 200 with JWT when OTP is valid', async () => {
      mockAuthService.verifyPhoneOtp.mockResolvedValue({ token: 'fake-jwt', user: fakeUser as any });
      const res = await app.inject({
        method: 'POST',
        url: '/auth/phone/verify',
        payload: { phone: '+27821234567', code: '123456' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().token).toBe('fake-jwt');
    });

    it('returns 500 when OTP is invalid', async () => {
      mockAuthService.verifyPhoneOtp.mockRejectedValue(new Error('Invalid or expired OTP'));
      const res = await app.inject({
        method: 'POST',
        url: '/auth/phone/verify',
        payload: { phone: '+27821234567', code: '000000' },
      });
      expect(res.statusCode).toBe(500);
    });
  });

  describe('JWT middleware', () => {
    it('signUserToken produces a verifiable token', () => {
      const { signUserToken } = require('../src/lib/jwt');
      const token = signUserToken('user-123', 'user');
      const payload = verifyUserToken(token);
      expect(payload.sub).toBe('user-123');
      expect(payload.type).toBe('user');
    });
  });
});
