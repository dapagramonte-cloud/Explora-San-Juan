import { useState } from "react";
import type { Project } from "@/types/project";
import { useProjectStore } from "@/store/useProjectStore";
import { exportProjectToMp4, type ExportProgress } from "@/lib/render/exportVideo";
import { Button, Card, Field } from "@/components/ui";

const RESOLUTIONS: Record<string, { width: number; height: number; label: string }> = {
  "1080p": { width: 1920, height: 1080, label: "1080p (1920x1080)" },
  "4k": { width: 3840, height: 2160, label: "4K (3840x2160)" },
  "vertical-1080p": { width: 1080, height: 1920, label: "Vertical 1080p (1080x1920)" },
};

export function ExportModal({
  project,
  bitmaps,
  onClose,
}: {
  project: Project;
  bitmaps: Map<string, ImageBitmap>;
  onClose: () => void;
}) {
  const patch = useProjectStore((s) => s.patch);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const settings = project.exportSettings;

  function updateSettings(patchFn: (draft: Project) => void) {
    patch(patchFn);
  }

  async function handleExport() {
    setRunning(true);
    setError(null);
    setResultUrl(null);
    try {
      const blob = await exportProjectToMp4(project, bitmaps, project.effects, setProgress);
      setResultUrl(URL.createObjectURL(blob));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <Card className="w-full max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Exportar video</h2>
          <button onClick={onClose} className="text-studio-muted hover:text-studio-text">✕</button>
        </div>

        {!running && !resultUrl && (
          <div className="flex flex-col gap-4">
            <Field label="Resolucion">
              <select
                value={settings.resolutionPreset}
                onChange={(e) => {
                  const preset = e.target.value as keyof typeof RESOLUTIONS;
                  const res = RESOLUTIONS[preset];
                  updateSettings((d) => {
                    d.exportSettings.resolutionPreset = preset as any;
                    d.exportSettings.width = res.width;
                    d.exportSettings.height = res.height;
                  });
                }}
                className="studio-input rounded-md px-3 py-2 text-sm"
              >
                {Object.entries(RESOLUTIONS).map(([key, r]) => (
                  <option key={key} value={key}>{r.label}</option>
                ))}
              </select>
            </Field>
            <Field label="FPS">
              <select
                value={settings.fps}
                onChange={(e) => updateSettings((d) => { d.exportSettings.fps = Number(e.target.value) as any; })}
                className="studio-input rounded-md px-3 py-2 text-sm"
              >
                <option value={24}>24</option>
                <option value={30}>30</option>
                <option value={60}>60</option>
              </select>
            </Field>
            <Field label={`Bitrate de video (${settings.videoBitrateKbps} kbps)`}>
              <input
                type="range"
                min={2000}
                max={20000}
                step={500}
                value={settings.videoBitrateKbps}
                onChange={(e) => updateSettings((d) => { d.exportSettings.videoBitrateKbps = Number(e.target.value); })}
                className="accent-studio-accent"
              />
            </Field>
            <p className="text-xs text-studio-muted">
              Formato: MP4 (H.264) · Audio AAC. El renderizado ocurre en tu navegador con FFmpeg (WebAssembly); videos largos o en alta resolucion pueden tardar varios minutos y requieren conexion la primera vez para descargar el motor.
            </p>
            <Button variant="primary" onClick={handleExport}>Exportar video</Button>
          </div>
        )}

        {running && progress && (
          <div className="flex flex-col gap-3">
            <div className="w-full bg-studio-panel2 rounded-full h-2 overflow-hidden">
              <div className="h-full bg-studio-accent transition-all" style={{ width: `${Math.round(progress.progress * 100)}%` }} />
            </div>
            <p className="text-sm">{progress.message}</p>
            <p className="text-xs text-studio-muted">{Math.round(progress.progress * 100)}%</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col gap-2 mt-2">
            <p className="text-sm text-red-400">Error al exportar: {error}</p>
            <Button onClick={handleExport}>Reintentar</Button>
          </div>
        )}

        {resultUrl && (
          <div className="flex flex-col gap-3 items-center">
            <p className="text-sm text-emerald-400">Video listo.</p>
            <video src={resultUrl} controls className="w-full rounded-md max-h-64" />
            <a href={resultUrl} download={`${project.info.projectName || "clipstudio"}.mp4`}>
              <Button variant="primary">Descargar MP4</Button>
            </a>
          </div>
        )}
      </Card>
    </div>
  );
}
