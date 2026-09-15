'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles, Plus, ShieldCheck, RefreshCw, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { GeminiKey } from '@/lib/db';

export default function GeminiPage() {
  const [keys, setKeys] = useState<Omit<GeminiKey, 'key'>[]>([]);
  const [rawKeys, setRawKeys] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadKeys = () => {
    fetch('/api/gemini')
      .then((r) => r.json())
      .then((data) => {
        if (data.keys) setKeys(data.keys);
      });
  };

  useEffect(() => {
    loadKeys();
  }, []);

  const handleAddKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawKeys.trim()) return;

    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawKeys }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to add Gemini key');
      }

      if (data.addedCount > 0) {
        setSuccessMsg(`${data.addedCount} Gemini key(s) tested and added successfully.`);
        setRawKeys('');
        loadKeys();
      } else if (data.errors && data.errors.length) {
        setErrorMsg(data.errors.join(' | '));
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/gemini?id=${id}`, { method: 'DELETE' });
    loadKeys();
  };

  return (
    <div className="space-y-6 max-w-5xl animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center shadow-sm shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-stone-900 tracking-tight">Gemini</h1>
            <p className="text-stone-500 font-medium text-xs">
              Your own free Gemini keys write your AI posts and captions.
            </p>
          </div>
        </div>
        <span className="text-xs font-bold text-stone-400 bg-white px-3 py-1.5 rounded-full border border-cream-200">
          {keys.length} of 10 keys
        </span>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-300 text-rose-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Key input & guide */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleAddKeys} className="bg-white rounded-3xl p-6 border border-cream-200/80 shadow-soft space-y-4">
            <h3 className="font-extrabold text-stone-900 text-sm">Add your keys</h3>
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Gemini API keys
              </label>
              <textarea
                rows={4}
                value={rawKeys}
                onChange={(e) => setRawKeys(e.target.value)}
                placeholder="Paste one key on each line&#10;AIza...&#10;AIza..."
                className="w-full px-4 py-3 rounded-2xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand-yellow font-mono text-xs text-stone-900 resize-none"
              />
              <p className="text-[11px] text-stone-400 mt-1">
                You can paste several at once. Each one is tested with Google before it is saved.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="py-2.5 px-5 bg-brand-yellow hover:bg-brand-yellowHover text-amber-950 font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Testing keys with Google...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Add keys</span>
                </>
              )}
            </button>

            {/* Get a Free Key steps */}
            <div className="pt-4 border-t border-cream-200/80 space-y-2.5">
              <h4 className="text-[11px] font-black uppercase tracking-wider text-stone-400">
                Get a free key
              </h4>
              <div className="space-y-2 text-xs text-stone-600">
                <div className="flex gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-950 font-bold flex items-center justify-center shrink-0 text-[11px]">
                    1
                  </span>
                  <p>
                    Open <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="font-bold underline text-blue-600">aistudio.google.com/apikey</a> and sign in with a Google account.
                  </p>
                </div>
                <div className="flex gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-950 font-bold flex items-center justify-center shrink-0 text-[11px]">
                    2
                  </span>
                  <p>Press <strong>Create API key</strong> and copy it.</p>
                </div>
                <div className="flex gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-950 font-bold flex items-center justify-center shrink-0 text-[11px]">
                    3
                  </span>
                  <p>Paste it above. More keys from other Google accounts give you more free posts a day.</p>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Right 1 Col: Key safety & explanation */}
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-cream-200/80 shadow-soft space-y-3">
            <h4 className="text-xs font-black text-stone-900">How your keys are used</h4>
            <div className="space-y-2.5 text-xs text-stone-600">
              <div className="flex gap-2">
                <span className="text-amber-600 font-bold">⚡</span>
                <p>Every free model has its own daily limit. When one model is used up, the next model takes over.</p>
              </div>
              <div className="flex gap-2">
                <span className="text-amber-600 font-bold">🔄</span>
                <p>When every model on a key is used up, the next key takes over.</p>
              </div>
              <div className="flex gap-2">
                <span className="text-amber-600 font-bold">🕒</span>
                <p>Google resets free limits every day.</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-cream-200/80 shadow-soft space-y-3">
            <h4 className="text-xs font-black text-stone-900">Your keys stay safe</h4>
            <div className="space-y-2 text-xs text-stone-600">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Stored securely in your local environment.</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Never exposed to external third parties.</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Only used to write your own posts.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Keys List & Models Status */}
      <div className="space-y-4">
        {keys.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-cream-200/80 shadow-soft text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold mx-auto">
              ?
            </div>
            <h4 className="font-extrabold text-stone-800 text-sm">No keys yet</h4>
            <p className="text-xs text-stone-400 max-w-sm mx-auto">
              Add a free Gemini key above to turn on AI posts and automated captions.
            </p>
          </div>
        ) : (
          keys.map((k, idx) => (
            <div
              key={k.id}
              className="bg-white rounded-3xl p-6 border border-cream-200/80 shadow-soft space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-400 text-amber-950 font-black text-xs flex items-center justify-center">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-stone-800">
                        {k.maskedKey}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {k.models?.length || 0} models ready
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-400 mt-0.5">
                      Added {new Date(k.addedAt).toLocaleDateString()} • {k.postsToday || 0} posts written today
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(k.id)}
                  className="p-2 text-stone-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition self-start sm:self-center"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Live Models Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-2 border-t border-cream-200/60">
                {(k.models || []).slice(0, 12).map((m) => (
                  <div
                    key={m}
                    className="p-2 rounded-xl bg-cream-50 border border-cream-200 flex items-center justify-between text-[11px]"
                  >
                    <span className="font-semibold text-stone-700 truncate mr-2">{m}</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
