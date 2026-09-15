import { NextResponse } from 'next/server';
import { getDb, saveDb, ScheduledPostItem } from '@/lib/db';
import { saveDriveDatabase } from '@/lib/google-drive';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { slots, driveFolderId, replaceExisting = false } = body;

    if (!Array.isArray(slots) || !slots.length) {
      return NextResponse.json(
        { error: 'No schedule slots provided to save' },
        { status: 400 }
      );
    }

    const db = getDb();
    let currentQueue = db.scheduledQueue || [];

    if (replaceExisting) {
      // Keep only already posted/live records, replace future scheduled ones
      currentQueue = currentQueue.filter((item) => item.status === 'posted');
    }

    // Merge new slots into queue
    const updatedQueue: ScheduledPostItem[] = [...currentQueue, ...slots];

    // Save to local DB
    saveDb({
      scheduledQueue: updatedQueue,
      notifications: [
        {
          id: 'notif_' + Date.now(),
          type: 'info',
          title: 'Bulk Schedule Created',
          message: `Successfully scheduled ${slots.length} posts starting from ${new Date(slots[0].scheduledAt).toLocaleDateString()}.`,
          createdAt: new Date().toISOString(),
        },
        ...(db.notifications || []),
      ],
    });

    // Also sync to Google Drive scheduler_db.json
    let driveSynced = false;
    const settings = db.driveSettings;
    const targetFolder = driveFolderId || settings?.mainFolderId;

    if (settings?.serviceAccountJson && targetFolder) {
      try {
        await saveDriveDatabase(settings.serviceAccountJson, targetFolder, {
          updatedAt: new Date().toISOString(),
          totalSlots: updatedQueue.length,
          queue: updatedQueue,
        });
        driveSynced = true;
      } catch (driveErr) {
        console.warn('Failed to write scheduler_db.json to Drive:', driveErr);
      }
    }

    return NextResponse.json({
      ok: true,
      savedCount: slots.length,
      totalQueueCount: updatedQueue.length,
      driveSynced,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to save schedule' },
      { status: 500 }
    );
  }
}
