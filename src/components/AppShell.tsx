'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Bell } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import MobileNavBar from '@/components/MobileNavBar';
import { clearAllUserDataOnLogout } from '@/lib/client-drive';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const isPublicPage =
    pathname === '/login' ||
    pathname.startsWith('/privacy') ||
    pathname.startsWith('/terms');

  const [authChecked, setAuthChecked] = useState(isPublicPage);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (isPublicPage) {
      setAuthChecked(true);
      return;
    }

    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setIsAuthenticated(true);
          setAuthChecked(true);
        } else {
          clearAllUserDataOnLogout();
          setIsAuthenticated(false);
          setAuthChecked(true);
          window.location.href = '/login';
        }
      })
      .catch(() => {
        clearAllUserDataOnLogout();
        setIsAuthenticated(false);
        setAuthChecked(true);
        window.location.href = '/login';
      });
  }, [pathname, isPublicPage]);

  // Automatically close mobile menu when navigating to another page
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Lock background scroll when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Check unread notifications count for mobile header badge
  useEffect(() => {
    if (isPublicPage) return;
    fetch('/api/notifications')
      .then((res) => res.json())
      .then((data) => {
        if (data.notifications) {
          setUnreadCount(data.notifications.length);
        }
      })
      .catch(() => {});
  }, [pathname, isPublicPage]);

  if (isPublicPage) {
    return (
      <main className="min-h-screen w-full flex items-center justify-center bg-cream-100 dark:bg-[#0d0f12] text-stone-900 dark:text-stone-100 transition-colors duration-200">
        {children}
      </main>
    );
  }

  if (!authChecked || !isAuthenticated) {
    return (
      <main className="min-h-screen w-full flex flex-col items-center justify-center bg-cream-100 dark:bg-[#0d0f12] text-stone-900 dark:text-stone-100">
        <div className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center text-white font-black text-xl shadow-md animate-pulse mb-3">
          ✦
        </div>
        <p className="text-xs font-semibold text-stone-500 dark:text-stone-400">Verifying session...</p>
      </main>
    );
  }

  return (
    <div className="min-h-screen w-full bg-cream-100 dark:bg-[#0d0f12] text-stone-900 dark:text-stone-100 transition-colors duration-200">

      {/* 1. TOP MOBILE APP BAR (Mobile & Tablet only) */}
      <header className="fixed top-0 left-0 right-0 h-14 z-30 lg:hidden bg-cream-50/95 dark:bg-stone-900/95 backdrop-blur-md border-b border-cream-200/90 dark:border-stone-800/90 px-4 flex items-center justify-between transition-colors duration-200">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileMenuOpen(true)}
            type="button"
            className="p-2 -ml-1.5 rounded-xl text-stone-700 dark:text-stone-200 hover:bg-cream-200/60 dark:hover:bg-stone-800 active:scale-95 transition"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-amber-500 flex items-center justify-center text-white font-black text-sm shadow-xs">
              ✦
            </div>
            <div className="font-extrabold text-lg tracking-tight text-stone-900 dark:text-white">
              Post<span className="text-amber-500 font-black">Nova</span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/notifications"
            className="relative p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-cream-200/60 dark:hover:bg-stone-800 transition"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500" />
            )}
          </Link>
        </div>
      </header>

      {/* 2. SIDEBAR (Fixed Desktop & Sliding Mobile Drawer) */}
      <Sidebar mobileOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      {/* 3. MAIN APP VIEWPORT */}
      <main className="lg:ml-64 ml-0 pt-14 pb-20 lg:pt-0 lg:pb-0 min-w-0 p-3 sm:p-6 lg:p-8 max-w-7xl overflow-x-hidden">
        {children}
      </main>

      {/* 4. BOTTOM THUMB NAVIGATION BAR (Mobile & Tablet only) */}
      <MobileNavBar />
    </div>
  );
}
