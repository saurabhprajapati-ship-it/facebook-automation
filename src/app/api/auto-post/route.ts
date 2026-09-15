import { NextResponse } from 'next/server';
import { getDb, saveDb, Automation } from '@/lib/db';

export async function GET() {
  const db = getDb();
  return NextResponse.json({ automations: db.automations });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      kind = 'ai',
      topic,
      language = 'English',
      postLength = 'medium',
      customLink,
      textBeforeLink,
      addPicture = true,
      addHashtags = true,
      feedType,
      feedUrl,
      postsPerDay = 3,
      waitHours = 4,
      timeFrom = '08:00',
      timeUntil = '22:00',
      targetAccountIds = [],
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const db = getDb();
    const newAuto: Automation = {
      id: 'auto_' + Date.now(),
      name,
      kind,
      enabled: true,
      topic,
      language,
      postLength,
      customLink,
      textBeforeLink,
      addPicture,
      addHashtags,
      feedType,
      feedUrl,
      postsPerDay: Number(postsPerDay) || 3,
      waitHours: Number(waitHours) || 4,
      timeFrom,
      timeUntil,
      targetAccountIds,
      nextRunAt: new Date(Date.now() + 60000).toISOString(),
    };

    db.automations.push(newAuto);
    saveDb({ automations: db.automations });

    return NextResponse.json({ ok: true, automation: newAuto });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save automation' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, enabled } = body;
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const db = getDb();
    const auto = db.automations.find((a) => a.id === id);
    if (!auto) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (enabled !== undefined) auto.enabled = enabled;
    saveDb({ automations: db.automations });

    return NextResponse.json({ ok: true, automation: auto });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

  const db = getDb();
  const updated = db.automations.filter((a) => a.id !== id);
  saveDb({ automations: updated });
  return NextResponse.json({ ok: true });
}
