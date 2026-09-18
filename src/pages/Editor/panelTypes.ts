export type PanelId = "archivos" | "escenas" | "efectos" | "subtitulos" | "lipsync" | "ia" | "ajustes";

export type Selection =
  | { type: "scene"; id: string }
  | { type: "image"; id: string }
  | { type: "audio" }
  | null;
