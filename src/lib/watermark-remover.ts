import sharp from 'sharp';
import { detectStarWatermarkWithAi } from './gemini';

export type WatermarkMode = 'logo_stamp' | 'spot_healer' | 'off';

export interface WatermarkOptions {
  mode?: WatermarkMode;
  logoUrl?: string;
  accountName?: string;
  barColor?: string;
  pageId?: string;
  corner?: 'bottom-right' | 'bottom-left' | 'top-right';
}

/**
 * Targeted Micro-Inpainting Spot Healer
 * Samples adjacent texture to feather and erase the 4-point AI star.
 */
export async function eraseWatermarkSpotHealer(
  imageBuffer: Buffer,
  corner: 'bottom-right' | 'bottom-left' | 'top-right' = 'bottom-right'
): Promise<Buffer> {
  try {
    const meta = await sharp(imageBuffer).metadata();
    const width = meta.width || 1080;
    const height = meta.height || 1080;

    const boxSize = Math.max(38, Math.min(80, Math.round(width * 0.048)));
    const edgeMargin = Math.max(25, Math.round(width * 0.032));

    let boxLeft = width - edgeMargin - boxSize;
    let boxTop = height - edgeMargin - boxSize;
    let sampleLeft = Math.max(0, boxLeft - boxSize - 12);
    let sampleTop = boxTop;

    if (corner === 'bottom-left') {
      boxLeft = edgeMargin;
      boxTop = height - edgeMargin - boxSize;
      sampleLeft = boxLeft + boxSize + 12;
      sampleTop = boxTop;
    } else if (corner === 'top-right') {
      boxLeft = width - edgeMargin - boxSize;
      boxTop = edgeMargin;
      sampleLeft = Math.max(0, boxLeft - boxSize - 12);
      sampleTop = boxTop;
    }

    sampleLeft = Math.max(0, Math.min(width - boxSize, sampleLeft));
    sampleTop = Math.max(0, Math.min(height - boxSize, sampleTop));

    const sampleTexture = await sharp(imageBuffer)
      .extract({
        left: sampleLeft,
        top: sampleTop,
        width: boxSize,
        height: boxSize,
      })
      .blur(1.8)
      .toBuffer();

    return await sharp(imageBuffer)
      .composite([
        {
          input: sampleTexture,
          left: boxLeft,
          top: boxTop,
          blend: 'over',
        },
      ])
      .jpeg({ quality: 95 })
      .toBuffer();
  } catch (err) {
    console.warn('Spot healer fallback to original buffer:', err);
    return imageBuffer;
  }
}

/**
 * Creates a circular logo badge buffer
 */
async function getCircularBadge(
  size: number,
  logoUrl?: string,
  accountName?: string,
  barColor: string = '#E60023'
): Promise<Buffer> {
  // If custom logo is provided (base64 data URL or web URL)
  if (logoUrl) {
    try {
      let rawLogoBuffer: Buffer;
      if (logoUrl.startsWith('data:')) {
        const base64Data = logoUrl.split(',')[1];
        rawLogoBuffer = Buffer.from(base64Data, 'base64');
      } else if (/^https?:\/\//i.test(logoUrl)) {
        const res = await fetch(logoUrl);
        const arrayBuf = await res.arrayBuffer();
        rawLogoBuffer = Buffer.from(arrayBuf);
      } else {
        throw new Error('Unsupported logo format');
      }

      // Resize and round into a circle with sharp
      const resized = await sharp(rawLogoBuffer)
        .resize(size, size, { fit: 'cover' })
        .png()
        .toBuffer();

      const circleMask = Buffer.from(
        `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="#fff"/></svg>`
      );
      const ringBorder = Buffer.from(
        `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="none" stroke="#ffffff" stroke-width="3"/></svg>`
      );

      const masked = await sharp(resized)
        .composite([{ input: circleMask, blend: 'dest-in' }])
        .png()
        .toBuffer();

      return await sharp(masked)
        .composite([{ input: ringBorder, blend: 'over' }])
        .png()
        .toBuffer();
    } catch (err) {
      console.warn('Failed to process custom logo, falling back to initial badge:', err);
    }
  }

  // Fallback: Elegant initial badge
  const initial = accountName ? accountName.trim().charAt(0).toUpperCase() : 'P';
  const svg = Buffer.from(`
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.5"/>
        </filter>
      </defs>
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="${barColor}" stroke="#FFFFFF" stroke-width="3" filter="url(#shadow)"/>
      <text x="50%" y="54%" font-family="Poppins, Arial, sans-serif" font-size="${Math.round(size * 0.46)}" font-weight="900" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle">${initial}</text>
    </svg>
  `);

  return sharp(svg).png().toBuffer();
}

