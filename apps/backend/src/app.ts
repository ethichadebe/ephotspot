import Fastify from 'fastify';
import { authRoutes } from './routes/auth';
import { radiusRoutes } from './routes/radius';
import { packageRoutes } from './routes/packages';
import { paymentRoutes } from './routes/payments';
import { notificationRoutes } from './routes/notifications';
import { adminRoutes } from './routes/admin';
import { superAdminRoutes } from './routes/superAdmin';
import { operatorAuthRoutes } from './routes/operatorAuth';
import { userRoutes } from './routes/user';

export function buildApp() {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
  });

  app.get('/health', async () => ({ status: 'ok' }));

  app.register(authRoutes);
  app.register(radiusRoutes);
  app.register(packageRoutes);
  app.register(paymentRoutes);
  app.register(notificationRoutes);
  app.register(adminRoutes);
  app.register(superAdminRoutes);
  app.register(operatorAuthRoutes);
  app.register(userRoutes);

  return app;
}
