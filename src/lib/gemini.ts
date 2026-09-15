import { getDb, saveDb, GeminiKey } from './db';
import { getScriptName, checkWrongScript } from './script-checker';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

const BANNED_WORDS = [
  'delve', 'moreover', 'furthermore', 'landscape', 'realm', 'robust', 'seamless',
  'game-changer', 'game changer', 'unlock', 'unleash', 'leverage', 'harness',
  'testament', 'tapestry', 'navigate the', 'in conclusion', 'dive into',
  'buckle up', 'look no further', 'revolutionize', 'cutting-edge', 'cutting edge',
  'elevate', 'embark', 'paradigm', 'synergy', 'transformative', 'pivotal',
  'ever-evolving', 'ever evolving', 'as we all know', 'it is worth noting',
];

export interface GeneratedStory {
  title: string;
  imageQuery: string;
  body: string;
}

export function cleanText(text: string, maxChars: number = 2000): string {
  let t = String(text || '').trim();
  t = t.replace(/^["'“‘]+|["'”’]+$/g, '');
  t = t.replace(/https?:\/\/\S+/g, '');
  t = t.replace(/\bwww\.\S+/gi, '');
  t = t.replace(/^\s*(source|via|read more|credit)\s*:.*$/gim, '');
  t = t.replace(/[‐-―−]/g, ' ');
  t = t.replace(/(\S)\s-\s(\S)/g, '$1, $2');
  t = t.replace(/#\w+/g, '');
  t = t.replace(/\*\*/g, '').replace(/[*_`]/g, '');
  t = t.replace(/^\s*(TITLE|IMAGE|STORY|POST)\s*:.*$/gim, '');

  for (const w of BANNED_WORDS) {
    const re = new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
    t = t.replace(re, '');
  }

  t = t.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

  if (t.length > maxChars) {
    const cut = t.slice(0, maxChars);
    const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('۔'), cut.lastIndexOf('।'));
    t = stop > maxChars * 0.5 ? cut.slice(0, stop + 1) : cut.replace(/\s+\S*$/, '');
  }

  return t;
}

export function scoreModel(name: string): number {
  const n = String(name).toLowerCase();
  
  // Explicit top priority for proven active models
  if (n === 'gemini-3.6-flash') return 1000;
  if (n === 'gemini-3.5-flash') return 950;
  if (n === 'gemini-flash-latest') return 900;
  if (n === 'gemini-3.7-flash') return 850;
  if (n === 'gemini-3.1-flash-lite') return 800;
  if (n === 'gemini-3.8-flash') return 750;

  let score = 0;
  const ver = n.match(/(\d+)[.-](\d+)/);
  if (ver) score += Number(ver[1]) * 100 + Number(ver[2]) * 10;
  else {
    const solo = n.match(/gemini-(\d+)/);
    if (solo) score += Number(solo[1]) * 100;
  }

  if (n.includes('flash')) score += 45;
  if (n.includes('lite')) score += 20;
  if (n.includes('pro')) score += 10;

  // Penalize retired or non-text generation models
  if (/vision|embedding|aqa|tts|image|audio|video|thinking|exp|preview|2\.5|2\.0|1\.5/.test(n)) {
    score -= 300;
  }
  return score;
}

export async function fetchLiveModels(apiKey: string): Promise<string[]> {
  const url = `${GEMINI_BASE}/models?key=${encodeURIComponent(apiKey)}&pageSize=100`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Gemini API HTTP ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const models = (data.models || [])
    .filter((m: any) => (m.supportedGenerationMethods || []).includes('generateContent'))
    .map((m: any) => String(m.name).replace(/^models\//, ''))
    .filter((name: string) => (name.startsWith('gemini') || name.startsWith('gemma')) && !/2\.5|2\.0|1\.5/.test(name))
    .sort((a: string, b: string) => scoreModel(b) - scoreModel(a));

  return models;
}

export async function testGeminiKey(apiKey: string): Promise<{ ok: boolean; models: string[]; error?: string }> {
  try {
    const models = await fetchLiveModels(apiKey);
    if (!models.length) {
      return { ok: false, models: [], error: 'Key valid but no models found' };
    }
    return { ok: true, models };
  } catch (err: any) {
    return { ok: false, models: [], error: err.message || 'Key validation failed' };
  }
}

export async function generateContentWithRotation(prompt: string, maxTokens: number = 1000): Promise<string> {
  const db = getDb();
  const keys = db.geminiKeys.filter((k) => k.status !== 'invalid');
  if (!keys.length) {
    throw new Error('No valid Gemini API key found. Please add a key in the Gemini section.');
  }

  const errors: string[] = [];
  const defaultActiveModels = [
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-flash-latest',
    'gemini-3.7-flash',
    'gemini-3.1-flash-lite',
    'gemini-3.8-flash',
  ];

  for (const k of keys) {
    // Filter out retired models (2.5, 2.0, 1.5, tts, image) and prioritize 3.6-flash
    let keyModels = (k.models && k.models.length ? k.models : defaultActiveModels)
      .filter((m: string) => !/2\.5|2\.0|1\.5|tts|image|preview/.test(m))
      .sort((a: string, b: string) => scoreModel(b) - scoreModel(a));

    if (!keyModels.length) {
      keyModels = defaultActiveModels;
    }

    for (const model of keyModels.slice(0, 5)) {
      const genConfig: any = {
        temperature: 0.85,
        maxOutputTokens: maxTokens,
      };

      try {
        const url = `${GEMINI_BASE}/models/${model}:generateContent?key=${encodeURIComponent(k.key)}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: genConfig,
          }),
        });

        if (res.status === 429) {
          errors.push(`Key ${k.maskedKey}: Quota exhausted on ${model}`);
          k.status = 'rate_limited';
          saveDb({ geminiKeys: db.geminiKeys });
          break; // Switch to next key
        }

        if (res.status === 401 || res.status === 403) {
          errors.push(`Key ${k.maskedKey}: Invalid API Key (HTTP ${res.status})`);
          k.status = 'invalid';
          saveDb({ geminiKeys: db.geminiKeys });
          break; // Switch to next key
        }

        if (res.status === 404) {
          errors.push(`Model ${model} retired`);
          continue; // Try next active model
        }

        if (!res.ok) {
          errors.push(`${model} HTTP ${res.status}`);
          continue;
        }

        const body = await res.json();
        const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim()) {
          k.lastUsed = new Date().toISOString();
          k.postsToday = (k.postsToday || 0) + 1;
          saveDb({ geminiKeys: db.geminiKeys });
          return text.trim();
        }
      } catch (err: any) {
        errors.push(`${model}: ${err.message}`);
      }
    }
  }

  throw new Error(`All Gemini keys failed: ${errors.join(' | ')}`);
}

