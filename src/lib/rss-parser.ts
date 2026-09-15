// RSS / Blogger / WordPress REST API Parser

export interface SitePost {
  title: string;
  url: string;
  summary: string;
  body: string;
  image: string;
  date?: string;
}

function stripHtml(html: string): string {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function upscaleImage(url: string): string {
  if (!url) return '';
  return url
    .replace(/\/s\d{2,3}(-c)?\//, '/s1600/')
    .replace(/\/w\d+-h\d+[^\/]*\//, '/s1600/')
    .replace(/=s\d{2,3}(-c)?(?=$|[?&])/, '=s1600')
    .replace(/=w\d+-h\d+[^?&]*(?=$|[?&])/, '=s1600');
}

export async function fetchSitePosts(type: 'wordpress' | 'blogger' | 'rss', baseUrl: string): Promise<SitePost[]> {
  const base = String(baseUrl || '').trim().replace(/\/+$/, '');
  if (!base) return [];

  if (type === 'wordpress') {
    try {
      const restUrl = `${base}/wp-json/wp/v2/posts?per_page=10&_embed=1`;
      const res = await fetch(restUrl, { headers: { 'User-Agent': 'AlphaPostApp/1.0' } });
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0) {
          return rows.map((p: any) => {
            let image = '';
            const media = p._embedded?.['wp:featuredmedia']?.[0]?.source_url;
            if (media) image = media;
            if (!image) {
              const m = String(p.content?.rendered || '').match(/<img[^>]+src=["']([^"']+)["']/i);
              if (m) image = m[1];
            }
            return {
              title: stripHtml(p.title?.rendered || ''),
              url: p.link,
              summary: stripHtml(p.excerpt?.rendered || '').slice(0, 300),
              body: stripHtml(p.content?.rendered || '').slice(0, 1500),
              image: upscaleImage(image),
              date: p.date_gmt ? new Date(p.date_gmt + 'Z').toISOString() : undefined,
            };
          }).filter((p: SitePost) => p.title && p.url);
        }
      }
    } catch {
      // Fallback to feed below
    }
    return fetchRssPosts(`${base}/feed/`);
  }

  if (type === 'blogger') {
    return fetchRssPosts(`${base}/feeds/posts/default?alt=rss&max-results=15`);
  }

  return fetchRssPosts(base);
}

async function fetchRssPosts(feedUrl: string): Promise<SitePost[]> {
  const res = await fetch(feedUrl, { headers: { 'User-Agent': 'AlphaPostApp/1.0' } });
  if (!res.ok) return [];
  const text = await res.text();

  const posts: SitePost[] = [];
  const itemMatches = text.match(/<item[\s\S]*?<\/item>/gi) || text.match(/<entry[\s\S]*?<\/entry>/gi) || [];

  for (const item of itemMatches) {
    const titleMatch = item.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const linkMatch = item.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i) || item.match(/<link[^>]*href=["']([^"']+)["']/i);
    const descMatch = item.match(/<description[^>]*>([\s\S]*?)<\/description>/i) || item.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i);
    const contentMatch = item.match(/<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/i) || item.match(/<content[^>]*>([\s\S]*?)<\/content>/i);
    const imageMatch = item.match(/<media:thumbnail[^>]*url=["']([^"']+)["']/i) || item.match(/<enclosure[^>]*url=["']([^"']+)["']/i) || item.match(/<img[^>]+src=["']([^"']+)["']/i);

    const title = stripHtml(titleMatch ? titleMatch[1] : '');
    const url = (linkMatch ? linkMatch[1] : '').trim();
    if (!title || !url) continue;

    const summary = stripHtml(descMatch ? descMatch[1] : '');
    const body = stripHtml(contentMatch ? contentMatch[1] : summary);
    const image = upscaleImage(imageMatch ? imageMatch[1] : '');

    posts.push({
      title,
      url,
      summary: summary.slice(0, 300),
      body: body.slice(0, 1500),
      image,
    });
  }

  return posts;
}
