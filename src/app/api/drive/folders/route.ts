import { NextResponse } from 'next/server';
import { getDbFromReq } from '@/lib/db';
import { listDriveSubfolders, extractFolderId } from '@/lib/google-drive';
import { getUserFromReq } from '@/lib/auth-db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const user = await getUserFromReq(req);
  const db = await getDbFromReq(req);

  const isAdmin =
    user?.role === 'admin' ||
    user?.email === 'saurabhprajapatidev@gmail.com' ||
    user?.id === 'usr_admin_saurabh';

  const userDriveMap = (db as any).userDriveSettings || {};
  let settings = db.driveSettings;
  if (user && !isAdmin) {
    settings = userDriveMap[user.id] || undefined;
  }

  if (!settings?.serviceAccountJson) {
    return NextResponse.json(
      { error: 'Google Drive is not connected yet. Please connect your Google Drive first.', subfolders: [] },
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
