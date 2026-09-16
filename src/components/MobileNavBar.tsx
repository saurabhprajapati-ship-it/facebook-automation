'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, Plus, MessageSquare, Link2 } from 'lucide-react';

export default function MobileNavBar() {
  const pathname = usePathname();

  const navItems = [
    {
      name: 'Home',
      href: '/',
      icon: Home,
      isActive: pathname === '/',
    },
    {
      name: 'Schedule',
      href: '/bulk-schedule',
      icon: Calendar,
      isActive: pathname.startsWith('/bulk-schedule'),
    },
    {
      name: 'New Post',
      href: '/new-post',
      icon: Plus,
      isSpecial: true,
      isActive: pathname.startsWith('/new-post'),
    },
    {
      name: 'Auto-DM',
      href: '/inbox',
      icon: MessageSquare,
      isActive: pathname.startsWith('/inbox'),
    },
    {
      name: 'Accounts',
      href: '/accounts/facebook',
      icon: Link2,
      isActive: pathname.startsWith('/accounts'),
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-cream-50/95 dark:bg-stone-900/95 backdrop-blur-md border-t border-cream-200/90 dark:border-stone-800/90 px-3 py-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] transition-colors duration-200"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;

          if (item.isSpecial) {
            return (
              <Link
                key={item.name}
                href={item.href}
                className="flex flex-col items-center justify-center -mt-5 group"
                aria-label={item.name}
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform active:scale-95 duration-200 ${
                    item.isActive
                      ? 'bg-amber-600 text-white ring-4 ring-amber-400/30'
                      : 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/30'
                  }`}
                >
                  <Icon className="w-6 h-6 stroke-[2.5]" />
                </div>
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 mt-0.5">
                  {item.name}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-150 min-w-[56px] min-h-[44px] ${
                item.isActive
                  ? 'text-amber-600 dark:text-amber-400 font-bold'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <div
                className={`p-1 rounded-lg transition-colors ${
                  item.isActive
                    ? 'bg-amber-100/80 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'
                    : ''
                }`}
              >
                <Icon className="w-5 h-5 stroke-[2]" />
              </div>
              <span
                className={`text-[10px] tracking-tight mt-0.5 ${
                  item.isActive ? 'font-bold' : 'font-medium'
                }`}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
