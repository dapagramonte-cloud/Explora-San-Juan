import type { FaceLandmarks } from "@/types/project";
import { getHuman } from "./humanClient";

// Indices no son necesarios: Human ya agrupa el mesh en `annotations` con
// nombres (lipsUpperOuter, lipsLowerOuter, silhouette, etc).
export async function detectFaces(bitmap: ImageBitmap): Promise<FaceLandmarks[]> {
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0);

  try {
    const human = await getHuman();
    const result = await human.detect(canvas);
    const w = bitmap.width;
    const h = bitmap.height;

    return result.face
      .map((face: any): FaceLandmarks | null => {
        const upperOuter = face.annotations?.lipsUpperOuter as number[][] | undefined;
        const lowerOuter = face.annotations?.lipsLowerOuter as number[][] | undefined;
        const silhouette = face.annotations?.silhouette as number[][] | undefined;
        if (!upperOuter || !lowerOuter || upperOuter.length === 0 || lowerOuter.length === 0) return null;

        const xs = [...upperOuter, ...lowerOuter].map((p) => p[0]);
        const leftMouthX = Math.min(...xs) / w;
        const rightMouthX = Math.max(...xs) / w;
        const upperLipY = Math.min(...upperOuter.map((p) => p[1])) / h;

        let chinY = Math.max(...lowerOuter.map((p) => p[1])) / h;
        if (silhouette && silhouette.length > 0) {
          const centerXpx = (leftMouthX + rightMouthX) * 0.5 * w;
          const nearCenter = silhouette.filter((p) => Math.abs(p[0] - centerXpx) < w * 0.08);
          const candidates = nearCenter.length > 0 ? nearCenter : silhouette;
          chinY = Math.max(chinY, Math.max(...candidates.map((p) => p[1])) / h);
        }

        return {
          leftMouthX,
          rightMouthX,
          upperLipY,
          chinY: Math.min(1, chinY),
          centerX: (leftMouthX + rightMouthX) / 2,
          centerY: (upperLipY + chinY) / 2,
        };
      })
      .filter((f: FaceLandmarks | null): f is FaceLandmarks => f !== null);
  } catch {
    // Deteccion no disponible (ej. WebGL no soportado): sin caras detectadas,
    // la escena simplemente no tendra animacion de canto disponible.
    return [];
  }
}
