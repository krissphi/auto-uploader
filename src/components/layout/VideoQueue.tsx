import { useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { VideoEntry } from "../../types";
import { useStorage } from "../../hooks/useStorage";
import { VideoThumbnail } from "../shared/VideoThumbnail";
import { Card } from "../shared/Card";
import { Button } from "../shared/Button";
import { Input, Select } from "../shared/Inputs";
import { TrashIcon, FolderIcon } from "../shared/Icons";

interface VideoQueueProps {
  videos: VideoEntry[];
  isRunning: boolean;
  selectVideos: () => void;
  removeVideo: (index: number) => void;
  updateVideoTitle: (index: number, title: string) => void;
  selectedTagTemplate: string;
  setSelectedTagTemplate: (val: string) => void;
}

export const VideoQueue = ({
  videos,
  isRunning,
  selectVideos,
  removeVideo,
  updateVideoTitle,
  selectedTagTemplate,
  setSelectedTagTemplate
}: VideoQueueProps) => {
  const [titleTemplates] = useStorage<string[]>("saved_title_templates", [""], ["saved_title_template"]);
  const [tagTemplates] = useStorage<string[]>("saved_tag_templates", [""], ["saved_upload_tags"]);

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  // Keep selection valid after removal
  const safeIdx = selectedIdx !== null && selectedIdx < videos.length ? selectedIdx : null;
  const selectedVideo = safeIdx !== null ? videos[safeIdx] : null;

  return (
    <Card 
      title="2. Videos Queue & Details" 
      headerAction={
        <Button
          variant="outline"
          onClick={selectVideos}
          disabled={isRunning}
          style={{ width: 'fit-content', padding: '0 24px', height: '40px', fontSize: "0.85rem" }}
        >
          + Add Video Files
        </Button>
      }
    >

      {videos.length > 0 && (
        <>
          {/* ── Row 1: horizontal thumbnail strip ── */}
          <div style={{
            display: "flex",
            gap: "8px",
            overflowX: "auto",
            paddingBottom: "8px",
            marginBottom: "16px",
            // subtle scrollbar
            scrollbarWidth: "thin",
          }}>
            {videos.map((video, i) => (
              <VideoThumbnail
                key={i}
                filePath={video.path}
                label={video.path.split(/[\\/]/).pop()}
                selected={safeIdx === i}
                onClick={() => setSelectedIdx(safeIdx === i ? null : i)}
                width={96}
                height={144}
              />
            ))}
          </div>

          {/* ── Row 2: video player (left) + edit panel (right) ── */}
          {selectedVideo !== null && safeIdx !== null ? (
            <div style={{ 
              display: "flex", 
              gap: "24px", 
              width: "100%", 
              overflow: "hidden",
              background: "var(--bg-main)",
              border: "1px solid var(--border-color)",
              padding: "20px",
              boxSizing: "border-box",
              alignItems: "stretch"
            }}>
              {/* Left: video player */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <video
                  key={selectedVideo.path}
                  src={convertFileSrc(selectedVideo.path)}
                  controls
                  autoPlay
                  preload="auto"
                  style={{
                    width: "100%",
                    maxHeight: "260px",
                    borderRadius: "4px",
                    backgroundColor: "#000",
                    objectFit: "contain",
                    display: "block",
                    border: '1px solid rgba(255,255,255,0.05)'
                  }}
                />
              </div>

              {/* Right: edit controls */}
              <div style={{
                flex: 1, 
                minWidth: 0,
                display: "flex", 
                flexDirection: "column", 
                gap: "12px",
                justifyContent: "center"
              }}>
                {/* File path */}
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", wordBreak: "break-all", lineHeight: 1.4, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FolderIcon size={12} />
                  {selectedVideo.path.split(/[\\/]/).pop()}
                </div>

                {/* Custom title input */}
                <Input
                  placeholder="Custom video title..."
                  value={selectedVideo.title}
                  onChange={(e) => updateVideoTitle(safeIdx, e.target.value)}
                  disabled={isRunning}
                  style={{ height: '40px', fontSize: '0.9rem' }}
                />

                {/* Title template dropdown */}
                <Select
                  onChange={(e) => {
                    if (e.target.value !== "") {
                      updateVideoTitle(safeIdx, e.target.value);
                      e.target.value = "";
                    }
                  }}
                  defaultValue=""
                  disabled={isRunning || titleTemplates.every(t => !t)}
                  options={[
                    { value: "", label: "-- Use Title Template --", disabled: true },
                    ...titleTemplates.filter(t => !!t).map(t => ({ 
                      value: t, 
                      label: t.length > 40 ? t.substring(0, 40) + '...' : t 
                    }))
                  ]}
                  style={{
                    height: '40px',
                    fontSize: '0.85rem'
                  }}
                />

                {/* Actions */}
                <div style={{ display: "flex", gap: "8px", marginTop: '8px' }}>
                    <Button
                    variant="ghost-danger"
                    onClick={() => { removeVideo(safeIdx); setSelectedIdx(null); }}
                    disabled={isRunning}
                    style={{
                        flex: 1,
                        height: "40px",
                        padding: "0 10px",
                        textTransform: 'none',
                    }}
                    >
                    <TrashIcon size={14} color="currentColor" />
                    Remove from Queue
                    </Button>
                </div>
              </div>
            </div>
          ) : (
            /* Hint when nothing selected */
            <div style={{
              padding: "32px", textAlign: "center",
              color: "var(--text-secondary)", fontSize: "0.9rem",
              border: "1px dashed #333", borderRadius: "0"
            }}>
              👆 Select a video from the queue to preview & edit
            </div>
          )}

          {/* ── Tags (global — applies to all) ── */}
          <div style={{ marginTop: '32px' }}>
            <Select
              label="Global Tags Settings"
              value={selectedTagTemplate}
              onChange={(e) => setSelectedTagTemplate(e.target.value)}
              disabled={isRunning || tagTemplates.every(t => !t)}
              options={[
                { value: "", label: "-- Select a Global Tag Template to apply --" },
                ...tagTemplates.filter(t => !!t).map(t => ({
                  value: t,
                  label: t.length > 50 ? t.substring(0, 50) + '...' : t
                }))
              ]}
            />
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
              These tags will be injected into all the videos in the queue.
            </p>
          </div>
        </>
      )}
    </Card>
  );
};
