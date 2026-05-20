import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  // Super admin
  const superAdmin = await prisma.superAdmin.upsert({
    where: { email: 'admin@netpulse.co.za' },
    update: {},
    create: {
      email: 'admin@netpulse.co.za',
      // bcrypt hash of 'superadmin123' — replace in production
      password: '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WKxYe4i8qhFzX5xtL2Gy',
    },
  });

  // Data packages
  const package1gb = await prisma.dataPackage.upsert({
    where: { id: 'pkg-1gb' },
    update: {},
    create: {
      id: 'pkg-1gb',
      name: '1GB Bundle',
      dataMb: 1024,
      priceZar: 29.00,
      isActive: true,
    },
  });

  const package5gb = await prisma.dataPackage.upsert({
    where: { id: 'pkg-5gb' },
    update: {},
    create: {
      id: 'pkg-5gb',
      name: '5GB Bundle',
      dataMb: 5120,
      priceZar: 99.00,
      isActive: true,
    },
  });

  // Test operator
  const operator = await prisma.operator.upsert({
    where: { email: 'operator@testschool.co.za' },
    update: {},
    create: {
      name: 'Test School',
      email: 'operator@testschool.co.za',
      // bcrypt hash of 'operator123' — replace in production
      password: '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WKxYe4i8qhFzX5xtL2Gy',
      subscriptionStatus: 'active',
    },
  });

  console.log('Seed complete:', {
    superAdmin: superAdmin.email,
    packages: [package1gb.name, package5gb.name],
    operator: operator.name,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
