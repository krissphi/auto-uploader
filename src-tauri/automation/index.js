import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

// Import local submodules
import { logInfo, logError, logSuccess, delay } from './utils/logger.js';
import uploadToYoutube from './platforms/youtube.js';
import uploadToTiktok from './platforms/tiktok.js';
import uploadToMetaBusiness from './platforms/meta_business.js';

console.log('Starting Playwright runner...');

const configStr = process.argv[2];
if (!configStr) {
  console.error('No configuration provided.');
  process.exit(1);
}

const config = JSON.parse(configStr);

// Platform handlers map
const PLATFORM_HANDLERS = {
    'youtube': uploadToYoutube,
    'tiktok': uploadToTiktok,
    'meta_business': uploadToMetaBusiness,
};

(async () => {
  let context = null;
  try {
    const browserChoice = (config.browser || 'brave').toLowerCase();

    const localAppData = process.env.LOCALAPPDATA || (process.env.USERPROFILE + '\\AppData\\Local');
    
    let userDataDir = '';
    let launchOptions = {
      headless: false,
      viewport: null, 
    };

    if (browserChoice === 'brave') {
        userDataDir = path.join(localAppData, 'BraveSoftware', 'Brave-Browser', 'User Data');
        const possibleBravePaths = [
            'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
            'C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
            path.join(localAppData, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe')
        ];
        const executablePath = possibleBravePaths.find(p => fs.existsSync(p));
        if (!executablePath) {
            logError('ERROR: Brave browser executable not found! Make sure Brave is installed.');
            process.exit(1);
        }
        launchOptions.executablePath = executablePath;
    } else if (browserChoice === 'chrome') {
        userDataDir = path.join(localAppData, 'Google', 'Chrome', 'User Data');
        launchOptions.channel = 'chrome';
    } else if (browserChoice === 'edge') {
        userDataDir = path.join(localAppData, 'Microsoft', 'Edge', 'User Data');
        launchOptions.channel = 'msedge';
    } else {
        logError(`ERROR: Unsupported browser choice: ${browserChoice}`);
        process.exit(1);
    }
    
    logInfo(`Setting up Playwright to use ${browserChoice} browser...`);
    logInfo(`Make sure ALL existing ${browserChoice} browser windows are CLOSED before automation starts. Playwright cannot connect to an in-use profile dir.`);
    
    context = await chromium.launchPersistentContext(userDataDir, launchOptions);

    logSuccess(`Successfully connected to ${browserChoice} browser.`);

    const platforms = config.platforms;
    const videos = config.videos;
    const times = config.times;
    const uploadDate = config.date;

    logInfo(`Will process ${platforms.length} platforms sequentially.`);
    
    const commonUtils = { delay, logInfo, logError, logSuccess };
    
    for (const platform of platforms) {
        logInfo(`\n--- Starting platform: ${platform.toUpperCase()} ---`);
        
        const handler = PLATFORM_HANDLERS[platform];
        if (!handler) {
             logError(`Warning: Built-in script for ${platform} does not exist yet. Skipping.`);
             continue;
        }

        let page;
        
        try {
             page = await context.newPage();
             
             for (let i = 0; i < videos.length; i++) {
                 const video = videos[i];
                 const videoPath = video.path;
                 const videoTitle = video.title || path.parse(videoPath).name; // Use custom title, or fallback to file name (without extension)
                 const scheduleTime = times[i] || '00:00'; 
                 
                 logInfo(`Uploading [Video ${i+1}/${videos.length}] "${videoTitle}" to ${platform} for ${uploadDate} at ${scheduleTime}...`);
                 
                 // Format comma-separated tags into actual hashtags separated by newlines
                 const formattedTags = video.tags 
                     ? video.tags.split(',')
                           .map(tag => tag.trim())
                           .filter(tag => tag.length > 0)
                           .map(tag => tag.startsWith('#') ? tag : `#${tag}`)
                           .join('\n')
                     : '';
                     
                 const fullDescription = formattedTags ? `${videoTitle}\n\n${formattedTags}` : videoTitle;
                 logInfo(`(Description will automatically be set to: \n"${fullDescription}")`);
                 
                 const videoParams = {
                     videoPath,
                     videoTitle,
                     formattedTags,
                     fullDescription,
                     scheduleTime,
                     uploadDate
                 };
                 
                 // Inject logic to separate handler
                 await handler(page, videoParams, commonUtils);
                 
                 logSuccess(`Finished uploading [Video ${i+1}/${videos.length}] to ${platform}.`);
                 logInfo('Taking a brief pause before next file...');
                 await delay(2000); 
             }
             
             logSuccess(`All videos uploaded to ${platform}.`);
        } catch (err) {
            logError(`Error uploading to ${platform}: ${err.message}`);
        } finally {
            if (page && !page.isClosed()) {
                await page.close();
            }
        }
    }

    logSuccess('\nAutomation completed for all platforms and videos.');

  } catch (error) {
    if (error.message.includes('browser is opened by another program')) {
        logError('ERROR: Cannot launch Brave because it is currently running! Please completely close all Brave windows and try again.\nAlso open task manager and kill any stray brave.exe background processes.');
    } else {
        logError(`FATAL ERROR: ${error.message}`);
    }
  } finally {
    if (context) {
        logInfo('Closing browser context...');
        await context.close();
    }
    process.exit(0);
  }
})();
