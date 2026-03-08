interface ScheduleSettingsProps {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  isRunning: boolean;
  DEFAULT_TIMES: string[];
  selectedTimes: string[];
  toggleTime: (time: string) => void;
}

export const ScheduleSettings = ({
  selectedDate,
  setSelectedDate,
  isRunning,
  DEFAULT_TIMES,
  selectedTimes,
  toggleTime
}: ScheduleSettingsProps) => {
  return (
    <div className="card">
        <h2>3. Upload Schedule Template</h2>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div className="form-group" style={{ flex: '0 0 auto' }}>
            <label htmlFor="uploadDate">Upload Date</label>
            <input 
              type="date" 
              id="uploadDate" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)}
              disabled={isRunning}
              style={{
                 padding: '10px 12px',
                 borderRadius: '6px',
                 border: '1px solid rgba(255, 255, 255, 0.2)',
                 background: 'rgba(0, 0, 0, 0.2)',
                 color: '#fff',
                 fontFamily: 'inherit',
                 fontSize: '1rem',
                 outline: 'none',
                 cursor: isRunning ? 'not-allowed' : 'pointer',
                 width: 'fit-content'
              }}
            />
          </div>

          <div className="form-group" style={{ flex: '1 1 300px' }}>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>Daily Timeslots</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
                (E.g. 7 timeslots for 7 videos)
              </span>
            </label>
            <div className="times-grid">
              {DEFAULT_TIMES.map(time => (
                <button
                   key={time}
                   className={`toggle-btn ${selectedTimes.includes(time) ? 'active' : ''}`}
                   onClick={() => toggleTime(time)}
                   disabled={isRunning}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
  );
};
