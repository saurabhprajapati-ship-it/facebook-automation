'use client';

import React from 'react';
import { Play, ExternalLink } from 'lucide-react';

const TUTORIALS = [
  {
    title: 'Facebook Page Automation Free, AI Posts Content and Images For You (Full Setup)',
    views: '26.4K views',
    date: '2 Sept 2026',
    tag: 'FACEBOOK AUTOMATION',
    bgColor: 'from-blue-600 to-indigo-800',
    link: 'https://www.youtube.com',
  },
  {
    title: 'Telegram Channel Automation Free, AI Creates and Posts Everything For You...',
    views: '3.2K views',
    date: '10 Sept 2026',
    tag: 'TELEGRAM CHANNEL FREE',
    bgColor: 'from-sky-500 to-blue-700',
    link: 'https://www.youtube.com',
  },
  {
    title: 'Anti Detect Browser Full Setup for Automation, How I Keep My Accounts...',
    views: '3.5K views',
    date: '9 Sept 2026',
    tag: 'SAFE BROWSER AUTOMATION',
    bgColor: 'from-cyan-600 to-emerald-800',
    link: 'https://www.youtube.com',
  },
  {
    title: 'Instagram Automation Free, AI Posts Content and Images For You (Full Setup)...',
    views: '3.8K views',
    date: '5 Sept 2026',
    tag: 'FREE INSTAGRAM AUTOMATION',
    bgColor: 'from-pink-600 to-purple-800',
    link: 'https://www.youtube.com',
  },
];

export default function TutorialSidebar() {
  return (
    <aside className="w-80 shrink-0 hidden xl:block p-4 border-l border-cream-200/80 bg-cream-50/50 space-y-4">
      {/* Header Channel Card */}
      <div className="bg-white p-3.5 rounded-2xl border border-cream-200/80 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full bg-stone-900 border border-stone-700 flex items-center justify-center text-white font-black text-xs">
            SHAHG
          </div>
          <div>
            <h4 className="text-xs font-bold text-stone-900">Learn Earn</h4>
            <p className="text-[11px] text-stone-500">SHAHG on YouTube</p>
          </div>
        </div>
        <a
          href="https://youtube.com"
          target="_blank"
          rel="noreferrer"
          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
        >
          Subscribe
        </a>
      </div>

      {/* Video Cards List */}
      <div className="space-y-3">
        {TUTORIALS.map((tut, i) => (
          <a
            key={i}
            href={tut.link}
            target="_blank"
            rel="noreferrer"
            className="block bg-white rounded-2xl border border-cream-200/80 shadow-xs hover:shadow-card transition group overflow-hidden"
          >
            {/* Thumbnail Mockup */}
            <div className={`h-28 bg-gradient-to-br ${tut.bgColor} p-3 flex flex-col justify-between relative`}>
              <div className="flex justify-between items-start">
                <span className="px-2 py-0.5 bg-black/60 backdrop-blur-xs text-[10px] font-bold text-white uppercase rounded-md tracking-wider">
                  {tut.tag}
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-white/70 group-hover:text-white transition" />
              </div>
              <div className="self-center w-10 h-10 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition">
                <Play className="w-4 h-4 fill-white ml-0.5" />
              </div>
              <div className="text-[10px] text-white/80 font-semibold self-end bg-black/50 px-1.5 py-0.5 rounded">
                720P HD
              </div>
            </div>

            {/* Video Meta */}
            <div className="p-3">
              <h5 className="text-xs font-bold text-stone-800 leading-snug line-clamp-2 group-hover:text-amber-600 transition">
                {tut.title}
              </h5>
              <div className="flex items-center gap-2 mt-1.5 text-[11px] text-stone-500">
                <span>{tut.views}</span>
                <span>•</span>
                <span>{tut.date}</span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </aside>
  );
}
