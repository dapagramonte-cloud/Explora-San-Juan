// CLIPSTUDIO AI ASSISTANT: interprete de instrucciones en lenguaje natural
// mediante reglas locales (sin conexion a un modelo de lenguaje externo). No
// pretende entender cualquier frase: reconoce los patrones de instrucciones
// de direccion/edicion descritos en el pliego y aplica los cambios
// correspondientes al proyecto. Si no reconoce la instruccion, lo indica en
// vez de simular una accion.

import type { Project, StylePresetId, TransitionType } from "@/types/project";
import { getStylePreset } from "@/data/stylePresets";
import { generateStoryboard } from "@/lib/storyboard";

export interface AssistantResponse {
  reply: string;
  patch?: (draft: Project) => void;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

const STYLE_KEYWORDS: Array<{ keywords: string[]; style: StylePresetId; label: string }> = [
  { keywords: ["romantic", "amor", "pareja"], style: "romantico", label: "romantico" },
  { keywords: ["cinemat", "pelicula", "estilo film"], style: "cinematico", label: "cinematografico" },
  { keywords: ["dramatic"], style: "dramatico", label: "dramatico" },
  { keywords: ["urbano nocturno", "noche", "santo domingo de noche", "ciudad de noche"], style: "urbano-nocturno", label: "urbano nocturno" },
  { keywords: ["tropical", "playa", "caribe"], style: "tropical", label: "tropical" },
  { keywords: ["elegante"], style: "elegante", label: "elegante" },
  { keywords: ["urbano", "calle", "hip hop", "trap"], style: "urbano", label: "urbano" },
  { keywords: ["performance", "actuacion", "concierto"], style: "performance", label: "performance" },
  { keywords: ["historia", "narrativ"], style: "narrativa", label: "historia narrativa" },
  { keywords: ["gospel", "iglesia"], style: "gospel", label: "gospel" },
  { keywords: ["inspiracion", "amanecer"], style: "inspiracional", label: "inspiracional" },
];

export function interpretCommand(rawText: string, project: Project): AssistantResponse {
  const text = normalize(rawText);

  if (!project.song) {
    return { reply: "Primero sube una cancion para que pueda analizarla y aplicar tus instrucciones." };
  }

  // Estilo visual
  for (const entry of STYLE_KEYWORDS) {
    if (entry.keywords.some((k) => text.includes(k))) {
      return {
        reply: `Listo, aplique el estilo "${entry.label}" al proyecto (colores, transiciones y movimientos por defecto).`,
        patch: (draft) => {
          const preset = getStylePreset(entry.style);
          draft.stylePresetId = entry.style;
          if (preset) draft.colorGrade = { ...preset.colorGrade };
        },
      };
    }
  }

  // Tonos calidos / frios
  if (text.includes("tono calid") || text.includes("calido")) {
    return {
      reply: "Ajuste la temperatura de color hacia tonos calidos.",
      patch: (draft) => { draft.colorGrade.temperature = Math.min(100, draft.colorGrade.temperature + 35); },
    };
  }
  if (text.includes("tono frio") || text.includes("mas frio")) {
    return {
      reply: "Ajuste la temperatura de color hacia tonos frios.",
      patch: (draft) => { draft.colorGrade.temperature = Math.max(-100, draft.colorGrade.temperature - 35); },
    };
  }

  // Version mas dramatica
  if (text.includes("mas dramatic")) {
    return {
      reply: "Aumente el contraste y reduci la saturacion para una version mas dramatica.",
      patch: (draft) => {
        draft.colorGrade.contrast = Math.min(100, draft.colorGrade.contrast + 20);
        draft.colorGrade.saturation = Math.max(-100, draft.colorGrade.saturation - 15);
        draft.colorGrade.exposure = Math.max(-100, draft.colorGrade.exposure - 10);
      },
    };
  }

  // Transiciones mas suaves
  if (text.includes("transicion") && (text.includes("suave") || text.includes("mas lenta"))) {
    return {
      reply: "Cambie las transiciones por disolvencias suaves en todas las escenas.",
      patch: (draft) => {
        draft.scenes.forEach((s) => {
          s.transitionOut = "disolvencia" as TransitionType;
          s.transitionDurationSec = Math.max(s.transitionDurationSec, 0.8);
        });
      },
    };
  }

  // Cortes/escenas mas rapidas en el estribillo/coro
  if ((text.includes("coro") || text.includes("estribillo")) && (text.includes("rapid") || text.includes("dinamic"))) {
    return {
      reply: "Reduci la duracion de las escenas del coro para un ritmo visual mas dinamico.",
      patch: (draft) => {
        draft.scenes
          .filter((s) => s.sectionLabel === "coro")
          .forEach((s) => { s.durationSec = Math.max(1.2, s.durationSec * 0.7); });
      },
    };
  }

  // Priorizar imagenes de personaje en el coro
  if (text.includes("cantante") && (text.includes("coro") || text.includes("principal"))) {
    const characterImages = project.images.filter((img) => img.analysis?.tags.includes("personaje"));
    if (characterImages.length === 0) {
      return { reply: "No detecte imagenes marcadas como personaje/artista principal para usarlas en los coros." };
    }
    return {
      reply: "Prioricé las imagenes del personaje principal en las escenas del coro.",
      patch: (draft) => {
        let i = 0;
        draft.scenes
          .filter((s) => s.sectionLabel === "coro")
          .forEach((s) => { s.imageId = characterImages[i % characterImages.length].id; i++; });
      },
    };
  }

  // Movimiento a las imagenes estaticas
  if (text.includes("movimiento") && text.includes("imagen")) {
    return {
      reply: "Active movimiento de camara en todas las escenas que estaban estaticas.",
      patch: (draft) => {
        draft.scenes.forEach((s) => { if (s.movement === "none") s.movement = "zoom-in"; });
      },
    };
  }

  // Formato vertical/horizontal/cuadrado
  if (text.includes("vertical") || text.includes("tiktok") || text.includes("reel")) {
    return { reply: "Cambie el formato a vertical 9:16.", patch: (draft) => { draft.aspectRatio = "9:16"; } };
  }
  if (text.includes("horizontal") || text.includes("youtube")) {
    return { reply: "Cambie el formato a horizontal 16:9.", patch: (draft) => { draft.aspectRatio = "16:9"; } };
  }
  if (text.includes("cuadrad") || text.includes("instagram")) {
    return { reply: "Cambie el formato a cuadrado 1:1.", patch: (draft) => { draft.aspectRatio = "1:1"; } };
  }

  // Sincronizacion labial
  if (text.includes("labios") || text.includes("lip sync") || text.includes("sincroniza")) {
    return {
      reply: "La sincronizacion labial requiere seleccionar una imagen y un fragmento de audio en el panel 'Sincronizacion labial', ya que depende de un proveedor de IA externo.",
    };
  }

  // Crear videoclip / hazme un videoclip
  if (text.includes("hazme un videoclip") || text.includes("crea un videoclip") || text.includes("crear videoclip")) {
    if (project.images.length === 0) {
      return { reply: "Necesito al menos una imagen para generar el videoclip. Sube imagenes en el panel Archivos." };
    }
    if (!project.song.analysis) {
      return { reply: "Aun estoy analizando la cancion, intenta de nuevo en unos segundos." };
    }
    return {
      reply: "Genere un storyboard automatico con el estilo actual del proyecto. Puedes revisarlo en el panel Escenas.",
      patch: (draft) => {
        const preset = getStylePreset(draft.stylePresetId);
        draft.scenes = generateStoryboard(draft.song!.analysis!.sections, draft.images, { stylePreset: preset });
      },
    };
  }

  return {
    reply:
      "No reconoci esa instruccion todavia. Puedo cambiar el estilo visual (romantico, cinematografico, dramatico, urbano nocturno, tropical...), la temperatura de color, el formato (vertical/horizontal/cuadrado), las transiciones, el ritmo de las escenas del coro y priorizar imagenes del personaje principal.",
  };
}

export function buildProjectContextSummary(project: Project): string {
  const parts: string[] = [];
  parts.push(`Cancion: ${project.info.songTitle || "sin titulo"}`);
  if (project.song?.analysis) parts.push(`Duracion: ${Math.round(project.song.analysis.durationSec)}s`);
  parts.push(`Imagenes: ${project.images.length}`);
  parts.push(`Escenas: ${project.scenes.length}`);
  parts.push(`Estilo: ${project.stylePresetId ?? "ninguno"}`);
  parts.push(`Formato: ${project.aspectRatio}`);
  return parts.join(" · ");
}
