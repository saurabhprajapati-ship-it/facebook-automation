'use client';

import React, { useEffect, useState } from 'react';
import { Image as ImageIcon, Check, CheckCircle2, Upload } from 'lucide-react';
import BrandingPreview from '@/components/BrandingPreview';
import { BrandingSettings } from '@/lib/db';
import { fetchWithDrive } from '@/lib/client-drive';

interface Account {
  id: string;
  name: string;
  platform?: 'facebook' | 'instagram' | string;
  username?: string;
  pageId?: string;
  igUserId?: string;
}

const COLOR_PRESETS = [
  { label: 'Yellow', bg: '#F5C518', text: '#1C1917' },
  { label: 'White', bg: '#FFFFFF', text: '#1C1917' },
  { label: 'Black', bg: '#1C1917', text: '#FFFFFF' },
  { label: 'Red', bg: '#E60023', text: '#FFFFFF' },
  { label: 'Blue', bg: '#1877F2', text: '#FFFFFF' },
  { label: 'Green', bg: '#10B981', text: '#FFFFFF' },
  { label: 'Pink', bg: '#EC4899', text: '#FFFFFF' },
  { label: 'Orange', bg: '#F97316', text: '#FFFFFF' },
];

const FONTS = [
  'Poppins',
  'Nunito',
  'Montserrat',
  'Oswald',
  'Bebas Neue',
  'Playfair Display',
  'Roboto Slab',
  'Baloo 2',
  'Lobster',
];

