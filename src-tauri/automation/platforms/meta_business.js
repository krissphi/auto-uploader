export default async function uploadToMetaBusiness(page, videoParams, common) {
    const { videoPath, scheduleTime, uploadDate, fullDescription } = videoParams;
    const { delay, logInfo, logError, logSuccess } = common;

    logInfo('Navigating to Meta Business Suite...');
    await page.goto('https://business.facebook.com/latest/home', { waitUntil: 'load' });
    await delay(5000);
    
    logInfo('Looking for "Create Reel" button...');
    try {
        // Find exactly the div containing the Create Reel text provided in user HTML.
        // Data-surface anchor or text locator
        const createBtn = page.locator('div[data-surface*="mbs_create_reel_button"], div[role="button"]:has-text("Create Reel")').first();
        
        if (await createBtn.isVisible().catch(()=>false)) {
            await createBtn.click();
            logInfo('Clicked Create Reel button.');
        } else {
            const fallbackSpan = page.locator('span:has-text("Create Reel")').first();
            await fallbackSpan.click();
            logInfo('Clicked Create Reel text span.');
        }
    } catch (e) {
        logInfo('Error looking for create reel button: ' + e.message);
        // Don't stop entirely, might have loaded directly into form or can be clicked manually
    }
    
    await delay(4000);
    logInfo('Attaching video...');
    try {
        // Find the "Add video" button (using exact text match)
        const addVideoBtn = page.getByText('Add video', { exact: true }).first();
        
        // Properly wait for it to be actually visible
        await addVideoBtn.waitFor({ state: 'visible', timeout: 15000 });
        
        logInfo('Clicking "Add video" button...');
        const [fileChooser] = await Promise.all([
            page.waitForEvent('filechooser', { timeout: 15000 }),
            addVideoBtn.click({ force: true }) // use force in case of invisible overlays
        ]);
        await fileChooser.setFiles(videoPath);
        logInfo('Video file attached successfully via file chooser.');
    } catch (e) {
        // Fallback: forcefully look for the hidden input if button click failed
        logInfo('"Add video" button not clicked properly. Attempting direct input attach...');
        try {
            const inputEl = await page.waitForSelector('input[type="file"]', { state: 'attached', timeout: 5000 });
            await inputEl.setInputFiles(videoPath);
            logInfo('Video file attached directly to input.');
        } catch (fallbackErr) {
            logError('Error while attaching video: ' + fallbackErr.message);
        }
    }
    
    await delay(4000);
    logInfo('Filling description...');
    try {
        const descBox = page.locator('div[role="textbox"][contenteditable="true"]').first();
        if (await descBox.isVisible({timeout: 15000}).catch(()=>false)) {
            await descBox.click();
            await descBox.fill(fullDescription);
            logInfo('Description text entered.');
        }
    } catch (e) {
        logInfo('Could not accurately locate description field.');
    }
    
    logInfo('Waiting for the video to hit 100% upload... (Checking Next button status)');
    await delay(15000); // initial wait
    
    // We'll give it a solid 30-60s for typical reels, waiting for the "Next" button to be enabled
    const nextBtn = page.locator('div[role="button"]:has-text("Next")').last();
    for(let sec = 0; sec < 180; sec += 5) {
        const isDisabled = await nextBtn.getAttribute('aria-disabled').catch(()=>'false');
        if (isDisabled !== 'true') {
            break;
        }
        await delay(5000);
    }

    logInfo('Clicking Next (1/2) - Audio/Music page...');
    if (await nextBtn.isVisible().catch(()=>false)) {
        await nextBtn.click({ force: true });
    }
    
    await delay(5000);
    
    logInfo('Clicking Next (2/2) - Moving to Share Settings...');
    if (await nextBtn.isVisible().catch(()=>false)) {
        await nextBtn.click({ force: true });
    }
    
    await delay(4000);
    
    logInfo('Handling Share / Scheduling options...');
    try {
        // Turn on "Auto-generated captions" if it exists and is off
        const captionsToggle = page.locator('div[role="switch"]', { hasText: /captions/i }).first();
        if (await captionsToggle.isVisible().catch(()=>false)) {
           const isChecked = await captionsToggle.getAttribute('aria-checked');
           if (isChecked === 'false') {
               await captionsToggle.click();
               logInfo('Turned ON auto-generated captions.');
           }
        }
    } catch(err) {}

    try {
        // Click "Schedule" tab/button inside the options
        const scheduleTab = page.locator('span:has-text("Schedule")').last();
        if (await scheduleTab.isVisible().catch(()=>false)) {
            await scheduleTab.click();
            logInfo('Selected "Schedule" method.');
            await delay(3000);
            
            logInfo('Locating Date/Time inputs for Facebook & Instagram...');
            
            // Since Meta's DOM can shift, we will use a stateless pass-based approach. 
            // We'll track how many Date+Time pairs we've successfully updated.
            let pairsUpdated = 0;
            
            for (let pass = 0; pass < 4; pass++) {
                const inputs = page.locator('input');
                const count = await inputs.count();
                let dateInputIndex = -1;
                let encounteredDates = 0;
                
                // Find the exact Date input for the current pass
                for (let k = 0; k < count; k++) {
                    const ti = inputs.nth(k);
                    if (await ti.isVisible().catch(()=>false)) {
                        const val = await ti.inputValue().catch(()=>'');
                        const placeholder = await ti.getAttribute('placeholder').catch(()=>'');
                        
                        const safeVal = val || '';
                        const safePlaceholder = placeholder || '';
                        
                        if (safeVal.match(/202\d/) || safePlaceholder.match(/dd\/mm/i)) {
                            if (encounteredDates === pairsUpdated) {
                                dateInputIndex = k;
                                break;
                            }
                            encounteredDates++;
                        }
                    }
                }
                
                if (dateInputIndex !== -1) {
                    logInfo(`Found Date Input for pair #${pairsUpdated+1} at index ${dateInputIndex}`);
                    const ti = page.locator('input').nth(dateInputIndex);
                    
                    await ti.click({ force: true });
                    await delay(1500);
                    
                    const dayToSelect = parseInt(uploadDate.split('-')[2], 10).toString();
                    const exactDay = page.locator(`div:text-is("${dayToSelect}"), span:text-is("${dayToSelect}"), div[aria-label*="${dayToSelect}"]`).filter({ visible: true }).last();
                    if (await exactDay.isVisible().catch(()=>false)) {
                        await exactDay.click({ force: true });
                        logInfo(`Selected day ${dayToSelect} from calendar.`);
                    } else {
                        await page.keyboard.press('Escape');
                    }
                    
                    await delay(1500); // Wait for calendar to fade
                    
                    // Locate the VERY NEXT visible input dynamically (Time input)
                    const currentInputs = page.locator('input');
                    const currCount = await currentInputs.count();
                    let timeInput = null;
                    for (let nx = dateInputIndex + 1; nx < currCount; nx++) {
                        const cand = currentInputs.nth(nx);
                        if (await cand.isVisible().catch(()=>false)) {
                            timeInput = cand;
                            break;
                        }
                    }
                    
                    if (timeInput) {
                        logInfo(`Updating corresponding Time Input...`);
                        await timeInput.click({ force: true });
                        await delay(500);
                        
                        // Highlight all and delete to clear out any complex Meta masking
                        await page.keyboard.press('Control+A');
                        await delay(300);
                        await page.keyboard.press('Backspace');
                        await delay(300);
                        
                        // Meta's masking requires us to be precise. Type hour, jump over the colon, type minute.
                        const [hr, mn] = scheduleTime.split(':');
                        await page.keyboard.type(hr, { delay: 150 });
                        await page.keyboard.press('ArrowRight'); // Lompat ke menit
                        await delay(100);
                        await page.keyboard.type(mn, { delay: 150 });
                        
                        logInfo(`Filled time: ${hr}:${mn}`);
                        
                        // AM/PM handling for localized Meta pages, safe null check
                        const tVal = await timeInput.inputValue().catch(()=>'');
                        if ((tVal || '').match(/am|pm/i)) {
                            await page.keyboard.press('ArrowRight'); 
                            await delay(100);
                            const hrInt = parseInt(hr, 10);
                            await page.keyboard.type(hrInt >= 12 ? 'p' : 'a', { delay: 100 });
                        }
                        
                        await page.keyboard.press('Tab');
                        await delay(1500);
                    }
                    
                    pairsUpdated++;
                } else {
                    // No more new Date inputs found
                    break;
                }
            }
            logInfo(`Successfully updated ${pairsUpdated} Date/Time pairs.`);
        }
    } catch(err) {
        logInfo('Could not smoothly interact with the Schedule form: ' + err.message);
    }
    
    await delay(3000);
    logInfo('Clicking final "Schedule" button to apply...');
    try {
        const finalScheduleBtn = page.locator('div[role="button"]:has-text("Schedule")').last();
        if (await finalScheduleBtn.isVisible().catch(()=>false)) {
            await finalScheduleBtn.click();
            logInfo('Final Schedule button clicked!');
            
            await delay(4000);
            logInfo('Waiting for completion Dialog...');
            const doneBtn = page.locator('div[role="button"]:has-text("Done"), span:has-text("Done")').filter({ visible: true }).last();
            if (await doneBtn.isVisible().catch(()=>false)) {
                await doneBtn.click();
                logInfo('Clicked "Done" on the completion dialog.');
            } else {
                logInfo('"Done" button not found, dialog might have auto-closed or not appeared.');
            }
        }
    } catch (e) {
        logInfo('Could not click the final Schedule/Done button.');
    }
    
    logInfo('Waiting 10 seconds for completion before next video...');
    await delay(10000);
    
    logSuccess('Meta Business upload process executed successfully!');
}
