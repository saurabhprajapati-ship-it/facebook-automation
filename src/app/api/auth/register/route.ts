import { NextResponse } from 'next/server';
import { getMasterUsers, saveMasterUsers, hashPassword, MasterUser } from '@/lib/auth-db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { name, email, password, driveFolderId } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const users = await getMasterUsers();

    if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 });
    }

    const newUser: MasterUser = {
      id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: String(name).trim(),
      email: cleanEmail,
      passwordHash: hashPassword(password),
      role: users.length === 0 ? 'admin' : 'user',
      driveFolderId: driveFolderId || undefined,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    users.push(newUser);
    await saveMasterUsers(users);

    const safeUser = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      driveFolderId: newUser.driveFolderId,
    };

    const res = NextResponse.json({ ok: true, user: safeUser });

    res.cookies.set('postnova_session', newUser.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Registration failed' }, { status: 500 });
  }
}
