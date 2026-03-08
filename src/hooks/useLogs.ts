import { useState, useRef, useEffect, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import { LogEntry } from "../types";

export function useLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: 1, type: 'info', message: 'System ready. Waiting for configuration.', time: new Date().toLocaleTimeString() }
  ]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    setLogs(prev => [...prev, {
      id: Date.now() + Math.random(),
      type,
      message,
      time: new Date().toLocaleTimeString()
    }]);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  useEffect(() => {
    const setupListeners = async () => {
      const unlistenLog = await listen<string>('log', (event) => {
        addLog('info', event.payload);
      });
      const unlistenErr = await listen<string>('log_error', (event) => {
        addLog('error', event.payload);
      });

      return () => {
        unlistenLog();
        unlistenErr();
      };
    };

    let cleanup: () => void;
    setupListeners().then(f => cleanup = f);
    return () => { if(cleanup) cleanup(); };
  }, [addLog]);

  return { logs, logsEndRef, addLog, clearLogs };
}
