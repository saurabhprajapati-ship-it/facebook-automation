import { NextResponse } from 'next/server';
import { getDbFromReq, saveDbAsync } from '@/lib/db';
import { getUserFromReq } from '@/lib/auth-db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const user = await getUserFromReq(req);
  const db = await getDbFromReq(req);

  const isAdmin =
    user?.role === 'admin' ||
    user?.email === 'saurabhprajapatidev@gmail.com' ||
    user?.id === 'usr_admin_saurabh';

  let notifications = db.notifications || [];
  if (user && user.role !== 'admin' && user.email !== 'saurabhprajapatidev@gmail.com') {
    notifications = notifications.filter((n) => n.userId === user.id);
  }


  return NextResponse.json({
    notifications,
    preferences: db.notificationPreferences,
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    },
  });
}

export async function POST(req: Request) {
  try {
    const user = await getUserFromReq(req);
    const body = await req.json();
    const { action, preferences } = body;
    const db = await getDbFromReq(req);

    const isAdmin =
      user?.role === 'admin' ||
      user?.email === 'saurabhprajapatidev@gmail.com' ||
      user?.id === 'usr_admin_saurabh';

    if (action === 'clear') {
      let remaining = db.notifications || [];
      if (user) {
        if (isAdmin) {
          remaining = remaining.filter(
            (n) => n.userId && n.userId !== user.id && n.userId !== 'usr_admin_saurabh'
          );
        } else {
          remaining = remaining.filter((n) => n.userId !== user.id);
        }
      }
      db.notifications = remaining;
      await saveDbAsync({ notifications: remaining });
      return NextResponse.json({ ok: true });
    }

    if (preferences) {
      db.notificationPreferences = {
        ...db.notificationPreferences,
        ...preferences,
      };
      await saveDbAsync({ notificationPreferences: db.notificationPreferences });
      return NextResponse.json({ ok: true, preferences: db.notificationPreferences });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
