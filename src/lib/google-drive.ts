import { google } from 'googleapis';
import { Readable } from 'stream';

export interface DriveFileInfo {
  id: string;
  name: string;
  mimeType: string;
  fileType: 'image' | 'video';
  thumbnailUrl?: string;
  size?: string;
  createdTime?: string;
}

export interface DriveFolderInfo {
  id: string;
  name: string;
}

export function extractFolderId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  // If it's a full Google Drive URL
  const match = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  // If query parameter id=...
  const queryMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (queryMatch) return queryMatch[1];
  // Otherwise assume it's already an ID
  return trimmed.split('?')[0].split('#')[0];
}

export function getDriveClient(credentialsJson: string) {
  let creds: any;
  try {
    creds = typeof credentialsJson === 'string' ? JSON.parse(credentialsJson) : credentialsJson;
  } catch (err: any) {
    throw new Error('Invalid Service Account JSON credentials: ' + err.message);
  }

  if (!creds.client_email || !creds.private_key) {
    throw new Error('Service Account JSON must contain "client_email" and "private_key"');
  }

  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.readonly',
    ],
  });

  return google.drive({ version: 'v3', auth });
}

export async function testDriveConnection(credentialsJson: string, folderInput?: string): Promise<{
  ok: boolean;
  clientEmail: string;
  projectId: string;
  folderName?: string;
  folderId?: string;
  error?: string;
}> {
  try {
    const creds = JSON.parse(credentialsJson);
    const drive = getDriveClient(credentialsJson);

    let folderName: string | undefined;
    let folderId: string | undefined;

    if (folderInput) {
      folderId = extractFolderId(folderInput);
      const res = await drive.files.get({
        fileId: folderId,
        fields: 'id, name, mimeType',
        supportsAllDrives: true,
      });
      folderName = res.data.name || undefined;
    } else {
      // Just test a light list call
      await drive.files.list({ pageSize: 1, supportsAllDrives: true });
    }

    return {
      ok: true,
      clientEmail: creds.client_email,
      projectId: creds.project_id || '',
      folderName,
      folderId,
    };
  } catch (err: any) {
    return {
      ok: false,
      clientEmail: '',
      projectId: '',
      error: err.message || 'Failed to connect to Google Drive',
    };
  }
}

