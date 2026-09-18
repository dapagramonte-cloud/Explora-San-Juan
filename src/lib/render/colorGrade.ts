import type { ColorGrade } from "@/types/project";

export function colorGradeCssFilter(cg: ColorGrade): string {
  const brightness = 1 + cg.exposure / 200;
  const contrast = 1 + cg.contrast / 150;
  const saturate = 1 + Math.max(-100, cg.saturation) / 100;
  return `brightness(${brightness.toFixed(3)}) contrast(${contrast.toFixed(3)}) saturate(${Math.max(0, saturate).toFixed(3)})`;
}

export function drawTemperatureOverlay(ctx: CanvasRenderingContext2D, w: number, h: number, cg: ColorGrade) {
  if (cg.temperature === 0 && cg.shadows === 0 && cg.highlights === 0) return;
  ctx.save();
  ctx.globalCompositeOperation = "soft-light";

  if (cg.temperature !== 0) {
    const alpha = Math.min(1, Math.abs(cg.temperature) / 100) * 0.45;
    ctx.fillStyle = cg.temperature > 0 ? `rgba(255,170,60,${alpha})` : `rgba(70,140,255,${alpha})`;
    ctx.fillRect(0, 0, w, h);
  }

  if (cg.shadows !== 0) {
    const alpha = Math.min(1, Math.abs(cg.shadows) / 100) * 0.35;
    const grad = ctx.createLinearGradient(0, h, 0, h * 0.4);
    grad.addColorStop(0, cg.shadows < 0 ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha})`);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  if (cg.highlights !== 0) {
    const alpha = Math.min(1, Math.abs(cg.highlights) / 100) * 0.3;
    const grad = ctx.createLinearGradient(0, 0, 0, h * 0.6);
    grad.addColorStop(0, cg.highlights < 0 ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha})`);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  ctx.restore();
}

export function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number, strength = 0.35) {
  ctx.save();
  const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

let grainTile: HTMLCanvasElement | null = null;
function getGrainTile(): HTMLCanvasElement {
  if (grainTile) return grainTile;
  const size = 128;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  const imageData = ctx.createImageData(size, size);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const v = Math.floor(Math.random() * 255);
    imageData.data[i] = v;
    imageData.data[i + 1] = v;
    imageData.data[i + 2] = v;
    imageData.data[i + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  grainTile = c;
  return c;
}

export function drawFilmGrain(ctx: CanvasRenderingContext2D, w: number, h: number, opacity = 0.05) {
  const tile = getGrainTile();
  const pattern = ctx.createPattern(tile, "repeat");
  if (!pattern) return;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.globalCompositeOperation = "overlay";
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}
