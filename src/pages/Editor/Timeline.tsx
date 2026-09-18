import { useMemo, useRef, useState } from "react";
import type { Project } from "@/types/project";
import { shallow } from "zustand/shallow";
import { useProjectStore } from "@/store/useProjectStore";
import { computeTimelineLayout } from "@/lib/timelineLayout";
import type { Selection } from "./panelTypes";

const SECTION_COLORS: Record<string, string> = {
  intro: "#3b3b46",
  verso: "#6d5bd0",
  coro: "#ec4899",
  puente: "#f59e0b",
  outro: "#3b3b46",
  silencio: "#26262f",
  otro: "#8b8b99",
};

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function Timeline({
  project,
  selection,
  onSelect,
}: {
  project: Project;
  selection: Selection;
  onSelect: (s: Selection) => void;
}) {
  const { reorderScenes, updateScene } = useProjectStore((s) => ({ reorderScenes: s.reorderScenes, updateScene: s.updateScene }), shallow);
  const [pxPerSec, setPxPerSec] = useState(40);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const resizeRef = useRef<{ id: string; startX: number; startDuration: number } | null>(null);

  const layout = useMemo(() => computeTimelineLayout(project.scenes), [project.scenes]);
  const totalDuration = project.song?.analysis?.durationSec ?? layout.reduce((s, l) => s + l.durationSec, 0);
  const totalWidth = Math.max(600, totalDuration * pxPerSec);

  function handleDrop(id: string) {
    if (!draggedId || draggedId === id) return;
    const ids = project.scenes.map((s) => s.id);
    const from = ids.indexOf(draggedId);
    const to = ids.indexOf(id);
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    reorderScenes(ids);
    setDraggedId(null);
  }

  function handleResizeStart(e: React.MouseEvent, id: string, duration: number) {
    e.stopPropagation();
    resizeRef.current = { id, startX: e.clientX, startDuration: duration };
    window.addEventListener("mousemove", handleResizeMove);
    window.addEventListener("mouseup", handleResizeEnd);
  }
  function handleResizeMove(e: MouseEvent) {
    if (!resizeRef.current) return;
    const deltaSec = (e.clientX - resizeRef.current.startX) / pxPerSec;
    const newDuration = Math.max(0.5, resizeRef.current.startDuration + deltaSec);
    updateScene(resizeRef.current.id, { durationSec: Number(newDuration.toFixed(2)) });
  }
  function handleResizeEnd() {
    resizeRef.current = null;
    window.removeEventListener("mousemove", handleResizeMove);
    window.removeEventListener("mouseup", handleResizeEnd);
  }

  return (
    <div className="border-t border-studio-border bg-studio-panel flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-studio-border">
        <span className="text-xs text-studio-muted">Linea de tiempo</span>
        <div className="flex items-center gap-2 text-xs text-studio-muted">
          <span>Zoom</span>
          <input type="range" min={15} max={150} value={pxPerSec} onChange={(e) => setPxPerSec(Number(e.target.value))} className="accent-studio-accent" />
        </div>
      </div>
      <div className="overflow-x-auto flex-1">
        <div style={{ width: totalWidth }} className="flex flex-col">
          {/* Marcadores de seccion */}
          <div className="relative h-6 border-b border-studio-border">
            {project.song?.analysis?.sections.map((s) => (
              <div
                key={s.id}
                className="absolute top-0 text-[10px] text-studio-muted px-1 border-l border-studio-border h-full flex items-center"
                style={{ left: s.start * pxPerSec }}
              >
                {formatTime(s.start)} {s.label.toUpperCase()}
              </div>
            ))}
          </div>

          {/* Pista de audio */}
          <div className="h-14 border-b border-studio-border relative bg-studio-panel2/40">
            {project.song?.analysis && (
              <MiniWaveform peaks={project.song.analysis.waveformPeaks} width={totalDuration * pxPerSec} height={56} />
            )}
            {!project.song && <span className="text-xs text-studio-muted absolute inset-0 flex items-center px-2">Pista de audio</span>}
          </div>

          {/* Pista de imagenes/escenas */}
          <div className="h-16 border-b border-studio-border relative flex items-stretch">
            {layout.map((scene) => (
              <div
                key={scene.id}
                draggable
                onDragStart={() => setDraggedId(scene.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(scene.id)}
                onClick={() => onSelect({ type: "scene", id: scene.id })}
                style={{ width: scene.durationSec * pxPerSec, background: `${SECTION_COLORS[scene.sectionLabel]}55` }}
                className={`relative border-r border-studio-bg cursor-pointer shrink-0 flex items-end p-1 ${
                  selection?.type === "scene" && selection.id === scene.id ? "ring-2 ring-studio-accent" : ""
                }`}
              >
                <span className="text-[10px] text-studio-text truncate">{scene.order + 1}. {scene.movement}</span>
                <div
                  onMouseDown={(e) => handleResizeStart(e, scene.id, scene.durationSec)}
                  className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-studio-accent/60"
                />
              </div>
            ))}
            {layout.length === 0 && <span className="text-xs text-studio-muted px-2 self-center">Pista de imagenes / video</span>}
          </div>

          {/* Pista de subtitulos */}
          <div className="h-8 border-b border-studio-border relative bg-studio-panel2/20">
            {project.lyrics.enabled && project.lyrics.lines.map((l) => (
              <div
                key={l.id}
                style={{ left: l.start * pxPerSec, width: Math.max(4, (l.end - l.start) * pxPerSec) }}
                className="absolute top-1 h-6 bg-studio-accent2/40 rounded text-[9px] px-1 truncate leading-6"
                title={l.text}
              >
                {l.text}
              </div>
            ))}
            {!project.lyrics.enabled && <span className="text-xs text-studio-muted px-2">Pista de subtitulos</span>}
          </div>

          {/* Pista de efectos */}
          <div className="h-6 relative bg-studio-panel2/10 flex items-center px-2 gap-2">
            <span className="text-[10px] text-studio-muted">Efectos:</span>
            {project.effects.vignette && <span className="text-[10px] px-1.5 rounded bg-studio-panel2">vineta</span>}
            {project.effects.grain && <span className="text-[10px] px-1.5 rounded bg-studio-panel2">grano</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniWaveform({ peaks, width, height }: { peaks: number[]; width: number; height: number }) {
  return (
    <svg width={width} height={height} className="block">
      {peaks.map((p, i) => {
        const barW = width / peaks.length;
        const barH = Math.max(1, p * height * 0.85);
        return (
          <rect
            key={i}
            x={i * barW}
            y={(height - barH) / 2}
            width={Math.max(1, barW - 0.5)}
            height={barH}
            fill="#8b5cf6"
          />
        );
      })}
    </svg>
  );
}
