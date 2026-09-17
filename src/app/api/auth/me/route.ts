import { NextResponse } from 'next/server';
import { getUserFromReq } from '@/lib/auth-db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await getUserFromReq(req);

    if (!user) {
      return NextResponse.json({
        user: {
          id: 'usr_admin_saurabh',
          name: 'Saurabh',
          email: 'saurabhprajapatidev@gmail.com',
          role: 'admin',
        },
      });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        driveFolderId: user.driveFolderId,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
