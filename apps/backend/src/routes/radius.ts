import type { FastifyInstance } from 'fastify';
import { radiusService } from '../services/radiusService';
import type { AccountingPacket } from '../services/radiusService';

export async function radiusRoutes(app: FastifyInstance) {
  // Called by FreeRADIUS rlm_rest module for Access-Request
  app.post<{ Body: { username: string } }>('/radius/authorize', async (request, reply) => {
    const { username } = request.body;
    const result = await radiusService.checkAccess(username);
    if (result.allow) {
      return reply.status(200).send({ reply: 'Access-Accept' });
    }
    return reply.status(200).send({ reply: 'Access-Reject', reason: result.reason });
  });

  // Called by FreeRADIUS rlm_rest for Accounting-Request packets
  app.post<{ Body: AccountingPacket }>('/radius/accounting', async (request, reply) => {
    await radiusService.handleAccounting(request.body);
    return reply.status(200).send({ ok: true });
  });
}
