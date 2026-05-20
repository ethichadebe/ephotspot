import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import { signUserToken } from '../lib/jwt';
import crypto from 'crypto';

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export async function operatorAuthRoutes(app: FastifyInstance) {
  app.post<{ Body: { email: string; password: string } }>('/auth/operator/login', async (request, reply) => {
    const { email, password } = request.body;
    if (!email || !password) return reply.status(400).send({ error: 'email and password required' });

    const operator = await prisma.operator.findUnique({ where: { email } });
    if (!operator || !operator.isActive || operator.subscriptionStatus === 'suspended') {
      return reply.status(401).send({ error: 'Invalid credentials or account suspended' });
    }

    // Support both plaintext (dev seed) and sha256 hashed passwords
    const matches =
      operator.password === password ||
      operator.password === hashPassword(password);

    if (!matches) return reply.status(401).send({ error: 'Invalid credentials' });

    const token = signUserToken(operator.id, 'operator');
    return reply.status(200).send({ token, operator: { id: operator.id, name: operator.name, email: operator.email } });
  });
}
