'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Trash2, AlertTriangle, ShieldCheck, CheckCircle2, Instagram } from 'lucide-react';
import { Account } from '@/lib/db';
import { fetchWithDrive } from '@/lib/client-drive';

export default function FacebookAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [pageId, setPageId] = useState('');
  const [systemUserToken, setSystemUserToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

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

      setSuccessMsg(`Successfully connected page: ${data.account?.name || 'Facebook Page'}`);
      setPageId('');
      setSystemUserToken('');
      loadAccounts();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to disconnect this account?')) return;
    await fetchWithDrive(`/api/accounts?id=${id}`, { method: 'DELETE' });
    loadAccounts();
  };


  const fbAccounts = accounts.filter((a) => a.platform === 'facebook');

  return (
    <div className="space-y-6 max-w-5xl animate-fadeIn">
      {/* Platform Switcher Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-cream-200/60 rounded-2xl w-fit border border-cream-200">
        <Link
          href="/accounts/facebook"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white text-stone-900 shadow-sm border border-stone-200/70"
        >
          <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black">
            f
          </div>
          Facebook Pages
        </Link>
        <Link
          href="/accounts/instagram"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:text-stone-900 transition-all"
        >
          <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center text-xs">
            <Instagram className="w-3 h-3" />
          </div>
          Instagram Accounts
        </Link>
      </div>

      {/* Page Header */}
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-2xl shadow-sm shrink-0">
          f
        </div>
        <div>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight">Facebook Page</h1>
          <p className="text-stone-500 font-medium text-xs">
            Post to your Facebook Page with a System User token.
          </p>
        </div>
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
            <h3 className="font-extrabold text-stone-900 text-sm">How to add it</h3>

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
                  Press <strong>Assign assets</strong>. Give it your app with full control, then do it again for your <strong>Page</strong> with full control. These are two separate steps and both are needed.
                </p>
              </div>

              <div className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-amber-200 text-amber-950 font-bold flex items-center justify-center shrink-0 text-xs">
                  4
                </span>
                <p>
                  Press <strong>Generate new token</strong>, pick your app, set expiry to <strong>Never</strong>, and tick:
                  <span className="block mt-1 font-mono font-bold text-amber-900 bg-amber-50 p-1.5 rounded-lg">
                    pages_show_list, pages_read_engagement, pages_manage_posts
                  </span>
                </p>
              </div>

              <div className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-amber-200 text-amber-950 font-bold flex items-center justify-center shrink-0 text-xs">
                  5
                </span>
                <p>
                  Paste that token and your Page ID below. We fetch the Page token from it ourselves automatically.
                </p>
              </div>
            </div>
          </div>

          {/* Account Input Form */}
          <form onSubmit={handleAddAccount} className="bg-white rounded-3xl p-6 border border-cream-200/80 shadow-soft space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">
                Page ID
              </label>
              <input
                type="text"
                value={pageId}
                onChange={(e) => setPageId(e.target.value)}
                placeholder="e.g. 61559968861854"
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand-yellow text-xs font-medium text-stone-900"
              />
              <p className="text-[11px] text-stone-400 mt-1">
                The number of your Page. Found in Page settings &gt; About &gt; Page transparency. (Can leave blank if token contains only 1 page)
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">
                System User token
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-5 bg-brand-yellow hover:bg-brand-yellowHover text-amber-950 font-bold text-xs rounded-2xl shadow-soft transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Checking token with Facebook...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Add Facebook Page</span>
                </>
              )}
            </button>

            {/* Note box */}
            <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl text-[11px] text-amber-900 flex items-start gap-2.5">
              <span className="w-4 h-4 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                !
              </span>
              <p className="leading-relaxed">
                A normal token from Graph API Explorer will not work: Facebook no longer gives <strong>pages_manage_posts</strong> to personal explorer apps. The <strong>System User token</strong> is the one that works, and it needs no App Review for your own Page.
              </p>
            </div>
          </form>
        </div>

        {/* Right 1 Col: Connected Accounts List */}
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-cream-200/80 shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-stone-900 text-sm">Added accounts</h3>
              <span className="text-xs font-bold text-stone-400">{fbAccounts.length} of 3</span>
            </div>

            {fbAccounts.length === 0 ? (
              <div className="py-8 text-center text-stone-400 text-xs">
                Nothing added yet. Follow the steps and it will show up here.
              </div>
            ) : (
              <div className="space-y-3">
                {fbAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="p-3.5 rounded-2xl border border-cream-200 bg-cream-50/50 space-y-2 hover:bg-white transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <h4 className="font-bold text-xs text-stone-900">{acc.name}</h4>
                      </div>
                      <button
                        onClick={() => handleDelete(acc.id)}
                        className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="text-[11px] text-stone-500 space-y-0.5 font-mono">
                      <p>Page ID: {acc.pageId}</p>
                      <p className="text-emerald-700 font-semibold font-sans">Active & Ready</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
