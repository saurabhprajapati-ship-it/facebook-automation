import { NextResponse } from 'next/server';
import { getMasterUsers, saveMasterUsers, hashPassword, createSessionToken } from '@/lib/auth-db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { email, name, avatarUrl } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Google email is required' }, { status: 400 });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const users = await getMasterUsers();
    let user = users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      // Auto-register new Google user
      const isSaurabhAdmin = cleanEmail === 'saurabhprajapatidev@gmail.com';
      user = {
        id: isSaurabhAdmin ? 'usr_admin_saurabh' : 'usr_g_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        name: name || (cleanEmail.split('@')[0]),
        email: cleanEmail,
        passwordHash: hashPassword('google_oauth_authorized_' + cleanEmail),
        role: isSaurabhAdmin ? 'admin' : 'user',
        avatarUrl: avatarUrl || undefined,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
      users.push(user);
      await saveMasterUsers(users);
    } else {
      user.lastLoginAt = new Date().toISOString();
      if (avatarUrl && !user.avatarUrl) user.avatarUrl = avatarUrl;
      await saveMasterUsers(users);
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      driveFolderId: user.driveFolderId,
    };

    const sessionToken = createSessionToken(safeUser);

    const res = NextResponse.json({ ok: true, user: safeUser, token: sessionToken });

    res.cookies.set('postnova_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Google authentication failed' }, { status: 500 });
  }
}
