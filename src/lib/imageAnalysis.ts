// Analisis local real de imagenes usando Canvas (sin backend ni deteccion
// facial real). Extrae dimensiones, orientacion, brillo y colores dominantes,
// y aplica heuristicas simples de encuadre para estimar si hay un posible
// retrato (objeto de interes centrado y vertical). No se modifica la imagen
// original (seccion 8 del pliego).

import type { ImageAnalysis, ImageTag } from "@/types/project";

export async function analyzeImage(file: Blob): Promise<ImageAnalysis> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const sampleSize = 64;
  canvas.width = sampleSize;
  canvas.height = sampleSize;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, sampleSize, sampleSize);
  const { data } = ctx.getImageData(0, 0, sampleSize, sampleSize);

  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let brightnessSum = 0;
  const colorBuckets = new Map<string, number>();

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    rSum += r;
    gSum += g;
    bSum += b;
    brightnessSum += (r + g + b) / 3;

    const bucket = `${Math.round(r / 32) * 32},${Math.round(g / 32) * 32},${Math.round(b / 32) * 32}`;
    colorBuckets.set(bucket, (colorBuckets.get(bucket) ?? 0) + 1);
  }

  const pixelCount = data.length / 4;
  const brightness = brightnessSum / pixelCount / 255;

  const dominantColors = [...colorBuckets.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key]) => {
      const [r, g, b] = key.split(",").map(Number);
      return `rgb(${r}, ${g}, ${b})`;
    });

  const width = bitmap.width;
  const height = bitmap.height;
  const orientation = width > height ? "horizontal" : width < height ? "vertical" : "cuadrada";

  // Heuristica de "posible retrato": centro de la imagen mas oscuro/definido
  // que los bordes suele indicar un sujeto centrado (persona/objeto principal).
  const center = getRegionBrightness(data, sampleSize, sampleSize, 0.35);
  const edges = getEdgeBrightness(data, sampleSize, sampleSize);
  const likelyPortrait = Math.abs(center - edges) > 0.05;

  const tags: ImageTag[] = [];
  tags.push(orientation === "vertical" ? "primer-plano" : "plano-general");
  tags.push(brightness < 0.35 ? "nocturno" : "diurno");
  if (likelyPortrait) tags.push("personaje");

  bitmap.close();

  return {
    width,
    height,
    orientation,
    dominantColors,
    brightness: Number(brightness.toFixed(3)),
    likelyPortrait,
    tags,
    analyzedAt: new Date().toISOString(),
  };
}

function getRegionBrightness(data: Uint8ClampedArray, w: number, h: number, radiusFraction: number): number {
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.max(1, Math.floor(Math.min(w, h) * radiusFraction));
  let sum = 0;
  let count = 0;
  for (let y = Math.max(0, cy - r); y < Math.min(h, cy + r); y++) {
    for (let x = Math.max(0, cx - r); x < Math.min(w, cx + r); x++) {
      const idx = (Math.floor(y) * w + Math.floor(x)) * 4;
      sum += (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      count++;
    }
  }
  return count > 0 ? sum / count / 255 : 0;
}

function getEdgeBrightness(data: Uint8ClampedArray, w: number, h: number): number {
  let sum = 0;
  let count = 0;
  const margin = Math.floor(Math.min(w, h) * 0.1);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const onEdge = x < margin || x >= w - margin || y < margin || y >= h - margin;
      if (!onEdge) continue;
      const idx = (y * w + x) * 4;
      sum += (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      count++;
    }
  }
  return count > 0 ? sum / count / 255 : 0;
}
