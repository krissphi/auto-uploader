import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

import { useStorage } from "./hooks/useStorage";
import { useLogs } from "./hooks/useLogs";
import { PLATFORMS } from "./components/icons/PlatformIcons";
import { VideoEntry } from "./types";
import { selectFiles, runAutomation } from "./services/tauriCommand";

import { GlobalSettings } from "./components/layout/GlobalSettings";
import { VideoQueue } from "./components/layout/VideoQueue";
import { ScheduleSettings } from "./components/layout/ScheduleSettings";
import { LogConsole } from "./components/layout/LogConsole";

const DEFAULT_TIMES = ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'];
const AVAILABLE_BROWSERS = ["Brave", "Chrome", "Edge"];

function App() {
  const [browser, setBrowser] = useState("Brave");
  const [videos, setVideos] = useState<VideoEntry[]>([]);
  
  const [selectedPlatforms, setSelectedPlatforms] = useStorage<string[]>(
    "saved_platforms", 
    PLATFORMS.map(p => p.id)
  );

  const [selectedTimes, setSelectedTimes] = useState<string[]>(DEFAULT_TIMES);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const [titleTemplates, setTitleTemplates] = useStorage<string[]>("saved_title_templates", [""], ["saved_title_template"]);
  const [tagTemplates, setTagTemplates] = useStorage<string[]>("saved_tag_templates", [""], ["saved_upload_tags"]);
  const [selectedTagTemplate, setSelectedTagTemplate] = useState<string>("");

  const [isRunning, setIsRunning] = useState(false);
  
  // Collapse states for settings
  const [showTitleTemplates, setShowTitleTemplates] = useState(false);
  const [showTagTemplates, setShowTagTemplates] = useState(false);

  const { logs, logsEndRef, addLog, clearLogs } = useLogs();

  const handleTagTemplateChange = (index: number, value: string) => {
    const newTemplates = [...tagTemplates];
    newTemplates[index] = value;
    setTagTemplates(newTemplates);
  };

  const addTagTemplate = () => {
    setTagTemplates([...tagTemplates, ""]);
  };

  const removeTagTemplate = (index: number) => {
    const newTemplates = tagTemplates.filter((_, i) => i !== index);
    if (newTemplates.length === 0) newTemplates.push("");
    setTagTemplates(newTemplates);
  };

  const handleTitleTemplateChange = (index: number, value: string) => {
    const newTemplates = [...titleTemplates];
    newTemplates[index] = value;
    setTitleTemplates(newTemplates);
  };

  const addTitleTemplate = () => {
    setTitleTemplates([...titleTemplates, ""]);
  };

  const removeTitleTemplate = (index: number) => {
    const newTemplates = titleTemplates.filter((_, i) => i !== index);
    if (newTemplates.length === 0) newTemplates.push("");
    setTitleTemplates(newTemplates);
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
      date: selectedDate
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
    <div className="app-container">
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
        showTitleTemplates={showTitleTemplates}
        setShowTitleTemplates={setShowTitleTemplates}
        titleTemplates={titleTemplates}
        handleTitleTemplateChange={handleTitleTemplateChange}
        removeTitleTemplate={removeTitleTemplate}
        addTitleTemplate={addTitleTemplate}
        showTagTemplates={showTagTemplates}
        setShowTagTemplates={setShowTagTemplates}
        tagTemplates={tagTemplates}
        handleTagTemplateChange={handleTagTemplateChange}
        removeTagTemplate={removeTagTemplate}
        addTagTemplate={addTagTemplate}
      />

      <VideoQueue 
        videos={videos}
        isRunning={isRunning}
        selectVideos={handleSelectVideos}
        removeVideo={removeVideo}
        updateVideoTitle={updateVideoTitle}
        titleTemplates={titleTemplates}
        selectedTagTemplate={selectedTagTemplate}
        setSelectedTagTemplate={setSelectedTagTemplate}
        tagTemplates={tagTemplates}
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
          {!isRunning ? (
            <button className="btn-primary" onClick={startAutomation}>
              🚀 Start Automation
            </button>
          ) : (
            <button className="btn-danger" onClick={stopAutomation}>
              ⏹ Stop Execution
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
