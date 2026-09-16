import { NextResponse } from 'next/server';
import { getMasterUsers, saveMasterUsers, hashPassword, createSessionToken } from '@/lib/auth-db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const users = await getMasterUsers();
    const hashed = hashPassword(password);

    const user = users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!user || user.passwordHash !== hashed) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Update lastLoginAt
    user.lastLoginAt = new Date().toISOString();
    await saveMasterUsers(users);

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

    // Set secure cookie
    res.cookies.set('postnova_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Login failed' }, { status: 500 });
  }
}
