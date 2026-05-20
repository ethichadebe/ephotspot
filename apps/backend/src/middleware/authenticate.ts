import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyUserToken, verifySuperAdminToken } from '../lib/jwt';

export async function authenticateUser(request: FastifyRequest, reply: FastifyReply) {
  try {
    const auth = request.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Missing bearer token' });
    }
    const token = auth.slice(7);
    const payload = verifyUserToken(token);
    if (payload.type !== 'user' && payload.type !== 'operator') {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid token type' });
    }
    (request as any).user = payload;
  } catch {
    return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid or expired token' });
  }
}

export async function authenticateOperator(request: FastifyRequest, reply: FastifyReply) {
  try {
    const auth = request.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Missing bearer token' });
    }
    const token = auth.slice(7);
    const payload = verifyUserToken(token);
    if (payload.type !== 'operator') {
      return reply.status(403).send({ error: 'Forbidden', message: 'Operator token required' });
    }
    (request as any).user = payload;
  } catch {
    return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid or expired token' });
  }
}

export async function authenticateSuperAdmin(request: FastifyRequest, reply: FastifyReply) {
  try {
    const auth = request.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Missing bearer token' });
    }
    const token = auth.slice(7);
    const payload = verifySuperAdminToken(token);
    if (payload.type !== 'super_admin') {
      return reply.status(403).send({ error: 'Forbidden', message: 'Super admin token required' });
    }
    (request as any).user = payload;
  } catch {
    return reply.status(403).send({ error: 'Forbidden', message: 'Invalid super admin token' });
  }
}
