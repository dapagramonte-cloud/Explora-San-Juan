// Animacion de "canto" 100% local: dado un rostro detectado (blazeface +
// facemesh) y la amplitud real del audio en el instante actual, deforma la
// zona boca/mandibula para simular apertura al ritmo de la cancion. No es
// sincronizacion labial por fonemas (eso requeriria un modelo generativo con
// backend), pero es una animacion real y determinista, sin backend ni costo.

import type { FaceLandmarks } from "@/types/project";

const MAX_STRETCH = 0.4;
const CAVITY_THRESHOLD = 0.12;
const MAX_CAVITY_ALPHA = 0.6;

function faceIntensity(index: number): number {
  // variacion pseudo-aleatoria fija por indice, para que varias caras (coro)
  // no se muevan en perfecta unisonancia
  const seed = Math.sin(index * 12.9898) * 43758.5453;
  const frac = seed - Math.floor(seed);
  return 0.75 + frac * 0.5;
}

export function drawAnimatedFaces(
  ctx: CanvasRenderingContext2D,
  source: ImageBitmap,
  faces: FaceLandmarks[],
  amplitude: number
) {
  const w = source.width;
  const h = source.height;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(source, 0, 0, w, h);

  faces.forEach((face, index) => {
    const a = Math.min(1, Math.max(0, amplitude * faceIntensity(index)));

    const leftX = face.leftMouthX * w;
    const rightX = face.rightMouthX * w;
    const topY = face.upperLipY * h;
    const bottomY = face.chinY * h;
    const mouthWidth = Math.max(4, rightX - leftX);
    const stripHeight = Math.max(4, bottomY - topY);

    const marginX = mouthWidth * 0.35;
    const sx = Math.max(0, leftX - marginX);
    const sw = Math.min(w - sx, mouthWidth + marginX * 2);
    const sy = topY;
    const sh = Math.min(h - sy, stripHeight * 1.15);

    const stretch = 1 + a * MAX_STRETCH;
    const dh = sh * stretch;

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(sx + sw / 2, sy + dh / 2, sw / 2 + 2, dh / 2 + 2, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(source, sx, sy, sw, sh, sx, sy, sw, dh);
    ctx.restore();

    if (a > CAVITY_THRESHOLD) {
      const cavityAlpha = Math.min(MAX_CAVITY_ALPHA, (a - CAVITY_THRESHOLD) * 0.9);
      const cavityTop = sy + stripHeight * 0.22;
      const cavityHeight = Math.max(2, dh - stripHeight * 0.22);
      ctx.save();
      ctx.globalAlpha = cavityAlpha;
      ctx.fillStyle = "rgb(90, 30, 34)";
      ctx.beginPath();
      ctx.ellipse(sx + sw / 2, cavityTop + cavityHeight / 2, mouthWidth / 2.6, cavityHeight / 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Sugerencia sutil de dientes superiores para que se lea como boca abierta
      ctx.globalAlpha = cavityAlpha * 0.8;
      ctx.fillStyle = "rgba(255, 255, 250, 0.9)";
      ctx.beginPath();
      ctx.ellipse(sx + sw / 2, cavityTop + cavityHeight * 0.12, mouthWidth / 2.8, cavityHeight * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  });
}