export async function listDriveSubfolders(credentialsJson: string, mainFolderInput: string): Promise<DriveFolderInfo[]> {
  const mainFolderId = extractFolderId(mainFolderInput);
  const drive = getDriveClient(credentialsJson);

  const res = await drive.files.list({
    q: `'${mainFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name)',
    pageSize: 100,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  return (res.data.files || []).map((f) => ({
    id: f.id!,
    name: f.name || 'Untitled Folder',
  }));
}

// Natural sort: 1.jpg, 2.jpg, 10.jpg, 100.jpg
export function naturalSortFiles(files: DriveFileInfo[]): DriveFileInfo[] {
  return [...files].sort((a, b) => {
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
  });
}

export async function listDriveMediaFiles(credentialsJson: string, folderInput: string): Promise<DriveFileInfo[]> {
  const folderId = extractFolderId(folderInput);
  const drive = getDriveClient(credentialsJson);

  let allFiles: any[] = [];
  let pageToken: string | undefined = undefined;

  do {
    const res: any = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false and (mimeType contains 'image/' or mimeType contains 'video/')`,
      fields: 'nextPageToken, files(id, name, mimeType, thumbnailLink, size, createdTime)',
      pageSize: 500,
      pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    if (res.data.files) {
      allFiles.push(...res.data.files);
    }
    pageToken = res.data.nextPageToken || undefined;
  } while (pageToken && allFiles.length < 2500);

  const mapped: DriveFileInfo[] = allFiles.map((f) => ({
    id: f.id!,
    name: f.name || 'unnamed',
    mimeType: f.mimeType || 'image/jpeg',
    fileType: (f.mimeType || '').startsWith('video/') ? 'video' : 'image',
    thumbnailUrl: f.thumbnailLink || undefined,
    size: f.size || undefined,
    createdTime: f.createdTime || undefined,
  }));

  return naturalSortFiles(mapped);
}

export async function fetchDriveCaptionsFile(credentialsJson: string, folderInput: string): Promise<{
  fileName: string;
  content: string;
} | null> {
  const folderId = extractFolderId(folderInput);
  const drive = getDriveClient(credentialsJson);

  // Look for captions.txt, captions.csv, or any txt/csv file
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false and (name contains 'caption' or mimeType = 'text/plain' or mimeType = 'text/csv' or name contains '.txt' or name contains '.csv') and not (name = 'scheduler_db.json')`,
    fields: 'files(id, name, mimeType)',
    pageSize: 10,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const files = res.data.files || [];
  if (!files.length) return null;

  // Prefer file named captions.txt or captions.csv
  const selected = files.find((f) => /^captions?\.(txt|csv)$/i.test(f.name || '')) || files[0];

  try {
    const fileRes = await drive.files.get(
      { fileId: selected.id!, alt: 'media', supportsAllDrives: true },
      { responseType: 'text' }
    );
    return {
      fileName: selected.name || 'captions.txt',
      content: String(fileRes.data || ''),
    };
  } catch (err) {
    console.warn('Failed to read captions file from Drive:', err);
    return null;
  }
}

export async function getDriveFileStream(credentialsJson: string, fileId: string): Promise<{
  stream: Readable;
  mimeType: string;
  name: string;
}> {
  const drive = getDriveClient(credentialsJson);

  // Get metadata first
  const meta = await drive.files.get({
    fileId,
    fields: 'id, name, mimeType',
    supportsAllDrives: true,
  });

  const res = await drive.files.get(
    { fileId, alt: 'media', supportsAllDrives: true },
    { responseType: 'stream' }
  );

  return {
    stream: res.data as Readable,
    mimeType: meta.data.mimeType || 'image/jpeg',
    name: meta.data.name || 'photo.jpg',
  };
}

export async function getDriveFileBuffer(credentialsJson: string, fileId: string): Promise<{
  buffer: Buffer;
  mimeType: string;
  name: string;
}> {
  const drive = getDriveClient(credentialsJson);
  const meta = await drive.files.get({
    fileId,
    fields: 'id, name, mimeType',
    supportsAllDrives: true,
  });

  const res = await drive.files.get(
    { fileId, alt: 'media', supportsAllDrives: true },
    { responseType: 'arraybuffer' }
  );

  return {
    buffer: Buffer.from(res.data as ArrayBuffer),
    mimeType: meta.data.mimeType || 'image/jpeg',
    name: meta.data.name || 'photo.jpg',
  };
}

export async function saveDriveDatabase(credentialsJson: string, folderInput: string, data: any): Promise<string> {
  const folderId = extractFolderId(folderInput);
  const drive = getDriveClient(credentialsJson);
  const jsonContent = JSON.stringify(data, null, 2);

  // Check if scheduler_db.json already exists
  const listRes = await drive.files.list({
    q: `'${folderId}' in parents and name = 'scheduler_db.json' and trashed = false`,
    fields: 'files(id, name)',
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const existing = listRes.data.files?.[0];

  if (existing && existing.id) {
    await drive.files.update({
      fileId: existing.id,
      media: {
        mimeType: 'application/json',
        body: jsonContent,
      },
      supportsAllDrives: true,
    });
    return existing.id;
  } else {
    const createRes = await drive.files.create({
      requestBody: {
        name: 'scheduler_db.json',
        parents: [folderId],
        mimeType: 'application/json',
      },
      media: {
        mimeType: 'application/json',
        body: jsonContent,
      },
      supportsAllDrives: true,
    });
    return createRes.data.id!;
  }
}

export async function readDriveDatabase(credentialsJson: string, folderInput: string): Promise<any | null> {
  const folderId = extractFolderId(folderInput);
  const drive = getDriveClient(credentialsJson);

  const listRes = await drive.files.list({
    q: `'${folderId}' in parents and name = 'scheduler_db.json' and trashed = false`,
    fields: 'files(id, name)',
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const file = listRes.data.files?.[0];
  if (!file || !file.id) return null;

  try {
    const res = await drive.files.get(
      { fileId: file.id, alt: 'media', supportsAllDrives: true },
      { responseType: 'text' }
    );
    return JSON.parse(String(res.data || '{}'));
  } catch {
    return null;
  }
}

const MASTER_DEFAULT_FOLDER_ID = '1ii1F_aypxIUFqX3u3tv1Vch1H6KoXqr_';

export async function saveFullDriveDatabase(
  credentialsJson: string,
  folderInput?: string,
  data?: any
): Promise<string> {
  const folderId = folderInput ? extractFolderId(folderInput) : '';
  const drive = getDriveClient(credentialsJson);
  const jsonContent = JSON.stringify(data || {}, null, 2);

  const query = folderId
    ? `'${folderId}' in parents and name = 'postnova_db.json' and trashed = false`
    : `name = 'postnova_db.json' and trashed = false`;

  const listRes = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  let existing = listRes.data.files?.[0];

  // Fallback: search anywhere on Drive for postnova_db.json before creating duplicates
  if (!existing || !existing.id) {
    const globalRes = await drive.files.list({
      q: `name = 'postnova_db.json' and trashed = false`,
      fields: 'files(id, name)',
      pageSize: 1,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    existing = globalRes.data.files?.[0];
  }

  if (existing && existing.id) {
    await drive.files.update({
      fileId: existing.id,
      media: {
        mimeType: 'application/json',
        body: jsonContent,
      },
      supportsAllDrives: true,
    });
    return existing.id;
  } else {
    const targetParent = folderId || MASTER_DEFAULT_FOLDER_ID;
    try {
      const createRes = await drive.files.create({
        requestBody: {
          name: 'postnova_db.json',
          parents: targetParent ? [targetParent] : undefined,
          mimeType: 'application/json',
        },
        media: {
          mimeType: 'application/json',
          body: jsonContent,
        },
        supportsAllDrives: true,
      });
      return createRes.data.id!;
    } catch (err: any) {
      if (err.message && err.message.includes('storage quota')) {
        throw new Error(
          "Google Drive Setup: Apne Google Drive folder me ek empty file 'postnova_db.json' upload ya create karein. Uske baad bot usme 24/7 bina kisi quota limit ke write aur update karta rahega."
        );
      }
      throw err;
    }
  }
}

export async function readFullDriveDatabase(
  credentialsJson: string,
  folderInput?: string
): Promise<any | null> {
  const folderId = folderInput ? extractFolderId(folderInput) : '';
  const drive = getDriveClient(credentialsJson);

  const query = folderId
    ? `'${folderId}' in parents and name = 'postnova_db.json' and trashed = false`
    : `name = 'postnova_db.json' and trashed = false`;

  const listRes = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  let file = listRes.data.files?.[0];

  // Fallback 1: If not found in provided folderId, check MASTER_DEFAULT_FOLDER_ID
  if ((!file || !file.id) && folderId && folderId !== MASTER_DEFAULT_FOLDER_ID) {
    try {
      const masterRes = await drive.files.list({
        q: `'${MASTER_DEFAULT_FOLDER_ID}' in parents and name = 'postnova_db.json' and trashed = false`,
        fields: 'files(id, name)',
        pageSize: 1,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });
      file = masterRes.data.files?.[0];
    } catch {}
  }

  // Fallback 2: If still not found, search globally across Drive for postnova_db.json
  if (!file || !file.id) {
    try {
      const globalRes = await drive.files.list({
        q: `name = 'postnova_db.json' and trashed = false`,
        fields: 'files(id, name, modifiedTime)',
        orderBy: 'modifiedTime desc',
        pageSize: 1,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });
      file = globalRes.data.files?.[0];
    } catch {}
  }

  if (!file || !file.id) return null;

  try {
    const res = await drive.files.get(
      { fileId: file.id, alt: 'media', supportsAllDrives: true },
      { responseType: 'text' }
    );
    return JSON.parse(String(res.data || '{}'));
  } catch (err) {
    console.warn('[GoogleDrive] readFullDriveDatabase parse error:', err);
    return null;
  }
}