export async function generateAutoPostStory(options: {
  topic: string;
  language: string;
  length: 'short' | 'medium' | 'long';
  recentTitles?: string[];
}): Promise<GeneratedStory> {
  const { topic, language, length, recentTitles = [] } = options;
  const script = getScriptName(language);
  const inLang = language + (script ? ` (${script} script)` : '');

  const wordLimits = {
    short: { words: 50, cap: 400 },
    medium: { words: 90, cap: 800 },
    long: { words: 150, cap: 1400 },
  };
  const size = wordLimits[length] || wordLimits.medium;

  const avoidSection = recentTitles.length
    ? `\nAlready posted (do not repeat these subjects):\n- ${recentTitles.slice(0, 15).join('\n- ')}\n`
    : '';

  const prompt = `You write engaging posts for a Facebook page.
Page Topic: ${topic}
Language: ${inLang}
${avoidSection}
Pick one interesting piece of news or fact about this topic and write a full post.
Format your answer in EXACTLY this structure:
TITLE: <one short punchy headline in ${inLang}>
IMAGE: <two or three plain English words for a photo search>
POST:
<the complete post in ${inLang}>

Rules:
- TITLE and POST must be written 100% in ${inLang}.
${script ? `- Every word in TITLE and POST must strictly use ${script} script. Do not use any other alphabet.\n` : ''}
- The IMAGE line must be strictly in plain ENGLISH (using Latin alphabet) so our photo search engine can find a photo. Never omit this line.
- About ${size.words} words.
- Start with the most engaging hook.
- Clean everyday language.
- No URLs or hashtags in the POST body.
- No dash characters (-, --, em-dash). Use commas or full stops.`;

  const raw = await generateContentWithRotation(prompt, 1200);

  // Parse structure
  const titleMatch = raw.match(/^\s*TITLE\s*:\s*(.+)$/im);
  const imageMatch = raw.match(/^\s*IMAGE\s*:\s*(.+)$/im);
  const postMatch = raw.match(/^\s*(?:POST|STORY)\s*:\s*([\s\S]+)$/im);

  const rawTitle = titleMatch ? titleMatch[1].trim() : '';
  const rawImage = imageMatch ? imageMatch[1].trim() : '';
  let rawBody = postMatch ? postMatch[1].trim() : raw.replace(/^\s*(TITLE|IMAGE)\s*:.*$/gim, '').trim();

  const cleanBody = cleanText(rawBody, size.cap);
  const cleanTitle = rawTitle || cleanBody.split('\n')[0].slice(0, 80);

  // Validate script
  const wrongScript = checkWrongScript(cleanTitle + ' ' + cleanBody, language);
  if (wrongScript) {
    console.warn(`Generated story was in ${wrongScript} script instead of ${language}`);
  }

  return {
    title: cleanTitle,
    imageQuery: rawImage,
    body: cleanBody,
  };
}

