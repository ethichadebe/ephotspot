import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import { authenticateSuperAdmin } from '../middleware/authenticate';
import { signUserToken } from '../lib/jwt';
import crypto from 'crypto';

export async function superAdminRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticateSuperAdmin);

  app.get('/super/operators', async () => {
    return prisma.operator.findMany({ orderBy: { createdAt: 'desc' } });
  });

  app.post<{ Body: { name: string; email: string } }>('/super/operators', async (request, reply) => {
    const { name, email } = request.body;
    if (!name || !email) return reply.status(400).send({ error: 'name and email required' });
    const tempPassword = crypto.randomBytes(12).toString('hex');
    const operator = await prisma.operator.create({
      data: { name, email, password: tempPassword, subscriptionStatus: 'trial' },
    });
    const token = signUserToken(operator.id, 'operator');
    return reply.status(201).send({ operator, token, tempPassword });
  });

  app.patch<{ Params: { id: string } }>('/super/operators/:id/suspend', async (request, reply) => {
    const operator = await prisma.operator.update({
      where: { id: request.params.id },
      data: { subscriptionStatus: 'suspended', isActive: false },
    });
    return operator;
  });

  app.get('/super/stats', async () => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [totalUsers, totalNodes, activeSessions, revenue] = await Promise.all([
      prisma.user.count(),
      prisma.hotspotNode.count(),
      prisma.session.count({ where: { endedAt: null } }),
      prisma.purchase.aggregate({
        where: { createdAt: { gte: monthStart } },
        _sum: { amountZar: true },
      }),
    ]);

    return {
      totalUsers,
      totalNodes,
      activeSessions,
      revenueThisMonthZar: Number(revenue._sum.amountZar || 0),
    };
  });

  // Super admin packages listing (includes inactive)
  app.get('/super/packages', async () => {
    return prisma.dataPackage.findMany({ orderBy: { priceZar: 'asc' } });
  });
}
