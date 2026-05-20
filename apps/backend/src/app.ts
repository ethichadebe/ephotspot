import Fastify from 'fastify';
import { authRoutes } from './routes/auth';
import { radiusRoutes } from './routes/radius';

export function buildApp() {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
  });

  app.get('/health', async () => ({ status: 'ok' }));

  app.register(authRoutes);
  app.register(radiusRoutes);

  return app;
}
