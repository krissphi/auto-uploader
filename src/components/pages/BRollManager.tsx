import { useState, useEffect } from "react";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { useLogs } from "../../hooks/useLogs";
import { LogConsole } from "../layout/LogConsole";
import { listen } from "@tauri-apps/api/event";
import { useStorage } from "../../hooks/useStorage";
import { VideoThumbnail } from "../shared/VideoThumbnail";
import { RefreshButton } from "../shared/RefreshButton";
import { Card } from "../shared/Card";
import { Input, Select } from "../shared/Inputs";

export const BRollManager = () => {
    const [count, setCount] = useState(3);
    const [category, setCategory] = useState("Random");
    const [quality, setQuality] = useState("720p");
    const [isDownloading, setIsDownloading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [brolls, setBrolls] = useState<string[]>([]);
    const [ytDlpPath] = useStorage("yt_dlp_path", "yt-dlp");
    const [outputDir] = useStorage("output_dir", "Output");
    const [previewFile, setPreviewFile] = useState<string | null>(null);

    const { logs, logsEndRef, addLog, clearLogs } = useLogs(() => {});

    const brollFullPath = (file: string) => `${outputDir}\\broll\\${file}`;

    const fetchBrolls = async () => {
        setIsRefreshing(true);
        try {
            const list: string[] = await invoke("get_brolls_list", { outputDir });
            setBrolls(list);
        } catch (error) {
            console.error("Failed to fetch B-Rolls:", error);
        } finally {
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchBrolls();

        const unlisten = listen("broll_download_finished", () => {
            setIsDownloading(false);
            addLog("success", "Download completely finished! Auto-refreshing list...");
            fetchBrolls();
        });

        return () => { unlisten.then(f => f()); };
    }, []);

    const startDownload = async () => {
        if (count < 1 || count > 20) {
            addLog("error", "Please enter a valid number between 1 and 20.");
            return;
        }
        setIsDownloading(true);
        addLog("info", `Requesting scraper to find ${count} B-Roll videos in category "${category}" with quality ${quality} (Copyright-Free CC-BY & No Audio)...`);
        try {
            await invoke("download_broll", { count, ytDlpPath, outputDir, category, quality });
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

            {/* Scraper Controls */}
            <div className="card" style={{ padding: "20px" }}>
                <h3 style={{ margin: "0 0 10px 0" }}>One-Click Auto Scraper</h3>
                <p style={{ fontSize: "14px", color: "#888", marginBottom: "15px" }}>
                    The system will automatically search, filter (Copyright-Free CC-BY, Duration &lt; 15 Mins), and download engaging satisfying videos (like GTA V Parkour or Sand ASMR) to your computer.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                        <div style={{ flex: 1, minWidth: "120px" }}>
                            <Input
                                label="Video Count"
                                type="number"
                                min="1" max="20"
                                value={count}
                                onChange={(e) => setCount(Number(e.target.value))}
                                disabled={isDownloading}
                            />
                        </div>

                        <div style={{ flex: 2, minWidth: "200px" }}>
                            <Select
                                label="Category"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                disabled={isDownloading}
                                options={[
                                    { value: "Random", label: "🎲 Random Mix" },
                                    { value: "MLBB Tournament MPL MDL M-Series", label: "🎮 MLBB Tournament" },
                                    { value: "Magic Chess Go Go MCGG Moonton", label: "♟️ Magic Chess Go Go" },
                                    { value: "Minecraft Parkour", label: "🧱 Minecraft Parkour" },
                                    { value: "GTA V Mega Ramp", label: "🏎️ GTA V Mega Ramp" },
                                    { value: "Subway Surfers", label: "🏃 Subway Surfers" },
                                    { value: "Kinetic Sand", label: "⏳ Kinetic Sand" },
                                    { value: "Soap Cutting", label: "🔪 Soap Cutting" },
                                    { value: "Satisfying Slime", label: "🧪 Slime ASMR" },
                                    { value: "Woodworking", label: "🪵 Woodworking" },
                                    { value: "Pressure Washer", label: "🚿 Pressure Washer" },
                                    { value: "CSGO Surf", label: "🏄 CSGO Surfing" }
                                ]}
                            />
                        </div>

                        <div style={{ flex: 1, minWidth: "120px" }}>
                            <Select
                                label="Quality"
                                value={quality}
                                onChange={(e) => setQuality(e.target.value)}
                                disabled={isDownloading}
                                options={[
                                    { value: "1080p", label: "1080p" },
                                    { value: "720p", label: "720p" },
                                    { value: "480p", label: "480p" },
                                    { value: "360p", label: "360p" }
                                ]}
                            />
                        </div>
                    </div>

                    {!isDownloading ? (
                        <button className="btn-primary" onClick={startDownload} disabled={!count} style={{ whiteSpace: "nowrap", flex: "1 0 auto", minWidth: "180px", margin: 0 }}>
                            Download B-Rolls
                        </button>
                    ) : (
                        <button className="btn-danger" onClick={stopDownload} style={{ whiteSpace: "nowrap", flex: "1 0 auto", minWidth: "180px", margin: 0 }}>
                            ⏹ Stop Download
                        </button>
                    )}
                </div>
            </div>

            {/* Download Console */}
            <Card>
                <LogConsole logs={logs} logsEndRef={logsEndRef} addLog={addLog} clearLogs={clearLogs} />
            </Card>

            {/* Thumbnail Grid */}
            <Card>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <h3 style={{ margin: 0 }}>Available Background Videos ({brolls.length})</h3>
                    <RefreshButton 
                        onClick={fetchBrolls}
                        isRefreshing={isRefreshing}
                        title="Refresh list"
                        size={18}
                    />

                </div>

                {brolls.length === 0 ? (
                    <div style={{ padding: "20px", textAlign: "center", color: "#888", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 0 }}>
                        No B-Rolls found. Download one above or place .mp4 / .webm files directly into the "Output/broll" folder.
                    </div>
                ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                        {brolls.map((file, idx) => (
                            <VideoThumbnail
                                key={idx}
                                filePath={brollFullPath(file)}
                                label={file}
                                onClick={() => setPreviewFile(brollFullPath(file))}
                            />
                        ))}
                    </div>
                )}
            </Card>

            {/* Fullscreen Preview Modal */}
            {previewFile && (
                <div
                    onClick={() => setPreviewFile(null)}
                    style={{
                        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: "rgba(0,0,0,0.88)",
                        zIndex: 9999,
                        display: "flex", flexDirection: "column",
                        alignItems: "center", justifyContent: "center",
                        padding: "40px"
                    }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{ position: "relative", width: "100%", maxWidth: "800px", display: "flex", flexDirection: "column", gap: "16px" }}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <h3 style={{ margin: 0, color: "white", fontSize: "1.1rem", wordBreak: "break-all" }}>
                                {previewFile.split("\\").pop()}
                            </h3>
                            <button
                                onClick={() => setPreviewFile(null)}
                                style={{ background: "transparent", border: "none", color: "white", fontSize: "24px", cursor: "pointer", padding: "8px", lineHeight: 1 }}
                            >
                                ✕
                            </button>
                        </div>
                        <video
                            src={convertFileSrc(previewFile)}
                            controls
                            autoPlay
                            style={{ width: "100%", maxHeight: "70vh", backgroundColor: "#000", borderRadius: 0, boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
