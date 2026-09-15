// Official Meta Graph API Client for Instagram Business / Creator Accounts
// Supports: Auto-Discovery, Comment-to-DM Private Replies, Public Replies, and Story Publishing

const GRAPH_VERSION = 'v26.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export interface InstagramAccountInfo {
  id: string; // IG Business Account ID (e.g. 178414...)
  username: string;
  name: string;
  profile_picture_url?: string;
  followers_count?: number;
  media_count?: number;
  pageId: string;
  pageToken: string;
}

export interface InstagramMediaItem {
  id: string;
  caption?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp: string;
  comments_count?: number;
  like_count?: number;
}

export interface InstagramComment {
  id: string;
  text: string;
  timestamp: string;
  username?: string;
  from?: {
    id: string;
    username: string;
  };
}

export function explainInstagramError(body: any): string {
  const err = body?.error || {};
  const code = err.code;
  const sub = err.error_subcode;
  const msg = err.message || JSON.stringify(body).slice(0, 200);

  if (
    msg.includes('already has a reply') ||
    msg.includes('already been sent') ||
    (code === 100 && sub === 2534015) ||
    code === -1
  ) {
    return `ALREADY_REPLIED: A Private Reply has already been sent to this comment. Meta permits only 1 private message per comment.`;
  }
  if (code === 190) {
    return `Token expired or revoked. Please refresh the access token. (${msg})`;
  }
  if (code === 100 && sub === 2534014) {
    return `Comment is older than 7 days. Meta API allows sending 1 Private Reply only within 7 days of comment creation.`;
  }
  if (code === 200 || code === 10) {
    return `Permission denied. Ensure your token has 'instagram_manage_messages' and 'instagram_manage_comments'. (${msg})`;
  }
  if (code === 4 || code === 17 || code === 32 || code === 613) {
    return `Rate limit reached. Backing off to keep account safe. (${msg})`;
  }
  if (msg.includes('aspect ratio') || (code === 100 && sub === 2207009)) {
    return `Invalid aspect ratio. Instagram feed images must be between 4:5 (portrait) and 1.91:1 (landscape).`;
  }
  return `Instagram API Error ${code || ''}: ${msg}`;
}

/**
 * Automatically discovers the linked Instagram Business account from a Facebook Page
 */
export async function getConnectedInstagramAccount(
  pageId: string,
  pageToken: string
): Promise<InstagramAccountInfo | null> {
  try {
    const url = `${GRAPH_BASE}/${encodeURIComponent(
      pageId
    )}?fields=name,instagram_business_account{id,name,username,profile_picture_url,followers_count,media_count}&access_token=${encodeURIComponent(
      pageToken
    )}`;

    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok || data.error) {
      console.warn('Instagram discovery warning:', explainInstagramError(data));
      return null;
    }

    const ig = data.instagram_business_account;
    if (!ig || !ig.id) {
      return null;
    }

    return {
      id: String(ig.id),
      username: ig.username || '',
      name: ig.name || ig.username || 'Instagram Account',
      profile_picture_url: ig.profile_picture_url,
      followers_count: ig.followers_count || 0,
      media_count: ig.media_count || 0,
      pageId: String(pageId),
      pageToken: pageToken,
    };
  } catch (err: any) {
    console.error('Failed to discover connected Instagram account:', err.message);
    return null;
  }
}

/**
 * Verifies direct Instagram Business Account access & fetches profile details
 */
export async function verifyInstagramAccount(
  igUserId: string,
  token: string
): Promise<{ ok: boolean; info?: InstagramAccountInfo; error?: string }> {
  try {
    const url = `${GRAPH_BASE}/${encodeURIComponent(
      igUserId
    )}?fields=id,name,username,profile_picture_url,followers_count,media_count&access_token=${encodeURIComponent(
      token
    )}`;

    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok || data.error) {
      return { ok: false, error: explainInstagramError(data) };
    }

    return {
      ok: true,
      info: {
        id: String(data.id),
        username: data.username || '',
        name: data.name || data.username || 'Instagram Account',
        profile_picture_url: data.profile_picture_url,
        followers_count: data.followers_count || 0,
        media_count: data.media_count || 0,
        pageId: '',
        pageToken: token,
      },
    };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Connection failed' };
  }
}

/**
 * Fetches recent Instagram Posts & Reels for an account
 */
