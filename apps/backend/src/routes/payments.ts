import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import { authenticateUser } from '../middleware/authenticate';
import { initiateCheckout, verifyWebhookSignature, isSuccessCode } from '../services/peachService';
import { initiateBangoCharge, processBangoCallback } from '../services/bangoService';
import { applyPurchase } from '../services/purchaseService';

export async function paymentRoutes(app: FastifyInstance) {
  // ── Peach Payments ─────────────────────────────────────────────────────────
  app.post<{ Body: { packageId: string } }>(
    '/payments/peach/initiate',
    { preHandler: authenticateUser },
    async (request, reply) => {
      const { packageId } = request.body;
      if (!packageId) return reply.status(400).send({ error: 'packageId required' });

      const pkg = await prisma.dataPackage.findUnique({ where: { id: packageId, isActive: true } });
      if (!pkg) return reply.status(404).send({ error: 'Package not found' });

      const userId = (request as any).user.sub as string;
      try {
        const checkoutUrl = await initiateCheckout(packageId, Number(pkg.priceZar), userId);
        return reply.status(200).send({ checkoutUrl });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Payment initiation failed';
        if (msg.includes('not configured')) return reply.status(501).send({ error: msg });
        return reply.status(500).send({ error: msg });
      }
    }
  );

  app.post('/payments/peach/webhook', async (request, reply) => {
    const signature = (request.headers['x-oppwa-signature'] as string) || '';
    const rawBody = JSON.stringify(request.body);

    if (!verifyWebhookSignature(rawBody, signature)) {
      return reply.status(401).send({ error: 'Invalid signature' });
    }

    const body = request.body as any;
    const resultCode: string = body?.result?.code || '';
    if (!isSuccessCode(resultCode)) {
      return reply.status(200).send({ received: true }); // ack without applying
    }

    const userId: string = body?.customParameters?.USER_ID;
    const packageId: string = body?.customParameters?.PACKAGE_ID;
    const amountZar = parseFloat(body?.amount || '0');
    const reference: string = body?.id || body?.merchantTransactionId;

    if (!userId || !packageId || !reference) {
      return reply.status(400).send({ error: 'Missing payment data in webhook' });
    }

    await applyPurchase(userId, packageId, amountZar, 'peach', reference);
    return reply.status(200).send({ received: true });
  });

  // ── Bango Carrier Billing ───────────────────────────────────────────────────
  app.post<{ Body: { packageId: string; phone: string } }>(
    '/payments/bango/initiate',
    { preHandler: authenticateUser },
    async (request, reply) => {
      const { packageId, phone } = request.body;
      if (!packageId || !phone) return reply.status(400).send({ error: 'packageId and phone required' });

      const pkg = await prisma.dataPackage.findUnique({ where: { id: packageId, isActive: true } });
      if (!pkg) return reply.status(404).send({ error: 'Package not found' });

      const userId = (request as any).user.sub as string;
      try {
        const result = await initiateBangoCharge(userId, phone, packageId, Number(pkg.priceZar));
        return reply.status(200).send(result);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Charge initiation failed';
        if (msg.includes('not configured')) return reply.status(501).send({ error: msg });
        return reply.status(500).send({ error: msg });
      }
    }
  );

  app.post('/payments/bango/callback', async (request, reply) => {
    const body = request.body as any;
    const result = await processBangoCallback(body);
    if (result.success) {
      await applyPurchase(result.userId, result.packageId, result.amountZar, 'bango', result.reference);
    }
    return reply.status(200).send({ received: true });
  });
}
