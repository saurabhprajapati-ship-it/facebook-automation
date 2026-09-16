'use client';

import React, { useEffect, useState } from 'react';
import {
  Users,
  ShieldCheck,
  UserCheck,
  Search,
  Calendar,
  Clock,
  Layers,
  Sparkles,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { FacebookIcon, InstagramIcon } from '@/components/BrandIcons';

interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
  createdAt: string;
  lastLoginAt?: string;
  accountsCount: number;
  accounts?: Array<{
    id: string;
    name: string;
    platform: string;
    active: boolean;
  }>;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch('/api/admin/users')
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Unauthorized or failed to fetch users');
        }
        return res.json();
      })
      .then((data) => {
        if (data.users) {
          setUsers(data.users);
        }
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.id && u.id.toLowerCase().includes(q))
    );
  });

  const totalConnectedAccounts = users.reduce((acc, u) => acc + (u.accountsCount || 0), 0);
  const adminCount = users.filter((u) => u.role === 'admin' || u.email === 'saurabhprajapatidev@gmail.com').length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100 tracking-tight flex items-center gap-2.5">
              <span>Users Management</span>
              <span className="px-2.5 py-0.5 text-xs font-black uppercase rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                Admin Panel
              </span>
            </h1>
            <p className="text-stone-500 dark:text-stone-400 font-medium text-xs sm:text-sm mt-0.5">
              Live overview of all registered users, sign-in methods, and connected social pages.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2 bg-cream-50 dark:bg-stone-900 border border-cream-200 dark:border-stone-800 rounded-2xl text-xs sm:text-sm text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-cream-50 dark:bg-stone-900 border border-cream-200/80 dark:border-stone-800 p-5 rounded-3xl shadow-soft flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">Total Users</p>
            <h3 className="text-2xl font-black text-stone-900 dark:text-stone-100 mt-1">{users.length}</h3>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-cream-50 dark:bg-stone-900 border border-cream-200/80 dark:border-stone-800 p-5 rounded-3xl shadow-soft flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">Connected Pages</p>
            <h3 className="text-2xl font-black text-stone-900 dark:text-stone-100 mt-1">{totalConnectedAccounts}</h3>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-cream-50 dark:bg-stone-900 border border-cream-200/80 dark:border-stone-800 p-5 rounded-3xl shadow-soft flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">Admin Users</p>
            <h3 className="text-2xl font-black text-stone-900 dark:text-stone-100 mt-1">{adminCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-700 dark:text-red-400 text-sm font-semibold">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Users Table / Grid */}
      <div className="bg-cream-50 dark:bg-stone-900 border border-cream-200/80 dark:border-stone-800 rounded-3xl shadow-soft overflow-hidden">
        <div className="p-5 border-b border-cream-200/60 dark:border-stone-800/80 flex items-center justify-between">
          <h2 className="font-extrabold text-stone-900 dark:text-stone-100 text-base flex items-center gap-2">
            <span>Registered Accounts</span>
            <span className="text-xs text-stone-500 dark:text-stone-400 font-normal">({filteredUsers.length} shown)</span>
          </h2>
          <a
            href="https://drive.google.com/drive/folders/1Piv_X821Ofn-EMyo3SQEo6vgzCLpwN_d"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1.5"
          >
            <span>Google Drive Master Folder</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {loading ? (
          <div className="p-12 text-center text-stone-400 text-sm font-medium animate-pulse">
            Loading master users list...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-stone-400 text-sm font-medium">
            No users found matching your search.
          </div>
        ) : (
          <div className="divide-y divide-cream-200/60 dark:divide-stone-800/60">
            {filteredUsers.map((userItem) => {
              const isUserAdmin =
                userItem.role === 'admin' || userItem.email === 'saurabhprajapatidev@gmail.com';

              return (
                <div
                  key={userItem.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-cream-100/50 dark:hover:bg-stone-800/30 transition"
                >
                  {/* User Profile */}
                  <div className="flex items-center gap-3.5">
                    {userItem.avatarUrl ? (
                      <img
                        src={userItem.avatarUrl}
                        alt={userItem.name}
                        className="w-11 h-11 rounded-2xl object-cover border border-amber-300 dark:border-amber-500/40 shadow-xs shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-2xl bg-amber-200 dark:bg-amber-600/30 text-amber-900 dark:text-amber-200 border border-brand-yellow font-black flex items-center justify-center text-base shadow-xs shrink-0">
                        {userItem.name ? userItem.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-stone-900 dark:text-stone-100 text-sm truncate">
                          {userItem.name || 'User'}
                        </h4>
                        {isUserAdmin ? (
                          <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                            Admin
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-stone-200/70 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                            User
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-500 dark:text-stone-400 font-medium truncate mt-0.5">
                        {userItem.email}
                      </p>
                    </div>
                  </div>

                  {/* Meta Stats: Joined & Pages */}
                  <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs text-stone-500 dark:text-stone-400">
                    <div className="flex items-center gap-1.5 bg-cream-100 dark:bg-stone-800/60 px-3 py-1.5 rounded-xl border border-cream-200/60 dark:border-stone-700/60">
                      <Layers className="w-3.5 h-3.5 text-amber-500" />
                      <span className="font-bold text-stone-800 dark:text-stone-200">
                        {userItem.accountsCount} {userItem.accountsCount === 1 ? 'Page' : 'Pages'} Connected
                      </span>
                    </div>

                    {userItem.createdAt && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-stone-400" />
                        <span>Joined {new Date(userItem.createdAt).toLocaleDateString()}</span>
                      </div>
                    )}

                    {userItem.lastLoginAt && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-stone-400" />
                        <span>Active {new Date(userItem.lastLoginAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
