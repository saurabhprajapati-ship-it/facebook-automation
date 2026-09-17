import fs from 'fs';
import path from 'path';
import { saveFullDriveDatabase, readFullDriveDatabase } from './google-drive';

export interface Account {
  id: string;
  userId?: string;
  platform: 'facebook' | 'instagram' | 'twitter' | 'pinterest' | 'telegram' | 'tiktok';
  pageId: string;
  name: string;
  username?: string;
  profilePictureUrl?: string;
  followersCount?: number;
  igUserId?: string;
  systemUserToken?: string;
  pageAccessToken: string;
  active: boolean;
  addedAt: string;
  lastError?: string;
  lastPostedAt?: string;
}

export interface GeminiKey {
  id: string;
  userId?: string;
  key: string;
  maskedKey: string;
  models: string[];
  status: 'ready' | 'rate_limited' | 'invalid';
  addedAt: string;
  lastUsed?: string;
  postsToday: number;
}

export interface Automation {
  id: string;
  userId?: string;
  name: string;
  kind: 'ai' | 'feed';
  enabled: boolean;
  topic?: string;
  language: string;
  postLength: 'short' | 'medium' | 'long';
  customLink?: string;
  textBeforeLink?: string;
  addPicture: boolean;
  addHashtags: boolean;
  feedType?: 'wordpress' | 'blogger' | 'rss';
  feedUrl?: string;
  postsPerDay: number;
  waitHours: number;
  timeFrom: string;
  timeUntil: string;
  targetAccountIds: string[];
  nextRunAt?: string;
  lastRunAt?: string;
  lastStatus?: string;
}

export interface BrandingSettings {
  enabledOnAuto: boolean;
  offerOnManual: boolean;
  showAccountName: boolean;
  showTopBadge?: boolean;
  showBottomBar?: boolean;
  watermarkMode?: 'logo_stamp' | 'spot_healer' | 'off';
  logoUrl?: string; // Custom uploaded logo or Facebook Page profile picture
  customAccountNames: Record<string, string>;
  bottomText: string;
  barColor: string;
  textColor: string;
  font: string;
  look: '3D' | 'normal';
  headlineBanner: boolean;
}

export interface PostRecord {
  id: string;
  userId?: string;
  automationId?: string;
  accountName: string;
  title: string;
  caption: string;
  imageUrl?: string;
  externalLink?: string;
  fbPostId?: string;
  status: 'live' | 'failed' | 'test';
  errorMsg?: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId?: string;
  type: 'live' | 'failed' | 'info';
  title: string;
  message: string;
  createdAt: string;
}

export interface DriveFolderMapping {
  folderId: string;
  folderName: string;
  targetAccountId?: string;
}

export interface DriveSettings {
  serviceAccountJson?: string;
  clientEmail?: string;
  projectId?: string;
  mainFolderId?: string;
  mainFolderName?: string;
  folderMappings?: DriveFolderMapping[];
  connectedAt?: string;
  lastTestedAt?: string;
  status?: 'connected' | 'disconnected' | 'error';
  lastError?: string;
}

export interface ScheduledPostItem {
  id: string;
  userId?: string;
  batchId: string;
  order: number;
  fileName: string;
  fileId?: string;
  fileType: 'image' | 'video';
  mimeType?: string;
  thumbnailUrl?: string;
  caption: string;
  captionSource: 'ai' | 'file' | 'manual';
  scheduledAt: string;
  pairWithNext?: boolean;
  status: 'scheduled' | 'posting' | 'posted' | 'failed' | 'paused';
  targetAccountId: string;
  targetAccountName?: string;
  driveFolderId?: string;
  fbPostId?: string;
  error?: string;
  createdAt: string;
  postedAt?: string;
}

export interface AutoDmButton {
  id: string;
  title: string;
  url: string;
}

export interface AutoDmRule {
  id: string;
  userId?: string;
  name: string;
  enabled: boolean;
  platform: 'instagram' | 'facebook';
  targetAccountId: string;
  targetAccountName?: string;
  mediaFilter: 'all' | 'specific';
  specificMediaId?: string;
  triggerKeywords: string[]; // lowercase keywords e.g. ["link", "price", "info"]
  matchType: 'contains' | 'exact' | 'any';
  dmMessage: string;
  buttons?: AutoDmButton[]; // Interactive Action Buttons (URL Cards)
  publicReplyMessage?: string;
  processedCommentIds: string[];
  stats: {
    totalSent: number;
    lastTriggeredAt?: string;
  };
  createdAt: string;
}

export interface AutoDmLog {
  id: string;
  userId?: string;
  ruleId: string;
  ruleName?: string;
  platform: 'instagram' | 'facebook';
  commentId: string;
  username: string;
  commentText: string;
  matchedKeyword?: string;
  dmStatus: 'sent' | 'failed' | 'rate_limited' | 'already_replied';
  replyStatus?: 'sent' | 'failed' | 'skipped';
  timestamp: string;
  error?: string;
}

