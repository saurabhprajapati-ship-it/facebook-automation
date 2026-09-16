import { NextResponse } from 'next/server';
import { getDbFromReq, saveDbAsync, extractDriveFromReq, ScheduledPostItem } from '@/lib/db';
import { saveDriveDatabase } from '@/lib/google-drive';
import { getUserFromReq } from '@/lib/auth-db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const user = await getUserFromReq(req);
    const activeUserId = user ? user.id : 'usr_admin_saurabh';

    const driveCreds = extractDriveFromReq(req);
    const body = await req.json();
    const { slots, driveFolderId, replaceExisting = false } = body;

    if (!Array.isArray(slots) || !slots.length) {
      return NextResponse.json(
        { error: 'No schedule slots provided to save' },
        { status: 400 }
      );
    }

    const db = await getDbFromReq(req);
    let currentQueue = db.scheduledQueue || [];

    if (replaceExisting) {
      // Keep only already posted/live records, replace future scheduled ones
      currentQueue = currentQueue.filter((item) => item.status === 'posted');
    }

    // Merge new slots into queue
    const taggedSlots = slots.map((s: any) => ({ ...s, userId: activeUserId }));
    const updatedQueue: ScheduledPostItem[] = [...currentQueue, ...taggedSlots];

    const targetFolder = driveFolderId || driveCreds.folderId || db.driveSettings?.mainFolderId;
    const credsToUse = {
      credentialsJson: driveCreds.credentialsJson || db.driveSettings?.serviceAccountJson,
      folderId: targetFolder,
    };

    // Save and await cloud sync
    await saveDbAsync({
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
    }, credsToUse);

    // Also sync to Google Drive scheduler_db.json
    let driveSynced = false;
    if (credsToUse.credentialsJson && credsToUse.folderId) {
      try {
        await saveDriveDatabase(credsToUse.credentialsJson, credsToUse.folderId, {
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

