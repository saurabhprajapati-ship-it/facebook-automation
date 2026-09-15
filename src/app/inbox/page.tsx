'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Zap,
  Play,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Layers,
  Clock,
  Send,
  Camera,
  ExternalLink,
  ShieldCheck,
  Instagram,
  Check,
  X,
  FileText,
} from 'lucide-react';
import { Account, AutoDmRule, AutoDmLog } from '@/lib/db';

export default function InboxDashboardPage() {
  const [activeTab, setActiveTab] = useState<'rules' | 'media' | 'logs' | 'story'>('rules');
  const [rules, setRules] = useState<AutoDmRule[]>([]);
  const [logs, setLogs] = useState<AutoDmLog[]>([]);
  const [stats, setStats] = useState({ totalRules: 0, activeRules: 0, totalDmsSent: 0 });
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);
  const [igAccounts, setIgAccounts] = useState<Account[]>([]);
  const [mediaList, setMediaList] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [runningNow, setRunningNow] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // New Rule Form State
  const [showNewRuleModal, setShowNewRuleModal] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [targetAccountId, setTargetAccountId] = useState('');
  const [keywordsInput, setKeywordsInput] = useState('');
  const [matchAllComments, setMatchAllComments] = useState(false);
  const [dmMessage, setDmMessage] = useState('');
  const [publicReply, setPublicReply] = useState('');
  const [mediaFilter, setMediaFilter] = useState<'all' | 'specific'>('all');
  const [specificMediaId, setSpecificMediaId] = useState('');

  // Story Form State
  const [storyAccount, setStoryAccount] = useState('');
  const [storyImageUrl, setStoryImageUrl] = useState('');
  const [storyPublishing, setStoryPublishing] = useState(false);

  // Auto-Scanner State
  const [autoScanEnabled, setAutoScanEnabled] = useState(true);
  const [secondsUntilNextScan, setSecondsUntilNextScan] = useState(15);
  const [lastScanTime, setLastScanTime] = useState<string>('Never');

  const loadData = async () => {
    try {
      setLoading(true);
      // Load rules & logs
      const res = await fetch('/api/auto-dm/rules');
      const data = await res.json();
      if (data.rules) setRules(data.rules);
      if (data.logs) setLogs(data.logs);
      if (data.stats) setStats(data.stats);

      // Load all accounts (FB & IG)
      const allRes = await fetch('/api/accounts');
      const allData = await allRes.json();
      if (allData.accounts) {
        setAllAccounts(allData.accounts);
      }

      // Load Instagram accounts
      const accRes = await fetch('/api/accounts/instagram');
      const accData = await accRes.json();
      if (accData.accounts) {
        const onlyIg = accData.accounts.filter((a: any) => a.platform === 'instagram');
        setIgAccounts(onlyIg.length > 0 ? onlyIg : accData.accounts);
        const preferredId = onlyIg[0]?.id || accData.accounts[0]?.id;
        if (preferredId && !targetAccountId) {
          setTargetAccountId(preferredId);
          setStoryAccount(preferredId);
        }
      }
    } catch (err: any) {
      setErrorMsg('Failed to load dashboard data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentMedia = async (accountId?: string) => {
    try {
      const id = accountId || targetAccountId || (igAccounts[0]?.id ?? '');
      if (!id) return;
      const res = await fetch(`/api/auto-dm/media?accountId=${id}&t=${Date.now()}`);
      const data = await res.json();
      if (data.media) {
        setMediaList(data.media);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'media') {
      loadRecentMedia();
    }
  }, [activeTab, targetAccountId]);

  // Live Auto-Listener: Automatically checks for new comments every 15 seconds
  useEffect(() => {
    if (!autoScanEnabled) return;

    const timer = setInterval(() => {
      setSecondsUntilNextScan((prev) => {
        if (prev <= 1) {
          // Trigger automated background scan
          fetch('/api/auto-dm/run-now', { method: 'POST' })
            .then((r) => r.json())
            .then((data) => {
              setLastScanTime(
                new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
              );
              if (data.sentCount > 0 || (data.newLogs && data.newLogs.length > 0)) {
                loadData(); // Automatically update numbers & table live!
              }
            })
            .catch(() => {});
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoScanEnabled]);

  const handleRunNow = async () => {
    setRunningNow(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/auto-dm/run-now', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to scan comments');
      }

      setSuccessMsg(data.message || `Scan completed! ${data.sentCount} DMs delivered.`);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setRunningNow(false);
    }
  };

  const handleToggleRule = async (ruleId: string, currentStatus: boolean) => {
    try {
      await fetch('/api/auto-dm/rules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ruleId, enabled: !currentStatus }),
      });
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this trigger rule?')) return;
    try {
      await fetch(`/api/auto-dm/rules?id=${ruleId}`, { method: 'DELETE' });
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const kwList = matchAllComments
        ? []
        : keywordsInput
            .split(',')
            .map((k) => k.trim())
            .filter(Boolean);

      const res = await fetch('/api/auto-dm/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: ruleName.trim() || (kwList.length ? `Auto-DM: ${kwList.join(', ')}` : 'Auto-DM All Comments'),
          targetAccountId: targetAccountId,
          triggerKeywords: kwList,
          matchType: 'contains',
          mediaFilter: mediaFilter,
          specificMediaId: mediaFilter === 'specific' ? specificMediaId : undefined,
          dmMessage: dmMessage,
          publicReplyMessage: publicReply,
          enabled: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to create rule');
      }

      setSuccessMsg('Trigger rule created successfully! ✨');
      setShowNewRuleModal(false);
      setRuleName('');
      setKeywordsInput('');
      setDmMessage('');
      setPublicReply('');
      setMatchAllComments(false);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handlePublishStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyImageUrl || !storyAccount) return;
    setStoryPublishing(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/stories/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: storyAccount,
          imageUrl: storyImageUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Story publishing failed');
      }

      if (storyAccount === 'both') {
        setSuccessMsg('Story published live to both Facebook & Instagram! 🌐✨');
      } else if (storyAccount.startsWith('acc_ig')) {
        setSuccessMsg('Story published live to Instagram! 📸✨');
      } else {
        setSuccessMsg('Story published live to Facebook! 🟦🚀');
      }
      setStoryImageUrl('');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setStoryPublishing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl animate-fadeIn">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black text-2xl shadow-sm shrink-0">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-stone-900 tracking-tight">Auto DM & Social Inbox</h1>
            <p className="text-stone-500 font-medium text-xs">
              Automated comment triggers, link delivery, and live social command center.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Live Auto-Scanner Indicator */}
          <div
            className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold shadow-xs border transition-all ${
              autoScanEnabled
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-stone-100 border-stone-300 text-stone-600'
            }`}
          >
            <span className="relative flex h-2.5 w-2.5">
              {autoScanEnabled && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  autoScanEnabled ? 'bg-emerald-500' : 'bg-stone-400'
                }`}
              ></span>
            </span>
            <span>
              Auto-Listener: <strong>{autoScanEnabled ? `Active (${secondsUntilNextScan}s)` : 'Paused'}</strong>
            </span>
            <button
              onClick={() => setAutoScanEnabled(!autoScanEnabled)}
              className="ml-1 text-[11px] font-bold text-stone-500 hover:text-stone-900 underline"
            >
              {autoScanEnabled ? 'Pause' : 'Resume'}
            </button>
          </div>

          <button
            onClick={handleRunNow}
            disabled={runningNow}
            className="px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-black hover:opacity-95 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
            title="Force immediate check without waiting 15 seconds"
          >
            {runningNow ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-current" />
                Scan Now
              </>
            )}
          </button>

          <button
            onClick={() => setShowNewRuleModal(true)}
            className="px-4 py-2 rounded-2xl bg-stone-900 text-white text-xs font-black hover:bg-stone-800 transition-all flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New DM Trigger
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-cream-200/80 shadow-soft flex items-center justify-between">
          <div>
            <span className="text-[11px] font-black text-stone-400 uppercase tracking-wider">Total DMs Sent</span>
            <div className="text-2xl font-black text-stone-900 mt-1">{stats.totalDmsSent}</div>
            <span className="text-[10px] text-emerald-600 font-bold">100% Meta Compliant</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Send className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-cream-200/80 shadow-soft flex items-center justify-between">
          <div>
            <span className="text-[11px] font-black text-stone-400 uppercase tracking-wider">Active Rules</span>
            <div className="text-2xl font-black text-stone-900 mt-1">
              {stats.activeRules} <span className="text-xs text-stone-400 font-medium">/ {stats.totalRules}</span>
            </div>
            <span className="text-[10px] text-amber-600 font-bold">Auto-responder Active</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Zap className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-cream-200/80 shadow-soft flex items-center justify-between">
          <div>
            <span className="text-[11px] font-black text-stone-400 uppercase tracking-wider">Connected Accounts</span>
            <div className="text-2xl font-black text-stone-900 mt-1">{igAccounts.length}</div>
            <Link href="/accounts/instagram" className="text-[10px] text-rose-600 font-bold hover:underline">
              Manage Accounts →
            </Link>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <Instagram className="w-5 h-5" />
          </div>
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

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-cream-200/80 pb-2">
        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'rules'
              ? 'bg-amber-100 text-amber-950 shadow-xs border border-amber-300/60'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          Trigger Rules ({rules.length})
        </button>

        <button
          onClick={() => setActiveTab('media')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'media'
              ? 'bg-amber-100 text-amber-950 shadow-xs border border-amber-300/60'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Instagram className="w-3.5 h-3.5" />
          Posts & Reels
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'logs'
              ? 'bg-amber-100 text-amber-950 shadow-xs border border-amber-300/60'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Activity Log ({logs.length})
        </button>

        <button
          onClick={() => setActiveTab('story')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'story'
              ? 'bg-amber-100 text-amber-950 shadow-xs border border-amber-300/60'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          Quick Story Post
        </button>
      </div>

      {/* TAB 1: Trigger Rules */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          {rules.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 border border-cream-200/80 shadow-soft text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                <Zap className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-stone-900">No Auto-DM Triggers Yet</h3>
                <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
                  Create your first trigger rule to automatically send links or exclusive offers when someone comments "LINK", "BUY", or any custom keyword!
                </p>
              </div>
              <button
                onClick={() => setShowNewRuleModal(true)}
                className="px-5 py-2.5 rounded-2xl bg-amber-500 text-white text-xs font-extrabold hover:bg-amber-600 transition-all inline-flex items-center gap-2 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                Create Trigger Rule
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="bg-white rounded-3xl p-5 border border-cream-200/80 shadow-soft space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-stone-900 text-sm">{rule.name}</h3>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              rule.enabled
                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                                : 'bg-stone-100 text-stone-500'
                            }`}
                          >
                            {rule.enabled ? 'Active' : 'Paused'}
                          </span>
                        </div>
                        <p className="text-stone-400 text-[11px] mt-0.5">{rule.targetAccountName}</p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleToggleRule(rule.id, rule.enabled)}
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all ${
                            rule.enabled
                              ? 'border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                              : 'border-stone-300 text-stone-600 bg-stone-50 hover:bg-stone-100'
                          }`}
                        >
                          {rule.enabled ? 'Pause' : 'Enable'}
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="p-1.5 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Keywords tags */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-bold text-stone-400">Trigger:</span>
                      {rule.triggerKeywords && rule.triggerKeywords.length > 0 ? (
                        rule.triggerKeywords.map((kw, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 text-[11px] font-mono font-bold border border-amber-200"
                          >
                            "{kw}"
                          </span>
                        ))
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg bg-stone-100 text-stone-700 text-[11px] font-bold">
                          Any comment
                        </span>
                      )}
                    </div>

                    {/* Message Preview */}
                    <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/60 text-xs space-y-1.5">
                      <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1">
                        <Send className="w-3 h-3 text-amber-500" /> Private DM Sent:
                      </div>
                      <p className="text-stone-800 font-medium whitespace-pre-wrap line-clamp-3">
                        {rule.dmMessage}
                      </p>
                      {rule.publicReplyMessage && (
                        <div className="pt-2 border-t border-stone-200/60 text-[11px] text-stone-600">
                          <span className="font-bold text-stone-500">Public Reply: </span>
                          "{rule.publicReplyMessage}"
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer stats */}
                  <div className="flex items-center justify-between text-[11px] text-stone-500 pt-2 border-t border-cream-100">
                    <span>
                      DMs delivered: <strong className="text-stone-900">{rule.stats?.totalSent || 0}</strong>
                    </span>
                    <span>
                      Scope:{' '}
                      <strong className="text-stone-700">
                        {rule.mediaFilter === 'specific' ? 'Specific Post' : 'All Posts/Reels'}
                      </strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Recent Posts & Reels */}
      {activeTab === 'media' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-stone-900">Recent Instagram Media</h3>
            <button
              onClick={() => loadRecentMedia()}
              className="p-2 rounded-xl border border-cream-300 text-stone-600 hover:text-stone-900 text-xs font-bold flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Media
            </button>
          </div>

          {mediaList.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 border border-cream-200 text-center text-xs text-stone-500">
              No recent media found for this account or connection is pending.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {mediaList.map((m) => (
                <div
                  key={m.id}
                  className="bg-white rounded-3xl overflow-hidden border border-cream-200/80 shadow-soft flex flex-col justify-between"
                >
                  <div>
                    {m.media_url ? (
                      <div className="h-44 bg-stone-900 relative">
                        <img
                          src={m.media_type === 'VIDEO' ? m.thumbnail_url || m.media_url : m.media_url}
                          alt="Post"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/70 text-white backdrop-blur-xs">
                          {m.media_type}
                        </span>
                      </div>
                    ) : (
                      <div className="h-28 bg-cream-100 flex items-center justify-center text-stone-400">
                        <Instagram className="w-8 h-8 opacity-40" />
                      </div>
                    )}

                    <div className="p-4 space-y-2">
                      <p className="text-xs text-stone-800 line-clamp-2 font-medium">
                        {m.caption || 'No caption'}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-stone-500">
                        <span>💬 {m.comments_count || 0} comments</span>
                        <span>❤️ {m.like_count || 0} likes</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 pt-0 flex items-center justify-between border-t border-cream-100 mt-2">
                    {m.permalink && (
                      <a
                        href={m.permalink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-rose-600 font-bold flex items-center gap-1 hover:underline"
                      >
                        View on Instagram <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <button
                      onClick={() => {
                        setMediaFilter('specific');
                        setSpecificMediaId(m.id);
                        setShowNewRuleModal(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 text-white text-[11px] font-bold hover:bg-amber-600 transition-all flex items-center gap-1"
                    >
                      <Zap className="w-3 h-3" />
                      Add Trigger
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Activity Logs */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-3xl p-6 border border-cream-200/80 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-stone-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              Automated DM Dispatch Log
            </h3>
            <span className="text-xs text-stone-400 font-medium">Last 50 automated dispatches</span>
          </div>

          {logs.length === 0 ? (
            <div className="p-8 border-2 border-dashed border-cream-200 rounded-2xl text-center text-xs text-stone-500">
              No automated triggers executed yet. Run a test scan above to see live executions!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-cream-200 text-stone-400 uppercase text-[10px] font-bold">
                    <th className="pb-3 font-bold">Time</th>
                    <th className="pb-3 font-bold">User</th>
                    <th className="pb-3 font-bold">Comment</th>
                    <th className="pb-3 font-bold">Keyword</th>
                    <th className="pb-3 font-bold">DM Status</th>
                    <th className="pb-3 font-bold">Public Reply</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-100 font-medium">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-cream-50/50 transition-colors">
                      <td className="py-3 text-stone-400 font-mono text-[11px]">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 font-bold text-stone-900">@{log.username}</td>
                      <td className="py-3 text-stone-700 max-w-xs truncate">"{log.commentText}"</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-mono font-bold text-[10px] border border-amber-200">
                          {log.matchedKeyword || 'all'}
                        </span>
                      </td>
                      <td className="py-3">
                        {log.dmStatus === 'sent' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-700 border border-emerald-300">
                            Sent ✅
                          </span>
                        ) : log.dmStatus === 'already_replied' ? (
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-50 text-sky-700 border border-sky-200"
                            title={log.error || 'Already replied previously on Instagram'}
                          >
                            Already Replied ℹ️
                          </span>
                        ) : (
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700 border border-rose-300"
                            title={log.error}
                          >
                            Failed ⚠️
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-stone-500 text-[11px]">
                        {log.replyStatus === 'sent' ? 'Replied 💬' : log.replyStatus || 'Skipped'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Quick Story Post */}
      {activeTab === 'story' && (
        <div className="bg-white rounded-3xl p-6 border border-cream-200/80 shadow-soft max-w-2xl space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center font-bold">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-stone-900">Publish Instagram Story</h3>
              <p className="text-xs text-stone-500">
                Direct publishing to Instagram Stories via official Meta 2-step Container API.
              </p>
            </div>
          </div>

          <form onSubmit={handlePublishStory} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Select Story Platform / Account</label>
              <select
                value={storyAccount}
                onChange={(e) => setStoryAccount(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-cream-300 text-xs font-bold text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                {allAccounts.filter((a) => a.platform === 'instagram').map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    📸 Instagram: {acc.name} (@{acc.username || acc.name})
                  </option>
                ))}
                {allAccounts.filter((a) => a.platform === 'facebook').map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    🟦 Facebook: {acc.name}
                  </option>
                ))}
                <option value="both">
                  🌐 Both Facebook & Instagram (Ek sath dono par)
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Public Image URL</label>
              <input
                type="url"
                value={storyImageUrl}
                onChange={(e) => setStoryImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/... or Google Drive public link"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-cream-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <p className="text-[11px] text-stone-400 mt-1">
                Note: Direct accessible image URL (JPEG or PNG) required.
              </p>
            </div>

            {storyImageUrl && (
              <div className="w-36 h-64 rounded-2xl overflow-hidden border border-cream-300 relative bg-black shadow-md">
                <img src={storyImageUrl} alt="Story Preview" className="w-full h-full object-cover" />
                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-bold">
                  Story Preview
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={storyPublishing}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 text-white text-xs font-black hover:opacity-95 transition-all flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              {storyPublishing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Publishing Story...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {storyAccount === 'both'
                      ? 'Publish Story to Both (FB & IG) 🌐'
                      : storyAccount.startsWith('acc_ig')
                      ? 'Publish Story to Instagram 📸'
                      : 'Publish Story to Facebook 🟦'}
                  </span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* NEW RULE MODAL */}
      {showNewRuleModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-cream-200 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-cream-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                  <Zap className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-stone-900 text-sm">Create Comment-to-DM Trigger</h3>
              </div>
              <button
                onClick={() => setShowNewRuleModal(false)}
                className="p-1 rounded-xl text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Trigger Name</label>
                <input
                  type="text"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  placeholder="e.g. Free E-book or Link Delivery"
                  className="w-full px-3.5 py-2 rounded-xl border border-cream-300 text-xs focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Target Instagram Account</label>
                <select
                  value={targetAccountId}
                  onChange={(e) => setTargetAccountId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-cream-300 text-xs font-medium focus:ring-2 focus:ring-amber-400"
                >
                  {igAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.username ? `@${acc.username}` : acc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Trigger Keywords (Comma separated)
                </label>
                <input
                  type="text"
                  disabled={matchAllComments}
                  value={keywordsInput}
                  onChange={(e) => setKeywordsInput(e.target.value)}
                  placeholder="e.g. link, buy, price, info, guide"
                  className="w-full px-3.5 py-2 rounded-xl border border-cream-300 text-xs font-mono focus:ring-2 focus:ring-amber-400 disabled:bg-stone-100"
                />
                <label className="flex items-center gap-2 mt-1.5 cursor-pointer text-stone-600 font-medium">
                  <input
                    type="checkbox"
                    checked={matchAllComments}
                    onChange={(e) => setMatchAllComments(e.target.checked)}
                    className="rounded text-amber-500 focus:ring-amber-400"
                  />
                  <span>Trigger on ANY comment (no keyword required)</span>
                </label>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Direct Message / Link (Sent to Inbox) 🚀
                </label>
                <textarea
                  rows={3}
                  value={dmMessage}
                  onChange={(e) => setDmMessage(e.target.value)}
                  placeholder="Hey {username}! Here is your exclusive link: https://yourwebsite.com/access 📥✨"
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-cream-300 text-xs focus:ring-2 focus:ring-amber-400 font-medium"
                />
                <span className="text-[10px] text-stone-400">
                  Tip: Use <code className="bg-stone-100 px-1 py-0.5 rounded font-mono">{"{username}"}</code> to mention the follower's name!
                </span>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Public Comment Reply (Optional)
                </label>
                <input
                  type="text"
                  value={publicReply}
                  onChange={(e) => setPublicReply(e.target.value)}
                  placeholder="Check your DM! Sent you the link 📥✨"
                  className="w-full px-3.5 py-2 rounded-xl border border-cream-300 text-xs focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-cream-100">
                <button
                  type="button"
                  onClick={() => setShowNewRuleModal(false)}
                  className="px-4 py-2 rounded-xl border border-cream-300 text-stone-600 font-bold hover:bg-cream-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 text-white font-black hover:bg-amber-600 transition-all shadow-xs"
                >
                  Save & Activate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
