import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { listDriveSubfolders, extractFolderId } from '@/lib/google-drive';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const db = getDb();
  const settings = db.driveSettings;

  if (!settings?.serviceAccountJson) {
    return NextResponse.json(
      { error: 'Google Drive is not connected yet. Please connect Service Account first.' },
      { status: 400 }
    );
  }

  const folderId = extractFolderId(searchParams.get('folderId') || settings.mainFolderId || '');
  if (!folderId) {
    return NextResponse.json(
      { error: 'No folder ID provided or configured' },
      { status: 400 }
    );
  }

  try {
    const subfolders = await listDriveSubfolders(settings.serviceAccountJson, folderId);
    return NextResponse.json({
      mainFolderId: folderId,
      subfolders,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to list folders from Google Drive' },
      { status: 500 }
    );
  }
}
