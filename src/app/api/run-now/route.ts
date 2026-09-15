import { NextResponse } from 'next/server';
import { executeAutomation } from '@/lib/scheduler';
import { getDb } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { automationId, dryRun = false } = await req.json();

    const db = getDb();
    let targetId = automationId;

    if (!targetId) {
      const first = db.automations[0];
      if (!first) {
        return NextResponse.json({ error: 'Please create an automation setup first in Auto Post.' }, { status: 400 });
      }
      targetId = first.id;
    }

    const result = await executeAutomation(targetId, Boolean(dryRun));
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message || 'Execution error' }, { status: 500 });
  }
}
