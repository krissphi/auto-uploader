import { PLATFORMS } from "../icons/PlatformIcons";

interface GlobalSettingsProps {
  browser: string;
  setBrowser: (browser: string) => void;
  availableBrowsers: string[];
  isRunning: boolean;
  selectedPlatforms: string[];
  togglePlatform: (id: string) => void;
  showTitleTemplates: boolean;
  setShowTitleTemplates: (show: boolean) => void;
  titleTemplates: string[];
  handleTitleTemplateChange: (idx: number, val: string) => void;
  removeTitleTemplate: (idx: number) => void;
  addTitleTemplate: () => void;
  showTagTemplates: boolean;
  setShowTagTemplates: (show: boolean) => void;
  tagTemplates: string[];
  handleTagTemplateChange: (idx: number, val: string) => void;
  removeTagTemplate: (idx: number) => void;
  addTagTemplate: () => void;
}

export const GlobalSettings = ({
  browser,
  setBrowser,
  availableBrowsers,
  isRunning,
  selectedPlatforms,
  togglePlatform,
  showTitleTemplates,
  setShowTitleTemplates,
  titleTemplates,
  handleTitleTemplateChange,
  removeTitleTemplate,
  addTitleTemplate,
  showTagTemplates,
  setShowTagTemplates,
  tagTemplates,
  handleTagTemplateChange,
  removeTagTemplate,
  addTagTemplate
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
        <div className="form-group" style={{ marginTop: '16px' }}>
          <div 
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', padding: '10px 14px', borderRadius: '6px' }}
            onClick={() => setShowTitleTemplates(!showTitleTemplates)}
          >
            <label style={{ margin: 0, cursor: 'pointer' }}>Global Title Templates ({titleTemplates.filter(t => t.trim()).length} saved)</label>
            <span>{showTitleTemplates ? '▼' : '▶'}</span>
          </div>
          
          {showTitleTemplates && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
              {titleTemplates.map((template, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="e.g. Tutorial Lengkap Part 1 #tutorial"
                    value={template}
                    onChange={(e) => handleTitleTemplateChange(idx, e.target.value)}
                    disabled={isRunning}
                    style={{
                       flex: 1,
                       padding: '10px 12px',
                       borderRadius: '6px',
                       border: '1px solid rgba(255, 255, 255, 0.2)',
                       background: 'rgba(0, 0, 0, 0.2)',
                       color: '#fff',
                       fontFamily: 'inherit',
                       fontSize: '0.9rem'
                    }}
                  />
                  <button 
                    onClick={() => removeTitleTemplate(idx)} 
                    disabled={isRunning || (titleTemplates.length === 1 && !template)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--danger)',
                      cursor: (isRunning || (titleTemplates.length === 1 && !template)) ? 'not-allowed' : 'pointer',
                      opacity: (isRunning || (titleTemplates.length === 1 && !template)) ? 0.5 : 1,
                      padding: '8px'
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
                  disabled={isRunning}
                  style={{
                    background: 'rgba(107, 76, 255, 0.1)',
                    border: '1px dashed var(--accent)',
                    color: 'var(--accent)',
                    padding: '8px',
                    borderRadius: '6px',
                    cursor: isRunning ? 'not-allowed' : 'pointer',
                    opacity: isRunning ? 0.5 : 1,
                    fontSize: '0.9rem',
                    width: 'fit-content'
                  }}
                >
                  + Add Another Template
                </button>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Auto-saved, reusable for each video.</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="form-group" style={{ marginTop: '16px' }}>
          <div 
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', padding: '10px 14px', borderRadius: '6px' }}
            onClick={() => setShowTagTemplates(!showTagTemplates)}
          >
            <label style={{ margin: 0, cursor: 'pointer' }}>Global Tag Templates ({tagTemplates.filter(t => t.trim()).length} saved)</label>
            <span>{showTagTemplates ? '▼' : '▶'}</span>
          </div>

          {showTagTemplates && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
              {tagTemplates.map((template, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <textarea
                    placeholder="e.g. gaming, funny, viral, fyp"
                    value={template}
                    onChange={(e) => handleTagTemplateChange(idx, e.target.value)}
                    disabled={isRunning}
                    style={{
                       flex: 1,
                       padding: '10px 12px',
                       borderRadius: '6px',
                       border: '1px solid rgba(255, 255, 255, 0.2)',
                       background: 'rgba(0, 0, 0, 0.2)',
                       color: '#fff',
                       fontFamily: 'inherit',
                       fontSize: '0.9rem',
                       minHeight: '60px',
                       resize: 'vertical'
                    }}
                  />
                  <button 
                    onClick={() => removeTagTemplate(idx)} 
                    disabled={isRunning || (tagTemplates.length === 1 && !template)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--danger)',
                      cursor: (isRunning || (tagTemplates.length === 1 && !template)) ? 'not-allowed' : 'pointer',
                      opacity: (isRunning || (tagTemplates.length === 1 && !template)) ? 0.5 : 1,
                      padding: '8px',
                      marginTop: '4px'
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
                  disabled={isRunning}
                  style={{
                    background: 'rgba(107, 76, 255, 0.1)',
                    border: '1px dashed var(--accent)',
                    color: 'var(--accent)',
                    padding: '8px',
                    borderRadius: '6px',
                    cursor: isRunning ? 'not-allowed' : 'pointer',
                    opacity: isRunning ? 0.5 : 1,
                    fontSize: '0.9rem',
                    width: 'fit-content'
                  }}
                >
                  + Add Another Tag Template
                </button>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Auto-saved, reusable for each video.</span>
              </div>
            </div>
          )}
        </div>
      </div>
  );
};
