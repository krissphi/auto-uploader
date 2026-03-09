# KlipKlop v2

A desktop application that automates the short-form content pipeline: downloading source videos, generating viral clips, and scheduling uploads across social media platforms. No API keys required.

Built with Tauri (Rust), React, Node.js, Playwright, FFmpeg, and yt-dlp.

---

## Supported Platforms

- YouTube Shorts
- Instagram Reels
- TikTok
- Facebook Reels
- Meta Business Suite

---

## Features

**Auto Clipper**  
Downloads any YouTube video and extracts the most-replayed moments using YouTube heatmap data. Applies random start time offsets and clip duration variations to ensure each generated clip is unique. Supports multiple scale modes (Center Crop, Fit Blur, Split B-Roll ASMR, Dual-Split). Subtitles are burned automatically from YouTube auto-captions.

**B-Roll Asset Manager**  
One-click scraper that automatically searches YouTube for satisfying/ASMR background videos using built-in copyright-free keyword templates. Downloads only 10 minutes of footage per video at 720p (video-only, no audio). Uses a 5x candidate pool to ensure the requested count is always fulfilled.

**Files & Batches**  
Organizes clips by source video. Auto Batch moves clips into upload batches (max 7 per batch) automatically. Archive moves completed clips out of the workspace without deleting them.

**Auto Uploader**  
Browser automation via Playwright using your existing logged-in browser profile. Uploads sequentially with configurable scheduling per platform. Supports title, description, and tag templates.

---

## Prerequisites

- Node.js v18+
- pnpm (`npm i -g pnpm`)
- Rust and Cargo
- [yt-dlp](https://github.com/yt-dlp/yt-dlp/releases/latest)
- [FFmpeg](https://ffmpeg.org/download.html)
- Microsoft Edge or Chrome (must be logged into target platforms)

---

## Production Setup (After Install)

Jika Anda menggunakan file installer (.exe/.msi), ikuti langkah-langkah ini agar fitur uploader/clipper berfungsi:

1. **Copy Folder Automation**  
   Salin folder `automation/` ke direktori instalasi aplikasi (berdampingan dengan `KlipKlop.exe`).
   *Struktur folder harus seperti ini:*
   ```text
   C:\Program Files\KlipKlop v2\
   ├── KlipKlop.exe
   └── automation\
       ├── index.js
       ├── clipper.js
       └── package.json
   ```

2. **Setup Dependencies**  
   Buka aplikasi, navigasi ke halaman **Auto Uploader**, dan klik tombol **"⚙️ Setup Automation"**.  
   Aplikasi akan menjalankan `pnpm install` secara otomatis di latar belakang untuk memasang library yang diperlukan (*playwright-core*).

---

## Development

```bash
pnpm install
pnpm tauri dev
```

---

## Configuration

On first run, go to the Settings page and set:

- `yt-dlp Path` — full path to yt-dlp.exe
- `FFmpeg Path` — full path to ffmpeg.exe
- `Output Directory` — root folder for all generated files

---

## Workflow

1. B-Roll Manager — scrape background videos
2. Auto Clipper — generate clips from a YouTube URL
3. Files & Batches — review, rename, archive, and batch clips
4. Auto Uploader — upload a batch to selected platforms on a schedule

---

## Notes

- **Penting:** Aplikasi ini memerlukan folder `automation/` yang berada di direktori yang sama dengan executable-nya agar logic browser automation dapat berjalan.
- The uploader uses browser automation, so your browser profile must already be logged into all target platforms.
- Keep yt-dlp updated regularly to avoid YouTube download errors: `yt-dlp -U`
- B-Roll videos are downloaded video-only (no audio) to minimize copyright claim risk.
- If automation gets stuck due to platform UI changes, update the selectors in `src-tauri/automation/index.js`.
