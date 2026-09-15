// 3-tier free photo search engine: Wikimedia Commons, Wikipedia, Openverse

export interface PhotoResult {
  url: string;
  source: 'commons' | 'wikipedia' | 'openverse';
  credit: string;
}

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const WIKIPEDIA_API = 'https://en.wikipedia.org/w/api.php';
const OPENVERSE_API = 'https://api.openverse.org/v1/images/';

function stripHtml(html: string): string {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanSearchQuery(q: string): string {
  const s = String(q || '').trim();
  if (s.length < 3) return '';
  const latinCount = (s.match(/[A-Za-z]/g) || []).length;
  if (latinCount < 2) return '';
  return s.replace(/[^A-Za-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function findFreePhoto(query: string, includeCredit: boolean = true): Promise<PhotoResult | null> {
  const cleaned = cleanSearchQuery(query);
  if (!cleaned) return null;

  // Tier 1: Wikimedia Commons
  try {
    const hit = await searchCommons(cleaned, includeCredit);
    if (hit) return hit;
  } catch (err) {
    console.error('Commons photo search error:', err);
  }

  // Tier 2: Wikipedia Lead Image
  try {
    const hit = await searchWikipedia(cleaned, includeCredit);
    if (hit) return hit;
  } catch (err) {
    console.error('Wikipedia photo search error:', err);
  }

  // Tier 3: Openverse
  try {
    const hit = await searchOpenverse(cleaned, includeCredit);
    if (hit) return hit;
  } catch (err) {
    console.error('Openverse photo search error:', err);
  }

  return null;
}

async function searchCommons(q: string, includeCredit: boolean): Promise<PhotoResult | null> {
  const url = `${COMMONS_API}?action=query&format=json&formatversion=2&generator=search&gsrnamespace=6&gsrlimit=15&gsrsearch=${encodeURIComponent(q)}&prop=imageinfo&iiprop=${encodeURIComponent('url|size|mime|extmetadata')}&iiurlwidth=1200`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'AlphaPostApp/1.0 (https://alphapost.io)' }
  });
  if (!res.ok) return null;
  const data = await res.json();
  const pages = data.query?.pages || [];

  let best: { url: string; area: number; meta: any } | null = null;
  for (const p of pages) {
    const info = p.imageinfo?.[0];
    if (!info) continue;
    if (!/^image\/(jpeg|png|webp)$/i.test(info.mime || '')) continue;
    if ((info.width || 0) < 500) continue;

    const src = info.thumburl || info.url;
    if (!src) continue;

    const area = (info.width || 0) * (info.height || 0);
    if (!best || area > best.area) {
      best = { url: src, area, meta: info.extmetadata || {} };
    }
  }

  if (best) {
    let credit = '';
    if (includeCredit) {
      const who = stripHtml(best.meta?.Artist?.value || '').slice(0, 60);
      const lic = stripHtml(best.meta?.LicenseShortName?.value || '').slice(0, 30);
      if (who || lic) {
        credit = `Photo: ${[who, lic].filter(Boolean).join(', ')} via Wikimedia Commons`;
      }
    }
    return { url: best.url, source: 'commons', credit };
  }
  return null;
}

async function searchWikipedia(q: string, includeCredit: boolean): Promise<PhotoResult | null> {
  const url = `${WIKIPEDIA_API}?action=query&format=json&formatversion=2&generator=search&gsrlimit=5&gsrnamespace=0&gsrsearch=${encodeURIComponent(q)}&prop=pageimages&piprop=${encodeURIComponent('original|thumbnail')}&pithumbsize=1200&pilicense=any`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'AlphaPostApp/1.0 (https://alphapost.io)' }
  });
  if (!res.ok) return null;
  const data = await res.json();
  const pages = data.query?.pages || [];

  for (const p of pages) {
    const src = p.thumbnail?.source || p.original?.source;
    if (!src) continue;
    if (!/\.(jpe?g|png|webp)$/i.test(src.replace(/\?.*$/, ''))) continue;

    const credit = includeCredit ? `Photo via Wikipedia (${p.title || ''})` : '';
    return { url: src, source: 'wikipedia', credit };
  }
  return null;
}

async function searchOpenverse(q: string, includeCredit: boolean): Promise<PhotoResult | null> {
  const url = `${OPENVERSE_API}?q=${encodeURIComponent(q)}&size=large&license_type=commercial&page_size=10&mature=false`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'AlphaPostApp/1.0 (https://alphapost.io)' }
  });
  if (!res.ok) return null;
  const data = await res.json();
  const list = data.results || [];

  for (const item of list) {
    const src = item.url;
    if (!src) continue;
    if (!/\.(jpe?g|png|webp)$/i.test(src.replace(/\?.*$/, ''))) continue;

    let credit = '';
    if (includeCredit) {
      const who = String(item.creator || '').slice(0, 60);
      const lic = String(item.license || '').toUpperCase().slice(0, 20);
      credit = `Photo: ${[who, lic].filter(Boolean).join(', ')} via Openverse`;
    }
    return { url: src, source: 'openverse', credit };
  }
  return null;
}
