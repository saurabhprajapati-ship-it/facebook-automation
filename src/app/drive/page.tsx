'use client';

import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Folder,
  ExternalLink,
  Key,
  ShieldCheck,
  HelpCircle,
  Database,
  CloudUpload,
  CloudDownload,
  Download,
  Clock,
  Copy,
  Trash2
} from 'lucide-react';
import {
  getStoredDriveConfig,
  saveStoredDriveConfig,
  clearStoredDriveConfig,
  fetchWithDrive
} from '@/lib/client-drive';

export default function DrivePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncingDb, setSyncingDb] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState('');
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');
  const [clientEmail, setClientEmail] = useState('');
  const [mainFolderName, setMainFolderName] = useState('');
  const [mainFolderId, setMainFolderId] = useState('');
  const [subfolders, setSubfolders] = useState<{ id: string; name: string }[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedCron, setCopiedCron] = useState(false);

  // Form inputs
  const [jsonInput, setJsonInput] = useState('');
  const [folderLinkInput, setFolderLinkInput] = useState('');

  useEffect(() => {
    const { folderId } = getStoredDriveConfig();
    fetchWithDrive('/api/drive/connect')
      .then((res) => res.json())
      .then((data) => {
        setStatus(data.status || 'disconnected');
        setClientEmail(data.clientEmail || '');
        setMainFolderName(data.mainFolderName || '');
        setMainFolderId(data.mainFolderId || folderId || '');
        if (data.folderMappings) {
          setSubfolders(data.folderMappings.map((m: any) => ({ id: m.folderId, name: m.folderName })));
        }
        if (data.lastError) setErrorMsg(data.lastError);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setJsonInput(String(event.target?.result || ''));
    };
    reader.readAsText(file);
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetchWithDrive('/api/drive/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceAccountJson: jsonInput.trim() || undefined,
          mainFolderInput: folderLinkInput.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Connection failed');
      }

      const activeFolderId = data.mainFolderId || folderLinkInput.trim();
      setStatus('connected');
      setClientEmail(data.clientEmail || '');
      setMainFolderName(data.mainFolderName || '');
      setMainFolderId(activeFolderId);
      setSubfolders(data.subfolders || []);
      setSuccessMsg('Google Drive connected successfully! 5 TB Storage ready.');

      // Save to client localStorage & cookies for permanent refresh persistence
      saveStoredDriveConfig(activeFolderId, jsonInput.trim() || undefined);
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Google Drive?')) return;
    try {
      await fetch('/api/drive/connect', { method: 'DELETE' });
      clearStoredDriveConfig();
      setStatus('disconnected');
      setClientEmail('');
      setMainFolderName('');
      setMainFolderId('');
      setSubfolders([]);
      setSuccessMsg('Google Drive disconnected.');
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handlePushDb = async () => {
    setSyncingDb(true);
    setSyncStatusMsg('');
    setErrorMsg('');
    try {
      const res = await fetchWithDrive('/api/db/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Push failed');
      setSyncStatusMsg(`Database backed up to Google Drive (postnova_db.json) at ${new Date().toLocaleTimeString()}!`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Cloud backup failed');
    } finally {
      setSyncingDb(false);
    }
  };

  const handlePullDb = async () => {
    setSyncingDb(true);
    setSyncStatusMsg('');
    setErrorMsg('');
    try {
      const res = await fetchWithDrive('/api/db/sync', { method: 'GET' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Pull failed');
      setSyncStatusMsg(`Successfully synced state from Google Drive (${data.stats?.accounts || 0} accounts, ${data.stats?.scheduledQueue || 0} posts queued).`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Cloud pull failed');
    } finally {
      setSyncingDb(false);
    }
  };


  const handleDownloadTemplateDb = async () => {
    try {
      let currentAccounts: any[] = [];
      try {
        const resAcc = await fetch('/api/accounts');
        const accData = await resAcc.json();
        currentAccounts = accData.accounts || [];
      } catch {}

      const templateDb = {
        accounts: currentAccounts,
        geminiKeys: [],
        automations: [],
        branding: {
          enabledOnAuto: true,
          offerOnManual: true,
          showAccountName: true,
          showTopBadge: false,
          showBottomBar: true,
          watermarkMode: 'logo_stamp',
          logoUrl: '',
          customAccountNames: {},
          bottomText: 'For more content, Like and Share',
          barColor: '#E60023',
          textColor: '#FFFFFF',
          font: 'Poppins',
          look: '3D',
          headlineBanner: false,
        },
        posts: [],
        scheduledQueue: [],
        autoDmRules: [],
        autoDmLogs: [],
        driveSettings: {
          status: 'connected',
          mainFolderId,
          mainFolderName,
          clientEmail,
        },
        notifications: [
          {
            id: 'notif_welcome',
            type: 'info',
            title: 'Welcome to PostNova Cloud',
            message: 'Your Google Drive Cloud Database is connected and ready 24/7.',
            createdAt: new Date().toISOString(),
          }
        ],
        notificationPreferences: {
          postWentOut: true,
          postFailed: true,
          newsUpdates: true,
        }
      };

      const blob = new Blob([JSON.stringify(templateDb, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'postnova_db.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSyncStatusMsg("Downloaded 'postnova_db.json'! Drop it into your Google Drive folder, then click 'Backup DB to Drive'.");
    } catch (err: any) {
      setErrorMsg(err.message || 'Download failed');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-stone-900 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <HardDrive className="w-5 h-5" />
            </div>
            Google Drive (5 TB Storage)
          </h1>
          <p className="text-sm text-stone-500 mt-1 font-medium">
            Connect your 5 TB Google Drive to sync 1000+ AI images and videos instantly without browser lag.
          </p>
        </div>

        {status === 'connected' && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-full text-xs font-bold shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Connected &amp; Live</span>
            </div>
            <button
              type="button"
              onClick={handleDisconnect}
              className="flex items-center gap-1.5 bg-stone-100 hover:bg-red-50 hover:text-red-700 text-stone-600 border border-stone-200 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer"
              title="Disconnect Google Drive"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Disconnect</span>
            </button>
          </div>
        )}
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{errorMsg}</div>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{successMsg}</div>
        </div>
      )}

      {/* Status Card if Connected */}
      {status === 'connected' && (
        <div className="bg-white rounded-3xl border border-cream-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-stone-100">
            <div>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">Service Account Bot Email</p>
              <p className="text-sm font-bold text-stone-900 font-mono mt-0.5">{clientEmail}</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-stone-500 bg-cream-100 px-3 py-1.5 rounded-xl font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Permanent Access</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-cream-50 border border-cream-200/60">
              <p className="text-xs font-bold text-stone-500">Main Drive Folder</p>
              <p className="text-sm font-extrabold text-stone-900 mt-1 flex items-center gap-2">
                <Folder className="w-4 h-4 text-amber-600" />
                {mainFolderName || 'Root Folder'}
              </p>
              <p className="text-[11px] text-stone-400 font-mono truncate mt-0.5">ID: {mainFolderId}</p>
            </div>

            <div className="p-4 rounded-2xl bg-cream-50 border border-cream-200/60">
              <p className="text-xs font-bold text-stone-500">Detected Subfolders</p>
              <p className="text-sm font-extrabold text-stone-900 mt-1">
                {subfolders.length} Subfolder{subfolders.length === 1 ? '' : 's'} available
              </p>
              <p className="text-[11px] text-stone-400 mt-0.5">Ready to map with your Facebook Pages</p>
            </div>
          </div>

          {subfolders.length > 0 && (
            <div className="mt-4 pt-4 border-t border-stone-100">
              <p className="text-xs font-bold text-stone-600 mb-2">Available Subfolders in Drive:</p>
              <div className="flex flex-wrap gap-2">
                {subfolders.map((f) => (
                  <span
                    key={f.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 border border-blue-200/60 text-blue-900 text-xs font-semibold"
                  >
                    <Folder className="w-3.5 h-3.5 text-blue-600" />
                    {f.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cloud Database Dual-Sync Card */}
      {status === 'connected' && (
        <div className="bg-gradient-to-br from-blue-50/60 via-white to-amber-50/40 rounded-3xl border border-blue-200/80 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-blue-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
                  Cloud Database (postnova_db.json)
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    24/7 Cloud Ready
                  </span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Your accounts, queue, and Auto-DM rules are backed up directly to your Google Drive.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePushDb}
                disabled={syncingDb}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50"
              >
                <CloudUpload className="w-3.5 h-3.5" />
                {syncingDb ? 'Syncing...' : 'Backup DB to Drive'}
              </button>

              <button
                type="button"
                onClick={handlePullDb}
                disabled={syncingDb}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs font-bold transition-all shadow-2xs disabled:opacity-50"
              >
                <CloudDownload className="w-3.5 h-3.5 text-stone-500" />
                Pull Latest from Drive
              </button>
            </div>
          </div>

          {/* 1-Click Initial Setup for New Users */}
          <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                <Folder className="w-4 h-4 text-amber-700" />
                New User 1-Time Setup (5 Seconds)
              </span>
              <span className="text-[10px] font-extrabold text-amber-800 bg-amber-200/70 px-2 py-0.5 rounded-md">
                1-Time Setup
              </span>
            </div>
            <p className="text-xs text-amber-900 leading-relaxed">
              Google Drive me bot ko 24/7 cloud write access dene ke liye bas yeh 2 aasan steps karein:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={handleDownloadTemplateDb}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold shadow-xs transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Step 1: Download postnova_db.json
              </button>

              {mainFolderId ? (
                <a
                  href={`https://drive.google.com/drive/folders/${mainFolderId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-amber-50 border border-amber-300 text-amber-950 text-xs font-extrabold shadow-2xs transition-all"
                >
                  <ExternalLink className="w-4 h-4 text-amber-700" />
                  Step 2: Open Folder &amp; Drop File ↗
                </a>
              ) : (
                <div className="flex items-center justify-center px-4 py-2.5 rounded-xl bg-amber-100/60 text-amber-800 text-xs font-semibold">
                  Step 2: Connect folder first
                </div>
              )}
            </div>
          </div>

          {syncStatusMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{syncStatusMsg}</span>
            </div>
          )}

          <div className="text-[11px] text-stone-500 flex items-center gap-2 bg-white/80 p-3 rounded-xl border border-stone-200/60">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>
              <strong>Dual-Mode Active:</strong> On your PC, operations save locally instantly. In Vercel cloud, automation reads &amp; writes to this Drive database 24/7 without needing your PC.
            </span>
          </div>
        </div>
      )}

      {/* 24/7 Automation Cron Job Card */}
      {status === 'connected' && mainFolderId && (
        <div className="bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/40 rounded-3xl border border-emerald-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-emerald-100">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
                Your Personal 24/7 Automation Cron URL
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  100% Free 24/7
                </span>
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Put this URL into <strong>Cron-Job.org</strong> (every 1 minute) to post automatically from your Google Drive without keeping your PC on!
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              readOnly
              value={`${typeof window !== 'undefined' ? window.location.origin : 'https://facebook-automation-blond.vercel.app'}/api/cron?folder=${mainFolderId}`}
              className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-stone-800 select-all"
            />
            <button
              type="button"
              onClick={() => {
                const cronUrl = `${window.location.origin}/api/cron?folder=${mainFolderId}`;
                navigator.clipboard.writeText(cronUrl);
                setCopiedCron(true);
                setTimeout(() => setCopiedCron(false), 2500);
              }}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Copy className="w-4 h-4" />
              {copiedCron ? 'Copied to Clipboard!' : 'Copy Cron URL'}
            </button>
          </div>
        </div>
      )}

      {/* Setup Form */}
      <form onSubmit={handleConnect} className="bg-white rounded-3xl border border-cream-200/80 p-6 shadow-xs space-y-6">
        <h2 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
          <Key className="w-4 h-4 text-amber-600" />
          {status === 'connected' ? 'Update Google Drive Connection' : 'Connect Google Drive'}
        </h2>

        {/* JSON Key Input */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-stone-700 block">
            1. Service Account JSON Key
          </label>
          <p className="text-xs text-stone-500">
            Upload the downloaded <code className="text-stone-800 bg-stone-100 px-1 py-0.5 rounded">.json</code> file from Google Cloud Console, or paste its contents below.
          </p>

          <div className="flex items-center gap-3">
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="text-xs text-stone-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-100 file:text-amber-900 hover:file:bg-amber-200 cursor-pointer"
            />
          </div>

          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder='Paste {"type": "service_account", "client_email": "...", "private_key": "..."} here...'
            rows={4}
            className="w-full text-xs font-mono p-3 rounded-2xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 transition resize-none"
          />
        </div>

        {/* Folder Link Input */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-stone-700 block">
            2. Google Drive Main Folder Link or ID
          </label>
          <input
            type="text"
            value={folderLinkInput}
            onChange={(e) => setFolderLinkInput(e.target.value)}
            placeholder="https://drive.google.com/drive/folders/1ABCxyz... or folder ID"
            className="w-full text-sm p-3 rounded-2xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 transition"
          />
          <p className="text-[11px] text-stone-400">
            Important: Ensure you have shared this folder with your bot email as an <strong>Editor</strong>.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-500 text-stone-900 font-extrabold text-sm shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
        >
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Verifying Connection...</span>
            </>
          ) : (
            <span>{status === 'connected' ? 'Update & Test Connection' : 'Connect Google Drive'}</span>
          )}
        </button>
      </form>

      {/* Guide Card */}
      <div className="bg-amber-50/50 border border-amber-200/70 rounded-3xl p-5 text-xs text-amber-950 space-y-2">
        <p className="font-extrabold flex items-center gap-1.5 text-sm text-amber-900">
          <HelpCircle className="w-4 h-4" />
          Quick 3-Step Setup Guide
        </p>
        <ol className="list-decimal list-inside space-y-1 text-stone-700 leading-relaxed">
          <li>
            Open{' '}
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noreferrer"
              className="underline font-bold text-amber-900 inline-flex items-center gap-0.5"
            >
              Google Cloud Credentials <ExternalLink className="w-3 h-3" />
            </a>{' '}
            and enable Google Drive API.
          </li>
          <li>Create a <strong>Service Account</strong> named <code>facebook-bot</code> and download its JSON Key.</li>
          <li>Open your 5 TB Google Drive, right click your folder, click <strong>Share</strong>, and paste the bot email with <strong>Editor</strong> permission.</li>
        </ol>
      </div>
    </div>
  );
}
