import { NextResponse } from 'next/server';
import { getDb, saveDb, GeminiKey } from '@/lib/db';
import { testGeminiKey } from '@/lib/gemini';

export async function GET() {
  const db = getDb();
  // Return keys with masked value for security
  const safeKeys = db.geminiKeys.map((k) => ({
    id: k.id,
    maskedKey: k.maskedKey,
    models: k.models,
    status: k.status,
    addedAt: k.addedAt,
    lastUsed: k.lastUsed,
    postsToday: k.postsToday,
  }));
  return NextResponse.json({ keys: safeKeys });
}

export async function POST(req: Request) {
  try {
    const { rawKeys } = await req.json();
    if (!rawKeys || typeof rawKeys !== 'string') {
      return NextResponse.json({ error: 'Please enter at least one API key.' }, { status: 400 });
    }

    const lines = rawKeys.split(/[\n,]/).map((k) => k.trim()).filter(Boolean);
    if (!lines.length) {
      return NextResponse.json({ error: 'No valid keys provided.' }, { status: 400 });
    }

    const db = getDb();
    const addedKeys: GeminiKey[] = [];
    const errors: string[] = [];

    for (const key of lines) {
      // Avoid exact duplicates
      if (db.geminiKeys.some((k) => k.key === key)) {
        continue;
      }

      const masked = key.length > 8
        ? `${key.slice(0, 8)}....${key.slice(-4)}`
        : 'AIza....';

      const check = await testGeminiKey(key);
      if (!check.ok) {
        errors.push(`${masked}: ${check.error}`);
        continue;
      }

      const newKey: GeminiKey = {
        id: 'key_' + Math.random().toString(36).substring(2, 9),
        key,
        maskedKey: masked,
        models: check.models.slice(0, 12),
        status: 'ready',
        addedAt: new Date().toISOString(),
        postsToday: 0,
      };

      db.geminiKeys.push(newKey);
      addedKeys.push(newKey);
    }

    saveDb({ geminiKeys: db.geminiKeys });

    return NextResponse.json({
      ok: true,
      addedCount: addedKeys.length,
      errors: errors.length ? errors : undefined,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to process keys' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

  const db = getDb();
  const updated = db.geminiKeys.filter((k) => k.id !== id);
  saveDb({ geminiKeys: updated });
  return NextResponse.json({ ok: true });
}
