import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';

export async function GET() {
  const db = getDb();
  return NextResponse.json({
    notifications: db.notifications,
    preferences: db.notificationPreferences,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, preferences } = body;
    const db = getDb();

    if (action === 'clear') {
      db.notifications = [];
      saveDb({ notifications: [] });
      return NextResponse.json({ ok: true });
    }

    if (preferences) {
      db.notificationPreferences = {
        ...db.notificationPreferences,
        ...preferences,
      };
      saveDb({ notificationPreferences: db.notificationPreferences });
      return NextResponse.json({ ok: true, preferences: db.notificationPreferences });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
