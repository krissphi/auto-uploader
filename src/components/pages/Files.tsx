import { useState, useEffect } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useStorage } from "../../hooks/useStorage";
import { getDirectoryFiles, getDirectories, moveFile, createDirAll, removeDirAll } from "../../services/fileManager";

export const FilesPage = () => {
    const [outputDir] = useStorage("output_dir", "Output");
    
    const [groupedFiles, setGroupedFiles] = useState<Record<string, string[]>>({});
    const [batches, setBatches] = useState<Record<string, string[]>>({});
    
    // To ensure UI correctly refreshes
    const [triggerRefetch, setTriggerRefetch] = useState(0);

    // Editing file names
    const [editNames, setEditNames] = useState<Record<string, string>>({});
    
    // Preview modal state
    const [previewVideo, setPreviewVideo] = useState<string | null>(null);

    const [titleTemplates] = useStorage<string[]>("saved_title_templates", [""], ["saved_title_template"]);

    useEffect(() => {
        const fetchFiles = async () => {
            if (!outputDir) return;
            
            try {
                // Fetch unbatched files from new folder structure
                const finalPath = `${outputDir}\\final`;
                await createDirAll(finalPath).catch(() => {}); // Ensure exists
                const finalDirs = await getDirectories(finalPath);
                
                const finalMap: Record<string, string[]> = {};
                for (const d of finalDirs) {
                    const filesInDir = await getDirectoryFiles(`${finalPath}\\${d}`);
                    if (filesInDir.length > 0) {
                        finalMap[d] = filesInDir;
                    }
                }
                const looseFiles = await getDirectoryFiles(finalPath);
                if (looseFiles.length > 0) {
                    finalMap["Others"] = looseFiles;
                }
                setGroupedFiles(finalMap);
                
                // Fetch batches
                const batchesPath = `${outputDir}\\batches`;
                await createDirAll(batchesPath).catch(() => {}); // Ensure exists
                const batchDirs = await getDirectories(batchesPath);
                
                const batchMap: Record<string, string[]> = {};
                for (const d of batchDirs) {
                    const filesInBatch = await getDirectoryFiles(`${batchesPath}\\${d}`);
                    batchMap[d] = filesInBatch;
                }
                setBatches(batchMap);
                
            } catch (err) {
                console.error("Failed to read file tree", err);
            }
        };
        fetchFiles();
    }, [outputDir, triggerRefetch]);

    // Auto-refresh when Clipper finishes a background task
    useEffect(() => {
        let unlistenFin: () => void;
        
        listen<string>('clipper_finished', () => {
             setTriggerRefetch(prev => prev + 1);
        }).then(unlisten => {
             unlistenFin = unlisten;
        });

        return () => {
             if (unlistenFin) unlistenFin();
        };
    }, []);


    const handleAutoBatch = async (fileName: string, group: string) => {
        // Find first batch with < 7 capacity
        let targetBatch = null;
        for (const [bName, bFiles] of Object.entries(batches)) {
            if (bFiles.length < 7) {
                targetBatch = bName;
                break;
            }
        }
        
        let batchFolder = targetBatch;
        // Create new batch if none have space
        if (!batchFolder) {
            const batchKeys = Object.keys(batches);
            let maxBatchNum = 0;
            
            for (const key of batchKeys) {
                const numMatch = key.match(/Batch (\d+)/i);
                if (numMatch && numMatch[1]) {
                    const num = parseInt(numMatch[1], 10);
                    if (num > maxBatchNum) {
                        maxBatchNum = num;
                    }
                }
            }
            batchFolder = `Batch ${maxBatchNum + 1}`;
            await createDirAll(`${outputDir}\\batches\\${batchFolder}`);
        }
        
        const sourceDir = group === "Others" ? `${outputDir}\\final` : `${outputDir}\\final\\${group}`;
        const source = `${sourceDir}\\${fileName}`;
        const dest = `${outputDir}\\batches\\${batchFolder}\\${fileName}`;
        
        try {
            await moveFile(source, dest);
            setTriggerRefetch(prev => prev + 1);
        } catch (err) {
            console.error(err);
            alert("Failed to auto batch file");
        }
    };


    const handleRemoveFromBatch = async (fileName: string, batchName: string) => {
        const source = `${outputDir}\\batches\\${batchName}\\${fileName}`;
        
        const lastUnderscore = fileName.lastIndexOf('_');
        const reconstructedGroup = lastUnderscore > 0 ? fileName.substring(0, lastUnderscore) : "Others";
        const destDir = reconstructedGroup === "Others" ? `${outputDir}\\final` : `${outputDir}\\final\\${reconstructedGroup}`;
        const dest = `${destDir}\\${fileName}`;

        try {
            await createDirAll(destDir);
            await moveFile(source, dest);
            setTriggerRefetch(prev => prev + 1);
        } catch (err) {
            console.error(err);
            alert("Failed to move file back to final folder");
        }
    };

    const handleDeleteBatch = async (batchName: string) => {
        if (!confirm(`Are you sure you want to delete ${batchName}?\nAny videos inside it will be safely returned to Unbatched Clips.`)) {
            return;
        }

        const batchPath = `${outputDir}\\batches\\${batchName}`;
        try {
            await createDirAll(`${outputDir}\\final`);
            
            // Rescue all files back to unbatched logic
            const filesInBatch = batches[batchName] || [];
            for (const file of filesInBatch) {
                const source = `${batchPath}\\${file}`;
                const lastUnderscore = file.lastIndexOf('_');
                const reconstructedGroup = lastUnderscore > 0 ? file.substring(0, lastUnderscore) : "Others";
                const destDir = reconstructedGroup === "Others" ? `${outputDir}\\final` : `${outputDir}\\final\\${reconstructedGroup}`;
                
                await createDirAll(destDir);
                const dest = `${destDir}\\${file}`;
                await moveFile(source, dest);
            }

            // Remove the empty directory
            await removeDirAll(batchPath);
            setTriggerRefetch(prev => prev + 1);
        } catch (err) {
            console.error(err);
            alert(`Failed to delete ${batchName} or move its clips.`);
        }
    };

    const handleRenameFile = async (oldName: string, group: string) => {
        const newNameRaw = editNames[oldName];
        if (newNameRaw === undefined || newNameRaw.trim() === '') return;
        
        // Remove illegal Windows filename characters like | : etc
        let finalNewName = newNameRaw.trim().replace(/[<>:"/\\|?*]/g, '-');
        if (!finalNewName.endsWith('.mp4')) finalNewName += '.mp4';
        if (finalNewName === oldName) return;

        const baseDir = group === "Others" ? `${outputDir}\\final` : `${outputDir}\\final\\${group}`;
        const source = `${baseDir}\\${oldName}`;
        const dest = `${baseDir}\\${finalNewName}`;
        
        try {
            await moveFile(source, dest);
            setTriggerRefetch(prev => prev + 1);
            setEditNames(prev => {
                const updated = { ...prev };
                delete updated[oldName];
                return updated;
            });
        } catch(e) {
            console.error(e);
            alert(`Failed to rename file`);
        }
    };

    const handleArchive = async (fileName: string, group: string) => {
        const sourceDir = group === "Others" ? `${outputDir}\\final` : `${outputDir}\\final\\${group}`;
        const source = `${sourceDir}\\${fileName}`;
        const archiveDir = `${outputDir}\\archived`;
        const dest = `${archiveDir}\\${fileName}`;
        try {
            await createDirAll(archiveDir);
            await moveFile(source, dest);
            setTriggerRefetch(prev => prev + 1);
        } catch (err) {
            console.error(err);
            alert("Failed to archive file");
        }
    };

    return (
        <div className="page-container" style={{ maxWidth: '1200px' }}>
            <header className="header" style={{ marginBottom: "0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <h1>Files & Batches</h1>
                        <p>Curate your generated videos and organize them into upload batches (max 7 per batch).</p>
                    </div>
                </div>
            </header>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
                {/* Generated Unbatched Videos */}
                <div className="card" style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                        <h2>Unbatched Clips</h2>
                        <code style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{outputDir}\final</code>
                    </div>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxHeight: "60vh", overflowY: "auto", paddingRight: "8px" }}>
                        {Object.keys(groupedFiles).length === 0 && (
                            <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
                                No generated clips found. Start the Auto Clipper first.
                            </div>
                        )}
                        {Object.entries(groupedFiles).map(([group, files]) => (
                            <div key={group} style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "16px" }}>
                                <h3 style={{ display: "inline-block", borderBottom: "2px solid var(--border-color)", paddingBottom: "8px", margin: "0", color: "var(--accent)" }}>
                                    📁 {group} <span style={{fontSize: "0.8rem", color: "var(--text-secondary)"}}>({files.length} clips)</span>
                                </h3>
                                
                                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                    {files.map(file => (
                                        <div key={file} style={{ background: "var(--bg-main)", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)", display: "flex", gap: "16px", alignItems: "stretch" }}>
                                            <video 
                                                src={convertFileSrc(group === "Others" ? `${outputDir}\\final\\${file}` : `${outputDir}\\final\\${group}\\${file}`)} 
                                                controls 
                                                preload="metadata" 
                                                style={{ width: "240px", height: "135px", objectFit: "contain", borderRadius: "6px", backgroundColor: "#000", flexShrink: 0 }} 
                                            />
                                            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                                                <div>
                                                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "8px", wordBreak: "break-all" }}>{file}</div>
                                                    <input 
                                                        type="text" 
                                                        value={editNames[file] !== undefined ? editNames[file] : file.replace('.mp4', '')}
                                                        onChange={(e) => setEditNames({...editNames, [file]: e.target.value})}
                                                        onBlur={() => handleRenameFile(file, group)}
                                                        onKeyDown={(e) => { if (e.key === 'Enter') handleRenameFile(file, group); }}
                                                        style={{
                                                            width: "100%", padding: "8px 12px", borderRadius: "4px", border: "1px solid rgba(255,255,255,0.2)",
                                                            background: "rgba(0,0,0,0.2)", color: "#fff", fontFamily: "inherit", fontSize: "0.9rem"
                                                        }}
                                                        placeholder="Rename clip..."
                                                    />
                                                </div>
                                                
                                                <div style={{ display: "flex", gap: "8px", marginTop: "12px", alignItems: "center", flexWrap: "wrap" }}>
                                                    <select
                                                        onChange={(e) => {
                                                            if (e.target.value !== "") {
                                                                setEditNames({...editNames, [file]: e.target.value});
                                                                e.target.value = ""; // reset selection
                                                            }
                                                        }}
                                                        defaultValue=""
                                                        disabled={titleTemplates.every(t => !t)}
                                                        style={{
                                                            padding: '0 12px',
                                                            height: '36px',
                                                            background: 'rgba(107, 76, 255, 0.2)',
                                                            border: '1px solid rgba(107, 76, 255, 0.4)',
                                                            color: 'var(--accent)',
                                                            borderRadius: '4px',
                                                            fontSize: '0.8rem',
                                                            cursor: titleTemplates.every(t => !t) ? 'not-allowed' : 'pointer',
                                                            opacity: titleTemplates.every(t => !t) ? 0.5 : 1,
                                                            outline: 'none',
                                                            flex: 1,
                                                            minWidth: '180px'
                                                        }}
                                                    >
                                                        <option value="" disabled style={{ color: '#000' }}>-- Use Title Template --</option>
                                                        {titleTemplates.map((t, idx) => {
                                                            if (!t) return null;
                                                            return (
                                                                <option key={`title-${idx}`} value={t} style={{ color: '#000' }}>
                                                                    {t.length > 30 ? t.substring(0, 30) + '...' : t}
                                                                </option>
                                                            );
                                                        })}
                                                    </select>

                                                    <button 
                                                        className="text-btn outline-btn" 
                                                        style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", height: "36px", padding: "0 16px", background: "rgba(107, 76, 255, 0.1)", color: "var(--accent)", borderColor: "var(--accent)", whiteSpace: "nowrap", borderRadius: "4px" }}
                                                        onClick={() => handleAutoBatch(file, group)}
                                                    >
                                                        + Auto Batch
                                                    </button>
                                                    <button 
                                                        className="text-btn outline-btn" 
                                                        title="Move to Archived folder (already uploaded)"
                                                        style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", height: "36px", padding: "0 16px", background: "rgba(248, 113, 113, 0.07)", color: "rgba(248, 113, 113, 0.9)", borderColor: "rgba(248, 113, 113, 0.3)", whiteSpace: "nowrap", borderRadius: "4px" }}
                                                        onClick={() => handleArchive(file, group)}
                                                    >
                                                        🗂 Archive
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Batches Configuration */}
                <div className="card" style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ marginBottom: "16px" }}>
                        <h2>Upload Batches</h2>
                    </div>
                    
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "20px", maxHeight: "40vh", overflowY: "auto", paddingRight: "8px", alignItems: "start" }}>
                        {Object.keys(batches).length === 0 && (
                            <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
                                No batches created yet.
                            </div>
                        )}
                        {Object.entries(batches).map(([batchName, files]) => (
                            <div key={batchName} style={{ background: "var(--bg-main)", border: "1px dashed var(--border-color)", padding: "16px", borderRadius: "8px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                                    <h3 style={{ margin: 0, fontSize: "1.1rem" }}>{batchName} <span style={{ fontSize: "0.8rem", color: files.length >= 7 ? "var(--accent)" : "var(--text-secondary)" }}>({files.length}/7 capacity)</span></h3>
                                    <button 
                                        className="text-btn outline-btn" 
                                        style={{ fontSize: "0.75rem", padding: "4px 8px", color: "rgba(248, 113, 113, 0.9)", borderColor: "rgba(248, 113, 113, 0.3)", background: "rgba(248, 113, 113, 0.05)" }}
                                        onClick={() => handleDeleteBatch(batchName)}
                                        title="Delete Batch Permanently"
                                    >
                                        🗑 Delete
                                    </button>
                                </div>
                                {files.length === 0 && <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: 0 }}>Empty batch.</p>}
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                    {files.map(f => (
                                        <div key={f} title={f} style={{ position: "relative", width: "48px", height: "72px", borderRadius: "6px", overflow: "hidden", backgroundColor: "#000", border: "1px solid var(--border-color)", flexShrink: 0 }}>
                                            <video 
                                                src={convertFileSrc(`${outputDir}\\batches\\${batchName}\\${f}`)} 
                                                preload="metadata"
                                                style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "pointer" }} 
                                                onClick={() => setPreviewVideo(`${outputDir}\\batches\\${batchName}\\${f}`)}
                                            />
                                            <button 
                                                title="Return to Unbatched" 
                                                onClick={() => handleRemoveFromBatch(f, batchName)}
                                                style={{ position: "absolute", top: 0, right: 0, background: "rgba(248, 113, 113, 0.9)", color: "white", border: "none", width: "18px", height: "18px", fontSize: "10px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", borderRadius: "0 0 0 4px", padding: 0 }}
                                            >
                                                ✖
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Fullscreen Video Preview Modal */}
            {previewVideo && (
                <div 
                    style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.85)", zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px" }}
                    onClick={() => setPreviewVideo(null)}
                >
                    <div style={{ position: "relative", width: "100%", maxWidth: "800px", display: "flex", flexDirection: "column", gap: "16px" }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <h3 style={{ margin: 0, color: "white", fontSize: "1.2rem", wordBreak: "break-all" }}>{previewVideo.split('\\').pop()}</h3>
                            <button 
                                onClick={() => setPreviewVideo(null)}
                                style={{ background: "transparent", border: "none", color: "white", fontSize: "24px", cursor: "pointer", padding: "8px", lineHeight: 1 }}
                            >
                                ✕
                            </button>
                        </div>
                        <video 
                            src={convertFileSrc(previewVideo)} 
                            controls 
                            autoPlay 
                            style={{ width: "100%", maxHeight: "70vh", backgroundColor: "#000", borderRadius: "8px", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }} 
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
