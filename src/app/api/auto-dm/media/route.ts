import { NextResponse } from 'next/server';
import { getDbFromReq } from '@/lib/db';
import { fetchInstagramRecentMedia } from '@/lib/instagram';
import { getUserFromReq } from '@/lib/auth-db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('accountId');
    const user = await getUserFromReq(req);
    const db = await getDbFromReq(req);

    const isAdmin =
      user?.role === 'admin' ||
      user?.email === 'saurabhprajapatidev@gmail.com' ||
      user?.id === 'usr_admin_saurabh';

    let userAccounts = db.accounts || [];
    if (user) {
      if (isAdmin) {
        userAccounts = userAccounts.filter(
          (a) => !a.userId || a.userId === user.id || a.userId === 'usr_admin_saurabh'
        );
      } else {
        userAccounts = userAccounts.filter((a) => a.userId === user.id);
      }
    } else {
      userAccounts = [];
    }

    let account = accountId
      ? userAccounts.find((a) => (a.id === accountId || a.igUserId === accountId) && a.platform === 'instagram')
        || userAccounts.find((a) => a.id === accountId || a.pageId === accountId)
      : userAccounts.find((a) => a.platform === 'instagram');

    if (!account || account.platform !== 'instagram') {
      return NextResponse.json({ ok: true, media: [] });
    }

    const igUserId = account.igUserId || account.pageId;
    const token = account.pageAccessToken;

    const media = await fetchInstagramRecentMedia(igUserId, token, 20);
    return NextResponse.json({ ok: true, media });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch media' }, { status: 500 });
  }
}
