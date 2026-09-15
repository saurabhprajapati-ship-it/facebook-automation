import { NextResponse } from 'next/server';
import { getDb, saveDb, ScheduledPostItem, NotificationItem, PostRecord } from '@/lib/db';
import { getDriveFileBuffer } from '@/lib/google-drive';
import { publishBufferToFacebook } from '@/lib/facebook';
import { generateCaptionForMedia } from '@/lib/gemini';
import { processBrandedImageBuffer } from '@/lib/image-banner';
import { uploadBufferToMetaCdn, publishInstagramFeedPost } from '@/lib/instagram';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const db = getDb();
  let queue = db.scheduledQueue || [];

  const status = searchParams.get('status');
  if (status) {
    queue = queue.filter((q) => q.status === status);
  }

  const accountId = searchParams.get('accountId');
  if (accountId) {
    queue = queue.filter((q) => q.targetAccountId === accountId);
  }

  return NextResponse.json({
    total: queue.length,
    scheduledCount: queue.filter((q) => q.status === 'scheduled').length,
    postedCount: queue.filter((q) => q.status === 'posted').length,
    failedCount: queue.filter((q) => q.status === 'failed').length,
    items: queue,
  });
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, caption, scheduledAt, status } = body;

    const db = getDb();
    const queue = db.scheduledQueue || [];
    const item = queue.find((q) => q.id === id);

    if (!item) {
      return NextResponse.json({ error: 'Queue item not found' }, { status: 404 });
    }

    if (caption !== undefined) item.caption = caption;
    if (scheduledAt !== undefined) item.scheduledAt = scheduledAt;
    if (status !== undefined) item.status = status;

    saveDb({ scheduledQueue: queue });
    return NextResponse.json({ ok: true, item });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Update failed' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const clearAll = searchParams.get('clearAll') === 'true';

    const db = getDb();
    let queue = db.scheduledQueue || [];

    if (clearAll) {
      // Keep posted records, clear scheduled/failed
      queue = queue.filter((q) => q.status === 'posted');
      saveDb({ scheduledQueue: queue });
      return NextResponse.json({ ok: true, message: 'Queue cleared' });
    }

    if (!id) {
      return NextResponse.json({ error: 'Item ID required' }, { status: 400 });
    }

    queue = queue.filter((q) => q.id !== id);
    saveDb({ scheduledQueue: queue });
    return NextResponse.json({ ok: true, message: 'Item deleted' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Delete failed' }, { status: 500 });
  }
}

