import { NextResponse } from 'next/server';
import { generateBannerSvg, BannerOptions } from '@/lib/image-banner';
import { getDb } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get('title') || 'SPACEWALK COMMERCIAL MISSION SUCCESSFUL';
  const account = searchParams.get('account') || 'Curious People';
  const db = getDb();
  const branding = db.branding;

  const options: BannerOptions = {
    title,
    accountName: account,
    bottomText: branding.bottomText,
    barColor: branding.barColor,
    textColor: branding.textColor,
    font: branding.font,
    look: branding.look,
    headlineBanner: branding.headlineBanner,
  };

  const svg = generateBannerSvg(options);
  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-cache',
    },
  });
}