export async function generateCaptionForArticle(title: string, excerptOrBody: string): Promise<string> {
  const prompt = `Write a compelling Facebook post caption for this article:
Title: ${title}
Content: ${excerptOrBody.slice(0, 1200)}

Rules:
- 2 to 4 sentences, around 50-70 words.
- Explain what happened and why it matters.
- Simple conversational English.
- No AI buzzwords (never use delve, game-changer, unlock, tapestry, landscape).
- Do not include URLs or hashtags.
- Output ONLY the caption text.`;

  try {
    const raw = await generateContentWithRotation(prompt, 500);
    return cleanText(raw, 600);
  } catch {
    return cleanText(excerptOrBody.slice(0, 300), 300) || title;
  }
}

export async function generateCaptionForMedia(options: {
  fileName: string;
  topic?: string;
  language?: string;
}): Promise<string> {
  const { fileName, topic = 'viral facts, science and daily interesting stories', language = 'English' } = options;
  const cleanName = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

  const prompt = `You write engaging, viral Facebook post captions.
Topic: ${topic}
Image File Context: "${cleanName}"
Language: ${language}

Write an interesting, attention-grabbing Facebook caption for this post:
- 2 to 3 engaging sentences (around 40-70 words).
- Add 3 to 5 trending hashtags at the bottom.
- Clean everyday language, zero robotic buzzwords (no delve, landscape, tapestry, game-changer).
- Output ONLY the caption text and hashtags.`;

  try {
    const raw = await generateContentWithRotation(prompt, 400);
    return raw.trim();
  } catch (err: any) {
    console.warn('Gemini caption error, using fallback:', err);
    return `${cleanName}\n\n#trending #viral #explore`;
  }
}

export interface StarDetectionResult {
  found: boolean;
  starX?: number;
  starY?: number;
  starWidth?: number;
}

/**
 * AI-powered star watermark locator.
 * Scans the bottom-right corner with Gemini Vision to detect exact pixel coordinates
 * of the 4-point AI sparkle star.
 */
export async function detectStarWatermarkWithAi(
  imageBuffer: Buffer
): Promise<StarDetectionResult> {
  const db = getDb();
  const keys = (db.geminiKeys || []).filter((k) => k.status !== 'invalid');
  if (!keys.length) {
    return { found: false };
  }

  try {
    const sharp = (await import('sharp')).default;
    const meta = await sharp(imageBuffer).metadata();
    const width = meta.width || 1080;
    const height = meta.height || 1080;

    const isSmallCrop = width <= 400 || height <= 400;
    const cropWidth = isSmallCrop ? width : Math.round(width * 0.30);
    const cropHeight = isSmallCrop ? height : Math.round(height * 0.30);
    const cropLeft = isSmallCrop ? 0 : width - cropWidth;
    const cropTop = isSmallCrop ? 0 : height - cropHeight;

    const cropBuffer = await sharp(imageBuffer)
      .extract({
        left: cropLeft,
        top: cropTop,
        width: cropWidth,
        height: cropHeight,
      })
      .jpeg({ quality: 85 })
      .toBuffer();

    const base64Crop = cropBuffer.toString('base64');
    const prompt = `This image is the bottom-right corner of a picture.
Locate the 4-point sparkle star / diamond watermark if present.
Return ONLY valid JSON:
{"found": true, "center_x_percent": 42, "center_y_percent": 46, "star_width_px": 50}
If no watermark star is visible, return:
{"found": false}`;

    for (const k of keys) {
      const activeModels = (k.models && k.models.length > 0)
        ? k.models
        : ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-flash-latest'];

      for (const model of activeModels.slice(0, 4)) {
        try {
          const url = `${GEMINI_BASE}/models/${model}:generateContent?key=${encodeURIComponent(k.key)}`;
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64Crop } },
                    { text: prompt },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.1,
                responseMimeType: 'application/json',
              },
            }),
          });

          if (res.status === 429) {
            k.status = 'rate_limited';
            saveDb({ geminiKeys: db.geminiKeys });
            break;
          }
          if (res.status === 401 || res.status === 403) {
            k.status = 'invalid';
            saveDb({ geminiKeys: db.geminiKeys });
            break;
          }
          if (!res.ok) continue;

          const body = await res.json();
          const rawText = body.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const parsed = JSON.parse(rawText.trim());
            if (parsed.found && typeof parsed.center_x_percent === 'number' && typeof parsed.center_y_percent === 'number') {
              const starX = Math.round(cropLeft + (parsed.center_x_percent / 100) * cropWidth);
              const starY = Math.round(cropTop + (parsed.center_y_percent / 100) * cropHeight);
              return {
                found: true,
                starX,
                starY,
                starWidth: parsed.star_width_px || Math.round(width * 0.05),
              };
            }
            return { found: false };
          }
        } catch {
          // Continue to next model/key
        }
      }
    }
  } catch (err) {
    console.warn('AI star detection failed, falling back:', err);
  }

  return { found: false };
}
