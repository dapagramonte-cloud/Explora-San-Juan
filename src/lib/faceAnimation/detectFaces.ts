import type { FaceLandmarks } from "@/types/project";
import { getHuman } from "./humanClient";

// Descarta landmarks degenerados: con confianza baja facemesh a veces ubica
// todos los puntos de labios casi en el mismo lugar, lo que produciria una
// animacion rota (una region casi de ancho/alto cero estirandose).
function isPlausible(f: FaceLandmarks): boolean {
  return f.rightMouthX - f.leftMouthX > 0.03 && f.chinY - f.upperLipY > 0.02;
}

function boxFallback(box: number[] | undefined, w: number, h: number): FaceLandmarks | null {
  if (!box || box.length !== 4) return null;
  const [bx, by, bw, bh] = box;
  return {
    leftMouthX: (bx + bw * 0.3) / w,
    rightMouthX: (bx + bw * 0.7) / w,
    upperLipY: (by + bh * 0.62) / h,
    chinY: (by + bh * 0.92) / h,
    centerX: (bx + bw * 0.5) / w,
    centerY: (by + bh * 0.77) / h,
  };
}

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
        const box = face.box as number[] | undefined; // [x, y, width, height] en pixeles

        if (upperOuter && lowerOuter && upperOuter.length > 0 && lowerOuter.length > 0) {
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

          const fromMesh: FaceLandmarks = {
            leftMouthX,
            rightMouthX,
            upperLipY,
            chinY: Math.min(1, chinY),
            centerX: (leftMouthX + rightMouthX) / 2,
            centerY: (upperLipY + chinY) / 2,
          };
          if (isPlausible(fromMesh)) return fromMesh;
        }

        // El mesh no dio puntos de labios usables (ausentes o degenerados,
        // ej. con confianza baja). Se estima la zona de la boca a partir de
        // proporciones faciales tipicas sobre el recuadro detectado, en vez
        // de descartar la cara por completo o animar una region rota.
        const fallback = boxFallback(box, w, h);
        return fallback && isPlausible(fallback) ? fallback : null;
      })
      .filter((f: FaceLandmarks | null): f is FaceLandmarks => f !== null);
  } catch (err) {
    console.error("Deteccion facial no disponible:", err);
    // Ej. WebGL no soportado en este navegador: sin caras detectadas, la
    // escena simplemente no tendra animacion de canto disponible.
    return [];
  }
}
