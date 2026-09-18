import { create } from "zustand";
import type {
  AspectRatio,
  ColorGrade,
  ExperienceMode,
  ImageAsset,
  LyricLine,
  LyricsConfig,
  Project,
  ProjectInfo,
  Scene,
  StylePresetId,
} from "@/types/project";
import { createEmptyProject } from "@/types/project";
import { deleteProject, loadAllProjects, loadProject, saveProject } from "@/lib/db";
import { storageProvider } from "@/providers/StorageProvider";
import { audioAnalysisProvider } from "@/providers/AudioAnalysisProvider";
import { analyzeImage } from "@/lib/imageAnalysis";
import { generateStoryboard } from "@/lib/storyboard";
import { getStylePreset } from "@/data/stylePresets";

type SaveStatus = "idle" | "guardando" | "guardado" | "error";

interface HistoryEntry {
  project: Project;
}

interface ProjectStoreState {
  projects: Project[];
  currentProject: Project | null;
  saveStatus: SaveStatus;
  isAnalyzingSong: boolean;
  isAnalyzingImages: boolean;
  past: HistoryEntry[];
  future: HistoryEntry[];

  refreshProjects(): Promise<void>;
  createProject(info: ProjectInfo): Promise<Project>;
  openProject(id: string): Promise<void>;
  closeProject(): void;
  removeProject(id: string): Promise<void>;
  duplicateProject(id: string): Promise<void>;

  patch(recipe: (draft: Project) => void, opts?: { history?: boolean }): void;
  undo(): void;
  redo(): void;

  uploadSong(file: File): Promise<void>;
  updateSongSection(id: string, patch: Partial<import("@/types/project").SongSection>): void;
  addImages(files: File[]): Promise<void>;
  removeImage(id: string): void;
  reorderImages(orderedIds: string[]): void;

  setStylePreset(id: StylePresetId): void;
  setAspectRatio(ratio: AspectRatio): void;
  setMode(mode: ExperienceMode): void;
  setColorGrade(patch: Partial<ColorGrade>): void;
  setEffect(key: "vignette" | "grain", value: boolean): void;

  autoGenerateStoryboard(): void;
  updateScene(id: string, patch: Partial<Scene>): void;
  removeScene(id: string): void;
  duplicateScene(id: string): void;
  reorderScenes(orderedIds: string[]): void;