export async function fetchInstagramRecentMedia(
  igUserId: string,
  token: string,
  limit = 12
): Promise<InstagramMediaItem[]> {
  try {
    const url = `${GRAPH_BASE}/${encodeURIComponent(
      igUserId
    )}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,comments_count,like_count&limit=${limit}&access_token=${encodeURIComponent(
      token
    )}`;

    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();

    if (!res.ok || data.error) {
      throw new Error(explainInstagramError(data));
    }

    return (data.data || []).map((m: any) => ({
      id: String(m.id),
      caption: m.caption || '',
      media_type: m.media_type,
      media_url: m.media_url,
      thumbnail_url: m.thumbnail_url,
      permalink: m.permalink,
      timestamp: m.timestamp,
      comments_count: m.comments_count || 0,
      like_count: m.like_count || 0,
    }));
  } catch (err: any) {
    console.error('Error fetching Instagram media:', err.message);
    return [];
  }
}

/**
 * Fetches latest comments for a specific Instagram Post or Reel
 */
export async function fetchMediaComments(
  mediaId: string,
  token: string
): Promise<InstagramComment[]> {
  try {
    const url = `${GRAPH_BASE}/${encodeURIComponent(
      mediaId
    )}/comments?fields=id,text,timestamp,username,from&limit=50&access_token=${encodeURIComponent(
      token
    )}`;

    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();

    if (!res.ok || data.error) {
      throw new Error(explainInstagramError(data));
    }

    return (data.data || []).map((c: any) => ({
      id: String(c.id),
      text: String(c.text || ''),
      timestamp: c.timestamp,
      username: c.username || c.from?.username || 'user',
      from: c.from,
    }));
  } catch (err: any) {
    console.error(`Error fetching comments for media ${mediaId}:`, err.message);
    return [];
  }
}

/**
 * Official Meta Messenger API for Instagram: Send Private Reply to a Comment (Comment-to-DM)
 * Endpoint: POST /{page-id}/messages
 * Payload: { recipient: { comment_id: commentId }, message: { text: messageText } }
 */
export async function sendInstagramPrivateReply(
  pageId: string,
  commentId: string,
  messageText: string,
  pageToken: string
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  try {
    const url = `${GRAPH_BASE}/${encodeURIComponent(pageId)}/messages`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: {
          comment_id: commentId,
        },
        message: {
          text: messageText,
        },
        access_token: pageToken,
      }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      return { ok: false, error: explainInstagramError(data) };
    }

    return {
      ok: true,
      messageId: data.message_id || data.id,
    };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Private reply failed' };
  }
}

/**
 * Posts a public reply to a comment (e.g. "Sent you a DM! 📥")
 * Endpoint: POST /{comment-id}/replies
 */
export async function sendInstagramPublicReply(
  commentId: string,
  replyText: string,
  pageToken: string
): Promise<{ ok: boolean; replyId?: string; error?: string }> {
  try {
    const url = `${GRAPH_BASE}/${encodeURIComponent(commentId)}/replies`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: replyText,
        access_token: pageToken,
      }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      return { ok: false, error: explainInstagramError(data) };
    }

    return {
      ok: true,
      replyId: data.id,
    };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Public comment reply failed' };
  }
}

/**
 * Publishes an image to Instagram Stories using Meta 2-step Container Publishing
 */
export async function publishInstagramStory(
  igUserId: string,
  imageUrl: string,
  token: string
): Promise<{ ok: boolean; mediaId?: string; error?: string }> {
  try {
    // Step 1: Create Story Media Container
    const containerUrl = `${GRAPH_BASE}/${encodeURIComponent(igUserId)}/media`;
    const containerRes = await fetch(containerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: imageUrl,
        media_type: 'STORIES',
        access_token: token,
      }),
    });

    const containerData = await containerRes.json();
    if (!containerRes.ok || containerData.error || !containerData.id) {
      return { ok: false, error: explainInstagramError(containerData) };
    }

    const creationId = containerData.id;

    // Small wait for container preparation
    await new Promise((r) => setTimeout(r, 2000));

    // Step 2: Publish Media Container
    const publishUrl = `${GRAPH_BASE}/${encodeURIComponent(igUserId)}/media_publish`;
    const publishRes = await fetch(publishUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: creationId,
        access_token: token,
      }),
    });

    const publishData = await publishRes.json();
    if (!publishRes.ok || publishData.error) {
      return { ok: false, error: explainInstagramError(publishData) };
    }

    return {
      ok: true,
      mediaId: publishData.id,
    };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Story publication failed' };
  }
}

/**
 * Publishes a photo story to a Facebook Page
 */
