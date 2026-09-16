import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  const res = NextResponse.json({ ok: true, message: 'Logged out successfully' });
  res.cookies.set('postnova_session', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/',
  });
  return res;
}
