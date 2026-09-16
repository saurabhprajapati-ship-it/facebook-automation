import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import { Readable } from 'stream';

// Dedicated Master System Folder ID created by user
export const MASTER_FOLDER_ID =
  process.env.MASTER_DRIVE_FOLDER_ID || '1Piv_X821Ofn-EMyo3SQEo6vgzCLpwN_d';

export interface MasterUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'user';
  driveFolderId?: string;
  avatarUrl?: string;
  createdAt: string;
  lastLoginAt?: string;
}

const LOCAL_FALLBACK_FILE = path.join(process.cwd(), 'master_users.json');
const SALT = 'postnova_secure_auth_salt_2026';

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + SALT).digest('hex');
}

function getDriveClient() {
  const credsRaw =
    process.env.GDRIVE_SERVICE_ACCOUNT_KEY ||
    (fs.existsSync('C:/Users/saura/Downloads/gen-lang-client-0996017247-0734ceecba27.json')
      ? fs.readFileSync('C:/Users/saura/Downloads/gen-lang-client-0996017247-0734ceecba27.json', 'utf8')
      : null);

  if (!credsRaw) return null;

  try {
    const creds = typeof credsRaw === 'string' ? JSON.parse(credsRaw) : credsRaw;
    const auth = new google.auth.JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    return google.drive({ version: 'v3', auth });
  } catch (err) {
    console.error('Failed to init Google Drive client for auth:', err);
    return null;
  }
}

/**
 * Reads master users list from Google Drive folder, or local fallback
 */
export async function getMasterUsers(): Promise<MasterUser[]> {
  const drive = getDriveClient();

  if (drive && MASTER_FOLDER_ID) {
    try {
      const q = `'${MASTER_FOLDER_ID}' in parents and name = 'master_users.json' and trashed = false`;
      const searchRes = await drive.files.list({ q, fields: 'files(id, name)' });
      const file = searchRes.data.files?.[0];

      if (file && file.id) {
        const fileRes = await drive.files.get(
          { fileId: file.id, alt: 'media' },
          { responseType: 'text' }
        );
        const data = typeof fileRes.data === 'string' ? JSON.parse(fileRes.data) : fileRes.data;
        if (Array.isArray(data)) return data;
      }
    } catch (err) {
      console.warn('Google Drive master_users read failed, using local cache:', err);
    }
  }

  // Local fallback
  if (fs.existsSync(LOCAL_FALLBACK_FILE)) {
    try {
      const content = fs.readFileSync(LOCAL_FALLBACK_FILE, 'utf8');
      const data = JSON.parse(content);
      if (Array.isArray(data)) return data;
    } catch {}
  }

  // Seed default admin Naveed if empty
  const defaultAdmin: MasterUser = {
    id: 'usr_admin_naveed',
    name: 'Naveed',
    email: 'shahtube100@gmail.com',
    passwordHash: hashPassword('admin123'),
    role: 'admin',
    createdAt: new Date().toISOString(),
  };

  await saveMasterUsers([defaultAdmin]);
  return [defaultAdmin];
}

/**
 * Saves master users list to Google Drive folder and local cache
 */
export async function saveMasterUsers(users: MasterUser[]): Promise<void> {
  const jsonContent = JSON.stringify(users, null, 2);

  // 1. Save local cache
  try {
    fs.writeFileSync(LOCAL_FALLBACK_FILE, jsonContent, 'utf8');
  } catch {}

  // 2. Save to Google Drive Master System Folder
  const drive = getDriveClient();
  if (drive && MASTER_FOLDER_ID) {
    try {
      const q = `'${MASTER_FOLDER_ID}' in parents and name = 'master_users.json' and trashed = false`;
      const searchRes = await drive.files.list({ q, fields: 'files(id, name)' });
      const existingFile = searchRes.data.files?.[0];

      const mediaStream = new Readable();
      mediaStream.push(jsonContent);
      mediaStream.push(null);

      if (existingFile && existingFile.id) {
        await drive.files.update({
          fileId: existingFile.id,
          media: { mimeType: 'application/json', body: mediaStream },
          supportsAllDrives: true,
        });
      } else {
        try {
          await drive.files.create({
            requestBody: {
              name: 'master_users.json',
              parents: [MASTER_FOLDER_ID],
              mimeType: 'application/json',
            },
            media: { mimeType: 'application/json', body: mediaStream },
            supportsAllDrives: true,
          });
        } catch (createErr: any) {
          console.warn('Google Drive quota notice (create master_users.json):', createErr.message);
        }
      }
    } catch (err) {
      console.error('Google Drive master_users write failed:', err);
    }
  }
}
