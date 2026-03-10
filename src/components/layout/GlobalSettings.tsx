import { PLATFORMS } from "../icons/PlatformIcons";
import { Card } from "../shared/Card";
import { Select } from "../shared/Inputs";
import { Button } from "../shared/Button";

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
    <Card title="1. Global Settings">
        <Select
          label="Browser Selector"
          value={browser} 
          onChange={(e) => setBrowser(e.target.value)}
          disabled={isRunning}
          options={availableBrowsers.map(b => ({ value: b, label: b }))}
          style={{ marginBottom: '24px' }}
        />
        
        <div className="form-group">
          <label>Target Platforms</label>
          <div className="platforms-grid">
            {PLATFORMS.map(p => (
              <Button
                key={p.id}
                variant="outline"
                className={selectedPlatforms.includes(p.id) ? 'active' : ''}
                onClick={() => togglePlatform(p.id)}
                disabled={isRunning}
              >
                {p.name}
              </Button>
            ))}
          </div>
        </div>
    </Card>
  );
};
