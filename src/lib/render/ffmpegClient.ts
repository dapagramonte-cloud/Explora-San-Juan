import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

let ffmpegSingleton: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

// El core de FFmpeg (WebAssembly) se sirve desde el propio dominio de la app
// (public/ffmpeg/), no desde un CDN externo: evita depender de la
// disponibilidad de unpkg/jsdelivr en tiempo de ejecucion y funciona con las
// cabeceras COOP/COEP ya configuradas para SharedArrayBuffer.
const CORE_BASE_URL = "/ffmpeg";

/**
 * Carga el motor real de FFmpeg (WebAssembly) bajo demanda. Si la carga
 * falla, el export debe fallar de forma explicita: nunca se simula una
 * exportacion exitosa.
 */
export async function getFFmpeg(onLog?: (msg: string) => void): Promise<FFmpeg> {
  if (ffmpegSingleton) return ffmpegSingleton;
  if (loadPromise) return loadPromise;

  const ffmpeg = new FFmpeg();
  if (onLog) {
    ffmpeg.on("log", ({ message }) => onLog(message));
  }

  loadPromise = (async () => {
    const coreURL = await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.js`, "text/javascript");
    const wasmURL = await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.wasm`, "application/wasm");
    await ffmpeg.load({ coreURL, wasmURL });
    ffmpegSingleton = ffmpeg;
    return ffmpeg;
  })();

  return loadPromise;
}
