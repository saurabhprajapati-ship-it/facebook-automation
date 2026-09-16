import { NextResponse } from 'next/server';
import { getDbFromReq, saveDbAsync, extractDriveFromReq, Account } from '@/lib/db';
import { fetchAccountsFromSystemUser, checkFacebookPage } from '@/lib/facebook';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const db = await getDbFromReq(req);
  return NextResponse.json({ accounts: db.accounts }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    },
  });
}

export async function POST(req: Request) {
  try {
    const driveCreds = extractDriveFromReq(req);
    const body = await req.json();
    const { pageId, systemUserToken, pageAccessToken, name } = body;

    if (!pageId && !systemUserToken) {
      return NextResponse.json({ error: 'Page ID or System User Token is required.' }, { status: 400 });
    }

    const db = await getDbFromReq(req);
    let tokenToUse = pageAccessToken;
    let finalPageId = pageId;
    let pageName = name || 'Facebook Page';

    // Auto-discover using System User token if provided
    if (systemUserToken) {
      const pages = await fetchAccountsFromSystemUser(systemUserToken);
      if (!pages.length) {
        return NextResponse.json({
          error: 'No Facebook Pages found for this System User. Please grant Full Access on your Page in Meta Business Suite.'
        }, { status: 400 });
      }

      if (finalPageId) {
        const match = pages.find((p) => p.id === String(finalPageId).trim());
        if (match) {
          tokenToUse = match.access_token;
          pageName = match.name;
        } else {
          return NextResponse.json({
            error: `Page ID ${finalPageId} does not belong to this token. Available Pages: ${pages.map((p) => `${p.name} (${p.id})`).join(', ')}`
          }, { status: 400 });
        }
      } else {
        // Auto-select first available page
        const first = pages[0];
        finalPageId = first.id;
        tokenToUse = first.access_token;
        pageName = first.name;
      }
    } else {
      // Validate page token directly
      const check = await checkFacebookPage(finalPageId, tokenToUse);
      if (!check.ok) {
        return NextResponse.json({ error: check.error || 'Token validation failed.' }, { status: 400 });
      }
      if (check.name) pageName = check.name;
    }

    // Check if account already exists
    const existingIndex = db.accounts.findIndex((a) => a.pageId === finalPageId);
    const newAccount: Account = {
      id: existingIndex >= 0 ? db.accounts[existingIndex].id : 'acc_' + Date.now(),
      platform: 'facebook',
      pageId: finalPageId,
      name: pageName,
      systemUserToken,
      pageAccessToken: tokenToUse,
      active: true,
      addedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      db.accounts[existingIndex] = newAccount;
    } else {
      db.accounts.push(newAccount);
    }

    await saveDbAsync({ accounts: db.accounts }, driveCreds);
    return NextResponse.json({ ok: true, account: newAccount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to add account' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const driveCreds = extractDriveFromReq(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

  const db = await getDbFromReq(req);
  const updated = db.accounts.filter((a) => a.id !== id);
  await saveDbAsync({ accounts: updated }, driveCreds);
  return NextResponse.json({ ok: true });
}

