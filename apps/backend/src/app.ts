import Fastify from 'fastify';
import { authRoutes } from './routes/auth';

export function buildApp() {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
  });

  app.get('/health', async () => ({ status: 'ok' }));

  app.register(authRoutes);

  return app;
}
