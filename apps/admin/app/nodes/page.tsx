'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { connectSocket } from '@/lib/socket';

interface Node {
  id: string;
  name: string;
  ipAddress: string;
  isOnline: boolean;
  lastSeenAt: string | null;
}

interface ActiveSession {
  userId: string;
  sessionId: string;
  duration: number;
  dataUsedMb: number;
}

function StatusDot({ online }: { online: boolean }) {
  return (
    <span className={`inline-block w-2.5 h-2.5 rounded-full mr-2 ${online ? 'bg-green-500' : 'bg-red-400'}`} />
  );
}

export default function NodesPage() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [sessions, setSessions] = useState<Record<string, ActiveSession[]>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);

  useEffect(() => {
    apiFetch<Node[]>('/admin/nodes').then(setNodes).catch(console.error);

    const token = localStorage.getItem('ep_operator_token');
    if (!token) return;
    const socket = connectSocket(token);

    socket.on('node:status', ({ nodeId, isOnline }: { nodeId: string; isOnline: boolean }) => {
      setNodes((prev) => prev.map((n) => n.id === nodeId ? { ...n, isOnline } : n));
    });

    return () => { socket.off('node:status'); };
  }, []);

  async function toggleExpand(nodeId: string) {
    if (expanded === nodeId) { setExpanded(null); return; }
    setExpanded(nodeId);
    if (!sessions[nodeId]) {
      setLoadingSessions(true);
      try {
        const data = await apiFetch<ActiveSession[]>(`/admin/nodes/${nodeId}/sessions`);
        setSessions((prev) => ({ ...prev, [nodeId]: data }));
      } finally {
        setLoadingSessions(false);
      }
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Hotspot Nodes</h1>
      <div className="space-y-4">
        {nodes.length === 0 && <p className="text-gray-400">No nodes configured.</p>}
        {nodes.map((node) => (
          <div key={node.id} className="bg-white rounded-xl shadow-sm border border-gray-100">
            <button
              onClick={() => toggleExpand(node.id)}
              className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 rounded-xl"
            >
              <div className="flex items-center">
                <StatusDot online={node.isOnline} />
                <span className="font-semibold text-gray-900">{node.name}</span>
                <span className="ml-3 text-sm text-gray-400">{node.ipAddress}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-xs font-medium ${node.isOnline ? 'text-green-600' : 'text-red-500'}`}>
                  {node.isOnline ? 'Online' : 'Offline'}
                </span>
                <span className="text-gray-400 text-sm">{expanded === node.id ? '▲' : '▼'}</span>
              </div>
            </button>
            {expanded === node.id && (
              <div className="border-t border-gray-100 px-6 py-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Active Sessions</h3>
                {loadingSessions ? (
                  <p className="text-gray-400 text-sm">Loading…</p>
                ) : sessions[node.id]?.length === 0 ? (
                  <p className="text-gray-400 text-sm">No active sessions</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-500 uppercase">
                        <th className="text-left pb-2">User</th>
                        <th className="text-left pb-2">Duration</th>
                        <th className="text-left pb-2">Data Used</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {(sessions[node.id] || []).map((s) => (
                        <tr key={s.sessionId}>
                          <td className="py-2">{s.userId}</td>
                          <td className="py-2">{Math.round(s.duration / 60)}m</td>
                          <td className="py-2">{s.dataUsedMb.toFixed(1)} MB</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
