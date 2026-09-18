// A diferencia de los demas proveedores de IA, el analisis de audio SI se
// ejecuta localmente mediante Web Audio API (ver src/lib/audio.ts), por lo
// que este proveedor esta siempre "configurado": no depende de un backend.

import type { SongAnalysis } from "@/types/project";
import { analyzeSong } from "@/lib/audio";
import type { ProviderResult } from "./types";

export interface AudioAnalysisProvider {
  readonly name: string;
  readonly configured: boolean;
  analyze(file: Blob): Promise<ProviderResult<SongAnalysis>>;
}

class LocalAudioAnalysisProvider implements AudioAnalysisProvider {
  name = "Analisis local (Web Audio API)";
  configured = true;

  async analyze(file: Blob): Promise<ProviderResult<SongAnalysis>> {
    try {
      const analysis = await analyzeSong(file);
      return { status: "ok", data: analysis };
    } catch (err) {
      return { status: "error", message: (err as Error).message };
    }
  }
}

export const audioAnalysisProvider: AudioAnalysisProvider = new LocalAudioAnalysisProvider();
