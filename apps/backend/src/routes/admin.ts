import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import { authenticateOperator } from '../middleware/authenticate';
import { mikrotikService } from '../services/mikrotikService';

export async function adminRoutes(app: FastifyInstance) {
  // All routes require operator JWT
  app.addHook('preHandler', authenticateOperator);

  // ── Users ───────────────────────────────────────────────────────────────────
  app.get<{ Querystring: { page?: string; limit?: string; search?: string } }>(
    '/admin/users',
    async (request, reply) => {
      const operatorId = (request as any).user.sub as string;
      const page = parseInt(request.query.page || '1');
      const limit = parseInt(request.query.limit || '20');
      const search = request.query.search || '';

      const where = {
        operatorLinks: { some: { operatorId } },
        ...(search ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search } },
          ],
        } : {}),
      };

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          include: { balance: true },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.user.count({ where }),
      ]);

      return { users, total, page, limit };
    }
  );

  app.get<{ Params: { id: string } }>('/admin/users/:id', async (request, reply) => {
    const operatorId = (request as any).user.sub as string;
    const user = await prisma.user.findFirst({
      where: { id: request.params.id, operatorLinks: { some: { operatorId } } },
      include: { balance: true, purchases: { include: { package: true }, orderBy: { createdAt: 'desc' } } },
    });
    if (!user) return reply.status(404).send({ error: 'User not found' });
    return user;
  });

  app.patch<{ Params: { id: string } }>('/admin/users/:id/deactivate', async (request, reply) => {
    const operatorId = (request as any).user.sub as string;
    const link = await prisma.operatorUser.findFirst({
      where: { userId: request.params.id, operatorId },
    });
    if (!link) return reply.status(404).send({ error: 'User not found on this network' });
    const user = await prisma.user.update({
      where: { id: request.params.id },
      data: { isActive: false },
    });
    return user;
  });

  // ── Nodes ───────────────────────────────────────────────────────────────────
  app.get('/admin/nodes', async (request) => {
    const operatorId = (request as any).user.sub as string;
    return prisma.hotspotNode.findMany({ where: { operatorId }, orderBy: { name: 'asc' } });
  });

  app.get<{ Params: { id: string } }>('/admin/nodes/:id/sessions', async (request, reply) => {
    const operatorId = (request as any).user.sub as string;
    const node = await prisma.hotspotNode.findFirst({ where: { id: request.params.id, operatorId } });
    if (!node) return reply.status(404).send({ error: 'Node not found' });
    const active = await mikrotikService.getActiveConnections(request.params.id).catch(() => []);
    return active;
  });

  // ── Stats ───────────────────────────────────────────────────────────────────
  app.get('/admin/stats', async (request) => {
    const operatorId = (request as any).user.sub as string;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [totalUsers, activeSessions, nodes] = await Promise.all([
      prisma.user.count({ where: { operatorLinks: { some: { operatorId } } } }),
      prisma.session.count({
        where: { endedAt: null, node: { operatorId } },
      }),
      prisma.hotspotNode.findMany({ where: { operatorId }, select: { id: true } }),
    ]);

    const nodeIds = nodes.map((n) => n.id);

    const [dataToday, revenueMonth] = await Promise.all([
      prisma.session.aggregate({
        where: { nodeId: { in: nodeIds }, startedAt: { gte: today } },
        _sum: { dataUsedMb: true },
      }),
      prisma.purchase.aggregate({
        where: { user: { operatorLinks: { some: { operatorId } } }, createdAt: { gte: monthStart } },
        _sum: { amountZar: true },
      }),
    ]);

    return {
      totalUsers,
      activeSessions,
      dataConsumedTodayMb: Number(dataToday._sum.dataUsedMb || 0),
      revenueThisMonthZar: Number(revenueMonth._sum.amountZar || 0),
    };
  });
}
