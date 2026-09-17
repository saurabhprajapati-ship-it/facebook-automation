import { NextResponse } from 'next/server';
import { getDbFromReq, saveDbAsync, extractDriveFromReq, Account } from '@/lib/db';
import { fetchAccountsFromSystemUser, checkFacebookPage } from '@/lib/facebook';
import { getUserFromReq } from '@/lib/auth-db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const user = await getUserFromReq(req);
  const db = await getDbFromReq(req);

  let rawAccounts = db.accounts || [];

  if (user) {
    const isAdmin = user.role === 'admin' || user.email === 'saurabhprajapatidev@gmail.com' || user.id === 'usr_admin_saurabh';
    if (isAdmin) {
      // Admin sees admin accounts and legacy accounts
      rawAccounts = rawAccounts.filter((a) => !a.userId || a.userId === user.id || a.userId === 'usr_admin_saurabh');
    } else {
      // Regular users only see their own accounts
      rawAccounts = rawAccounts.filter((a) => a.userId === user.id);
    }
  } else {
    // If accessed without session, return empty
    rawAccounts = [];
  }

  const accountsWithPics = rawAccounts.map((acc) => {
    if (acc.platform === 'facebook' && !acc.profilePictureUrl && acc.pageId) {
      return {
        ...acc,
        profilePictureUrl: `https://graph.facebook.com/${acc.pageId}/picture?type=large`,
      };
    }
    return acc;
  });

  return NextResponse.json({ accounts: accountsWithPics }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    },
  });
}

export async function POST(req: Request) {
  try {
    const driveCreds = extractDriveFromReq(req);
    const body = await req.json();
    const { pageId, systemUserToken, pageAccessToken, name, scanOnly, bulkPages } = body;

    const user = await getUserFromReq(req);
    const activeUserId = user ? user.id : 'usr_admin_saurabh';

    // 1. Scan Only Request: Returns all 20+ pages associated with System User token
    if (scanOnly && systemUserToken) {
      const pages = await fetchAccountsFromSystemUser(systemUserToken);
      return NextResponse.json({ ok: true, pages });
    }

    const db = await getDbFromReq(req);

    // 2. Bulk Import Request: Imports multiple selected pages at once
    if (bulkPages && Array.isArray(bulkPages) && bulkPages.length > 0) {
      let importedCount = 0;
      for (const page of bulkPages) {
        if (!page.id || !page.access_token) continue;
        const pic = page.profile_picture_url || `https://graph.facebook.com/${page.id}/picture?type=large`;
        const existingIndex = db.accounts.findIndex((a) => a.pageId === page.id);
        const accRecord: Account = {
          id: existingIndex >= 0 ? db.accounts[existingIndex].id : 'acc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          userId: activeUserId,
          platform: 'facebook',
          pageId: page.id,
          name: page.name || 'Facebook Page',
          profilePictureUrl: pic,
          systemUserToken: systemUserToken || page.systemUserToken,
          pageAccessToken: page.access_token,
          active: true,
          addedAt: new Date().toISOString(),
        };

        if (existingIndex >= 0) {
          db.accounts[existingIndex] = accRecord;
        } else {
          db.accounts.push(accRecord);
        }
        importedCount++;
      }

      await saveDbAsync({ accounts: db.accounts }, driveCreds);
      return NextResponse.json({ ok: true, count: importedCount, message: `Successfully connected ${importedCount} pages!` });
    }

    if (!pageId && !systemUserToken) {
      return NextResponse.json({ error: 'Page ID or System User Token is required.' }, { status: 400 });
    }

    let tokenToUse = pageAccessToken;
    let finalPageId = pageId;
    let pageName = name || 'Facebook Page';
    let profilePic: string | undefined = undefined;

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
          profilePic = match.profile_picture_url;
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
        profilePic = first.profile_picture_url;
      }
    } else {
      // Validate page token directly
      const check = await checkFacebookPage(finalPageId, tokenToUse);
      if (!check.ok) {
        return NextResponse.json({ error: check.error || 'Token validation failed.' }, { status: 400 });
      }
      if (check.name) pageName = check.name;
      if (check.profile_picture_url) profilePic = check.profile_picture_url;
    }

    if (!profilePic && finalPageId) {
      profilePic = `https://graph.facebook.com/${finalPageId}/picture?type=large`;
    }

    // Check if account already exists
    const existingIndex = db.accounts.findIndex((a) => a.pageId === finalPageId);
    const newAccount: Account = {
      id: existingIndex >= 0 ? db.accounts[existingIndex].id : 'acc_' + Date.now(),
      userId: activeUserId,
      platform: 'facebook',
      pageId: finalPageId,
      name: pageName,
      profilePictureUrl: profilePic,
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
  const user = await getUserFromReq(req);
  const driveCreds = extractDriveFromReq(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

  const db = await getDbFromReq(req);
  const isAdmin = !user || user.role === 'admin' || user.email === 'saurabhprajapatidev@gmail.com' || user.id === 'usr_admin_saurabh';

  const updated = db.accounts.filter((a) => {
    if (a.id !== id) return true;
    // Allow deletion if admin or if account belongs to this user
    return !isAdmin && user && a.userId !== user.id;
  });

  await saveDbAsync({ accounts: updated }, driveCreds);
  return NextResponse.json({ ok: true });
}

