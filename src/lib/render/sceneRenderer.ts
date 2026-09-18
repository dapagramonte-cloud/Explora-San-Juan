import type { ColorGrade, TransitionType } from "@/types/project";
import type { LaidOutScene } from "@/lib/timelineLayout";
import { computeKenBurnsRect } from "./kenburns";
import { colorGradeCssFilter, drawFilmGrain, drawTemperatureOverlay, drawVignette } from "./colorGrade";

export interface RenderEffects {
  vignette: boolean;
  grain: boolean;
}

export interface ActiveLyric {
  text: string;
  style: "minimalista" | "karaoke" | "cinematografico" | "moderno" | "elegante";
  position: "arriba" | "centro" | "abajo";
  color: string;
  fontSize: number;
  showBackground: boolean;
}

let layerA: HTMLCanvasElement | null = null;
let layerB: HTMLCanvasElement | null = null;

function getLayer(which: "a" | "b", w: number, h: number): HTMLCanvasElement {
  const ref = which === "a" ? layerA : layerB;
  if (ref && ref.width === w && ref.height === h) return ref;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  if (which === "a") layerA = c;
  else layerB = c;
  return c;
}

function drawSceneImage(
  target: CanvasRenderingContext2D,
  bitmap: ImageBitmap,
  scene: LaidOutScene,
  w: number,
  h: number,
  localT: number,
  colorGrade: ColorGrade
) {
  const rect = computeKenBurnsRect(bitmap.width, bitmap.height, w, h, scene.movement, scene.movementIntensity, localT);
  target.save();
  target.filter = colorGradeCssFilter(colorGrade);
  target.drawImage(bitmap, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, w, h);
  target.filter = "none";
  target.restore();
  drawTemperatureOverlay(target, w, h, colorGrade);
}

export interface SceneTimingResult {
  scene: LaidOutScene;
  localT: number;
  next?: LaidOutScene;
  nextLocalT?: number;
  transitionAlpha?: number;
  transitionType?: TransitionType;
}

export function resolveSceneAtTime(scenes: LaidOutScene[], t: number): SceneTimingResult | null {
  if (scenes.length === 0) return null;
  const sorted = scenes;
  let idx = sorted.findIndex((s) => t >= s.layoutStartSec && t < s.layoutStartSec + s.durationSec);
  if (idx === -1) {
    idx = t < sorted[0].layoutStartSec ? 0 : sorted.length - 1;
  }
  const scene = sorted[idx];
  const localT = Math.min(1, Math.max(0, (t - scene.layoutStartSec) / Math.max(0.001, scene.durationSec)));
  const next = sorted[idx + 1];

  if (next && scene.transitionOut !== "corte") {
    const transFrac = Math.min(0.9, scene.transitionDurationSec / Math.max(0.5, scene.durationSec));
    if (localT > 1 - transFrac) {
      const transitionAlpha = (localT - (1 - transFrac)) / transFrac;
      const nextLocalT = Math.min(1, (transitionAlpha * scene.transitionDurationSec) / Math.max(0.5, next.durationSec));
      return { scene, localT, next, nextLocalT, transitionAlpha, transitionType: scene.transitionOut };
    }
  }

  return { scene, localT };
}

