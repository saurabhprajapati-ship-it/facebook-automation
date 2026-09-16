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
  Sun,
  Moon,
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
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentUser, setCurrentUser] = useState({ name: 'Saurabh', email: 'saurabhprajapatidev@gmail.com' });

  useEffect(() => {
    // Notifications check
    fetch('/api/notifications')
      .then((res) => res.json())
      .then((data) => {
        if (data.notifications) {
          setUnreadCount(data.notifications.length);
        }
      })
      .catch(() => {});

    // Theme initialization
    const savedTheme = localStorage.getItem('postnova_theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
    } else {
      document.documentElement.classList.remove('dark');
      setIsDarkMode(false);
    }

    // User session verification from server
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setCurrentUser(data.user);
          try {
            localStorage.setItem('postnova_user', JSON.stringify(data.user));
          } catch {}
        } else {
          if (pathname !== '/login') {
            window.location.href = '/login';
          }
        }
      })
      .catch(() => {
        try {
          const savedUser = localStorage.getItem('postnova_user');
          if (savedUser) {
            const parsed = JSON.parse(savedUser);
            if (parsed?.name) setCurrentUser(parsed);
          }
        } catch {}
      });
  }, [pathname]);

  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('postnova_theme', 'light');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('postnova_theme', 'dark');
      setIsDarkMode(true);
    }
  };

  const handleLogout = async () => {
    if (confirm('Do you want to log out of PostNova?')) {
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
      localStorage.removeItem('postnova_user');
      window.location.href = '/login';
    }
  };

  return (
    <aside className="w-64 h-screen sticky top-0 bg-cream-50 dark:bg-stone-900 border-r border-cream-200/80 dark:border-stone-800 flex flex-col select-none shrink-0 overflow-hidden z-30 transition-colors">
      {/* 1. Pinned Logo Header (Never scrolls) */}
      <div className="p-4 pb-3 shrink-0 border-b border-cream-200/50 dark:border-stone-800/80 bg-cream-50/90 dark:bg-stone-900/90 backdrop-blur-xs">
        <Link href="/" className="flex items-center gap-2.5 px-2 py-1 group">
          <div className="w-9 h-9 rounded-2xl bg-amber-500 flex items-center justify-center text-white font-black text-xl shadow-sm group-hover:rotate-12 transition-transform duration-300">
            ✦
          </div>
          <div className="font-extrabold text-2xl tracking-tight text-brand-dark dark:text-white">
            Post<span className="text-amber-500 font-black">Nova</span>
          </div>
        </Link>
      </div>

      {/* 2. Scrollable Navigation Tools (Only these tools scroll) */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        <nav className="space-y-1">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const isWebsiteFeed = typeof window !== 'undefined' && window.location.search.includes('kind=feed');
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : item.href.startsWith('/accounts')
                ? pathname.startsWith('/accounts')
                : item.href === '/auto'
                ? pathname === '/auto' && !isWebsiteFeed
                : item.href === '/auto/new?kind=feed'
                ? pathname.startsWith('/auto/new') && isWebsiteFeed
                : pathname.startsWith(item.href.split('?')[0]);

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-amber-100/80 dark:bg-amber-500/20 text-amber-950 dark:text-amber-300 shadow-xs border border-amber-300/60 dark:border-amber-500/30 font-bold'
                    : 'text-stone-600 dark:text-stone-300 hover:bg-cream-200/50 dark:hover:bg-stone-800/60 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                      isActive
                        ? 'bg-brand-yellow text-amber-950 shadow-xs'
                        : 'bg-cream-200/60 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
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

      {/* 3. Pinned User Profile & Theme Controls (Never scrolls) */}
      <div className="p-3 pt-3 border-t border-cream-200/80 dark:border-stone-800 shrink-0 bg-cream-50 dark:bg-stone-900">
        <div className="flex items-center justify-between px-2 mb-2">
          <span className="text-[10px] font-bold tracking-wider uppercase text-stone-400 dark:text-stone-500">Theme</span>
          <button
            onClick={toggleTheme}
            type="button"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-cream-200/60 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-amber-100 dark:hover:bg-stone-700 transition"
            title="Toggle Dark / Light Mode"
          >
            {isDarkMode ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-stone-600" />
                <span>Dark</span>
              </>
            )}
          </button>
        </div>

        <div className="flex items-center gap-3 px-2 py-2 rounded-2xl bg-cream-100/70 dark:bg-stone-800/60 border border-cream-200/60 dark:border-stone-700/60">
          <div className="w-9 h-9 rounded-full bg-amber-200 dark:bg-amber-600 border-2 border-brand-yellow text-amber-900 dark:text-amber-100 font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
            {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">{currentUser.name || 'Admin'}</p>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">{currentUser.email || 'user@postnova.app'}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          type="button"
          className="w-full flex items-center gap-2 px-3 py-2 mt-1.5 rounded-xl text-xs font-semibold text-stone-500 dark:text-stone-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
