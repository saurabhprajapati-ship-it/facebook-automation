import { NextResponse } from 'next/server';
import { getDb, saveDb, saveDbAsync, extractDriveFromReq, getActiveDriveCredentials, syncDbFromDrive, syncDbToDrive, PostRecord, NotificationItem, AutoDmLog } from '@/lib/db';
import { getDriveFileBuffer, saveDriveDatabase } from '@/lib/google-drive';
import { publishBufferToFacebook } from '@/lib/facebook';
import { generateCaptionForMedia } from '@/lib/gemini';
import { processBrandedImageBuffer } from '@/lib/image-banner';
import {
  fetchInstagramRecentMedia,
  fetchMediaComments,
  sendInstagramPrivateReply,
  sendInstagramPublicReply,
  publishInstagramFeedPost,
  uploadBufferToMetaCdn,
  formatPersonalizedMessage,
} from '@/lib/instagram';

export async function GET(req: Request) {
  return handleCron(req);
}

export async function POST(req: Request) {
  return handleCron(req);
}

async function processAutoDmCron(db: ReturnType<typeof getDb>) {
  const rules = (db.autoDmRules || []).filter((r) => r.enabled);
  if (!rules.length) return { rulesChecked: 0, dmsSent: 0, logsAdded: 0 };

  let dmsSent = 0;
  const executionLogs: AutoDmLog[] = [];

  for (const rule of rules) {
    try {
      const account = db.accounts.find(
        (a) => a.id === rule.targetAccountId || a.pageId === rule.targetAccountId || a.igUserId === rule.targetAccountId
      );
      if (!account || !account.pageAccessToken) continue;

      const igUserId = account.igUserId || account.pageId;
      const pageId = account.pageId || igUserId;
      const token = account.pageAccessToken;

      let mediaItems: { id: string }[] = [];
      if (rule.mediaFilter === 'specific' && rule.specificMediaId) {
        mediaItems = [{ id: rule.specificMediaId }];
      } else {
        const recent = await fetchInstagramRecentMedia(igUserId, token, 4);
        mediaItems = recent.map((m) => ({ id: m.id }));
      }

      const processedSet = new Set(rule.processedCommentIds || []);

      for (const media of mediaItems) {
        const comments = await fetchMediaComments(media.id, token);
        for (const comment of comments) {
          if (processedSet.has(comment.id)) continue;

          // Skip comments made by the page owner itself
          if (
            account.username &&
            comment.username &&
            comment.username.toLowerCase().trim() === account.username.toLowerCase().trim()
          ) {
            continue;
          }

          const commentText = (comment.text || '').toLowerCase().trim();
          let matched = false;
          let matchedKeyword = '';

          if (!rule.triggerKeywords || rule.triggerKeywords.length === 0) {
            matched = true;
            matchedKeyword = 'all';
          } else {
            for (const kw of rule.triggerKeywords) {
              const cleanKw = kw.toLowerCase().trim();
              if (rule.matchType === 'exact' ? commentText === cleanKw : commentText.includes(cleanKw)) {
                matched = true;
                matchedKeyword = cleanKw;
                break;
              }
            }
          }

          if (matched) {
            // Anti-ban human jitter (5000ms delay in cron)
            await new Promise((r) => setTimeout(r, 5000));

            const personalized = formatPersonalizedMessage(rule.dmMessage, comment);
            const dmRes = await sendInstagramPrivateReply(pageId, comment.id, personalized, token, rule.buttons);

            if (dmRes.ok) {
              dmsSent++;
              rule.stats.totalSent = (rule.stats.totalSent || 0) + 1;
              rule.stats.lastTriggeredAt = new Date().toISOString();
              processedSet.add(comment.id);

              let replyStatus: 'sent' | 'failed' | 'skipped' = 'skipped';
              if (rule.publicReplyMessage && rule.publicReplyMessage.trim()) {
                const pubMsg = formatPersonalizedMessage(rule.publicReplyMessage, comment);
                const pubRes = await sendInstagramPublicReply(comment.id, pubMsg, token);
                replyStatus = pubRes.ok ? 'sent' : 'failed';
              }

              executionLogs.push({
                id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                ruleId: rule.id,
                ruleName: rule.name,
                platform: 'instagram',
                commentId: comment.id,
                username: comment.username || 'user',
                commentText: comment.text,
                matchedKeyword,
                dmStatus: 'sent',
                replyStatus,
                timestamp: new Date().toISOString(),
              });
            } else {
              const isAlreadyReplied =
                dmRes.error &&
                (dmRes.error.includes('already has a reply') ||
                  dmRes.error.includes('already been sent') ||
                  dmRes.error.includes('ALREADY_REPLIED') ||
                  dmRes.error.includes('(#-1)'));

              if (isAlreadyReplied) {
                processedSet.add(comment.id);
                executionLogs.push({
                  id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                  ruleId: rule.id,
                  ruleName: rule.name,
                  platform: 'instagram',
                  commentId: comment.id,
                  username: comment.username || 'user',
                  commentText: comment.text,
                  matchedKeyword,
                  dmStatus: 'already_replied',
                  replyStatus: 'skipped',
                  timestamp: new Date().toISOString(),
                  error: 'Already replied previously on Instagram',
                });
              } else {
                executionLogs.push({
                  id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                  ruleId: rule.id,
                  ruleName: rule.name,
                  platform: 'instagram',
                  commentId: comment.id,
                  username: comment.username || 'user',
                  commentText: comment.text,
                  matchedKeyword,
                  dmStatus: 'failed',
                  replyStatus: 'skipped',
                  timestamp: new Date().toISOString(),
                  error: dmRes.error,
                });
              }
            }

            if (dmsSent >= 5) break;
          }
        }
        if (dmsSent >= 5) break;
      }
      rule.processedCommentIds = Array.from(processedSet).slice(-1500);
    } catch (ruleErr) {
      console.error(`Auto-DM rule ${rule.id} failed in cron:`, ruleErr);
    }
  }

  if (executionLogs.length > 0) {
    const existing = db.autoDmLogs || [];
    db.autoDmLogs = [...existing, ...executionLogs].slice(-200);
  }

  return { rulesChecked: rules.length, dmsSent, logsAdded: executionLogs.length };
}

