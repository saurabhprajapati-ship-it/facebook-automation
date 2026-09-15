// Script matching logic to prevent language contamination (e.g. Hindi becoming Urdu or vice versa)

const LANG_SCRIPT: Record<string, string> = {
  hindi: 'deva', marathi: 'deva', nepali: 'deva', sanskrit: 'deva',
  urdu: 'arab', arabic: 'arab', persian: 'arab', farsi: 'arab',
  pashto: 'arab', sindhi: 'arab', kashmiri: 'arab',
  bangla: 'beng', bengali: 'beng', assamese: 'beng',
  punjabi: 'guru', gujarati: 'gujr',
  tamil: 'taml', telugu: 'telu', kannada: 'knda', malayalam: 'mlym',
  sinhala: 'sinh', thai: 'thai',
  russian: 'cyrl', ukrainian: 'cyrl', bulgarian: 'cyrl',
  greek: 'grek', hebrew: 'hebr',
  chinese: 'hani', japanese: 'jpan', korean: 'hang',
  english: 'latn', spanish: 'latn', french: 'latn', german: 'latn',
  portuguese: 'latn', italian: 'latn', dutch: 'latn', turkish: 'latn',
  indonesian: 'latn', malay: 'latn', filipino: 'latn', tagalog: 'latn',
};

const SCRIPT_LABEL: Record<string, string> = {
  deva: 'Devanagari', arab: 'Arabic/Urdu', beng: 'Bengali', guru: 'Gurmukhi',
  gujr: 'Gujarati', taml: 'Tamil', telu: 'Telugu', knda: 'Kannada',
  mlym: 'Malayalam', sinh: 'Sinhala', thai: 'Thai', cyrl: 'Cyrillic',
  grek: 'Greek', hebr: 'Hebrew', hani: 'Chinese', jpan: 'Japanese',
  hang: 'Hangul', latn: 'Latin',
};

const SCRIPT_CHARS: Record<string, RegExp> = {
  deva: /[\u0900-\u097F]/g,
  arab: /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/g,
  beng: /[\u0980-\u09FF]/g,
  guru: /[\u0A00-\u0A7F]/g,
  gujr: /[\u0A80-\u0AFF]/g,
  taml: /[\u0B80-\u0BFF]/g,
  telu: /[\u0C00-\u0C7F]/g,
  knda: /[\u0C80-\u0CFF]/g,
  mlym: /[\u0D00-\u0D7F]/g,
  sinh: /[\u0D80-\u0DFF]/g,
  thai: /[\u0E00-\u0E7F]/g,
  cyrl: /[\u0400-\u04FF]/g,
  grek: /[\u0370-\u03FF]/g,
  hebr: /[\u0590-\u05FF]/g,
  hani: /[\u4E00-\u9FFF]/g,
  jpan: /[\u3040-\u30FF]/g,
  hang: /[\uAC00-\uD7AF]/g,
  latn: /[A-Za-z]/g,
};

export function getScriptKey(lang: string): string {
  return LANG_SCRIPT[String(lang || '').trim().toLowerCase()] || '';
}

export function getScriptName(lang: string): string {
  const k = getScriptKey(lang);
  return k ? (SCRIPT_LABEL[k] || '') : '';
}

export function checkWrongScript(text: string, lang: string): string | null {
  const want = getScriptKey(lang);
  if (!want) return null;

  const s = String(text || '');
  const count = (re: RegExp) => (s.match(re) || []).length;

  const mine = count(SCRIPT_CHARS[want]);
  let other = '';
  let most = 0;

  for (const k in SCRIPT_CHARS) {
    if (k === want || k === 'latn') continue;
    const n = count(SCRIPT_CHARS[k]);
    if (n > most) {
      most = n;
      other = k;
    }
  }

  if (other && most > 30 && most > mine * 2) {
    return SCRIPT_LABEL[other] || other;
  }
  return null;
}
