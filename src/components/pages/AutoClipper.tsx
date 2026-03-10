import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useStorage } from "../../hooks/useStorage";
import { useLogs } from "../../hooks/useLogs";
import { LogConsole } from "../layout/LogConsole";

export const AutoClipper = () => {
    // Basic Settings
    const [url, setUrl] = useStorage("clipper_url", "");
    const [clipCount, setClipCount] = useStorage("clipper_count", 5);
    const [shortMin, setShortMin] = useStorage("clipper_min", 15);
    const [shortMax, setShortMax] = useStorage("clipper_max", 50);

    // Render Settings
    const [videoQuality, setVideoQuality] = useStorage("clipper_quality", "1080p");
    const [scaleMode, setScaleMode] = useStorage("clipper_scale_mode", "Smart Auto (AI Heuristics)");
    const [watermarkText, setWatermarkText] = useStorage("clipper_watermark", "");
    const [channelName, setChannelName] = useStorage("clipper_channel", "");

    // Path Configs (Synced with Settings)
    const [ytDlpPath] = useStorage("yt_dlp_path", "yt-dlp");
    const [ffmpegPath] = useStorage("ffmpeg_path", "ffmpeg");
    const [outputDir] = useStorage("output_dir", "Output");

    const [isRunning, setIsRunning] = useState(false);
    const { logs, logsEndRef, addLog, clearLogs } = useLogs(() => setIsRunning(false));

    useEffect(() => {
        // Sync isRunning state with actual Tauri backend on component mount
        invoke<boolean>('check_running').then(setIsRunning).catch(console.error);
    }, []);

    const startProcessing = async () => {
        if (!url || !url.includes("youtu")) {
            addLog("error", "Please provide a valid YouTube URL");
            return;
        }

        const config = {
            url, clipCount, shortMin, shortMax,
            videoQuality, orientation: "Portrait (9:16)", scaleMode, watermarkText, channelName,
            ytDlpPath, ffmpegPath, outputDir
        };

        setIsRunning(true);
        addLog("info", "Deploying Auto Clipper for processing...");

        try {
            await invoke("start_clipper", { config: JSON.stringify(config) });
            addLog("success", "Clipper job initiated!");
        } catch (error: any) {
            addLog("error", "Failed to start clipper: " + error);
            setIsRunning(false);
        }
    };

    const stopProcessing = async () => {
        addLog('warning', 'Stopping clipper module...');
        try {
            await invoke("stop_automation"); // Using the same stop_automation signal because it just kills process stored in state
            setIsRunning(false);
            addLog('success', 'Clipper stopped.');
        } catch (error: any) {
            addLog('error', `Failed to stop: ${error}`);
        }
    };

    return (
        <div className="page-container">
            <header className="header" style={{ marginBottom: "0" }}>
                <h1>Auto Clipper</h1>
                <p>Convert YouTube Videos to optimal short formats</p>
            </header>
            
            <div className="card" style={{ padding: "20px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px 24px", alignItems: "start" }}>

                    {/* Row 1 */}
                    <div className="form-group" style={{ marginBottom: "0" }}>
                        <label>YouTube Source URL</label>
                        <input 
                            type="text" 
                            placeholder="https://www.youtube.com/watch?v=..." 
                            value={url} 
                            onChange={(e) => setUrl(e.target.value)}
                            disabled={isRunning}
                            className="form-control"
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: "0" }}>
                        <label>Video Quality</label>
                        <select 
                            value={videoQuality} 
                            onChange={(e) => setVideoQuality(e.target.value)}
                            disabled={isRunning}
                            className="form-control"
                        >
                            <option value="1080p">High (1080x1920)</option>
                            <option value="720p">Medium (720x1280)</option>
                            <option value="480p">Low (480x854)</option>
                        </select>
                    </div>

                    {/* Row 2 */}
                    <div className="form-group" style={{ marginBottom: "0" }}>
                        <label style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>Target Clips Generated</span>
                            <span style={{ fontWeight: "bold", color: "var(--accent)" }}>{clipCount} clips</span>
                        </label>
                        <div className="form-control" style={{ display: "flex", alignItems: "center", padding: "0 10px" }}>
                            <input 
                                type="range" 
                                min="5" max="25"
                                value={clipCount} 
                                onChange={(e) => setClipCount(Number(e.target.value))}
                                disabled={isRunning}
                                style={{ width: "100%", margin: 0, cursor: "pointer", accentColor: "var(--accent)" }}
                            />
                        </div>
                    </div>
                    <div className="form-group" style={{ marginBottom: "0" }}>
                        <label>Scale Mode</label>
                        <select 
                            value={scaleMode} 
                            onChange={(e) => setScaleMode(e.target.value)}
                            disabled={isRunning}
                            className="form-control"
                        >
                            <option>Smart Auto (AI Heuristics)</option>
                            <option>Split B-Roll ASMR</option>
                            <option>Dual Split (Left Top, Right Bottom)</option>
                            <option>Center Crop (Fill)</option>
                            <option>Game Stream (Face on Bottom Left)</option>
                            <option>Game Stream (Face on Bottom Right)</option>
                            <option>Game Stream (Face on Top Left)</option>
                            <option>Game Stream (Face on Top Right)</option>
                            <option>Fit Blur Zoom 1.5x</option>
                            <option>Fit Blur (Legacy)</option>
                        </select>
                    </div>

                    {/* Row 3 */}
                    <div className="form-group" style={{ marginBottom: "0" }}>
                        <label>Min Duration (sec)</label>
                        <input 
                            type="number" 
                            min="5" max="180"
                            value={shortMin} 
                            onChange={(e) => setShortMin(Number(e.target.value))}
                            disabled={isRunning}
                            className="form-control"
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: "0" }}>
                        <label>Channel Source/Credit (Optional)</label>
                        <input 
                            type="text" 
                            placeholder="Auto from YouTube if empty" 
                            value={channelName} 
                            onChange={(e) => setChannelName(e.target.value)}
                            disabled={isRunning}
                            className="form-control"
                        />
                    </div>

                    {/* Row 4 */}
                    <div className="form-group" style={{ marginBottom: "0" }}>
                        <label>Max Duration (sec)</label>
                        <input 
                            type="number" 
                            min="5" max="180"
                            value={shortMax} 
                            onChange={(e) => setShortMax(Number(e.target.value))}
                            disabled={isRunning}
                            className="form-control"
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: "0" }}>
                        <label>Watermark (Optional)</label>
                        <input 
                            type="text" 
                            placeholder="Your username / logo text" 
                            value={watermarkText} 
                            onChange={(e) => setWatermarkText(e.target.value)}
                            disabled={isRunning}
                            className="form-control"
                        />
                    </div>

                </div>
            </div>

            <div className="card">
                <LogConsole 
                    logs={logs}
                    logsEndRef={logsEndRef}
                    addLog={addLog}
                    clearLogs={clearLogs}
                />

                <div className="actions" style={{ marginTop: '20px' }}>
                {!isRunning ? (
                    <button className="btn-primary" onClick={startProcessing}>
                        Start Clipping Video
                    </button>
                ) : (
                    <button className="btn-danger" onClick={stopProcessing}>
                        ⏹ Stop Execution
                    </button>
                )}
                </div>
            </div>
        </div>
    );
};
