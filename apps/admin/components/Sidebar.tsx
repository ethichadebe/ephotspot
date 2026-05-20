'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { disconnectSocket } from '@/lib/socket';

const nav = [
  { href: '/', label: 'Overview' },
  { href: '/users', label: 'Users' },
  { href: '/nodes', label: 'Hotspot Nodes' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    localStorage.removeItem('ep_operator_token');
    disconnectSocket();
    router.push('/login');
  }

  return (
    <aside className="w-56 min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="px-6 py-5 border-b border-gray-700">
        <span className="font-bold text-lg tracking-tight">EPHotspot</span>
        <span className="block text-xs text-gray-400 mt-0.5">Operator Portal</span>
      </div>
      <nav className="flex-1 py-4">
        {nav.map(({ href, label }) => (
          <Link
            key={href} href={href}
            className={`flex items-center px-6 py-3 text-sm font-medium hover:bg-gray-800 transition-colors ${pathname === href ? 'bg-gray-800 text-white' : 'text-gray-300'}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <button onClick={handleLogout} className="px-6 py-4 text-sm text-gray-400 hover:text-white text-left border-t border-gray-700">
        Sign out
      </button>
    </aside>
  );
}
