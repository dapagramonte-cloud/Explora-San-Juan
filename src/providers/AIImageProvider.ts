import { notConfigured, type ProviderResult } from "./types";

export interface GenerateImageRequest {
  prompt: string;
  referenceImageBlobKey?: string;
  width: number;
  height: number;
}

export interface AIImageProvider {
  readonly name: string;
  readonly configured: boolean;
  generate(req: GenerateImageRequest): Promise<ProviderResult<Blob>>;
}

// Endpoint backend esperado: POST /api/ai/image/generate. Requiere VITE_IMAGE_GEN_ENDPOINT.
class HttpAIImageProvider implements AIImageProvider {
  name = "Image generation API";
  endpoint = import.meta.env.VITE_IMAGE_GEN_ENDPOINT as string | undefined;
  configured = Boolean(this.endpoint);

  async generate(req: GenerateImageRequest): Promise<ProviderResult<Blob>> {
    if (!this.endpoint) return notConfigured(this.name);
    try {
      const res = await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      if (!res.ok) return { status: "error", message: `Error del proveedor (${res.status})` };
      const blob = await res.blob();
      return { status: "ok", data: blob };
    } catch (err) {
      return { status: "error", message: (err as Error).message };
    }
  }
}

export const aiImageProvider: AIImageProvider = new HttpAIImageProvider();
