import { exec, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import util from 'util';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execPromise = util.promisify(exec);

// Helper for emitting lines to stdout precisely
const log = (msg) => console.log(msg);
const logError = (msg) => console.error(msg);

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Subtitle Time Shifter Helper
function parseTime(timeStr) {
    // 00:00:15.015
    const parts = timeStr.trim().split(':');
    const h = parseFloat(parts[0]);
    const m = parseFloat(parts[1]);
    const s = parseFloat(parts[2]);
    return h * 3600 + m * 60 + s;
}

function formatTime(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const sStr = s.toFixed(3).padStart(6, '0');
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sStr}`;
}

function adjustVttOffset(sourceVttPath, destVttPath, offsetStartSec, offsetEndSec) {
    if (!fs.existsSync(sourceVttPath)) return false;
    const lines = fs.readFileSync(sourceVttPath, 'utf8').split('\n');
    let outLines = [];
    
    // VTT basic parse state
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('-->')) {
            // 00:00:01.000 --> 00:00:02.000
            const times = line.split('-->');
            const startT = parseTime(times[0]);
            const endT = parseTime(times[1]);
            
            // Check if this cue falls within our clip window
            if (endT >= offsetStartSec && startT <= offsetEndSec) {
                // Adjust relative to clip 0
                const newStart = Math.max(0, startT - offsetStartSec);
                const newEnd = endT - offsetStartSec;
                
                outLines.push(`${formatTime(newStart)} --> ${formatTime(newEnd)}`);
                // Grab text payload
                let j = i + 1;
                while (j < lines.length && lines[j].trim() !== '') {
                    // Clean up basic youtube auto sub tags (like <c>)
                    let cleanText = lines[j].replace(/<[^>]+>/g, '').trim();
                    outLines.push(cleanText);
                    j++;
                }
                outLines.push(''); // Break cue
                i = j - 1; // skip forward
            }
        } else if (line.trim() === 'WEBVTT' || line.startsWith('Kind:') || line.startsWith('Language:')) {
            outLines.push(line.trim());
        }
    }
    
    if (outLines.length <= 2) return false; // No cues found
    
    fs.writeFileSync(destVttPath, outLines.join('\n'), 'utf8');
    return true;
}

// ----------------------------------------------------
// Constants and Environment
// ----------------------------------------------------
const TOOLS_DIR = path.join(__dirname, '..', '..', 'assets', 'tools');
// We need to resolve against CWD if running packaged
let ytdlpPath = 'yt-dlp';
let ffmpegPath = 'ffmpeg';

// Basic sanitization
function sanitizeFileName(name) {
    return name.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_').substring(0, 40);
}

function sanitizeFFmpegText(text) {
    if (!text) return '';
    // FFmpeg drawtext requires escaping of single quotes and colons.
    // Replace single quotes with standard apostrophe / empty space to avoid breaking string bounds.
    return text.replace(/'/g, "\u2019").replace(/:/g, "\\:");
}

// ----------------------------------------------------
// Main entry
// ----------------------------------------------------
async function main() {
    try {
        const configJson = process.argv[2];
        if (!configJson) throw new Error("No configuration provided.");
        
        const config = JSON.parse(configJson);
        const { 
            url, clipCount, shortMin, shortMax,
            videoQuality = '1080p',
            orientation = 'Portrait (9:16)',
            scaleMode = 'Fit Blur (Auto)',
            watermarkText = '',
            channelName = '',
            outputDir = 'Output',
            ytDlpPath = 'yt-dlp',
            ffmpegPath: cfgFfmpegPath = 'ffmpeg'
        } = config;

        ytdlpPath = ytDlpPath;
        ffmpegPath = cfgFfmpegPath;

        log(`[Settings] Output dir: ${outputDir}`);
        const progressDir = path.resolve(process.cwd(), outputDir, 'progress');
        const finalDir = path.resolve(process.cwd(), outputDir, 'final');
        
        if (!fs.existsSync(progressDir)) fs.mkdirSync(progressDir, { recursive: true });
        if (!fs.existsSync(finalDir)) fs.mkdirSync(finalDir, { recursive: true });

        // ---------------------------------------------------------------------------------
        // 1. Fetch Metadata and Heatmap
        // ---------------------------------------------------------------------------------
        log(`Fetching stream URL and YouTube heatmap data...`);
        let meta = {};
        try {
            const { stdout } = await execPromise(`"${ytdlpPath}" --dump-json "${url}"`);
            meta = JSON.parse(stdout);
        } catch (e) {
            logError(`Failed to fetch metadata: ${e.message}`);
            process.exit(1);
        }

        const baseName = sanitizeFileName(meta.title || 'video');
        const sourceChannel = channelName || meta.uploader || meta.channel || 'Unknown Channel';
        
        const groupFinalDir = path.resolve(finalDir, baseName);
        if (!fs.existsSync(groupFinalDir)) fs.mkdirSync(groupFinalDir, { recursive: true });
        
        log(`Metadata ready. Building clip plan from heatmap...`);
        const heatmap = meta.heatmap || [];
        
        let clips = [];
        // Note: Full complex heatmap algorithm logic simulated/simplified for now
        // In reality, this calculates peaks and handles overlap
        if (heatmap.length > 0) {
            // Sort heatmap by value descending
            const sortedHeat = [...heatmap].sort((a, b) => b.value - a.value);
            
            // Random Pick: Ambil kandidat 2x lipat dari jumlah yang diminta (min 10)
            const poolSize = Math.max(clipCount * 2, 10);
            let topCandidates = sortedHeat.slice(0, poolSize);
            
            // Acak urutan kandidat
            topCandidates.sort(() => Math.random() - 0.5);

            let selected = [];
            for (let heat of topCandidates) {
                if (selected.length >= clipCount) break;
                
                // Random Shift: Geser waktu mulai secara acak (-2 hingga -8 detik dari titik tertinggi)
                const startShift = Math.floor(Math.random() * 7) + 2; // Acak 2 hingga 8
                let s = Math.max(0, heat.start_time - startShift);
                
                // Random Shift: Durasi yang bervariasi
                const durationShift = Math.floor(Math.random() * 5); // Acak 0 hingga 4 detik ekstra
                let dur = Math.max(shortMin, Math.min(shortMax, heat.end_time - heat.start_time + 13 + durationShift));
                
                // Overlap check simplistic
                let overlap = selected.some(c => (s < c.start + c.dur && s + dur > c.start));
                if (!overlap) {
                    selected.push({ start: s, dur: dur });
                }
            }

            // Jika masih kurang dari target, ambil sisa dari yang belum terpilih (bisa ditambahkan logika fallback jika terlalu ketat, tapi untuk saat ini cukup)
            
            clips = selected.map((c, i) => ({ id: i + 1, start: Math.floor(c.start), end: Math.floor(c.start + c.dur) }));
        } else {
            // Fallback: Spread out clips randomly-evenly across the entire video duration
            log(`No heatmap found (video might be new or doesn't have engagement data yet). using Smart Spread Fallback...`);
            // Approximate duration or minimal fallback threshold
            const totalDuration = meta.duration || (clipCount * 60 + 120); 
            
            // Skip first 5% (Intros) and last 5% (Outros)
            const safeStart = totalDuration * 0.05;
            const safeEnd = totalDuration * 0.95;
            const safeLength = safeEnd - safeStart;
            
            // Divide the "safe" video portion into equal segments for each requested clip
            const segmentSize = safeLength / clipCount;
            
            for(let i=0; i<clipCount; i++) {
                const segmentStart = safeStart + (i * segmentSize);
                
                // Add minor pseudo-random variation inside the segment (up to 40% of segment length)
                const randomShift = Math.random() * (segmentSize * 0.4);
                let pointStart = Math.floor(segmentStart + randomShift);
                
                // Ensure length safety
                if (pointStart + shortMax >= totalDuration) {
                    pointStart = Math.max(0, totalDuration - shortMax - 5);
                }
                
                clips.push({ id: i+1, start: pointStart, end: pointStart + shortMax });
            }
        }

        log(`Clip plan ready: ${clips.length} clips. Downloading and processing per clip...`);

        // ---------------------------------------------------------------------------------
        // 1b. Fetch Global Subtitles (Prevents 429 from multiple requests)
        // ---------------------------------------------------------------------------------
        let globalVtt = null;
        try {
            log(`Attempting to fetch global auto-subtitles (en/id)...`);
            const subCmd = `"${ytdlpPath}" --write-auto-subs --sub-format vtt --sub-langs "id.*,en.*" --skip-download -o "${path.join(progressDir, baseName + '_global')}" "${url}"`;
            
            const { stdout, stderr } = await execPromise(subCmd);
            
            // Search progressDir for the downloaded VTT (it could be .en.vtt, .id.vtt, .en-orig.vtt, etc)
            const filesInDir = fs.readdirSync(progressDir);
            const foundVtt = filesInDir.find(f => f.startsWith(baseName + '_global') && f.endsWith('.vtt'));
            
            if (foundVtt) {
                globalVtt = path.join(progressDir, foundVtt);
                log(`Subtitle file secured: ${foundVtt}`);
            } else {
                log(`yt-dlp finished but no VTT found. It might not be available for this VOD.`);
            }
        } catch(e) {
            let errMsg = e.message.substring(0, 150);
            if (e.stderr) {
                const errLines = e.stderr.split('\n').filter(l => l.includes('ERROR:') || l.includes('WARNING:')).map(l => l.trim());
                if (errLines.length > 0) errMsg = errLines.join(' | ');
            }
            log(`Subtitles not found. Moving on without subs. Reason: ${errMsg}`);
        }

        // ---------------------------------------------------------------------------------
        // 1c. Siapkan Asset B-Roll (Untuk Mode Split B-Roll ASMR)
        // ---------------------------------------------------------------------------------
        const brollDir = path.resolve(process.cwd(), outputDir, 'broll');
        let availableBrolls = [];
        if (fs.existsSync(brollDir)) {
            availableBrolls = fs.readdirSync(brollDir).filter(f => f.endsWith('.mp4') || f.endsWith('.webm'));
            if (availableBrolls.length > 0) {
                log(`[B-Roll] Ditemukan ${availableBrolls.length} video cadangan di ${outputDir}/broll/ untuk layar bawah.`);
            }
        }

        // ---------------------------------------------------------------------------------
        // 2 & 3. Process each clip
        // ---------------------------------------------------------------------------------
        for (let i = 0; i < clips.length; i++) {
            const clip = clips[i];
            const finalFile = path.join(groupFinalDir, `${baseName}_${String(clip.start).padStart(6, '0')}.mp4`);
            
            // Generate Random B-Roll Data for this clip iteration
            let brollFileExists = false;
            let randomBrollData = null;
            if (availableBrolls.length > 0) {
                const randomBrollName = availableBrolls[Math.floor(Math.random() * availableBrolls.length)];
                randomBrollData = path.join(brollDir, randomBrollName);
                brollFileExists = true;
            }

            if (fs.existsSync(finalFile)) {
                log(`Clip ${i+1}/${clips.length}: Already exists, skipping download and render.`);
                continue;
            }

            const sourceFile = path.join(progressDir, `${baseName}_clip_${clip.id}_source.mp4`);
            
            // Download section
            log(`Clip ${i+1}/${clips.length}: Downloading source segment...`);
            
            // Note: The YT-DLP section command
            let maxDlHeight = 1080;
            if (videoQuality === '720p') maxDlHeight = 720;
            if (videoQuality === '480p') maxDlHeight = 480;
            const ytCmd = `"${ytdlpPath}" --download-sections "*${clip.start}-${clip.end}" --force-keyframes-at-cuts -f "bestvideo[height<=${maxDlHeight}][ext=mp4]+bestaudio[ext=m4a]/best" -o "${sourceFile}" "${url}"`;
            
            try {
                await execPromise(ytCmd);
            } catch(e) {
                logError(`Failed to download clip ${clip.id}: ${e.message}`);
                continue; // try next
            }
            
            // Render stage
            log(`Clip ${i+1}/${clips.length}: Download complete. Preparing subtitle stage...`);
            
            // Check if subtitle was downloaded globally
            const localClipVtt = path.join(progressDir, `${baseName}_clip_${clip.id}_synced.vtt`);
            let hasSubs = false;
            
            if (globalVtt && fs.existsSync(globalVtt)) {
                log(`Subtitle found! Attempting VTT time-shift alignment...`);
                hasSubs = adjustVttOffset(globalVtt, localClipVtt, clip.start, clip.end);
            }
            
            if (hasSubs) log(`Prepare clip ${i+1}/${clips.length} ... Subtitles aligned!`);
            else log(`Prepare clip ${i+1}/${clips.length} ... No accessible subtitles found.`);
            log(`Render clip ${i+1}/${clips.length}: Burning subtitles & video...`); // Using original text standard from doc
            
            // Target dimensions for portrait
            let tW = 1080, tH = 1920;
            if (videoQuality === '720p') { tW = 720; tH = 1280; }
            else if (videoQuality === '480p') { tW = 480; tH = 854; }

            // Build complex FFmpeg filter
            let vf = "";
            let effectiveScaleMode = scaleMode;
            
            if (scaleMode.includes("Smart Auto")) {
                const category = (meta.categories || [])[0] || 'Unknown';
                log(`[Smart Auto] Detecting layout based on category: ${category}`);
                
                if (category === 'Gaming') {
                    effectiveScaleMode = "Game Stream (Face on Bottom Left)";
                } else if (['People & Blogs', 'Entertainment', 'News & Politics', 'Comedy', 'Education', 'Science & Technology', 'Howto & Style'].includes(category)) {
                    effectiveScaleMode = "Dual Split";
                } else if (['Music', 'Sports', 'Film & Animation'].includes(category)) {
                    effectiveScaleMode = "Center Crop";
                } else {
                    effectiveScaleMode = "Fit Blur";
                }
                log(`[Smart Auto] Decided layout mode: ${effectiveScaleMode}`);
            }

            if (effectiveScaleMode.startsWith("Fit Blur")) {
                let blurT = `[0:v]scale=${tW}:${tH}:force_original_aspect_ratio=increase,boxblur=20:20,crop=${tW}:${tH}[bg];`;
                let fgScale = scaleMode.includes("Zoom 1.5x") ? `${Math.round(tW*1.5)}:-2` : `${tW}:-2`;
                let fgLayer = `[0:v]scale=${fgScale}:force_original_aspect_ratio=decrease[fg];`;
                
                vf = `${blurT}${fgLayer}[bg][fg]overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2[base]`;
            } else if (effectiveScaleMode.includes("Split B-Roll") && brollFileExists) {
                // Video utama di atas (Layar atas)
                let halfH = Math.round(tH / 2);
                vf = `[0:v]scale=${tW}:${halfH}:force_original_aspect_ratio=increase,crop=${tW}:${halfH}[top];`;
                // Video B-Roll ASMR di bawah (Layar bawah) - kecepatan 1.5x lipat agar lebih dinamis
                vf += `[1:v]setpts=PTS/1.5,scale=${tW}:${halfH}:force_original_aspect_ratio=increase,crop=${tW}:${halfH}[bottom];`;
                vf += `[top][bottom]vstack[base]`;
            } else if (effectiveScaleMode.includes("Dual Split")) {
                let leftWidth = `iw*0.60`;
                let rightWidth = `iw*0.50`;
                let halfH = Math.round(tH / 2);
                vf = `[0:v]crop=w=${leftWidth}:h=ih:x=0:y=0[left];`;
                vf += `[0:v]crop=w=${rightWidth}:h=ih:x=iw*0.50:y=0[right];`;
                vf += `[left]scale=${tW}:${halfH}:force_original_aspect_ratio=increase,crop=${tW}:${halfH}[top];`;
                vf += `[right]scale=${tW}:${halfH}:force_original_aspect_ratio=increase,crop=${tW}:${halfH}[bottom];`;
                vf += `[top][bottom]vstack[base]`;
            } else if (effectiveScaleMode.includes("Center Crop")) {
                vf = `[0:v]scale=${tW}:${tH}:force_original_aspect_ratio=increase,crop=${tW}:${tH}[base]`;
            } else if (effectiveScaleMode.startsWith("Game Stream")) {
                let halfH = Math.round(tH / 2);
                const isRight = effectiveScaleMode.includes("Right");
                const isTop = effectiveScaleMode.includes("Top");

                if (isTop) {
                    // Face on Top: Facecam crop pojok atas, Gameplay di bawah
                    let camX = isRight ? "iw*0.75" : "0";
                    let camY = "0"; // top of screen
                    vf = `[0:v]crop=w=iw*0.25:h=ih*0.35:x=${camX}:y=${camY}[cam_face];`;
                    vf += `[0:v]crop=w=iw*0.5:h=ih:x=iw*0.25:y=0[game_center];`;
                    vf += `[cam_face]scale=${tW}:${halfH}:force_original_aspect_ratio=increase,crop=${tW}:${halfH}[top];`;
                    vf += `[game_center]scale=${tW}:${halfH}:force_original_aspect_ratio=increase,crop=${tW}:${halfH}[bottom];`;
                    vf += `[top][bottom]vstack[base]`;
                } else {
                    // Face on Bottom (existing): Facecam crop pojok bawah, Gameplay di atas
                    let camX = isRight ? "iw*0.75" : "0";
                    let camY = "ih*0.65"; // bottom 35% height approximately
                    vf = `[0:v]crop=w=iw*0.25:h=ih*0.35:x=${camX}:y=${camY}[cam_face];`;
                    vf += `[0:v]crop=w=iw*0.5:h=ih:x=iw*0.25:y=0[game_center];`;
                    vf += `[cam_face]scale=${tW}:${halfH}:force_original_aspect_ratio=increase,crop=${tW}:${halfH}[bottom_face];`;
                    vf += `[game_center]scale=${tW}:${halfH}:force_original_aspect_ratio=increase,crop=${tW}:${halfH}[top_game];`;
                    vf += `[top_game][bottom_face]vstack[base]`;
                }
            } else {
                // Default handling fallback
                 vf = `[0:v]scale=${tW}:${tH}:force_original_aspect_ratio=decrease,pad=${tW}:${tH}:(ow-iw)/2:(oh-ih)/2[base]`;
            }

            // Overlay Text
            let scText = '';
            if (sourceChannel) {
                // x=30, y=30 with box
                const safeChannel = sanitizeFFmpegText(sourceChannel);
                scText = `drawtext=text='sc \\: ${safeChannel}':x=30:y=30:fontsize=24:fontcolor=white:box=1:boxcolor=black@0.5:boxborderw=5`;
            }
            let wmText = '';
            if (watermarkText) {
                // x center, y offset 30% from bottom (1280-texth-(1280*0.3)) -> eval: x=(w-text_w)/2:y=h-th-(h*0.3)
                // drawtext with white@0.35 (simulated by using white and alpha in modern ffmpeg, or just white if basic)
                const safeWatermark = sanitizeFFmpegText(watermarkText);
                wmText = `drawtext=text='${safeWatermark}':x=(w-text_w)/2:y=h-th-(h*0.3):fontsize=32:fontcolor=white@0.35`;
            }

            let textFilters = [scText, wmText].filter(Boolean).join(',');
            if (textFilters) {
                vf += `;[base]${textFilters}[text_stage]`;
            } else {
                vf += `;[base]copy[text_stage]`;
            }

            if (hasSubs) {
                // Escape Windows path for ffmpeg subtitles filter (needs double escaping \\ -> \\\\, : -> \\:)
                let safeVtt = localClipVtt.replace(/\\/g, '\\\\').replace(/:/g, '\\:');
                // Alignment=2 (Bottom Center), MarginV=300 lifts it safely to lower-middle.
                vf += `;[text_stage]subtitles='${safeVtt}':force_style='Fontname=Arial,Bold=1,Fontsize=24,PrimaryColour=&H0000FFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=3,Shadow=0,Alignment=2,MarginV=300'[final]`;
            } else {
                vf += `;[text_stage]copy[final]`;
            }

            // Target dimensions & input mapping
            let mapAudio = brollFileExists && effectiveScaleMode.includes("Split B-Roll") ? '0:a?' : '0:a?';

            // Try rendering with hardware acceleration cascade
            const encoders = ['h264_nvenc', 'h264_qsv', 'h264_amf', 'libx264'];
            let renderSuccess = false;

            for (const encoder of encoders) {
                if (renderSuccess) break;
                
                try {
                    let lastLoggedPercent = -100;
                    await new Promise((resolve, reject) => {
                        let ffArgs = [
                            '-y', '-i', sourceFile
                        ];

                        if (brollFileExists && effectiveScaleMode.includes("Split B-Roll")) {
                            // Random seek offset agar tiap klip pakai bagian berbeda dari B-Roll
                            // Video B-Roll kita ~10 menit (600 detik), seek max 480 detik (menyisakan 2 menit buffer)
                            const randomBrollOffset = Math.floor(Math.random() * 480);
                            ffArgs.push('-ss', String(randomBrollOffset)); // seek ke titik acak
                            ffArgs.push('-stream_loop', '-1'); // loop dari titik tersebut jika perlu
                            ffArgs.push('-i', randomBrollData);
                        }
                        
                        // Durasi output dibatasi tepat sesuai klip — KRITIS untuk Split B-Roll
                        // agar -stream_loop -1 tidak menyebabkan infinite encoding
                        const clipDuration = (clip.end - clip.start).toFixed(3);

                        ffArgs.push(
                            '-filter_complex', vf, 
                            '-map', '[final]', '-map', mapAudio,
                            '-t', clipDuration,
                            '-c:v', encoder, '-preset', 'fast', 
                            '-c:a', 'aac', '-b:a', '160k', finalFile
                        );
                        
                        log(`Render clip ${i+1}/${clips.length}: Attempting with encoder ${encoder}...`);
                        const ff = spawn(ffmpegPath, ffArgs);
                        
                        let errorLog = '';
                        ff.stderr.on('data', (d) => {
                            const str = d.toString();
                            errorLog += str;
                            const timeMatch = str.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
                            if(timeMatch) {
                                const [_, h, m, s] = timeMatch;
                                const sec = parseInt(h)*3600 + parseInt(m)*60 + parseFloat(s);
                                const percent = Math.min(100, Math.round((sec / (clip.end - clip.start)) * 100));
                                if (percent >= lastLoggedPercent + 25 || percent === 100) {
                                    log(`Render clip ${i+1}/${clips.length} [${encoder}]: ${percent}%`);
                                    lastLoggedPercent = percent;
                                }
                            }
                        });

                        ff.on('close', (code) => {
                            if (code === 0) {
                                resolve();
                            } else {
                                // If hw encoder not supported, FFmpeg exits with error
                                reject(new Error(`Encoder ${encoder} failed.`));
                            }
                        });
                    });
                    renderSuccess = true;
                } catch (e) {
                     // Silently proceed to next encoder in cascade if it naturally fails
                }
            }
            
           if (!renderSuccess) {
                logError(`Render failed for clip ${clip.id} after trying all encoders.`);
                continue;
            }
        }

        log(`SUCCESSFULLY GENERATED ${clips.length} CLIPS at ${groupFinalDir}`);

    } catch (e) {
        logError(`Unexpected error: ${e.message}`);
        process.exit(1);
    }
}

main();
