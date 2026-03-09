import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

import { useStorage } from "../../hooks/useStorage";
import { useLogs } from "../../hooks/useLogs";
import { PLATFORMS } from "../icons/PlatformIcons";
import { VideoEntry } from "../../types";
import { selectFiles, runAutomation } from "../../services/tauriCommand";
import { getDirectories, getDirectoryFiles } from "../../services/fileManager";

import { GlobalSettings } from "../layout/GlobalSettings";
import { VideoQueue } from "../layout/VideoQueue";
import { ScheduleSettings } from "../layout/ScheduleSettings";
import { LogConsole } from "../layout/LogConsole";

const DEFAULT_TIMES = ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'];
const AVAILABLE_BROWSERS = ["Brave", "Chrome", "Edge"];

export const AutoUploader = () => {
  const [browser, setBrowser] = useState("Brave");
  const [videos, setVideos] = useState<VideoEntry[]>([]);
  
  const [selectedPlatforms, setSelectedPlatforms] = useStorage<string[]>(
    "saved_platforms", 
    PLATFORMS.map(p => p.id)
  );

  const [selectedTimes, setSelectedTimes] = useState<string[]>(DEFAULT_TIMES);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedTagTemplate, setSelectedTagTemplate] = useState<string>("");
  
  const [isRunning, setIsRunning] = useState(false);
  const [isSetup, setIsSetup] = useState<boolean | null>(null); // null=checking, false=not ready, true=ready

  const { logs, logsEndRef, addLog, clearLogs } = useLogs(() => setIsRunning(false));

  const [outputDir] = useStorage("output_dir", "Output");
  const [availableBatches, setAvailableBatches] = useState<string[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>("");

  useEffect(() => {
    // Sync isRunning state with actual Tauri backend on component mount
    invoke<boolean>('check_running').then(setIsRunning).catch(console.error);
    // Check if playwright-core is installed
    invoke<boolean>('check_automation_setup').then(setIsSetup).catch(() => setIsSetup(false));
  }, []);

  useEffect(() => {
    const unlisten = listen('setup_finished', () => {
      setIsSetup(true);
      setIsRunning(false);
    });
    return () => { unlisten.then(f => f()); };
  }, []);

  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const batchesPath = `${outputDir}\\batches`;
        const dirs = await getDirectories(batchesPath);
        setAvailableBatches(dirs);
      } catch (err) {
        console.error("No batches directory yet:", err);
      }
    };
    if (outputDir) {
      fetchBatches();
    }
  }, [outputDir]);

  const handleLoadBatch = async () => {
    if (!selectedBatch) return;
    try {
      const batchedFiles = await getDirectoryFiles(`${outputDir}\\batches\\${selectedBatch}`);
      if (batchedFiles.length === 0) {
        addLog("warning", `Batch ${selectedBatch} is empty.`);
        return;
      }
      
      const newVideos = batchedFiles.map(file => ({
         path: `${outputDir}\\batches\\${selectedBatch}\\${file}`,
         title: file.replace('.mp4', ''),
         tags: ''
      }));

      // Combine with existing videos or overwrite? Let's overwrite for simplicity
      setVideos(newVideos);
      addLog("success", `Loaded ${newVideos.length} videos from ${selectedBatch}. Note: videos will be moved to archive automatically after upload.`);
    } catch (err) {
      addLog("error", "Failed to load batch: " + err);
    }
  };


  const togglePlatform = (id: string) => {
    if (selectedPlatforms.includes(id)) {
      setSelectedPlatforms(selectedPlatforms.filter(p => p !== id));
    } else {
      setSelectedPlatforms([...selectedPlatforms, id]);
    }
  };

  const toggleTime = (time: string) => {
    setSelectedTimes(prev => 
      prev.includes(time) ? prev.filter(t => t !== time) : [...prev, time].sort()
    );
  };

  const handleSelectVideos = () => {
    selectFiles(videos, setVideos, addLog as any);
  };

  const removeVideo = (index: number) => {
    setVideos(prev => prev.filter((_, i) => i !== index));
  };

  const updateVideoTitle = (index: number, title: string) => {
    setVideos(prev => {
      const newVideos = [...prev];
      newVideos[index] = { ...newVideos[index], title };
      return newVideos;
    });
  };

  const startSetup = async () => {
    setIsRunning(true);
    clearLogs();
    addLog('info', 'Installing automation dependencies via pnpm install...');
    addLog('info', 'This may take a few minutes on first run. Please wait.');
    try {
      await invoke('setup_automation');
      addLog('success', 'Installation started. Waiting for completion...');
    } catch (err: any) {
      addLog('error', 'Setup failed: ' + err);
      setIsRunning(false);
    }
  };

  const startAutomation = async () => {
    if (videos.length === 0) {
      addLog('warning', 'Please add at least one video to upload.');
      return;
    }
    if (selectedPlatforms.length === 0) {
      addLog('warning', 'Please select at least one platform.');
      return;
    }
    if (selectedTimes.length < videos.length) {
      addLog('warning', `You have ${videos.length} videos but only ${selectedTimes.length} scheduled times selected. It's recommended to have enough times.`);
    }

    const config = {
      browser,
      videos: videos.map(video => ({ ...video, tags: selectedTagTemplate })),
      platforms: selectedPlatforms,
      times: selectedTimes,
      date: selectedDate,
      selectedBatch,
      outputDir
    };

    runAutomation(isRunning, setIsRunning, config, addLog);
  };

  const stopAutomation = async () => {
    addLog('warning', 'Stopping automation...');
    try {
      await invoke("stop_automation");
      setIsRunning(false);
      addLog('success', 'Automation stopped.');
    } catch (error: any) {
       addLog('error', `Failed to stop: ${error}`);
    }
  };

  return (
    <div className="page-container">
      <header className="header">
        <h1>Auto Upload Scheduler</h1>
        <p>Schedule your short videos to YouTube, Instagram, TikTok & Facebook</p>
      </header>
      
      <GlobalSettings 
        browser={browser}
        setBrowser={setBrowser}
        availableBrowsers={AVAILABLE_BROWSERS}
        isRunning={isRunning}
        selectedPlatforms={selectedPlatforms}
        togglePlatform={togglePlatform}
      />

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>Load Curated Batch</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "4px" }}>Select a batch of predefined videos to load into the queue</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              disabled={isRunning || availableBatches.length === 0}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(0, 0, 0, 0.2)',
                color: '#fff',
                fontFamily: 'inherit',
                fontSize: '0.9rem',
                outline: 'none',
                minWidth: '200px'
              }}
            >
              <option value="" disabled>-- Select a batch --</option>
              {availableBatches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <button 
              className="outline-btn" 
              onClick={handleLoadBatch}
              disabled={isRunning || !selectedBatch}
              style={{ padding: '0 16px' }}
            >
               Load
            </button>
          </div>
        </div>
      </div>

      <VideoQueue 
        videos={videos}
        isRunning={isRunning}
        selectVideos={handleSelectVideos}
        removeVideo={removeVideo}
        updateVideoTitle={updateVideoTitle}
        selectedTagTemplate={selectedTagTemplate}
        setSelectedTagTemplate={setSelectedTagTemplate}
      />

      <ScheduleSettings 
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        isRunning={isRunning}
        DEFAULT_TIMES={DEFAULT_TIMES}
        selectedTimes={selectedTimes}
        toggleTime={toggleTime}
      />

      <div className="card">
        <LogConsole 
          logs={logs}
          logsEndRef={logsEndRef}
          addLog={addLog}
          clearLogs={clearLogs}
        />

        <div className="actions" style={{ marginTop: '20px' }}>
          {isSetup === null && (
            <button className="btn-primary" disabled style={{ opacity: 0.6 }}>⏳ Checking setup...</button>
          )}
          {isSetup === false && !isRunning && (
            <button className="btn-primary" onClick={startSetup}>
              ⚙️ Setup Automation
            </button>
          )}
          {isSetup === false && isRunning && (
            <button className="btn-primary" disabled style={{ opacity: 0.7 }}>⏳ Installing playwright-core...</button>
          )}
          {isSetup === true && !isRunning && (
            <button className="btn-primary" onClick={startAutomation}>
              🚀 Start Automation
            </button>
          )}
          {isSetup === true && isRunning && (
            <button className="btn-danger" onClick={stopAutomation}>
              ⏹ Stop Execution
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
