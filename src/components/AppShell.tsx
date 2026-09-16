'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return (
      <main className="min-h-screen w-full flex items-center justify-center bg-cream-100 dark:bg-[#0d0f12] text-stone-900 dark:text-stone-100 transition-colors duration-200">
        {children}
      </main>
    );
  }

  return (
    <div className="min-h-screen w-full bg-cream-100 dark:bg-[#0d0f12] text-stone-900 dark:text-stone-100 transition-colors duration-200">
      <Sidebar />
      <main className="ml-64 min-w-0 p-4 sm:p-6 lg:p-8 max-w-7xl">
        {children}
      </main>
    </div>
  );
}
