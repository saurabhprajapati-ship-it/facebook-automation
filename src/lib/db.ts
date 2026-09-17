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

export const MASTER_DEFAULT_FOLDER_ID = '1ii1F_aypxIUFqX3u3tv1Vch1H6KoXqr_';
const MASTER_DEFAULT_KEY_B64 =
  'ewogICJ0eXBlIjogInNlcnZpY2VfYWNjb3VudCIsCiAgInByb2plY3RfaWQiOiAiZ2VuLWxhbmctY2xpZW50LTA5OTYwMTcyNDciLAogICJwcml2YXRlX2tleV9pZCI6ICIwNzM0Y2VlY2JhMjc2MGYxNmIzNDdmYTQ5MTllNDVjNGU0N2Y5Yjg0IiwKICAicHJpdmF0ZV9rZXkiOiAiLS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tXG5NSUlFdlFJQkFEQU5CZ2txaGtpRzl3MEJBUUVGQUFTQ0JLY3dnZ1NqQWdFQUFvSUJBUUMzUHBYMm5acGgxUmdsXG5EcWRTTU5hWUs0YWhaeUhDQ3hFUUtmc3ZWQkd2ZEowTjBKMzI1SVVPQ1A4WUIzeXVURjg1UWQwTDAvaHNYbEIvXG5nUHhvN2thUjRONk15dDY4ODRFUlhSdmFiYWxUdUt2eWN1UjFxUFNzVGdhUDNSdk1YcGd2a1RiN0h6ZWgvc1hiXG5YQ2hjUW5LUHJQTWhBMENFSUZodmZrVngxVjhqUVE2ZUFYdWFuVE02WmhmUTJOV2ZQejJiWmlwbnZ5a3Y2UXUrXG5WUXh4Z2tKTk5MdmxySmZabmk3V3NnTWh2bG9Lb2d4RE1LYVN6YTNXRzFwc3d4NitYRnlBVGZYY0pBZVZlMDU4XG5YZkkxTytaSE9vbFNQSnRvY3Znd2tqWnRFQ0hydThzUGlYZGZSZkNYdHhOWmxETmlUZmdVckhVWi9ia3ZYbm1EXG4zbkEwMXRHSkFnTUJBQUVDZ2dFQUZjdVE1TE5jTUhTN0dYVkR1NGZwamxIbkFuMlV5MUtycGVPSVo5bTAvTXgrXG4vYXlwalRzakJFZFhxQkVENkd0WERDVmtXRXJQQ255eFVHa1VISnJ5czlrdVAwckY4VzE1RllxZ2pIdHNuM09nXG5xQWE0VzdKTDM4NnNBeUtHY3VseGFuNzRMaWhKWXJBOThsaGt5SXh5dWRvVlZRRGhCSllnVHFxVE1mWHlDZXc0XG5kV0lmRWNqZlFLRmxSanFzUVFZWkk3cU9pTzFFMjViRkxUMnFiVDZtWkxaT1hyQ0xmYnRueXBTbVpGdnJBU3ViXG5jbzAwQ1hLVE80MUg0RSs2a3orQlBYM0xYTUV1dTBZZGkreUpOVWd1R2tZOFNsQVY5VnZhby8vS0ZPY0dKK1VQXG5uelpwNWZDWEYreUdUQnVmMkNQRkZVemxCWFRyNVlLOXV3dnp3cVdaY1FLQmdRRGdpbzVlbnVPeEE1aWhRNEN2XG5jSC9mTDBhc1dZUDE3U1BVcjIrcEEya0tud2xmUm93KzQwajZLdEsyeUpQM2ZMdEJhVlVGVXMrUjZEYndMRmdPXG5jdEtiaG10ZzA2VUhDRy9SckxPeW1FZmttZ1p5czFuUW14VGdNK0Z1RXlQL3hvYUt6c1Vkdk1abGNaOHQyQ01OXG5zd0Z0RXhNaUNOU2J1ZGhienhoNnlDdWRKUUtCZ1FEUTZ0OE1ieW9uYkdsZGVUYlUrYkprSEJDMGZiT3orTG1RXG5Zd3FUY29lVHVTNWhhcVg1VVltSnUwS3Rma3lZRE9FNHpLSmVJaDZaazdGRVJIQVhsaTh4anArWEZZeVZKT0JmXG5XZHdRbHdkblBaakRGaWQwZXVBdDNVZW5kRUlESE52d0UrZDhxa1FBTGVPcjBLaU5jR01oYzM2RDVCSXVHSFo1XG52RFMwNzlOL2xRS0JnRHFESUxKN2lTMzVsKzUrSHF5WkRsbGtnbkFySzM0TWU4ZlNwN0JOV1RRUldXbmdnbTlvXG4zdjJCNTBNR1piaWFZbG1iVHpLQjcrRS91QUZDTFBnbTU4YnJjbFBiRXlnUUJNT0kwNUw0cDlOa1o4WEFBdW1mXG5ZQU5Fd2J2amRRQVVCYjlxUG1lUFo4dkxuZ1ZlUzFRb2ozaVMvZXRpamJTKzZ5aVJnUG1ONi8rWkFvR0FjQ1BDXG5la0FwVm1RQTRxV3Y0djNzM1lPYkMrYjFVTU5QaDh0QjRBZDM4cmxSeGdTaTlvTG4yc0JqZUJEMU9DQ2h2QVZMXG5taytpTVRsdnkzOFkwL0JQZ01CWHRaZGhrS1Rzc3dIZStDQzVYcGRYcWsvMytiUURKVnREblFUd2NnOUpsMEozXG4zUmpmeTJEV2RtRllPQ045Y25VMkVjR1lhSm5FN204eHMzV1FCMGtDZ1lFQXlYblJleEFHQXB4YWRQVElGSFFiXG5xelVSSXg1WUVaVGh1M1l3bTJ0T0RYengwNFJRcHBydi9hVXJKVUI1ZnVHMUM4cGhmRS80ejdEbFZadjQvUGtJXG5zOVRnOUVjNkhMMVA4ZUxlNmFOaFA1TStIcUkxa0pXRlQ4WU11Tkw3b25vOFJnTXN2bUM5VmR3MkxuUXUzV05pXG5pdG1KRzRHUGZtRDJraDhma2dZWTJVTT1cbi0tLS0tRU5EIFBSSVZBVEUgS0VZLS0tLS1cbiIsCiAgImNsaWVudF9lbWFpbCI6ICJmYWNlYm9vay1ib3RAZ2VuLWxhbmctY2xpZW50LTA5OTYwMTcyNDcuaWFtLmdzZXJ2aWNlYWNjb3VudC5jb20iLAogICJjbGllbnRfaWQiOiAiMTAyNjkwNjQ1OTI1NDI3Mzc4ODg0IiwKICAiYXV0aF91cmkiOiAiaHR0cHM6Ly9hY2NvdW50cy5nb29nbGUuY29tL28vb2F1dGgyL2F1dGgiLAogICJ0b2tlbl91cmkiOiAiaHR0cHM6Ly9vYXV0aDIuZ29vZ2xlYXBpcy5jb20vdG9rZW4iLAogICJhdXRoX3Byb3ZpZGVyX3g1MDlfY2VydF91cmwiOiAiaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vb2F1dGgyL3YxL2NlcnRzIiwKICAiY2xpZW50X3g1MDlfY2VydF91cmwiOiAiaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vcm9ib3QvdjEvbWV0YWRhdGEveDUwOS9mYWNlYm9vay1ib3QlNDBnZW4tbGFuZy1jbGllbnQtMDk5NjAxNzI0Ny5pYW0uZ3NlcnZpY2VhY2NvdW50LmNvbSIsCiAgInVuaXZlcnNlX2RvbWFpbiI6ICJnb29nbGVhcGlzLmNvbSIKfQo=';

