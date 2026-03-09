import { PLATFORMS } from "../icons/PlatformIcons";

interface GlobalSettingsProps {
  browser: string;
  setBrowser: (browser: string) => void;
  availableBrowsers: string[];
  isRunning: boolean;
  selectedPlatforms: string[];
  togglePlatform: (id: string) => void;
}

export const GlobalSettings = ({
  browser,
  setBrowser,
  availableBrowsers,
  isRunning,
  selectedPlatforms,
  togglePlatform
}: GlobalSettingsProps) => {
  return (
    <div className="card">
        <h2>1. Global Settings</h2>
        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label htmlFor="browser">Browser Selector</label>
          <select 
            id="browser" 
            value={browser} 
            onChange={(e) => setBrowser(e.target.value)}
            disabled={isRunning}
          >
            {availableBrowsers.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label>Target Platforms</label>
          <div className="platforms-grid">
            {PLATFORMS.map(p => (
              <button
                key={p.id}
                className={`toggle-btn ${selectedPlatforms.includes(p.id) ? 'active' : ''}`}
                onClick={() => togglePlatform(p.id)}
                disabled={isRunning}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
    </div>
  );
};
