import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { VideoEntry } from "../types";

export const selectFiles = async (
    currentVideos: VideoEntry[],
    setVideos: (videos: VideoEntry[]) => void, 
    addLog: (type: 'info'|'error'|'warning'|'success', msg: string) => void
) => {
    try {
      const selected = await open({
        multiple: true,
        filters: [{
          name: 'Video',
          extensions: ['mp4', 'mkv', 'webm', 'mov']
        }]
      });
      
      if (Array.isArray(selected)) {
        addLog('info', `Selected ${selected.length} new videos`);
        
        const newVids = selected.map(path => {
          // Fallback simple parsing for Title from file path if necessary
          const title = path.split('\\').pop()?.split('/').pop()?.split('.')[0] || '';
          return { path, title };
        });
        setVideos([...currentVideos, ...newVids]);
      } else if (selected === null) {
        addLog('info', 'File selection cancelled');
      } else if (typeof selected === "string" || selected) {
        const fileStr = String(selected);
        addLog('info', `Selected 1 new video`);
        const title = fileStr.split('\\').pop()?.split('/').pop()?.split('.')[0] || '';
        setVideos([...currentVideos, { path: fileStr, title }]);
      }
    } catch (err: any) {
      addLog('error', `Error selecting files: ${err.message}`);
    }
};

export const runAutomation = async (
  isRunning: boolean,
  setIsRunning: (run: boolean) => void,
  config: any,
  addLog: (type: "info"|"error"|"success"|"warning", msg: string) => void
) => {
    if (isRunning) {
        addLog('warning', "A process is already running...");
        return;
    }

    if (config.videos.length === 0) {
        addLog('error', "No videos loaded. Please Add Videos first.");
        return;
    }
    
    if (config.platforms.length === 0) {
        addLog('error', "No platforms selected. Please toggle at least one platform.");
        return;
    }
    
    setIsRunning(true);
    addLog('info', `Starting upload batch... Target Date: ${config.date}`);
    
    try {
        await invoke('run_playwright', { 
            configJson: JSON.stringify(config) 
        });
        addLog('success', "Batch Automation completed entirely.");
    } catch (err: any) {
        addLog('error', "Automation Failed: " + err);
    } finally {
        setIsRunning(false);
    }
};
