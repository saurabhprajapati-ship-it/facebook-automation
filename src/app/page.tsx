'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Link2,
  Clock,
  Send,
  AlertCircle,
  Plus,
  UploadCloud,
  Sparkles,
  Rss,
  ExternalLink,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import StatCard from '@/components/StatCard';
import { Account, PostRecord } from '@/lib/db';

export default function HomePage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [posts, setPosts] = useState<PostRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/accounts').then((r) => r.json()),
      fetch('/api/posts').then((r) => r.json()),
    ])
      .then(([accData, postData]) => {
        if (accData.accounts) setAccounts(accData.accounts);
        if (postData.posts) setPosts(postData.posts);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const sentCount = posts.filter((p) => p.status === 'live').length;
  const failedCount = posts.filter((p) => p.status === 'failed').length;
  const fbAccounts = accounts.filter((a) => a.platform === 'facebook');
  const igAccounts = accounts.filter((a) => a.platform === 'instagram');

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-stone-900 tracking-tight">Hi Naveed</h1>
          <p className="text-stone-500 font-medium text-sm mt-0.5">Here is how your posts are doing.</p>
        </div>
        <Link
          href="/new-post"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-yellow hover:bg-brand-yellowHover text-amber-950 font-bold rounded-2xl shadow-soft hover:shadow-card transition transform active:scale-98"
        >
          <Plus className="w-5 h-5" />
          <span>New post</span>
        </Link>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={Link2}
          value={accounts.length}
          label="Accounts added"
          iconBgColor="bg-amber-100"
          iconColor="text-amber-800"
        />
        <StatCard
          icon={Clock}
          value={0}
          label="Posts waiting"
          iconBgColor="bg-amber-100"
          iconColor="text-amber-800"
        />
        <StatCard
          icon={Send}
          value={sentCount}
          label="Sent, last 30 days"
          iconBgColor="bg-amber-100"
          iconColor="text-amber-800"
        />
        <StatCard
          icon={AlertCircle}
          value={failedCount}
          label="Failed, last 30 days"
          iconBgColor={failedCount > 0 ? "bg-rose-100" : "bg-amber-100"}
          iconColor={failedCount > 0 ? "text-rose-700" : "text-amber-800"}
        />
      </div>

      {/* Quick Launch Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/new-post"
          className="bg-white rounded-3xl p-5 border border-cream-200/80 shadow-soft hover:shadow-card transition group flex items-start gap-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-blue-500 text-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-stone-900 text-base group-hover:text-blue-600 transition">
              Post from my gallery
            </h3>
            <p className="text-xs text-stone-500 mt-1">Photo, video or text, now or later</p>
          </div>
        </Link>

        <Link
          href="/auto/new?kind=ai"
          className="bg-white rounded-3xl p-5 border border-cream-200/80 shadow-soft hover:shadow-card transition group flex items-start gap-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-stone-900 text-base group-hover:text-orange-600 transition">
              AI writes for me
            </h3>
            <p className="text-xs text-stone-500 mt-1">Fresh posts all day by itself</p>
          </div>
        </Link>

        <Link
          href="/auto/new?kind=feed"
          className="bg-white rounded-3xl p-5 border border-cream-200/80 shadow-soft hover:shadow-card transition group flex items-start gap-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition">
            <Rss className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-stone-900 text-base group-hover:text-emerald-600 transition">
              Share from my website
            </h3>
            <p className="text-xs text-stone-500 mt-1">Every new article goes out</p>
          </div>
        </Link>
      </div>

      {/* Social Accounts Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-stone-900">Your social accounts</h2>
          <Link href="/accounts/facebook" className="text-xs font-bold text-amber-700 hover:underline">
            See all
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Facebook Page Card */}
          <div className="bg-white rounded-3xl p-5 border border-cream-200/80 shadow-soft flex flex-col justify-between h-48 relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-2xl shadow-md">
                f
              </div>
              <span
                className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                  fbAccounts.length > 0
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-cream-200 text-stone-600'
                }`}
              >
                {fbAccounts.length > 0 ? `• ${fbAccounts.length} added` : 'Not added'}
              </span>
            </div>

            <div>
              <h3 className="font-bold text-stone-900 text-base">Facebook Page</h3>
              <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">
                Post to your Facebook Page with a System User token.
              </p>
            </div>

            <Link
              href="/accounts/facebook"
              className="w-full py-2 px-4 bg-brand-yellow hover:bg-brand-yellowHover text-amber-950 font-bold text-xs rounded-xl shadow-xs text-center transition flex items-center justify-center gap-1"
            >
              {fbAccounts.length > 0 ? 'Open ->' : 'Add ->'}
            </Link>
          </div>

          {/* Instagram Card */}
          <div className="bg-white rounded-3xl p-5 border border-cream-200/80 shadow-soft flex flex-col justify-between h-48">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-yellow-500 via-rose-500 to-purple-600 text-white flex items-center justify-center shadow-md text-xl">
                📸
              </div>
              <span
                className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                  igAccounts.length > 0
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-cream-200 text-stone-600'
                }`}
              >
                {igAccounts.length > 0 ? `• ${igAccounts.length} added` : 'Not added'}
              </span>
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base">Instagram</h3>
              <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">
                {igAccounts.length > 0
                  ? `Connected as @${igAccounts[0].username || igAccounts[0].name}`
                  : 'Business or Creator account, through your own Meta app.'}
              </p>
            </div>
            <Link
              href="/accounts/instagram"
              className="w-full py-2 px-4 bg-brand-yellow hover:bg-brand-yellowHover text-amber-950 font-bold text-xs rounded-xl shadow-xs text-center transition flex items-center justify-center gap-1"
            >
              {igAccounts.length > 0 ? 'Open ->' : 'Add ->'}
            </Link>
          </div>

          {/* X / Twitter Card */}
          <div className="bg-white rounded-3xl p-5 border border-cream-200/80 shadow-soft flex flex-col justify-between h-48">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-full bg-stone-900 text-white flex items-center justify-center font-black text-xl shadow-md">
                𝕏
              </div>
              <span className="px-3 py-1 bg-cream-200 text-stone-600 rounded-full text-[11px] font-bold">
                Not added
              </span>
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base">X (Twitter)</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Post with one browser cookie. No paid API, no developer app.
              </p>
            </div>
            <button
              onClick={() => alert('X / Twitter connector is coming soon')}
              className="w-full py-2 px-4 bg-brand-yellow hover:bg-brand-yellowHover text-amber-950 font-bold text-xs rounded-xl shadow-xs text-center transition"
            >
              Add -&gt;
            </button>
          </div>

          {/* Pinterest Card */}
          <div className="bg-white rounded-3xl p-5 border border-cream-200/80 shadow-soft flex flex-col justify-between h-48">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xl shadow-md">
                P
              </div>
              <span className="px-3 py-1 bg-cream-200 text-stone-600 rounded-full text-[11px] font-bold">
                Not added
              </span>
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base">Pinterest</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                One click connect. Pins are public, no app to make.
              </p>
            </div>
            <button
              onClick={() => alert('Pinterest connector is coming soon')}
              className="w-full py-2 px-4 bg-brand-yellow hover:bg-brand-yellowHover text-amber-950 font-bold text-xs rounded-xl shadow-xs text-center transition"
            >
              Add -&gt;
            </button>
          </div>

          {/* Telegram Card */}
          <div className="bg-white rounded-3xl p-5 border border-cream-200/80 shadow-soft flex flex-col justify-between h-48">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-full bg-sky-500 text-white flex items-center justify-center font-bold text-xl shadow-md">
                ✈
              </div>
              <span className="px-3 py-1 bg-cream-200 text-stone-600 rounded-full text-[11px] font-bold">
                Not added
              </span>
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base">Telegram</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Post to your channel or group through your own bot.
              </p>
            </div>
            <button
              onClick={() => alert('Telegram connector is coming soon')}
              className="w-full py-2 px-4 bg-brand-yellow hover:bg-brand-yellowHover text-amber-950 font-bold text-xs rounded-xl shadow-xs text-center transition"
            >
              Add -&gt;
            </button>
          </div>

          {/* TikTok Card */}
          <div className="bg-white rounded-3xl p-5 border border-cream-200/80 shadow-soft flex flex-col justify-between h-48">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center font-black text-xl shadow-md">
                🎵
              </div>
              <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-[11px] font-bold">
                Coming soon
              </span>
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base">TikTok</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Post videos to TikTok. We are building it now.
              </p>
            </div>
            <button
              disabled
              className="w-full py-2 px-4 bg-cream-200 text-stone-400 font-bold text-xs rounded-xl text-center cursor-not-allowed"
            >
              Soon
            </button>
          </div>
        </div>
      </div>

      {/* Latest Posts Preview */}
      <div className="bg-white rounded-3xl p-6 border border-cream-200/80 shadow-soft space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-stone-900 text-lg">Latest posts</h3>
            <p className="text-xs text-stone-500">Live posts published to your connected Facebook page.</p>
          </div>
          <Link href="/posts" className="text-xs font-bold text-amber-700 hover:underline">
            All posts
          </Link>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-8 text-stone-400 text-xs">
            No posts sent yet. Start an auto post or use "Post one now".
          </div>
        ) : (
          <div className="divide-y divide-cream-200/80">
            {posts.slice(0, 5).map((post) => (
              <div key={post.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {post.status === 'live' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-stone-900 truncate">{post.title}</h4>
                    <p className="text-[11px] text-stone-500 truncate">
                      {post.accountName} • {new Date(post.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {post.fbPostId && (
                  <a
                    href={`https://facebook.com/${post.fbPostId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline shrink-0"
                  >
                    <span>View on FB</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
