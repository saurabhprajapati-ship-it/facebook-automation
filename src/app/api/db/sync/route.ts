import { NextResponse } from 'next/server';
import { getDb, syncDbFromDrive, syncDbToDrive, getActiveDriveCredentials } from '@/lib/db';

export async function GET() {
  try {
    const { credentialsJson, folderId } = getActiveDriveCredentials();
    const hasCredentials = Boolean(credentialsJson);

    if (!hasCredentials) {
      const db = getDb();
      return NextResponse.json({
        ok: true,
        cloudConnected: false,
        message: 'Google Drive credentials not found. Using local database.',
        stats: {
          accounts: (db.accounts || []).length,
          scheduledQueue: (db.scheduledQueue || []).length,
          autoDmRules: (db.autoDmRules || []).length,
          posts: (db.posts || []).length,
        },
      });
    }

    // Pull latest database from Google Drive
    const syncedDb = await syncDbFromDrive();

    return NextResponse.json({
      ok: true,
      cloudConnected: true,
      message: 'Successfully pulled latest state from Google Drive (postnova_db.json).',
      folderId: folderId || 'Root / Service Account default',
      stats: {
        accounts: (syncedDb.accounts || []).length,
        scheduledQueue: (syncedDb.scheduledQueue || []).length,
        autoDmRules: (syncedDb.autoDmRules || []).length,
        posts: (syncedDb.posts || []).length,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || 'Sync failed' },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const { credentialsJson, folderId } = getActiveDriveCredentials();
    if (!credentialsJson) {
      return NextResponse.json(
        { ok: false, error: 'Cannot push: Google Drive credentials not configured' },
        { status: 400 }
      );
    }

    const pushRes = await syncDbToDrive();
    if (!pushRes.ok) {
      return NextResponse.json(
        { ok: false, error: pushRes.error || 'Push to Google Drive failed' },
        { status: 400 }
      );
    }

    const db = getDb();
    return NextResponse.json({
      ok: true,
      message: 'Successfully pushed local database to Google Drive (postnova_db.json).',
      folderId: folderId || 'Root / Service Account default',
      syncedAt: new Date().toISOString(),
      stats: {
        accounts: (db.accounts || []).length,
        scheduledQueue: (db.scheduledQueue || []).length,
        autoDmRules: (db.autoDmRules || []).length,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || 'Push sync failed' },
      { status: 500 }
    );
  }
}