function compositeTransition(
  main: CanvasRenderingContext2D,
  a: HTMLCanvasElement,
  b: HTMLCanvasElement,
  alpha: number,
  type: TransitionType,
  w: number,
  h: number
) {
  main.clearRect(0, 0, w, h);
  switch (type) {
    case "flash": {
      main.drawImage(a, 0, 0);
      main.globalAlpha = alpha;
      main.drawImage(b, 0, 0);
      main.globalAlpha = 1;
      const flash = Math.sin(alpha * Math.PI) * 0.85;
      main.fillStyle = `rgba(255,255,255,${flash})`;
      main.fillRect(0, 0, w, h);
      break;
    }
    case "slide": {
      main.drawImage(a, 0, 0);
      main.save();
      main.translate((1 - alpha) * w, 0);
      main.drawImage(b, 0, 0);
      main.restore();
      break;
    }
    case "zoom": {
      main.drawImage(a, 0, 0);
      const scale = 0.7 + alpha * 0.3;
      main.save();
      main.globalAlpha = alpha;
      main.translate(w / 2, h / 2);
      main.scale(scale, scale);
      main.translate(-w / 2, -h / 2);
      main.drawImage(b, 0, 0);
      main.restore();
      main.globalAlpha = 1;
      break;
    }
    case "light-leak": {
      main.drawImage(a, 0, 0);
      main.globalAlpha = alpha;
      main.drawImage(b, 0, 0);
      main.globalAlpha = 1;
      const leak = Math.sin(alpha * Math.PI);
      const grad = main.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, `rgba(255,200,120,0)`);
      grad.addColorStop(0.5, `rgba(255,200,120,${leak * 0.4})`);
      grad.addColorStop(1, `rgba(255,200,120,0)`);
      main.fillStyle = grad;
      main.fillRect(0, 0, w, h);
      break;
    }
    case "blur": {
      main.filter = `blur(${Math.sin(alpha * Math.PI) * 12}px)`;
      main.drawImage(a, 0, 0);
      main.globalAlpha = alpha;
      main.drawImage(b, 0, 0);
      main.globalAlpha = 1;
      main.filter = "none";
      break;
    }
    case "fundido":
    case "disolvencia":
    case "cinematic-fade":
    default: {
      main.drawImage(a, 0, 0);
      main.globalAlpha = alpha;
      main.drawImage(b, 0, 0);
      main.globalAlpha = 1;
      break;
    }
  }
}

function drawLyricOverlay(ctx: CanvasRenderingContext2D, w: number, h: number, lyric: ActiveLyric) {
  ctx.save();
  const fontSize = Math.round((lyric.fontSize / 1080) * h);
  ctx.font = `700 ${fontSize}px Inter, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const y = lyric.position === "arriba" ? h * 0.12 : lyric.position === "centro" ? h * 0.5 : h * 0.88;

  if (lyric.showBackground) {
    const metrics = ctx.measureText(lyric.text);
    const paddingX = fontSize * 0.6;
    const paddingY = fontSize * 0.4;
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(w / 2 - metrics.width / 2 - paddingX, y - fontSize / 2 - paddingY, metrics.width + paddingX * 2, fontSize + paddingY * 2);
  }

  ctx.lineWidth = fontSize * 0.08;
  ctx.strokeStyle = "rgba(0,0,0,0.7)";
  ctx.strokeText(lyric.text, w / 2, y);
  ctx.fillStyle = lyric.color;
  ctx.fillText(lyric.text, w / 2, y);
  ctx.restore();
}

export interface RenderFrameParams {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  scenes: LaidOutScene[];
  images: Map<string, ImageBitmap>;
  colorGrade: ColorGrade;
  t: number;
  effects: RenderEffects;
  activeLyric?: ActiveLyric | null;
}

export function renderFrame(params: RenderFrameParams) {
  const { ctx, w, h, scenes, images, colorGrade, t, effects, activeLyric } = params;
  const timing = resolveSceneAtTime(scenes, t);
  ctx.clearRect(0, 0, w, h);

  if (!timing) {
    ctx.fillStyle = "#0b0b0f";
    ctx.fillRect(0, 0, w, h);
    return;
  }

  const currentBitmap = images.get(timing.scene.imageId);

  if (timing.next && timing.transitionAlpha !== undefined && timing.transitionType) {
    const nextBitmap = images.get(timing.next.imageId);
    const a = getLayer("a", w, h);
    const b = getLayer("b", w, h);
    const actx = a.getContext("2d")!;
    const bctx = b.getContext("2d")!;
    actx.clearRect(0, 0, w, h);
    bctx.clearRect(0, 0, w, h);
    if (currentBitmap) drawSceneImage(actx, currentBitmap, timing.scene, w, h, timing.localT, colorGrade);
    if (nextBitmap && timing.next) drawSceneImage(bctx, nextBitmap, timing.next, w, h, timing.nextLocalT ?? 0, colorGrade);
    compositeTransition(ctx, a, b, timing.transitionAlpha, timing.transitionType, w, h);
  } else if (currentBitmap) {
    drawSceneImage(ctx, currentBitmap, timing.scene, w, h, timing.localT, colorGrade);
  }

  if (effects.vignette) drawVignette(ctx, w, h);
  if (effects.grain) drawFilmGrain(ctx, w, h);
  if (activeLyric) drawLyricOverlay(ctx, w, h, activeLyric);
}
