import { ScheduledPostItem } from './db';
import { DriveFileInfo } from './google-drive';

export interface CalendarConfig {
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm (e.g. "00:00" or "09:00")
  startIso?: string; // Explicit ISO string from client
  clientTimezoneOffset?: number; // client getTimezoneOffset() in minutes
  postsPerDay: number; // e.g. 24
  intervalMinutes?: number; // e.g. 60 (1 hour)
  pairWithNext?: boolean; // Post 2 photos together
  activeHoursFrom?: string; // e.g. "00:00"
  activeHoursUntil?: string; // e.g. "23:59"
  addJitterMinutes?: number; // e.g. 5
  targetAccountId: string;
  targetAccountName?: string;
  driveFolderId?: string;
}

export function generateCalendarSlots(
  files: DriveFileInfo[],
  captionsMap: Record<string, string>,
  config: CalendarConfig
): ScheduledPostItem[] {
  const result: ScheduledPostItem[] = [];
  const batchId = 'batch_' + Date.now();

  const postsPerDay = Math.max(1, config.postsPerDay || 24);
  const intervalMinutes = config.intervalMinutes && config.intervalMinutes > 0
    ? config.intervalMinutes
    : Math.floor((24 * 60) / postsPerDay); // e.g. (1440 / 24) = 60 mins

  // Parse start date & time with client timezone awareness
  let currentCursor: Date;
  const [startHour, startMin] = (config.startTime || '09:00').split(':').map(Number);

  if (config.startIso && !isNaN(new Date(config.startIso).getTime())) {
    currentCursor = new Date(config.startIso);
  } else {
    const [startYear, startMonth, startDay] = config.startDate.split('-').map(Number);

    if (config.clientTimezoneOffset !== undefined && !isNaN(config.clientTimezoneOffset)) {
      // clientTimezoneOffset is in minutes (e.g. -390 for UTC+6:30)
      const utcMs = Date.UTC(startYear, startMonth - 1, startDay, startHour, startMin) + (config.clientTimezoneOffset * 60 * 1000);
      currentCursor = new Date(utcMs);
    } else {
      currentCursor = new Date(startYear, startMonth - 1, startDay, startHour, startMin, 0, 0);
    }
  }

  // If start time is already significantly in the past (more than 2 minutes), push slightly forward to now + 1 min
  const now = new Date();
  if (currentCursor.getTime() < now.getTime() - 2 * 60 * 1000) {
    currentCursor = new Date(now.getTime() + 60 * 1000); // Start 1 min from now
  }

  const jitterRange = config.addJitterMinutes ?? 4;
  const pairPhotos = Boolean(config.pairWithNext);

  let fileIndex = 0;
  let order = 1;
  let postsTodayCount = 0;

  while (fileIndex < files.length) {
    const file = files[fileIndex];

    // Compute jitter offset in milliseconds (slot 1 starts at exact requested time with 0 jitter)
    const jitterMs = (jitterRange > 0 && order > 1)
      ? (Math.floor(Math.random() * (jitterRange * 2 + 1)) - jitterRange) * 60 * 1000
      : 0;

    const scheduledDate = new Date(currentCursor.getTime() + jitterMs);
    const caption = captionsMap[file.id] || captionsMap[file.name] || '';

    result.push({
      id: `post_${batchId}_${order}`,
      batchId,
      order,
      fileName: file.name,
      fileId: file.id,
      fileType: file.fileType || 'image',
      mimeType: file.mimeType,
      thumbnailUrl: file.thumbnailUrl,
      caption: caption,
      captionSource: caption ? 'file' : 'ai',
      scheduledAt: scheduledDate.toISOString(),
      pairWithNext: pairPhotos,
      status: 'scheduled',
      targetAccountId: config.targetAccountId,
      targetAccountName: config.targetAccountName,
      driveFolderId: config.driveFolderId,
      createdAt: new Date().toISOString(),
    });

    order++;
    postsTodayCount++;

    // Step to next interval
    if (pairPhotos && fileIndex + 1 < files.length) {
      // If pairing 2 photos, step fileIndex by 2 or advance schedule
      fileIndex++;
    }
    fileIndex++;

    // Advance cursor by intervalMinutes
    currentCursor = new Date(currentCursor.getTime() + intervalMinutes * 60 * 1000);

    // If day wraps or daily limit hit
    if (postsTodayCount >= postsPerDay) {
      postsTodayCount = 0;
      // Advance to next day at startHour:startMin
      const nextDay = new Date(currentCursor);
      nextDay.setDate(nextDay.getDate() + 1);
      nextDay.setHours(startHour, startMin, 0, 0);
      if (nextDay.getTime() > currentCursor.getTime()) {
        currentCursor = nextDay;
      }
    }
  }

  return result;
}
