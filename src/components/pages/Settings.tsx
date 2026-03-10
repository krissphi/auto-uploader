
import { useStorage } from "../../hooks/useStorage";
import { open } from "@tauri-apps/plugin-dialog";

export const SettingsPage = () => {
    const [ytDlpPath, setYtDlpPath] = useStorage("yt_dlp_path", "yt-dlp");
    const [ffmpegPath, setFfmpegPath] = useStorage("ffmpeg_path", "ffmpeg");
    const [outputDir, setOutputDir] = useStorage("output_dir", "Output");

    // Templates
    const [titleTemplates, setTitleTemplates] = useStorage<string[]>("saved_title_templates", [""], ["saved_title_template"]);
    const [tagTemplates, setTagTemplates] = useStorage<string[]>("saved_tag_templates", [""], ["saved_upload_tags"]);
    
    const handleTitleTemplateChange = (index: number, value: string) => {
        const newTemplates = [...titleTemplates];
        newTemplates[index] = value;
        setTitleTemplates(newTemplates);
    };

    const addTitleTemplate = () => setTitleTemplates([...titleTemplates, ""]);

    const removeTitleTemplate = (index: number) => {
        const newTemplates = titleTemplates.filter((_, i) => i !== index);
        if (newTemplates.length === 0) newTemplates.push("");
        setTitleTemplates(newTemplates);
    };

    const handleTagTemplateChange = (index: number, value: string) => {
        const newTemplates = [...tagTemplates];
        newTemplates[index] = value;
        setTagTemplates(newTemplates);
    };

    const addTagTemplate = () => setTagTemplates([...tagTemplates, ""]);

    const removeTagTemplate = (index: number) => {
        const newTemplates = tagTemplates.filter((_, i) => i !== index);
        if (newTemplates.length === 0) newTemplates.push("");
        setTagTemplates(newTemplates);
    };

    const selectExecutable = async (setter: (v: string) => void) => {
        try {
            const selected = await open({
                multiple: false,
                directory: false,
            });
            if (typeof selected === "string") {
                setter(selected);
            }
        } catch (e) {
            console.error("Failed to select executable", e);
        }
    };

    const selectDirectory = async (setter: (v: string) => void) => {
        try {
            const selected = await open({
                multiple: false,
                directory: true,
            });
            if (typeof selected === "string") {
                setter(selected);
            }
        } catch (e) {
            console.error("Failed to select dir", e);
        }
    };

    return (
        <div className="page-container">
            <header className="header" style={{ marginBottom: 0 }}>
                <h1>Settings</h1>
                <p>Configure CLI tools and application preferences</p>
            </header>
            
            <div className="card">
                 <h2>Auto Clipper Paths</h2>
                 <p style={{ color: "var(--text-secondary)", marginBottom: "20px" }}>
                    Provide the absolute paths to the yt-dlp and ffmpeg executables if they are not available in your system's PATH.
                 </p>

                 <div className="form-group">
                     <label>YT-DLP Executable Path</label>
                     <div style={{ display: "flex", gap: "10px" }}>
                        <input 
                            type="text" 
                            style={{ flex: 1, padding: "10px", borderRadius: "0px", border: "1px solid var(--border-color)", background: "var(--bg-main)", color: "var(--text-primary)" }}
                            value={ytDlpPath}
                            onChange={(e) => setYtDlpPath(e.target.value)}
                            placeholder="e.g. C:\tools\yt-dlp.exe or just yt-dlp"
                        />
                        <button className="outline-btn" style={{ padding: "0 16px" }} onClick={() => selectExecutable(setYtDlpPath)}>Browse</button>
                     </div>
                 </div>

                 <div className="form-group" style={{ marginTop: "16px" }}>
                     <label>FFMPEG Executable Path</label>
                     <div style={{ display: "flex", gap: "10px" }}>
                        <input 
                            type="text" 
                            style={{ flex: 1, padding: "10px", borderRadius: "0px", border: "1px solid var(--border-color)", background: "var(--bg-main)", color: "var(--text-primary)" }}
                            value={ffmpegPath}
                            onChange={(e) => setFfmpegPath(e.target.value)}
                            placeholder="e.g. C:\tools\ffmpeg\bin\ffmpeg.exe or just ffmpeg"
                        />
                        <button className="outline-btn" style={{ padding: "0 16px" }} onClick={() => selectExecutable(setFfmpegPath)}>Browse</button>
                     </div>
                 </div>

                 <div className="form-group" style={{ marginTop: "16px" }}>
                     <label>Output Directory</label>
                     <div style={{ display: "flex", gap: "10px" }}>
                        <input 
                            type="text" 
                            style={{ flex: 1, padding: "10px", borderRadius: "0px", border: "1px solid var(--border-color)", background: "var(--bg-main)", color: "var(--text-primary)" }}
                            value={outputDir}
                            onChange={(e) => setOutputDir(e.target.value)}
                            placeholder="e.g. Output (relative) or C:\Clips (absolute)"
                        />
                        <button className="outline-btn" style={{ padding: "0 16px" }} onClick={() => selectDirectory(setOutputDir)}>Browse</button>
                     </div>
                     <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "8px" }}>
                         Generated files will be stored in this directory.
                     </p>
                 </div>
            </div>

            <div className="card" style={{ marginTop: "24px" }}>
                <h2>Upload Metadata Templates</h2>
                <p style={{ color: "var(--text-secondary)", marginBottom: "20px" }}>
                    Configure the global title and tag templates used by the Uploader.
                 </p>
                 
                 <div className="form-group" style={{ marginTop: '16px' }}>
                     <label>Global Title Templates ({titleTemplates.filter(t => t.trim()).length} saved)</label>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                     {titleTemplates.map((template, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                            type="text"
                            placeholder="e.g. Tutorial Lengkap Part 1 #tutorial"
                            value={template}
                            onChange={(e) => handleTitleTemplateChange(idx, e.target.value)}
                            style={{
                                flex: 1, padding: '10px 12px', borderRadius: 0,
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                background: 'rgba(0, 0, 0, 0.2)', color: '#fff', fontFamily: 'inherit', fontSize: '0.9rem'
                            }}
                        />
                        <button 
                            onClick={() => removeTitleTemplate(idx)} 
                            disabled={titleTemplates.length === 1 && !template}
                            style={{
                                background: 'transparent', border: 'none', color: 'var(--danger)',
                                cursor: (titleTemplates.length === 1 && !template) ? 'not-allowed' : 'pointer',
                                opacity: (titleTemplates.length === 1 && !template) ? 0.5 : 1, padding: '8px'
                            }}
                            title="Remove template"
                        >
                            ✕
                        </button>
                        </div>
                     ))}
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button
                        onClick={addTitleTemplate}
                        style={{
                            background: 'rgba(29, 185, 84, 0.1)', border: '1px dashed var(--accent)', color: 'var(--accent)',
                            padding: '8px', borderRadius: 0, cursor: 'pointer', fontSize: '0.9rem', width: 'fit-content'
                        }}
                        >
                        + Add Another Template
                        </button>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Auto-saved, reusable for each video.</span>
                     </div>
                     </div>
                 </div>

                 <div className="form-group" style={{ marginTop: '32px' }}>
                     <label>Global Tag Templates ({tagTemplates.filter(t => t.trim()).length} saved)</label>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                     {tagTemplates.map((template, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <textarea
                            placeholder="e.g. gaming, funny, viral, fyp"
                            value={template}
                            onChange={(e) => handleTagTemplateChange(idx, e.target.value)}
                            style={{
                                flex: 1, padding: '10px 12px', borderRadius: 0,
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                background: 'rgba(0, 0, 0, 0.2)', color: '#fff', fontFamily: 'inherit', fontSize: '0.9rem',
                                minHeight: '60px', resize: 'vertical'
                            }}
                        />
                        <button 
                            onClick={() => removeTagTemplate(idx)} 
                            disabled={tagTemplates.length === 1 && !template}
                            style={{
                                background: 'transparent', border: 'none', color: 'var(--danger)',
                                cursor: (tagTemplates.length === 1 && !template) ? 'not-allowed' : 'pointer',
                                opacity: (tagTemplates.length === 1 && !template) ? 0.5 : 1, padding: '8px', marginTop: '4px'
                            }}
                            title="Remove template"
                        >
                            ✕
                        </button>
                        </div>
                     ))}
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button
                        onClick={addTagTemplate}
                        style={{
                            background: 'rgba(29, 185, 84, 0.1)', border: '1px dashed var(--accent)', color: 'var(--accent)',
                            padding: '8px', borderRadius: 0, cursor: 'pointer', fontSize: '0.9rem', width: 'fit-content'
                        }}
                        >
                        + Add Another Tag Template
                        </button>
                     </div>
                     </div>
                 </div>
            </div>
        </div>
    );
};
