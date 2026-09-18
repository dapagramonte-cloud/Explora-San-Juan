import { useState } from "react";
import type { Project } from "@/types/project";
import { useProjectStore } from "@/store/useProjectStore";
import { lipSyncProvider, type FacialExpression, type FacialIntensity } from "@/providers/LipSyncProvider";
import { Button, Card, Field, SectionTitle } from "@/components/ui";

export function LipSyncPanel({ project }: { project: Project }) {
  const { updateScene } = useProjectStore();
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
    <div className="flex flex-col gap-4 max-w-2xl">
      <SectionTitle>Sincronizacion labial (Lip Sync)</SectionTitle>
      <p className="text-sm text-studio-muted">
        Esta funcion requiere un backend/API de generacion de video especializado. Estado del proveedor:{" "}
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
