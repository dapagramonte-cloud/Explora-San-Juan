import { useState } from "react";
import type { Project } from "@/types/project";
import { shallow } from "zustand/shallow";
import { useProjectStore } from "@/store/useProjectStore";
import { lipSyncProvider, type FacialExpression, type FacialIntensity } from "@/providers/LipSyncProvider";
import { Badge, Button, Card, EmptyState, Field, SectionTitle } from "@/components/ui";

export function LipSyncPanel({ project }: { project: Project }) {
  const { updateScene, patch, reanalyzeImage } = useProjectStore(
    (s) => ({ updateScene: s.updateScene, patch: s.patch, reanalyzeImage: s.reanalyzeImage }),
    shallow
  );
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);

  const scenesWithImages = project.scenes.map((scene, idx) => ({
    scene,
    idx,
    image: project.images.find((i) => i.id === scene.imageId),
  }));
  const scenesWithFaces = scenesWithImages.filter((s) => (s.image?.analysis?.faces.length ?? 0) > 0);

  function enableAll() {
    patch((draft) => {
      const imgById = new Map(draft.images.map((i) => [i.id, i]));
      draft.scenes.forEach((s) => {
        if ((imgById.get(s.imageId)?.analysis?.faces.length ?? 0) > 0) s.lipSyncEnabled = true;
      });
    });
  }

  async function reanalyzeAll() {
    setReanalyzing(true);
    try {
      for (const image of project.images) await reanalyzeImage(image.id);
    } finally {
      setReanalyzing(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <SectionTitle>Animacion de canto</SectionTitle>
      <p className="text-sm text-studio-muted">
        Detecta caras reales en tus imagenes (localmente, en el navegador, sin costo) y anima la boca/mandibula al
        ritmo del volumen de la cancion. No es sincronizacion labial por fonemas (eso requeriria un modelo generativo
        con backend, ver "Avanzado" abajo), pero funciona sin conexion externa y sin costo, y se aplica a todas las
        caras detectadas en una imagen (util para que el coro tambien se mueva).
      </p>

      {scenesWithFaces.length === 0 ? (
        <>
          <EmptyState
            title="No se detectaron caras"
            description="Sube imagenes con personas (la cantante, el coro, etc.), de frente y bien iluminadas. La deteccion facial corre automaticamente al subir cada imagen."
          />
          {project.images.length > 0 && (
            <Button onClick={reanalyzeAll} disabled={reanalyzing}>
              {reanalyzing ? "Analizando..." : "Volver a analizar todas las imagenes"}
            </Button>
          )}
        </>
      ) : (
        <>
          <Button variant="primary" onClick={enableAll}>
            🎤 Activar en las {scenesWithFaces.length} escena(s) con personajes
          </Button>
          <Card className="flex flex-col gap-2 max-h-80 overflow-y-auto">
            {scenesWithImages.map(({ scene, idx, image }) => {
              const faceCount = image?.analysis?.faces.length ?? 0;
              if (faceCount === 0) return null;
              return (
                <label key={scene.id} className="flex items-center justify-between gap-2 text-sm py-1 border-b border-studio-border last:border-0">
                  <span className="flex items-center gap-2">
                    Escena {idx + 1} · {image?.fileName}
                    <Badge>{faceCount} cara{faceCount > 1 ? "s" : ""}</Badge>
                  </span>
                  <input
                    type="checkbox"
                    checked={scene.lipSyncEnabled}
                    onChange={(e) => updateScene(scene.id, { lipSyncEnabled: e.target.checked })}
                  />
                </label>
              );
            })}
          </Card>
        </>
      )}

      <button className="text-xs text-studio-muted text-left underline" onClick={() => setAdvancedOpen((v) => !v)}>
        {advancedOpen ? "Ocultar" : "Mostrar"} opcion avanzada: proveedor de IA externo (lip sync por fonemas)
      </button>
      {advancedOpen && <AdvancedProviderLipSync project={project} />}
    </div>
  );
}

function AdvancedProviderLipSync({ project }: { project: Project }) {
  const updateScene = useProjectStore((s) => s.updateScene);
  const [imageId, setImageId] = useState(project.images[0]?.id ?? "");
  const [sceneId, setSceneId] = useState(project.scenes[0]?.id ?? "");
  const [intensity, setIntensity] = useState<FacialIntensity>("natural");
  const [expression, setExpression] = useState<FacialExpression>("neutral");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const characterImages = project.images.filter((i) => i.analysis?.tags.includes("personaje"));

  async function handleGenerate() {
    const scene = project.scenes.find((s) => s.id === sceneId);
    if (!scene || !project.song || !imageId) return;
    setLoading(true);
    setStatus(null);
    try {
      const image = project.images.find((i) => i.id === imageId)!;
      const result = await lipSyncProvider.generate({
        imageBlobKey: image.blobKey,
        audioBlobKey: project.song.blobKey,
        audioStartSec: scene.startSec,
        audioEndSec: scene.startSec + scene.durationSec,
        intensity,
        expression,
      });
      if (result.status === "not-configured") {
        setStatus(result.message ?? "Proveedor de IA no configurado.");
      } else if (result.status === "error") {
        setStatus(`Error: ${result.message}`);
      } else {
        updateScene(sceneId, { lipSyncEnabled: true });
        setStatus("Sincronizacion labial generada correctamente.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-studio-muted">
        Requiere un backend/API de generacion de video especializado (fonemas reales). Estado del proveedor:{" "}
        <strong className={lipSyncProvider.configured ? "text-emerald-400" : "text-amber-400"}>
          {lipSyncProvider.configured ? "configurado" : "no configurado"}
        </strong>
        {!lipSyncProvider.configured && " — define VITE_LIPSYNC_ENDPOINT para habilitarla."}
      </p>

      <Card className="grid grid-cols-2 gap-4">
        <Field label="Personaje / imagen">
          <select value={imageId} onChange={(e) => setImageId(e.target.value)} className="studio-input rounded-md px-3 py-2 text-sm">
            <option value="">Selecciona una imagen</option>
            {(characterImages.length > 0 ? characterImages : project.images).map((i) => (
              <option key={i.id} value={i.id}>{i.fileName}</option>
            ))}
          </select>
        </Field>
        <Field label="Escena / fragmento de audio">
          <select value={sceneId} onChange={(e) => setSceneId(e.target.value)} className="studio-input rounded-md px-3 py-2 text-sm">
            <option value="">Selecciona una escena</option>
            {project.scenes.map((s, idx) => (
              <option key={s.id} value={s.id}>Escena {idx + 1} ({s.durationSec.toFixed(1)}s)</option>
            ))}
          </select>
        </Field>
        <Field label="Intensidad de movimiento facial">
          <select value={intensity} onChange={(e) => setIntensity(e.target.value as FacialIntensity)} className="studio-input rounded-md px-3 py-2 text-sm">
            <option value="natural">Natural</option>
            <option value="moderada">Moderada</option>
            <option value="expresiva">Expresiva</option>
          </select>
        </Field>
        <Field label="Expresion">
          <select value={expression} onChange={(e) => setExpression(e.target.value as FacialExpression)} className="studio-input rounded-md px-3 py-2 text-sm">
            <option value="neutral">Neutral</option>
            <option value="feliz">Feliz</option>
            <option value="triste">Triste</option>
            <option value="romantica">Romantica</option>
            <option value="intensa">Intensa</option>
          </select>
        </Field>
      </Card>

      <Button variant="primary" disabled={loading || !imageId || !sceneId} onClick={handleGenerate}>
        {loading ? "Generando..." : "Generar sincronizacion labial"}
      </Button>

      {status && <p className="text-sm text-studio-muted">{status}</p>}
    </div>
  );
}
