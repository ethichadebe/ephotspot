import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import { authenticateUser } from '../middleware/authenticate';

export async function userRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticateUser);

  app.get('/user/balance', async (request) => {
    const userId = (request as any).user.sub as string;
    const balance = await prisma.dataBalance.findUnique({ where: { userId } });
    return balance ?? { remainingMb: 0, rolledOverMb: 0, lastPackageId: null };
  });

  app.get('/user/purchases', async (request) => {
    const userId = (request as any).user.sub as string;
    return prisma.purchase.findMany({
      where: { userId },
      include: { package: true },
      orderBy: { createdAt: 'desc' },
    });
  });
}
