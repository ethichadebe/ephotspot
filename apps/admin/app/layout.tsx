import type { Metadata } from 'next';
import './globals.css';
import AuthGuard from '@/components/AuthGuard';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'EPHotspot — Operator Portal',
  description: 'Manage your EPHotspot deployment',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        <AuthGuard>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 p-8 overflow-auto">{children}</main>
          </div>
        </AuthGuard>
      </body>
    </html>
  );
}
