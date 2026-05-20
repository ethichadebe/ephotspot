/**
 * Prisma client shape tests — verify models and key fields exist.
 * These run without a live DB by checking the generated client structure.
 */
import { PrismaClient } from '@prisma/client';

describe('Prisma schema', () => {
  it('PrismaClient exposes all required models', () => {
    const client = new PrismaClient();
    const models = Object.keys(client).filter((k) => !k.startsWith('$') && !k.startsWith('_'));
    const required = [
      'user',
      'superAdmin',
      'operator',
      'hotspotNode',
      'dataPackage',
      'dataBalance',
      'session',
      'purchase',
      'pushToken',
      'otpCode',
      'operatorUser',
    ];
    for (const model of required) {
      expect(models).toContain(model);
    }
    void client.$disconnect();
  });
});
