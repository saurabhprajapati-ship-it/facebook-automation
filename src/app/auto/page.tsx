'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  Play,
  Pause,
  Trash2,
  Sparkles,
  Rss,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { Automation } from '@/lib/db';
import { fetchWithDrive } from '@/lib/client-drive';

export default function AutoPostListPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<any | null>(null);

  const loadAutomations = () => {
    fetchWithDrive('/api/auto-post')
      .then((r) => r.json())
      .then((data) => {
        if (data.automations) setAutomations(data.automations);
      });
  };

  useEffect(() => {
    loadAutomations();
  }, []);

  const handleToggle = async (id: string, currentEnabled: boolean) => {
    await fetchWithDrive('/api/auto-post', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, enabled: !currentEnabled }),
    });
    loadAutomations();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this automation?')) return;
    await fetchWithDrive(`/api/auto-post?id=${id}`, { method: 'DELETE' });
    loadAutomations();
  };


  const handleRun = async (id: string, dryRun: boolean) => {
    setRunningId(id);
    setRunResult(null);
    try {
      const res = await fetch('/api/run-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ automationId: id, dryRun }),
      });
      const data = await res.json();
      setRunResult(data);
      loadAutomations();
    } catch (err: any) {
      setRunResult({ ok: false, error: err.message });
    } finally {
      setRunningId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight">Auto post</h1>
          <p className="text-stone-500 font-medium text-xs">
            Let AI write posts for you, or share every new article from your website.
          </p>
        </div>
        <Link
          href="/auto/new"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-brand-yellow hover:bg-brand-yellowHover text-amber-950 font-bold text-xs rounded-2xl shadow-soft transition"
        >
          <Plus className="w-4 h-4" />
          <span>New auto post</span>
        </Link>
      </div>

      {/* Execution Result Modal / Banner */}
      {runResult && (
        <div
          className={`p-5 rounded-3xl border ${
            runResult.ok ? 'bg-emerald-50 border-emerald-300' : 'bg-rose-50 border-rose-300'
          } shadow-card space-y-3`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {runResult.ok ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              )}
              <h4 className="font-extrabold text-sm text-stone-900">
                {runResult.dryRun ? 'Test Run Result (Nothing was posted to Facebook)' : runResult.ok ? 'Post Published Live!' : 'Run Failed'}
              </h4>
            </div>
            <button
              onClick={() => setRunResult(null)}
              className="text-xs font-bold text-stone-500 hover:text-stone-900"
            >
              Dismiss
            </button>
          </div>

          {runResult.ok ? (
            <div className="space-y-2 text-xs text-stone-800 bg-white/70 p-4 rounded-2xl border border-stone-200">
              <p className="font-bold text-stone-900">Target: {runResult.pageName}</p>
              <p className="font-bold text-amber-900">Title: {runResult.title}</p>
              <div className="whitespace-pre-wrap font-sans text-stone-700 max-h-48 overflow-y-auto">
                {runResult.caption}
              </div>
              {runResult.imageUrl && (
                <p className="text-[11px] text-blue-600 truncate">
                  Photo URL: <a href={runResult.imageUrl} target="_blank" rel="noreferrer" className="underline">{runResult.imageUrl}</a>
                </p>
              )}
              {runResult.fbPostId && (
                <a
                  href={`https://facebook.com/${runResult.fbPostId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 font-bold underline text-xs pt-1"
                >
                  <span>View Post on Facebook</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          ) : (
            <p className="text-xs text-rose-700 font-medium">{runResult.error}</p>
          )}
        </div>
      )}

      {/* Automations List */}
      <div className="space-y-4">
        {automations.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 border border-cream-200/80 shadow-soft text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-stone-800 text-base">No auto posts active</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Create an AI auto-poster to publish daily engaging stories with pictures to your Facebook page.
            </p>
            <Link
              href="/auto/new"
              className="inline-block mt-2 px-5 py-2.5 bg-brand-yellow hover:bg-brand-yellowHover text-amber-950 font-bold text-xs rounded-xl shadow-xs transition"
            >
              Create first auto post
            </Link>
          </div>
        ) : (
          automations.map((auto) => (
            <div
              key={auto.id}
              className="bg-white rounded-3xl p-5 border border-cream-200/80 shadow-soft space-y-4 hover:shadow-card transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs shrink-0 ${
                      auto.kind === 'ai' ? 'bg-amber-400 text-amber-950' : 'bg-emerald-500 text-white'
                    }`}
                  >
                    {auto.kind === 'ai' ? <Sparkles className="w-6 h-6" /> : <Rss className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-stone-900 text-sm">{auto.name}</h3>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          auto.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'
                        }`}
                      >
                        {auto.enabled ? 'On' : 'Paused'}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cream-200 text-stone-700">
                        {auto.kind === 'ai' ? 'AI writes' : 'Website feed'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-stone-500 mt-1">
                      <Clock className="w-3.5 h-3.5 text-stone-400" />
                      <span>
                        {auto.postsPerDay} a day, every {auto.waitHours}h, {auto.timeFrom} to {auto.timeUntil}
                      </span>
                      {auto.lastStatus && <span>• Last: {auto.lastStatus}</span>}
                    </div>
                  </div>
                </div>

                {/* Network & Action Buttons */}
                <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
                  {/* Facebook Icon */}
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs mr-2">
                    f
                  </div>

                  {/* Post one now button */}
                  <button
                    onClick={() => handleRun(auto.id, false)}
                    disabled={runningId === auto.id}
                    className="py-1.5 px-3.5 bg-brand-yellow hover:bg-brand-yellowHover text-amber-950 font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1 disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{runningId === auto.id ? 'Posting...' : 'Post one now'}</span>
                  </button>

                  {/* Dry Run Test Button */}
                  <button
                    onClick={() => handleRun(auto.id, true)}
                    disabled={runningId === auto.id}
                    className="py-1.5 px-3 bg-cream-100 hover:bg-cream-200 text-stone-700 font-bold text-xs rounded-xl border border-cream-200 transition"
                  >
                    Test only
                  </button>

                  {/* Pause / Resume button */}
                  <button
                    onClick={() => handleToggle(auto.id, auto.enabled)}
                    className="p-2 rounded-xl text-stone-500 hover:text-stone-900 hover:bg-cream-100 transition"
                    title={auto.enabled ? 'Pause automation' : 'Resume automation'}
                  >
                    {auto.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>

                  {/* Delete button */}
                  <button
                    onClick={() => handleDelete(auto.id)}
                    className="p-2 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
