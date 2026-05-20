import { prisma } from '../lib/prisma';
import { mikrotikService } from './mikrotikService';
import { notificationService } from './notificationService';
import { PUSH_THRESHOLD_20_PERCENT, PUSH_THRESHOLD_10_PERCENT } from '@ephotspot/shared';

export interface AccountingPacket {
  radiusSessionId: string;
  userId: string;
  nodeId: string;
  type: 'Start' | 'Interim-Update' | 'Stop';
  inputOctets: number;
  outputOctets: number;
}

export const radiusService = {
  async handleAccounting(packet: AccountingPacket): Promise<void> {
    const dataUsedMb = (packet.inputOctets + packet.outputOctets) / (1024 * 1024);

    if (packet.type === 'Start') {
      await prisma.session.create({
        data: {
          radiusSessionId: packet.radiusSessionId,
          userId: packet.userId,
          nodeId: packet.nodeId,
        },
      });
      await notificationService.send(packet.userId, 'session_start');
      return;
    }

    if (packet.type === 'Stop') {
      await prisma.session.updateMany({
        where: { radiusSessionId: packet.radiusSessionId },
        data: { endedAt: new Date(), dataUsedMb },
      });
      await notificationService.send(packet.userId, 'session_end');
      return;
    }

    // Interim-Update: deduct usage and check balance
    const session = await prisma.session.findUnique({
      where: { radiusSessionId: packet.radiusSessionId },
    });
    if (!session) return;

    // Calculate incremental usage since last update
    const previousUsedMb = Number(session.dataUsedMb);
    const incrementMb = dataUsedMb - previousUsedMb;
    if (incrementMb <= 0) return;

    await prisma.session.update({
      where: { id: session.id },
      data: { dataUsedMb },
    });

    // Deduct from balance
    const balance = await prisma.dataBalance.findUnique({ where: { userId: packet.userId } });
    if (!balance) return;

    const newRemainingMb = Math.max(0, Number(balance.remainingMb) - incrementMb);

    await prisma.dataBalance.update({
      where: { userId: packet.userId },
      data: { remainingMb: newRemainingMb },
    });

    // Check if balance hit zero
    if (newRemainingMb <= 0) {
      await notificationService.send(packet.userId, 'data_exhausted');
      await mikrotikService.disconnectUser(packet.nodeId, packet.userId);
      return;
    }

    // Check thresholds — evaluate against last purchased package size
    if (balance.lastPackageId) {
      const pkg = await prisma.dataPackage.findUnique({ where: { id: balance.lastPackageId } });
      if (pkg) {
        const pct = newRemainingMb / pkg.dataMb;
        if (pct <= PUSH_THRESHOLD_10_PERCENT && !session.notified10) {
          await prisma.session.update({ where: { id: session.id }, data: { notified10: true } });
          await notificationService.send(packet.userId, 'threshold_10');
        } else if (pct <= PUSH_THRESHOLD_20_PERCENT && !session.notified20) {
          await prisma.session.update({ where: { id: session.id }, data: { notified20: true } });
          await notificationService.send(packet.userId, 'threshold_20');
        }
      }
    }
  },

  async checkAccess(userId: string): Promise<{ allow: boolean; reason?: string }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) return { allow: false, reason: 'User inactive or not found' };

    const balance = await prisma.dataBalance.findUnique({ where: { userId } });
    if (!balance || Number(balance.remainingMb) <= 0) {
      return { allow: false, reason: 'Insufficient data balance' };
    }
    return { allow: true };
  },
};
