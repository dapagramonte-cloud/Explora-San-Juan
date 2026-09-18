// Modelo de datos central de CLIPSTUDIO AI

export type Genre =
  | "Pop"
  | "Balada"
  | "Reggaeton"
  | "Dembow"
  | "Bachata"
  | "Salsa"
  | "Rock"
  | "Hip Hop"
  | "Gospel"
  | "Musica urbana"
  | "Otro";

export type AspectRatio = "16:9" | "9:16" | "1:1";

export type ProjectStatus = "Borrador" | "Procesando" | "Listo" | "Error";

export type ExperienceMode = "simple" | "creativo" | "profesional";

export type StylePresetId =
  | "cinematico"
  | "romantico"
  | "urbano-nocturno"
  | "tropical"
  | "dramatico"
  | "elegante"
  | "urbano"
  | "performance"
  | "narrativa"
  | "gospel"
  | "inspiracional";

export interface StylePreset {
  id: StylePresetId;
  label: string;
  emoji: string;
  colorGrade: ColorGrade;
  defaultTransition: TransitionType;
  movementBias: MovementIntensity;
}

export type CameraMovementType =
  | "none"
  | "zoom-in"
  | "zoom-out"
  | "pan-left"
  | "pan-right"
  | "tilt-up"
  | "tilt-down"
  | "diagonal"
  | "dolly-in"
  | "dolly-out"
  | "floating"
  | "cinematic";

export type MovementIntensity = "suave" | "media" | "intensa";

export type TransitionType =
  | "corte"
  | "fundido"
  | "disolvencia"
  | "flash"
  | "blur"
  | "zoom"
  | "slide"
  | "light-leak"
  | "cinematic-fade";

export interface ColorGrade {
  preset:
    | "cinematic"
    | "warm"
    | "cold"
    | "romantic"
    | "dark"
    | "vintage"
    | "urban"
    | "natural"
    | "custom";
  exposure: number; // -100..100
  contrast: number; // -100..100
  saturation: number; // -100..100
  temperature: number; // -100..100
  shadows: number; // -100..100
  highlights: number; // -100..100
  sharpness: number; // 0..100
}

export const DEFAULT_COLOR_GRADE: ColorGrade = {
  preset: "natural",
  exposure: 0,
  contrast: 0,
  saturation: 0,
  temperature: 0,
  shadows: 0,
  highlights: 0,
  sharpness: 0,
};

export type SectionLabel =
  | "intro"
  | "verso"
  | "coro"
  | "puente"
  | "outro"
  | "silencio"
  | "otro";

export interface SongSection {
  id: string;
  label: SectionLabel;
  start: number; // seconds
  end: number; // seconds
  intensity: number; // 0..1 estimado por energia RMS
  manuallyEdited: boolean;
}

export interface EnergyEnvelope {
  values: number[]; // RMS normalizado 0..1
  hopSeconds: number; // periodo entre muestras
}

export interface SongAnalysis {
  durationSec: number;
  bpm: number | null;
  waveformPeaks: number[]; // normalizado 0..1, resolucion fija (visualizacion)
  energyEnvelope: EnergyEnvelope; // resolucion fina, usada para animar el canto
  sections: SongSection[];
  analyzedAt: string;
}

export interface Song {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  blobKey: string; // clave en IndexedDB
  objectUrl?: string;
  analysis: SongAnalysis | null;
}

export type ImageTag =
  | "artista-principal"
  | "personaje"
  | "pareja"
  | "exterior"
  | "interior"
  | "nocturno"
  | "diurno"
  | "ciudad"
  | "naturaleza"
  | "primer-plano"
  | "plano-general";

// Puntos clave de la boca/mandibula normalizados 0..1 respecto a la imagen
// original, obtenidos con deteccion facial real (blazeface + facemesh,
// ejecutados localmente en el navegador). Se usan para animar el canto.
export interface FaceLandmarks {
  leftMouthX: number;
  rightMouthX: number;
  upperLipY: number;
  chinY: number;
  centerX: number;
  centerY: number;
}

export interface ImageAnalysis {
  width: number;
  height: number;
  orientation: "horizontal" | "vertical" | "cuadrada";
  dominantColors: string[];
  brightness: number; // 0..1
  likelyPortrait: boolean; // heuristica local (proporcion/centro de interes)
  faces: FaceLandmarks[]; // deteccion facial real; vacio si no se detecto ninguna cara
  tags: ImageTag[];
  analyzedAt: string;
}

export interface ImageAsset {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  blobKey: string;
  objectUrl?: string;
  analysis: ImageAnalysis | null;
  isReferenceCharacter: boolean;
  characterId?: string;
}

export interface CharacterRef {
  id: string;
  name: string;
  description: string;
  referenceImageId: string;
}

export interface LyricLine {
  id: string;
  start: number;
  end: number;
  text: string;
}

export type LyricsStyle = "minimalista" | "karaoke" | "cinematografico" | "moderno" | "elegante";

export interface LyricsConfig {
  enabled: boolean;
  lines: LyricLine[];
  style: LyricsStyle;
  fontSize: number;
  position: "arriba" | "centro" | "abajo";
  color: string;
  showBackground: boolean;
}

export interface Scene {
  id: string;
  order: number;
  imageId: string;
  sectionLabel: SectionLabel;
  startSec: number;
  durationSec: number;
  movement: CameraMovementType;
  movementIntensity: MovementIntensity;
  transitionOut: TransitionType;
  transitionDurationSec: number;
  description: string;
  aiGenerated: boolean;
  lipSyncEnabled: boolean;
}

export interface ExportSettings {
  resolutionPreset: "1080p" | "4k" | "vertical-1080p";
  width: number;
  height: number;
  fps: 24 | 30 | 60;
  videoBitrateKbps: number;
  format: "mp4-h264";
  audioCodec: "aac";
}

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  resolutionPreset: "1080p",
  width: 1920,
  height: 1080,
  fps: 30,
  videoBitrateKbps: 8000,
  format: "mp4-h264",
  audioCodec: "aac",
};

export interface ProjectInfo {
  projectName: string;
  songTitle: string;
  artistName: string;
  genre: Genre;
  description: string;
}

export interface VisualEffects {
  vignette: boolean;
  grain: boolean;
}

export interface Project {
  id: string;
  info: ProjectInfo;
  status: ProjectStatus;
  mode: ExperienceMode;
  aspectRatio: AspectRatio;
  stylePresetId: StylePresetId | null;
  colorGrade: ColorGrade;
  effects: VisualEffects;
  song: Song | null;
  images: ImageAsset[];
  characters: CharacterRef[];
  scenes: Scene[];
  lyrics: LyricsConfig;
  exportSettings: ExportSettings;
  autoSyncEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  thumbnailDataUrl?: string;
}

export function createEmptyProject(info: ProjectInfo): Project {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    info,
    status: "Borrador",
    mode: "simple",
    aspectRatio: "16:9",
    stylePresetId: null,
    colorGrade: { ...DEFAULT_COLOR_GRADE },
    effects: { vignette: false, grain: false },
    song: null,
    images: [],
    characters: [],
    scenes: [],
    lyrics: {
      enabled: false,
      lines: [],
      style: "moderno",
      fontSize: 42,
      position: "abajo",
      color: "#ffffff",
      showBackground: true,
    },
    exportSettings: { ...DEFAULT_EXPORT_SETTINGS },
    autoSyncEnabled: true,
    createdAt: now,
    updatedAt: now,
  };
}
