import { useEffect, useRef } from "react";
import type { SongSection } from "@/types/project";

const SECTION_COLORS: Record<string, string> = {
  intro: "#3b3b46",
  verso: "#6d5bd0",
  coro: "#ec4899",
  puente: "#f59e0b",
  outro: "#3b3b46",
  silencio: "#26262f",
  otro: "#8b8b99",
};

interface Props {
  peaks: number[];
  durationSec: number;
  sections?: SongSection[];
  height?: number;
  currentTime?: number;
}

export function Waveform({ peaks, durationSec, sections = [], height = 64, currentTime }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    for (const section of sections) {
      const x1 = (section.start / durationSec) * w;
      const x2 = (section.end / durationSec) * w;
      ctx.fillStyle = `${SECTION_COLORS[section.label] ?? "#26262f"}33`;
      ctx.fillRect(x1, 0, x2 - x1, h);
    }

    const barWidth = w / peaks.length;
    ctx.fillStyle = "#8b5cf6";
    peaks.forEach((p, i) => {
      const barHeight = Math.max(1, p * h * 0.9);
      ctx.fillRect(i * barWidth, (h - barHeight) / 2, Math.max(1, barWidth - 1), barHeight);
    });

    if (currentTime !== undefined) {
      const x = (currentTime / durationSec) * w;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x, 0, 1.5, h);
    }
  }, [peaks, sections, durationSec, currentTime, height]);

  return <canvas ref={canvasRef} width={1200} height={height} className="w-full" style={{ height }} />;
}
