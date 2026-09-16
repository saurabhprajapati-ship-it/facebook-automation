import { NextResponse } from 'next/server';
import { getMasterUsers } from '@/lib/auth-db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get('cookie') || '';
    const match = cookieHeader.match(/postnova_session=([^;]+)/);
    const sessionId = match ? match[1] : null;

    const users = await getMasterUsers();

    if (!sessionId) {
      return NextResponse.json({ user: null });
    }

    const user = users.find((u) => u.id === sessionId);
    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        driveFolderId: user.driveFolderId,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
