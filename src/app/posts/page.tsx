'use client';

import React, { useEffect, useState } from 'react';
import { ListOrdered, Trash2, ExternalLink, CheckCircle2, XCircle } from 'lucide-react';
import { PostRecord } from '@/lib/db';
import { fetchWithDrive } from '@/lib/client-drive';

export default function PostsHistoryPage() {
  const [posts, setPosts] = useState<PostRecord[]>([]);

  const loadPosts = () => {
    fetchWithDrive('/api/posts')
      .then((r) => r.json())
      .then((data) => {
        if (data.posts) setPosts(data.posts);
      });
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const handleClear = async () => {
    if (!confirm('Clear all posted history? Duplication detection will reset.')) return;
    await fetchWithDrive('/api/posts', { method: 'DELETE' });
    loadPosts();
  };


  return (
    <div className="space-y-6 max-w-5xl animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center shadow-sm shrink-0">
            <ListOrdered className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-stone-900 tracking-tight">Posts</h1>
            <p className="text-stone-500 font-medium text-xs">
              History of all posts sent to your Facebook page.
            </p>
          </div>
        </div>

        {posts.length > 0 && (
          <button
            onClick={handleClear}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition border border-rose-200 self-start sm:self-center"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear history</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-3xl p-6 border border-cream-200/80 shadow-soft">
        {posts.length === 0 ? (
          <div className="text-center py-12 text-stone-400 text-xs">
            No posts recorded yet. Run an auto post or test post to see items here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-700">
              <thead className="border-b border-cream-200 text-[11px] font-black uppercase tracking-wider text-stone-400">
                <tr>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Title / Story</th>
                  <th className="pb-3">Account</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3 text-right">Facebook Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-200/60">
                {posts.map((p) => (
                  <tr key={p.id} className="hover:bg-cream-50/50 transition">
                    <td className="py-3.5 pr-3">
                      {p.status === 'live' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Live</span>
                        </span>
                      ) : p.status === 'failed' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          <XCircle className="w-3 h-3" />
                          <span>Failed</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          <span>Test</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 pr-4 max-w-sm">
                      <div className="font-bold text-stone-900 truncate">{p.title}</div>
                      <div className="text-[11px] text-stone-500 line-clamp-1 mt-0.5">
                        {p.caption}
                      </div>
                      {p.errorMsg && (
                        <div className="text-[10px] text-rose-600 font-semibold mt-1">
                          {p.errorMsg}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 pr-3 font-semibold text-stone-800">{p.accountName}</td>
                    <td className="py-3.5 pr-3 text-stone-400 text-[11px]">
                      {new Date(p.createdAt).toLocaleDateString()} {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3.5 text-right">
                      {p.fbPostId ? (
                        <a
                          href={`https://facebook.com/${p.fbPostId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-bold text-blue-600 hover:underline"
                        >
                          <span>View</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-stone-300">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