/**
 * Stamps Brand Logo directly over the watermark star
 */
export async function stampLogoOverStar(
  imageBuffer: Buffer,
  options: WatermarkOptions = {}
): Promise<Buffer> {
  try {
    const meta = await sharp(imageBuffer).metadata();
    const width = meta.width || 1080;
    const height = meta.height || 1080;

    // 1. Detect star position with Gemini Vision AI
    const aiResult = await detectStarWatermarkWithAi(imageBuffer);

    let badgeSize: number;
    let badgeLeft: number;
    let badgeTop: number;

    if (aiResult.found && typeof aiResult.starX === 'number' && typeof aiResult.starY === 'number') {
      // Exact center from AI detection
      badgeSize = Math.max(56, Math.min(94, Math.round((aiResult.starWidth || 48) * 1.35)));
      badgeLeft = Math.round(aiResult.starX - badgeSize / 2);
      badgeTop = Math.round(aiResult.starY - badgeSize / 2);
      console.log(`[AI Watermark Detector] Star found at (${aiResult.starX}, ${aiResult.starY}). Stamping logo at (${badgeLeft}, ${badgeTop}) with size ${badgeSize}px`);
    } else {
      // Safe fallback position: inside the typical Imagen star zone, elevated above the bottom bar
      badgeSize = Math.max(54, Math.min(88, Math.round(width * 0.058)));
      const offsetX = Math.max(48, Math.round(width * 0.075));
      const offsetY = Math.max(80, Math.round(height * 0.095)); // well above bottom bar

      badgeLeft = width - offsetX - badgeSize;
      badgeTop = height - offsetY - badgeSize;

      if (options.corner === 'bottom-left') {
        badgeLeft = offsetX;
        badgeTop = height - offsetY - badgeSize;
      } else if (options.corner === 'top-right') {
        badgeLeft = width - offsetX - badgeSize;
        badgeTop = offsetX;
      }
    }

    // Keep badge within image bounds
    badgeLeft = Math.max(4, Math.min(width - badgeSize - 4, badgeLeft));
    badgeTop = Math.max(4, Math.min(height - badgeSize - 4, badgeTop));

    // 2. Micro spot-healer on the star area first to prevent transparent leakage
    let baseCleaned = imageBuffer;
    try {
      const sampleLeft = Math.max(0, badgeLeft - badgeSize - 10);
      const patch = await sharp(imageBuffer)
        .extract({
          left: sampleLeft,
          top: badgeTop,
          width: badgeSize,
          height: badgeSize,
        })
        .blur(1.6)
        .toBuffer();

      baseCleaned = await sharp(imageBuffer)
        .composite([{ input: patch, left: badgeLeft, top: badgeTop, blend: 'over' }])
        .toBuffer();
    } catch {
      baseCleaned = imageBuffer;
    }

    // 3. Generate circular logo badge
    const badgeBuffer = await getCircularBadge(
      badgeSize,
      options.logoUrl,
      options.accountName,
      options.barColor || '#E60023'
    );

    // 4. Composite over exact star position
    return await sharp(baseCleaned)
      .composite([
        {
          input: badgeBuffer,
          left: badgeLeft,
          top: badgeTop,
          blend: 'over',
        },
      ])
      .jpeg({ quality: 95 })
      .toBuffer();
  } catch (err) {
    console.warn('stampLogoOverStar failed, returning cleaned buffer:', err);
    return eraseWatermarkSpotHealer(imageBuffer, options.corner);
  }
}

/**
 * Central watermark removal & logo stamping dispatcher
 */
export async function removeWatermark(
  imageBuffer: Buffer,
  optionsOrMode: WatermarkOptions | WatermarkMode = 'logo_stamp'
): Promise<Buffer> {
  if (!imageBuffer) return imageBuffer;

  const options: WatermarkOptions =
    typeof optionsOrMode === 'string'
      ? { mode: optionsOrMode }
      : (optionsOrMode || {});

  const mode = options.mode ?? 'logo_stamp';

  if (mode === 'off') {
    return imageBuffer;
  }

  if (mode === 'spot_healer') {
    return eraseWatermarkSpotHealer(imageBuffer, options.corner);
  }

  // Default: logo_stamp (covers star with brand logo / page avatar)
  return stampLogoOverStar(imageBuffer, options);
}
