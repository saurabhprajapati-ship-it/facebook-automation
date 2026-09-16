'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sparkles, Rss, ArrowLeft, Zap } from 'lucide-react';
import { Account } from '@/lib/db';
import { InstagramIcon, FacebookIcon } from '@/components/BrandIcons';

function NewAutoPostContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const kind = searchParams.get('kind'); // 'ai' or 'feed' or null

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [language, setLanguage] = useState('English');
  const [postLength, setPostLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [customLink, setCustomLink] = useState('');
  const [textBeforeLink, setTextBeforeLink] = useState('Read more here:');
  const [addPicture, setAddPicture] = useState(true);
  const [addHashtags, setAddHashtags] = useState(true);

  // Feed fields
  const [feedType, setFeedType] = useState<'wordpress' | 'blogger' | 'rss'>('wordpress');
  const [feedUrl, setFeedUrl] = useState('');

  // Schedule fields
  const [postsPerDay, setPostsPerDay] = useState(3);
  const [waitHours, setWaitHours] = useState(4);
  const [timeFrom, setTimeFrom] = useState('08:00');
  const [timeUntil, setTimeUntil] = useState('22:00');
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetch('/api/accounts')
      .then((r) => r.json())
      .then((data) => {
        if (data.accounts) {
          setAccounts(data.accounts);
          if (data.accounts.length > 0) {
            setSelectedAccounts([data.accounts[0].id]);
          }
        }
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/auto-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          kind: kind || 'ai',
          topic,
          language,
          postLength,
          customLink,
          textBeforeLink,
          addPicture,
          addHashtags,
          feedType,
          feedUrl,
          postsPerDay,
          waitHours,
          timeFrom,
          timeUntil,
          targetAccountIds: selectedAccounts,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to create automation');
      }

      router.push('/auto');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // If no kind selected, show mode chooser
  if (!kind) {
    return (
      <div className="space-y-6 max-w-4xl animate-fadeIn">
        <Link
          href="/auto"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-stone-900 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Auto post</span>
        </Link>

        <div>
          <h1 className="text-3xl font-black text-stone-900 tracking-tight">New auto post</h1>
          <p className="text-stone-500 font-medium text-xs mt-1">
            Pick how the posts should be made.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          {/* AI writes for me Card */}
          <Link
            href="/auto/new?kind=ai"
            className="bg-white rounded-3xl p-8 border border-cream-200/80 shadow-soft hover:shadow-card transition group flex flex-col justify-between space-y-6"
          >
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center shadow-xs group-hover:scale-105 transition">
                <Sparkles className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-stone-900 group-hover:text-amber-600 transition">
                  AI writes for me
                </h3>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                  Gemini writes fresh posts about your topic, in your language, with a picture.
                </p>
              </div>

              <ul className="space-y-2 text-xs text-stone-600 pt-2 border-t border-cream-200/60">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>Any topic, any language</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>Fresh news, not old stories</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>Never repeats a post</span>
                </li>
              </ul>
            </div>

            <div className="w-full py-2.5 bg-brand-yellow group-hover:bg-brand-yellowHover text-amber-950 font-bold text-xs rounded-2xl text-center shadow-xs transition">
              Select AI mode -&gt;
            </div>
          </Link>

          {/* Share from my website Card */}
          <Link
            href="/auto/new?kind=feed"
            className="bg-white rounded-3xl p-8 border border-cream-200/80 shadow-soft hover:shadow-card transition group flex flex-col justify-between space-y-6"
          >
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center shadow-xs group-hover:scale-105 transition">
                <Rss className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-stone-900 group-hover:text-amber-600 transition">
                  Share from my website
                </h3>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                  Every new article on your site is shared with its picture and link.
                </p>
              </div>

              <ul className="space-y-2 text-xs text-stone-600 pt-2 border-t border-cream-200/60">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>WordPress, Blogger and RSS sites</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>AI can write the caption</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>Checks for new articles automatically</span>
                </li>
              </ul>
            </div>

            <div className="w-full py-2.5 bg-cream-200 group-hover:bg-brand-yellow text-stone-800 group-hover:text-amber-950 font-bold text-xs rounded-2xl text-center shadow-xs transition">
              Select Website mode -&gt;
            </div>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl animate-fadeIn">
      {/* Back button */}
      <Link
        href="/auto/new"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-stone-900 transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back</span>
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center shadow-sm shrink-0">
          {kind === 'ai' ? <Sparkles className="w-6 h-6" /> : <Rss className="w-6 h-6" />}
        </div>
        <div>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight">
            {kind === 'ai' ? 'AI writes for me' : 'Share from my website'}
          </h1>
          <p className="text-stone-500 font-medium text-xs">
            {kind === 'ai' ? 'Set it once, it posts all day.' : 'Connect your site RSS/API.'}
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-300 text-rose-800 rounded-2xl text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-cream-200/80 shadow-soft space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-stone-400">
              What to post
            </h4>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Daily viral news"
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand-yellow text-xs font-medium text-stone-900"
              />
              <p className="text-[11px] text-stone-400 mt-1">
                Only for you, to tell your auto posts apart.
              </p>
            </div>

            {kind === 'ai' ? (
              <>
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">
                    What should the posts be about?
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="For example: crypto news and new airdrops. Or: easy healthy recipes for busy mothers. You can write in any language."
                    className="w-full px-4 py-3 rounded-2xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand-yellow text-xs text-stone-900 resize-none"
                  />
                  <p className="text-[11px] text-stone-400 mt-1">
                    Write it the way you would tell a person. The AI works out what you want.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-800 mb-1">Language</label>
                    <input
                      type="text"
                      required
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      placeholder="English, Urdu, Hindi, etc."
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand-yellow text-xs text-stone-900 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-800 mb-1">Post length</label>
                    <select
                      value={postLength}
                      onChange={(e: any) => setPostLength(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand-yellow text-xs text-stone-900 font-medium bg-white"
                    >
                      <option value="short">Short (30 to 60 words)</option>
                      <option value="medium">Medium (60 to 110 words)</option>
                      <option value="long">Long (120 to 180 words)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-800 mb-1">
                      Your link (optional)
                    </label>
                    <input
                      type="text"
                      value={customLink}
                      onChange={(e) => setCustomLink(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand-yellow text-xs text-stone-900 font-medium"
                    />
                    <p className="text-[11px] text-stone-400 mt-1">
                      Added to every post. The AI never writes links.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-800 mb-1">
                      Text before the link
                    </label>
                    <input
                      type="text"
                      value={textBeforeLink}
                      onChange={(e) => setTextBeforeLink(e.target.value)}
                      placeholder="e.g. Ya mere video hai"
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand-yellow text-xs text-stone-900 font-medium"
                    />
                  </div>
                </div>

                <div className="pt-2 space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addPicture}
                      onChange={(e) => setAddPicture(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-brand-yellow mt-0.5"
                    />
                    <div>
                      <span className="text-xs font-bold text-stone-800">Add a picture</span>
                      <p className="text-[11px] text-stone-500">
                        A real photo of the subject when we can find one from Wikimedia/Openverse, or a design card.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addHashtags}
                      onChange={(e) => setAddHashtags(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-brand-yellow mt-0.5"
                    />
                    <div>
                      <span className="text-xs font-bold text-stone-800">Add hashtags</span>
                      <p className="text-[11px] text-stone-500">Two or three that fit the post.</p>
                    </div>
                  </label>
                </div>
              </>
            ) : (
              /* Feed Form */
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">Feed Type</label>
                  <select
                    value={feedType}
                    onChange={(e: any) => setFeedType(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand-yellow text-xs text-stone-900 font-medium bg-white"
                  >
                    <option value="wordpress">WordPress (REST API / feed)</option>
                    <option value="blogger">Blogger RSS</option>
                    <option value="rss">Standard RSS / Atom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">
                    Website or Feed URL
                  </label>
                  <input
                    type="text"
                    required
                    value={feedUrl}
                    onChange={(e) => setFeedUrl(e.target.value)}
                    placeholder="https://myblog.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand-yellow text-xs text-stone-900 font-medium"
                  />
                  <p className="text-[11px] text-stone-400 mt-1">
                    We will automatically discover the posts and watch for new articles.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Post To & When Cards */}
        <div className="space-y-4">
          {/* Post To Card */}
          <div className="bg-white rounded-3xl p-5 border border-cream-200/80 shadow-soft space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-stone-400">
              Post to
            </h4>

            {accounts.length === 0 ? (
              <div className="text-xs text-stone-500">
                You have no accounts yet.{' '}
                <Link href="/accounts/facebook" className="font-bold underline text-blue-600">
                  Accounts.
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {accounts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const allIds = accounts.map((a) => a.id);
                      const isAllSelected = allIds.every((id) => selectedAccounts.includes(id));
                      setSelectedAccounts(isAllSelected ? [] : allIds);
                    }}
                    className="w-full text-left flex items-center justify-between p-2.5 rounded-2xl border border-amber-300 bg-amber-50 hover:bg-amber-100/70 transition cursor-pointer"
                  >
                    <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                      🌐 Both Facebook & Instagram (Ek sath dono par)
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-200 text-amber-900">
                      {accounts.every((a) => selectedAccounts.includes(a.id)) ? '✓ Selected' : '+ Select Both'}
                    </span>
                  </button>
                )}

                {accounts.map((acc) => {
                  const isChecked = selectedAccounts.includes(acc.id);
                  const isIg = acc.platform === 'instagram';
                  return (
                    <label
                      key={acc.id}
                      className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition ${
                        isChecked
                          ? isIg
                            ? 'bg-purple-50/80 border-purple-300'
                            : 'bg-blue-50/80 border-blue-300'
                          : 'bg-cream-50 border-cream-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAccounts([...selectedAccounts, acc.id]);
                          } else {
                            setSelectedAccounts(selectedAccounts.filter((id) => id !== acc.id));
                          }
                        }}
                        className="w-4 h-4 rounded text-amber-500 focus:ring-brand-yellow"
                      />
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
                          <div
                            className={`w-8 h-8 rounded-full text-white flex items-center justify-center font-bold text-xs shadow-2xs ${
                              isIg ? 'bg-linear-to-tr from-amber-500 via-rose-500 to-purple-600' : 'bg-blue-600'
                            }`}
                          >
                            {acc.name ? acc.name.charAt(0).toUpperCase() : 'A'}
                          </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-white dark:bg-stone-800 p-0.5 shadow-2xs flex items-center justify-center">
                          {isIg ? <InstagramIcon className="w-2.5 h-2.5" /> : <FacebookIcon className="w-2.5 h-2.5" />}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                          {acc.name}
                        </p>
                        <p className="text-[10px] text-stone-500 dark:text-stone-400 font-medium truncate">
                          {isIg ? (acc.username ? `@${acc.username}` : 'Instagram Professional') : 'Facebook Page'}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* When Card */}
          <div className="bg-white rounded-3xl p-5 border border-cream-200/80 shadow-soft space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-stone-400">When</h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Posts a day
                </label>
                <select
                  value={postsPerDay}
                  onChange={(e) => setPostsPerDay(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs text-stone-900 bg-white"
                >
                  <option value={1}>1 a day</option>
                  <option value={2}>2 a day</option>
                  <option value={3}>3 a day</option>
                  <option value={6}>6 a day</option>
                  <option value={12}>12 a day</option>
                  <option value={24}>24 a day</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Wait between posts
                </label>
                <select
                  value={waitHours}
                  onChange={(e) => setWaitHours(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs text-stone-900 bg-white"
                >
                  <option value={1}>1 hour</option>
                  <option value={2}>2 hours</option>
                  <option value={4}>4 hours</option>
                  <option value={6}>6 hours</option>
                  <option value={8}>8 hours</option>
                  <option value={12}>12 hours</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">Post from</label>
                <input
                  type="time"
                  value={timeFrom}
                  onChange={(e) => setTimeFrom(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-stone-200 text-xs text-stone-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">Until</label>
                <input
                  type="time"
                  value={timeUntil}
                  onChange={(e) => setTimeUntil(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-stone-200 text-xs text-stone-900"
                />
              </div>
            </div>

            <p className="text-[11px] text-stone-400 leading-tight">
              Your local time. Times are a little random each day so the account does not look like a robot.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-brand-yellow hover:bg-brand-yellowHover text-amber-950 font-bold text-xs rounded-2xl shadow-soft transition flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>{loading ? 'Starting auto post...' : 'Start auto post'}</span>
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

export default function NewAutoPostPage() {
  return (
    <Suspense fallback={<div className="p-8 text-stone-400">Loading form...</div>}>
      <NewAutoPostContent />
    </Suspense>
  );
}