// POST: "Post Now" for a specific queue item
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id } = body;

    const db = getDb();
    const queue = db.scheduledQueue || [];
    const item = queue.find((q) => q.id === id);

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Find target account(s)
    const isBoth = item.targetAccountId === 'both';
    let fbAccount = db.accounts.find((a) => a.platform === 'facebook');
    let igAccount = db.accounts.find((a) => a.platform === 'instagram');
    let account = db.accounts.find(
      (a) => a.id === item.targetAccountId || a.pageId === item.targetAccountId
    );

    if (isBoth) {
      if (!fbAccount && !igAccount) {
        return NextResponse.json(
          { error: 'No active Facebook or Instagram accounts connected' },
          { status: 400 }
        );
      }
    } else if (!account) {
      return NextResponse.json(
        { error: 'Target Account not found or disconnected' },
        { status: 400 }
      );
    }

    // Ensure caption exists or generate via AI
    let finalCaption = item.caption;
    if (!finalCaption || !finalCaption.trim()) {
      finalCaption = await generateCaptionForMedia({ fileName: item.fileName });
      item.caption = finalCaption;
      item.captionSource = 'ai';
    }

    // Fetch file buffer from Google Drive
    const driveSettings = db.driveSettings;
    if (!driveSettings?.serviceAccountJson || !item.fileId) {
      return NextResponse.json(
        { error: 'Google Drive credentials or File ID missing' },
        { status: 400 }
      );
    }

    const { buffer, mimeType, name } = await getDriveFileBuffer(
      driveSettings.serviceAccountJson,
      item.fileId
    );

    const isVideo = item.fileType === 'video' || mimeType.startsWith('video/');
    const branding = db.branding;

    // Handle Both simultaneously
    if (isBoth) {
      const publishedIds: string[] = [];

      // 1. Post to Facebook
      if (fbAccount) {
        let fbPublishBuffer = buffer;
        let fbFinalMime = mimeType;
        if (!isVideo && branding?.enabledOnAuto !== false) {
          try {
            const accountDisplayName = branding?.customAccountNames?.[fbAccount.id] || fbAccount.name;
            fbPublishBuffer = await processBrandedImageBuffer(buffer, {
              accountName: accountDisplayName,
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
              pageId: fbAccount.pageId,
            });
            fbFinalMime = 'image/jpeg';
          } catch (brandErr) {
            console.warn('Failed to apply branding for FB bulk post:', brandErr);
          }
        }

        try {
          const publishRes = await publishBufferToFacebook({
            pageId: fbAccount.pageId,
            pageToken: fbAccount.pageAccessToken,
            buffer: fbPublishBuffer,
            fileName: name || item.fileName,
            mimeType: fbFinalMime,
            caption: finalCaption,
            isVideo,
          });
          if (publishRes.postId) {
            publishedIds.push(publishRes.postId);
            db.posts.unshift({
              id: 'post_' + Date.now() + '_fb',
              accountName: fbAccount.name,
              title: item.fileName,
              caption: finalCaption,
              fbPostId: publishRes.postId,
              status: 'live',
              createdAt: new Date().toISOString(),
            });
          }
        } catch (fbErr: any) {
          console.error('FB bulk post error:', fbErr);
        }
      }

      // 2. Post to Instagram
      if (igAccount) {
        try {
          const cdnUrl = await uploadBufferToMetaCdn(
            igAccount.pageId,
            buffer,
            name || item.fileName,
            mimeType,
            igAccount.pageAccessToken
          );
          const igUserId = igAccount.igUserId || igAccount.pageId;
          const igRes = await publishInstagramFeedPost(igUserId, cdnUrl, finalCaption, igAccount.pageAccessToken);
          if (igRes.ok && igRes.postId) {
            publishedIds.push(igRes.postId);
            db.posts.unshift({
              id: 'post_' + Date.now() + '_ig',
              accountName: igAccount.username ? `@${igAccount.username}` : igAccount.name,
              title: item.fileName,
              caption: finalCaption,
              fbPostId: igRes.postId,
              status: 'live',
              createdAt: new Date().toISOString(),
            });
          }
        } catch (igErr: any) {
          console.error('IG bulk post error:', igErr);
        }
      }

      if (publishedIds.length === 0) {
        throw new Error('Failed to post to both Facebook and Instagram');
      }

      item.status = 'posted';
      item.fbPostId = publishedIds.join(', ');
      item.postedAt = new Date().toISOString();
      item.error = undefined;

      const notif: NotificationItem = {
        id: 'notif_' + Date.now(),
        type: 'live',
        title: 'Scheduled post is live',
        message: `Posted ${item.fileName} to both Facebook & Instagram!`,
        createdAt: new Date().toISOString(),
      };
      db.notifications.unshift(notif);

      saveDb({
        scheduledQueue: queue,
        posts: db.posts,
        notifications: db.notifications,
      });

      return NextResponse.json({
        ok: true,
        postId: publishedIds.join(', '),
        platform: 'both',
        item,
      });
    }

    // Single account posting
    let publishBuffer = buffer;
    let finalMime = mimeType;

    // Apply Watermark Removal & Dynamic Page Branding if image and branding is enabled
    if (!isVideo && branding?.enabledOnAuto !== false) {
      try {
        const accountDisplayName = branding?.customAccountNames?.[account!.id] || account!.name;
        publishBuffer = await processBrandedImageBuffer(buffer, {
          accountName: accountDisplayName,
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
          pageId: account!.pageId,
        });
        finalMime = 'image/jpeg';
      } catch (brandErr) {
        console.warn('Failed to apply branding overlay in bulk queue post, using raw buffer:', brandErr);
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
      const igRes = await publishInstagramFeedPost(igUserId, cdnUrl, finalCaption, account!.pageAccessToken);
      if (!igRes.ok || !igRes.postId) {
        throw new Error(igRes.error || 'Instagram posting failed');
      }
      postedId = igRes.postId;
    } else {
      const publishRes = await publishBufferToFacebook({
        pageId: account!.pageId,
        pageToken: account!.pageAccessToken,
        buffer: publishBuffer,
        fileName: name || item.fileName,
        mimeType: finalMime,
        caption: finalCaption,
        isVideo,
      });
      postedId = publishRes.postId;
    }

    item.status = 'posted';
    item.fbPostId = postedId;
    item.postedAt = new Date().toISOString();
    item.error = undefined;

    // Record in global posts history
    const postRecord: PostRecord = {
      id: 'post_' + Date.now(),
      accountName: account!.username ? `@${account!.username}` : account!.name,
      title: item.fileName,
      caption: finalCaption,
      fbPostId: postedId,
      status: 'live',
      createdAt: new Date().toISOString(),
    };
    db.posts.unshift(postRecord);

    const notif: NotificationItem = {
      id: 'notif_' + Date.now(),
      type: 'live',
      title: 'Scheduled post is live',
      message: `Posted ${item.fileName} to ${account!.name} on ${account!.platform === 'instagram' ? 'Instagram' : 'Facebook'}!`,
      createdAt: new Date().toISOString(),
    };
    db.notifications.unshift(notif);

    saveDb({
      scheduledQueue: queue,
      posts: db.posts,
      notifications: db.notifications,
    });

    return NextResponse.json({
      ok: true,
      postId: postedId,
      platform: account!.platform,
      item,
    });
  } catch (err: any) {
    console.error('Post Now error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to publish post' },
      { status: 500 }
    );
  }
}
