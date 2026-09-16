import { NextResponse } from 'next/server';
import { getDbFromReq, saveDbAsync, extractDriveFromReq } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const db = await getDbFromReq(req);
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
    const driveCreds = extractDriveFromReq(req);
    const body = await req.json();
    const db = await getDbFromReq(req);

    const { accountName, accountId, ...brandingFields } = body;

    // Persist all custom account names if provided in customAccountNames map
    if (brandingFields.customAccountNames && typeof brandingFields.customAccountNames === 'object') {
      for (const [id, customName] of Object.entries(brandingFields.customAccountNames)) {
        if (customName && typeof customName === 'string') {
          const acc = db.accounts.find((a) => a.id === id || a.pageId === id);
          if (acc) {
            acc.name = customName.trim();
          }
        }
      }
    }

    // Persist single custom account name if provided
    if (accountName && typeof accountName === 'string') {
      const trimmed = accountName.trim();
      if (trimmed && db.accounts.length > 0) {
        const targetId = accountId || db.accounts[0].id;
        const acc = db.accounts.find((a) => a.id === targetId || a.pageId === targetId) || db.accounts[0];
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

    await saveDbAsync({
      branding: updated,
      accounts: db.accounts,
    }, driveCreds);

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

