import { notConfigured, type ProviderResult } from "./types";

export type FacialIntensity = "natural" | "moderada" | "expresiva";
export type FacialExpression = "neutral" | "feliz" | "triste" | "romantica" | "intensa";

export interface LipSyncRequest {
  imageBlobKey: string;
  audioBlobKey: string;
  audioStartSec: number;
  audioEndSec: number;
  intensity: FacialIntensity;
  expression: FacialExpression;
}

export interface LipSyncResult {
  videoBlob: Blob;
}

export interface LipSyncProvider {
  readonly name: string;
  readonly configured: boolean;
  generate(req: LipSyncRequest): Promise<ProviderResult<LipSyncResult>>;
}

// Endpoint backend esperado: POST /api/ai/lipsync/generate
// Requiere VITE_LIPSYNC_ENDPOINT. La sincronizacion labial exige un motor
// especializado (backend) - nunca se ejecuta localmente en el navegador ni
// se simula un resultado exitoso.
class HttpLipSyncProvider implements LipSyncProvider {
  name = "Lip Sync API";
  endpoint = import.meta.env.VITE_LIPSYNC_ENDPOINT as string | undefined;
  configured = Boolean(this.endpoint);

  async generate(req: LipSyncRequest): Promise<ProviderResult<LipSyncResult>> {
    if (!this.endpoint) return notConfigured(this.name);
    try {
      const res = await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      if (!res.ok) return { status: "error", message: `Error del proveedor (${res.status})` };
      const videoBlob = await res.blob();
      return { status: "ok", data: { videoBlob } };
    } catch (err) {
      return { status: "error", message: (err as Error).message };
    }
  }
}

export const lipSyncProvider: LipSyncProvider = new HttpLipSyncProvider();
