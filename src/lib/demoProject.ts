// Proyecto de demostracion (seccion 42 del pliego). Genera una cancion
// sintetica real (renderizada con Web Audio API, no un archivo simulado),
// 8 imagenes de ejemplo generadas por canvas, y ejecuta el mismo pipeline de
// analisis + storyboard que usaria un proyecto real, para que la app se
// pueda probar de inmediato sin archivos propios.

import { createEmptyProject, type LyricLine } from "@/types/project";
import { loadAllProjects, saveProject } from "@/lib/db";
import { storageProvider } from "@/providers/StorageProvider";
import { audioAnalysisProvider } from "@/providers/AudioAnalysisProvider";
import { analyzeImage } from "@/lib/imageAnalysis";
import { audioBufferToWavBlob } from "@/lib/wavEncoder";
import { generateStoryboard } from "@/lib/storyboard";
import { getStylePreset } from "@/data/stylePresets";
import type { ImageAsset } from "@/types/project";

const DEMO_DURATION = 210; // 3:30

async function synthesizeDemoSong(): Promise<Blob> {
  const sampleRate = 44100;
  const ctx = new OfflineAudioContext(2, sampleRate * DEMO_DURATION, sampleRate);

  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, 0);
  master.connect(ctx.destination);

  // Perfil de intensidad por seccion: [inicio, fin, volumen]
  const profile: Array<[number, number, number]> = [
    [0, 12, 0.15],
    [12, 46, 0.35],
    [46, 74, 0.8],
    [74, 108, 0.35],
    [108, 136, 0.8],
    [136, 156, 0.2],
    [156, 192, 0.9],
    [192, 210, 0.1],
  ];
  for (const [start, end, vol] of profile) {
    master.gain.linearRampToValueAtTime(vol, start + 1.5);
    master.gain.setValueAtTime(vol, end - 1.5);
  }
  master.gain.linearRampToValueAtTime(0.0001, DEMO_DURATION);

  // Pad armonico de fondo
  const padFreqs = [110, 164.81, 220];
  for (const freq of padFreqs) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.value = 0.18;
    osc.connect(gain).connect(master);
    osc.start(0);
    osc.stop(DEMO_DURATION);
  }

  // Linea ritmica (pulsos tipo bajo) para dar sensacion de estructura musical
  const bassNotes = [55, 61.74, 65.41, 73.42];
  let t = 8;
  let noteIdx = 0;
  while (t < DEMO_DURATION - 2) {
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.value = bassNotes[noteIdx % bassNotes.length];
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.05);
    gain.gain.linearRampToValueAtTime(0.0001, t + 0.4);
    osc.connect(gain).connect(master);
    osc.start(t);
    osc.stop(t + 0.45);
    noteIdx++;
    t += 0.5;
  }

  const rendered = await ctx.startRendering();
  return audioBufferToWavBlob(rendered);
}

function generatePlaceholderImage(index: number, aspectHint: "h" | "v"): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = aspectHint === "h" ? 1280 : 720;
  canvas.height = aspectHint === "h" ? 720 : 1280;
  const ctx = canvas.getContext("2d")!;

  const hues = [220, 280, 320, 10, 40, 190, 260, 340];
  const hue = hues[index % hues.length];
  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grad.addColorStop(0, `hsl(${hue}, 60%, 18%)`);
  grad.addColorStop(1, `hsl(${(hue + 60) % 360}, 55%, 10%)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255,255,255,0.08)";
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, 80 + Math.random() * 160, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "bold 48px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`Escena demo ${index + 1}`, canvas.width / 2, canvas.height / 2);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("No se pudo generar imagen demo"))), "image/png");
  });
}

const DEMO_LYRICS: Array<[number, number, string]> = [
  [12, 16, "Bajo la luz de la ciudad"],
  [16, 20, "camino sin mirar atras"],
  [46, 50, "Y en el coro todo cambia"],
  [50, 54, "el ritmo empieza a subir"],
  [108, 112, "Otra vez el coro suena"],
  [112, 116, "y no puedo mas que sentir"],
  [156, 160, "Esto es el coro final"],
  [160, 164, "la historia va a terminar"],
];

// Evita crear el proyecto demo dos veces cuando React StrictMode invoca el
// efecto de montaje por duplicado en desarrollo (misma carga de pagina).
let seedPromise: Promise<void> | null = null;

export function ensureDemoProject(): Promise<void> {
  if (!seedPromise) {
    seedPromise = (async () => {
      const existing = await loadAllProjects();
      if (existing.length > 0) return;
      await createDemoProject();
    })();
  }
  return seedPromise;
}

async function createDemoProject(): Promise<void> {

  const project = createEmptyProject({
    projectName: "Demo Music",
    songTitle: "Demo Music",
    artistName: "CLIPSTUDIO AI",
    genre: "Pop",
    description: "Proyecto de demostracion generado automaticamente para probar la aplicacion.",
  });
  project.stylePresetId = "cinematico";
  project.colorGrade = { ...getStylePreset("cinematico")!.colorGrade };

  const songBlob = await synthesizeDemoSong();
  const songBlobKey = await storageProvider.upload("song", songBlob);
  const analysisResult = await audioAnalysisProvider.analyze(songBlob);

  project.song = {
    id: crypto.randomUUID(),
    fileName: "demo-music.wav",
    mimeType: "audio/wav",
    sizeBytes: songBlob.size,
    blobKey: songBlobKey,
    analysis: analysisResult.status === "ok" ? analysisResult.data! : null,
  };

  const images: ImageAsset[] = [];
  for (let i = 0; i < 8; i++) {
    const blob = await generatePlaceholderImage(i, i % 2 === 0 ? "h" : "v");
    const blobKey = await storageProvider.upload("image", blob);
    const analysis = await analyzeImage(blob);
    images.push({
      id: crypto.randomUUID(),
      fileName: `demo-${i + 1}.png`,
      mimeType: "image/png",
      sizeBytes: blob.size,
      blobKey,
      analysis,
      isReferenceCharacter: false,
    });
  }
  project.images = images;

  if (project.song.analysis) {
    const preset = getStylePreset(project.stylePresetId);
    project.scenes = generateStoryboard(project.song.analysis.sections, project.images, { stylePreset: preset });
  }

  project.lyrics.enabled = true;
  project.lyrics.lines = DEMO_LYRICS.map(
    ([start, end, text]): LyricLine => ({ id: crypto.randomUUID(), start, end, text })
  );

  await saveProject(project);
}
