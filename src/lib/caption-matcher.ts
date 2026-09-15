export interface ParsedCaption {
  identifier: string; // "1", "2", "image_001.jpg", etc.
  caption: string;
}

/**
 * Extracts the primary index or number from a media filename.
 * Handles patterns like:
 * - "1.png_20260914192715.jpeg" -> 1
 * - "1.jpg", "001.png" -> 1
 * - "1 - motivation.jpg" -> 1
 * - "image_1.jpg", "photo (1).png" -> 1
 */
export function extractFileNumber(fileName: string): number | null {
  if (!fileName) return null;

  // 1. Check leading number (e.g. "1.png...", "01_photo.jpg", "1 - post.jpg", "2.jpg")
  const leadingMatch = fileName.match(/^(\d+)[\.\-_\s]/);
  if (leadingMatch) {
    return parseInt(leadingMatch[1], 10);
  }

  const baseName = fileName.replace(/\.[^/.]+$/, '').trim();

  // 2. Exact standalone number (e.g. "1", "001", "24")
  if (/^\d+$/.test(baseName)) {
    return parseInt(baseName, 10);
  }

  // 3. Trailing or embedded number (e.g. "image_1", "photo-002", "slide (3)")
  // Limit to 1-4 digits so we don't accidentally match 14-digit timestamps (e.g. 20260914192715)
  const match = baseName.match(/(?:^|[^\d])(\d{1,4})(?:[^\d]*)$/);
  if (match) {
    return parseInt(match[1], 10);
  }

  return null;
}

/**
 * Determines if a line is a horizontal divider line (e.g. "---", "===", "___", "***")
 */
function isSeparatorLine(line: string): boolean {
  const trimmed = line.trim();
  return /^[-=_*~]{3,}$/.test(trimmed);
}

/**
 * Parses numbered multi-line caption text.
 * Supports:
 * - Standalone number header lines ("1.", "1:", "1", "[1]", "#1", "Post 1")
 * - Inline number header lines ("1. Caption text...")
 * - Separator boundaries ("------------------------")
 * - Preserves all emojis, quotes, Hindi/multilingual text, newlines, and hashtags intact.
 */
export function parseNumberedText(text: string): ParsedCaption[] {
  if (!text || !text.trim()) return [];

  const result: ParsedCaption[] = [];
  const rawLines = text.split(/\r?\n/);

  let currentId: string | null = null;
  let currentLines: string[] = [];

  const flush = () => {
    if (currentId !== null) {
      let block = currentLines.join('\n').trim();
      // Strip any trailing separator remnants
      block = block.replace(/[-=_*~]{3,}$/g, '').trim();
      if (block.length > 0) {
        result.push({
          identifier: currentId,
          caption: block,
        });
      }
    }
    currentLines = [];
  };

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const trimmed = line.trim();

    // 1. Horizontal separator line -> end current block
    if (isSeparatorLine(trimmed)) {
      flush();
      currentId = null;
      continue;
    }

    // 2. Empty line
    if (!trimmed) {
      if (currentId !== null && currentLines.length > 0) {
        currentLines.push('');
      }
      continue;
    }

    // 3. Standalone number header line, e.g. "1.", "1:", "1", "[1]", "#1", "Post 1"
    const standaloneMatch = trimmed.match(/^(?:post\s*)?[\[(#]?\s*(\d+)\s*[\])]?[\.\:\-\–]?\s*$/i);
    if (standaloneMatch) {
      flush();
      currentId = standaloneMatch[1];
      continue;
    }

    // 4. Inline number header line, e.g. "1. Caption text starts on same line"
    const inlineMatch = trimmed.match(/^(?:post\s*)?[\[(#]?\s*(\d+)\s*[\])]?[\.\:\-\–]+\s*(.+)$/i);
    if (inlineMatch) {
      flush();
      currentId = inlineMatch[1];
      currentLines.push(inlineMatch[2].trim());
      continue;
    }

    // 5. Content line
    if (currentId !== null) {
      currentLines.push(line);
    } else {
      // Line without preceding number header (e.g. user pasted raw text blocks)
      currentId = String(result.length + 1);
      currentLines.push(trimmed);
    }
  }

  flush();
  return result;
}

export function parseCsvCaptions(csvText: string): ParsedCaption[] {
  const result: ParsedCaption[] = [];
  const lines = csvText.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV splitter handling quotes
    const parts: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let charIdx = 0; charIdx < line.length; charIdx++) {
      const char = line[charIdx];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        parts.push(cur.trim().replace(/^"|"$/g, ''));
        cur = '';
      } else {
        cur += char;
      }
    }
    parts.push(cur.trim().replace(/^"|"$/g, ''));

    if (parts.length >= 2) {
      const col1 = parts[0].toLowerCase();
      // Skip header if it's "filename,caption" or "id,caption"
      if (i === 0 && (col1.includes('file') || col1.includes('id') || col1.includes('name'))) {
        continue;
      }
      result.push({
        identifier: parts[0],
        caption: parts.slice(1).join(', ').trim(),
      });
    } else if (parts.length === 1 && parts[0]) {
      result.push({
        identifier: String(result.length + 1),
        caption: parts[0],
      });
    }
  }

  return result;
}

export function parseCaptions(rawContent: string, fileName?: string): ParsedCaption[] {
  if (!rawContent || !rawContent.trim()) return [];

  // ONLY parse CSV if fileName explicitly ends with .csv
  const isCsv = Boolean(fileName && /\.csv$/i.test(fileName));
  if (isCsv) {
    const csvParsed = parseCsvCaptions(rawContent);
    if (csvParsed.length) return csvParsed;
  }

  return parseNumberedText(rawContent);
}

export function matchCaptionsToFiles(
  files: { name: string; id: string }[],
  captions: ParsedCaption[]
): Record<string, string> {
  const matches: Record<string, string> = {};

  // Build maps for fast matching
  const exactNameMap = new Map<string, string>();
  const numberMap = new Map<number, string>();
  const sequentialList: string[] = [];

  for (let idx = 0; idx < captions.length; idx++) {
    const item = captions[idx];
    exactNameMap.set(item.identifier.toLowerCase(), item.caption);
    const num = parseInt(item.identifier, 10);
    if (!isNaN(num)) {
      numberMap.set(num, item.caption);
    }
    sequentialList.push(item.caption);
  }

  files.forEach((file, fileIdx) => {
    const lowerName = file.name.toLowerCase();
    const baseName = lowerName.replace(/\.[^/.]+$/, '');

    // 1. Exact filename match (e.g. "1.jpg" or "my_photo.png")
    if (exactNameMap.has(lowerName)) {
      matches[file.id] = exactNameMap.get(lowerName)!;
      return;
    }
    if (exactNameMap.has(baseName)) {
      matches[file.id] = exactNameMap.get(baseName)!;
      return;
    }

    // 2. Primary Number match (e.g. file is "1.png_2026...", "001.jpg", caption is "1")
    const fileNum = extractFileNumber(file.name);
    if (fileNum !== null && numberMap.has(fileNum)) {
      matches[file.id] = numberMap.get(fileNum)!;
      return;
    }

    // 3. Fallback: Serial sequential match (file index matches caption index)
    if (fileIdx < sequentialList.length) {
      matches[file.id] = sequentialList[fileIdx];
    }
  });

  return matches;
}
