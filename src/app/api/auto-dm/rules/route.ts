import { NextResponse } from 'next/server';
import { getDbFromReq, saveDbAsync, extractDriveFromReq, AutoDmRule } from '@/lib/db';
import { getUserFromReq } from '@/lib/auth-db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await getUserFromReq(req);
    const db = await getDbFromReq(req);

    const isAdmin =
      user?.role === 'admin' ||
      user?.email === 'saurabhprajapatidev@gmail.com' ||
      user?.id === 'usr_admin_saurabh';

    let rules = db.autoDmRules || [];
    let logs = db.autoDmLogs || [];

    // If an explicit non-admin user is logged in, isolate to their own rules and logs
    if (user && user.role !== 'admin' && user.email !== 'saurabhprajapatidev@gmail.com') {
      rules = rules.filter((r: any) => r.userId === user.id);
      logs = logs.filter((l: any) => rules.some((r) => r.id === l.ruleId));
    }


    return NextResponse.json(
      {
        rules,
        logs: logs.slice(-50).reverse(), // Last 50 logs, newest first
        stats: {
          totalRules: rules.length,
          activeRules: rules.filter((r) => r.enabled).length,
          totalDmsSent: rules.reduce((acc, r) => acc + (r.stats?.totalSent || 0), 0),
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch rules' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const driveCreds = extractDriveFromReq(req);
    const body = await req.json();
    const {
      id,
      name,
      enabled = true,
      platform = 'instagram',
      targetAccountId,
      mediaFilter = 'all',
      specificMediaId,
      triggerKeywords = [],
      matchType = 'contains',
      dmMessage,
      buttons,
      publicReplyMessage,
    } = body;

    if (!targetAccountId) {
      return NextResponse.json({ error: 'Please select an Instagram account for this rule.' }, { status: 400 });
    }

    if (!dmMessage || !dmMessage.trim()) {
      return NextResponse.json({ error: 'Direct Message (DM) text or link is required.' }, { status: 400 });
    }

    const db = await getDbFromReq(req);
    const account = db.accounts.find((a) => a.id === targetAccountId || a.pageId === targetAccountId);
    const targetAccountName = account ? (account.username ? `@${account.username}` : account.name) : 'Instagram Account';

    // Normalize keywords
    const keywords = (Array.isArray(triggerKeywords) ? triggerKeywords : [triggerKeywords])
      .map((k: string) => String(k).trim().toLowerCase())
      .filter(Boolean);

    // Normalize up to 3 interactive action buttons
    const cleanButtons = Array.isArray(buttons)
      ? buttons
          .filter((b: any) => b && b.title && b.title.trim() && b.url && b.url.trim())
          .slice(0, 3)
          .map((b: any, i: number) => ({
            id: b.id || 'btn_' + i + '_' + Date.now(),
            title: String(b.title).trim().slice(0, 20),
            url: String(b.url).trim(),
          }))
      : undefined;

    const rules = db.autoDmRules || [];
    const ruleId = id || 'rule_' + Date.now();
    const existingIndex = rules.findIndex((r) => r.id === ruleId);

    const user = await getUserFromReq(req);
    const activeUserId = user ? user.id : 'usr_admin_saurabh';

    const updatedRule: AutoDmRule = {
      id: ruleId,
      userId: activeUserId,
      name: name || (keywords.length ? `Auto-DM on "${keywords.join(', ')}"` : 'Auto-DM for all comments'),
      enabled: enabled !== false,
      platform: platform,
      targetAccountId: targetAccountId,
      targetAccountName: targetAccountName,
      mediaFilter: mediaFilter,
      specificMediaId: specificMediaId || undefined,
      triggerKeywords: keywords,
      matchType: matchType,
      dmMessage: dmMessage.trim(),
      buttons: cleanButtons,
      publicReplyMessage: publicReplyMessage?.trim() || undefined,
      processedCommentIds: existingIndex >= 0 ? rules[existingIndex].processedCommentIds || [] : [],
      stats: existingIndex >= 0 ? rules[existingIndex].stats || { totalSent: 0 } : { totalSent: 0 },
      createdAt: existingIndex >= 0 ? rules[existingIndex].createdAt : new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      rules[existingIndex] = updatedRule;
    } else {
      rules.push(updatedRule);
    }

    await saveDbAsync({ autoDmRules: rules }, driveCreds);
    return NextResponse.json({ ok: true, rule: updatedRule });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save rule' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const driveCreds = extractDriveFromReq(req);
    const body = await req.json();
    const { id, enabled } = body;
    if (!id) return NextResponse.json({ error: 'Rule ID is required' }, { status: 400 });

    const db = await getDbFromReq(req);
    const rules = db.autoDmRules || [];
    const index = rules.findIndex((r) => r.id === id);
    if (index === -1) return NextResponse.json({ error: 'Rule not found' }, { status: 404 });

    rules[index].enabled = Boolean(enabled);
    await saveDbAsync({ autoDmRules: rules }, driveCreds);
    return NextResponse.json({ ok: true, rule: rules[index] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update rule' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const driveCreds = extractDriveFromReq(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

  const db = await getDbFromReq(req);
  const rules = (db.autoDmRules || []).filter((r) => r.id !== id);
  await saveDbAsync({ autoDmRules: rules }, driveCreds);
  return NextResponse.json({ ok: true });
}

