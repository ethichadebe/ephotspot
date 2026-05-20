import type { FastifyInstance } from 'fastify';
import { authenticateUser } from '../middleware/authenticate';
import { notificationService } from '../services/notificationService';

export async function notificationRoutes(app: FastifyInstance) {
  app.post<{ Body: { token: string } }>(
    '/notifications/register',
    { preHandler: authenticateUser },
    async (request, reply) => {
      const { token } = request.body;
      if (!token) return reply.status(400).send({ error: 'token required' });
      const userId = (request as any).user.sub as string;
      await notificationService.registerToken(userId, token);
      return reply.status(200).send({ registered: true });
    }
  );
}
