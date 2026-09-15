'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  PenSquare,
  Zap,
  Rss,
  Sparkles,
  Image as ImageIcon,
  ListOrdered,
  Link2,
  Bell,
  Settings,
  LogOut,
  Calendar,
  HardDrive,
  MessageSquare,
} from 'lucide-react';

const MENU_ITEMS = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Auto DM & Inbox', href: '/inbox', icon: MessageSquare },
  { name: 'Bulk Schedule', href: '/bulk-schedule', icon: Calendar },
  { name: 'Google Drive', href: '/drive', icon: HardDrive },
  { name: 'New post', href: '/new-post', icon: PenSquare },
  { name: 'Auto post', href: '/auto', icon: Zap },
  { name: 'My website', href: '/auto/new?kind=feed', icon: Rss },
  { name: 'Gemini', href: '/gemini', icon: Sparkles },
  { name: 'Branding', href: '/branding', icon: ImageIcon },
  { name: 'Posts', href: '/posts', icon: ListOrdered },
  { name: 'Accounts', href: '/accounts/facebook', icon: Link2 },
  { name: 'Notifications', href: '/notifications', icon: Bell, badge: true },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetch('/api/notifications')
      .then((res) => res.json())
      .then((data) => {
        if (data.notifications) {
          setUnreadCount(data.notifications.length);
        }
      })
      .catch(() => {});
  }, [pathname]);

  return (
    <aside className="w-64 min-h-screen bg-cream-50 border-r border-cream-200/80 flex flex-col justify-between p-4 select-none shrink-0">
      <div>
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 px-3 py-4 mb-3 group">
          <div className="w-9 h-9 rounded-2xl bg-amber-500 flex items-center justify-center text-white font-black text-xl shadow-sm">
            ✦
          </div>
          <div className="font-extrabold text-2xl tracking-tight text-brand-dark">
            Post<span className="text-amber-500 font-black">Nova</span>
          </div>
        </Link>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : item.href.startsWith('/accounts')
                ? pathname.startsWith('/accounts')
                : pathname.startsWith(item.href.split('?')[0]);

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-amber-100/70 text-amber-950 shadow-sm border border-amber-300/60 font-bold'
                    : 'text-stone-600 hover:bg-cream-200/50 hover:text-stone-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                      isActive
                        ? 'bg-brand-yellow text-amber-950 shadow-xs'
                        : 'bg-cream-200/60 text-stone-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span>{item.name}</span>
                </div>

                {item.badge && unreadCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center shadow-xs">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Profile / Logout */}
      <div className="pt-4 border-t border-cream-200/80">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-9 h-9 rounded-full bg-amber-200 border-2 border-brand-yellow text-amber-900 font-bold flex items-center justify-center text-sm shadow-xs">
            N
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-stone-900 truncate">Naveed</p>
            <p className="text-[11px] text-stone-500 truncate">shahtube100@gmail....</p>
          </div>
        </div>
        <button
          onClick={() => alert('Logged in as local admin session')}
          className="w-full flex items-center gap-2 px-3 py-2 mt-1 rounded-xl text-xs font-semibold text-stone-500 hover:text-stone-800 hover:bg-cream-200/40 transition"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
