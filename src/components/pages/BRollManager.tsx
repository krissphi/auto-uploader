import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useLogs } from "../../hooks/useLogs";
import { LogConsole } from "../layout/LogConsole";
import { listen } from "@tauri-apps/api/event";
import { useStorage } from "../../hooks/useStorage";

export const BRollManager = () => {
    const [count, setCount] = useState(3);
    const [isDownloading, setIsDownloading] = useState(false);
    const [brolls, setBrolls] = useState<string[]>([]);
    const [ytDlpPath] = useStorage("yt_dlp_path", "yt-dlp");
    const [outputDir] = useStorage("output_dir", "Output");
    
    // Using existing useLogs hook but we don't automatically stop process on log event because we rely on the finished event.
    const { logs, logsEndRef, addLog, clearLogs } = useLogs(() => {});

    const fetchBrolls = async () => {
        try {
            const list: string[] = await invoke("get_brolls_list", { outputDir });
            setBrolls(list);
        } catch (error) {
            console.error("Failed to fetch B-Rolls:", error);
        }
    };

    useEffect(() => {
        fetchBrolls();

        // Listen for the custom finish event emitted by our Rust backend to turn off downloading state.
        const unlisten = listen("broll_download_finished", () => {
             setIsDownloading(false);
             addLog("success", "Download completely finished! Auto-refreshing list...");
             fetchBrolls();
        });

        return () => {
            unlisten.then(f => f());
        };
    }, []);

    const startDownload = async () => {
        if (count < 1 || count > 20) {
            addLog("error", "Please enter a valid number between 1 and 20.");
            return;
        }

        setIsDownloading(true);
        addLog("info", `Requesting scraper to find ${count} B-Roll videos (Copyright-Free CC-BY & No Audio)...`);

        try {
            await invoke("download_broll", { count, ytDlpPath, outputDir });
            addLog("success", "Automated search engine & downloader initialized...");
        } catch (error: any) {
            addLog("error", "Failed to start downloader: " + error);
            setIsDownloading(false);
        }
    };

    const stopDownload = async () => {
        try {
            await invoke("stop_broll_download");
            setIsDownloading(false);
            addLog("warning", "B-Roll download stopped by user.");
        } catch (error: any) {
            addLog("error", "Failed to stop: " + error);
        }
    };

    return (
        <div className="page-container">
            <header className="header" style={{ marginBottom: "0" }}>
                <h1>B-Roll Asset Manager</h1>
                <p>Automated stock video engine for "Split-Screen Sludge & ASMR" clips.</p>
            </header>
            
            <div className="card" style={{ padding: "20px" }}>
                <h3 style={{ margin: "0 0 10px 0" }}>One-Click Auto Scraper</h3>
                <p style={{ fontSize: "14px", color: "#888", marginBottom: "15px" }}>
                    The system will automatically search, filter (Copyright-Free CC-BY, Duration &lt; 15 Mins), and download engaging satisfying videos (like GTA V Parkour or Sand ASMR) to your computer.
                </p>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <label style={{whiteSpace: "nowrap"}}>Video Count: </label>
                    <input 
                        type="number" 
                        min="1" max="20"
                        value={count} 
                        onChange={(e) => setCount(Number(e.target.value))}
                        disabled={isDownloading}
                        className="form-control"
                        style={{ margin: 0, width: "100px" }}
                    />
                    {!isDownloading ? (
                        <button 
                            className="btn-primary" 
                            onClick={startDownload}
                            disabled={!count}
                            style={{ whiteSpace: "nowrap" }}
                        >
                            🚀 Auto Scrape B-Rolls
                        </button>
                    ) : (
                        <button 
                            className="btn-danger" 
                            onClick={stopDownload}
                            style={{ whiteSpace: "nowrap" }}
                        >
                            ⏹ Stop Download
                        </button>
                    )}
                </div>
            </div>

            {/* Console Log exclusively for this Downloader */}
            <div className="card" style={{ marginTop: "20px", maxHeight: "300px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <LogConsole 
                    logs={logs}
                    logsEndRef={logsEndRef}
                    addLog={addLog}
                    clearLogs={clearLogs}
                />
            </div>

            {/* Video List */}
            <div className="card" style={{ marginTop: "20px", padding: "20px" }}>
                <h3 style={{ margin: "0 0 15px 0" }}>🎞️ Available Background Videos ({brolls.length})</h3>
                {brolls.length === 0 ? (
                    <div style={{ padding: "20px", textAlign: "center", color: "#888", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "8px" }}>
                        No B-Rolls found. Download one above or place .mp4 files directly into the "Output/broll" folder.
                    </div>
                ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "15px" }}>
                        {brolls.map((file, idx) => (
                            <div key={idx} style={{ 
                                padding: "12px 15px", 
                                backgroundColor: "rgba(255,255,255,0.08)", 
                                borderRadius: "8px",
                                display: "flex",
                                alignItems: "center",
                                gap: "10px"
                            }}>
                                <span style={{ fontSize: "20px" }}>🎬</span>
                                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, fontSize: "14px" }}>
                                    {file}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
        </div>
    );
};
