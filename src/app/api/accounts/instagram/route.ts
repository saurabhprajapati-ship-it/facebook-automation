import { NextResponse } from 'next/server';
import { getDb, saveDb, Account } from '@/lib/db';
import {
  getConnectedInstagramAccount,
  verifyInstagramAccount,
  InstagramAccountInfo,
} from '@/lib/instagram';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDb();
    const instagramAccounts = db.accounts.filter((a) => a.platform === 'instagram');
    const facebookAccounts = db.accounts.filter((a) => a.platform === 'facebook');

    // Attempt auto-discovery from connected Facebook Pages
    const discovered: (InstagramAccountInfo & { fbPageName: string })[] = [];

    for (const fb of facebookAccounts) {
      if (fb.pageAccessToken && fb.pageId) {
        const found = await getConnectedInstagramAccount(fb.pageId, fb.pageAccessToken);
        if (found) {
          discovered.push({
            ...found,
            fbPageName: fb.name,
          });
        }
      }
    }

    return NextResponse.json({
      accounts: instagramAccounts,
      discoveredFromFacebook: discovered,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch Instagram accounts' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { autoConnectFromPageId, igUserId, pageAccessToken, name } = body;
    const db = getDb();

    let accountToAdd: Account | null = null;

    if (autoConnectFromPageId) {
      // Auto-connect from an existing Facebook Page
      const fb = db.accounts.find(
        (a) => a.platform === 'facebook' && (a.pageId === autoConnectFromPageId || a.id === autoConnectFromPageId)
      );

      if (!fb) {
        return NextResponse.json({ error: 'Selected Facebook Page was not found in accounts.' }, { status: 400 });
      }

      const discovered = await getConnectedInstagramAccount(fb.pageId, fb.pageAccessToken);
      if (!discovered) {
        return NextResponse.json(
          {
            error:
              'No Instagram Business account is linked to this Facebook Page yet. Please link your Instagram account to this Facebook Page in the Instagram mobile app under Edit Profile -> Page.',
          },
          { status: 400 }
        );
      }

      accountToAdd = {
        id: 'acc_ig_' + discovered.id,
        platform: 'instagram',
        pageId: fb.pageId,
        igUserId: discovered.id,
        name: discovered.name || `@${discovered.username}`,
        username: discovered.username,
        profilePictureUrl: discovered.profile_picture_url,
        followersCount: discovered.followers_count,
        pageAccessToken: fb.pageAccessToken,
        systemUserToken: fb.systemUserToken,
        active: true,
        addedAt: new Date().toISOString(),
      };
    } else if (igUserId && pageAccessToken) {
      // Manual connection
      const verified = await verifyInstagramAccount(igUserId, pageAccessToken);
      if (!verified.ok || !verified.info) {
        return NextResponse.json(
          { error: verified.error || 'Failed to verify Instagram account with the provided token.' },
          { status: 400 }
        );
      }

      accountToAdd = {
        id: 'acc_ig_' + verified.info.id,
        platform: 'instagram',
        pageId: verified.info.pageId || igUserId,
        igUserId: verified.info.id,
        name: name || verified.info.name || `@${verified.info.username}`,
        username: verified.info.username,
        profilePictureUrl: verified.info.profile_picture_url,
        followersCount: verified.info.followers_count,
        pageAccessToken: pageAccessToken,
        active: true,
        addedAt: new Date().toISOString(),
      };
    } else {
      return NextResponse.json(
        { error: 'Please choose an existing Facebook Page to auto-connect or provide Instagram ID and Token.' },
        { status: 400 }
      );
    }

    // Save to database (update if exists)
    const existingIndex = db.accounts.findIndex(
      (a) => a.platform === 'instagram' && (a.igUserId === accountToAdd!.igUserId || a.id === accountToAdd!.id)
    );

    if (existingIndex >= 0) {
      db.accounts[existingIndex] = {
        ...db.accounts[existingIndex],
        ...accountToAdd,
      };
    } else {
      db.accounts.push(accountToAdd);
    }

    saveDb({ accounts: db.accounts });
    return NextResponse.json({ ok: true, account: accountToAdd });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to connect Instagram account' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

  const db = getDb();
  const updated = db.accounts.filter((a) => a.id !== id);
  saveDb({ accounts: updated });
  return NextResponse.json({ ok: true });
}
