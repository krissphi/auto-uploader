import { useEffect, useRef, useState, memo } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";

interface VideoThumbnailProps {
    /** Absolute path to the video file on disk */
    filePath: string;
    /** Label shown at the bottom of the thumbnail. Defaults to the filename part of filePath. */
    label?: string;
    /** Whether this thumbnail is currently selected */
    selected?: boolean;
    /** Callback when thumbnail is clicked */
    onClick?: () => void;
    /** Width in px. Default: 72 */
    width?: number;
    /** Height in px. Default: 108 */
    height?: number;
}

/**
 * Reusable portrait video thumbnail card with:
 *  - Lazy loading (IntersectionObserver — video is only mounted when near viewport)
 *  - Play / selected overlay
 *  - Filename label at the bottom
 *  - Highlight ring when selected
 */
export const VideoThumbnail = memo(({
    filePath,
    label,
    selected = false,
    onClick,
    width = 72,
    height = 108,
}: VideoThumbnailProps) => {
    const ref = useRef<HTMLDivElement>(null!);
    const [inView, setInView] = useState(false);

    useEffect(() => {
        if (inView) return;
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setInView(true);
                    observer.disconnect();
                }
            },
            { rootMargin: "400px" }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [inView]);

    const displayLabel = label ?? filePath.split(/[\\/]/).pop() ?? filePath;

    return (
        <div
            ref={ref}
            title={displayLabel}
            onClick={onClick}
            style={{
                position: "relative",
                width: `${width}px`,
                height: `${height}px`,
                borderRadius: "7px",
                overflow: "hidden",
                backgroundColor: "#111",
                border: selected
                    ? "2px solid var(--accent)"
                    : "1px solid rgba(255,255,255,0.12)",
                flexShrink: 0,
                cursor: onClick ? "pointer" : "default",
                boxShadow: selected
                    ? "0 0 0 2px rgba(107,76,255,0.4)"
                    : "0 2px 6px rgba(0,0,0,0.4)",
                transition: "border-color 0.15s, box-shadow 0.15s",
            }}
        >
            {/* Only mount the <video> once the card is near the viewport */}
            {inView && (
                <video
                    src={convertFileSrc(filePath)}
                    preload="metadata"
                    muted
                    style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        pointerEvents: "none",
                        display: "block",
                    }}
                />
            )}

            {/* Play / selected overlay */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: selected
                        ? "rgba(107,76,255,0.25)"
                        : "rgba(0,0,0,0.28)",
                    transition: "background 0.15s",
                }}
            >
                {selected ? (
                    <span style={{ fontSize: "18px", color: "#fff" }}>✓</span>
                ) : (
                    <span
                        style={{
                            fontSize: "20px",
                            opacity: 0.85,
                            filter: "drop-shadow(0 1px 4px #000)",
                        }}
                    >
                        ▶
                    </span>
                )}
            </div>

            {/* Filename label */}
            <div
                style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: "rgba(0,0,0,0.72)",
                    padding: "3px 5px",
                    fontSize: "8px",
                    color: "#ccc",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                }}
            >
                {displayLabel}
            </div>
        </div>
    );
});
