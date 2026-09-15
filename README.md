# Facebook Automation Website (AlphaPost Clone & Free Page Poster)

Yeh ek modern, standalone **Facebook Automation Web Application** hai jo bilkul video mein dikhaye gaye **AlphaPost** website aur uske underlying engine **Free Page Poster** ke har ek feature ko support karta hai.

---

## 🚀 Quick Start (Kaise Chalayein)

Aap do aasan tareeqon se ise start kar sakte hain:

### Tareeqa 1: One-Click Launcher (Sabse Aasan)
Project folder mein jakar `start.bat` file par double click karein. Yeh automatically server start karke aapke browser mein `http://localhost:3000` open kar dega!

### Tareeqa 2: Terminal se
```bash
cd "C:\Users\saura\OneDrive\Desktop\FACEBOOK AUTOMATION WEBSITE\app"
npm start
```
Browser mein open karein: `http://localhost:3000`

---

## 🌟 Major Features (Video ke mutabiq)

1. **Dashboard & Metric Stats (`/`)**:
   - Accounts added, Posts waiting, Sent (last 30 days), Failed (last 30 days).
   - Quick launch action cards (*Post from my gallery*, *AI writes for me*, *Share from my website*).
   - Social accounts grid (Facebook Page, Instagram, X, Pinterest, Telegram, TikTok).
   - Right tutorial sidebar (*Learn Earn - SHAHG on YouTube* style).

2. **Facebook Page Integration (`/accounts/facebook`)**:
   - Step-by-step Meta Developer & System User setup guide.
   - Page ID & System User Token input.
   - Auto Page Discovery & Token Fetcher (`/me/accounts`).
   - Plain-language Meta error translations.

3. **Gemini AI Keys Manager (`/gemini`)**:
   - Multi-key input with auto-rotation (free quota rate limit bypass).
   - Live model health check (`gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-1.5-flash`, Gemma, etc.).
   - Optimized thinking config to save token quota.

4. **"AI Writes For Me" Auto Post Engine (`/auto/new?kind=ai` & `/auto`)**:
   - Topic input (e.g., viral news, science stories, recipes).
   - Language selector with Unicode script matching (Urdu, Hindi, English, etc.).
   - Post length: Short (30-60 words), Medium (60-110 words), Long (120-180 words).
   - Optional link (YouTube / website) + custom CTA text (*"Ya mere video hai"*).
   - 3-tier copyright-free photo search: **Wikimedia Commons**, **Wikipedia lead images**, **Openverse**.
   - Scheduling: posts per day, wait interval, active hours window with randomized timing jitter.
   - Controls: *Start auto post*, *Pause*, *Post one now*, *Test only (dry run)*.

5. **"Share From My Website" RSS / Site Mode (`/auto/new?kind=feed`)**:
   - Ingest from WordPress REST API, Blogger RSS, or standard RSS/Atom feeds.
   - AI summarization without banned cliché words.

6. **Branding & Viral News Banners (`/branding`)**:
   - Signature visual feature: Photo ke upar bold headline banner box (jaise *"SPACEX COMPLETES..."*).
   - Top account pill badge: `• Curious People`.
   - Bottom branding bar: `• Curious People | For more content, Like and Share`.
   - Color presets, font selector, 3D / Normal look.
   - Dual live preview (*ON A REAL PHOTO* / *ON A DESIGN CARD*).

7. **Manual Post Composer (`/new-post`)**:
   - Custom photo/video/text post composer with live publish.

8. **Notifications & Logs (`/notifications` & `/posts`)**:
   - Real-time alerts (*"Your post is live"*, *"Your post did not go out"*).
   - Complete posts history table with direct Facebook links.

---

## ⏰ Background Scheduled Auto-Posting

Agar aap chahte hain ki computer background mein khud b khud schedule ke mutabiq posts karta rahe:
```bash
node scripts/runner.js
```
Yeh script har 60 seconds mein check karega aur aapke set kiye gaye schedule par automatic post publish karta rahega!
