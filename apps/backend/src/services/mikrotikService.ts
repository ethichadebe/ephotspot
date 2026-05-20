import { prisma } from '../lib/prisma';

export interface NodeStatus {
  nodeId: string;
  isOnline: boolean;
  uptime?: string;
}

export interface ActiveConnection {
  userId: string;
  sessionId: string;
  duration: number;
  dataUsedMb: number;
}

async function fetchMikrotik(node: { ipAddress: string; apiUsername: string; apiPassword: string }, path: string) {
  const port = process.env.MIKROTIK_DEFAULT_PORT || '8728';
  const url = `http://${node.ipAddress}:${port}/rest${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${node.apiUsername}:${node.apiPassword}`).toString('base64'),
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`MikroTik API error: ${res.status}`);
  return res.json();
}

export const mikrotikService = {
  async getNodeStatus(nodeId: string): Promise<NodeStatus> {
    const node = await prisma.hotspotNode.findUnique({ where: { id: nodeId } });
    if (!node) throw new Error(`Node ${nodeId} not found`);

    try {
      const data = await fetchMikrotik(node, '/system/resource') as any;
      await prisma.hotspotNode.update({
        where: { id: nodeId },
        data: { isOnline: true, lastSeenAt: new Date() },
      });
      return { nodeId, isOnline: true, uptime: data.uptime };
    } catch {
      await prisma.hotspotNode.update({ where: { id: nodeId }, data: { isOnline: false } });
      return { nodeId, isOnline: false };
    }
  },

  async getActiveConnections(nodeId: string): Promise<ActiveConnection[]> {
    const node = await prisma.hotspotNode.findUnique({ where: { id: nodeId } });
    if (!node) throw new Error(`Node ${nodeId} not found`);

    try {
      const data = await fetchMikrotik(node, '/ip/hotspot/active') as any[];
      return data.map((entry: any) => ({
        userId: entry.user,
        sessionId: entry['session-id'],
        duration: parseInt(entry.uptime || '0'),
        dataUsedMb: (parseInt(entry['bytes-in'] || '0') + parseInt(entry['bytes-out'] || '0')) / (1024 * 1024),
      }));
    } catch {
      return [];
    }
  },

  async disconnectUser(nodeId: string, userId: string): Promise<void> {
    const node = await prisma.hotspotNode.findUnique({ where: { id: nodeId } });
    if (!node) throw new Error(`Node ${nodeId} not found`);

    try {
      await fetchMikrotik(node, `/ip/hotspot/active/remove?user=${encodeURIComponent(userId)}`);
    } catch (err) {
      // TODO: structured error logging
      console.error(`Failed to disconnect user ${userId} from node ${nodeId}:`, err);
    }
  },
};
