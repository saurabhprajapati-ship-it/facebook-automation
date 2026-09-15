import { NextResponse } from 'next/server';
import { getDb, saveDb, AutoDmRule } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDb();
    return NextResponse.json({
      rules: db.autoDmRules || [],
      logs: (db.autoDmLogs || []).slice(-50).reverse(), // Last 50 logs, newest first
      stats: {
        totalRules: (db.autoDmRules || []).length,
        activeRules: (db.autoDmRules || []).filter((r) => r.enabled).length,
        totalDmsSent: (db.autoDmRules || []).reduce((acc, r) => acc + (r.stats?.totalSent || 0), 0),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch rules' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
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
      publicReplyMessage,
    } = body;

    if (!targetAccountId) {
      return NextResponse.json({ error: 'Please select an Instagram account for this rule.' }, { status: 400 });
    }

    if (!dmMessage || !dmMessage.trim()) {
      return NextResponse.json({ error: 'Direct Message (DM) text or link is required.' }, { status: 400 });
    }

    const db = getDb();
    const account = db.accounts.find((a) => a.id === targetAccountId || a.pageId === targetAccountId);
    const targetAccountName = account ? (account.username ? `@${account.username}` : account.name) : 'Instagram Account';

    // Normalize keywords
    const keywords = (Array.isArray(triggerKeywords) ? triggerKeywords : [triggerKeywords])
      .map((k: string) => String(k).trim().toLowerCase())
      .filter(Boolean);

    const rules = db.autoDmRules || [];
    const ruleId = id || 'rule_' + Date.now();
    const existingIndex = rules.findIndex((r) => r.id === ruleId);

    const updatedRule: AutoDmRule = {
      id: ruleId,
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

    saveDb({ autoDmRules: rules });
    return NextResponse.json({ ok: true, rule: updatedRule });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save rule' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, enabled } = body;
    if (!id) return NextResponse.json({ error: 'Rule ID is required' }, { status: 400 });

    const db = getDb();
    const rules = db.autoDmRules || [];
    const index = rules.findIndex((r) => r.id === id);
    if (index === -1) return NextResponse.json({ error: 'Rule not found' }, { status: 404 });

    rules[index].enabled = Boolean(enabled);
    saveDb({ autoDmRules: rules });
    return NextResponse.json({ ok: true, rule: rules[index] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update rule' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

  const db = getDb();
  const rules = (db.autoDmRules || []).filter((r) => r.id !== id);
  saveDb({ autoDmRules: rules });
  return NextResponse.json({ ok: true });
}
