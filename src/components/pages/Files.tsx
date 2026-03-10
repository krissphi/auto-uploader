import React, { useState, useEffect, useMemo, useCallback, useDeferredValue, memo } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { ask } from "@tauri-apps/plugin-dialog";
import { useStorage } from "../../hooks/useStorage";
import { getDirectoryFiles, getDirectories, moveFile, createDirAll, removeDirAll } from "../../services/fileManager";
import { VideoThumbnail } from "../shared/VideoThumbnail";
import { ArchiveIcon, TrashIcon, FolderIcon } from "../shared/Icons";
import { Button } from "../shared/Button";
import { RefreshButton } from "../shared/RefreshButton";
import { Input, Select } from "../shared/Inputs";

// --- Sub-components to isolate re-renders ---

const UnbatchedClipsList = memo(({ 
    files, 
    selectedClip, 
    outputDir, 
    onSelect 
}: { 
    files: Record<string, string[]>, 
    selectedClip: { file: string; group: string } | null,
    outputDir: string,
    onSelect: (clip: { file: string; group: string } | null) => void
}) => {
    // Stability fix: use a ref to the latest selectedClip to avoid dependency in the callback
    const selectedRef = React.useRef(selectedClip);
    selectedRef.current = selectedClip;

    const handleSelect = useCallback((file: string, group: string) => {
        const current = selectedRef.current;
        const isSelected = current?.file === file && current?.group === group;
        onSelect(isSelected ? null : { file, group });
    }, [onSelect]);

    return (
        <div style={{ flex: 6, minWidth: 0, maxHeight: "70vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px", paddingRight: "4px" }}>
            {Object.keys(files).length === 0 && (
                <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
                    No clips found. Adjust your search or start the Auto Clipper.
                </div>
            )}
            {Object.entries(files).map(([group, groupFiles]) => (
                <div key={group}>
                    <div style={{
                        fontSize: "0.75rem",
                        color: "var(--accent)",
                        fontWeight: 600,
                        marginBottom: "8px",
                        paddingBottom: "4px",
                        borderBottom: "1px solid rgba(29, 185, 84, 0.3)",
                        display: "flex",
                        gap: "6px",
                        alignItems: "center"
                    }}>
                        <FolderIcon size={14} color="var(--accent)" />
                        {group}
                        <span style={{ color: "var(--text-secondary)", fontWeight: 400 }}>({groupFiles.length})</span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {groupFiles.slice(0, 100).map(file => (
                            <ThumbnailWrapper
                                key={`${group}/${file}`}
                                file={file}
                                group={group}
                                outputDir={outputDir}
                                isSelected={selectedClip?.file === file && selectedClip?.group === group}
                                onSelect={handleSelect}
                            />
                        ))}
                        {groupFiles.length > 100 && (
                            <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", alignSelf: "center", padding: "10px" }}>
                                ...and {groupFiles.length - 100} more.
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
});

// Extra wrapper to keep VideoThumbnail key stable and handler stable
const ThumbnailWrapper = memo(({ file, group, outputDir, isSelected, onSelect }: any) => {
    const handleClick = useCallback(() => onSelect(file, group), [file, group, onSelect]);
    const filePath = group === "Others"
        ? `${outputDir}\\final\\${file}`
        : `${outputDir}\\final\\${group}\\${file}`;

    return (
        <VideoThumbnail
            filePath={filePath}
            label={file}
            selected={isSelected}
            onClick={handleClick}
        />
    );
});

const ClipDetailPanel = memo(({ 
    selectedClip, 
    outputDir, 
    titleTemplates,
    onRename,
    onAutoBatch,
    onArchive
}: { 
    selectedClip: { file: string; group: string }, 
    outputDir: string,
    titleTemplates: string[],
    onRename: (oldName: string, group: string, newName: string) => void,
    onAutoBatch: (file: string, group: string) => void,
    onArchive: (file: string, group: string) => void
}) => {
    // Local state for the input to avoid parent re-renders while typing
    const [localName, setLocalName] = useState(selectedClip.file.replace('.mp4', ''));

    useEffect(() => {
        setLocalName(selectedClip.file.replace('.mp4', ''));
    }, [selectedClip.file]);

    const selectedFileSrc = convertFileSrc(selectedClip.group === "Others"
        ? `${outputDir}\\final\\${selectedClip.file}`
        : `${outputDir}\\final\\${selectedClip.group}\\${selectedClip.file}`);

    return (
        <div style={{
            flex: 4,
            minWidth: 0,
            background: "var(--bg-main)",
            border: "1px solid var(--border-color)",
            borderRadius: 0,
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "12px"
        }}>
            <video
                key={selectedFileSrc}
                src={selectedFileSrc}
                controls
                autoPlay
                preload="auto"
                style={{ width: "100%", maxHeight: "260px", borderRadius: "6px", backgroundColor: "#000", objectFit: "contain" }}
            />

            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", wordBreak: "break-all", display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FolderIcon size={12} />
                {selectedClip.group !== "Others" ? `${selectedClip.group}/` : ""}{selectedClip.file}
            </div>

            <Input
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                onBlur={() => onRename(selectedClip.file, selectedClip.group, localName)}
                onKeyDown={(e) => { if (e.key === 'Enter') onRename(selectedClip.file, selectedClip.group, localName); }}
                style={{ height: '40px', fontSize: '0.9rem' }}
                placeholder="Rename clip..."
            />

            <Select
                onChange={(e) => {
                    if (e.target.value !== "") {
                        setLocalName(e.target.value);
                        onRename(selectedClip.file, selectedClip.group, e.target.value);
                        e.target.value = "";
                    }
                }}
                defaultValue=""
                disabled={titleTemplates.every(t => !t)}
                options={[
                    { value: "", label: "-- Use Title Template --", disabled: true },
                    ...titleTemplates.map((t) => ({
                        value: t,
                        label: t && t.length > 40 ? t.substring(0, 40) + '...' : t
                    })).filter(o => o.value)
                ]}
                style={{ height: '40px', fontSize: '0.85rem' }}
            />

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <Button
                    variant="outline"
                    style={{ flex: 1, whiteSpace: "nowrap", height: "36px", color: 'var(--accent)', borderColor: 'var(--accent)', background: 'rgba(29, 185, 84, 0.1)' }}
                    onClick={() => onAutoBatch(selectedClip.file, selectedClip.group)}
                >
                    + Auto Batch
                </Button>
                <Button
                    variant="ghost-danger"
                    title="Move to Archived folder (already uploaded)"
                    style={{ flex: 1, whiteSpace: "nowrap", height: "36px" }}
                    onClick={() => onArchive(selectedClip.file, selectedClip.group)}
                >
                    <ArchiveIcon size={14} color="currentColor" />
                    Archive
                </Button>
            </div>
        </div>
    );
});

const BatchList = memo(({ 
    batches, 
    outputDir, 
    onDeleteBatch, 
    onRemoveFromBatch, 
    onPreview 
}: { 
    batches: Record<string, string[]>, 
    outputDir: string,
    onDeleteBatch: (name: string) => void,
    onRemoveFromBatch: (file: string, batch: string) => void,
    onPreview: (path: string) => void
}) => {
    return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "20px", maxHeight: "40vh", overflowY: "auto", paddingRight: "8px", alignItems: "start" }}>
            {Object.keys(batches).length === 0 && (
                <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
                    No batches created yet.
                </div>
            )}
            {Object.entries(batches).map(([batchName, files]) => (
                <div key={batchName} style={{ background: "var(--bg-main)", border: "1px dashed var(--border-color)", padding: "16px", borderRadius: "0px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                        <h3 style={{ margin: 0, fontSize: "1.1rem" }}>{batchName} <span style={{ fontSize: "0.8rem", color: files.length >= 7 ? "var(--accent)" : "var(--text-secondary)" }}>({files.length}/7 capacity)</span></h3>
                        <Button 
                            variant="ghost-danger"
                            onClick={() => onDeleteBatch(batchName)}
                            title="Delete Batch Permanently"
                            style={{ height: '28px', padding: '0 8px', fontSize: '0.75rem' }}
                        >
                            <TrashIcon size={12} color="currentColor" />
                            Delete
                        </Button>
                    </div>
                    {files.length === 0 && <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: 0 }}>Empty batch.</p>}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {files.map(f => (
                            <div key={f} style={{ position: "relative", flexShrink: 0 }}>
                                <VideoThumbnail
                                    filePath={`${outputDir}\\batches\\${batchName}\\${f}`}
                                    label={f}
                                    onClick={() => onPreview(`${outputDir}\\batches\\${batchName}\\${f}`)}
                                />
                                <button
                                    title="Return to Unbatched"
                                    onClick={() => onRemoveFromBatch(f, batchName)}
                                    style={{ position: "absolute", top: 0, right: 0, background: "rgba(248, 113, 113, 0.9)", color: "white", border: "none", width: "18px", height: "18px", fontSize: "10px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", borderRadius: "0 0 0 4px", padding: 0, zIndex: 1 }}
                                >
                                    ✖
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
});

// --- Main Page Component ---

export const FilesPage = () => {
    const [outputDir] = useStorage("output_dir", "Output");
    
    const [groupedFiles, setGroupedFiles] = useState<Record<string, string[]>>({});
    const [batches, setBatches] = useState<Record<string, string[]>>({});
    
    const [triggerRefetch, setTriggerRefetch] = useState(0);
    const [isFetching, setIsFetching] = useState(false);

    const [searchTerm, setSearchTerm] = useState("");
    const deferredSearchTerm = useDeferredValue(searchTerm); // Keep UI responsive while typing
    
    const [previewVideo, setPreviewVideo] = useState<string | null>(null);
    const [selectedClip, setSelectedClip] = useState<{ file: string; group: string } | null>(null);

    const [titleTemplates] = useStorage<string[]>("saved_title_templates", [""], ["saved_title_template"]);

    useEffect(() => {
        const fetchFiles = async () => {
            if (!outputDir) return;
            setIsFetching(true);
            
            try {
                const finalPath = `${outputDir}\\final`;
                await createDirAll(finalPath).catch(() => {});
                const finalDirs = await getDirectories(finalPath);
                
                const finalMap: Record<string, string[]> = {};
                
                const folderPromises = finalDirs.map(async (d) => {
                    try {
                        const filesInDir = await getDirectoryFiles(`${finalPath}\\${d}`);
                        if (filesInDir.length > 0) {
                            finalMap[d] = filesInDir;
                        }
                    } catch (e) {
                        console.error(`Failed to scan folder ${d}`, e);
                    }
                });

                const looseFilesPromise = (async () => {
                    try {
                        const looseFiles = await getDirectoryFiles(finalPath);
                        if (looseFiles.length > 0) {
                            finalMap["Others"] = looseFiles;
                        }
                    } catch (e) {
                        console.error(`Failed to scan base folder`, e);
                    }
                })();

                await Promise.all([...folderPromises, looseFilesPromise]);
                setGroupedFiles(finalMap);
                
                const batchesPath = `${outputDir}\\batches`;
                await createDirAll(batchesPath).catch(() => {});
                const batchDirs = await getDirectories(batchesPath);
                
                const batchMap: Record<string, string[]> = {};
                await Promise.all(batchDirs.map(async (d) => {
                    try {
                        const filesInBatch = await getDirectoryFiles(`${batchesPath}\\${d}`);
                        batchMap[d] = filesInBatch;
                    } catch (e) {
                        console.error(`Failed to scan batch ${d}`, e);
                    }
                }));
                
                setBatches(batchMap);
                
            } catch (err) {
                console.error("Failed to read file tree", err);
            } finally {
                setIsFetching(false);
            }
        };
        fetchFiles();
    }, [outputDir, triggerRefetch]);

    useEffect(() => {
        let unlistenFin: () => void;
        listen<string>('clipper_finished', () => {
             setTriggerRefetch(prev => prev + 1);
        }).then(unlisten => {
             unlistenFin = unlisten;
        });
        return () => { if (unlistenFin) unlistenFin(); };
    }, []);

    const handleAutoBatch = useCallback(async (fileName: string, group: string) => {
        let targetBatch = null;
        for (const [bName, bFiles] of Object.entries(batches)) {
            if (bFiles.length < 7) {
                targetBatch = bName;
                break;
            }
        }
        
        let batchFolder = targetBatch;
        if (!batchFolder) {
            const batchKeys = Object.keys(batches);
            let maxBatchNum = 0;
            for (const key of batchKeys) {
                const numMatch = key.match(/Batch (\d+)/i);
                if (numMatch && numMatch[1]) {
                    const num = parseInt(numMatch[1], 10);
                    if (num > maxBatchNum) maxBatchNum = num;
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
            setSelectedClip(null);
        } catch (err) {
            console.error(err);
            alert("Failed to auto batch file");
        }
    }, [batches, outputDir]);

    const handleRemoveFromBatch = useCallback(async (fileName: string, batchName: string) => {
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
    }, [outputDir]);

    const handleDeleteBatch = useCallback(async (batchName: string) => {
        const confirmed = await ask(`Are you sure you want to delete ${batchName}?\nAny videos inside it will be safely returned to Unbatched Clips.`, {
            title: "KlipKlop v2",
            kind: "warning",
        });
        if (!confirmed) return;

        const batchPath = `${outputDir}\\batches\\${batchName}`;
        try {
            await createDirAll(`${outputDir}\\final`);
            const filesInBatch = batches[batchName] || [];
            for (const file of filesInBatch) {
                const source = `${batchPath}\\${file}`;
                const lastUnderscore = file.lastIndexOf('_');
                const reconstructedGroup = lastUnderscore > 0 ? file.substring(0, lastUnderscore) : "Others";
                const destDir = reconstructedGroup === "Others" ? `${outputDir}\\final` : `${outputDir}\\final\\${reconstructedGroup}`;
                await createDirAll(destDir);
                await moveFile(source, `${destDir}\\${file}`);
            }
            await removeDirAll(batchPath);
            setTriggerRefetch(prev => prev + 1);
        } catch (err) {
            console.error(err);
            alert(`Failed to delete ${batchName}`);
        }
    }, [batches, outputDir]);

    const handleRenameFile = useCallback(async (oldName: string, group: string, newNameRaw: string) => {
        if (!newNameRaw || newNameRaw.trim() === '') return;
        
        let finalNewName = newNameRaw.trim().replace(/[<>:"/\\|?*]/g, '-');
        if (!finalNewName.endsWith('.mp4')) finalNewName += '.mp4';
        if (finalNewName === oldName) return;

        const baseDir = group === "Others" ? `${outputDir}\\final` : `${outputDir}\\final\\${group}`;
        try {
            await moveFile(`${baseDir}\\${oldName}`, `${baseDir}\\${finalNewName}`);
            setTriggerRefetch(prev => prev + 1);
            setSelectedClip(prev => prev && prev.file === oldName ? { ...prev, file: finalNewName } : prev);
        } catch(e) {
            console.error(e);
            alert(`Failed to rename file`);
        }
    }, [outputDir]);

    const handleArchive = useCallback(async (fileName: string, group: string) => {
        const sourceDir = group === "Others" ? `${outputDir}\\final` : `${outputDir}\\final\\${group}`;
        const archiveDir = `${outputDir}\\archived`;
        try {
            await createDirAll(archiveDir);
            await moveFile(`${sourceDir}\\${fileName}`, `${archiveDir}\\${fileName}`);
            setTriggerRefetch(prev => prev + 1);
            setSelectedClip(null);
        } catch (err) {
            console.error(err);
            alert("Failed to archive file");
        }
    }, [outputDir]);

    const filteredGroupedFiles = useMemo(() => {
        if (!deferredSearchTerm) return groupedFiles;
        const lowerSearch = deferredSearchTerm.toLowerCase();
        const next: Record<string, string[]> = {};
        for (const [group, files] of Object.entries(groupedFiles)) {
            const matches = files.filter(f => f.toLowerCase().includes(lowerSearch) || group.toLowerCase().includes(lowerSearch));
            if (matches.length > 0) next[group] = matches;
        }
        return next;
    }, [groupedFiles, deferredSearchTerm]);

    return (
        <div className="page-container" style={{ maxWidth: '1200px' }}>
            <header className="header" style={{ marginBottom: "0" }}>
                <h1>Files &amp; Batches</h1>
                <p>Curate your generated videos and organize them into upload batches (max 7 per batch).</p>
            </header>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
                <div className="card" style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", gap: "20px" }}>
                        <h2 style={{ margin: 0, whiteSpace: "nowrap" }}>Unbatched Clips</h2>
                        
                        <div style={{ flex: 1, position: "relative" }}>
                             <input 
                                type="text"
                                placeholder="Search by filename or folder..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    width: "100%",
                                    height: "40px",
                                    fontSize: "0.85rem",
                                    padding: "0 12px",
                                    borderRadius: 0,
                                    border: "1px solid var(--border-color)",
                                    background: "rgba(0,0,0,0.2)",
                                    color: "var(--text-primary)"
                                }}
                             />
                             {searchTerm && (
                                 <button onClick={() => setSearchTerm("")} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "14px" }}>✕</button>
                             )}
                        </div>

                        <RefreshButton 
                            onClick={() => setTriggerRefetch(prev => prev + 1)}
                            isRefreshing={isFetching}
                            title="Refresh file list"
                            style={{ width: '40px', height: '40px' }}
                        />
                    </div>

                    <div style={{ display: "flex", gap: "20px", alignItems: "stretch", width: "100%", overflow: "hidden" }}>
                        <UnbatchedClipsList 
                            files={filteredGroupedFiles} 
                            selectedClip={selectedClip} 
                            outputDir={outputDir} 
                            onSelect={setSelectedClip}
                        />

                        {selectedClip ? (
                            <ClipDetailPanel 
                                selectedClip={selectedClip}
                                outputDir={outputDir}
                                titleTemplates={titleTemplates}
                                onRename={handleRenameFile}
                                onAutoBatch={handleAutoBatch}
                                onArchive={handleArchive}
                            />
                        ) : Object.keys(groupedFiles).length > 0 && (
                            <div style={{ flex: 4, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", fontSize: "0.9rem", border: "1px dashed rgba(255,255,255,0.1)", minHeight: "200px" }}>
                                👆 Click a thumbnail to preview &amp; manage
                            </div>
                        )}
                    </div>
                </div>

                <div className="card" style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ marginBottom: "16px" }}>
                        <h2>Upload Batches</h2>
                    </div>
                    <BatchList 
                        batches={batches}
                        outputDir={outputDir}
                        onDeleteBatch={handleDeleteBatch}
                        onRemoveFromBatch={handleRemoveFromBatch}
                        onPreview={setPreviewVideo}
                    />
                </div>
            </div>

            {previewVideo && (
                <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.85)", zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px" }} onClick={() => setPreviewVideo(null)}>
                    <div style={{ position: "relative", width: "100%", maxWidth: "800px", display: "flex", flexDirection: "column", gap: "16px" }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <h3 style={{ margin: 0, color: "white", fontSize: "1.2rem", wordBreak: "break-all" }}>{previewVideo.split('\\').pop()}</h3>
                            <button onClick={() => setPreviewVideo(null)} style={{ background: "transparent", border: "none", color: "white", fontSize: "24px", cursor: "pointer", padding: "8px", lineHeight: 1 }}>✕</button>
                        </div>
                        <video src={convertFileSrc(previewVideo)} controls autoPlay style={{ width: "100%", maxHeight: "70vh", backgroundColor: "#000", borderRadius: "8px", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }} />
                    </div>
                </div>
            )}
        </div>
    );
};
