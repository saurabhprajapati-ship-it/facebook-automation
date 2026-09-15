import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { fetchInstagramRecentMedia } from '@/lib/instagram';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('accountId');

    const db = getDb();
    let account = accountId
      ? db.accounts.find((a) => (a.id === accountId || a.igUserId === accountId) && a.platform === 'instagram')
        || db.accounts.find((a) => a.id === accountId || a.pageId === accountId)
      : db.accounts.find((a) => a.platform === 'instagram');

    if (!account || account.platform !== 'instagram') {
      account = db.accounts.find((a) => a.platform === 'instagram');
    }

    if (!account) {
      return NextResponse.json({ error: 'No Instagram account found' }, { status: 404 });
    }

    const igUserId = account.igUserId || account.pageId;
    const token = account.pageAccessToken;

    const media = await fetchInstagramRecentMedia(igUserId, token, 20);
    return NextResponse.json({ ok: true, media });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch media' }, { status: 500 });
  }
}
