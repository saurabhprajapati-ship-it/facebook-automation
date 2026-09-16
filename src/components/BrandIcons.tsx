'use client';

import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

/** Official Instagram Brand Icon with authentic multi-stop gradient */
export function InstagramIcon({ className = 'w-6 h-6', size }: IconProps) {
  const sizeProps = size ? { width: size, height: size } : {};
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...sizeProps}
    >
      <defs>
        <radialGradient id="ig-radial-official" cx="30%" cy="107%" r="150%">
          <stop offset="0%" stopColor="#fdf497" />
          <stop offset="10%" stopColor="#fdf497" />
          <stop offset="50%" stopColor="#fd5949" />
          <stop offset="68%" stopColor="#d6249f" />
          <stop offset="100%" stopColor="#285AEB" />
        </radialGradient>
      </defs>
      <rect width="24" height="24" rx="6.5" fill="url(#ig-radial-official)" />
      <rect
        x="3.5"
        y="3.5"
        width="17"
        height="17"
        rx="4.8"
        stroke="#FFFFFF"
        strokeWidth="1.8"
        fill="none"
      />
      <circle cx="12" cy="12" r="4.2" stroke="#FFFFFF" strokeWidth="1.8" fill="none" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="#FFFFFF" />
    </svg>
  );
}

/** Official Meta Facebook Brand Icon */
export function FacebookIcon({ className = 'w-6 h-6', size }: IconProps) {
  const sizeProps = size ? { width: size, height: size } : {};
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...sizeProps}
    >
      <circle cx="12" cy="12" r="12" fill="#1877F2" />
      <path
        d="M16.5 12.05H13.67V22H9.55V12.05H7.58V8.55H9.55V6.01C9.55 4.06 10.74 2.99 12.48 2.99C13.31 2.99 14.18 3.14 14.18 3.14V5.01H13.22C12.25 5.01 11.95 5.61 11.95 6.23V8.55H16.21L16.5 12.05Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

/** Official X (formerly Twitter) Monochrome Vector Icon */
export function XTwitterIcon({ className = 'w-6 h-6', size }: IconProps) {
  const sizeProps = size ? { width: size, height: size } : {};
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...sizeProps}
    >
      <rect width="24" height="24" rx="6" fill="#000000" />
      <path
        d="M18.244 4.5h2.527l-5.52 6.31 6.493 8.69h-5.086l-3.983-5.207L8.12 19.5H5.592l5.905-6.75L5.244 4.5h5.215l3.6 4.76L18.244 4.5zm-.887 13.5h1.4l-9.1-12.03H8.256l9.101 12.03z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

/** Official Telegram Vector Icon */
export function TelegramIcon({ className = 'w-6 h-6', size }: IconProps) {
  const sizeProps = size ? { width: size, height: size } : {};
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...sizeProps}
    >
      <circle cx="12" cy="12" r="12" fill="#2AABEE" />
      <path
        d="M5.39 11.59l11.7-4.51c.54-.2.86.13.73.68l-1.99 9.38c-.15.68-.55.84-1.12.52l-3.05-2.25-1.47 1.42c-.16.16-.3.3-.61.3l.22-3.11 5.67-5.12c.25-.22-.05-.34-.39-.12l-7.01 4.41-3.01-.94c-.66-.2-.67-.65.14-.97z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

/** Official TikTok Vector Icon */
export function TikTokIcon({ className = 'w-6 h-6', size }: IconProps) {
  const sizeProps = size ? { width: size, height: size } : {};
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...sizeProps}
    >
      <rect width="24" height="24" rx="6" fill="#010101" />
      <path
        d="M16.6 8.2c-.75-.48-1.32-1.18-1.57-2.01-.06-.19-.09-.39-.11-.59h-2.42v10.9a2.38 2.38 0 01-2.38 2.38 2.38 2.38 0 01-2.38-2.38 2.38 2.38 0 012.38-2.38c.32 0 .63.07.91.2v-2.52a4.8 4.8 0 00-.91-.09 4.81 4.81 0 00-4.81 4.81 4.81 4.81 0 004.81 4.81 4.81 4.81 0 004.81-4.81V10.7a6.6 6.6 0 003.88 1.25V9.52a4.2 4.2 0 01-2.2-.62z"
        fill="#25F4EE"
      />
      <path
        d="M17.3 7.8c-.75-.48-1.32-1.18-1.57-2.01-.06-.19-.09-.39-.11-.59h-1.22v10.9a2.38 2.38 0 01-2.38 2.38 2.38 2.38 0 01-2.38-2.38c0-.44.12-.86.33-1.21a2.38 2.38 0 00-.93-.19 2.38 2.38 0 00-2.38 2.38 4.81 4.81 0 004.81 4.81 4.81 4.81 0 004.81 4.81 4.81 4.81 0 004.81-4.81V10.7a6.6 6.6 0 003.88 1.25V9.52a4.2 4.2 0 01-2.85-.82z"
        fill="#FE2C55"
      />
      <path
        d="M16.9 8c-.75-.48-1.32-1.18-1.57-2.01-.06-.19-.09-.39-.11-.59h-1.82v10.9a2.38 2.38 0 01-2.38 2.38 2.38 2.38 0 01-2.38-2.38 2.38 2.38 0 012.38-2.38c.32 0 .63.07.91.2v-2.52a4.8 4.8 0 00-.91-.09 4.81 4.81 0 00-4.81 4.81 4.81 4.81 0 004.81 4.81 4.81 4.81 0 004.81-4.81V10.7a6.6 6.6 0 003.88 1.25V9.52a4.2 4.2 0 01-2.52-.72z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

