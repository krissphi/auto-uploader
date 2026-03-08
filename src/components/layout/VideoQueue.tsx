import { convertFileSrc } from "@tauri-apps/api/core";
import { VideoEntry } from "../../types";

interface VideoQueueProps {
  videos: VideoEntry[];
  isRunning: boolean;
  selectVideos: () => void;
  removeVideo: (index: number) => void;
  updateVideoTitle: (index: number, title: string) => void;
  titleTemplates: string[];
  selectedTagTemplate: string;
  setSelectedTagTemplate: (val: string) => void;
  tagTemplates: string[];
}

export const VideoQueue = ({
  videos,
  isRunning,
  selectVideos,
  removeVideo,
  updateVideoTitle,
  titleTemplates,
  selectedTagTemplate,
  setSelectedTagTemplate,
  tagTemplates
}: VideoQueueProps) => {
  return (
    <div className="card">
        <h2>2. Videos Queue & Details</h2>
        <div className="form-group">
          <button 
            className="toggle-btn" 
            onClick={selectVideos}
            disabled={isRunning}
            style={{ width: 'fit-content', padding: '0.6rem 1.2rem' }}
          >
            + Add Video Files
          </button>
        </div>
        {videos.length > 0 && (
          <>
            <div className="video-list">
            {videos.map((video, i) => (
              <div key={i} className="video-item" style={{ display: 'flex', flexDirection: 'row', alignItems: 'stretch', gap: '16px' }}>
                <video 
                  src={convertFileSrc(video.path)}
                  controls
                  preload="metadata"
                  style={{
                    width: '240px',
                    height: '135px',
                    objectFit: 'contain',
                    backgroundColor: '#000',
                    borderRadius: '6px',
                    flexShrink: 0
                  }}
                />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <span style={{ wordBreak: 'break-all', paddingRight: '12px', fontSize: '0.8rem', lineHeight: '1.4' }}>
                      {video.path}
                    </span>
                    <button onClick={() => removeVideo(i)} disabled={isRunning}>Remove</button>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <select
                      onChange={(e) => {
                        if (e.target.value !== "") {
                          updateVideoTitle(i, e.target.value);
                          e.target.value = ""; 
                        }
                      }}
                      defaultValue=""
                      disabled={isRunning || titleTemplates.every(t => !t)}
                      style={{
                        padding: '6px 12px',
                        background: 'rgba(107, 76, 255, 0.2)',
                        border: '1px solid rgba(107, 76, 255, 0.4)',
                        color: 'var(--accent)',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        cursor: isRunning || titleTemplates.every(t => !t) ? 'not-allowed' : 'pointer',
                        opacity: isRunning || titleTemplates.every(t => !t) ? 0.5 : 1,
                        outline: 'none',
                        maxWidth: '220px'
                      }}
                    >
                      <option value="" disabled style={{ color: '#000' }}>-- Use Title Template --</option>
                      {titleTemplates.map((t, idx) => {
                        if (!t) return null;
                        return (
                          <option key={`title-${idx}`} value={t} style={{ color: '#000' }}>
                            {t.length > 30 ? t.substring(0, 30) + '...' : t}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <input 
                    type="text"
                    placeholder="Custom video title. Leave empty to use default."
                    value={video.title}
                    onChange={(e) => updateVideoTitle(i, e.target.value)}
                    disabled={isRunning}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '4px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      background: 'rgba(0, 0, 0, 0.2)',
                      color: '#fff',
                      fontFamily: 'inherit',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="form-group" style={{ marginTop: '20px' }}>
            <label>Tags settings (Applies to all videos above)</label>
            <select
              value={selectedTagTemplate}
              onChange={(e) => setSelectedTagTemplate(e.target.value)}
              disabled={isRunning || tagTemplates.every(t => !t)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(0, 0, 0, 0.2)',
                color: '#fff',
                fontFamily: 'inherit',
                fontSize: '0.9rem',
                cursor: isRunning || tagTemplates.every(t => !t) ? 'not-allowed' : 'pointer',
                opacity: isRunning || tagTemplates.every(t => !t) ? 0.5 : 1,
                outline: 'none'
              }}
            >
              <option value="" style={{ color: '#000' }}>-- Select a Global Tag Template to apply --</option>
              {tagTemplates.map((t, idx) => {
                if (!t) return null;
                return (
                  <option key={`tag-${idx}`} value={t} style={{ color: '#000' }}>
                    {t.length > 50 ? t.substring(0, 50) + '...' : t}
                  </option>
                );
              })}
            </select>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Select a tag template from your global settings. These tags will be injected into all the videos.
            </span>
          </div>
          </>
        )}
      </div>
  );
};
