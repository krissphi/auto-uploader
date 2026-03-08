import { LogEntry } from "../../types";
import { RefObject } from "react";

interface LogConsoleProps {
  logs: LogEntry[];
  logsEndRef: RefObject<HTMLDivElement | null>;
  addLog: (type: LogEntry['type'], msg: string) => void;
  clearLogs: () => void;
}

export const LogConsole = ({ logs, logsEndRef, clearLogs }: LogConsoleProps) => {
  return (
    <div className="logs-panel glass-panel">
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem' }}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 17 10 11 4 5"></polyline>
            <line x1="12" y1="19" x2="20" y2="19"></line>
          </svg>
          Console Output
        </h2>
        <div className="header-actions">
           <button 
             className="text-btn outline-btn" 
             onClick={clearLogs}
             style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
           >
             Clear Logs
           </button>
        </div>
      </div>
      <div className="logs-container">
        {logs.map(log => (
          <div key={log.id} className={`log-item ${log.type}`}>
            <span className="log-time">[{log.time}]</span> 
            <span className="log-msg" style={{ marginLeft: "8px" }}>{log.message}</span>
          </div>
        ))}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
};
