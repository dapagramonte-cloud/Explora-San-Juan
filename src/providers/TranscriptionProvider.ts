import type { LyricLine } from "@/types/project";
import { notConfigured, type ProviderResult } from "./types";

export interface TranscriptionProvider {
  readonly name: string;
  readonly configured: boolean;
  transcribe(audioBlobKey: string): Promise<ProviderResult<LyricLine[]>>;
}

// Endpoint backend esperado: POST /api/ai/transcribe. Requiere VITE_TRANSCRIPTION_ENDPOINT.
// El navegador no tiene un motor de reconocimiento de voz fiable multi-idioma
// para letras musicales con ritmo, por lo que esta funcion depende de backend.
class HttpTranscriptionProvider implements TranscriptionProvider {
  name = "Transcription API";
  endpoint = import.meta.env.VITE_TRANSCRIPTION_ENDPOINT as string | undefined;
  configured = Boolean(this.endpoint);

  async transcribe(audioBlobKey: string): Promise<ProviderResult<LyricLine[]>> {
    if (!this.endpoint) return notConfigured(this.name);
    try {
      const res = await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioBlobKey }),
      });
      if (!res.ok) return { status: "error", message: `Error del proveedor (${res.status})` };
      const lines = (await res.json()) as LyricLine[];
      return { status: "ok", data: lines };
    } catch (err) {
      return { status: "error", message: (err as Error).message };
    }
  }
}

export const transcriptionProvider: TranscriptionProvider = new HttpTranscriptionProvider();
