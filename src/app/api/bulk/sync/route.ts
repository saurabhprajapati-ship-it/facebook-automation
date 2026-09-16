import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { listDriveMediaFiles, fetchDriveCaptionsFile, extractFolderId } from '@/lib/google-drive';
import { parseCaptions, matchCaptionsToFiles } from '@/lib/caption-matcher';
import { generateCalendarSlots, CalendarConfig } from '@/lib/bulk-scheduler';
import { generateCaptionForMedia } from '@/lib/gemini';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      folderInput,
      targetAccountId,
      captionMode = 'drive_file', // 'drive_file' | 'ai' | 'custom_text'
      customCaptionsText = '',
      calendarConfig = {},
    } = body;

    const db = getDb();
    const settings = db.driveSettings;

    if (!settings?.serviceAccountJson) {
      return NextResponse.json(
        { error: 'Google Drive is not connected. Please connect Google Drive first.' },
        { status: 400 }
      );
    }

    const folderId = extractFolderId(folderInput || settings.mainFolderId || '');
    if (!folderId) {
      return NextResponse.json(
        { error: 'Google Drive folder ID or URL is required' },
        { status: 400 }
      );
    }

    // Find account name
    const account = db.accounts.find((a) => a.id === targetAccountId || a.pageId === targetAccountId);
    const accountName = targetAccountId === 'both'
      ? 'Both Facebook & Instagram'
      : account ? (account.username ? `@${account.username}` : account.name) : 'Selected Page';

    // 1. Fetch files from Drive
    const files = await listDriveMediaFiles(settings.serviceAccountJson, folderId);
    if (!files.length) {
      return NextResponse.json(
        { error: 'No image or video files found in this Google Drive folder. Please ensure files are uploaded.' },
        { status: 404 }
      );
    }

    // 2. Resolve Captions
    let captionsMap: Record<string, string> = {};

    if (captionMode === 'custom_text' && customCaptionsText.trim()) {
      const parsed = parseCaptions(customCaptionsText);
      captionsMap = matchCaptionsToFiles(files, parsed);
    } else if (captionMode === 'drive_file') {
      const driveCaptionFile = await fetchDriveCaptionsFile(settings.serviceAccountJson, folderId);
      if (driveCaptionFile && driveCaptionFile.content.trim()) {
        const parsed = parseCaptions(driveCaptionFile.content, driveCaptionFile.fileName);
        captionsMap = matchCaptionsToFiles(files, parsed);
      }
    }

    // 3. Generate Calendar Slots
    const todayStr = new Date().toISOString().split('T')[0];
    const fullConfig: CalendarConfig = {
      startDate: calendarConfig.startDate || todayStr,
      startTime: calendarConfig.startTime || '09:00',
      startIso: calendarConfig.startIso,
      clientTimezoneOffset: calendarConfig.clientTimezoneOffset !== undefined ? Number(calendarConfig.clientTimezoneOffset) : undefined,
      postsPerDay: Number(calendarConfig.postsPerDay) || 24,
      intervalMinutes: Number(calendarConfig.intervalMinutes) || 60,
      pairWithNext: Boolean(calendarConfig.pairWithNext),
      addJitterMinutes: calendarConfig.addJitterMinutes !== undefined ? Number(calendarConfig.addJitterMinutes) : 4,
      targetAccountId: account?.id || targetAccountId || '',
      targetAccountName: accountName,
      driveFolderId: folderId,
    };

    const slots = generateCalendarSlots(files, captionsMap, fullConfig);

    // If AI captioning is requested and captions are missing, generate AI captions for preview items (up to 15 slots)
    if (captionMode === 'ai') {
      const targetSlots = slots.slice(0, 15);
      const batchSize = 3;
      for (let i = 0; i < targetSlots.length; i += batchSize) {
        const batch = targetSlots.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (slot) => {
            if (!slot.caption) {
              try {
                slot.caption = await generateCaptionForMedia({
                  fileName: slot.fileName,
                  topic: calendarConfig.topic || 'daily viral stories and interesting facts',
                });
                slot.captionSource = 'ai';
              } catch (err) {
                console.warn(`Failed to generate AI caption for ${slot.fileName}:`, err);
                slot.caption = slot.fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
              }
            }
          })
        );
      }
    }

    const firstDate = slots[0]?.scheduledAt;
    const lastDate = slots[slots.length - 1]?.scheduledAt;
    const totalDays = firstDate && lastDate
      ? Math.max(1, Math.ceil((new Date(lastDate).getTime() - new Date(firstDate).getTime()) / (1000 * 60 * 60 * 24)))
      : 1;

    return NextResponse.json({
      ok: true,
      totalFiles: files.length,
      totalSlots: slots.length,
      totalDays,
      firstScheduled: firstDate,
      lastScheduled: lastDate,
      folderId,
      accountName,
      slots,
    });
  } catch (err: any) {
    console.error('Bulk sync error:', err);
    return NextResponse.json(
      { error: err.message || 'Bulk sync failed' },
      { status: 500 }
    );
  }
}
