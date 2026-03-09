import { useState, useRef, useEffect, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import { LogEntry } from "../types";

export function useLogs(onFinished?: () => void) {
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
    let isMounted = true;
    let unlistenLog: () => void;
    let unlistenErr: () => void;
    let unlistenFin: () => void;
    let unlistenAutoFin: () => void;

    listen<string>('log', (event) => {
      addLog('info', event.payload);
    }).then(unlisten => {
      if (!isMounted) unlisten();
      else unlistenLog = unlisten;
    });

    listen<string>('log_error', (event) => {
      addLog('error', event.payload);
    }).then(unlisten => {
      if (!isMounted) unlisten();
      else unlistenErr = unlisten;
    });

    listen<string>('clipper_finished', () => {
      if (onFinished) onFinished();
    }).then(unlisten => {
      if (!isMounted) unlisten();
      else unlistenFin = unlisten;
    });

    listen<string>('automation_finished', () => {
      if (onFinished) onFinished();
    }).then(unlisten => {
      if (!isMounted) unlisten();
      else unlistenAutoFin = unlisten;
    });

    return () => {
      isMounted = false;
      if (unlistenLog) unlistenLog();
      if (unlistenErr) unlistenErr();
      if (unlistenFin) unlistenFin();
      if (unlistenAutoFin) unlistenAutoFin();
    };
  }, [addLog, onFinished]);

  return { logs, logsEndRef, addLog, clearLogs };
}
