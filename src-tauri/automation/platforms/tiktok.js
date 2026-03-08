export default async function uploadToTiktok(page, videoParams, common) {
    const { videoPath, scheduleTime, uploadDate, fullDescription } = videoParams;
    const { delay, logInfo, logError, logSuccess } = common;

    logInfo('Navigating to TikTok Creator Center...');
    await page.goto('https://www.tiktok.com/creator-center/upload', { waitUntil: 'domcontentloaded' });
    
    // TikTok is known for heavy loading and sometimes requiring manual login/captcha
    await delay(5000);
    
    logInfo('Waiting for file upload input to appear...');
    try {
        // TikTok uses a file input either globally or inside an iframe. On the newest layout, it's global.
        const fileInput = await page.waitForSelector('input[type="file"][accept*="video"]', { state: 'attached', timeout: 30000 });
        await fileInput.setInputFiles(videoPath);
    } catch (e) {
        logError('Could not find the TikTok file upload input. Are you logged in? Are you stuck on a captcha?');
        throw e;
    }

    logInfo('Waiting for video to process and the Caption Editor to load...');
    // The DraftJS caption editor
    const editorLocator = '.public-DraftEditor-content';
    await page.waitForSelector(editorLocator, { timeout: 60000 });
    await delay(3000); // give it a few seconds to parse video name

    logInfo('Filling Caption (Description & Tags)...');
    await page.click(editorLocator);
    // Clear default title (usually filename)
    await page.keyboard.down('Control');
    await page.keyboard.press('a');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await delay(500);
    
    // TikTok's Draft.js editor cannot just be evaluated using innerText easily, it needs simulated keyboard strokes or inserting text
    // Copy-paste method is the fastest & most reliable for Draft.js
    await page.evaluate((text) => {
        const dataTransfer = new DataTransfer();
        dataTransfer.setData('text/plain', text);
        document.querySelector('.public-DraftEditor-content').dispatchEvent(
            new ClipboardEvent('paste', { clipboardData: dataTransfer, bubbles: true, cancelable: true })
        );
    }, fullDescription);
    // Fire a dummy space to trigger React change
    await page.keyboard.press('Space');
    await page.keyboard.press('Backspace');
    await delay(1000);

    logInfo('Attempting to schedule...');
    // In the new TikTok UI, it's a radio button next to "Now" under "When to post"
    // The last button on the page is also called "Schedule" or "Post", so we get the first one
    const scheduleLabel = page.locator('text="Schedule"').first();
    
    if (await scheduleLabel.isVisible().catch(() => false)) {
        logInfo('Schedule radio button found, activating...');
        await scheduleLabel.click(); 
        await delay(1500);
        
        logInfo(`Setting Date: ${uploadDate} and Time: ${scheduleTime}...`);
        
        try {
            logInfo('Finding Date and Time input boxes...');
            const inputs = await page.$$('input.TUXTextInputCore-input');
            let dateBox, timeBox;
            
            for (const input of inputs) {
                const val = await input.inputValue();
                if (val.includes('-')) dateBox = input;
                if (val.includes(':')) timeBox = input;
            }
            
            if (dateBox) {
                logInfo('Opening Date picker...');
                await dateBox.click({ timeout: 5000 });
                await delay(1000);

                const dayToSelect = parseInt(uploadDate.split('-')[2], 10).toString();
                logInfo(`Selecting day: ${dayToSelect} from calendar...`);
                
                // Based on the HTML, it's a span with class "day valid" inside calendar-wrapper
                const dayOption = page.locator(`.calendar-wrapper span.day.valid:has-text("${dayToSelect}")`).first();
                
                if (await dayOption.isVisible().catch(()=>false)) {
                    await dayOption.click({ timeout: 5000 });
                    logInfo('Date selected successfully.');
                } else {
                    // Fallback
                    const rawDay = page.locator(`span.day:has-text("${dayToSelect}")`).last();
                    if(await rawDay.isVisible().catch(()=>false)) await rawDay.click();
                }
                await delay(1000);
            } else {
                logInfo('Could not find Date picker input box in DOM. Continuing to Time picker...');
            }

            if (timeBox) {
                logInfo('Opening Time picker...');
                await timeBox.click({ timeout: 5000 });
                await delay(1000);

                // Time is HH:mm
                const [targetHour, targetMinute] = scheduleTime.split(':');
                logInfo(`Selecting time option: Hour ${targetHour}, Minute ${targetMinute}...`);
                
                // Based on HTML, hours are .tiktok-timepicker-left, minutes are .tiktok-timepicker-right
                const hourOption = page.locator(`.tiktok-timepicker-option-text.tiktok-timepicker-left:has-text("${targetHour}")`).first();
                const minuteOption = page.locator(`.tiktok-timepicker-option-text.tiktok-timepicker-right:has-text("${targetMinute}")`).first();
                
                if (await hourOption.isVisible().catch(()=>false) && await minuteOption.isVisible().catch(()=>false)) {
                    await hourOption.click({ timeout: 5000 });
                    await delay(500);
                    await minuteOption.click({ timeout: 5000 });
                    // Click outside to close the timepicker (e.g., clicking the time box again)
                    logInfo('Time selected successfully.');
                    await timeBox.click({ timeout: 5000 });
                } else {
                    logInfo(`Warning: Target time ${scheduleTime} not found in dropdown. You may need to select it manually. Waiting 5 seconds...`);
                    await delay(5000);
                }
                await delay(1000);
            } else {
                logInfo('Could not find Time picker input box in DOM.');
            }
        } catch (e) {
            logInfo(`Failed to interact with TikTok date/time custom UI automatically: ${e.message}`);
            logInfo('Please select the date and time manually. Waiting 8 seconds before proceeding...');
            await delay(8000);
        }
    } else {
        logInfo('WARNING: "Schedule" radio option not found. Your account might not have scheduling enabled, or the UI changed. It will be posted directly!');
    }

    logInfo('Waiting up to 5 minutes for the video to finish uploading (Post button enabled)...');
    // We wait for the post button to lose its aria-disabled="true" status, which indicates the upload has reached 100%
    const enabledPostButton = page.locator('button[data-e2e="post_video_button"]:not([aria-disabled="true"]), button:has-text("Post"):not([aria-disabled="true"]), button:has-text("Schedule"):not([aria-disabled="true"])').last();
    
    try {
        await enabledPostButton.waitFor({ state: 'attached', timeout: 300000 }); // 5 minutes max
        logInfo('Video upload finished! Button is now active.');
    } catch (e) {
        logInfo('Warning: Video upload wait timed out (5 minutes max) or button state is unclear. Will attempt to proceed anyway.');
    }
    
    logInfo('Waiting 30 seconds for TikTok content/copyright validation to complete...');
    await delay(30000);
    
    logInfo('Clicking Post / Schedule button...');
    const finalPostButton = page.locator('button[data-e2e="post_video_button"], button:has-text("Post"), button:has-text("Schedule")').last();
    await finalPostButton.click({ timeout: 15000 });
    await delay(2000);

    logInfo('Checking for any confirmation popups (e.g., "Post now" / "Post anyway" after copyright checks)...');
    const postNowPopup = page.locator('button:has-text("Post now"), button:has-text("Post anyway")').last();
    
    // Quick check if popup is visible, wait up to 5 seconds
    if (await postNowPopup.isVisible({ timeout: 5000 }).catch(() => false)) {
        logInfo('Confirmation popup dialog found! Clicking Post now...');
        await postNowPopup.click({ timeout: 5000 });
    } else {
        logInfo('No extra confirmation dialog appeared.');
    }
    
    logInfo('Waiting for success confirmation...');
    await delay(10000); // TikTok takes a while to bounce to "Manage your posts"

    logSuccess('TikTok upload process executed successfully!');
}
