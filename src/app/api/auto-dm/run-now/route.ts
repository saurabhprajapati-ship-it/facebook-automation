import { NextResponse } from 'next/server';
import { getDb, saveDb, AutoDmLog } from '@/lib/db';
import {
  fetchInstagramRecentMedia,
  fetchMediaComments,
  sendInstagramPrivateReply,
  sendInstagramPublicReply,
} from '@/lib/instagram';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const db = getDb();
    const rules = (db.autoDmRules || []).filter((r) => r.enabled);

    if (!rules.length) {
      return NextResponse.json({
        ok: true,
        message: 'No active Auto-DM rules found. Please create and enable a rule first.',
        sentCount: 0,
      });
    }

    let totalDmsSent = 0;
    let totalErrors = 0;
    const executionLogs: AutoDmLog[] = [];

    for (const rule of rules) {
      const account = db.accounts.find(
        (a) => a.id === rule.targetAccountId || a.pageId === rule.targetAccountId || a.igUserId === rule.targetAccountId
      );

      if (!account || !account.pageAccessToken) {
        console.warn(`Account for rule "${rule.name}" not found or has no access token.`);
        continue;
      }

      const igUserId = account.igUserId || account.pageId;
      const pageId = account.pageId || igUserId;
      const token = account.pageAccessToken;

      // Determine which media to scan
      let mediaItems: { id: string }[] = [];
      if (rule.mediaFilter === 'specific' && rule.specificMediaId) {
        mediaItems = [{ id: rule.specificMediaId }];
      } else {
        const recent = await fetchInstagramRecentMedia(igUserId, token, 6);
        mediaItems = recent.map((m) => ({ id: m.id }));
      }

      if (!mediaItems.length) continue;

      const processedSet = new Set(rule.processedCommentIds || []);

      for (const media of mediaItems) {
        const comments = await fetchMediaComments(media.id, token);

        for (const comment of comments) {
          if (processedSet.has(comment.id)) {
            continue; // Already processed
          }

          // Keyword check
          const commentText = (comment.text || '').toLowerCase().trim();
          let matched = false;
          let matchedKeyword = '';

          if (!rule.triggerKeywords || rule.triggerKeywords.length === 0) {
            matched = true;
            matchedKeyword = 'all';
          } else {
            for (const kw of rule.triggerKeywords) {
              const cleanKw = kw.toLowerCase().trim();
              if (rule.matchType === 'exact') {
                if (commentText === cleanKw) {
                  matched = true;
                  matchedKeyword = cleanKw;
                  break;
                }
              } else {
                // 'contains' or default
                if (commentText.includes(cleanKw)) {
                  matched = true;
                  matchedKeyword = cleanKw;
                  break;
                }
              }
            }
          }

          if (matched) {
            // Anti-ban human jitter (3000ms delay)
            await new Promise((r) => setTimeout(r, 3000));

            // Personalize message if {username} is in template
            const personalizedMessage = rule.dmMessage.replace(
              /\{username\}/gi,
              `@${comment.username || 'friend'}`
            );

            // 1. Send Private Reply DM
            const dmRes = await sendInstagramPrivateReply(pageId, comment.id, personalizedMessage, token);

            let replyStatus: 'sent' | 'failed' | 'skipped' = 'skipped';

            if (dmRes.ok) {
              totalDmsSent++;
              rule.stats.totalSent = (rule.stats.totalSent || 0) + 1;
              rule.stats.lastTriggeredAt = new Date().toISOString();
              processedSet.add(comment.id);

              // 2. Send Public Reply if configured
              if (rule.publicReplyMessage && rule.publicReplyMessage.trim()) {
                const publicReplyText = rule.publicReplyMessage.replace(
                  /\{username\}/gi,
                  `@${comment.username || 'friend'}`
                );
                const pubRes = await sendInstagramPublicReply(comment.id, publicReplyText, token);
                replyStatus = pubRes.ok ? 'sent' : 'failed';
              }

              const log: AutoDmLog = {
                id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                ruleId: rule.id,
                ruleName: rule.name,
                platform: 'instagram',
                commentId: comment.id,
                username: comment.username || 'user',
                commentText: comment.text,
                matchedKeyword: matchedKeyword,
                dmStatus: 'sent',
                replyStatus: replyStatus,
                timestamp: new Date().toISOString(),
              };
              executionLogs.push(log);
            } else {
              const isAlreadyReplied =
                dmRes.error &&
                (dmRes.error.includes('already has a reply') ||
                  dmRes.error.includes('already been sent') ||
                  dmRes.error.includes('ALREADY_REPLIED') ||
                  dmRes.error.includes('(#-1)'));

              if (isAlreadyReplied) {
                processedSet.add(comment.id);
                const log: AutoDmLog = {
                  id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                  ruleId: rule.id,
                  ruleName: rule.name,
                  platform: 'instagram',
                  commentId: comment.id,
                  username: comment.username || 'user',
                  commentText: comment.text,
                  matchedKeyword: matchedKeyword,
                  dmStatus: 'already_replied',
                  replyStatus: 'skipped',
                  timestamp: new Date().toISOString(),
                  error: 'Already replied previously on Instagram',
                };
                executionLogs.push(log);
              } else {
                totalErrors++;
                const log: AutoDmLog = {
                  id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                  ruleId: rule.id,
                  ruleName: rule.name,
                  platform: 'instagram',
                  commentId: comment.id,
                  username: comment.username || 'user',
                  commentText: comment.text,
                  matchedKeyword: matchedKeyword,
                  dmStatus: 'failed',
                  replyStatus: 'skipped',
                  timestamp: new Date().toISOString(),
                  error: dmRes.error,
                };
                executionLogs.push(log);
              }
            }

            // Cap at 10 DMs per manual scan to stay well below rate limits
            if (totalDmsSent >= 10) break;
          }
        }

        if (totalDmsSent >= 10) break;
      }

      // Keep last 1500 processed comment IDs
      rule.processedCommentIds = Array.from(processedSet).slice(-1500);
    }

    // Append logs
    const existingLogs = db.autoDmLogs || [];
    const combinedLogs = [...existingLogs, ...executionLogs].slice(-200); // Keep last 200 logs

    saveDb({
      autoDmRules: db.autoDmRules,
      autoDmLogs: combinedLogs,
    });

    return NextResponse.json({
      ok: true,
      message: `Scanned comments successfully. Sent ${totalDmsSent} automated DM(s).`,
      sentCount: totalDmsSent,
      errorsCount: totalErrors,
      newLogs: executionLogs,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Auto-DM scan failed' }, { status: 500 });
  }
}
