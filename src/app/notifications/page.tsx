'use client';

import React, { useEffect, useState } from 'react';
import { Bell, CheckCircle2, AlertCircle, Info, Trash2, Check } from 'lucide-react';
import { NotificationItem } from '@/lib/db';
import { fetchWithDrive } from '@/lib/client-drive';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [preferences, setPreferences] = useState({
    postWentOut: true,
    postFailed: true,
    newsUpdates: true,
  });
  const [saved, setSaved] = useState(false);

  const loadNotifications = () => {
    fetchWithDrive('/api/notifications')
      .then((r) => r.json())
      .then((data) => {
        if (data.notifications) setNotifications(data.notifications);
        if (data.preferences) setPreferences(data.preferences);
      });
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleClearAll = async () => {
    await fetchWithDrive('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clear' }),
    });
    setNotifications([]);
  };

  const handleSavePreferences = async () => {
    await fetchWithDrive('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferences }),
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-5xl animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center shadow-sm shrink-0">
          <Bell className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight">Notifications</h1>
          <p className="text-stone-500 font-medium text-xs">Your alerts and news from AlphaPost.</p>
        </div>
      </div>

      {saved && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-2xl text-xs font-bold">
          Notification preferences saved.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Inbox */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-cream-200/80 shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-stone-900 text-sm">Inbox</h3>
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-stone-500 hover:text-stone-900 rounded-xl hover:bg-cream-100 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear all</span>
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="py-12 text-center text-stone-400 text-xs">
                No notifications right now.
              </div>
            ) : (
              <div className="divide-y divide-cream-200/60">
                {notifications.map((notif) => (
                  <div key={notif.id} className="py-3.5 flex items-start gap-3.5">
                    {notif.type === 'live' ? (
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    ) : notif.type === 'failed' ? (
                      <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                        <AlertCircle className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                        <Info className="w-4 h-4" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-stone-900">{notif.title}</h4>
                      <p className="text-xs text-stone-600 mt-0.5 leading-relaxed break-words">
                        {notif.message}
                      </p>
                      <span className="text-[10px] text-stone-400 mt-1 block">
                        {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(notif.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Notification Settings */}
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-cream-200/80 shadow-soft space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-stone-400">
              Get alerts on this device
            </h4>
            <p className="text-xs text-stone-600">
              Pop up alerts like WhatsApp, even when the app is closed.
            </p>
            <button
              onClick={() => alert('Device browser notifications enabled')}
              className="w-full py-2.5 bg-brand-yellow hover:bg-brand-yellowHover text-amber-950 font-bold text-xs rounded-xl shadow-xs transition"
            >
              Turn on
            </button>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-cream-200/80 shadow-soft space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-stone-400">
              What should we tell you?
            </h4>

            <div className="space-y-3 text-xs text-stone-700">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="font-bold block text-stone-900">My post went out</span>
                  <span className="text-[11px] text-stone-500">Every time a post is sent to your accounts.</span>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.postWentOut}
                  onChange={(e) => setPreferences({ ...preferences, postWentOut: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-brand-yellow"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="font-bold block text-stone-900">My post failed</span>
                  <span className="text-[11px] text-stone-500">When a post does not go to your accounts.</span>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.postFailed}
                  onChange={(e) => setPreferences({ ...preferences, postFailed: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-brand-yellow"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="font-bold block text-stone-900">News and updates</span>
                  <span className="text-[11px] text-stone-500">New features and messages from AlphaPost.</span>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.newsUpdates}
                  onChange={(e) => setPreferences({ ...preferences, newsUpdates: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-brand-yellow"
                />
              </label>
            </div>

            <button
              onClick={handleSavePreferences}
              className="w-full py-2.5 bg-brand-yellow hover:bg-brand-yellowHover text-amber-950 font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1"
            >
              <Check className="w-4 h-4" />
              <span>Save</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
