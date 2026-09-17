'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Check,
  Trash2,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  Search,
  Zap,
  RefreshCw,
  X,
  Layers,
} from 'lucide-react';
import { Account } from '@/lib/db';
import { fetchWithDrive } from '@/lib/client-drive';
import { FacebookIcon, InstagramIcon } from '@/components/BrandIcons';

export default function FacebookAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [pageId, setPageId] = useState('');
  const [systemUserToken, setSystemUserToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Bulk Import Modal State
  const [scanning, setScanning] = useState(false);
  const [discoveredPages, setDiscoveredPages] = useState<any[]>([]);
  const [selectedPageIds, setSelectedPageIds] = useState<Record<string, boolean>>({});
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [importingBulk, setImportingBulk] = useState(false);

  const loadAccounts = () => {
    fetchWithDrive('/api/accounts')
      .then((r) => r.json())
      .then((data) => {
        if (data.accounts) setAccounts(data.accounts);
      })
      .catch((e) => console.warn('Failed to load accounts:', e));
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await fetchWithDrive('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId: pageId.trim(),
          systemUserToken: systemUserToken.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to connect Facebook Page');
      }

      setSuccessMsg(`Successfully connected page: ${data.account?.name || 'Facebook Page'}! ✨`);
      setPageId('');
      setSystemUserToken('');
      loadAccounts();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleScanPages = async () => {
    if (!systemUserToken.trim()) {
      setErrorMsg('Please enter your System User Token first to scan all 20+ pages.');
      return;
    }

    setScanning(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetchWithDrive('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemUserToken: systemUserToken.trim(),
          scanOnly: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to scan pages from Facebook');
      }

      if (!data.pages || data.pages.length === 0) {
        throw new Error(
          'No Facebook Pages found for this System User Token. Make sure you assigned Page assets in Meta Business Suite.'
        );
      }

      setDiscoveredPages(data.pages);
      const initialSelected: Record<string, boolean> = {};
      data.pages.forEach((p: any) => {
        initialSelected[p.id] = true;
      });
      setSelectedPageIds(initialSelected);
      setShowBulkModal(true);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setScanning(false);
    }
  };

  const handleToggleSelectAll = (selectAll: boolean) => {
    const updated: Record<string, boolean> = {};
    discoveredPages.forEach((p) => {
      updated[p.id] = selectAll;
    });
    setSelectedPageIds(updated);
  };

  const handleImportSelected = async () => {
    const pagesToImport = discoveredPages.filter((p) => selectedPageIds[p.id]);
    if (!pagesToImport.length) {
      setErrorMsg('Please select at least 1 page to import.');
      return;
    }

    setImportingBulk(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetchWithDrive('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bulkPages: pagesToImport,
          systemUserToken: systemUserToken.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to bulk import pages');
      }

      setSuccessMsg(`Successfully connected all ${data.count || pagesToImport.length} Facebook Pages in 1 click! 🚀`);
      setShowBulkModal(false);
      setSystemUserToken('');
      setPageId('');
      loadAccounts();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setImportingBulk(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to disconnect this account?')) return;
    await fetchWithDrive(`/api/accounts?id=${id}`, { method: 'DELETE' });
    loadAccounts();
  };

  const fbAccounts = accounts.filter((a) => a.platform === 'facebook');
  const filteredAccounts = fbAccounts.filter((a) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (a.name && a.name.toLowerCase().includes(q)) || (a.pageId && a.pageId.includes(q));
  });

  const selectedCount = Object.values(selectedPageIds).filter(Boolean).length;

  return (
    <div className="space-y-6 max-w-5xl animate-fadeIn">
      {/* Platform Switcher Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-cream-200/60 dark:bg-stone-800/80 rounded-2xl w-fit border border-cream-200 dark:border-stone-700">
        <Link
          href="/accounts/facebook"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs border border-stone-200/70 dark:border-stone-600"
        >
          <FacebookIcon className="w-4 h-4" />
          Facebook Pages ({fbAccounts.length})
        </Link>
        <Link
          href="/accounts/instagram"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white transition-all"
        >
          <InstagramIcon className="w-4 h-4" />
          Instagram Accounts
        </Link>
      </div>

      {/* Page Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shrink-0">
            <FacebookIcon className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight">Facebook Pages</h1>
            <p className="text-stone-500 dark:text-stone-400 font-medium text-xs">
              Manage 20+ Facebook Pages with 1-click System User token bulk import.
            </p>
          </div>
        </div>

        {fbAccounts.length > 0 && (
          <span className="px-3.5 py-1.5 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 text-xs font-black border border-blue-200 dark:border-blue-800">
            {fbAccounts.length} Pages Connected
          </span>
        )}
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-300 text-rose-800 rounded-2xl text-xs font-semibold flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Step-by-Step Guide + Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* How to add it guide */}
          <div className="bg-white rounded-3xl p-6 border border-cream-200/80 shadow-soft space-y-4">
            <h3 className="font-extrabold text-stone-900 text-sm">How to add it (Bulk & Single)</h3>

            <div className="space-y-3.5 text-xs text-stone-700">
              <div className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-amber-200 text-amber-950 font-bold flex items-center justify-center shrink-0 text-xs">
                  1
                </span>
                <p>
                  Go to <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer" className="font-bold underline text-blue-600">developers.facebook.com</a>, press <strong>Create app</strong> and pick the <strong>Business</strong> type. Any name works.
                </p>
              </div>

              <div className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-amber-200 text-amber-950 font-bold flex items-center justify-center shrink-0 text-xs">
                  2
                </span>
                <p>
                  Open <a href="https://business.facebook.com" target="_blank" rel="noreferrer" className="font-bold underline text-blue-600">business.facebook.com</a>, then <strong>Settings &gt; Users &gt; System users</strong>. Add a system user with the <strong>Admin</strong> role.
                </p>
              </div>

              <div className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-amber-200 text-amber-950 font-bold flex items-center justify-center shrink-0 text-xs">
                  3
                </span>
                <p>
                  Press <strong>Assign assets</strong>. Give it your app with full control, then assign <strong>all your 20+ Pages</strong> with full control.
                </p>
              </div>

              <div className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-amber-200 text-amber-950 font-bold flex items-center justify-center shrink-0 text-xs">
                  4
                </span>
                <p>
                  Press <strong>Generate new token</strong>, pick your app, set expiry to <strong>Never</strong>, and tick:
                  <span className="block mt-1 font-mono font-bold text-amber-900 bg-amber-50 p-1.5 rounded-lg break-words text-[11px] leading-relaxed">
                    pages_show_list, pages_read_engagement, pages_manage_posts
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Account Input Form */}
          <form onSubmit={handleAddAccount} className="bg-white rounded-3xl p-6 border border-cream-200/80 shadow-soft space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">
                System User token (Permanent Never Expiring)
              </label>
              <input
                type="password"
                required
                value={systemUserToken}
                onChange={(e) => setSystemUserToken(e.target.value)}
                placeholder="EAAB..."
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand-yellow text-xs font-mono text-stone-900"
              />
              <p className="text-[11px] text-stone-400 mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Set to never expire. Kept safe and encrypted locally.</span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">
                Page ID (Optional for Single Page)
              </label>
              <input
                type="text"
                value={pageId}
                onChange={(e) => setPageId(e.target.value)}
                placeholder="e.g. 61559968861854 (Leave blank to auto-detect or bulk import)"
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand-yellow text-xs font-medium text-stone-900"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={handleScanPages}
                disabled={scanning || !systemUserToken}
                className="py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold text-xs shadow-soft hover:opacity-95 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {scanning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Scanning Pages from Token...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-current" />
                    <span>⚡ Bulk Scan & Import All Pages</span>
                  </>
                )}
              </button>

              <button
                type="submit"
                disabled={loading || !systemUserToken}
                className="py-3 px-4 bg-brand-yellow hover:bg-brand-yellowHover text-amber-950 font-extrabold text-xs rounded-2xl shadow-soft transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span>Connecting...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Connect Single Page</span>
                  </>
                )}
              </button>
            </div>

            {/* Note box */}
            <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl text-[11px] text-amber-900 flex items-start gap-2.5">
              <span className="w-4 h-4 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                !
              </span>
              <p className="leading-relaxed">
                A normal token from Graph API Explorer will not work. The <strong>System User token</strong> is the one that works permanently with 0 expiry and no App Review required.
              </p>
            </div>
          </form>
        </div>

        {/* Right 1 Col: Connected Accounts List */}
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-cream-200/80 shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-stone-900 text-sm">Connected Pages</h3>
              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                {fbAccounts.length} Total
              </span>
            </div>

            {/* Search filter */}
            {fbAccounts.length > 2 && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search pages by name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-cream-200 dark:border-stone-700 text-xs bg-stone-50/60 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>
            )}

            {filteredAccounts.length === 0 ? (
              <div className="py-8 text-center text-stone-400 text-xs">
                {fbAccounts.length === 0
                  ? 'Nothing added yet. Paste your token and click Bulk Scan to import.'
                  : 'No pages match your search.'}
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {filteredAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="p-3 rounded-2xl border border-cream-200 dark:border-stone-700 bg-cream-50/50 dark:bg-stone-800/50 space-y-1.5 hover:bg-white dark:hover:bg-stone-800 transition shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative shrink-0">
                          {acc.profilePictureUrl ? (
                            <img
                              src={acc.profilePictureUrl}
                              alt={acc.name}
                              className="w-8 h-8 rounded-full object-cover border border-amber-300 dark:border-amber-500 shadow-2xs"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                              {acc.name ? acc.name.charAt(0).toUpperCase() : 'F'}
                            </div>
                          )}
                          <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-white dark:bg-stone-800 p-0.5 shadow-2xs flex items-center justify-center">
                            <FacebookIcon className="w-2.5 h-2.5" />
                          </div>
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-stone-900 dark:text-stone-100 truncate">{acc.name}</h4>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Active & Ready</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(acc.id)}
                        className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                        title="Disconnect page"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="text-[10px] text-stone-400 space-y-0.5 font-mono pt-1 border-t border-cream-200/40 dark:border-stone-700/50">
                      <p>Page ID: {acc.pageId}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BULK IMPORT MODAL */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 border border-cream-200 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-cream-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-stone-900 text-base">Bulk Connect Facebook Pages</h3>
                  <p className="text-stone-500 text-xs">
                    Found {discoveredPages.length} pages assigned to this System User token.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBulkModal(false)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Select All Row */}
            <div className="flex items-center justify-between px-2 py-1 bg-cream-100/70 rounded-xl text-xs font-bold text-stone-700">
              <span>{selectedCount} of {discoveredPages.length} Pages Selected</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleToggleSelectAll(true)}
                  className="text-blue-600 hover:underline cursor-pointer"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleSelectAll(false)}
                  className="text-stone-500 hover:underline cursor-pointer"
                >
                  Deselect All
                </button>
              </div>
            </div>

            {/* Discovered Pages List */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {discoveredPages.map((page) => {
                const isSelected = !!selectedPageIds[page.id];
                return (
                  <label
                    key={page.id}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition cursor-pointer ${
                      isSelected
                        ? 'border-blue-300 bg-blue-50/50'
                        : 'border-stone-200 bg-white hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) =>
                          setSelectedPageIds((prev) => ({ ...prev, [page.id]: e.target.checked }))
                        }
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <div className="w-9 h-9 rounded-full bg-stone-100 overflow-hidden shrink-0 border border-stone-200 flex items-center justify-center font-bold text-xs text-stone-700">
                        {page.profile_picture_url ? (
                          <img src={page.profile_picture_url} alt={page.name} className="w-full h-full object-cover" />
                        ) : (
                          page.name?.charAt(0) || 'P'
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-extrabold text-xs text-stone-900 truncate">{page.name}</p>
                        <p className="text-[10px] text-stone-400 font-mono">ID: {page.id}</p>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-cream-100">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 rounded-xl border border-cream-300 text-stone-600 text-xs font-bold hover:bg-cream-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImportSelected}
                disabled={importingBulk || selectedCount === 0}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {importingBulk ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Connecting {selectedCount} Pages...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Connect {selectedCount} Pages in 1 Click 🚀</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