/** Official Pinterest Vector Icon */
export function PinterestIcon({ className = 'w-6 h-6', size }: IconProps) {
  const sizeProps = size ? { width: size, height: size } : {};
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...sizeProps}
    >
      <circle cx="12" cy="12" r="12" fill="#BD081C" />
      <path
        d="M12 4.5c-4.14 0-7.5 3.36-7.5 7.5 0 3.18 1.98 5.9 4.8 7-.07-.59-.13-1.49.03-2.13.15-.64.96-4.08.96-4.08s-.24-.5-.24-1.23c0-1.15.67-2.01 1.5-2.01.71 0 1.05.53 1.05 1.17 0 .71-.45 1.78-.69 2.76-.2.83.42 1.51 1.24 1.51 1.49 0 2.63-1.57 2.63-3.83 0-2-1.44-3.4-3.49-3.4-2.38 0-3.77 1.78-3.77 3.63 0 .72.28 1.49.62 1.91.07.08.08.16.06.24-.07.28-.21.87-.24 1-.04.16-.14.2-.31.11-1.18-.55-1.92-2.28-1.92-3.66 0-2.98 2.17-5.72 6.25-5.72 3.28 0 5.83 2.34 5.83 5.46 0 3.26-2.05 5.88-4.9 5.88-.96 0-1.86-.5-2.17-1.08l-.59 2.25c-.21.82-.79 1.85-1.17 2.48.88.27 1.82.42 2.79.42 4.14 0 7.5-3.36 7.5-7.5 0-4.14-3.36-7.5-7.5-7.5z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

/** Official Google Drive 3-Color Vector Icon */
export function GoogleDriveIcon({ className = 'w-6 h-6', size }: IconProps) {
  const sizeProps = size ? { width: size, height: size } : {};
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...sizeProps}
    >
      <path d="M8.28 4.25h7.44l4.28 7.42H12.56L8.28 4.25z" fill="#FFC107" />
      <path d="M4 11.67L8.28 4.25h-.01L4 11.67l4.28 7.42h.01L4 11.67z" fill="#0066DA" />
      <path d="M4 11.67l4.28 7.42h11.72l-4.28-7.42H4z" fill="#00AC47" />
      <path d="M4 11.67L8.28 4.25l4.28 7.42L8.28 19.09 4 11.67z" fill="#2684FC" />
      <path d="M8.28 4.25h7.44l4.28 7.42h-7.44L8.28 4.25z" fill="#FFBA00" />
      <path d="M8.28 19.09h11.72l-3.72-6.44H8.28v6.44z" fill="#00832D" />
    </svg>
  );
}

/** Official Google Gemini Sparkle Star Icon */
export function GeminiIcon({ className = 'w-6 h-6', size }: IconProps) {
  const sizeProps = size ? { width: size, height: size } : {};
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...sizeProps}
    >
      <defs>
        <linearGradient id="gemini-grad-official" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1B6EF3" />
          <stop offset="40%" stopColor="#7B42BC" />
          <stop offset="80%" stopColor="#DB4437" />
          <stop offset="100%" stopColor="#F4B400" />
        </linearGradient>
      </defs>
      <path
        d="M12 2C12 7.52 7.52 12 2 12C7.52 12 12 16.48 12 22C12 16.48 16.48 12 22 12C16.48 12 12 7.52 12 2Z"
        fill="url(#gemini-grad-official)"
      />
    </svg>
  );
}
