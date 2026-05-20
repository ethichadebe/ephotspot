'use client';
import { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api';

interface User {
  id: string;
  name: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  balance?: { remainingMb: number } | null;
}

interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
}

function formatMb(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${Math.round(mb)} MB`;
}

export default function UsersPage() {
  const [data, setData] = useState<UsersResponse | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [deactivating, setDeactivating] = useState<string | null>(null);

  const load = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), limit: '20', ...(search ? { search } : {}) });
    apiFetch<UsersResponse>(`/admin/users?${params}`).then(setData).catch(console.error);
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  async function deactivate(userId: string) {
    setDeactivating(userId);
    try {
      await apiFetch(`/admin/users/${userId}/deactivate`, { method: 'PATCH' });
      load();
    } finally {
      setDeactivating(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Users</h1>
      <div className="mb-4">
        <input
          type="search" placeholder="Search by name or phone…" value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 w-72 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Name', 'Phone', 'Balance', 'Status', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data?.users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{u.name || '—'}</td>
                <td className="px-4 py-3 text-gray-600">{u.phone || '—'}</td>
                <td className="px-4 py-3">{u.balance ? formatMb(u.balance.remainingMb) : '0 MB'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {u.isActive ? 'Active' : 'Deactivated'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {u.isActive && (
                    <button
                      onClick={() => deactivate(u.id)}
                      disabled={deactivating === u.id}
                      className="text-red-600 hover:text-red-800 text-xs font-medium disabled:opacity-50"
                    >
                      {deactivating === u.id ? 'Deactivating…' : 'Deactivate'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {data?.users.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No users found</td></tr>
            )}
          </tbody>
        </table>
        {data && data.total > data.limit && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">{data.total} total</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1 text-sm border rounded disabled:opacity-50">Previous</button>
              <button onClick={() => setPage((p) => p + 1)} disabled={page * data.limit >= data.total}
                className="px-3 py-1 text-sm border rounded disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
