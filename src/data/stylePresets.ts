import type { StylePreset } from "@/types/project";

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: "cinematico",
    label: "Cinematico",
    emoji: "🎬",
    colorGrade: { preset: "cinematic", exposure: -5, contrast: 15, saturation: -5, temperature: -5, shadows: -10, highlights: -5, sharpness: 20 },
    defaultTransition: "cinematic-fade",
    movementBias: "media",
  },
  {
    id: "romantico",
    label: "Romantico",
    emoji: "❤️",
    colorGrade: { preset: "romantic", exposure: 5, contrast: 5, saturation: 10, temperature: 15, shadows: 5, highlights: 5, sharpness: 10 },
    defaultTransition: "disolvencia",
    movementBias: "suave",
  },
  {
    id: "urbano-nocturno",
    label: "Urbano nocturno",
    emoji: "🌃",
    colorGrade: { preset: "dark", exposure: -10, contrast: 20, saturation: 5, temperature: -15, shadows: -15, highlights: 0, sharpness: 25 },
    defaultTransition: "flash",
    movementBias: "intensa",
  },
  {
    id: "tropical",
    label: "Tropical",
    emoji: "🌴",
    colorGrade: { preset: "warm", exposure: 10, contrast: 10, saturation: 25, temperature: 20, shadows: 0, highlights: 10, sharpness: 15 },
    defaultTransition: "slide",
    movementBias: "media",
  },
  {
    id: "dramatico",
    label: "Dramatico",
    emoji: "💔",
    colorGrade: { preset: "dark", exposure: -15, contrast: 25, saturation: -15, temperature: -10, shadows: -20, highlights: -10, sharpness: 15 },
    defaultTransition: "blur",
    movementBias: "media",
  },
  {
    id: "elegante",
    label: "Elegante",
    emoji: "✨",
    colorGrade: { preset: "cinematic", exposure: 0, contrast: 10, saturation: -10, temperature: 0, shadows: -5, highlights: 5, sharpness: 15 },
    defaultTransition: "disolvencia",
    movementBias: "suave",
  },
  {
    id: "urbano",
    label: "Urbano",
    emoji: "🔥",
    colorGrade: { preset: "urban", exposure: 0, contrast: 20, saturation: 15, temperature: -5, shadows: -10, highlights: 0, sharpness: 30 },
    defaultTransition: "flash",
    movementBias: "intensa",
  },
  {
    id: "performance",
    label: "Performance",
    emoji: "🎤",
    colorGrade: { preset: "natural", exposure: 5, contrast: 15, saturation: 10, temperature: 0, shadows: -5, highlights: 5, sharpness: 20 },
    defaultTransition: "corte",
    movementBias: "intensa",
  },
  {
    id: "narrativa",
    label: "Historia narrativa",
    emoji: "📖",
    colorGrade: { preset: "natural", exposure: 0, contrast: 5, saturation: 0, temperature: 5, shadows: 0, highlights: 0, sharpness: 10 },
    defaultTransition: "fundido",
    movementBias: "suave",
  },
  {
    id: "gospel",
    label: "Gospel",
    emoji: "⛪",
    colorGrade: { preset: "warm", exposure: 10, contrast: 10, saturation: 5, temperature: 10, shadows: 5, highlights: 15, sharpness: 10 },
    defaultTransition: "disolvencia",
    movementBias: "suave",
  },
  {
    id: "inspiracional",
    label: "Inspiracional",
    emoji: "🌅",
    colorGrade: { preset: "warm", exposure: 15, contrast: 10, saturation: 10, temperature: 15, shadows: 5, highlights: 15, sharpness: 10 },
    defaultTransition: "cinematic-fade",
    movementBias: "suave",
  },
];

export function getStylePreset(id: string | null): StylePreset | undefined {
  return STYLE_PRESETS.find((s) => s.id === id);
}