export interface DatabaseSchema {
  accounts: Account[];
  geminiKeys: GeminiKey[];
  automations: Automation[];
  branding: BrandingSettings;
  posts: PostRecord[];
  notifications: NotificationItem[];
  driveSettings?: DriveSettings;
  scheduledQueue?: ScheduledPostItem[];
  autoDmRules?: AutoDmRule[];
  autoDmLogs?: AutoDmLog[];
  notificationPreferences: {
    postWentOut: boolean;
    postFailed: boolean;
    newsUpdates: boolean;
  };
}

const isVercel = Boolean(process.env.VERCEL);
const DB_DIR = isVercel ? path.join('/tmp', 'data') : path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

export const DEFAULT_BRANDING: BrandingSettings = {
  enabledOnAuto: true,
  offerOnManual: true,
  showAccountName: true,
  showTopBadge: false,
  showBottomBar: true,
  watermarkMode: 'logo_stamp',
  logoUrl: '',
  customAccountNames: {},
  bottomText: 'For more content, Like and Share',
  barColor: '#E60023',
  textColor: '#FFFFFF',
  font: 'Poppins',
  look: '3D',
  headlineBanner: false,
};

const DEFAULT_DB: DatabaseSchema = {
  accounts: [],
  geminiKeys: [],
  automations: [],
  branding: DEFAULT_BRANDING,
  posts: [],
  scheduledQueue: [],
  autoDmRules: [],
  autoDmLogs: [],
  driveSettings: {
    status: 'disconnected',
    folderMappings: [],
  },
  notifications: [
    {
      id: 'notif_welcome',
      type: 'info',
      title: 'Welcome to AlphaPost',
      message: 'Connect your Facebook Page in Accounts to start automated posting.',
      createdAt: new Date().toISOString(),
    }
  ],
  notificationPreferences: {
    postWentOut: true,
    postFailed: true,
    newsUpdates: true,
  }
};

function ensureDb(): DatabaseSchema {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    if (isVercel) {
      const bundledDbPath = path.join(process.cwd(), 'data', 'db.json');
      const templateDbPath = path.join(process.cwd(), 'data', 'db.template.json');
      const seedPath = fs.existsSync(bundledDbPath) ? bundledDbPath : (fs.existsSync(templateDbPath) ? templateDbPath : null);
      if (seedPath) {
        try {
          const raw = fs.readFileSync(seedPath, 'utf-8');
          fs.writeFileSync(DB_FILE, raw, 'utf-8');
          const parsed = JSON.parse(raw);
          return {
            ...DEFAULT_DB,
            ...parsed,
            branding: { ...DEFAULT_BRANDING, ...(parsed.branding || {}) },
            autoDmRules: parsed.autoDmRules || [],
            autoDmLogs: parsed.autoDmLogs || [],
          };
        } catch {
          // Fallback if bundled json fails to parse
        }
      }
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8');
    return DEFAULT_DB;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_DB,
      ...parsed,
      branding: { ...DEFAULT_BRANDING, ...(parsed.branding || {}) },
      autoDmRules: parsed.autoDmRules || [],
      autoDmLogs: parsed.autoDmLogs || [],
    };
  } catch {
    return DEFAULT_DB;
  }
}

export function getDb(): DatabaseSchema {
  return ensureDb();
}

export function getActiveDriveCredentials(
  db?: DatabaseSchema,
  explicitCreds?: { credentialsJson?: string; folderId?: string }
): { credentialsJson?: string; folderId?: string } {
  if (explicitCreds?.credentialsJson || explicitCreds?.folderId) {
    return {
      credentialsJson: explicitCreds.credentialsJson || db?.driveSettings?.serviceAccountJson || process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
      folderId: explicitCreds.folderId || db?.driveSettings?.mainFolderId || process.env.GOOGLE_DRIVE_FOLDER_ID,
    };
  }

  const currentDb = db || ensureDb();
  const jsonFromDb = currentDb.driveSettings?.serviceAccountJson;
  const folderFromDb = currentDb.driveSettings?.mainFolderId;

  const credentialsJson = jsonFromDb || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const folderId = folderFromDb || process.env.GOOGLE_DRIVE_FOLDER_ID;

  return { credentialsJson, folderId };
}

