import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  return NextResponse.json(
    { error: 'Email signup has been disabled. Please sign up or sign in using Google.' },
    { status: 403 }
  );
}

