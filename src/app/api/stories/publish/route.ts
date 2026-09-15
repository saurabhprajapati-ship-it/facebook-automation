import { NextResponse } from 'next/server';
import { getDb, saveDb, NotificationItem } from '@/lib/db';
import { publishInstagramStory, publishFacebookStory } from '@/lib/instagram';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { accountId, imageUrl, platform = 'instagram' } = body;

    if (!accountId || !imageUrl) {
      return NextResponse.json(
        { error: 'Account ID and a public image URL are required to publish a Story.' },
        { status: 400 }
      );
    }

    const db = getDb();

    if (accountId === 'both') {
      const fbAccount = db.accounts.find((a) => a.platform === 'facebook');
      const igAccount = db.accounts.find((a) => a.platform === 'instagram');
      if (!fbAccount && !igAccount) {
        return NextResponse.json({ error: 'No active Facebook or Instagram account connected' }, { status: 400 });
      }

      const publishedStoryIds: string[] = [];

      if (igAccount) {
        const igUserId = igAccount.igUserId || igAccount.pageId;
        const igRes = await publishInstagramStory(igUserId, imageUrl, igAccount.pageAccessToken);
        if (igRes.ok && igRes.mediaId) {
          publishedStoryIds.push('IG:' + igRes.mediaId);
        }
      }

      if (fbAccount) {
        const fbRes = await publishFacebookStory(fbAccount.pageId, imageUrl, fbAccount.pageAccessToken);
        if (fbRes.ok && fbRes.storyId) {
          publishedStoryIds.push('FB:' + fbRes.storyId);
        }
      }

      const notif: NotificationItem = {
        id: 'notif_' + Date.now(),
        type: 'live',
        title: 'Story Published to Both! 📸🌐',
        message: `Story successfully published to both Facebook & Instagram!`,
        createdAt: new Date().toISOString(),
      };
      db.notifications.unshift(notif);
      saveDb({ notifications: db.notifications });

      return NextResponse.json({
        ok: true,
        message: 'Story published successfully to both Facebook & Instagram!',
        storyId: publishedStoryIds.join(', '),
      });
    }

    const account = db.accounts.find(
      (a) => a.id === accountId || a.pageId === accountId || a.igUserId === accountId
    );

    if (!account || !account.pageAccessToken) {
      return NextResponse.json({ error: 'Selected account not found or lacks access token' }, { status: 404 });
    }

    let result: { ok: boolean; mediaId?: string; storyId?: string; error?: string };

    if (platform === 'instagram' || account.platform === 'instagram') {
      const igUserId = account.igUserId || account.pageId;
      result = await publishInstagramStory(igUserId, imageUrl, account.pageAccessToken);
    } else {
      result = await publishFacebookStory(account.pageId, imageUrl, account.pageAccessToken);
    }

    if (!result.ok) {
      return NextResponse.json({ error: result.error || 'Failed to publish story' }, { status: 500 });
    }

    // Add success notification
    const notif: NotificationItem = {
      id: 'notif_' + Date.now(),
      type: 'live',
      title: 'Story Published Live! 📸',
      message: `Story successfully published to ${account.name} on ${platform === 'instagram' ? 'Instagram' : 'Facebook'}.`,
      createdAt: new Date().toISOString(),
    };
    db.notifications.unshift(notif);
    saveDb({ notifications: db.notifications });

    return NextResponse.json({
      ok: true,
      message: 'Story published successfully!',
      storyId: result.mediaId || result.storyId,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Story publishing failed' }, { status: 500 });
  }
}
