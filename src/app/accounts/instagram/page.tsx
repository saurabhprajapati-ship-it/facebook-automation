'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Instagram,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Zap,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Account } from '@/lib/db';

export default function InstagramAccountsPage() {
  const [igAccounts, setIgAccounts] = useState<Account[]>([]);
  const [fbAccounts, setFbAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [discovered, setDiscovered] = useState<any[]>([]);

  // Manual Form state
  const [showManual, setShowManual] = useState(false);
  const [manualIgId, setManualIgId] = useState('');
  const [manualToken, setManualToken] = useState('');

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/accounts/instagram');
      const data = await res.json();
      if (data.accounts) {
        setIgAccounts(data.accounts);
      }
      if (data.discoveredFromFacebook) {
        setDiscovered(data.discoveredFromFacebook);
      }

      const fbRes = await fetch('/api/accounts');
      const fbData = await fbRes.json();
      if (fbData.accounts) {
        setFbAccounts(fbData.accounts.filter((a: Account) => a.platform === 'facebook'));
      }
    } catch (err: any) {
      setErrorMsg('Failed to load accounts: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleAutoConnect = async (pageId: string) => {
    setScanning(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/accounts/instagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoConnectFromPageId: pageId }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to auto-connect Instagram account');
      }

      setSuccessMsg(`Successfully connected Instagram: @${data.account?.username || data.account?.name}! ✨`);
      loadAccounts();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setScanning(false);
    }
  };

  const handleManualConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/accounts/instagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          igUserId: manualIgId.trim(),
          pageAccessToken: manualToken.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to connect Instagram account');
      }

      setSuccessMsg(`Successfully connected Instagram: @${data.account?.username || data.account?.name}! ✨`);
      setManualIgId('');
      setManualToken('');
      setShowManual(false);
      loadAccounts();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to disconnect this Instagram account?')) return;
    try {
      await fetch(`/api/accounts/instagram?id=${id}`, { method: 'DELETE' });
      setSuccessMsg('Instagram account disconnected.');
      loadAccounts();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl animate-fadeIn">
      {/* Platform Switcher Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-cream-200/60 rounded-2xl w-fit border border-cream-200">
        <Link
          href="/accounts/facebook"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:text-stone-900 transition-all"
        >
          <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black">
            f
          </div>
          Facebook Pages
        </Link>
        <Link
          href="/accounts/instagram"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white text-stone-900 shadow-sm border border-stone-200/70"
        >
          <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center text-xs">
            <Instagram className="w-3 h-3" />
          </div>
          Instagram Accounts
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center font-black text-2xl shadow-sm shrink-0">
            <Instagram className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-stone-900 tracking-tight">Instagram Business</h1>
            <p className="text-stone-500 font-medium text-xs">
              Automate Comment-to-DM link delivery, public replies, and stories with 0% ban risk.
            </p>
          </div>
        </div>

        <button
          onClick={loadAccounts}
          disabled={loading || scanning}
          className="p-2.5 rounded-xl border border-cream-300 text-stone-600 hover:text-stone-900 hover:bg-cream-100 transition-all text-xs font-semibold flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
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
        {/* Left 2 Cols: Connected Accounts & Auto-Discovery */}
        <div className="lg:col-span-2 space-y-6">
          {/* Connected Instagram Accounts List */}
          <div className="bg-white rounded-3xl p-6 border border-cream-200/80 shadow-soft space-y-4">
            <h2 className="text-sm font-extrabold text-stone-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-rose-500" />
              Connected Instagram Accounts ({igAccounts.length})
            </h2>

            {igAccounts.length === 0 ? (
              <div className="p-8 border-2 border-dashed border-cream-200 rounded-2xl text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-rose-50 text-rose-500 flex items-center justify-center">
                  <Instagram className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-stone-800 text-sm">No Instagram Account Connected Yet</h3>
                <p className="text-stone-500 text-xs max-w-sm mx-auto">
                  Click the 1-Click Auto-Connect button below to pull your Instagram account from your linked Facebook Page!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {igAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="p-4 rounded-2xl border border-stone-200/70 bg-gradient-to-r from-cream-50/50 to-white flex items-center justify-between shadow-xs"
                  >
                    <div className="flex items-center gap-3.5">
                      {acc.profilePictureUrl ? (
                        <img
                          src={acc.profilePictureUrl}
                          alt={acc.name}
                          className="w-12 h-12 rounded-full object-cover ring-2 ring-rose-400/50"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center font-bold text-lg">
                          @
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-stone-900 text-sm">
                            {acc.username ? `@${acc.username}` : acc.name}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-700 border border-emerald-300">
                            Active ✅
                          </span>
                        </div>
                        <p className="text-stone-500 text-xs mt-0.5">
                          {acc.followersCount ? `${acc.followersCount.toLocaleString()} Followers • ` : ''}
                          ID: <span className="font-mono text-[11px]">{acc.igUserId || acc.pageId}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href="/inbox"
                        className="px-3 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition-all flex items-center gap-1.5 shadow-xs"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        Set Auto-DM
                      </Link>
                      <button
                        onClick={() => handleDelete(acc.id)}
                        className="p-2 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                        title="Disconnect"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 1-Click Auto-Connect from Facebook Page */}
          <div className="bg-gradient-to-br from-amber-50/70 via-rose-50/50 to-purple-50/40 rounded-3xl p-6 border border-rose-200/70 shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-stone-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  1-Click Auto-Connect from Facebook
                </h2>
                <p className="text-stone-600 text-xs mt-0.5">
                  Connect your Instagram account instantly using your already linked Facebook Page.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-white/80 border border-rose-200 text-rose-700">
                Recommended ⭐
              </span>
            </div>

            {fbAccounts.length === 0 ? (
              <div className="p-4 bg-white/80 rounded-2xl border border-rose-200 text-xs text-stone-700 space-y-2">
                <p className="font-bold text-stone-800">No Facebook Pages connected yet.</p>
                <p>
                  Connect your Facebook Page first in{' '}
                  <Link href="/accounts/facebook" className="text-blue-600 underline font-semibold">
                    Facebook Accounts
                  </Link>
                  . Once connected, your linked Instagram account can be pulled in 1 click!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {fbAccounts.map((fb) => (
                  <div
                    key={fb.id}
                    className="p-4 bg-white rounded-2xl border border-cream-200 flex items-center justify-between shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-black">
                        f
                      </div>
                      <div>
                        <h4 className="font-bold text-stone-900 text-xs">{fb.name}</h4>
                        <p className="text-stone-400 text-[11px] font-mono">Page ID: {fb.pageId}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAutoConnect(fb.pageId)}
                      disabled={scanning}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-purple-600 text-white text-xs font-extrabold hover:opacity-95 transition-all flex items-center gap-2 shadow-xs disabled:opacity-50"
                    >
                      {scanning ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Scanning Meta...
                        </>
                      ) : (
                        <>
                          <Instagram className="w-3.5 h-3.5" />
                          Scan & Link Instagram
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Manual Connection Accordion */}
          <div className="bg-white rounded-3xl p-6 border border-cream-200/80 shadow-soft space-y-4">
            <button
              onClick={() => setShowManual(!showManual)}
              className="w-full flex items-center justify-between text-left"
            >
              <div>
                <h3 className="text-xs font-black text-stone-800 uppercase tracking-wider">
                  Manual Connection (Optional / Advanced)
                </h3>
                <p className="text-stone-500 text-[11px] mt-0.5">
                  Provide an Instagram Business Account ID and access token directly.
                </p>
              </div>
              {showManual ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
            </button>

            {showManual && (
              <form onSubmit={handleManualConnect} className="space-y-4 pt-2 border-t border-cream-100 animate-fadeIn">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Instagram Business Account ID
                  </label>
                  <input
                    type="text"
                    value={manualIgId}
                    onChange={(e) => setManualIgId(e.target.value)}
                    placeholder="e.g. 17841400000000000"
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-cream-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-rose-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Page Access Token (with instagram_manage_messages)
                  </label>
                  <input
                    type="password"
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    placeholder="EAA..."
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-cream-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-rose-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition-all disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Connect Manually'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Right Col: Setup Guide & Safety Info */}
        <div className="space-y-6">
          {/* Safety Card */}
          <div className="bg-emerald-50 rounded-3xl p-5 border border-emerald-200/80 space-y-3">
            <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              100% Meta Official Protocol
            </div>
            <p className="text-emerald-700 text-xs leading-relaxed">
              PostNova uses official Meta <strong>"Private Replies to Comments"</strong> and Graph API tokens. We never ask for your Instagram password or use unauthorized browser scrapers.
            </p>
            <ul className="text-[11px] text-emerald-800 space-y-1.5 font-medium">
              <li>✓ Zero risk of Instagram shadowban</li>
              <li>✓ Meta certified comment-to-DM flow</li>
              <li>✓ Built-in human jitter delay (5-10s)</li>
            </ul>
          </div>

          {/* 3 Simple Steps Guide */}
          <div className="bg-white rounded-3xl p-6 border border-cream-200/80 shadow-soft space-y-4">
            <h3 className="font-extrabold text-stone-900 text-xs uppercase tracking-wider">
              Quick Setup Guide
            </h3>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <h4 className="font-bold text-stone-800">Switch to Professional</h4>
                  <p className="text-stone-500 text-[11px] mt-0.5">
                    In Instagram App ➔ Settings ➔ Account type ➔ Switch to Professional / Creator (Free).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <h4 className="font-bold text-stone-800">Link to Facebook Page</h4>
                  <p className="text-stone-500 text-[11px] mt-0.5">
                    In Instagram App ➔ Edit Profile ➔ Page ➔ Select your Facebook Page ("Money Mind set").
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <h4 className="font-bold text-stone-800">Click Auto-Connect</h4>
                  <p className="text-stone-500 text-[11px] mt-0.5">
                    Click "Scan & Link Instagram" button on this page. PostNova handles everything!
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-cream-100">
              <a
                href="https://developers.facebook.com/tools/explorer"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
              >
                Meta Graph API Explorer <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
