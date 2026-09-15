// Meta Graph API v26.0 client with automated error translation

const GRAPH_VERSION = 'v26.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export interface FacebookAccountInfo {
  id: string;
  name: string;
  access_token: string;
}

export function explainFacebookError(body: any): string {
  const err = body?.error || {};
  const code = err.code;
  const sub = err.error_subcode;
  const msg = err.message || JSON.stringify(body).slice(0, 200);

  if (code === 190 && (sub === 460 || sub === 463)) {
    return `The Facebook token has expired. Please generate a new System User token in Meta Business Suite. (${msg})`;
  }
  if (code === 190) {
    return `Facebook rejected this token. It may have been revoked or copied incorrectly. (${msg})`;
  }
  if (code === 200 || code === 10) {
    return `No permission to post. Ensure your System User has Full Control on the Page and the token has 'pages_manage_posts'. (${msg})`;
  }
  if (code === 100 && sub === 33) {
    return `Facebook cannot find this Page ID. You might have pasted your personal profile ID instead of your Facebook Page ID. (${msg})`;
  }
  if (code === 100) {
    return `Facebook rejected the request data. Check that the Page ID is correct. (${msg})`;
  }
  if (code === 4 || code === 17 || code === 32 || code === 613) {
    return `Facebook rate limit reached. Please increase the interval between posts. (${msg})`;
  }
  if (code === 368) {
    return `Temporary block from Facebook due to posting frequency. Allow some cooling time. (${msg})`;
  }
  return `Facebook API Error ${code || ''}: ${msg}`;
}

export async function fetchAccountsFromSystemUser(systemUserToken: string): Promise<FacebookAccountInfo[]> {
  const url = `${GRAPH_BASE}/me/accounts?fields=name,id,access_token&access_token=${encodeURIComponent(systemUserToken)}`;
  const res = await fetch(url);
  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(explainFacebookError(data));
  }

  return (data.data || []).map((p: any) => ({
    id: String(p.id),
    name: String(p.name),
    access_token: String(p.access_token),
  }));
}

export async function checkFacebookPage(pageId: string, pageToken: string): Promise<{ ok: boolean; name?: string; error?: string }> {
  try {
    const pageUrl = `${GRAPH_BASE}/${encodeURIComponent(pageId)}?fields=name,id&access_token=${encodeURIComponent(pageToken)}`;
    const pageRes = await fetch(pageUrl);
    const pageData = await pageRes.json();

    if (!pageRes.ok || pageData.error) {
      return { ok: false, error: explainFacebookError(pageData) };
    }

    return { ok: true, name: pageData.name };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Failed to connect to Meta Graph API' };
  }
}

export async function publishToFacebook(options: {
  pageId: string;
  pageToken: string;
  message: string;
  link?: string;
  imageUrl?: string;
}): Promise<{ postId: string }> {
  const { pageId, pageToken, message, link, imageUrl } = options;

  // Attempt photo post first if image exists
  if (imageUrl && /^https?:\/\//i.test(imageUrl)) {
    try {
      const caption = [message, link].filter(Boolean).join('\n\n');
      const photoUrl = `${GRAPH_BASE}/${encodeURIComponent(pageId)}/photos`;
      const res = await fetch(photoUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: pageToken,
          url: imageUrl,
          caption: caption,
          published: true,
        }),
      });
      const data = await res.json();
      if (res.ok && (data.id || data.post_id)) {
        return { postId: data.post_id || data.id };
      }
      console.warn('Photo post failed, falling back to feed post:', explainFacebookError(data));
    } catch (err) {
      console.warn('Photo post error, falling back to feed:', err);
    }
  }

  // Feed post fallback
  const feedUrl = `${GRAPH_BASE}/${encodeURIComponent(pageId)}/feed`;
  const payload: any = {
    access_token: pageToken,
  };
  if (message) payload.message = message;
  if (link) payload.link = link;

  const res = await fetch(feedUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (res.ok && (data.id || data.post_id)) {
    return { postId: data.post_id || data.id };
  }

  throw new Error(explainFacebookError(data));
}

export async function publishBufferToFacebook(options: {
  pageId: string;
  pageToken: string;
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  caption: string;
  isVideo?: boolean;
}): Promise<{ postId: string }> {
  const { pageId, pageToken, buffer, fileName, mimeType, caption, isVideo } = options;

  const blob = new Blob([new Uint8Array(buffer)], { type: mimeType || 'image/jpeg' });
  const formData = new FormData();
  formData.append('access_token', pageToken);

  if (isVideo) {
    const videoUrl = `https://graph-video.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(pageId)}/videos`;
    formData.append('source', blob, fileName || 'video.mp4');
    if (caption) {
      formData.append('description', caption);
    }

    const res = await fetch(videoUrl, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (res.ok && (data.id || data.post_id)) {
      return { postId: data.post_id || data.id };
    }
    throw new Error(explainFacebookError(data));
  } else {
    const photoUrl = `${GRAPH_BASE}/${encodeURIComponent(pageId)}/photos`;
    formData.append('source', blob, fileName || 'photo.jpg');
    if (caption) {
      formData.append('caption', caption);
    }
    formData.append('published', 'true');

    const res = await fetch(photoUrl, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (res.ok && (data.id || data.post_id)) {
      return { postId: data.post_id || data.id };
    }
    throw new Error(explainFacebookError(data));
  }
}
