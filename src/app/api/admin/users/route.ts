import { NextResponse } from 'next/server';
import { getMasterUsers, getUserFromReq } from '@/lib/auth-db';
import { getDbFromReq } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await getUserFromReq(req);
    const isAdmin =
      user?.role === 'admin' ||
      user?.email === 'saurabhprajapatidev@gmail.com' ||
      user?.id === 'usr_admin_saurabh';

    if (!isAdmin) {
      return NextResponse.json({ error: 'Access denied. Admin authorization required.' }, { status: 403 });
    }

    const masterUsers = await getMasterUsers();
    const db = await getDbFromReq(req);
    const allAccounts = db.accounts || [];

    const userList = masterUsers.map((u) => {
      const userAccounts = allAccounts.filter(
        (a) => a.userId === u.id || (u.id === 'usr_admin_saurabh' && (!a.userId || a.userId === 'usr_admin_saurabh'))
      );

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role || 'user',
        avatarUrl: u.avatarUrl,
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt,
        accountsCount: userAccounts.length,
        accounts: userAccounts.map((a) => ({
          id: a.id,
          name: a.name,
          platform: a.platform,
          active: a.active,
        })),
      };
    });

    return NextResponse.json({
      ok: true,
      totalUsers: userList.length,
      users: userList,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to retrieve users' }, { status: 500 });
  }
}
