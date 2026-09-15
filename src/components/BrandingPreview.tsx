'use client';

import React, { useState } from 'react';
import { BrandingSettings } from '@/lib/db';

interface BrandingPreviewProps {
  branding: BrandingSettings;
  accountName?: string;
  sampleHeadline?: string;
}

export default function BrandingPreview({
  branding,
  accountName = 'Curious People',
  sampleHeadline = 'BIG CHANGE ANNOUNCED FOR MATRIC STUDENTS ACROSS',
}: BrandingPreviewProps) {
  const [activeTab, setActiveTab] = useState<'photo' | 'card'>('photo');

  const lines = sampleHeadline.toUpperCase().split(' ');
  const displayLines: string[] = [];
  let cur = '';
  for (const w of lines) {
    if ((cur + ' ' + w).trim().length > 20) {
      if (cur) displayLines.push(cur.trim());
      cur = w;
    } else {
      cur += ' ' + w;
    }
  }
  if (cur) displayLines.push(cur.trim());

  return (
    <div className="bg-white rounded-3xl p-5 border border-cream-200/80 shadow-soft">
      {/* Tabs */}
      <div className="flex items-center gap-2 mb-4">
        <button
          type="button"
          onClick={() => setActiveTab('photo')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition uppercase tracking-wider ${
            activeTab === 'photo'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-cream-100 text-stone-600 hover:bg-cream-200/60'
          }`}
        >
          On A Real Photo
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('card')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition uppercase tracking-wider ${
            activeTab === 'card'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-cream-100 text-stone-600 hover:bg-cream-200/60'
          }`}
        >
          On A Design Card
        </button>
      </div>

      {/* Preview Screen */}
      <div className="relative aspect-square w-full max-w-[400px] mx-auto rounded-3xl overflow-hidden shadow-card border border-stone-200/60 select-none">
        {activeTab === 'photo' ? (
          /* REAL PHOTO PREVIEW */
          <div
            className="w-full h-full bg-cover bg-center flex flex-col justify-between p-4 relative"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&q=80')`,
            }}
          >
            {/* Dark gradient for readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/85 pointer-events-none" />

            {/* Top Account Badge (Only if showTopBadge is ON) */}
            {branding.showTopBadge && (
              <div className="relative z-10 self-start">
                <div
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold shadow-md ${
                    branding.look === '3D' ? 'shadow-lg ring-1 ring-white/20' : ''
                  }`}
                  style={{
                    backgroundColor: branding.barColor,
                    color: branding.textColor,
                  }}
                >
                  <span className="w-2 h-2 rounded-full bg-white" />
                  <span>{accountName}</span>
                </div>
              </div>
            )}

            {/* Headline Overlay Banner */}
            {branding.headlineBanner && (
              <div className="relative z-10 my-auto pt-12 space-y-2">
                {displayLines.map((line, idx) => (
                  <div key={idx}>
                    <span
                      className={`inline-block px-3.5 py-1.5 text-lg sm:text-xl font-black tracking-wide uppercase ${
                        branding.look === '3D'
                          ? 'rounded-xl shadow-xl'
                          : 'rounded-sm'
                      }`}
                      style={{
                        backgroundColor: branding.barColor,
                        color: branding.textColor,
                        fontFamily: branding.font,
                      }}
                    >
                      {line}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Watermark Cleaner / Brand Logo Shield Badge */}
            {branding.watermarkMode !== 'off' && (
              <div className="absolute bottom-14 right-3 z-20 flex items-center gap-1.5 bg-black/75 backdrop-blur-xs p-1 pr-2.5 rounded-full border border-amber-400/40 shadow-lg">
                {branding.logoUrl ? (
                  <img
                    src={branding.logoUrl}
                    alt="Logo"
                    className="w-6 h-6 rounded-full object-cover border border-white/60"
                  />
                ) : (
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center font-black text-white text-[10px] shadow-xs"
                    style={{ backgroundColor: branding.barColor }}
                  >
                    {accountName ? accountName.charAt(0).toUpperCase() : 'P'}
                  </div>
                )}
                <span className="text-[10px] font-bold text-white tracking-wide">
                  Logo Covers Star ✓
                </span>
              </div>
            )}

            {/* Bottom Branding Bar (Only if showBottomBar is ON) - Physically pinned to the bottom */}
            {branding.showBottomBar !== false && (
              <div className="absolute bottom-0 left-0 right-0 z-20 bg-stone-950/95 px-4 py-3 flex items-center justify-between border-t border-white/10">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: branding.barColor }}
                  />
                  <span
                    className="text-xs font-bold text-white tracking-wide"
                    style={{ fontFamily: branding.font }}
                  >
                    {accountName}
                  </span>
                </div>
                <span
                  className="text-[11px] font-medium text-stone-300"
                  style={{ fontFamily: branding.font }}
                >
                  {branding.bottomText || 'For more content, Like and Share'}
                </span>
              </div>
            )}
          </div>
        ) : (
          /* DESIGN CARD PREVIEW */
          <div className="w-full h-full bg-gradient-to-br from-amber-100 via-rose-50 to-orange-100 p-5 flex flex-col justify-between relative">
            {/* Top Badge (Only if showTopBadge is ON) */}
            {branding.showTopBadge && (
              <div className="self-start">
                <div
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold shadow-md ${
                    branding.look === '3D' ? 'shadow-lg ring-1 ring-white/20' : ''
                  }`}
                  style={{
                    backgroundColor: branding.barColor,
                    color: branding.textColor,
                  }}
                >
                  <span className="w-2 h-2 rounded-full bg-white" />
                  <span>{accountName}</span>
                </div>
              </div>
            )}

            {/* Floating White Card */}
            <div className={`bg-white rounded-3xl p-6 shadow-xl border border-white/80 my-auto ${
              !branding.showTopBadge && branding.showBottomBar === false ? 'scale-105' : ''
            }`}>
              <span
                className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider inline-block mb-3"
                style={{
                  backgroundColor: branding.barColor,
                  color: branding.textColor,
                }}
              >
                Tips
              </span>
              <h3
                className="text-xl font-extrabold text-stone-900 leading-snug transition-all"
                style={{ fontFamily: branding.font }}
              >
                Five easy ways to grow your page this week
              </h3>
            </div>

            {/* Bottom Button Bar (Only if showBottomBar is ON) */}
            {branding.showBottomBar !== false && (
              <div
                className={`w-full py-2.5 px-4 rounded-2xl text-center text-xs font-bold shadow-md transition-all ${
                  branding.look === '3D' ? 'shadow-lg ring-1 ring-black/10' : ''
                }`}
                style={{
                  backgroundColor: branding.barColor,
                  color: branding.textColor,
                  fontFamily: branding.font,
                }}
              >
                {branding.bottomText || 'For more content, Like and Share'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