export default function BrandingPage() {
  const [branding, setBranding] = useState<BrandingSettings | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [customNames, setCustomNames] = useState<Record<string, string>>({});
  const [accountName, setAccountName] = useState('Money Mind set');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mobileTab, setMobileTab] = useState<'settings' | 'preview'>('settings');

  useEffect(() => {
    // 1. Instant local restore to prevent refresh clearing
    try {
      const localBranding = localStorage.getItem('postnova_branding_settings');
      if (localBranding) {
        const parsed = JSON.parse(localBranding);
        setBranding(parsed);
        if (parsed.customAccountNames) {
          setCustomNames(parsed.customAccountNames);
        }
      }
      const localNames = localStorage.getItem('postnova_custom_names');
      if (localNames) {
        setCustomNames((prev) => ({ ...prev, ...JSON.parse(localNames) }));
      }
    } catch {}

    // 2. Fetch from server with Drive credentials
    fetchWithDrive('/api/branding')
      .then((r) => r.json())
      .then((data) => {
        if (data.branding) {
          setBranding(data.branding);
          if (data.branding.customAccountNames) {
            setCustomNames((prev) => ({ ...prev, ...data.branding.customAccountNames }));
          }
        }
        if (data.accounts?.length) {
          setAccounts(data.accounts);
          setSelectedAccountId((curr) => curr || data.accounts[0].id);
          const initialName = data.branding?.customAccountNames?.[data.accounts[0].id] || data.accounts[0].name;
          setAccountName(initialName);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const handleSelectAccount = (accId: string) => {
    setSelectedAccountId(accId);
    const targetAcc = accounts.find((a) => a.id === accId);
    const displayName = customNames[accId] !== undefined ? customNames[accId] : (targetAcc?.name || '');
    setAccountName(displayName);
  };

  const handleCustomNameChange = (accId: string, val: string) => {
    setCustomNames((prev) => ({ ...prev, [accId]: val }));
    if (accId === selectedAccountId) {
      setAccountName(val);
    }
  };

  const handleSave = async () => {
    if (!branding) return;
    setLoading(true);
    setSaved(false);
    try {
      const updatedCustomNames: Record<string, string> = {
        ...(branding.customAccountNames || {}),
        ...customNames,
      };
      if (selectedAccountId && accountName.trim()) {
        updatedCustomNames[selectedAccountId] = accountName.trim();
      }

      const payload = {
        ...branding,
        customAccountNames: updatedCustomNames,
        accountId: selectedAccountId,
        accountName: accountName.trim(),
      };

      // Permanent local backup
      try {
        localStorage.setItem('postnova_branding_settings', JSON.stringify(payload));
        localStorage.setItem('postnova_custom_names', JSON.stringify(updatedCustomNames));
      } catch {}

      const res = await fetchWithDrive('/api/branding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.ok) {
        if (data.branding) setBranding(data.branding);
        if (data.accounts?.length) setAccounts(data.accounts);
        setSaved(true);
        setTimeout(() => setSaved(false), 5000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !branding) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setBranding({ ...branding, logoUrl: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  if (!branding) return <div className="p-8 text-stone-400">Loading branding...</div>;

  return (
    <div className="space-y-6 max-w-6xl animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center shadow-sm shrink-0">
            <ImageIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-stone-900 tracking-tight">Branding</h1>
            <p className="text-stone-500 font-medium text-xs">
              Each account's own name and a "Like and Share" bar on every picture you post.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          className="self-start sm:self-auto py-2.5 px-5 bg-brand-yellow hover:bg-brand-yellowHover text-amber-950 font-bold text-xs rounded-2xl shadow-soft transition flex items-center gap-2 cursor-pointer"
        >
          <Check className="w-4 h-4" />
          <span>{loading ? 'Saving...' : 'Save branding'}</span>
        </button>
      </div>

      {saved && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fadeIn shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Settings saved successfully! New posts and live preview use your settings.</span>
        </div>
      )}

      {/* Mobile Tab Switcher (Visible only on mobile/tablet) */}
      <div className="flex lg:hidden items-center p-1 bg-cream-200/70 dark:bg-stone-800/80 rounded-2xl border border-cream-300/60 dark:border-stone-700/60 w-full mb-2">
        <button
          type="button"
          onClick={() => setMobileTab('settings')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
            mobileTab === 'settings'
              ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs'
              : 'text-stone-600 dark:text-stone-400'
          }`}
        >
          ⚙️ Settings
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('preview')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
            mobileTab === 'preview'
              ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs'
              : 'text-stone-600 dark:text-stone-400'
          }`}
        >
          👁️ Live Preview
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Controls (7 cols) */}
        <div className={`lg:col-span-7 space-y-6 ${mobileTab === 'settings' ? 'block' : 'hidden lg:block'}`}>
          <div className="bg-white rounded-3xl p-6 border border-cream-200/80 shadow-soft space-y-6">
            {/* WHERE */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-stone-400">Where</h4>
              <div className="space-y-2.5">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={branding.enabledOnAuto}
                    onChange={(e) => setBranding({ ...branding, enabledOnAuto: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-brand-yellow mt-0.5"
                  />
                  <div>
                    <span className="text-xs font-bold text-stone-800">On every auto post picture</span>
                    <p className="text-[11px] text-stone-500">
                      Real photos and our design cards from AI and website auto posts.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={branding.offerOnManual}
                    onChange={(e) => setBranding({ ...branding, offerOnManual: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-brand-yellow mt-0.5"
                  />
                  <div>
                    <span className="text-xs font-bold text-stone-800">Offer it on my own photos</span>
                    <p className="text-[11px] text-stone-500">
                      New post shows a tick to add it to the photo you upload. You can untick it on any post.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* AI WATERMARK CLEANER / BRAND LOGO SHIELD */}
            <div className="space-y-3 pt-4 border-t border-cream-200/60">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-stone-400">AI Star Watermark Cover</h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Logo Shield
                </span>
              </div>
              <p className="text-[11px] text-stone-500">
                Covers the corner AI star watermark with your clean circular Page / Brand Logo so no text is covered or blurred.
              </p>

              <div className="space-y-2">
                <label className="flex items-start gap-3 p-3 rounded-2xl border border-stone-200/80 hover:bg-stone-50 cursor-pointer transition">
                  <input
                    type="radio"
                    name="watermarkMode"
                    value="logo_stamp"
                    checked={(branding.watermarkMode || 'logo_stamp') === 'logo_stamp' || branding.watermarkMode === 'spot_healer'}
                    onChange={() => setBranding({ ...branding, watermarkMode: 'logo_stamp' })}
                    className="mt-0.5 text-amber-500"
                  />
                  <div className="flex-1">
                    <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                      ⭐ Option 1: Brand Logo Stamp (Covers Star Watermark)
                      <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">Recommended</span>
                    </span>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      Directly covers the corner AI sparkle star with your clean circular Brand Logo. Zero text loss and 100% brand visibility.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-2xl border border-stone-200/80 hover:bg-stone-50 cursor-pointer transition">
                  <input
                    type="radio"
                    name="watermarkMode"
                    value="off"
                    checked={branding.watermarkMode === 'off'}
                    onChange={() => setBranding({ ...branding, watermarkMode: 'off' })}
                    className="mt-0.5 text-amber-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-stone-800">Option 2: Disabled</span>
                    <p className="text-[11px] text-stone-500">Keep original corner as-is without logo stamp.</p>
                  </div>
                </label>
              </div>

              {/* Logo Upload & Avatar Box */}
              {branding.watermarkMode !== 'off' && (
                <div className="p-3.5 bg-cream-50/80 border border-cream-200/80 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-800">Brand Logo / Page Avatar:</span>
                    {branding.logoUrl && (
                      <button
                        type="button"
                        onClick={() => setBranding({ ...branding, logoUrl: '' })}
                        className="text-[11px] text-rose-600 font-bold hover:underline"
                      >
                        Reset to Default Page Logo
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-amber-400 bg-white shadow-xs shrink-0 flex items-center justify-center">
                      {branding.logoUrl ? (
                        <img
                          src={branding.logoUrl}
                          alt="Brand Logo"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center font-black text-white text-base"
                          style={{ backgroundColor: branding.barColor }}
                        >
                          {accountName ? accountName.charAt(0).toUpperCase() : 'P'}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-1">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-700 shadow-xs hover:bg-stone-50 cursor-pointer">
                        <Upload className="w-3.5 h-3.5 text-stone-600" />
                        <span>Upload Custom Logo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </label>
                      <p className="text-[10px] text-stone-500">
                        {branding.logoUrl
                          ? '✓ Custom logo uploaded and active'
                          : '⚡ Using Facebook Page avatar / initials by default'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* PLACEMENT & BADGES */}
            <div className="space-y-3 pt-4 border-t border-cream-200/60">
              <h4 className="text-xs font-black uppercase tracking-wider text-stone-400">Placement & Badges</h4>

              <div className="space-y-2.5">
                {/* Bottom Bar Toggle */}
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={branding.showBottomBar !== false}
                    onChange={(e) => setBranding({ ...branding, showBottomBar: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-brand-yellow mt-0.5"
                  />
                  <div>
                    <span className="text-xs font-bold text-stone-800">Show bottom "Like and Share" bar</span>
                    <p className="text-[11px] text-stone-500">
                      Clean bar at the very bottom with dynamic Facebook Page Name and Like/Share text.
                    </p>
                  </div>
                </label>

                {/* Top Badge Toggle (Default OFF) */}
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(branding.showTopBadge)}
                    onChange={(e) => setBranding({ ...branding, showTopBadge: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-brand-yellow mt-0.5"
                  />
                  <div>
                    <span className="text-xs font-bold text-stone-800">Show account badge at the top</span>
                    <p className="text-[11px] text-stone-500">
                      (Optional) Untick this to keep the top of your photos 100% clean.
                    </p>
                  </div>
                </label>

                {/* Headline Banner Toggle */}
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(branding.headlineBanner)}
                    onChange={(e) => setBranding({ ...branding, headlineBanner: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-brand-yellow mt-0.5"
                  />
                  <div>
                    <span className="text-xs font-bold text-stone-800">Show headline text banner on photo</span>
                    <p className="text-[11px] text-stone-500">
                      Overlays post title as high-impact text strips on auto posts.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* TEXT & PAGE ACCOUNTS */}
            <div className="space-y-4 pt-4 border-t border-cream-200/60">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-stone-400">Account & Page Branding</h4>
                <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full">
                  Facebook + Instagram
                </span>
              </div>

              {/* Account Selection Tabs (Facebook & Instagram) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-stone-700">
                  Select Account to Edit Branding:
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {accounts.length === 0 ? (
                    <div className="text-xs text-stone-400 italic">
                      Default account mode (connect Facebook / Instagram in Accounts tab to link live pages).
                    </div>
                  ) : (
                    accounts.map((acc) => {
                      const isSelected = acc.id === selectedAccountId;
                      const isIg = acc.platform === 'instagram' || acc.id.startsWith('acc_ig') || Boolean(acc.igUserId);
                      const currentName = customNames[acc.id] !== undefined ? customNames[acc.id] : acc.name;
                      return (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => handleSelectAccount(acc.id)}
                          className={`px-3 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
                            isSelected
                              ? isIg
                                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white ring-2 ring-purple-300'
                                : 'bg-blue-600 text-white ring-2 ring-blue-300'
                              : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200'
                          }`}
                        >
                          <span>{isIg ? '📸' : '🟦'}</span>
                          <span>{currentName || (isIg ? 'Instagram Page' : 'Facebook Page')}</span>
                          <span
                            className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full ${
                              isSelected ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-600'
                            }`}
                          >
                            {isIg ? 'Instagram' : 'Facebook'}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Active Account Branding Name Card */}
              <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-950">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        accounts.find((a) => a.id === selectedAccountId)?.platform === 'instagram'
                          ? 'bg-pink-500'
                          : 'bg-blue-600'
                      }`}
                    />
                    <span>
                      {accounts.find((a) => a.id === selectedAccountId)?.platform === 'instagram'
                        ? 'Instagram Page Branding Name:'
                        : 'Facebook Page Branding Name:'}
                    </span>
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900">
                    {accounts.find((a) => a.id === selectedAccountId)?.platform === 'instagram'
                      ? '📸 Instagram'
                      : '🟦 Facebook'}
                  </span>
                </div>

                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => {
                    setAccountName(e.target.value);
                    if (selectedAccountId) {
                      handleCustomNameChange(selectedAccountId, e.target.value);
                    }
                  }}
                  placeholder="Enter Page or Brand name (e.g. Money Mind set or Last Call Rescue)"
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-xs font-bold text-stone-900 bg-white focus:ring-2 focus:ring-amber-400"
                />
                <p className="text-[10px] text-amber-900 leading-normal">
                  ⚡ When posting to this account, PostNova will automatically brand every photo with this exact name!
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Text at the bottom
                </label>
                <input
                  type="text"
                  value={branding.bottomText}
                  onChange={(e) => setBranding({ ...branding, bottomText: e.target.value })}
                  placeholder="For more content, Like and Share"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-900 font-medium"
                />
                <p className="text-[11px] text-stone-400 mt-1">
                  Default: For more content, Like and Share.{' '}
                  <button
                    type="button"
                    onClick={() => setBranding({ ...branding, bottomText: 'For more content, Like and Share' })}
                    className="text-amber-700 font-bold underline"
                  >
                    Use default
                  </button>
                </p>
              </div>
            </div>

            {/* COLOUR */}
            <div className="space-y-3 pt-4 border-t border-cream-200/60">
              <h4 className="text-xs font-black uppercase tracking-wider text-stone-400">Colour</h4>
              <div className="flex items-center gap-2.5 flex-wrap">
                {COLOR_PRESETS.map((p) => {
                  const isSelected = branding.barColor.toLowerCase() === p.bg.toLowerCase();
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setBranding({ ...branding, barColor: p.bg, textColor: p.text })}
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-xs shadow-xs transition transform ${
                        isSelected ? 'scale-110 ring-4 ring-amber-300' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: p.bg, color: p.text, border: '1px solid rgba(0,0,0,0.1)' }}
                      title={p.label}
                    >
                      Aa
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 mb-1">Bar colour</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={branding.barColor}
                      onChange={(e) => setBranding({ ...branding, barColor: e.target.value })}
                      className="w-9 h-9 rounded-xl border border-stone-200 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={branding.barColor}
                      onChange={(e) => setBranding({ ...branding, barColor: e.target.value })}
                      className="flex-1 px-3 py-1.5 rounded-xl border border-stone-200 font-mono text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-600 mb-1">Text colour</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={branding.textColor}
                      onChange={(e) => setBranding({ ...branding, textColor: e.target.value })}
                      className="w-9 h-9 rounded-xl border border-stone-200 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={branding.textColor}
                      onChange={(e) => setBranding({ ...branding, textColor: e.target.value })}
                      className="flex-1 px-3 py-1.5 rounded-xl border border-stone-200 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* FONT */}
            <div className="space-y-3 pt-4 border-t border-cream-200/60">
              <h4 className="text-xs font-black uppercase tracking-wider text-stone-400">Font</h4>
              <div className="flex flex-wrap gap-2">
                {FONTS.map((font) => (
                  <button
                    key={font}
                    type="button"
                    onClick={() => setBranding({ ...branding, font })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      branding.font === font
                        ? 'bg-amber-400 text-amber-950 shadow-xs ring-2 ring-amber-300'
                        : 'bg-cream-100 text-stone-700 hover:bg-cream-200'
                    }`}
                    style={{ fontFamily: font }}
                  >
                    {font}
                  </button>
                ))}
              </div>
            </div>

            {/* LOOK */}
            <div className="space-y-3 pt-4 border-t border-cream-200/60">
              <h4 className="text-xs font-black uppercase tracking-wider text-stone-400">Look</h4>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setBranding({ ...branding, look: '3D' })}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                    branding.look === '3D'
                      ? 'bg-amber-400 text-amber-950 shadow-xs'
                      : 'bg-cream-100 text-stone-700 hover:bg-cream-200'
                  }`}
                >
                  3D
                </button>
                <button
                  type="button"
                  onClick={() => setBranding({ ...branding, look: 'normal' })}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                    branding.look === 'normal'
                      ? 'bg-amber-400 text-amber-950 shadow-xs'
                      : 'bg-cream-100 text-stone-700 hover:bg-cream-200'
                  }`}
                >
                  Normal
                </button>
              </div>
            </div>

            {/* NEWS LOOK */}
            <div className="pt-4 border-t border-cream-200/60">
              <h4 className="text-xs font-black uppercase tracking-wider text-stone-400 mb-2">News look</h4>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={branding.headlineBanner}
                  onChange={(e) => setBranding({ ...branding, headlineBanner: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-brand-yellow"
                />
                <span className="text-xs font-bold text-stone-800">
                  Put the headline on the photo (Viral News Style)
                </span>
              </label>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="w-full py-3 px-5 bg-brand-yellow hover:bg-brand-yellowHover text-amber-950 font-bold text-xs rounded-2xl shadow-soft transition flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? 'Saving...' : 'Save branding'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Live Dual Preview (5 cols) */}
        <div className={`lg:col-span-5 space-y-4 ${mobileTab === 'preview' ? 'block' : 'hidden lg:block'}`}>
          <BrandingPreview branding={branding} accountName={accountName} />
        </div>
      </div>
    </div>
  );
}
