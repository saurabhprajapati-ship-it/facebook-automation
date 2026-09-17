'use client';

import React, { useEffect, useState } from 'react';
import { PenSquare, Send, Image as ImageIcon, Link as LinkIcon, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Account } from '@/lib/db';
import { fetchWithDrive } from '@/lib/client-drive';
import AccountSelector from '@/components/AccountSelector';

export default function NewPostComposerPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [message, setMessage] = useState('');
  const [link, setLink] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [applyBranding, setApplyBranding] = useState(true);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchWithDrive('/api/accounts')
      .then((r) => r.json())
      .then((data) => {
        if (data.accounts?.length) {
          setAccounts(data.accounts);
          setSelectedAccountId(data.accounts[0].id);
        }
      });
  }, []);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId) {
      setErrorMsg('Please connect or select a Facebook Page first.');
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (selectedAccountId !== 'both') {
        const target = accounts.find((a) => a.id === selectedAccountId);
        if (!target) throw new Error('Selected account not found');
      }

      // Publish directly via official Facebook / Instagram publishing endpoint
      const res = await fetchWithDrive('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({
          accountId: selectedAccountId,
          message,
          link,
          imageUrl,
          applyBranding,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to publish post');
      }

      if (data.platform === 'both') {
        setSuccessMsg('Post successfully published to both Facebook & Instagram! 🌐✨');
      } else if (data.platform === 'instagram') {
        setSuccessMsg('Post successfully published directly to Instagram! 📸✨');
      } else {
        setSuccessMsg('Post successfully published to Facebook Page! 🚀');
      }
      setMessage('');
      setLink('');
      setImageUrl('');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center shadow-sm shrink-0">
          <PenSquare className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight">New post</h1>
          <p className="text-stone-500 font-medium text-xs">
            Write one post. Send it to Instagram, Facebook, or both simultaneously.
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
        <div className="p-4 bg-rose-50 border border-rose-300 text-rose-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handlePublish} className="bg-white rounded-3xl p-6 sm:p-8 border border-cream-200/80 shadow-soft space-y-6">
        {/* Account Selector */}
        <div>
          <label className="block text-xs font-bold text-stone-800 mb-1.5">
            Select Publishing Platform / Account
          </label>
          {accounts.length === 0 ? (
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900">
              No accounts connected yet. Go to <a href="/accounts/facebook" className="font-bold underline text-blue-600">Accounts</a> to add your Facebook Page or Instagram.
            </div>
          ) : (
            <AccountSelector
              accounts={accounts}
              selectedId={selectedAccountId}
              onSelect={setSelectedAccountId}
            />
          )}
        </div>

        {/* Message / Caption */}
        <div>
          <label className="block text-xs font-bold text-stone-800 mb-1.5">
            Post text / caption
          </label>
          <textarea
            rows={5}
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write what you want to share on your Facebook Page..."
            className="w-full px-4 py-3 rounded-2xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand-yellow text-xs text-stone-900 resize-none font-medium"
          />
        </div>

        {/* Optional Image URL */}
        <div>
          <label className="block text-xs font-bold text-stone-800 mb-1.5 flex items-center gap-1.5">
            <ImageIcon className="w-4 h-4 text-stone-500" />
            <span>Photo URL (optional)</span>
          </label>
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/photo.jpg"
            className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand-yellow text-xs text-stone-900 font-medium"
          />
          <p className="text-[11px] text-stone-400 mt-1">
            Facebook publishes direct high-resolution photo posts when an image link is provided.
          </p>
        </div>

        {/* Optional Link */}
        <div>
          <label className="block text-xs font-bold text-stone-800 mb-1.5 flex items-center gap-1.5">
            <LinkIcon className="w-4 h-4 text-stone-500" />
            <span>Link URL (optional)</span>
          </label>
          <input
            type="text"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://mywebsite.com/article"
            className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand-yellow text-xs text-stone-900 font-medium"
          />
        </div>

        {/* Branding Toggle */}
        <label className="flex items-center gap-3 cursor-pointer pt-2">
          <input
            type="checkbox"
            checked={applyBranding}
            onChange={(e) => setApplyBranding(e.target.checked)}
            className="w-4 h-4 rounded text-amber-500 focus:ring-brand-yellow"
          />
          <span className="text-xs font-bold text-stone-800">
            Apply branding (Account badge + Like and Share bar)
          </span>
        </label>

        {/* Publish Action Button */}
        <div className="pt-4 border-t border-cream-200/80 flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={loading || accounts.length === 0}
            className="py-3 px-6 bg-brand-yellow hover:bg-brand-yellowHover text-amber-950 font-bold text-xs rounded-2xl shadow-soft transition flex items-center gap-2 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>
              {loading
                ? 'Publishing...'
                : selectedAccountId === 'both'
                ? 'Publish to Both (FB & IG) 🌐'
                : selectedAccountId.startsWith('acc_ig')
                ? 'Publish to Instagram 📸'
                : 'Publish to Facebook 🟦'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
