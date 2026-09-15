'use client';

import React, { useState } from 'react';
import { Settings as SettingsIcon, Trash2, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function SettingsPage() {
  const [cleared, setCleared] = useState(false);

  const handleClearHistory = async () => {
    if (!confirm('Are you sure you want to clear all posted history? Duplication detection will reset.')) return;
    await fetch('/api/posts', { method: 'DELETE' });
    setCleared(true);
    setTimeout(() => setCleared(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center shadow-sm shrink-0">
          <SettingsIcon className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight">Settings</h1>
          <p className="text-stone-500 font-medium text-xs">
            App configuration, history management, and system rules.
          </p>
        </div>
      </div>

      {cleared && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Post history cleared successfully.</span>
        </div>
      )}

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-cream-200/80 shadow-soft space-y-6">
        <div>
          <h3 className="text-sm font-extrabold text-stone-900">Posting Rules & Memory</h3>
          <p className="text-xs text-stone-500 mt-1 leading-relaxed">
            The app automatically remembers previous post titles and feed URLs to ensure you never post duplicate stories to your Facebook page.
          </p>
        </div>

        <div className="pt-4 border-t border-cream-200/80 flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-stone-900">Clear Posted History</h4>
            <p className="text-[11px] text-stone-500">
              Reset memory so previously posted subjects or articles can be written again.
            </p>
          </div>
          <button
            onClick={handleClearHistory}
            className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear history</span>
          </button>
        </div>

        <div className="pt-4 border-t border-cream-200/80 space-y-3">
          <h4 className="text-xs font-bold text-stone-900">Security & Encryption</h4>
          <div className="p-4 bg-cream-50 rounded-2xl border border-cream-200 text-xs text-stone-600 space-y-2">
            <div className="flex items-center gap-2 text-stone-800 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Local Self-Hosted Architecture</span>
            </div>
            <p className="text-[11px] leading-relaxed text-stone-500">
              All tokens and keys are stored strictly in your local project directory (<code>data/db.json</code>). No data is transmitted to any third-party server other than direct official requests to Meta Graph API and Google Gemini API.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
