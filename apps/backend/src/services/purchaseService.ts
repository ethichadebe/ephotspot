import { prisma } from '../lib/prisma';
import { notificationService } from './notificationService';
import type { PaymentMethod } from '@prisma/client';

export async function applyPurchase(
  userId: string,
  packageId: string,
  amountZar: number,
  paymentMethod: PaymentMethod,
  paymentReference: string
): Promise<void> {
  const pkg = await prisma.dataPackage.findUnique({ where: { id: packageId } });
  if (!pkg) throw new Error(`Package ${packageId} not found`);

  await prisma.$transaction(async (tx) => {
    await tx.purchase.create({
      data: { userId, packageId, amountZar, paymentMethod, paymentReference },
    });

    const balance = await tx.dataBalance.findUnique({ where: { userId } });
    const currentMb = balance ? Number(balance.remainingMb) : 0;
    const rolledOver = balance ? Number(balance.rolledOverMb) : 0;
    const addedMb = pkg.dataMb;
    const newRemainingMb = currentMb + addedMb;
    // rolledOverMb tracks how much pre-existing balance carried into this purchase
    const newRolledOverMb = rolledOver + currentMb;

    await tx.dataBalance.upsert({
      where: { userId },
      update: {
        remainingMb: newRemainingMb,
        rolledOverMb: newRolledOverMb,
        lastPackageId: packageId,
      },
      create: {
        userId,
        remainingMb: newRemainingMb,
        rolledOverMb: 0,
        lastPackageId: packageId,
      },
    });
  });

  await notificationService.send(userId, 'purchase_confirmed');
}
