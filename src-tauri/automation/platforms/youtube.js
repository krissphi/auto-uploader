export default async function uploadToYoutube(page, videoParams, common) {
    const { videoPath, videoTitle, scheduleTime, uploadDate, fullDescription } = videoParams;
    const { delay, logInfo, logError, logSuccess } = common;

    logInfo('Navigating to YouTube Studio...');
    await page.goto('https://studio.youtube.com/', { waitUntil: 'load' });
    
    // Sometimes studio.youtube.com redirects to a channel selection or the main youtube.com if not directly logged in.
    // Give it a moment.
    await delay(3000);
    
    logInfo('Waiting for Upload button (Create -> Upload videos)...');
    
    // The upload button in Studio is usually either `#create-icon` or a direct `#upload-icon`
    try {
        // Wait for either the create button or the direct upload icon
        await page.waitForSelector('#create-icon, #upload-icon', { timeout: 30000 });
        
        const createIcon = await page.$('#create-icon');
        if (createIcon) {
            await createIcon.click();
            await delay(1000);
            // Click "Upload videos"
            await page.click('tp-yt-paper-item#text-item-0, tp-yt-paper-item:has-text("Upload videos")'); 
        } else {
            // Must be the direct upload icon on some dashboard layouts
            await page.click('#upload-icon');
        }
    } catch (e) {
        logError('Could not find the Create/Upload button. Are you logged in to the correct YouTube Studio channel in this Brave Profile?');
        throw e;
    }
    
    logInfo('Attaching video file...');
    const fileInput = await page.waitForSelector('input[type="file"]', { state: 'attached', timeout: 15000 });
    await fileInput.setInputFiles(videoPath);
    
    logInfo('Waiting for upload dialog to appear...');
    await page.waitForSelector('#title-textarea #textbox', { timeout: 30000 });
    await delay(2000); // Give it a moment to load everything

    logInfo('Filling Title & Description...');
    const titleBox = page.locator('#title-textarea #textbox');
    await titleBox.clear();
    await titleBox.evaluate((el, text) => { el.innerText = text }, videoTitle); // workaround for contenteditable
    await titleBox.dispatchEvent('input');

    const descBox = page.locator('#description-textarea #textbox');
    await descBox.clear();
    await descBox.evaluate((el, text) => { el.innerText = text }, fullDescription);
    await descBox.dispatchEvent('input');
    
    logInfo('Setting audience to "Not made for kids"...');
    await page.waitForSelector('tp-yt-paper-radio-button[name="VIDEO_MADE_FOR_KIDS_NOT_MFK"]', { timeout: 10000 });
    await page.click('tp-yt-paper-radio-button[name="VIDEO_MADE_FOR_KIDS_NOT_MFK"]');
    await delay(1000);

    logInfo('Navigating to Visibility step...');
    // Depending on the channel (Monetization active or not), the visibility step could be badge 3 or 4.
    // The safest way is to click "Next" (id="next-button") until the "schedule-radio-button" appears or the "Next" button disappears.
    let scheduleFound = false;
    for (let step = 0; step < 4; step++) {
        const scheduleNode = await page.$('#schedule-radio-button');
        if (scheduleNode && await scheduleNode.isVisible()) {
            scheduleFound = true;
            break;
        }
        
        const nextButton = await page.$('#next-button');
        if (nextButton && await nextButton.isVisible()) {
            await page.click('#next-button');
            await delay(1000);
        } else {
            break;
        }
    }
    
    if (!scheduleFound) {
        logError('Could not reach the Visibility tab. Aborting this upload.');
        throw new Error('Visibility tab not found.');
    }

    logInfo('Selecting "Schedule"...');
    await page.click('#schedule-radio-button');
    await delay(1000);

    logInfo(`Setting Date: ${uploadDate} and Time: ${scheduleTime}...`);
    // YouTube Date Pickers can be tricky (format depends on locale, but standard text normally works)
    const dateInput = page.locator('#datepicker-trigger input');
    await dateInput.click({ clickCount: 3 }); // select all
    await page.keyboard.type(uploadDate);
    await page.keyboard.press('Enter');
    await delay(1000);

    const timeInput = page.locator('#time-of-day-trigger input');
    await timeInput.click({ clickCount: 3 });
    await page.keyboard.type(scheduleTime);
    await page.keyboard.press('Enter');
    await delay(1000);

    logInfo('Waiting for upload process to complete... (Do not close!)');
    // Realistically, you have to wait for the progress text to say "Checks complete" or we can just hit Schedule and YouTube will handle it in background.
    // The "Schedule" button has id #done-button
    await page.click('#done-button');
    
    logInfo('Waiting for dialog to close indicating success...');
    await page.waitForSelector('ytcp-uploads-dialog', { state: 'hidden', timeout: 300000 }); // give 5 mins
    
    logSuccess('YouTube upload schedule set successfully!');
}
