import type { CameraMovementType, Project, TransitionType } from "@/types/project";
import { useProjectStore } from "@/store/useProjectStore";
import { Badge, Field, SectionTitle, TextInput } from "@/components/ui";
import type { Selection } from "./panelTypes";

const MOVEMENTS: CameraMovementType[] = [
  "none", "zoom-in", "zoom-out", "pan-left", "pan-right", "tilt-up", "tilt-down",
  "diagonal", "dolly-in", "dolly-out", "floating", "cinematic",
];
const TRANSITIONS: TransitionType[] = [
  "corte", "fundido", "disolvencia", "flash", "blur", "zoom", "slide", "light-leak", "cinematic-fade",
];

export function PropertiesPanel({ project, selection }: { project: Project; selection: Selection }) {
  const { updateScene, patch } = useProjectStore();

  if (!selection) {
    return (
      <div className="text-sm text-studio-muted p-4">
        Selecciona una escena, imagen o la pista de audio para ver sus propiedades.
      </div>
    );
  }

  if (selection.type === "scene") {
    const scene = project.scenes.find((s) => s.id === selection.id);
    if (!scene) return null;
    return (
      <div className="flex flex-col gap-4 p-1">
        <SectionTitle>Escena</SectionTitle>
        <Field label="Duracion (segundos)">
          <TextInput
            type="number"
            step={0.1}
            min={0.5}
            value={scene.durationSec}
            onChange={(e) => updateScene(scene.id, { durationSec: Number(e.target.value) })}
          />
        </Field>
        <Field label="Movimiento de camara">
          <select
            value={scene.movement}
            onChange={(e) => updateScene(scene.id, { movement: e.target.value as CameraMovementType })}
            className="studio-input rounded-md px-3 py-2 text-sm"
          >
            {MOVEMENTS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="Intensidad">
          <select
            value={scene.movementIntensity}
            onChange={(e) => updateScene(scene.id, { movementIntensity: e.target.value as any })}
            className="studio-input rounded-md px-3 py-2 text-sm"
          >
            <option value="suave">Suave</option>
            <option value="media">Media</option>
            <option value="intensa">Intensa</option>
          </select>
        </Field>
        <Field label="Transicion de salida">
          <select
            value={scene.transitionOut}
            onChange={(e) => updateScene(scene.id, { transitionOut: e.target.value as TransitionType })}
            className="studio-input rounded-md px-3 py-2 text-sm"
          >
            {TRANSITIONS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Duracion de transicion (s)">
          <TextInput
            type="number"
            step={0.1}
            min={0.1}
            value={scene.transitionDurationSec}
            onChange={(e) => updateScene(scene.id, { transitionDurationSec: Number(e.target.value) })}
          />
        </Field>
        <Field label="Descripcion de IA">
          <textarea
            value={scene.description}
            onChange={(e) => updateScene(scene.id, { description: e.target.value })}
            className="studio-input rounded-md px-3 py-2 text-sm min-h-[70px]"
          />
        </Field>
        {scene.lipSyncEnabled && <Badge tone="accent">lip sync activo</Badge>}
      </div>
    );
  }

  if (selection.type === "image") {
    const image = project.images.find((i) => i.id === selection.id);
    if (!image) return null;
    return (
      <div className="flex flex-col gap-3 p-1">
        <SectionTitle>Imagen</SectionTitle>
        <p className="text-sm font-medium truncate">{image.fileName}</p>
        {image.analysis && (
          <>
            <p className="text-xs text-studio-muted">
              {image.analysis.width} x {image.analysis.height} · {image.analysis.orientation}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {image.analysis.tags.map((t) => <Badge key={t}>{t}</Badge>)}
            </div>
            <div className="flex gap-1.5">
              {image.analysis.dominantColors.map((c) => (
                <span key={c} className="w-6 h-6 rounded-full border border-studio-border" style={{ backgroundColor: c }} />
              ))}
            </div>
          </>
        )}
        <label className="flex items-center gap-2 text-sm mt-2">
          <input
            type="checkbox"
            checked={image.isReferenceCharacter}
            onChange={(e) =>
              patch((draft) => {
                const img = draft.images.find((i) => i.id === image.id);
                if (img) img.isReferenceCharacter = e.target.checked;
              })
            }
          />
          Usar como personaje de referencia
        </label>
      </div>
    );
  }

  if (selection.type === "audio" && project.song) {
    return (
      <div className="flex flex-col gap-3 p-1">
        <SectionTitle>Audio</SectionTitle>
        <p className="text-sm font-medium truncate">{project.song.fileName}</p>
        {project.song.analysis && (
          <>
            <p className="text-xs text-studio-muted">Duracion: {Math.round(project.song.analysis.durationSec)}s</p>
            <p className="text-xs text-studio-muted">BPM estimado: {project.song.analysis.bpm ?? "no detectado"}</p>
            <p className="text-xs text-studio-muted">Secciones: {project.song.analysis.sections.length}</p>
          </>
        )}
      </div>
    );
  }

  return null;
}
