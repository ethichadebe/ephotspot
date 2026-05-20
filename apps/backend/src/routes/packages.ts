import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import { authenticateSuperAdmin } from '../middleware/authenticate';

export async function packageRoutes(app: FastifyInstance) {
  app.get('/packages', async () => {
    return prisma.dataPackage.findMany({ where: { isActive: true }, orderBy: { priceZar: 'asc' } });
  });

  app.post<{ Body: { name: string; dataMb: number; priceZar: number } }>(
    '/packages',
    { preHandler: authenticateSuperAdmin },
    async (request, reply) => {
      const { name, dataMb, priceZar } = request.body;
      if (!name || !dataMb || !priceZar) {
        return reply.status(400).send({ error: 'name, dataMb, and priceZar are required' });
      }
      const pkg = await prisma.dataPackage.create({ data: { name, dataMb, priceZar } });
      return reply.status(201).send(pkg);
    }
  );

  app.patch<{ Params: { id: string }; Body: { name?: string; dataMb?: number; priceZar?: number } }>(
    '/packages/:id',
    { preHandler: authenticateSuperAdmin },
    async (request, reply) => {
      const pkg = await prisma.dataPackage.update({
        where: { id: request.params.id },
        data: request.body,
      });
      return reply.status(200).send(pkg);
    }
  );

  app.delete<{ Params: { id: string } }>(
    '/packages/:id',
    { preHandler: authenticateSuperAdmin },
    async (request, reply) => {
      const pkg = await prisma.dataPackage.update({
        where: { id: request.params.id },
        data: { isActive: false },
      });
      return reply.status(200).send(pkg);
    }
  );
}
