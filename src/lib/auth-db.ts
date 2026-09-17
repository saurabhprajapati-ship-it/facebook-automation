import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import { Readable } from 'stream';
import { getFallbackMasterKey } from './db';

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
  let credsRaw =
    process.env.GDRIVE_SERVICE_ACCOUNT_KEY ||
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (!credsRaw && fs.existsSync('C:/Users/saura/Downloads/gen-lang-client-0996017247-0734ceecba27.json')) {
    try {
      credsRaw = fs.readFileSync('C:/Users/saura/Downloads/gen-lang-client-0996017247-0734ceecba27.json', 'utf8');
    } catch {}
  }

  if (!credsRaw) {
    try {
      const localDbPath = path.join(process.cwd(), 'data', 'db.json');
      if (fs.existsSync(localDbPath)) {
        const localDb = JSON.parse(fs.readFileSync(localDbPath, 'utf8'));
        credsRaw = localDb.driveSettings?.serviceAccountJson;
      }
    } catch {}
  }

  if (!credsRaw) {
    credsRaw = getFallbackMasterKey();
  }

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

  // Seed default admin Saurabh if empty
  const defaultAdmin: MasterUser = {
    id: 'usr_admin_saurabh',
    name: 'Saurabh',
    email: 'saurabhprajapatidev@gmail.com',
    passwordHash: hashPassword('admin123'),
    role: 'admin',
    createdAt: new Date().toISOString(),
  };

  await saveMasterUsers([defaultAdmin]);
  return [defaultAdmin];
}

export function createSessionToken(user: {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  avatarUrl?: string;
  driveFolderId?: string;
}): string {
  const payload = {
    ...user,
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SALT).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export function verifySessionToken(token: string): MasterUser | null {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  if (!data || !sig) return null;

  const expectedSig = crypto.createHmac('sha256', SALT).update(data).digest('base64url');
  if (sig !== expectedSig) return null;

  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Date.now()) return null;
    return {
      id: payload.id,
      name: payload.name,
      email: payload.email,
      role: payload.role || 'user',
      avatarUrl: payload.avatarUrl,
      driveFolderId: payload.driveFolderId,
      passwordHash: '',
      createdAt: '',
    };
  } catch {
    return null;
  }
}

/**
 * Extracts authenticated user from request cookie or Authorization header
 */
export async function getUserFromReq(req: Request): Promise<MasterUser | null> {
  try {
    // 1. Check Authorization header
    const authHeader = req.headers.get('authorization') || '';
    if (authHeader.startsWith('Bearer ')) {
      const verified = verifySessionToken(authHeader.substring(7).trim());
      if (verified) return verified;
    }

    // 2. Check Cookie
    const cookieHeader = req.headers.get('cookie') || '';
    const match = cookieHeader.match(/postnova_session=([^;]+)/);
    const sessionVal = match ? decodeURIComponent(match[1].trim()) : null;
    if (sessionVal) {
      const verified = verifySessionToken(sessionVal);
      if (verified) return verified;

      const users = await getMasterUsers();
      const found = users.find((u) => u.id === sessionVal);
      if (found) return found;
    }

    // 3. Check Cookie postnova_token
    const matchToken = cookieHeader.match(/postnova_token=([^;]+)/);
    if (matchToken) {
      const verified = verifySessionToken(decodeURIComponent(matchToken[1].trim()));
      if (verified) return verified;
    }

    // 4. Check custom x-user-email / x-user-id headers
    const userEmailHeader = req.headers.get('x-user-email');
    if (userEmailHeader) {
      const cleanEmail = userEmailHeader.toLowerCase().trim();
      const users = await getMasterUsers();
      const matched = users.find((u) => u.email.toLowerCase() === cleanEmail);
      if (matched) return matched;
      if (cleanEmail === 'saurabhprajapatidev@gmail.com') {
        return {
          id: 'usr_admin_saurabh',
          name: 'Saurabh',
          email: 'saurabhprajapatidev@gmail.com',
          role: 'admin',
          createdAt: new Date().toISOString(),
          passwordHash: '',
        };
      }
    }

    const userIdHeader = req.headers.get('x-user-id');
    if (userIdHeader) {
      const users = await getMasterUsers();
      const matched = users.find((u) => u.id === userIdHeader.trim());
      if (matched) return matched;
    }

    return null;
  } catch {
    return null;
  }
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
