'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Sparkles, Layers, Search } from 'lucide-react';
import { InstagramIcon, FacebookIcon } from './BrandIcons';

export interface AccountOption {
  id: string;
  platform?: 'facebook' | 'instagram' | 'both' | string;
  name: string;
  username?: string;
  profilePictureUrl?: string;
  followersCount?: number;
  active?: boolean;
}

interface AccountSelectorProps {
  accounts: AccountOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  className?: string;
}

export default function AccountSelector({
  accounts,
  selectedId,
  onSelect,
  className = '',
}: AccountSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const q = searchQuery.toLowerCase().trim();

  const igAccounts = accounts
    .filter((a) => a.platform === 'instagram')
    .filter((a) => !q || a.name.toLowerCase().includes(q) || (a.username && a.username.toLowerCase().includes(q)));

  const fbAccounts = accounts
    .filter((a) => a.platform === 'facebook')
    .filter((a) => !q || a.name.toLowerCase().includes(q));

  // Selected account
  const selectedAccount =
    selectedId === 'both'
      ? {
          id: 'both',
          name: 'Both Facebook & Instagram',
          username: 'Ek sath dono par post hoga',
          platform: 'both',
        }
      : accounts.find((a) => a.id === selectedId) || accounts[0] || null;

  return (
    <div className={`relative w-full ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2.5 rounded-2xl border border-cream-300/80 dark:border-stone-700 bg-white dark:bg-stone-800 shadow-xs hover:border-amber-400 dark:hover:border-amber-400/80 transition-all text-left group"
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar with Platform Badge */}
          <div className="relative shrink-0">
            {selectedId === 'both' ? (
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full border-2 border-white dark:border-stone-800 bg-linear-to-tr from-amber-400 to-amber-600 flex items-center justify-center text-white text-xs font-black shadow-xs">
                  f
                </div>
                <div className="w-8 h-8 rounded-full border-2 border-white dark:border-stone-800 bg-linear-to-tr from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center text-white text-xs font-black shadow-xs">
                  IG
                </div>
              </div>
            ) : (
              <div className="relative">
                {selectedAccount?.profilePictureUrl ? (
                  <img
                    src={selectedAccount.profilePictureUrl}
                    alt={selectedAccount.name}
                    className="w-9 h-9 rounded-full object-cover border-2 border-amber-300 dark:border-amber-500 shadow-xs"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-950/60 border-2 border-amber-300 dark:border-amber-500 flex items-center justify-center text-amber-900 dark:text-amber-200 font-extrabold text-sm shadow-xs">
                    {selectedAccount?.name ? selectedAccount.name.charAt(0).toUpperCase() : 'A'}
                  </div>
                )}
                {/* Platform Badge Overlay */}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white dark:bg-stone-800 p-0.5 shadow-xs flex items-center justify-center">
                  {selectedAccount?.platform === 'instagram' ? (
                    <InstagramIcon className="w-3.5 h-3.5" />
                  ) : (
                    <FacebookIcon className="w-3.5 h-3.5" />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Account Details */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-xs font-extrabold text-stone-900 dark:text-stone-100 truncate">
                {selectedAccount?.name || 'Select Account'}
              </p>
              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </span>
            </div>
            <p className="text-[11px] font-medium text-stone-500 dark:text-stone-400 truncate">
              {selectedAccount?.username ? `@${selectedAccount.username}` : selectedAccount?.platform === 'both' ? 'Cross-platform publish' : 'Connected Page'}
            </p>
          </div>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-stone-400 group-hover:text-stone-700 dark:group-hover:text-stone-200 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl bg-white dark:bg-stone-900 border border-cream-200 dark:border-stone-700 shadow-xl overflow-hidden p-1.5 space-y-1 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
          {/* Quick Search for 20+ Accounts */}
          {accounts.length > 4 && (
            <div className="p-1 border-b border-cream-200/80 dark:border-stone-800">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search 20+ accounts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full pl-7 pr-3 py-1.5 rounded-xl border border-cream-200 dark:border-stone-700 text-xs bg-stone-50/70 dark:bg-stone-800/80 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>
            </div>
          )}

          <div className="max-h-64 overflow-y-auto space-y-1 pr-0.5">
            {/* Cross-Platform "Both" Option */}
            {!searchQuery && (
              <button
                type="button"
                onClick={() => {
                  onSelect('both');
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between p-2 rounded-xl transition-all ${
                  selectedId === 'both'
                    ? 'bg-amber-100/70 dark:bg-amber-500/20 text-stone-900 dark:text-white font-bold'
                    : 'hover:bg-cream-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex -space-x-1.5 shrink-0">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shadow-2xs">
                      f
                    </div>
                    <div className="w-6 h-6 rounded-full bg-linear-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center font-bold text-[10px] shadow-2xs">
                      IG
                    </div>
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-xs font-bold truncate">Both Facebook & Instagram</p>
                    <p className="text-[10px] text-stone-400 truncate">Post to both networks simultaneously</p>
                  </div>
                </div>
                {selectedId === 'both' && <Check className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
              </button>
            )}

            {/* Instagram Section */}
            {igAccounts.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-pink-600 dark:text-pink-400">
                  <InstagramIcon className="w-3 h-3" />
                  <span>Instagram Accounts ({igAccounts.length})</span>
                </div>
                {igAccounts.map((acc) => {
                  const isSelected = selectedId === acc.id;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => {
                        onSelect(acc.id);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-xl transition-all ${
                        isSelected
                          ? 'bg-amber-100/70 dark:bg-amber-500/20 text-stone-900 dark:text-white font-bold'
                          : 'hover:bg-cream-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative shrink-0">
                          {acc.profilePictureUrl ? (
                            <img
                              src={acc.profilePictureUrl}
                              alt={acc.name}
                              className="w-8 h-8 rounded-full object-cover border border-amber-300 shadow-2xs"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-pink-100 dark:bg-pink-950/50 text-pink-700 dark:text-pink-300 font-bold text-xs flex items-center justify-center">
                              {acc.name.charAt(0)}
                            </div>
                          )}
                          <InstagramIcon className="w-3 h-3 absolute -bottom-0.5 -right-0.5" />
                        </div>
                        <div className="text-left min-w-0">
                          <p className="text-xs font-bold truncate">{acc.name}</p>
                          <p className="text-[10px] text-stone-500 dark:text-stone-400 truncate">
                            @{acc.username || acc.name}
                          </p>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Facebook Section */}
            {fbAccounts.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 mt-1">
                  <FacebookIcon className="w-3 h-3" />
                  <span>Facebook Pages ({fbAccounts.length})</span>
                </div>
                {fbAccounts.map((acc) => {
                  const isSelected = selectedId === acc.id;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => {
                        onSelect(acc.id);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-xl transition-all ${
                        isSelected
                          ? 'bg-amber-100/70 dark:bg-amber-500/20 text-stone-900 dark:text-white font-bold'
                          : 'hover:bg-cream-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative shrink-0">
                          {acc.profilePictureUrl ? (
                            <img
                              src={acc.profilePictureUrl}
                              alt={acc.name}
                              className="w-8 h-8 rounded-full object-cover border border-blue-300 shadow-2xs"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center">
                              f
                            </div>
                          )}
                          <FacebookIcon className="w-3 h-3 absolute -bottom-0.5 -right-0.5" />
                        </div>
                        <div className="text-left min-w-0">
                          <p className="text-xs font-bold truncate">{acc.name}</p>
                          <p className="text-[10px] text-stone-500 dark:text-stone-400 truncate">
                            ID: {acc.id.replace('acc_', '')}
                          </p>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
                    </button>
                  );
                })}
              </div>
            )}

            {igAccounts.length === 0 && fbAccounts.length === 0 && (
              <div className="py-4 text-center text-xs text-stone-400">
                No accounts match &quot;{searchQuery}&quot;
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
