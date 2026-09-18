import type { CameraMovementType, MovementIntensity } from "@/types/project";

export interface SourceRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

const INTENSITY_SCALE: Record<MovementIntensity, number> = {
  suave: 0.07,
  media: 0.13,
  intensa: 0.22,
};

function easeInOut(t: number): number {
  return t * t * (3 - 2 * t);
}

/**
 * Calcula el rectangulo de recorte (en pixeles de la imagen original) que
 * simula el movimiento de camara para el instante t (0..1) de una escena,
 * evitando cortes bruscos mediante suavizado (easing) del progreso.
 */
export function computeKenBurnsRect(
  imgW: number,
  imgH: number,
  canvasW: number,
  canvasH: number,
  movement: CameraMovementType,
  intensity: MovementIntensity,
  tRaw: number
): SourceRect {
  const t = easeInOut(Math.min(1, Math.max(0, tRaw)));
  const scale = INTENSITY_SCALE[intensity];

  const imgAspect = imgW / imgH;
  const canvasAspect = canvasW / canvasH;
  let baseW: number;
  let baseH: number;
  if (imgAspect > canvasAspect) {
    baseH = imgH;
    baseW = imgH * canvasAspect;
  } else {
    baseW = imgW;
    baseH = imgW / canvasAspect;
  }

  let zoom = 1;
  let cx = imgW / 2;
  let cy = imgH / 2;

  switch (movement) {
    case "zoom-in":
      zoom = 1 + scale * t;
      break;
    case "zoom-out":
      zoom = 1 + scale * (1 - t);
      break;
    case "dolly-in":
      zoom = 1 + scale * 1.3 * t;
      break;
    case "dolly-out":
      zoom = 1 + scale * 1.3 * (1 - t);
      break;
    case "cinematic":
      zoom = 1 + scale * 0.8 * t;
      break;
    case "pan-left":
    case "pan-right":
    case "tilt-up":
    case "tilt-down":
    case "diagonal":
      zoom = 1 + scale * 0.5;
      break;
    case "floating":
      zoom = 1 + scale * 0.4;
      break;
    case "none":
    default:
      zoom = 1;
      break;
  }

  const sw = baseW / zoom;
  const sh = baseH / zoom;
  const hSlack = Math.max(0, (imgW - sw) / 2);
  const vSlack = Math.max(0, (imgH - sh) / 2);

  switch (movement) {
    case "pan-left":
      cx = imgW / 2 + hSlack * (0.85 - 1.7 * t);
      break;
    case "pan-right":
      cx = imgW / 2 - hSlack * (0.85 - 1.7 * t);
      break;
    case "tilt-up":
      cy = imgH / 2 + vSlack * (0.85 - 1.7 * t);
      break;
    case "tilt-down":
      cy = imgH / 2 - vSlack * (0.85 - 1.7 * t);
      break;
    case "diagonal":
      cx = imgW / 2 - hSlack * 0.6 * (0.85 - 1.7 * t);
      cy = imgH / 2 + vSlack * 0.6 * (0.85 - 1.7 * t);
      break;
    case "cinematic":
      cx = imgW / 2 - hSlack * 0.3 * t;
      cy = imgH / 2 - vSlack * 0.15 * t;
      break;
    case "floating": {
      const angle = t * Math.PI * 2;
      cx = imgW / 2 + hSlack * 0.35 * Math.sin(angle);
      cy = imgH / 2 + vSlack * 0.35 * Math.cos(angle * 0.7);
      break;
    }
    default:
      break;
  }

  const sx = Math.min(Math.max(0, cx - sw / 2), Math.max(0, imgW - sw));
  const sy = Math.min(Math.max(0, cy - sh / 2), Math.max(0, imgH - sh));

  return { sx, sy, sw, sh };
}