export function extractDriveFromReq(req: Request): { credentialsJson?: string; folderId?: string } {
  try {
    const headers = req.headers;
    let folderId = headers.get('x-drive-folder-id') || undefined;
    let rawCreds = headers.get('x-drive-creds') || undefined;

    // Also check Cookie header if not found in custom headers!
    const cookieHeader = headers.get('cookie') || '';
    if (!folderId && cookieHeader) {
      const matchFolder = cookieHeader.match(/(?:^|;\s*)drive_folder=([^;]+)/);
      if (matchFolder) {
        folderId = decodeURIComponent(matchFolder[1].trim());
      }
    }
    if (!rawCreds && cookieHeader) {
      const matchCreds = cookieHeader.match(/(?:^|;\s*)drive_creds=([^;]+)/);
      if (matchCreds) {
        rawCreds = decodeURIComponent(matchCreds[1].trim());
      }
    }

    let credentialsJson: string | undefined;
    if (rawCreds) {
      try {
        const decoded = Buffer.from(rawCreds, 'base64').toString('utf-8');
        if (decoded.includes('private_key') || decoded.includes('client_email')) {
          credentialsJson = decoded;
        } else {
          credentialsJson = decodeURIComponent(rawCreds);
        }
      } catch {
        credentialsJson = decodeURIComponent(rawCreds);
      }
    }

    let queryFolder: string | undefined;
    try {
      const url = new URL(req.url);
      queryFolder = url.searchParams.get('folder') || url.searchParams.get('folderId') || undefined;
    } catch {}

    return {
      folderId: folderId || queryFolder,
      credentialsJson,
    };
  } catch {
    return {};
  }
}

/**
 * Returns latest database, automatically syncing from Google Drive
 * if credentials or cookies are present on the request.
 */
export async function getDbFromReq(req?: Request): Promise<DatabaseSchema> {
  if (!req) return ensureDb();
  const driveCreds = extractDriveFromReq(req);
  const active = getActiveDriveCredentials(undefined, driveCreds);
  if (active.credentialsJson) {
    return await syncDbFromDrive(active);
  }
  return ensureDb();
}

let isPushingToDrive = false;

export async function syncDbFromDrive(
  explicitCreds?: { credentialsJson?: string; folderId?: string }
): Promise<DatabaseSchema> {
  const current = ensureDb();
  const { credentialsJson, folderId } = getActiveDriveCredentials(current, explicitCreds);

  if (!credentialsJson) {
    return current;
  }

  try {
    const remoteDb = await readFullDriveDatabase(credentialsJson, folderId);
    if (remoteDb && typeof remoteDb === 'object') {
      const merged: DatabaseSchema = {
        ...DEFAULT_DB,
        ...current,
        ...remoteDb,
        driveSettings: {
          ...current.driveSettings,
          ...(remoteDb.driveSettings || {}),
          serviceAccountJson: credentialsJson || current.driveSettings?.serviceAccountJson || remoteDb.driveSettings?.serviceAccountJson,
          mainFolderId: folderId || current.driveSettings?.mainFolderId || remoteDb.driveSettings?.mainFolderId,
        },
        branding: { ...DEFAULT_BRANDING, ...(remoteDb.branding || current.branding || {}) },
        autoDmRules: remoteDb.autoDmRules || current.autoDmRules || [],
        autoDmLogs: remoteDb.autoDmLogs || current.autoDmLogs || [],
        scheduledQueue: remoteDb.scheduledQueue || current.scheduledQueue || [],
      };

      fs.writeFileSync(DB_FILE, JSON.stringify(merged, null, 2), 'utf-8');
      return merged;
    }
  } catch (err) {
    console.warn('[DB] syncDbFromDrive failed:', err);
  }

  return current;
}

export async function syncDbToDrive(
  data?: Partial<DatabaseSchema>,
  explicitCreds?: { credentialsJson?: string; folderId?: string }
): Promise<{ ok: boolean; error?: string }> {
  if (isPushingToDrive) return { ok: false, error: 'Sync already in progress' };
  isPushingToDrive = true;
  try {
    const current = ensureDb();
    const toSave = data ? { ...current, ...data } : current;
    const { credentialsJson, folderId } = getActiveDriveCredentials(toSave, explicitCreds);

    if (!credentialsJson) {
      return { ok: false, error: 'Google Drive credentials not configured' };
    }

    await saveFullDriveDatabase(credentialsJson, folderId, toSave);
    return { ok: true };
  } catch (err: any) {
    console.warn('[DB] syncDbToDrive failed:', err);
    return { ok: false, error: err.message || 'Push to Google Drive failed' };
  } finally {
    isPushingToDrive = false;
  }
}

export async function saveDbAsync(
  data: Partial<DatabaseSchema>,
  explicitCreds?: { credentialsJson?: string; folderId?: string }
): Promise<DatabaseSchema> {
  const current = ensureDb();
  const updated: DatabaseSchema = {
    ...current,
    ...data,
  };
  fs.writeFileSync(DB_FILE, JSON.stringify(updated, null, 2), 'utf-8');

  // Await Google Drive push so Vercel Serverless doesn't freeze prematurely!
  await syncDbToDrive(updated, explicitCreds);

  return updated;
}

export function saveDb(data: Partial<DatabaseSchema>): DatabaseSchema {
  const current = ensureDb();
  const updated: DatabaseSchema = {
    ...current,
    ...data,
  };
  fs.writeFileSync(DB_FILE, JSON.stringify(updated, null, 2), 'utf-8');

  // Asynchronously sync with Google Drive in background if credentials exist
  const { credentialsJson } = getActiveDriveCredentials(updated);
  if (credentialsJson) {
    syncDbToDrive(updated).catch((err) => {
      console.warn('[DB] Background cloud sync error:', err);
    });
  }

  return updated;
}
