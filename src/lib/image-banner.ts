// Headline banner & branding overlay compositor with Sharp integration
import sharp from 'sharp';
import { removeWatermark, WatermarkMode } from './watermark-remover';

export interface BannerOptions {
  title?: string;
  photoUrl?: string;
  accountName: string;
  bottomText: string;
  barColor: string;
  textColor: string;
  font: string;
  look: '3D' | 'normal';
  headlineBanner: boolean;
  showTopBadge?: boolean;  // Default: false (user preference: top clean!)
  showBottomBar?: boolean; // Default: true (Like & Share bar)
  watermarkMode?: WatermarkMode; // 'logo_stamp' | 'spot_healer' | 'off'
  logoUrl?: string;
  pageId?: string;
}

export function generateBannerSvg(options: BannerOptions, width: number = 1080, height: number = 1080): string {
  const {
    title = '',
    accountName,
    bottomText,
    barColor = '#E60023',
    textColor = '#FFFFFF',
    font = 'Poppins, sans-serif',
    look = '3D',
    headlineBanner = false,
    showTopBadge = false,
    showBottomBar = true,
  } = options;

  // Split title into 2-3 punchy uppercase lines (if headline banner is requested)
  let displayLines: string[] = [];
  if (headlineBanner && title.trim()) {
    const words = title.toUpperCase().split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + ' ' + word).trim().length > 24) {
        if (currentLine) lines.push(currentLine.trim());
        currentLine = word;
      } else {
        currentLine += ' ' + word;
      }
    }
    if (currentLine) lines.push(currentLine.trim());
    displayLines = lines.slice(0, 3);
  }

  const shadowFilter = look === '3D'
    ? `<filter id="pillShadow" x="-10%" y="-10%" width="120%" height="130%">
         <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000000" flood-opacity="0.4"/>
       </filter>`
    : '';

  const pillRadius = look === '3D' ? '12' : '4';
  const lineHeight = Math.max(50, Math.round(height * 0.065));
  const barHeight = Math.max(56, Math.round(height * 0.062));
  const startY = height - (barHeight * 3.5) - (displayLines.length * lineHeight);

  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    ${shadowFilter}
    <linearGradient id="bottomGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="rgba(0,0,0,0)"/>
      <stop offset="50%" stop-color="rgba(0,0,0,0.4)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.92)"/>
    </linearGradient>
  </defs>

  ${showBottomBar ? `
  <!-- Gradient overlay at bottom for high legibility -->
  <rect x="0" y="${height - barHeight * 2.5}" width="${width}" height="${barHeight * 2.5}" fill="url(#bottomGrad)"/>
  ` : ''}

  <!-- Top Account Name Badge (Only rendered if showTopBadge is true) -->
  ${showTopBadge && accountName ? `
  <g transform="translate(48, 48)">
    <rect x="0" y="0" width="${accountName.length * 16 + 70}" height="46" rx="23" fill="${barColor}" ${look === '3D' ? 'filter="url(#pillShadow)"' : ''}/>
    <circle cx="24" cy="23" r="5" fill="#FFFFFF"/>
    <text x="38" y="29" font-family="${font}" font-size="20" font-weight="700" fill="${textColor}" letter-spacing="0.5">${accountName}</text>
  </g>
  ` : ''}

  <!-- Headline Overlay Banner (Only if enabled and lines exist) -->
  ${headlineBanner && displayLines.length > 0 ? `
  <g transform="translate(48, ${startY})">
    ${displayLines.map((line, idx) => {
      const y = idx * (lineHeight + 12);
      const estWidth = line.length * 28 + 44;
      return `
      <g transform="translate(0, ${y})">
        <rect x="0" y="0" width="${estWidth}" height="${lineHeight}" rx="${pillRadius}" fill="${barColor}" ${look === '3D' ? 'filter="url(#pillShadow)"' : ''}/>
        <text x="22" y="${lineHeight - 20}" font-family="${font}" font-size="38" font-weight="900" fill="${textColor}" letter-spacing="1">${line}</text>
      </g>
      `;
    }).join('\n')}
  </g>
  ` : ''}

  <!-- Bottom Branding / Like and Share Bar -->
  ${showBottomBar ? `
  <g transform="translate(0, ${height - barHeight})">
    <rect x="0" y="0" width="${width}" height="${barHeight}" fill="#0b0b0b" opacity="0.94"/>
    <circle cx="${Math.round(width * 0.045)}" cy="${barHeight / 2}" r="5" fill="${barColor}"/>
    <text x="${Math.round(width * 0.065)}" y="${Math.round(barHeight * 0.62)}" font-family="${font}" font-size="${Math.max(16, Math.round(barHeight * 0.32))}" font-weight="700" fill="#FFFFFF">${accountName || 'PostNova'}</text>
    <text x="${width - 48}" y="${Math.round(barHeight * 0.62)}" text-anchor="end" font-family="${font}" font-size="${Math.max(15, Math.round(barHeight * 0.30))}" font-weight="500" fill="#e5e5e5">${bottomText || 'For more content, Like and Share'}</text>
  </g>
  ` : ''}
</svg>
`.trim();
}

/**
 * High-performance image branding processor.
 * 1. Removes AI watermark star in corner (Spot Healer or AI Eraser).
 * 2. Overlays responsive branding banner (top/bottom) tailored to the exact image dimensions.
 * 3. Returns Facebook-ready high-quality JPEG buffer.
 */
export async function processBrandedImageBuffer(
  inputBuffer: Buffer,
  options: BannerOptions
): Promise<Buffer> {
  if (!inputBuffer || inputBuffer.length === 0) {
    return inputBuffer;
  }

  try {
    // 1. Watermark Removal & Brand Logo Stamping
    const watermarkMode = options.watermarkMode ?? 'logo_stamp';
    let processedBuffer = await removeWatermark(inputBuffer, {
      mode: watermarkMode,
      logoUrl: options.logoUrl,
      accountName: options.accountName,
      barColor: options.barColor,
      pageId: options.pageId,
      corner: 'bottom-right',
    });

    // If neither top badge nor bottom bar nor headline banner is enabled, return cleaned image
    const showTopBadge = Boolean(options.showTopBadge);
    const showBottomBar = options.showBottomBar !== false;
    const headlineBanner = Boolean(options.headlineBanner && options.title);

    if (!showTopBadge && !showBottomBar && !headlineBanner) {
      return processedBuffer;
    }

    // 2. Measure actual image dimensions
    const meta = await sharp(processedBuffer).metadata();
    const width = meta.width || 1080;
    const height = meta.height || 1080;

    // 3. Generate tailored SVG overlay
    const svgString = generateBannerSvg(
      {
        ...options,
        showTopBadge,
        showBottomBar,
        headlineBanner,
      },
      width,
      height
    );

    // 4. Composite SVG over the image
    const finalBuffer = await sharp(processedBuffer)
      .composite([
        {
          input: Buffer.from(svgString),
          top: 0,
          left: 0,
          blend: 'over',
        },
      ])
      .jpeg({ quality: 92 })
      .toBuffer();

    return finalBuffer;
  } catch (err) {
    console.error('Error processing branded image buffer:', err);
    return inputBuffer;
  }
}

/**
 * Downloads image from URL and applies watermark removal + branding
 */
export async function processBrandedImageUrl(
  imageUrl: string,
  options: BannerOptions
): Promise<Buffer> {
  const res = await fetch(imageUrl);
  if (!res.ok) {
    throw new Error(`Failed to download image from ${imageUrl}: HTTP ${res.status}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  const inputBuffer = Buffer.from(arrayBuffer);
  return processBrandedImageBuffer(inputBuffer, options);
}
