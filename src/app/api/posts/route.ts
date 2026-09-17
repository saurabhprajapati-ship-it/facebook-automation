import { NextResponse } from 'next/server';
import { getDbFromReq, saveDbAsync, extractDriveFromReq, PostRecord } from '@/lib/db';
import { publishToFacebook, publishBufferToFacebook } from '@/lib/facebook';
import { publishInstagramFeedPost, uploadBufferToMetaCdn } from '@/lib/instagram';
import { processBrandedImageUrl } from '@/lib/image-banner';
import { getUserFromReq } from '@/lib/auth-db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const user = await getUserFromReq(req);
  const db = await getDbFromReq(req);

  let posts = db.posts || [];
  if (user && user.role !== 'admin' && user.email !== 'saurabhprajapatidev@gmail.com') {
    posts = posts.filter((p) => p.userId === user.id);
  }


  return NextResponse.json({ posts }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    },
  });
}

export async function POST(req: Request) {
  try {
    const user = await getUserFromReq(req);
    const activeUserId = user ? user.id : 'usr_admin_saurabh';
    const driveCreds = extractDriveFromReq(req);
    const body = await req.json();
    const { accountId, message, link, imageUrl, applyBranding = true } = body;

    const db = await getDbFromReq(req);
    const finalMessage = [message, link].filter(Boolean).join('\n\n');

    if (accountId === 'both') {
      const fbAccount = db.accounts.find((a) => a.platform === 'facebook');
      const igAccount = db.accounts.find((a) => a.platform === 'instagram');

      if (!fbAccount && !igAccount) {
        return NextResponse.json({ error: 'No active accounts connected' }, { status: 400 });
      }

      const publishedIds: string[] = [];

      // 1. Post to Facebook
      if (fbAccount) {
        let fbId = '';
        if (imageUrl && applyBranding && db.branding) {
          try {
            const accountDisplayName = db.branding.customAccountNames?.[fbAccount.id] || fbAccount.name;
            const brandedBuffer = await processBrandedImageUrl(imageUrl, {
              title: '',
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
              pageId: fbAccount.pageId,
            });
            const res = await publishBufferToFacebook({
              pageId: fbAccount.pageId,
              pageToken: fbAccount.pageAccessToken,
              buffer: brandedBuffer,
              fileName: 'post.jpg',
              mimeType: 'image/jpeg',
              caption: finalMessage,
            });
            fbId = res.postId;
          } catch (e) {
            console.warn('Branded publish fallback:', e);
          }
        }
        if (!fbId) {
          const res = await publishToFacebook({
            pageId: fbAccount.pageId,
            pageToken: fbAccount.pageAccessToken,
            message: finalMessage,
            link: link || undefined,
            imageUrl: imageUrl || undefined,
          });
          fbId = res.postId;
        }
        if (fbId) {
          publishedIds.push(fbId);
          db.posts.unshift({
            id: 'post_' + Date.now() + '_fb',
            userId: activeUserId,
            accountName: fbAccount.name,
            title: message?.slice(0, 50) || 'New Post',
            caption: finalMessage,
            imageUrl,
            externalLink: link,
            fbPostId: fbId,
            status: 'live',
            createdAt: new Date().toISOString(),
          });
        }
      }

      // 2. Post to Instagram
      if (igAccount) {
        if (!imageUrl) {
          return NextResponse.json(
            { error: 'Instagram feed posts strictly require an image URL.' },
            { status: 400 }
          );
        }
        const igUserId = igAccount.igUserId || igAccount.pageId;
        let igImageUrl = imageUrl;
        if (applyBranding && db.branding) {
          try {
            const igDisplayName = db.branding.customAccountNames?.[igAccount.id] || (igAccount.username ? `@${igAccount.username}` : igAccount.name);
            const brandedBuffer = await processBrandedImageUrl(imageUrl, {
              title: '',
              accountName: igDisplayName,
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
              pageId: igAccount.pageId,
            });
            igImageUrl = await uploadBufferToMetaCdn(
              igAccount.pageId,
              brandedBuffer,
              'post.jpg',
              'image/jpeg',
              igAccount.pageAccessToken
            );
          } catch (brandErr) {
            console.warn('Failed to apply branding for IG in posts route, using raw image:', brandErr);
          }
        }
        const igRes = await publishInstagramFeedPost(igUserId, igImageUrl, finalMessage, igAccount.pageAccessToken);
        if (igRes.ok && igRes.postId) {
          publishedIds.push(igRes.postId);
          db.posts.unshift({
            id: 'post_' + Date.now() + '_ig',
            userId: activeUserId,
            accountName: igAccount.username ? `@${igAccount.username}` : igAccount.name,
            title: message?.slice(0, 50) || 'New Post',
            caption: finalMessage,
            imageUrl,
            externalLink: link,
            fbPostId: igRes.postId,
            status: 'live',
            createdAt: new Date().toISOString(),
          });
        }
      }

      await saveDbAsync({ posts: db.posts }, driveCreds);
      return NextResponse.json({
        ok: true,
        postId: publishedIds.join(', '),
        platform: 'both',
        accountName: 'Facebook & Instagram',
      });
    }

    const account = db.accounts.find(
      (a) => a.id === accountId || a.pageId === accountId || a.igUserId === accountId
    );

    if (!account) {
      return NextResponse.json({ error: 'Selected account not found' }, { status: 404 });
    }

    let postId = '';

    if (account.platform === 'instagram') {
      if (!imageUrl) {
        return NextResponse.json(
          { error: 'Instagram feed posts strictly require an image URL.' },
          { status: 400 }
        );
      }
      const igUserId = account.igUserId || account.pageId;
      let igImageUrl = imageUrl;
      if (applyBranding && db.branding) {
        try {
          const igDisplayName = db.branding.customAccountNames?.[account.id] || (account.username ? `@${account.username}` : account.name);
          const brandedBuffer = await processBrandedImageUrl(imageUrl, {
            title: '',
            accountName: igDisplayName,
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
          igImageUrl = await uploadBufferToMetaCdn(
            account.pageId,
            brandedBuffer,
            'post.jpg',
            'image/jpeg',
            account.pageAccessToken
          );
        } catch (brandErr) {
          console.warn('Failed to apply branding for single IG in posts route, using raw image:', brandErr);
        }
      }
      const res = await publishInstagramFeedPost(igUserId, igImageUrl, finalMessage, account.pageAccessToken);
      if (!res.ok || !res.postId) {
        return NextResponse.json({ error: res.error || 'Failed to post to Instagram' }, { status: 500 });
      }
      postId = res.postId;
    } else {
      // Facebook
      if (imageUrl && applyBranding && db.branding) {
        try {
          const accountDisplayName = db.branding.customAccountNames?.[account.id] || account.name;
          const brandedBuffer = await processBrandedImageUrl(imageUrl, {
            title: '',
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
          const res = await publishBufferToFacebook({
            pageId: account.pageId,
            pageToken: account.pageAccessToken,
            buffer: brandedBuffer,
            fileName: 'post.jpg',
            mimeType: 'image/jpeg',
            caption: finalMessage,
          });
          postId = res.postId;
        } catch (e) {
          console.warn('Branded publish fallback to standard:', e);
        }
      }

      if (!postId) {
        const res = await publishToFacebook({
          pageId: account.pageId,
          pageToken: account.pageAccessToken,
          message: finalMessage,
          link: link || undefined,
          imageUrl: imageUrl || undefined,
        });
        postId = res.postId;
      }
    }

    // Record post
    const newPost: PostRecord = {
      id: 'post_' + Date.now(),
      userId: activeUserId,
      accountName: account.username ? `@${account.username}` : account.name,
      title: message?.slice(0, 50) || 'New Post',
      caption: finalMessage,
      imageUrl,
      externalLink: link,
      fbPostId: postId,
      status: 'live',
      createdAt: new Date().toISOString(),
    };
    db.posts.unshift(newPost);
    account.lastPostedAt = new Date().toISOString();
    await saveDbAsync({ posts: db.posts, accounts: db.accounts }, driveCreds);

    return NextResponse.json({ ok: true, postId, platform: account.platform });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Post failed' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const user = await getUserFromReq(req);
  const driveCreds = extractDriveFromReq(req);
  const db = await getDbFromReq(req);

  const isAdmin = !user || user.role === 'admin' || user.email === 'saurabhprajapatidev@gmail.com' || user.id === 'usr_admin_saurabh';
  const remainingPosts = isAdmin ? [] : (db.posts || []).filter((p) => p.userId !== user.id);

  await saveDbAsync({ posts: remainingPosts }, driveCreds);
  return NextResponse.json({ ok: true });
}