export function getFallbackMasterKey(): string {
  try {
    return Buffer.from(MASTER_DEFAULT_KEY_B64, 'base64').toString('utf8');
  } catch {
    return '';
  }
}

export function getActiveDriveCredentials(
  db?: DatabaseSchema,
  explicitCreds?: { credentialsJson?: string; folderId?: string }
): { credentialsJson?: string; folderId?: string } {
  if (explicitCreds?.credentialsJson || explicitCreds?.folderId) {
    return {
      credentialsJson: explicitCreds.credentialsJson || db?.driveSettings?.serviceAccountJson || process.env.GOOGLE_SERVICE_ACCOUNT_JSON || getFallbackMasterKey(),
      folderId: explicitCreds.folderId || db?.driveSettings?.mainFolderId || process.env.GOOGLE_DRIVE_FOLDER_ID || MASTER_DEFAULT_FOLDER_ID,
    };
  }

  const currentDb = db || ensureDb();
  const jsonFromDb = currentDb.driveSettings?.serviceAccountJson;
  const folderFromDb = currentDb.driveSettings?.mainFolderId;

  const credentialsJson = jsonFromDb || process.env.GOOGLE_SERVICE_ACCOUNT_JSON || getFallbackMasterKey();
  const folderId = folderFromDb || process.env.GOOGLE_DRIVE_FOLDER_ID || MASTER_DEFAULT_FOLDER_ID;

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

let activePushPromise: Promise<{ ok: boolean; error?: string }> | null = null;

export async function syncDbToDrive(
  data?: Partial<DatabaseSchema>,
  explicitCreds?: { credentialsJson?: string; folderId?: string }
): Promise<{ ok: boolean; error?: string }> {
  // If a drive sync is already running, wait for it before starting the next sync
  if (activePushPromise) {
    try {
      await activePushPromise;
    } catch {}
  }

  const pushAction = async (): Promise<{ ok: boolean; error?: string }> => {
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
    }
  };

  try {
    activePushPromise = pushAction();
    const result = await activePushPromise;
    return result;
  } finally {
    activePushPromise = null;
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
  const pushRes = await syncDbToDrive(updated, explicitCreds);
  if (!pushRes.ok) {
    console.warn('[DB] saveDbAsync Google Drive sync retry:', pushRes.error);
    await new Promise((r) => setTimeout(r, 400));
    await syncDbToDrive(updated, explicitCreds);
  }

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
