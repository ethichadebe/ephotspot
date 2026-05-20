import Fastify from 'fastify';
import { authRoutes } from './routes/auth';
import { radiusRoutes } from './routes/radius';
import { packageRoutes } from './routes/packages';
import { paymentRoutes } from './routes/payments';

export function buildApp() {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
  });

  app.get('/health', async () => ({ status: 'ok' }));

  app.register(authRoutes);
  app.register(radiusRoutes);
  app.register(packageRoutes);
  app.register(paymentRoutes);

  return app;
}
