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
  ArrowRight,
} from 'lucide-react';
import StatCard from '@/components/StatCard';
import {
  FacebookIcon,
  InstagramIcon,
  XTwitterIcon,
  PinterestIcon,
  TelegramIcon,
  TikTokIcon,
  GeminiIcon,
} from '@/components/BrandIcons';
import { Account, PostRecord } from '@/lib/db';
import { fetchWithDrive, clearAllUserDataOnLogout } from '@/lib/client-drive';

export default function HomePage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [posts, setPosts] = useState<PostRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    // Dynamic user session from /api/auth/me
    fetchWithDrive('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.user?.name) {
          setUserName(data.user.name);
          try {
            localStorage.setItem('postnova_user', JSON.stringify(data.user));
          } catch {}
        } else if (!data.user) {
          clearAllUserDataOnLogout();
          window.location.href = '/login';
        }
      })
      .catch(() => {});


    Promise.all([
      fetchWithDrive('/api/accounts').then((r) => r.json()),
      fetchWithDrive('/api/posts').then((r) => r.json()),
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
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
            Hi {userName}
          </h1>
          <p className="text-stone-500 dark:text-stone-400 font-medium text-sm mt-0.5">
            Here is how your social posts and automations are doing.
          </p>
        </div>
        <Link
          href="/new-post"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-yellow hover:bg-brand-yellowHover text-amber-950 font-bold rounded-2xl shadow-soft hover:shadow-card transition transform active:scale-95"
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
          iconBgColor="bg-amber-100 dark:bg-amber-950/60"
          iconColor="text-amber-800 dark:text-amber-300"
        />
        <StatCard
          icon={Clock}
          value={0}
          label="Posts waiting"
          iconBgColor="bg-amber-100 dark:bg-amber-950/60"
          iconColor="text-amber-800 dark:text-amber-300"
        />
        <StatCard
          icon={Send}
          value={sentCount}
          label="Sent, last 30 days"
          iconBgColor="bg-amber-100 dark:bg-amber-950/60"
          iconColor="text-amber-800 dark:text-amber-300"
        />
        <StatCard
          icon={AlertCircle}
          value={failedCount}
          label="Failed, last 30 days"
          iconBgColor={failedCount > 0 ? 'bg-rose-100 dark:bg-rose-950/60' : 'bg-amber-100 dark:bg-amber-950/60'}
          iconColor={failedCount > 0 ? 'text-rose-700 dark:text-rose-300' : 'text-amber-800 dark:text-amber-300'}
        />
      </div>

      {/* Quick Launch Action Cards with Animations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/new-post"
          className="bg-white dark:bg-stone-800/90 rounded-3xl p-5 border border-cream-200/80 dark:border-stone-700/80 shadow-soft hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-400/50 hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 group flex items-start gap-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-blue-500 text-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-extrabold text-stone-900 dark:text-stone-100 text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition flex items-center justify-between">
              <span>Post from my gallery</span>
              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">Photo, video or text, now or later</p>
          </div>
        </Link>

        <Link
          href="/auto/new?kind=ai"
          className="bg-white dark:bg-stone-800/90 rounded-3xl p-5 border border-cream-200/80 dark:border-stone-700/80 shadow-soft hover:shadow-xl hover:shadow-amber-500/10 hover:border-amber-400/50 hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 group flex items-start gap-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
            <GeminiIcon className="w-7 h-7" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-extrabold text-stone-900 dark:text-stone-100 text-base group-hover:text-amber-600 dark:group-hover:text-amber-400 transition flex items-center justify-between">
              <span>AI writes for me</span>
              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">Fresh posts all day with Gemini AI</p>
          </div>
        </Link>

        <Link
          href="/auto/new?kind=feed"
          className="bg-white dark:bg-stone-800/90 rounded-3xl p-5 border border-cream-200/80 dark:border-stone-700/80 shadow-soft hover:shadow-xl hover:shadow-emerald-500/10 hover:border-emerald-400/50 hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 group flex items-start gap-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
            <Rss className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-extrabold text-stone-900 dark:text-stone-100 text-base group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition flex items-center justify-between">
              <span>Share from my website</span>
              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">Every new article goes out automatically</p>
          </div>
        </Link>
      </div>

      {/* Social Accounts Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-stone-900 dark:text-stone-100">Your social accounts</h2>
          <Link href="/accounts/facebook" className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline">
            See all
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Facebook Page Card */}
          <div className="bg-white dark:bg-stone-800/90 rounded-3xl p-5 border border-cream-200/80 dark:border-stone-700/80 shadow-soft hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-400/50 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-48 relative overflow-hidden group">
            <div className="flex justify-between items-start">
              <div className="relative">
                {fbAccounts[0]?.profilePictureUrl ? (
                  <img
                    src={fbAccounts[0].profilePictureUrl}
                    alt={fbAccounts[0].name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-amber-300 dark:border-amber-500 shadow-sm"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <FacebookIcon className="w-12 h-12 shadow-sm rounded-full group-hover:scale-105 transition-transform" />
                )}
                {fbAccounts.length > 0 && fbAccounts[0]?.profilePictureUrl && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white dark:bg-stone-800 p-0.5 shadow-xs flex items-center justify-center">
                    <FacebookIcon className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
              <span
                className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                  fbAccounts.length > 0
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-cream-200 text-stone-600 dark:bg-stone-700 dark:text-stone-300'
                }`}
              >
                {fbAccounts.length > 0 ? `• ${fbAccounts.length} added` : 'Not added'}
              </span>
            </div>

            <div>
              <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base">Facebook Page</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 line-clamp-2">
                {fbAccounts.length > 0
                  ? `Connected as ${fbAccounts[0].name}`
                  : 'Post to your Facebook Page with a System User token.'}
              </p>
            </div>

            <Link
              href="/accounts/facebook"
              className="w-full py-2 px-4 bg-brand-yellow hover:bg-brand-yellowHover text-amber-950 font-bold text-xs rounded-xl shadow-xs text-center transition flex items-center justify-center gap-1 active:scale-95"
            >
              {fbAccounts.length > 0 ? 'Open ->' : 'Add ->'}
            </Link>
          </div>

          {/* Instagram Card */}
          <div className="bg-white dark:bg-stone-800/90 rounded-3xl p-5 border border-cream-200/80 dark:border-stone-700/80 shadow-soft hover:shadow-xl hover:shadow-pink-500/10 hover:border-pink-400/50 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-48 relative overflow-hidden group">
            <div className="flex justify-between items-start">
              <div className="relative">
                {igAccounts[0]?.profilePictureUrl ? (
                  <img
                    src={igAccounts[0].profilePictureUrl}
                    alt={igAccounts[0].name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-amber-300 dark:border-amber-500 shadow-sm"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <InstagramIcon className="w-12 h-12 shadow-sm rounded-2xl group-hover:scale-105 transition-transform" />
                )}
                {igAccounts.length > 0 && igAccounts[0]?.profilePictureUrl && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white dark:bg-stone-800 p-0.5 shadow-xs flex items-center justify-center">
                    <InstagramIcon className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
              <span
                className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                  igAccounts.length > 0
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-cream-200 text-stone-600 dark:bg-stone-700 dark:text-stone-300'
                }`}
              >
                {igAccounts.length > 0 ? `• ${igAccounts.length} added` : 'Not added'}
              </span>
            </div>
            <div>
              <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base">Instagram</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 line-clamp-2">
                {igAccounts.length > 0
                  ? `Connected as @${igAccounts[0].username || igAccounts[0].name}`
                  : 'Business or Creator account with automated comment-to-DM.'}
              </p>
            </div>
            <Link
              href="/accounts/instagram"
              className="w-full py-2 px-4 bg-brand-yellow hover:bg-brand-yellowHover text-amber-950 font-bold text-xs rounded-xl shadow-xs text-center transition flex items-center justify-center gap-1 active:scale-95"
            >
              {igAccounts.length > 0 ? 'Open ->' : 'Add ->'}
            </Link>
          </div>

          {/* X / Twitter Card */}
          <div className="bg-white dark:bg-stone-800/90 rounded-3xl p-5 border border-cream-200/80 dark:border-stone-700/80 shadow-soft hover:shadow-xl hover:shadow-stone-500/10 hover:border-stone-400/50 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-48 group">
            <div className="flex justify-between items-start">
              <XTwitterIcon className="w-12 h-12 shadow-sm rounded-2xl group-hover:scale-105 transition-transform" />
              <span className="px-3 py-1 bg-cream-200 text-stone-600 dark:bg-stone-700 dark:text-stone-300 rounded-full text-[11px] font-bold">
                Not added
              </span>
            </div>
            <div>
              <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base">X (Twitter)</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Post with one browser cookie. No paid API required.
              </p>
            </div>
            <button
              onClick={() => alert('X / Twitter connector is coming soon')}
              className="w-full py-2 px-4 bg-brand-yellow hover:bg-brand-yellowHover text-amber-950 font-bold text-xs rounded-xl shadow-xs text-center transition active:scale-95"
            >
              Add -&gt;
            </button>
          </div>

          {/* Pinterest Card */}
          <div className="bg-white dark:bg-stone-800/90 rounded-3xl p-5 border border-cream-200/80 dark:border-stone-700/80 shadow-soft hover:shadow-xl hover:shadow-red-500/10 hover:border-red-400/50 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-48 group">
            <div className="flex justify-between items-start">
              <PinterestIcon className="w-12 h-12 shadow-sm rounded-full group-hover:scale-105 transition-transform" />
              <span className="px-3 py-1 bg-cream-200 text-stone-600 dark:bg-stone-700 dark:text-stone-300 rounded-full text-[11px] font-bold">
                Not added
              </span>
            </div>
            <div>
              <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base">Pinterest</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                One click connect. Pins are public, no app to make.
              </p>
            </div>
            <button
              onClick={() => alert('Pinterest connector is coming soon')}
              className="w-full py-2 px-4 bg-brand-yellow hover:bg-brand-yellowHover text-amber-950 font-bold text-xs rounded-xl shadow-xs text-center transition active:scale-95"
            >
              Add -&gt;
            </button>
          </div>

          {/* Telegram Card */}
          <div className="bg-white dark:bg-stone-800/90 rounded-3xl p-5 border border-cream-200/80 dark:border-stone-700/80 shadow-soft hover:shadow-xl hover:shadow-sky-500/10 hover:border-sky-400/50 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-48 group">
            <div className="flex justify-between items-start">
              <TelegramIcon className="w-12 h-12 shadow-sm rounded-full group-hover:scale-105 transition-transform" />
              <span className="px-3 py-1 bg-cream-200 text-stone-600 dark:bg-stone-700 dark:text-stone-300 rounded-full text-[11px] font-bold">
                Not added
              </span>
            </div>
            <div>
              <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base">Telegram</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Post to your channel or group through your own bot.
              </p>
            </div>
            <button
              onClick={() => alert('Telegram connector is coming soon')}
              className="w-full py-2 px-4 bg-brand-yellow hover:bg-brand-yellowHover text-amber-950 font-bold text-xs rounded-xl shadow-xs text-center transition active:scale-95"
            >
              Add -&gt;
            </button>
          </div>

          {/* TikTok Card */}
          <div className="bg-white dark:bg-stone-800/90 rounded-3xl p-5 border border-cream-200/80 dark:border-stone-700/80 shadow-soft hover:shadow-xl hover:shadow-stone-500/10 hover:border-stone-400/50 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-48 group">
            <div className="flex justify-between items-start">
              <TikTokIcon className="w-12 h-12 shadow-sm rounded-2xl group-hover:scale-105 transition-transform" />
              <span className="px-3 py-1 bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 rounded-full text-[11px] font-bold">
                Coming soon
              </span>
            </div>
            <div>
              <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base">TikTok</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Post videos to TikTok. We are building it now.
              </p>
            </div>
            <button
              disabled
              className="w-full py-2 px-4 bg-cream-200 dark:bg-stone-700 text-stone-400 dark:text-stone-500 font-bold text-xs rounded-xl text-center cursor-not-allowed"
            >
              Soon
            </button>
          </div>
        </div>
      </div>

      {/* Latest Posts Preview */}
      <div className="bg-white dark:bg-stone-800/90 rounded-3xl p-6 border border-cream-200/80 dark:border-stone-700/80 shadow-soft space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-stone-900 dark:text-stone-100 text-lg">Latest posts</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">Live posts published to your connected social channels.</p>
          </div>
          <Link href="/posts" className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline">
            All posts
          </Link>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-8 text-stone-400 text-xs">
            No posts sent yet. Start an auto post or use "Post from my gallery".
          </div>
        ) : (
          <div className="divide-y divide-cream-200/80 dark:divide-stone-700/80">
            {posts.slice(0, 5).map((post) => (
              <div key={post.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {post.status === 'live' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-stone-900 dark:text-stone-100 truncate">{post.title}</h4>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
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
