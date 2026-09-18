import { fetchFile } from "@ffmpeg/util";
import type { Project } from "@/types/project";
import { computeTimelineLayout, getTotalDuration } from "@/lib/timelineLayout";
import { renderFrame, type RenderEffects } from "./sceneRenderer";
import { getFFmpeg } from "./ffmpegClient";
import { loadFileBlob } from "@/lib/db";

export type ExportStage =
  | "preparando"
  | "audio"
  | "renderizando"
  | "codificando"
  | "finalizando"
  | "listo"
  | "error";

export interface ExportProgress {
  stage: ExportStage;
  message: string;
  progress: number; // 0..1
}

const SEGMENT_SECONDS = 10;

function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error("No se pudo codificar el frame"));
        return;
      }
      const buf = new Uint8Array(await blob.arrayBuffer());
      resolve(buf);
    }, "image/png");
  });
}

export async function exportProjectToMp4(
  project: Project,
  images: Map<string, ImageBitmap>,
  effects: RenderEffects,
  onProgress: (p: ExportProgress) => void
): Promise<Blob> {
  if (!project.song) {
    throw new Error("El proyecto no tiene una cancion cargada.");
  }
  if (project.scenes.length === 0) {
    throw new Error("El proyecto no tiene escenas. Genera el storyboard antes de exportar.");
  }

  onProgress({ stage: "preparando", message: "Preparando escenas...", progress: 0.02 });

  const { width, height, fps, videoBitrateKbps } = project.exportSettings;
  const layout = computeTimelineLayout(project.scenes);
  const totalDuration = getTotalDuration(project.scenes);
  const totalFrames = Math.max(1, Math.floor(totalDuration * fps));

  const ffmpeg = await getFFmpeg();

  onProgress({ stage: "audio", message: "Procesando audio...", progress: 0.06 });
  const songBlob = await loadFileBlob(project.song.blobKey);
  if (!songBlob) throw new Error("No se pudo leer el archivo de audio original.");
  await ffmpeg.writeFile("input_audio", await fetchFile(songBlob));
  await ffmpeg.exec([
    "-y",
    "-i",
    "input_audio",
    "-t",
    totalDuration.toFixed(3),
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "audio_trimmed.m4a",
  ]);

  const renderCanvas = document.createElement("canvas");
  renderCanvas.width = width;
  renderCanvas.height = height;
  const ctx = renderCanvas.getContext("2d", { willReadFrequently: false })!;

  const segmentCount = Math.ceil(totalDuration / SEGMENT_SECONDS);
  const segmentFiles: string[] = [];

  for (let seg = 0; seg < segmentCount; seg++) {
    const segStartSec = seg * SEGMENT_SECONDS;
    const segEndSec = Math.min(totalDuration, segStartSec + SEGMENT_SECONDS);
    const segFrameCount = Math.max(1, Math.round((segEndSec - segStartSec) * fps));

    for (let i = 0; i < segFrameCount; i++) {
      const globalFrameIdx = Math.round(segStartSec * fps) + i;
      const t = globalFrameIdx / fps;

      renderFrame({
        ctx,
        w: width,
        h: height,
        scenes: layout,
        images,
        colorGrade: project.colorGrade,
        t,
        effects,
        activeLyric: getActiveLyricAt(project, t),
      });

      const bytes = await canvasToPngBytes(renderCanvas);
      const name = `seg_${i.toString().padStart(5, "0")}.png`;
      await ffmpeg.writeFile(name, bytes);

      const overallDone = (globalFrameIdx + 1) / totalFrames;
      onProgress({
        stage: "renderizando",
        message: `Renderizando escena — frame ${globalFrameIdx + 1} de ${totalFrames}`,
        progress: 0.08 + overallDone * 0.55,
      });
    }

    const segmentName = `segment_${seg}.mp4`;
    onProgress({
      stage: "codificando",
      message: `Codificando segmento ${seg + 1} de ${segmentCount}...`,
      progress: 0.63 + (seg / segmentCount) * 0.25,
    });

    await ffmpeg.exec([
      "-y",
      "-framerate",
      String(fps),
      "-i",
      "seg_%05d.png",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-preset",
      "veryfast",
      "-b:v",
      `${videoBitrateKbps}k`,
      "-r",
      String(fps),
      segmentName,
    ]);
    segmentFiles.push(segmentName);

    for (let i = 0; i < segFrameCount; i++) {
      const name = `seg_${i.toString().padStart(5, "0")}.png`;
      try {
        await ffmpeg.deleteFile(name);
      } catch {
        // ya eliminado
      }
    }
  }

  onProgress({ stage: "finalizando", message: "Aplicando efectos y uniendo segmentos...", progress: 0.9 });

  const concatList = segmentFiles.map((f) => `file '${f}'`).join("\n");
  await ffmpeg.writeFile("concat_list.txt", new TextEncoder().encode(concatList));
  await ffmpeg.exec(["-y", "-f", "concat", "-safe", "0", "-i", "concat_list.txt", "-c", "copy", "video_only.mp4"]);

  onProgress({ stage: "finalizando", message: "Finalizando video...", progress: 0.95 });

  await ffmpeg.exec([
    "-y",
    "-i",
    "video_only.mp4",
    "-i",
    "audio_trimmed.m4a",
    "-map",
    "0:v",
    "-map",
    "1:a",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-shortest",
    "output.mp4",
  ]);

  const data = await ffmpeg.readFile("output.mp4");
  const blob = new Blob([new Uint8Array(data as Uint8Array)], { type: "video/mp4" });

  for (const f of [...segmentFiles, "video_only.mp4", "output.mp4", "audio_trimmed.m4a", "input_audio", "concat_list.txt"]) {
    try {
      await ffmpeg.deleteFile(f);
    } catch {
      // ignorar
    }
  }

  onProgress({ stage: "listo", message: "Video listo.", progress: 1 });
  return blob;
}

function getActiveLyricAt(project: Project, t: number) {
  if (!project.lyrics.enabled) return null;
  const line = project.lyrics.lines.find((l) => t >= l.start && t < l.end);
  if (!line) return null;
  return {
    text: line.text,
    style: project.lyrics.style,
    position: project.lyrics.position,
    color: project.lyrics.color,
    fontSize: project.lyrics.fontSize,
    showBackground: project.lyrics.showBackground,
  };
}
