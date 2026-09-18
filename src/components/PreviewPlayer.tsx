import { useEffect, useMemo, useRef, useState } from "react";
import type { Project } from "@/types/project";
import { useSceneBitmaps } from "@/hooks/useSceneBitmaps";
import { computeTimelineLayout, getTotalDuration } from "@/lib/timelineLayout";
import { renderFrame, type RenderEffects } from "@/lib/render/sceneRenderer";
import { loadFileBlob } from "@/lib/db";

const PREVIEW_DIMENSIONS: Record<Project["aspectRatio"], { w: number; h: number }> = {
  "16:9": { w: 960, h: 540 },
  "9:16": { w: 540, h: 960 },
  "1:1": { w: 720, h: 720 },
};

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface Props {
  project: Project;
  effects?: RenderEffects;
}

export function PreviewPlayer({ project, effects = { vignette: false, grain: false } }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const rafRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const bitmaps = useSceneBitmaps(project.images);
  const layout = useMemo(() => computeTimelineLayout(project.scenes), [project.scenes]);
  const totalDuration = useMemo(
    () => (project.song?.analysis ? project.song.analysis.durationSec : getTotalDuration(project.scenes)),
    [project.scenes, project.song]
  );
  const dims = PREVIEW_DIMENSIONS[project.aspectRatio];

  useEffect(() => {
    let revoke: string | null = null;
    let cancelled = false;
    async function load() {
      if (!project.song) {
        setAudioUrl(null);
        return;
      }
      const blob = await loadFileBlob(project.song.blobKey);
      if (!blob || cancelled) return;
      const url = URL.createObjectURL(blob);
      revoke = url;
      setAudioUrl(url);
    }
    load();
    return () => {
      cancelled = true;
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [project.song?.blobKey]);

  const activeLyric = useMemo(() => {
    if (!project.lyrics.enabled) return null;
    const line = project.lyrics.lines.find((l) => currentTime >= l.start && currentTime < l.end);
    if (!line) return null;
    return {
      text: line.text,
      style: project.lyrics.style,
      position: project.lyrics.position,
      color: project.lyrics.color,
      fontSize: project.lyrics.fontSize,
      showBackground: project.lyrics.showBackground,
    };
  }, [project.lyrics, currentTime]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function draw() {
      const t = audioRef.current?.currentTime ?? currentTime;
      renderFrame({
        ctx: ctx!,
        w: dims.w,
        h: dims.h,
        scenes: layout,
        images: bitmaps,
        colorGrade: project.colorGrade,
        t,
        effects,
        activeLyric,
      });
      if (isPlaying) rafRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, layout, bitmaps, project.colorGrade, effects, activeLyric, dims.w, dims.h]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) {
      setIsPlaying((p) => !p);
      return;
    }
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const t = Number(e.target.value);
    setCurrentTime(t);
    if (audioRef.current) audioRef.current.currentTime = t;
  }

  function requestFullscreen() {
    containerRef.current?.requestFullscreen?.();
  }

  return (
    <div className="flex flex-col gap-3">
      <div ref={containerRef} className="relative flex items-center justify-center bg-black rounded-lg overflow-hidden studio-panel">
        <canvas ref={canvasRef} width={dims.w} height={dims.h} className="max-h-[60vh] w-auto h-auto" />
        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onEnded={() => setIsPlaying(false)}
          />
        )}
        {!project.song && (
          <div className="absolute inset-0 flex items-center justify-center text-studio-muted text-sm">
            Sube una cancion para previsualizar
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 text-sm">
        <button
          onClick={togglePlay}
          className="px-3 py-1.5 rounded-md bg-studio-accent text-white hover:opacity-90 disabled:opacity-40"
          disabled={!audioUrl}
        >
          {isPlaying ? "Pausar" : "Reproducir"}
        </button>
        <span className="text-studio-muted tabular-nums">
          {formatTime(currentTime)} / {formatTime(totalDuration)}
        </span>
        <input
          type="range"
          min={0}
          max={Math.max(totalDuration, 0.01)}
          step={0.05}
          value={currentTime}
          onChange={handleSeek}
          className="flex-1 accent-studio-accent"
        />
        <span className="text-studio-muted text-xs">
          {dims.w}x{dims.h} · {project.aspectRatio}
        </span>
        <button onClick={requestFullscreen} className="px-2 py-1 rounded-md studio-panel hover:border-studio-accent text-xs">
          ⛶
        </button>
      </div>
    </div>
  );
}