async function handleCron(req: Request) {
  const driveCreds = extractDriveFromReq(req);
  // Synchronize latest database state from Google Drive (ensures serverless cold starts have latest data)
  await syncDbFromDrive(driveCreds);
  const db = getDb();
  const queue = db.scheduledQueue || [];
  const now = new Date();

  // Run Auto-DM engine on every cron tick
  const autoDmResult = await processAutoDmCron(db);

  // Find due posts
  const dueItems = queue.filter(
    (item) => item.status === 'scheduled' && new Date(item.scheduledAt) <= now
  );

  if (!dueItems.length) {
    // If auto-DMs were processed or logs were added, persist them
    if (autoDmResult.dmsSent > 0 || (autoDmResult.logsAdded || 0) > 0) {
      await saveDbAsync({
        autoDmRules: db.autoDmRules,
        autoDmLogs: db.autoDmLogs,
      }, driveCreds);
    }

    return NextResponse.json({
      ok: true,
      message: 'No posts due at this time',
      currentTime: now.toISOString(),
      pendingInQueue: queue.filter((q) => q.status === 'scheduled').length,
      autoDm: autoDmResult,
    });
  }

  const results: any[] = [];
  // Process up to 2 due items per cron trigger to remain well within timeouts
  const batch = dueItems.slice(0, 2);

  for (const item of batch) {
    item.status = 'posting';
    saveDb({ scheduledQueue: queue });

    try {
      const isBoth = item.targetAccountId === 'both';
      const fbAccount = db.accounts.find((a) => a.platform === 'facebook');
      const igAccount = db.accounts.find((a) => a.platform === 'instagram');
      const account = db.accounts.find(
        (a) => a.id === item.targetAccountId || a.pageId === item.targetAccountId
      );

      if (isBoth) {
        if (!fbAccount && !igAccount) {
          throw new Error('No active Facebook or Instagram accounts connected');
        }
      } else if (!account) {
        throw new Error(`Target Account (${item.targetAccountId}) not found`);
      }

      // Ensure caption exists
      let caption = item.caption;
      if (!caption || !caption.trim()) {
        caption = await generateCaptionForMedia({ fileName: item.fileName });
        item.caption = caption;
        item.captionSource = 'ai';
      }

      // Get buffer from Drive
      const { credentialsJson: activeDriveKey } = getActiveDriveCredentials(db, driveCreds);
      if (!activeDriveKey || !item.fileId) {
        throw new Error('Google Drive credentials or File ID missing');
      }

      const { buffer, mimeType, name } = await getDriveFileBuffer(
        activeDriveKey,
        item.fileId
      );

      const isVideo = item.fileType === 'video' || mimeType.startsWith('video/');
      const branding = db.branding;

      if (isBoth) {
        const publishedIds: string[] = [];

        // 1. Post to Facebook
        if (fbAccount) {
          let fbBuffer = buffer;
          let fbMime = mimeType;
          if (!isVideo && branding?.enabledOnAuto) {
            try {
              const accountDisplayName = branding.customAccountNames?.[fbAccount.id] || fbAccount.name;
              fbBuffer = await processBrandedImageBuffer(buffer, {
                accountName: accountDisplayName,
                bottomText: branding.bottomText,
                barColor: branding.barColor,
                textColor: branding.textColor,
                font: branding.font,
                look: branding.look,
                headlineBanner: Boolean(branding.headlineBanner),
                showTopBadge: Boolean(branding.showTopBadge),
                showBottomBar: branding.showBottomBar !== false,
                watermarkMode: branding.watermarkMode || 'logo_stamp',
                logoUrl: branding.logoUrl,
                pageId: fbAccount.pageId,
              });
              fbMime = 'image/jpeg';
            } catch (brandErr) {
              console.warn('Failed to apply branding overlay for FB in cron:', brandErr);
            }
          }

          try {
            const publishRes = await publishBufferToFacebook({
              pageId: fbAccount.pageId,
              pageToken: fbAccount.pageAccessToken,
              buffer: fbBuffer,
              fileName: name || item.fileName,
              mimeType: fbMime,
              caption,
              isVideo,
            });
            if (publishRes.postId) {
              publishedIds.push(publishRes.postId);
              db.posts.unshift({
                id: 'post_' + Date.now() + '_fb',
                accountName: fbAccount.name,
                title: item.fileName,
                caption,
                fbPostId: publishRes.postId,
                status: 'live',
                createdAt: new Date().toISOString(),
              });
            }
          } catch (fbErr) {
            console.error('Cron FB post error:', fbErr);
          }
        }

        // 2. Post to Instagram
        if (igAccount) {
          try {
            let igBuffer = buffer;
            let igMime = mimeType;
            if (!isVideo && branding?.enabledOnAuto !== false) {
              try {
                const igDisplayName = branding?.customAccountNames?.[igAccount.id] || (igAccount.username ? `@${igAccount.username}` : igAccount.name);
                igBuffer = await processBrandedImageBuffer(buffer, {
                  accountName: igDisplayName,
                  bottomText: branding?.bottomText || 'For more content, Like and Share',
                  barColor: branding?.barColor || '#E60023',
                  textColor: branding?.textColor || '#FFFFFF',
                  font: branding?.font || 'Poppins',
                  look: branding?.look || '3D',
                  headlineBanner: Boolean(branding?.headlineBanner),
                  showTopBadge: Boolean(branding?.showTopBadge),
                  showBottomBar: branding?.showBottomBar !== false,
                  watermarkMode: branding?.watermarkMode || 'logo_stamp',
                  logoUrl: branding?.logoUrl,
                  pageId: igAccount.pageId,
                });
                igMime = 'image/jpeg';
              } catch (brandErr) {
                console.warn('Failed to apply branding for IG in cron:', brandErr);
              }
            }

            const cdnUrl = await uploadBufferToMetaCdn(
              igAccount.pageId,
              igBuffer,
              name || item.fileName,
              igMime,
              igAccount.pageAccessToken
            );
            const igUserId = igAccount.igUserId || igAccount.pageId;
            const igRes = await publishInstagramFeedPost(igUserId, cdnUrl, caption, igAccount.pageAccessToken);
            if (igRes.ok && igRes.postId) {
              publishedIds.push(igRes.postId);
              db.posts.unshift({
                id: 'post_' + Date.now() + '_ig',
                accountName: igAccount.username ? `@${igAccount.username}` : igAccount.name,
                title: item.fileName,
                caption,
                fbPostId: igRes.postId,
                status: 'live',
                createdAt: new Date().toISOString(),
              });
            }
          } catch (igErr) {
            console.error('Cron IG post error:', igErr);
          }
        }

        if (publishedIds.length === 0) {
          throw new Error('Failed to post to both Facebook and Instagram');
        }

        item.status = 'posted';
        item.fbPostId = publishedIds.join(', ');
        item.postedAt = new Date().toISOString();
        item.error = undefined;

        db.notifications.unshift({
          id: 'notif_' + Date.now(),
          type: 'live',
          title: 'Auto Post Published',
          message: `Scheduled post ${item.fileName} is live on both Facebook & Instagram!`,
          createdAt: new Date().toISOString(),
        });

        results.push({ id: item.id, status: 'posted', postId: publishedIds.join(', ') });
        continue;
      }

      // Single account
      let publishBuffer = buffer;
      let finalMime = mimeType;

      // Apply Watermark Removal & Dynamic Page Branding if image and branding is enabled
      if (!isVideo && branding?.enabledOnAuto) {
        try {
          const accountDisplayName = branding.customAccountNames?.[account!.id] || account!.name;
          publishBuffer = await processBrandedImageBuffer(buffer, {
            accountName: accountDisplayName,
            bottomText: branding.bottomText,
            barColor: branding.barColor,
            textColor: branding.textColor,
            font: branding.font,
            look: branding.look,
            headlineBanner: Boolean(branding.headlineBanner),
            showTopBadge: Boolean(branding.showTopBadge),
            showBottomBar: branding.showBottomBar !== false,
            watermarkMode: branding.watermarkMode || 'logo_stamp',
            logoUrl: branding.logoUrl,
            pageId: account!.pageId,
          });
          finalMime = 'image/jpeg';
        } catch (brandErr) {
          console.warn('Failed to apply branding overlay, using original buffer:', brandErr);
        }
      }

      let postedId = '';
      if (account!.platform === 'instagram') {
        const cdnUrl = await uploadBufferToMetaCdn(
          account!.pageId,
          publishBuffer,
          name || item.fileName,
          finalMime,
          account!.pageAccessToken
        );
        const igUserId = account!.igUserId || account!.pageId;
        const igRes = await publishInstagramFeedPost(igUserId, cdnUrl, caption, account!.pageAccessToken);
        if (!igRes.ok || !igRes.postId) {
          throw new Error(igRes.error || 'Instagram scheduled posting failed');
        }
        postedId = igRes.postId;
      } else {
        const publishRes = await publishBufferToFacebook({
          pageId: account!.pageId,
          pageToken: account!.pageAccessToken,
          buffer: publishBuffer,
          fileName: name || item.fileName,
          mimeType: finalMime,
          caption,
          isVideo,
        });
        postedId = publishRes.postId;
      }

      item.status = 'posted';
      item.fbPostId = postedId;
      item.postedAt = new Date().toISOString();
      item.error = undefined;

      // Add to posts history
      const postRecord: PostRecord = {
        id: 'post_' + Date.now(),
        accountName: account!.username ? `@${account!.username}` : account!.name,
        title: item.fileName,
        caption,
        fbPostId: postedId,
        status: 'live',
        createdAt: new Date().toISOString(),
      };
      db.posts.unshift(postRecord);

      const notif: NotificationItem = {
        id: 'notif_' + Date.now(),
        type: 'live',
        title: 'Auto Post Published',
        message: `Scheduled post ${item.fileName} is live on ${account!.name}`,
        createdAt: new Date().toISOString(),
      };
      db.notifications.unshift(notif);

      results.push({ id: item.id, status: 'posted', postId: postedId });
    } catch (err: any) {
      item.status = 'failed';
      item.error = err.message || 'Publish failed';

      const failNotif: NotificationItem = {
        id: 'notif_' + Date.now(),
        type: 'failed',
        title: 'Scheduled post failed',
        message: `Failed to post ${item.fileName}: ${err.message}`,
        createdAt: new Date().toISOString(),
      };
      db.notifications.unshift(failNotif);

      results.push({ id: item.id, status: 'failed', error: err.message });
    }
  }

  await saveDbAsync({
    scheduledQueue: queue,
    posts: db.posts,
    notifications: db.notifications,
    autoDmRules: db.autoDmRules,
    autoDmLogs: db.autoDmLogs,
  }, driveCreds);

  // Also preserve legacy scheduler_db.json if folder is set
  const { credentialsJson: legacyKey, folderId: legacyFolder } = getActiveDriveCredentials(db, driveCreds);
  if (legacyKey && legacyFolder) {
    try {
      await saveDriveDatabase(legacyKey, legacyFolder, {
        updatedAt: new Date().toISOString(),
        totalSlots: queue.length,
        queue,
      });
    } catch (syncErr) {
      console.warn('Drive DB sync failed in cron:', syncErr);
    }
  }

  return NextResponse.json({
    ok: true,
    processedCount: batch.length,
    results,
    remainingScheduled: queue.filter((q) => q.status === 'scheduled').length,
  });
}
