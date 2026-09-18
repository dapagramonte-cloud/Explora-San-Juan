import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

let ffmpegSingleton: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

const CORE_BASE_URL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";

/**
 * Carga el motor real de FFmpeg (WebAssembly) bajo demanda. Requiere que el
 * navegador pueda descargar el core desde CDN la primera vez (se cachea
 * despues). Si la descarga falla (sin conexion), el export debe fallar de
 * forma explicita: nunca se simula una exportacion exitosa.
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
