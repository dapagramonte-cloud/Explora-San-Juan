import { useState } from "react";
import type { CameraMovementType, Project, TransitionType } from "@/types/project";
import { shallow } from "zustand/shallow";
import { useProjectStore } from "@/store/useProjectStore";
import { useObjectUrls } from "@/hooks/useObjectUrls";
import { Button, Card, EmptyState, SectionTitle } from "@/components/ui";
import type { Selection } from "../panelTypes";

const MOVEMENTS: CameraMovementType[] = [
  "none", "zoom-in", "zoom-out", "pan-left", "pan-right", "tilt-up", "tilt-down",
  "diagonal", "dolly-in", "dolly-out", "floating", "cinematic",
];
const TRANSITIONS: TransitionType[] = [
  "corte", "fundido", "disolvencia", "flash", "blur", "zoom", "slide", "light-leak", "cinematic-fade",
];

export function StoryboardPanel({ project, onSelect }: { project: Project; onSelect: (s: Selection) => void }) {
  const { autoGenerateStoryboard, updateScene, removeScene, duplicateScene, reorderScenes, patch } = useProjectStore(
    (s) => ({
      autoGenerateStoryboard: s.autoGenerateStoryboard,
      updateScene: s.updateScene,
      removeScene: s.removeScene,
      duplicateScene: s.duplicateScene,
      reorderScenes: s.reorderScenes,
      patch: s.patch,
    }),
    shallow
  );
  const imageUrls = useObjectUrls(project.images);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const canGenerate = Boolean(project.song?.analysis) && project.images.length > 0;
  const imagesById = new Map(project.images.map((i) => [i.id, i]));
  const scenesWithFaces = project.scenes.filter((s) => (imagesById.get(s.imageId)?.analysis?.faces.length ?? 0) > 0);

  function enableSingingOnAllFaces() {
    patch((draft) => {
      const imgById = new Map(draft.images.map((i) => [i.id, i]));
      draft.scenes.forEach((s) => {
        if ((imgById.get(s.imageId)?.analysis?.faces.length ?? 0) > 0) s.lipSyncEnabled = true;
      });
    });
  }

  function handleDrop(id: string) {
    if (!draggedId || draggedId === id) return;
    const ids = project.scenes.map((s) => s.id);
    const from = ids.indexOf(draggedId);
    const to = ids.indexOf(id);
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    reorderScenes(ids);
    setDraggedId(null);
  }

  return (
    <div className="flex flex-col gap-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <SectionTitle>Storyboard ({project.scenes.length} escenas)</SectionTitle>
        <div className="flex gap-2">
          {!canGenerate && (
            <span className="text-xs text-studio-muted self-center">
              Sube una cancion e imagenes para generar el storyboard
            </span>
          )}
          {scenesWithFaces.length > 0 && (
            <Button onClick={enableSingingOnAllFaces}>🎤 Animar canto en {scenesWithFaces.length} escena(s) con personaje</Button>
          )}
          <Button variant="primary" disabled={!canGenerate} onClick={autoGenerateStoryboard}>
            {project.scenes.length > 0 ? "Regenerar storyboard" : "🎬 Crear videoclip con IA"}
          </Button>
        </div>
      </div>

      {project.scenes.length === 0 ? (
        <EmptyState title="Aun no hay escenas" description="Genera el storyboard automatico o agregalo manualmente desde aqui." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {project.scenes.map((scene, idx) => {
            const image = project.images.find((i) => i.id === scene.imageId);
            const faceCount = image?.analysis?.faces.length ?? 0;
            return (
              <Card
                key={scene.id}
                draggable
                onDragStart={() => setDraggedId(scene.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(scene.id)}
                onClick={() => onSelect({ type: "scene", id: scene.id })}
                className="cursor-pointer flex flex-col gap-2"
              >
                <div className="flex items-center justify-between text-xs text-studio-muted">
                  <span>ESCENA {String(idx + 1).padStart(2, "0")} · {scene.sectionLabel}</span>
                  <span>{scene.durationSec.toFixed(1)}s</span>
                </div>
                <div className="aspect-video bg-studio-panel2 rounded-md overflow-hidden">
                  {image && imageUrls.get(image.id) && <img src={imageUrls.get(image.id)} className="w-full h-full object-cover" />}
                </div>
                <p className="text-xs text-studio-muted line-clamp-2">{scene.description}</p>
                {faceCount > 0 && (
                  <label className="flex items-center gap-1.5 text-xs" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={scene.lipSyncEnabled}
                      onChange={(e) => updateScene(scene.id, { lipSyncEnabled: e.target.checked })}
                    />
                    🎤 Animar canto ({faceCount} cara{faceCount > 1 ? "s" : ""})
                  </label>
                )}
                <div className="grid grid-cols-2 gap-2 text-xs" onClick={(e) => e.stopPropagation()}>
                  <select value={scene.movement} onChange={(e) => updateScene(scene.id, { movement: e.target.value as CameraMovementType })} className="studio-input rounded px-2 py-1">
                    {MOVEMENTS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <select value={scene.transitionOut} onChange={(e) => updateScene(scene.id, { transitionOut: e.target.value as TransitionType })} className="studio-input rounded px-2 py-1">
                    {TRANSITIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <select value={scene.imageId} onChange={(e) => updateScene(scene.id, { imageId: e.target.value })} className="studio-input rounded px-2 py-1 col-span-2">
                    {project.images.map((i) => <option key={i.id} value={i.id}>{i.fileName}</option>)}
                  </select>
                </div>
                <div className="flex gap-1.5 text-xs" onClick={(e) => e.stopPropagation()}>
                  <Button className="flex-1" onClick={() => duplicateScene(scene.id)}>Duplicar</Button>
                  <Button variant="danger" className="flex-1" onClick={() => removeScene(scene.id)}>Eliminar</Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
