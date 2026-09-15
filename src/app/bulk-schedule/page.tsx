'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  HardDrive,
  Sparkles,
  FileText,
  Clock,
  Play,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Folder,
  Layers,
  ChevronRight,
  Send,
  Sliders,
  ExternalLink,
  Upload
} from 'lucide-react';
import Link from 'next/link';

interface Account {
  id: string;
  name: string;
  pageId: string;
  platform?: 'facebook' | 'instagram' | string;
  username?: string;
  active: boolean;
}

interface DriveSubfolder {
  id: string;
  name: string;
}

interface ScheduledSlot {
  id: string;
  order: number;
  fileName: string;
  fileId?: string;
  fileType: 'image' | 'video';
  thumbnailUrl?: string;
  caption: string;
  captionSource: 'ai' | 'file' | 'manual';
  scheduledAt: string;
  pairWithNext?: boolean;
  status: 'scheduled' | 'posting' | 'posted' | 'failed';
  targetAccountId: string;
  targetAccountName?: string;
  fbPostId?: string;
  error?: string;
}

export default function BulkSchedulePage() {
  const [activeTab, setActiveTab] = useState<'wizard' | 'queue'>('wizard');

  // Accounts & Drive Folders
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveSubfolders, setDriveSubfolders] = useState<DriveSubfolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [customFolderInput, setCustomFolderInput] = useState('');

  // Captions Config
  const [captionMode, setCaptionMode] = useState<'drive_file' | 'ai' | 'custom_text'>('drive_file');
  const [customCaptionsText, setCustomCaptionsText] = useState('');
  const [aiTopic, setAiTopic] = useState('daily viral facts, science and interesting stories');

  // Calendar Config
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [startTime, setStartTime] = useState('09:00');
  const [postsPerDay, setPostsPerDay] = useState(24);
  const [intervalMinutes, setIntervalMinutes] = useState(60); // 1 hour
  const [pairWithNext, setPairWithNext] = useState(false);
  const [addJitter, setAddJitter] = useState(true);

  // Sync / Preview State
  const [syncing, setSyncing] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [previewSlots, setPreviewSlots] = useState<ScheduledSlot[]>([]);
  const [syncSummary, setSyncSummary] = useState<{
    totalFiles: number;
    totalSlots: number;
    totalDays: number;
    firstScheduled?: string;
    lastScheduled?: string;
  } | null>(null);

  // Queue State
  const [queueItems, setQueueItems] = useState<ScheduledSlot[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [postingItemId, setPostingItemId] = useState<string | null>(null);

  // Messages
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Initial Load
  useEffect(() => {
    // Load accounts
    fetch('/api/accounts')
      .then((res) => res.json())
      .then((data) => {
        const accs = data.accounts || [];
        setAccounts(accs);
        if (accs.length) setSelectedAccountId(accs[0].id);
      })
      .catch(() => {});

    // Load Drive status
    fetch('/api/drive/connect')
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'connected') {
          setDriveConnected(true);
          const mappings = data.folderMappings || [];
          const allFolders: DriveSubfolder[] = [];
          if (data.mainFolderId) {
            allFolders.push({
              id: data.mainFolderId,
              name: data.mainFolderName ? `${data.mainFolderName} (Main Folder)` : 'Facebook_Automation (Main Folder)',
            });
          }
          mappings.forEach((m: any) => {
            if (m.folderId !== data.mainFolderId) {
              allFolders.push({ id: m.folderId, name: m.folderName });
            }
          });
          setDriveSubfolders(allFolders);
          if (allFolders.length) {
            setSelectedFolderId(allFolders[0].id);
          } else if (data.mainFolderId) {
            setSelectedFolderId(data.mainFolderId);
          }
        }
      })
      .catch(() => {});

    loadQueue();
  }, []);

  const loadQueue = async () => {
    setLoadingQueue(true);
    try {
      const res = await fetch('/api/bulk/queue');
      const data = await res.json();
      setQueueItems(data.items || []);
    } catch (err) {
      console.warn('Failed to load queue:', err);
    } finally {
      setLoadingQueue(false);
    }
  };

  const handleSyncPreview = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setSyncing(true);

    try {
      const folderToUse = selectedFolderId === 'custom' ? customFolderInput : (selectedFolderId || customFolderInput);
      if (!folderToUse) {
        throw new Error('Please select or enter a Google Drive folder');
      }
      if (!selectedAccountId) {
        throw new Error('Please connect and select a Facebook Page');
      }

      const res = await fetch('/api/bulk/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderInput: folderToUse,
          targetAccountId: selectedAccountId,
          captionMode,
          customCaptionsText,
          calendarConfig: {
            startDate,
            startTime,
            postsPerDay: Number(postsPerDay),
            intervalMinutes: Number(intervalMinutes),
            pairWithNext,
            addJitterMinutes: addJitter ? 4 : 0,
            topic: aiTopic,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to sync with Google Drive');
      }

      setPreviewSlots(data.slots || []);
      setSyncSummary({
        totalFiles: data.totalFiles,
        totalSlots: data.totalSlots,
        totalDays: data.totalDays,
        firstScheduled: data.firstScheduled,
        lastScheduled: data.lastScheduled,
      });
      setSuccessMsg(`Synced ${data.totalFiles} files from Google Drive! Calendar slots ready for review.`);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleCommitSchedule = async () => {
    if (!previewSlots.length) return;
    setSavingSchedule(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const folderToUse = selectedFolderId === 'custom' ? customFolderInput : (selectedFolderId || customFolderInput);
      const res = await fetch('/api/bulk/save-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slots: previewSlots,
          driveFolderId: folderToUse,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save schedule');
      }

      setSuccessMsg(`Success! Scheduled ${data.savedCount} posts across the calendar. Database synced to Google Drive!`);
      setPreviewSlots([]);
      setSyncSummary(null);
      loadQueue();
      setActiveTab('queue');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSavingSchedule(false);
    }
  };

  const handlePostNow = async (slotId: string) => {
    setPostingItemId(slotId);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/bulk/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: slotId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to publish post');
      }

      if (data.platform === 'both') {
        setSuccessMsg(`Post is live on both Facebook & Instagram! 🌐✨ Post ID: ${data.postId}`);
      } else if (data.platform === 'instagram' || data.item?.targetAccountId?.startsWith('acc_ig')) {
        setSuccessMsg(`Post is live on Instagram! 📸✨ Post ID: ${data.postId}`);
      } else {
        setSuccessMsg(`Post is live on Facebook! 🟦🚀 Post ID: ${data.postId}`);
      }
      loadQueue();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setPostingItemId(null);
    }
  };

  const handleDeleteQueueItem = async (slotId: string) => {
    if (!confirm('Are you sure you want to delete this scheduled post?')) return;
    try {
      await fetch(`/api/bulk/queue?id=${encodeURIComponent(slotId)}`, { method: 'DELETE' });
      loadQueue();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleClearQueue = async () => {
    if (!confirm('Delete all pending scheduled posts in queue? (Already live posts will be kept)')) return;
    try {
      await fetch('/api/bulk/queue?clearAll=true', { method: 'DELETE' });
      loadQueue();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const updatePreviewCaption = (index: number, newCaption: string) => {
    setPreviewSlots((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], caption: newCaption, captionSource: 'manual' };
      return copy;
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-stone-900 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-400 flex items-center justify-center text-stone-900 font-bold shadow-xs">
              <CalendarIcon className="w-5 h-5" />
            </div>
            Bulk Scheduler & Smart Calendar
          </h1>
          <p className="text-sm text-stone-500 mt-1 font-medium">
            Schedule 30 to 60 days of AI images/videos (24 posts/day) from Google Drive (5 TB) with auto serial calendar and AI captions.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-cream-200/70 rounded-2xl border border-cream-300/60 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('wizard')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition ${
              activeTab === 'wizard'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Create Schedule
          </button>
          <button
            onClick={() => {
              setActiveTab('queue');
              loadQueue();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 ${
              activeTab === 'queue'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <span>Live Queue</span>
            {queueItems.filter((q) => q.status === 'scheduled').length > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 text-[10px] font-black flex items-center justify-center">
                {queueItems.filter((q) => q.status === 'scheduled').length}
              </span>
            )}
          </button>
        </div>
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

      {/* Drive Status Warning if disconnected */}
      {!driveConnected && (
        <div className="p-4 rounded-3xl bg-amber-50 border border-amber-300/80 text-amber-950 text-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <HardDrive className="w-5 h-5 text-amber-700 shrink-0" />
            <span>
              Google Drive is not connected yet. Connect your 5 TB Google Drive to enable instant 1-click sync without browser lag.
            </span>
          </div>
          <Link
            href="/drive"
            className="shrink-0 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 font-extrabold text-stone-950 transition"
          >
            Connect Drive
          </Link>
        </div>
      )}

      {activeTab === 'wizard' ? (
        <div className="space-y-6">
          {/* Step 1 & 2: Grid Container */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Box 1: Source & Facebook Page */}
            <div className="bg-white rounded-3xl border border-cream-200/80 p-5 shadow-xs space-y-4">
              <h2 className="text-sm font-extrabold text-stone-900 flex items-center gap-2">
                <Folder className="w-4 h-4 text-blue-600" />
                1. Target Page & Drive Folder
              </h2>

              {/* Account Dropdown */}
              <div>
                <label className="text-xs font-bold text-stone-600 block mb-1">Target Account / Platform</label>
                {accounts.length ? (
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white text-stone-900"
                  >
                    {accounts.filter((a) => a.platform === 'instagram').map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        📸 Instagram: {acc.name} (@{acc.username || acc.name})
                      </option>
                    ))}
                    {accounts.filter((a) => a.platform === 'facebook').map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        🟦 Facebook: {acc.name}
                      </option>
                    ))}
                    <option value="both">
                      🌐 Both Facebook & Instagram (Ek sath dono par)
                    </option>
                  </select>
                ) : (
                  <div className="text-xs text-stone-400 p-2 bg-stone-50 rounded-xl">
                    No accounts found.{' '}
                    <Link href="/accounts/facebook" className="text-amber-700 underline font-bold">
                      Connect in Accounts
                    </Link>
                  </div>
                )}
              </div>

              {/* Drive Folder Selector */}
              <div>
                <label className="text-xs font-bold text-stone-600 block mb-1">Google Drive Folder</label>
                {driveSubfolders.length > 0 ? (
                  <div className="space-y-2">
                    <select
                      value={selectedFolderId}
                      onChange={(e) => setSelectedFolderId(e.target.value)}
                      className="w-full text-xs font-semibold p-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white"
                    >
                      {driveSubfolders.map((f) => (
                        <option key={f.id} value={f.id}>
                          📂 {f.name}
                        </option>
                      ))}
                      <option value="custom">✏️ Enter Custom Folder Link/ID</option>
                    </select>

                    {selectedFolderId === 'custom' && (
                      <input
                        type="text"
                        value={customFolderInput}
                        onChange={(e) => setCustomFolderInput(e.target.value)}
                        placeholder="Paste Google Drive folder URL or ID..."
                        className="w-full text-xs p-2.5 rounded-xl border border-stone-200"
                      />
                    )}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={customFolderInput}
                    onChange={(e) => setCustomFolderInput(e.target.value)}
                    placeholder="https://drive.google.com/drive/folders/1ABCxyz... or folder ID"
                    className="w-full text-xs p-2.5 rounded-xl border border-stone-200"
                  />
                )}
                <p className="text-[11px] text-stone-400 mt-1">
                  Supports folders containing 100 to 1500+ images/videos (e.g. 1.jpg, 2.jpg...).
                </p>
              </div>
            </div>

            {/* Box 2: Captions Configuration */}
            <div className="bg-white rounded-3xl border border-cream-200/80 p-5 shadow-xs space-y-4">
              <h2 className="text-sm font-extrabold text-stone-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-600" />
                2. Captions & Sync Rule
              </h2>

              <div className="space-y-2 text-xs">
                {/* Mode 1: Drive File */}
                <label className="flex items-start gap-2.5 p-2.5 rounded-2xl border border-stone-200/80 hover:bg-stone-50 cursor-pointer">
                  <input
                    type="radio"
                    name="captionMode"
                    value="drive_file"
                    checked={captionMode === 'drive_file'}
                    onChange={() => setCaptionMode('drive_file')}
                    className="mt-0.5 text-amber-500"
                  />
                  <div>
                    <p className="font-extrabold text-stone-800">Auto-read from Google Drive Folder</p>
                    <p className="text-stone-500 text-[11px]">
                      Uses <code>captions.txt</code> (e.g. <code>1. Caption</code>) or <code>captions.csv</code> inside the folder.
                    </p>
                  </div>
                </label>

                {/* Mode 2: AI Caption */}
                <label className="flex items-start gap-2.5 p-2.5 rounded-2xl border border-stone-200/80 hover:bg-stone-50 cursor-pointer">
                  <input
                    type="radio"
                    name="captionMode"
                    value="ai"
                    checked={captionMode === 'ai'}
                    onChange={() => setCaptionMode('ai')}
                    className="mt-0.5 text-amber-500"
                  />
                  <div className="flex-1">
                    <p className="font-extrabold text-stone-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      AI Caption Likhega (Gemini AI)
                    </p>
                    <p className="text-stone-500 text-[11px]">
                      Gemini Vision analyzes each image / filename and writes viral hooks + trending hashtags.
                    </p>
                  </div>
                </label>

                {/* Mode 3: Custom Text */}
                <label className="flex items-start gap-2.5 p-2.5 rounded-2xl border border-stone-200/80 hover:bg-stone-50 cursor-pointer">
                  <input
                    type="radio"
                    name="captionMode"
                    value="custom_text"
                    checked={captionMode === 'custom_text'}
                    onChange={() => setCaptionMode('custom_text')}
                    className="mt-0.5 text-amber-500"
                  />
                  <div>
                    <p className="font-extrabold text-stone-800">Paste / Upload Custom Captions</p>
                    <p className="text-stone-500 text-[11px]">Paste numbered captions or upload file below.</p>
                  </div>
                </label>
              </div>

              {captionMode === 'ai' && (
                <div className="pt-2">
                  <label className="text-xs font-bold text-stone-600 block mb-1">Page Niche / Topic for AI</label>
                  <input
                    type="text"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    placeholder="e.g. Daily space facts, Cricket highlights, Desi cooking recipes..."
                    className="w-full text-xs p-2.5 rounded-xl border border-stone-200"
                  />
                </div>
              )}

              {captionMode === 'custom_text' && (
                <div className="pt-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-stone-600">Enter captions or upload file:</span>
                    <label className="text-[11px] font-bold text-amber-700 hover:text-amber-800 cursor-pointer flex items-center gap-1 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-lg border border-amber-200 transition">
                      <Upload className="w-3 h-3" />
                      <span>Upload CAPTION.txt / CSV</span>
                      <input
                        type="file"
                        accept=".txt,.csv"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              const content = ev.target?.result as string;
                              if (content) setCustomCaptionsText(content);
                            };
                            reader.readAsText(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                  <textarea
                    value={customCaptionsText}
                    onChange={(e) => setCustomCaptionsText(e.target.value)}
                    placeholder={'1.\n⚠️ "Difficult roads often lead to beautiful destinations." ✨\nजिंदगी में जब रास्ते सबसे मुश्किल लगने लगें...\n#Motivation #Hardwork\n--------------------\n2.\n🔥 "Discipline is choosing between what you want NOW..."'}
                    rows={4}
                    className="w-full text-xs p-2.5 rounded-xl border border-stone-200 font-mono resize-y"
                  />
                  {customCaptionsText && (
                    <p className="text-[11px] text-emerald-600 font-bold">
                      ✓ Captions loaded ({customCaptionsText.split('\n').length} lines). Click &quot;Sync &amp; Preview&quot; above to apply.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Step 3: Calendar & Timing Configuration */}
          <div className="bg-white rounded-3xl border border-cream-200/80 p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-extrabold text-stone-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              3. Serial Calendar & Frequency Rules
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {/* Start Date */}
              <div>
                <label className="font-bold text-stone-600 block mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-200 font-semibold"
                />
              </div>

              {/* Start Time */}
              <div>
                <label className="font-bold text-stone-600 block mb-1">Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-200 font-semibold"
                />
              </div>

              {/* Posts Per Day */}
              <div>
                <label className="font-bold text-stone-600 block mb-1">Posts Per Day</label>
                <input
                  type="number"
                  min={1}
                  max={48}
                  value={postsPerDay}
                  onChange={(e) => setPostsPerDay(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-stone-200 font-semibold"
                />
                <span className="text-[10px] text-stone-400">Default: 24 posts daily</span>
              </div>

              {/* Interval */}
              <div>
                <label className="font-bold text-stone-600 block mb-1">Interval Between Posts</label>
                <select
                  value={intervalMinutes}
                  onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-stone-200 font-semibold"
                >
                  <option value={60}>Every 1 Hour (24/day)</option>
                  <option value={30}>Every 30 Minutes (48/day)</option>
                  <option value={120}>Every 2 Hours (12/day)</option>
                  <option value={180}>Every 3 Hours (8/day)</option>
                  <option value={360}>Every 6 Hours (4/day)</option>
                </select>
              </div>
            </div>

            {/* Additional Options */}
            <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center gap-6 text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={pairWithNext}
                  onChange={(e) => setPairWithNext(e.target.checked)}
                  className="rounded text-amber-500"
                />
                <span className="font-bold text-stone-700">Post 2 Photos Together (Multi-Photo Pair)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={addJitter}
                  onChange={(e) => setAddJitter(e.target.checked)}
                  className="rounded text-amber-500"
                />
                <span className="font-bold text-stone-700">Add +/- 5 Min Natural Jitter (Anti-Spam)</span>
              </label>
            </div>

            {/* Action Sync Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSyncPreview}
                disabled={syncing}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-500 text-stone-950 font-black text-sm shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {syncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Syncing from Google Drive...</span>
                  </>
                ) : (
                  <>
                    <CalendarIcon className="w-4 h-4" />
                    <span>Sync & Preview 30-60 Days Calendar</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Preview Section */}
          {syncSummary && previewSlots.length > 0 && (
            <div className="bg-white rounded-3xl border border-cream-200/80 p-6 shadow-xs space-y-6">
              {/* Summary Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-amber-50/70 border border-amber-200/70">
                <div className="flex items-center gap-6 text-xs">
                  <div>
                    <span className="text-stone-500 font-medium block">Total Files:</span>
                    <span className="text-base font-black text-stone-900">{syncSummary.totalFiles}</span>
                  </div>
                  <div>
                    <span className="text-stone-500 font-medium block">Scheduled Posts:</span>
                    <span className="text-base font-black text-stone-900">{syncSummary.totalSlots}</span>
                  </div>
                  <div>
                    <span className="text-stone-500 font-medium block">Duration:</span>
                    <span className="text-base font-black text-stone-900">{syncSummary.totalDays} Days</span>
                  </div>
                  {syncSummary.firstScheduled && (
                    <div className="hidden sm:block">
                      <span className="text-stone-500 font-medium block">Starts:</span>
                      <span className="text-xs font-bold text-stone-800">
                        {new Date(syncSummary.firstScheduled).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleCommitSchedule}
                  disabled={savingSchedule}
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs shadow-sm transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {savingSchedule ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving to Drive & Queue...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm & Schedule All {previewSlots.length} Posts</span>
                    </>
                  )}
                </button>
              </div>

              {/* Slots Table Preview */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-stone-200 text-stone-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Media File</th>
                      <th className="py-2.5 px-3">Platform</th>
                      <th className="py-2.5 px-3">Scheduled Date & Time</th>
                      <th className="py-2.5 px-3">Caption (Editable)</th>
                      <th className="py-2.5 px-3">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {previewSlots.slice(0, 50).map((slot, idx) => (
                      <tr key={slot.id} className="hover:bg-cream-50/50 transition">
                        <td className="py-2 px-3 font-bold text-stone-400">{slot.order}</td>
                        <td className="py-2 px-3 font-semibold text-stone-800 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                          <span className="truncate max-w-[140px]">{slot.fileName}</span>
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          {slot.targetAccountId === 'both' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              🌐 Both (FB + IG)
                            </span>
                          ) : slot.targetAccountId?.startsWith('acc_ig') || slot.targetAccountName?.toLowerCase().includes('instagram') || slot.targetAccountName?.toLowerCase().includes('last call') ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200">
                              📸 Instagram
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                              🟦 Facebook
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-stone-700 whitespace-nowrap">
                          {new Date(slot.scheduledAt).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-2 px-3">
                          <textarea
                            value={slot.caption}
                            onChange={(e) => updatePreviewCaption(idx, e.target.value)}
                            placeholder="Click to enter caption..."
                            rows={2}
                            className="w-full p-2 rounded-lg border border-stone-200 text-xs bg-stone-50/60 focus:bg-white resize-y font-sans leading-relaxed"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              slot.captionSource === 'ai'
                                ? 'bg-amber-100 text-amber-800'
                                : slot.captionSource === 'file'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-stone-100 text-stone-700'
                            }`}
                          >
                            {slot.captionSource}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewSlots.length > 50 && (
                  <p className="text-center text-xs text-stone-400 py-3">
                    Showing first 50 slots of {previewSlots.length} total. All {previewSlots.length} slots will be committed.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Tab 2: Live Scheduled Queue */
        <div className="bg-white rounded-3xl border border-cream-200/80 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-stone-100">
            <div>
              <h2 className="text-base font-extrabold text-stone-900">Live Scheduled Queue</h2>
              <p className="text-xs text-stone-500">
                {queueItems.length} total items ({queueItems.filter((q) => q.status === 'scheduled').length} waiting to be posted).
              </p>
            </div>

            {queueItems.length > 0 && (
              <button
                type="button"
                onClick={handleClearQueue}
                className="px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Scheduled Queue</span>
              </button>
            )}
          </div>

          {loadingQueue ? (
            <div className="py-12 text-center text-xs text-stone-400 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Loading queue...</span>
            </div>
          ) : queueItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-stone-400 space-y-2">
              <CalendarIcon className="w-8 h-8 text-stone-300 mx-auto" />
              <p className="font-bold text-stone-600">No posts in scheduled queue</p>
              <p>Switch to "Create Schedule" above to sync and schedule your 30-60 days content!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">File</th>
                    <th className="py-2.5 px-3">Platform</th>
                    <th className="py-2.5 px-3">Scheduled At</th>
                    <th className="py-2.5 px-3">Caption</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {queueItems.map((item) => (
                    <tr key={item.id} className="hover:bg-cream-50/50 transition">
                      <td className="py-2 px-3 font-bold text-stone-400">{item.order}</td>
                      <td className="py-2 px-3 font-semibold text-stone-800 truncate max-w-[150px]">
                        {item.fileName}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        {item.targetAccountId === 'both' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            🌐 Both (FB + IG)
                          </span>
                        ) : item.targetAccountId?.startsWith('acc_ig') || item.targetAccountName?.toLowerCase().includes('instagram') || item.targetAccountName?.toLowerCase().includes('last call') ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-pink-100 to-purple-100 text-purple-900 border border-purple-200">
                            📸 Instagram
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                            🟦 Facebook
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px] text-stone-600 whitespace-nowrap">
                        {new Date(item.scheduledAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-2 px-3 truncate max-w-[240px] text-stone-600">
                        {item.caption || <span className="text-stone-300 italic">No caption</span>}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            item.status === 'posted'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : item.status === 'posting'
                              ? 'bg-blue-100 text-blue-800 animate-pulse'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right space-x-2 whitespace-nowrap">
                        {item.status === 'scheduled' && (
                          <button
                            type="button"
                            onClick={() => handlePostNow(item.id)}
                            disabled={postingItemId === item.id}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold transition disabled:opacity-50 inline-flex items-center gap-1 cursor-pointer"
                          >
                            {postingItemId === item.id ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <Send className="w-3 h-3" />
                            )}
                            <span>Post Now</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteQueueItem(item.id)}
                          className="p-1 rounded-lg hover:bg-red-50 text-stone-400 hover:text-red-600 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
