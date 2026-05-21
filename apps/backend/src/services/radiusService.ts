import { prisma } from '../lib/prisma';
import { mikrotikService } from './mikrotikService';
import { notificationService } from './notificationService';
import { PUSH_THRESHOLD_20_PERCENT, PUSH_THRESHOLD_10_PERCENT } from '@ephotspot/shared';

export interface AccountingPacket {
  radiusSessionId: string;
  username: string; // phone number or email — the value the user logged in with
  nodeId: string;
  type: 'Start' | 'Interim-Update' | 'Stop';
  inputOctets: number;
  outputOctets: number;
}

async function resolveUserByUsername(username: string) {
  return prisma.user.findFirst({
    where: username.startsWith('+') || /^\d/.test(username)
      ? { phone: username }
      : { email: username },
  });
}

export const radiusService = {
  async handleAccounting(packet: AccountingPacket): Promise<void> {
    const user = await resolveUserByUsername(packet.username);
    if (!user) return;
    const userId = user.id;

    const dataUsedMb = (packet.inputOctets + packet.outputOctets) / (1024 * 1024);

    if (packet.type === 'Start') {
      await prisma.session.create({
        data: {
          radiusSessionId: packet.radiusSessionId,
          userId,
          nodeId: packet.nodeId,
        },
      });
      await notificationService.send(userId, 'session_start');
      return;
    }

    if (packet.type === 'Stop') {
      await prisma.session.updateMany({
        where: { radiusSessionId: packet.radiusSessionId },
        data: { endedAt: new Date(), dataUsedMb },
      });
      await notificationService.send(userId, 'session_end');
      return;
    }

    // Interim-Update: deduct usage and check balance
    const session = await prisma.session.findUnique({
      where: { radiusSessionId: packet.radiusSessionId },
    });
    if (!session) return;

    const previousUsedMb = Number(session.dataUsedMb);
    const incrementMb = dataUsedMb - previousUsedMb;
    if (incrementMb <= 0) return;

    await prisma.session.update({
      where: { id: session.id },
      data: { dataUsedMb },
    });

    const balance = await prisma.dataBalance.findUnique({ where: { userId } });
    if (!balance) return;

    const newRemainingMb = Math.max(0, Number(balance.remainingMb) - incrementMb);

    await prisma.dataBalance.update({
      where: { userId },
      data: { remainingMb: newRemainingMb },
    });

    if (newRemainingMb <= 0) {
      await notificationService.send(userId, 'data_exhausted');
      await mikrotikService.disconnectUser(packet.nodeId, userId);
      return;
    }

    if (balance.lastPackageId) {
      const pkg = await prisma.dataPackage.findUnique({ where: { id: balance.lastPackageId } });
      if (pkg) {
        const pct = newRemainingMb / pkg.dataMb;
        if (pct <= PUSH_THRESHOLD_10_PERCENT && !session.notified10) {
          await prisma.session.update({ where: { id: session.id }, data: { notified10: true } });
          await notificationService.send(userId, 'threshold_10');
        } else if (pct <= PUSH_THRESHOLD_20_PERCENT && !session.notified20) {
          await prisma.session.update({ where: { id: session.id }, data: { notified20: true } });
          await notificationService.send(userId, 'threshold_20');
        }
      }
    }
  },

  async checkAccess(username: string, password: string, nodeId?: string): Promise<{ allow: boolean; reason?: string }> {
    const user = await resolveUserByUsername(username);
    if (!user || !user.isActive) return { allow: false, reason: 'User inactive or not found' };
    if (user.hotspotPassword !== password) return { allow: false, reason: 'Invalid password' };

    if (nodeId) {
      const node = await prisma.hotspotNode.findUnique({ where: { id: nodeId } });
      if (node) {
        const link = await prisma.operatorUser.findUnique({
          where: { operatorId_userId: { operatorId: node.operatorId, userId: user.id } },
        });
        if (link && !link.isActive) return { allow: false, reason: 'User banned on this network' };
      }
    }

    const balance = await prisma.dataBalance.findUnique({ where: { userId: user.id } });
    if (!balance || Number(balance.remainingMb) <= 0) {
      return { allow: false, reason: 'Insufficient data balance' };
    }
    return { allow: true };
  },
};
