import { NextResponse } from 'next/server';
import { getDbFromReq, saveDbAsync, syncDbFromDrive, extractDriveFromReq } from '@/lib/db';
import { testDriveConnection, listDriveSubfolders, extractFolderId } from '@/lib/google-drive';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const db = await getDbFromReq(req);
  const settings = db.driveSettings || { status: 'disconnected' };
  return NextResponse.json({
    status: settings.status || 'disconnected',
    clientEmail: settings.clientEmail || '',
    projectId: settings.projectId || '',
    mainFolderId: settings.mainFolderId || '',
    mainFolderName: settings.mainFolderName || '',
    folderMappings: settings.folderMappings || [],
    hasKey: Boolean(settings.serviceAccountJson),
    lastError: settings.lastError,
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { serviceAccountJson, mainFolderInput } = body;

    const driveCreds = extractDriveFromReq(req);
    const db = await getDbFromReq(req);
    const currentJson = serviceAccountJson || driveCreds.credentialsJson || db.driveSettings?.serviceAccountJson;

    if (!currentJson) {
      return NextResponse.json(
        { error: 'Service Account JSON key is required' },
        { status: 400 }
      );
    }

    const testRes = await testDriveConnection(currentJson, mainFolderInput);
    if (!testRes.ok) {
      await saveDbAsync({
        driveSettings: {
          ...(db.driveSettings || {}),
          status: 'error',
          lastError: testRes.error,
        },
      });
      return NextResponse.json(
        { error: testRes.error || 'Connection failed' },
        { status: 400 }
      );
    }

    const folderId = testRes.folderId || (mainFolderInput ? extractFolderId(mainFolderInput) : '');
    let subfolders: any[] = [];
    if (folderId) {
      try {
        subfolders = await listDriveSubfolders(currentJson, folderId);
      } catch (subErr) {
        console.warn('Could not list subfolders:', subErr);
      }
    }

    const updatedSettings = {
      serviceAccountJson: currentJson,
      clientEmail: testRes.clientEmail,
      projectId: testRes.projectId,
      mainFolderId: folderId,
      mainFolderName: testRes.folderName || 'Facebook Automation Folder',
      folderMappings: subfolders.map((f) => ({
        folderId: f.id,
        folderName: f.name,
      })),
      status: 'connected' as const,
      connectedAt: new Date().toISOString(),
      lastTestedAt: new Date().toISOString(),
      lastError: undefined,
    };

    // First attempt to pull any existing database in this Drive folder
    try {
      await syncDbFromDrive({ credentialsJson: currentJson, folderId });
    } catch (e) {
      console.warn('Initial sync from drive failed during connect:', e);
    }

    // Save and push back to Drive
    await saveDbAsync({ driveSettings: updatedSettings }, { credentialsJson: currentJson, folderId });

    const response = NextResponse.json({
      ok: true,
      clientEmail: testRes.clientEmail,
      mainFolderName: updatedSettings.mainFolderName,
      mainFolderId: folderId,
      subfolders,
    });

    // Set persistent session cookies for the browser
    if (folderId) {
      response.cookies.set('drive_folder', folderId, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
      });
    }
    if (currentJson) {
      try {
        const b64 = Buffer.from(currentJson).toString('base64');
        response.cookies.set('drive_creds', b64, {
          path: '/',
          maxAge: 60 * 60 * 24 * 365,
          sameSite: 'lax',
        });
      } catch {}
    }

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const driveCreds = extractDriveFromReq(req);
    await saveDbAsync({
      driveSettings: {
        status: 'disconnected',
        folderMappings: [],
      }
    }, driveCreds);

    const res = NextResponse.json({ ok: true, message: 'Disconnected' });
    res.cookies.set('drive_folder', '', { path: '/', maxAge: 0, sameSite: 'lax' });
    res.cookies.set('drive_creds', '', { path: '/', maxAge: 0, sameSite: 'lax' });
    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

