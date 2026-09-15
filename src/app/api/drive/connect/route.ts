import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { testDriveConnection, listDriveSubfolders, extractFolderId } from '@/lib/google-drive';

export async function GET() {
  const db = getDb();
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
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { serviceAccountJson, mainFolderInput } = body;

    const db = getDb();
    const currentJson = serviceAccountJson || db.driveSettings?.serviceAccountJson;

    if (!currentJson) {
      return NextResponse.json(
        { error: 'Service Account JSON key is required' },
        { status: 400 }
      );
    }

    const testRes = await testDriveConnection(currentJson, mainFolderInput);
    if (!testRes.ok) {
      saveDb({
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

    saveDb({ driveSettings: updatedSettings });

    return NextResponse.json({
      ok: true,
      clientEmail: testRes.clientEmail,
      mainFolderName: updatedSettings.mainFolderName,
      mainFolderId: folderId,
      subfolders,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
