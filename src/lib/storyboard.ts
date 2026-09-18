// Generador automatico de storyboard (secciones 9 y 10 del pliego).
// A partir del analisis real de la cancion (duracion, secciones, intensidad)
// y las imagenes disponibles, construye una linea de escenas con duracion,
// movimiento de camara y transicion adaptados al ritmo de cada seccion.

import type {
  CameraMovementType,
  ImageAsset,
  MovementIntensity,
  Scene,
  SectionLabel,
  SongSection,
  StylePreset,
  TransitionType,
} from "@/types/project";

const MOVEMENTS_BY_INTENSITY: Record<"baja" | "media" | "alta", CameraMovementType[]> = {
  baja: ["pan-left", "pan-right", "floating", "tilt-up", "zoom-out"],
  media: ["zoom-in", "dolly-in", "diagonal", "cinematic", "tilt-down"],
  alta: ["zoom-in", "dolly-in", "diagonal", "cinematic"],
};

const TRANSITIONS_BY_INTENSITY: Record<"baja" | "media" | "alta", TransitionType[]> = {
  baja: ["fundido", "disolvencia", "cinematic-fade"],
  media: ["disolvencia", "slide", "blur"],
  alta: ["corte", "flash", "zoom"],
};

function bucketIntensity(intensity: number): "baja" | "media" | "alta" {
  if (intensity < 0.35) return "baja";
  if (intensity < 0.7) return "media";
  return "alta";
}

function sceneTargetDuration(section: SongSection): number {
  const bucket = bucketIntensity(section.intensity);
  if (section.label === "silencio") return 5;
  if (bucket === "alta") return 3.2;
  if (bucket === "media") return 4.5;
  return 6.5;
}

function movementIntensityFor(section: SongSection): MovementIntensity {
  const bucket = bucketIntensity(section.intensity);
  if (bucket === "alta") return "intensa";
  if (bucket === "media") return "media";
  return "suave";
}

function pickMovement(section: SongSection, seed: number): CameraMovementType {
  const bucket = bucketIntensity(section.intensity);
  const options = MOVEMENTS_BY_INTENSITY[bucket];
  return options[seed % options.length];
}

function pickTransition(section: SongSection, style: StylePreset | undefined, seed: number): TransitionType {
  if (style && seed % 3 === 0) return style.defaultTransition;
  const bucket = bucketIntensity(section.intensity);
  const options = TRANSITIONS_BY_INTENSITY[bucket];
  return options[seed % options.length];
}

function describeScene(section: SongSection, image: ImageAsset, index: number): string {
  const sectionText: Record<SectionLabel, string> = {
    intro: "Plano de apertura, ambiente pausado",
    verso: "Escena narrativa que acompaña la historia",
    coro: "Corte dinamico de mayor intensidad visual",
    puente: "Plano largo, transicion emocional",
    outro: "Cierre cinematografico",
    silencio: "Pausa visual, transicion suave",
    otro: "Escena",
  };
  const tagText = image.analysis?.tags.includes("personaje")
    ? " con el personaje principal en encuadre"
    : "";
  return `${sectionText[section.label]}${tagText} (imagen ${index + 1}).`;
}

export interface StoryboardOptions {
  stylePreset?: StylePreset;
}

export function generateStoryboard(
  sections: SongSection[],
  images: ImageAsset[],
  options: StoryboardOptions = {}
): Scene[] {
  if (images.length === 0 || sections.length === 0) return [];

  const priorityImages = images.filter((img) => img.analysis?.tags.includes("personaje"));
  const otherImages = images.filter((img) => !img.analysis?.tags.includes("personaje"));
  const orderedImages = priorityImages.length > 0 ? [...priorityImages, ...otherImages] : images;

  const scenes: Scene[] = [];
  let imageCursor = 0;
  let globalOrder = 0;

  for (const section of sections) {
    const sectionDuration = Math.max(0, section.end - section.start);
    if (sectionDuration <= 0) continue;

    const target = sceneTargetDuration(section);
    let sceneCount = Math.max(1, Math.round(sectionDuration / target));
    // Priorizar mas imagenes distintas en coros/versos si hay banco suficiente
    if (section.label === "coro") {
      sceneCount = Math.min(sceneCount, Math.max(1, images.length));
    }

    const perSceneDuration = sectionDuration / sceneCount;

    for (let i = 0; i < sceneCount; i++) {
      const image = orderedImages[imageCursor % orderedImages.length];
      imageCursor++;

      const start = section.start + i * perSceneDuration;
      const isLast = i === sceneCount - 1;
      const duration = isLast
        ? section.end - start
        : perSceneDuration;

      const seed = globalOrder;
      scenes.push({
        id: crypto.randomUUID(),
        order: globalOrder,
        imageId: image.id,
        sectionLabel: section.label,
        startSec: Number(start.toFixed(2)),
        durationSec: Number(Math.max(0.5, duration).toFixed(2)),
        movement: section.label === "silencio" ? "none" : pickMovement(section, seed),
        movementIntensity: movementIntensityFor(section),
        transitionOut: pickTransition(section, options.stylePreset, seed),
        transitionDurationSec: bucketIntensity(section.intensity) === "alta" ? 0.25 : 0.6,
        description: describeScene(section, image, imageCursor - 1),
        aiGenerated: false,
        lipSyncEnabled: false,
      });
      globalOrder++;
    }
  }

  return scenes;
}
