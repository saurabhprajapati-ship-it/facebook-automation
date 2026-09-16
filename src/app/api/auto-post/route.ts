import { NextResponse } from 'next/server';
import { getDbFromReq, saveDbAsync, extractDriveFromReq, Automation } from '@/lib/db';
import { getUserFromReq } from '@/lib/auth-db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const user = await getUserFromReq(req);
  const db = await getDbFromReq(req);
  let automations = db.automations || [];

  if (user) {
    const isAdmin = user.role === 'admin' || user.email === 'saurabhprajapatidev@gmail.com' || user.id === 'usr_admin_saurabh';
    if (isAdmin) {
      automations = automations.filter((a) => !a.userId || a.userId === user.id || a.userId === 'usr_admin_saurabh');
    } else {
      automations = automations.filter((a) => a.userId === user.id);
    }
  } else {
    automations = [];
  }

  return NextResponse.json({ automations });
}

export async function POST(req: Request) {
  try {
    const user = await getUserFromReq(req);
    const activeUserId = user ? user.id : 'usr_admin_saurabh';
    const driveCreds = extractDriveFromReq(req);

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

    const db = await getDbFromReq(req);
    const newAuto: Automation = {
      id: 'auto_' + Date.now(),
      userId: activeUserId,
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
    await saveDbAsync({ automations: db.automations }, driveCreds);

    return NextResponse.json({ ok: true, automation: newAuto });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save automation' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const driveCreds = extractDriveFromReq(req);
    const body = await req.json();
    const { id, enabled } = body;
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const db = await getDbFromReq(req);
    const auto = db.automations.find((a) => a.id === id);
    if (!auto) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (enabled !== undefined) auto.enabled = enabled;
    await saveDbAsync({ automations: db.automations }, driveCreds);

    return NextResponse.json({ ok: true, automation: auto });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const driveCreds = extractDriveFromReq(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

  const db = await getDbFromReq(req);
  const updated = db.automations.filter((a) => a.id !== id);
  await saveDbAsync({ automations: updated }, driveCreds);
  return NextResponse.json({ ok: true });
}
