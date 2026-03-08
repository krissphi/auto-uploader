# Upload Scheduler (Video Auto-Uploader & Scheduler)

Upload Scheduler is a powerful desktop application built with Tauri, React, and Playwright that automates the process of uploading and scheduling short videos across multiple major social media platforms without needing official API integrations.

By orchestrating a headless (or headed) browser session, this app mimics human interaction to upload your videos natively, bypassing the limitations and quotas of standard APIs.

## 🌟 Supported Platforms
*   **YouTube** (Shorts / Regular)
*   **Instagram** (Reels)
*   **TikTok**
*   **Facebook** (Reels)
*   **Meta Business Suite** (Combined FB & IG Reels Scheduling)

## ✨ Key Features
*   **No API Keys Required:** Relies entirely on secure, localized web browser automation. 
*   **Cross-Platform Auto Publishing:** Upload identical videos across five different platforms with just one click.
*   **Intelligent Scheduling Setup:** Support for scheduling uploads down to the minute. Automatically handles complex web UI components (e.g., custom Time inputs and Calendars) natively.
*   **Global Templates:** Create and select from multiple pre-saved templates for Titles, Descriptions, and Tags.
*   **Sequential Uploading:** Queues files and uploads sequentially – optimized for slow or unstable internet connections.
*   **Interactive Playwright Integration:** Watch the application work in the background, or interact directly when platforms prompt for manual verifications using your locally logged-in browser profiles (e.g., Microsoft Edge).

## 🚀 Tech Stack
*   **Frontend:** React, TypeScript, Vite, TailwindCSS
*   **Backend:** Rust, Tauri
*   **Automation:** Playwright, Node.js

## ⚙️ Prerequisites
1.  **Node.js** (v18+)
2.  **pnpm** (Package Manager)
3.  **Rust & Cargo** (For Tauri backend compilation)
4.  **Microsoft Edge** (Or Google Chrome) installed, as the automation hooks into existing browser user data directories to retain your login sessions.

## 📦 Installation & Setup

1.  **Clone / Download the Repository**
2.  **Install Dependencies**
    ```bash
    pnpm install
    # Wait for all frontend and node dependencies to finish downloading
    ```
3.  **Initialize Playwright Browsers (Optional but recommended)**
    ```bash
    npx playwright install
    ```

## 🛠️ Usage (Development Mode)

To run the application locally in development mode:

```bash
pnpm tauri dev
```
This will compile the Rust backend and spin up the Vite React frontend.

## 📝 How it Works (Usage Workflow)
1. **Add Videos:** Drag and drop, or browse to add videos into the queue list.
2. **Select Accounts / Profiles:** Define which browser directory contains the active login sessions for the platforms you wish to target.
3. **Configure the Time:** Setup your target base date and desired posting times.
4. **Choose Target Platforms:** Tick the boxes for the platforms you want to upload to (e.g. YouTube, TikTok, Meta Business Suite).
5. **Start Automation:** Click "Start Automation". The app will sequentially launch a browser window, navigate to the specific Creator Studio pages, upload the video, fill in descriptions based on your Global Tags, pick your schedule time, and submit!

## ⚠️ Important Notes
*   **Keep Logged In:** Since this application uses browser automation instead of API keys, it requires the selected browser profile to already be logged into YouTube/TikTok/Facebook/Instagram.
*   **UI Changes:** Social media platforms update their UI frequently. If the automation suddenly gets stuck (e.g., "Cannot find Add Video button"), the Playwright CSS/XPath locators in `src-tauri/automation/index.js` might need to be adjusted to match the new web layouts.
*   **Intervention:** Some platforms enforce Captcha checks or account limits. The browser will stay open so you can manually intervene if the automation pauses or errors out.

## 🤝 Contributing
Feel free to tweak the automation scripts located in `src-tauri/automation/index.js` or add new platform support!
