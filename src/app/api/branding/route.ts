import { NextResponse } from 'next/server';
import { getDbFromReq, saveDbAsync, extractDriveFromReq, DEFAULT_BRANDING } from '@/lib/db';
import { getUserFromReq } from '@/lib/auth-db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const user = await getUserFromReq(req);
  const db = await getDbFromReq(req);

  const isAdmin =
    user?.role === 'admin' ||
    user?.email === 'saurabhprajapatidev@gmail.com' ||
    user?.id === 'usr_admin_saurabh';

  // Filter accounts by active user
  let userAccounts = db.accounts || [];
  if (user && user.role !== 'admin' && user.email !== 'saurabhprajapatidev@gmail.com') {
    userAccounts = userAccounts.filter((a) => a.userId === user.id);
  } else {
    userAccounts = userAccounts.filter(
      (a) => !a.userId || a.userId === user?.id || a.userId === 'usr_admin_saurabh'
    );
  }

  // User-specific branding
  const userBrandingMap = (db as any).userBranding || {};
  let branding = db.branding || DEFAULT_BRANDING;
  if (user && !isAdmin) {
    branding = userBrandingMap[user.id] || {
      ...DEFAULT_BRANDING,
      customAccountNames: {},
    };
  }

  return NextResponse.json({
    branding,
    accounts: userAccounts,
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    },
  });
}

export async function POST(req: Request) {
  try {
    const user = await getUserFromReq(req);
    const driveCreds = extractDriveFromReq(req);
    const body = await req.json();
    const db = await getDbFromReq(req);

    const isAdmin =
      user?.role === 'admin' ||
      user?.email === 'saurabhprajapatidev@gmail.com' ||
      user?.id === 'usr_admin_saurabh';

    const { accountName, accountId, ...brandingFields } = body;

    // Filter accounts by active user
    let userAccounts = db.accounts || [];
    if (user) {
      if (isAdmin) {
        userAccounts = userAccounts.filter(
          (a) => !a.userId || a.userId === user.id || a.userId === 'usr_admin_saurabh'
        );
      } else {
        userAccounts = userAccounts.filter((a) => a.userId === user.id);
      }
    } else {
      userAccounts = [];
    }

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
      if (trimmed && userAccounts.length > 0) {
        const targetId = accountId || userAccounts[0].id;
        const acc = db.accounts.find((a) => a.id === targetId || a.pageId === targetId) || userAccounts[0];
        acc.name = trimmed;
        if (!brandingFields.customAccountNames) {
          brandingFields.customAccountNames = db.branding.customAccountNames || {};
        }
        brandingFields.customAccountNames[acc.id] = trimmed;
      }
    }

    const userBrandingMap = (db as any).userBranding || {};
    let savedBranding = {
      ...(user && !isAdmin ? (userBrandingMap[user.id] || DEFAULT_BRANDING) : db.branding),
      ...brandingFields,
    };

    if (user && !isAdmin) {
      userBrandingMap[user.id] = savedBranding;
      await saveDbAsync({
        userBranding: userBrandingMap,
        accounts: db.accounts,
      } as any, driveCreds);
    } else {
      await saveDbAsync({
        branding: savedBranding,
        accounts: db.accounts,
      }, driveCreds);
    }

    return NextResponse.json({
      ok: true,
      branding: savedBranding,
      accounts: userAccounts,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

