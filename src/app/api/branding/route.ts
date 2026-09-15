import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = getDb();
  return NextResponse.json({
    branding: db.branding,
    accounts: db.accounts,
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const db = getDb();

    const { accountName, accountId, ...brandingFields } = body;

    // Persist custom account name if provided
    if (accountName && typeof accountName === 'string') {
      const trimmed = accountName.trim();
      if (trimmed && db.accounts.length > 0) {
        const targetId = accountId || db.accounts[0].id;
        const acc = db.accounts.find((a) => a.id === targetId) || db.accounts[0];
        acc.name = trimmed;
        if (!brandingFields.customAccountNames) {
          brandingFields.customAccountNames = db.branding.customAccountNames || {};
        }
        brandingFields.customAccountNames[acc.id] = trimmed;
      }
    }

    const updated = {
      ...db.branding,
      ...brandingFields,
    };

    saveDb({
      branding: updated,
      accounts: db.accounts,
    });

    return NextResponse.json({
      ok: true,
      branding: updated,
      accounts: db.accounts,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
