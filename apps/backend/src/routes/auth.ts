import type { FastifyInstance } from 'fastify';
import {
  loginWithGoogle,
  loginWithFacebook,
  loginWithApple,
  requestPhoneOtp,
  verifyPhoneOtp,
} from '../services/authService';

export async function authRoutes(app: FastifyInstance) {
  app.post<{ Body: { idToken: string } }>('/auth/google', async (request, reply) => {
    const { idToken } = request.body;
    if (!idToken) return reply.status(400).send({ error: 'idToken required' });
    const { token, user } = await loginWithGoogle(idToken);
    return reply.status(200).send({ token, user });
  });

  app.post<{ Body: { accessToken: string } }>('/auth/facebook', async (request, reply) => {
    const { accessToken } = request.body;
    if (!accessToken) return reply.status(400).send({ error: 'accessToken required' });
    const { token, user } = await loginWithFacebook(accessToken);
    return reply.status(200).send({ token, user });
  });

  app.post<{ Body: { identityToken: string } }>('/auth/apple', async (request, reply) => {
    const { identityToken } = request.body;
    if (!identityToken) return reply.status(400).send({ error: 'identityToken required' });
    const { token, user } = await loginWithApple(identityToken);
    return reply.status(200).send({ token, user });
  });

  app.post<{ Body: { phone: string } }>('/auth/phone/request', async (request, reply) => {
    const { phone } = request.body;
    if (!phone) return reply.status(400).send({ error: 'phone required' });
    await requestPhoneOtp(phone);
    return reply.status(200).send({ message: 'OTP sent' });
  });

  app.post<{ Body: { phone: string; code: string } }>('/auth/phone/verify', async (request, reply) => {
    const { phone, code } = request.body;
    if (!phone || !code) return reply.status(400).send({ error: 'phone and code required' });
    const { token, user } = await verifyPhoneOtp(phone, code);
    return reply.status(200).send({ token, user });
  });
}
