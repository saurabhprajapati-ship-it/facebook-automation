import { getDb, saveDb, Automation, Account, PostRecord, NotificationItem } from './db';
import { generateAutoPostStory, generateCaptionForArticle } from './gemini';
import { findFreePhoto } from './photos';
import { fetchSitePosts } from './rss-parser';
import { publishToFacebook, publishBufferToFacebook } from './facebook';
import { publishInstagramFeedPost } from './instagram';
import { processBrandedImageUrl } from './image-banner';

export interface RunResult {
  ok: boolean;
  dryRun: boolean;
  pageName: string;
  title: string;
  caption: string;
  imageUrl?: string;
  fbPostId?: string;
  error?: string;
}

export async function executeAutomation(automationId: string, dryRun: boolean = false): Promise<RunResult> {
  const db = getDb();
  const auto = db.automations.find((a) => a.id === automationId);
  if (!auto) {
    throw new Error('Automation not found');
  }

  // Find target accounts
  const targetAccounts = db.accounts.filter((acc) =>
    acc.active &&
    (auto.targetAccountIds.includes(acc.id) || auto.targetAccountIds.length === 0)
  );

  if (!targetAccounts.length) {
    throw new Error('No active account connected. Please connect a Facebook Page in Accounts first.');
  }

  const allTargetNames = targetAccounts.map((a) => a.name).join(', ');
  const recentTitles = db.posts.slice(-25).map((p) => p.title);

  let title = '';
  let bodyText = '';
  let imageUrl = '';
  let externalLink = auto.customLink || '';

  try {
    if (auto.kind === 'ai') {
      const story = await generateAutoPostStory({
        topic: auto.topic || 'general viral news and science facts',
        language: auto.language || 'English',
        length: auto.postLength || 'medium',
        recentTitles,
      });

      title = story.title;
      bodyText = story.body;

      if (auto.addPicture) {
        const photo = await findFreePhoto(story.imageQuery || auto.topic || title);
        if (photo) {
          imageUrl = photo.url;
        }
      }
    } else {
      // Feed / Website mode
      const sitePosts = await fetchSitePosts(auto.feedType || 'rss', auto.feedUrl || '');
      const postedUrls = new Set(db.posts.map((p) => (p.externalLink || '').toLowerCase()));
      const available = sitePosts.filter((p) => !postedUrls.has(p.url.toLowerCase()));

      if (!available.length) {
        throw new Error('No new articles found in feed.');
      }

      const post = available[0];
      title = post.title;
      externalLink = post.url;
      imageUrl = post.image || '';

      bodyText = await generateCaptionForArticle(post.title, post.body || post.summary);
    }

    // Build final formatted message
    let finalMessage = title ? `${title}\n\n${bodyText}` : bodyText;

    if (auto.customLink && auto.textBeforeLink) {
      finalMessage += `\n\n${auto.textBeforeLink}\n${auto.customLink}`;
    } else if (auto.customLink) {
      finalMessage += `\n\n${auto.customLink}`;
    }

    if (auto.addHashtags) {
      const tags = ['#viral', '#trending', '#news', '#foryou'];
      finalMessage += `\n\n${tags.join(' ')}`;
    }

    const publishedPostIds: string[] = [];
    const publishedAccounts: string[] = [];
    const errors: string[] = [];

    if (!dryRun) {
      for (const account of targetAccounts) {
        let fbPostId: string | undefined;
        try {
          if (account.platform === 'instagram') {
            if (!imageUrl) {
              throw new Error('Instagram feed post requires an image.');
            }
            const igUserId = account.igUserId || account.pageId;
            const igRes = await publishInstagramFeedPost(igUserId, imageUrl, finalMessage, account.pageAccessToken);
            if (!igRes.ok || !igRes.postId) {
              throw new Error(igRes.error || 'Instagram posting failed');
            }
            fbPostId = igRes.postId;
          } else {
            // 1. Try branded image publishing if image is present and branding is enabled
            if (imageUrl && db.branding?.enabledOnAuto) {
              try {
                const accountDisplayName = db.branding.customAccountNames?.[account.id] || account.name;
                const brandedBuffer = await processBrandedImageUrl(imageUrl, {
                  title,
                  accountName: accountDisplayName,
                  bottomText: db.branding.bottomText,
                  barColor: db.branding.barColor,
                  textColor: db.branding.textColor,
                  font: db.branding.font,
                  look: db.branding.look,
                  headlineBanner: Boolean(db.branding.headlineBanner),
                  showTopBadge: Boolean(db.branding.showTopBadge),
                  showBottomBar: db.branding.showBottomBar !== false,
                  watermarkMode: db.branding.watermarkMode || 'logo_stamp',
                  logoUrl: db.branding.logoUrl,
                  pageId: account.pageId,
                });

                const publishRes = await publishBufferToFacebook({
                  pageId: account.pageId,
                  pageToken: account.pageAccessToken,
                  buffer: brandedBuffer,
                  fileName: 'autopost.jpg',
                  mimeType: 'image/jpeg',
                  caption: finalMessage,
                });
                fbPostId = publishRes.postId;
              } catch (brandErr) {
                console.warn('Branded publish failed, falling back to standard publish:', brandErr);
              }
            }

            // 2. Standard Facebook publish fallback
            if (!fbPostId) {
              const publishRes = await publishToFacebook({
                pageId: account.pageId,
                pageToken: account.pageAccessToken,
                message: finalMessage,
                link: externalLink || undefined,
                imageUrl: imageUrl || undefined,
              });
              fbPostId = publishRes.postId;
            }
          }

          // Update account status
          account.lastPostedAt = new Date().toISOString();
          account.lastError = undefined;
          if (fbPostId) publishedPostIds.push(fbPostId);
          publishedAccounts.push(account.name);

          // Record post
          const newPost: PostRecord = {
            id: 'post_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            automationId: auto.id,
            accountName: account.platform === 'instagram' ? (account.username ? `@${account.username}` : account.name) : account.name,
            title,
            caption: finalMessage,
            imageUrl,
            externalLink,
            fbPostId,
            status: 'live',
            createdAt: new Date().toISOString(),
          };
          db.posts.unshift(newPost);

          // Notification
          const notif: NotificationItem = {
            id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            type: 'live',
            title: 'Your post is live',
            message: `Sent to ${account.platform === 'instagram' ? 'Instagram' : 'Facebook'} (${account.name}): ${title.slice(0, 60)}...`,
            createdAt: new Date().toISOString(),
          };
          db.notifications.unshift(notif);
        } catch (accErr: any) {
          const msg = accErr.message || 'Posting failed';
          account.lastError = msg;
          errors.push(`${account.name}: ${msg}`);
          const failNotif: NotificationItem = {
            id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            type: 'failed',
            title: 'Post delivery failed',
            message: `Failed for ${account.name}: ${msg}`,
            createdAt: new Date().toISOString(),
          };
          db.notifications.unshift(failNotif);
        }
      }

      auto.lastRunAt = new Date().toISOString();
      if (publishedPostIds.length > 0) {
        auto.lastStatus = errors.length > 0 ? `Partial (${errors.join('; ')})` : 'Success';
      } else {
        auto.lastStatus = `Error: ${errors.join('; ')}`;
        throw new Error(errors.join('; '));
      }

      saveDb({
        accounts: db.accounts,
        posts: db.posts,
        notifications: db.notifications,
        automations: db.automations,
      });
    }

    return {
      ok: true,
      dryRun,
      pageName: publishedAccounts.join(', ') || targetAccounts.map((a) => a.name).join(', '),
      title,
      caption: finalMessage,
      imageUrl,
      fbPostId: publishedPostIds[0],
    };
  } catch (err: any) {
    const errorMsg = err.message || 'Execution failed';
    if (!dryRun) {
      auto.lastStatus = `Error: ${errorMsg}`;

      const failPost: PostRecord = {
        id: 'post_' + Date.now(),
        automationId: auto.id,
        accountName: allTargetNames,
        title: title || 'Untitled Post',
        caption: bodyText,
        imageUrl,
        status: 'failed',
        errorMsg,
        createdAt: new Date().toISOString(),
      };
      db.posts.unshift(failPost);

      saveDb({
        accounts: db.accounts,
        notifications: db.notifications,
        posts: db.posts,
        automations: db.automations,
      });
    }

    return {
      ok: false,
      dryRun,
      pageName: allTargetNames,
      title,
      caption: bodyText,
      imageUrl,
      error: errorMsg,
    };
  }
}