  setLyricsConfig(patch: Partial<Omit<LyricsConfig, "lines">>): void;
  setLyricLines(lines: LyricLine[]): void;
  addLyricLine(): void;
  updateLyricLine(id: string, patch: Partial<LyricLine>): void;
  removeLyricLine(id: string): void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleAutosave(get: () => ProjectStoreState, set: (p: Partial<ProjectStoreState>) => void) {
  if (saveTimer) clearTimeout(saveTimer);
  set({ saveStatus: "guardando" });
  saveTimer = setTimeout(async () => {
    const project = get().currentProject;
    if (!project) return;
    try {
      await saveProject(project);
      set({ saveStatus: "guardado" });
    } catch {
      set({ saveStatus: "error" });
    }
  }, 700);
}

export const useProjectStore = create<ProjectStoreState>((set, get) => ({
  projects: [],
  currentProject: null,
  saveStatus: "idle",
  isAnalyzingSong: false,
  isAnalyzingImages: false,
  past: [],
  future: [],

  async refreshProjects() {
    const projects = await loadAllProjects();
    projects.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    set({ projects });
  },

  async createProject(info) {
    const project = createEmptyProject(info);
    await saveProject(project);
    await get().refreshProjects();
    set({ currentProject: project, past: [], future: [] });
    return project;
  },

  async openProject(id) {
    if (get().currentProject?.id === id) return;
    const project = await loadProject(id);
    if (!project) return;
    set({ currentProject: project, past: [], future: [] });
  },

  closeProject() {
    set({ currentProject: null, past: [], future: [] });
  },

  async removeProject(id) {
    await deleteProject(id);
    await get().refreshProjects();
    if (get().currentProject?.id === id) set({ currentProject: null });
  },

  async duplicateProject(id) {
    const original = await loadProject(id);
    if (!original) return;
    const copy: Project = {
      ...original,
      id: crypto.randomUUID(),
      info: { ...original.info, projectName: `${original.info.projectName} (copia)` },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveProject(copy);
    await get().refreshProjects();
  },

  patch(recipe, opts) {
    const current = get().currentProject;
    if (!current) return;
    const draft: Project = structuredClone(current);
    recipe(draft);
    draft.updatedAt = new Date().toISOString();

    const withHistory = opts?.history !== false;
    set((state) => ({
      currentProject: draft,
      past: withHistory ? [...state.past, { project: current }].slice(-50) : state.past,
      future: withHistory ? [] : state.future,
    }));
    scheduleAutosave(get, set);
  },

  undo() {
    const { past, currentProject } = get();
    if (past.length === 0 || !currentProject) return;
    const previous = past[past.length - 1];
    set((state) => ({
      currentProject: previous.project,
      past: state.past.slice(0, -1),
      future: [{ project: currentProject }, ...state.future].slice(0, 50),
    }));
    scheduleAutosave(get, set);
  },

  redo() {
    const { future, currentProject } = get();
    if (future.length === 0 || !currentProject) return;
    const next = future[0];
    set((state) => ({
      currentProject: next.project,
      future: state.future.slice(1),
      past: [...state.past, { project: currentProject }].slice(-50),
    }));
    scheduleAutosave(get, set);
  },

  async uploadSong(file) {
    set({ isAnalyzingSong: true });
    try {
      const blobKey = await storageProvider.upload("song", file);
      const result = await audioAnalysisProvider.analyze(file);
      get().patch((draft) => {
        draft.song = {
          id: crypto.randomUUID(),
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          blobKey,
          analysis: result.status === "ok" ? result.data! : null,
        };
      });
    } finally {
      set({ isAnalyzingSong: false });
    }
  },

  updateSongSection(id, patch) {
    get().patch((draft) => {
      if (!draft.song?.analysis) return;
      const section = draft.song.analysis.sections.find((s) => s.id === id);
      if (section) Object.assign(section, patch);
    });
  },

  async addImages(files) {
    set({ isAnalyzingImages: true });
    try {
      for (const file of files) {
        const blobKey = await storageProvider.upload("image", file);
        let analysis = null;
        try {
          analysis = await analyzeImage(file);
        } catch {
          analysis = null;
        }
        const asset: ImageAsset = {
          id: crypto.randomUUID(),
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          blobKey,
          analysis,
          isReferenceCharacter: false,
        };
        get().patch((draft) => {
          draft.images.push(asset);
        }, { history: false });
      }
      const project = get().currentProject;
      if (project) {
        get().patch(() => {}, { history: true });
      }
    } finally {
      set({ isAnalyzingImages: false });
    }
  },

  removeImage(id) {
    get().patch((draft) => {
      draft.images = draft.images.filter((i) => i.id !== id);
      draft.scenes = draft.scenes.filter((s) => s.imageId !== id);
    });
  },

  reorderImages(orderedIds) {
    get().patch((draft) => {
      const map = new Map(draft.images.map((i) => [i.id, i]));
      draft.images = orderedIds.map((id) => map.get(id)!).filter(Boolean);
    });
  },

  setStylePreset(id) {
    const preset = getStylePreset(id);
    get().patch((draft) => {
      draft.stylePresetId = id;
      if (preset) draft.colorGrade = { ...preset.colorGrade };
    });
  },

  setAspectRatio(ratio) {
    get().patch((draft) => {
      draft.aspectRatio = ratio;
    });
  },

  setMode(mode) {
    get().patch((draft) => {
      draft.mode = mode;
    });
  },

  setColorGrade(patch) {
    get().patch((draft) => {
      draft.colorGrade = { ...draft.colorGrade, ...patch, preset: "custom" };
    });
  },

  setEffect(key, value) {
    get().patch((draft) => {
      draft.effects[key] = value;
    });
  },

  autoGenerateStoryboard() {
    const project = get().currentProject;
    if (!project || !project.song?.analysis) return;
    const preset = getStylePreset(project.stylePresetId);
    const scenes = generateStoryboard(project.song.analysis.sections, project.images, { stylePreset: preset });
    get().patch((draft) => {
      draft.scenes = scenes;
    });
  },

  updateScene(id, patch) {
    get().patch((draft) => {
      const scene = draft.scenes.find((s) => s.id === id);
      if (scene) Object.assign(scene, patch);
    });
  },

  removeScene(id) {
    get().patch((draft) => {
      draft.scenes = draft.scenes.filter((s) => s.id !== id);
    });
  },

  duplicateScene(id) {
    get().patch((draft) => {
      const idx = draft.scenes.findIndex((s) => s.id === id);
      if (idx === -1) return;
      const copy: Scene = { ...draft.scenes[idx], id: crypto.randomUUID() };
      draft.scenes.splice(idx + 1, 0, copy);
      draft.scenes.forEach((s, i) => (s.order = i));
    });
  },

  reorderScenes(orderedIds) {
    get().patch((draft) => {
      const map = new Map(draft.scenes.map((s) => [s.id, s]));
      draft.scenes = orderedIds.map((id) => map.get(id)!).filter(Boolean);
      draft.scenes.forEach((s, i) => (s.order = i));
    });
  },

  setLyricsConfig(patch) {
    get().patch((draft) => {
      draft.lyrics = { ...draft.lyrics, ...patch };
    });
  },

  setLyricLines(lines) {
    get().patch((draft) => {
      draft.lyrics.lines = lines;
      draft.lyrics.enabled = true;
    });
  },

  addLyricLine() {
    get().patch((draft) => {
      const last = draft.lyrics.lines[draft.lyrics.lines.length - 1];
      const start = last ? last.end : 0;
      draft.lyrics.lines.push({ id: crypto.randomUUID(), start, end: start + 3, text: "" });
    });
  },

  updateLyricLine(id, patch) {
    get().patch((draft) => {
      const line = draft.lyrics.lines.find((l) => l.id === id);
      if (line) Object.assign(line, patch);
    });
  },

  removeLyricLine(id) {
    get().patch((draft) => {
      draft.lyrics.lines = draft.lyrics.lines.filter((l) => l.id !== id);
    });
  },
}));
