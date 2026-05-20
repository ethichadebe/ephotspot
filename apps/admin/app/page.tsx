'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { connectSocket } from '@/lib/socket';

interface Stats {
  totalUsers: number;
  activeSessions: number;
  dataConsumedTodayMb: number;
  revenueThisMonthZar: number;
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
    </div>
  );
}

function formatMb(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${Math.round(mb)} MB`;
}

export default function OverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<Stats>('/admin/stats')
      .then(setStats)
      .catch((e: Error) => setError(e.message));

    const token = localStorage.getItem('ep_operator_token');
    if (!token) return;
    const socket = connectSocket(token);

    socket.on('stats:update', (data: Stats) => setStats(data));
    socket.on('session:start', () =>
      setStats((prev) => prev ? { ...prev, activeSessions: prev.activeSessions + 1 } : prev)
    );
    socket.on('session:end', () =>
      setStats((prev) => prev ? { ...prev, activeSessions: Math.max(0, prev.activeSessions - 1) } : prev)
    );

    return () => {
      socket.off('stats:update');
      socket.off('session:start');
      socket.off('session:end');
    };
  }, []);

  if (error) return <div className="text-red-600 p-4">Error: {error}</div>;
  if (!stats) return <div className="text-gray-400 p-4">Loading…</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Overview</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Users" value={stats.totalUsers.toLocaleString()} />
        <StatCard label="Active Sessions" value={stats.activeSessions.toLocaleString()} />
        <StatCard label="Data Today" value={formatMb(stats.dataConsumedTodayMb)} />
        <StatCard label="Revenue This Month" value={`R ${stats.revenueThisMonthZar.toFixed(2)}`} />
      </div>
    </div>
  );
}