export async function publishFacebookStory(
  pageId: string,
  imageUrl: string,
  pageToken: string
): Promise<{ ok: boolean; storyId?: string; error?: string }> {
  try {
    const url = `${GRAPH_BASE}/${encodeURIComponent(pageId)}/photos`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: imageUrl,
        published: false,
        temporary: true,
        access_token: pageToken,
      }),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      return { ok: false, error: explainInstagramError(data) };
    }

    const photoId = data.id;

    // Create story from photo
    const storyUrl = `${GRAPH_BASE}/${encodeURIComponent(pageId)}/photo_stories`;
    const storyRes = await fetch(storyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        photo_id: photoId,
        access_token: pageToken,
      }),
    });

    const storyData = await storyRes.json();
    if (!storyRes.ok || storyData.error) {
      return { ok: false, error: explainInstagramError(storyData) };
    }

    return {
      ok: true,
      storyId: storyData.id || storyData.post_id,
    };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Facebook story publication failed' };
  }
}

/**
 * Publishes a feed photo to an Instagram Business account using Meta's 3-step Container Publishing API
 * Step 1: POST /{ig-user-id}/media (create container)
 * Step 2: GET /{creation-id}?fields=status_code (poll until FINISHED)
 * Step 3: POST /{ig-user-id}/media_publish (publish container)
 */
export async function publishInstagramFeedPost(
  igUserId: string,
  imageUrl: string,
  caption: string,
  token: string
): Promise<{ ok: boolean; postId?: string; error?: string }> {
  try {
    // Step 1: Create Container
    const containerUrl = `${GRAPH_BASE}/${encodeURIComponent(igUserId)}/media`;
    const containerRes = await fetch(containerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: imageUrl,
        caption: caption,
        access_token: token,
      }),
    });

    const containerData = await containerRes.json();
    if (!containerRes.ok || containerData.error || !containerData.id) {
      return { ok: false, error: explainInstagramError(containerData) };
    }

    const creationId = containerData.id;

    // Step 2: Poll container status until ready (max 6 attempts, 2s each)
    let ready = false;
    for (let i = 0; i < 6; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const statusUrl = `${GRAPH_BASE}/${encodeURIComponent(creationId)}?fields=status_code&access_token=${encodeURIComponent(token)}`;
      const statusRes = await fetch(statusUrl);
      const statusData = await statusRes.json();

      if (statusData?.status_code === 'FINISHED') {
        ready = true;
        break;
      }
      if (statusData?.status_code === 'ERROR') {
        return {
          ok: false,
          error:
            'Instagram container creation failed on Meta servers. Please ensure the image is publicly accessible and has a valid aspect ratio between 4:5 and 1.91:1.',
        };
      }
    }

    if (!ready) {
      await new Promise((r) => setTimeout(r, 2000));
    }

    // Step 3: Publish Media Container
    const publishUrl = `${GRAPH_BASE}/${encodeURIComponent(igUserId)}/media_publish`;
    const publishRes = await fetch(publishUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: creationId,
        access_token: token,
      }),
    });

    const publishData = await publishRes.json();
    if (!publishRes.ok || publishData.error) {
      return { ok: false, error: explainInstagramError(publishData) };
    }

    return {
      ok: true,
      postId: publishData.id,
    };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Instagram feed post publication failed' };
  }
}

/**
 * Uploads an image buffer to Meta's CDN (as an unpublished photo)
 * to obtain an official Meta CDN URL for seamless Instagram Container Publishing.
 */
export async function uploadBufferToMetaCdn(
  pageId: string,
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  pageToken: string
): Promise<string> {
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(buffer)], { type: mimeType || 'image/jpeg' });
  formData.append('source', blob, fileName || 'upload.jpg');
  formData.append('published', 'false');
  formData.append('temporary', 'true');
  formData.append('access_token', pageToken);

  const res = await fetch(`${GRAPH_BASE}/${encodeURIComponent(pageId)}/photos`, {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  if (!res.ok || data.error || !data.id) {
    throw new Error(explainInstagramError(data));
  }

  const photoUrl = `${GRAPH_BASE}/${encodeURIComponent(data.id)}?fields=images&access_token=${encodeURIComponent(pageToken)}`;
  const photoRes = await fetch(photoUrl);
  const photoData = await photoRes.json();

  if (photoData?.images && photoData.images.length > 0) {
    return photoData.images[0].source;
  }
  throw new Error('Failed to retrieve Meta CDN URL for uploaded photo.');
}


