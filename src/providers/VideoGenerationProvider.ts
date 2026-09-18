import type { AspectRatio, CameraMovementType, MovementIntensity } from "@/types/project";
import { notConfigured, type ProviderResult } from "./types";

export interface GenerateSceneRequest {
  prompt: string;
  durationSec: number;
  aspectRatio: AspectRatio;
  movement: CameraMovementType;
  intensity: MovementIntensity;
  visualStyle?: string;
  referenceImageBlobKey?: string; // para consistencia de personaje
}

export interface GeneratedSceneAsset {
  videoBlob: Blob;
  durationSec: number;
}

export interface VideoGenerationProvider {
  readonly name: string;
  readonly configured: boolean;
  generateScene(req: GenerateSceneRequest): Promise<ProviderResult<GeneratedSceneAsset>>;
}

// Endpoint backend esperado: POST /api/ai/video/generate
// Debe configurarse VITE_VIDEO_GEN_ENDPOINT para activar este proveedor.
class HttpVideoGenerationProvider implements VideoGenerationProvider {
  name = "Video generation API";
  endpoint = import.meta.env.VITE_VIDEO_GEN_ENDPOINT as string | undefined;
  configured = Boolean(this.endpoint);

  async generateScene(req: GenerateSceneRequest): Promise<ProviderResult<GeneratedSceneAsset>> {
    if (!this.endpoint) return notConfigured(this.name);
    try {
      const res = await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      if (!res.ok) {
        return { status: "error", message: `Error del proveedor (${res.status})` };
      }
      const videoBlob = await res.blob();
      return { status: "ok", data: { videoBlob, durationSec: req.durationSec } };
    } catch (err) {
      return { status: "error", message: (err as Error).message };
    }
  }
}

export const videoGenerationProvider: VideoGenerationProvider = new HttpVideoGenerationProvider();
