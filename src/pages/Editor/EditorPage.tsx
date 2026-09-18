import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useProjectStore } from "@/store/useProjectStore";
import { useSceneBitmaps } from "@/hooks/useSceneBitmaps";
import { PreviewPlayer } from "@/components/PreviewPlayer";
import { Sidebar } from "./Sidebar";
import { PropertiesPanel } from "./PropertiesPanel";
import { Timeline } from "./Timeline";
import { ExportModal } from "./ExportModal";
import { FilesPanel } from "./panels/FilesPanel";
import { StoryboardPanel } from "./panels/StoryboardPanel";
import { EffectsPanel } from "./panels/EffectsPanel";
import { LyricsPanel } from "./panels/LyricsPanel";
import { LipSyncPanel } from "./panels/LipSyncPanel";
import { AIChatPanel } from "./panels/AIChatPanel";
import { SettingsPanel } from "./panels/SettingsPanel";
import type { PanelId, Selection } from "./panelTypes";

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const { currentProject, openProject, saveStatus, undo, redo } = useProjectStore();
  const [activePanel, setActivePanel] = useState<PanelId>("archivos");
  const [selection, setSelection] = useState<Selection>(null);
  const [showExport, setShowExport] = useState(false);

  useEffect(() => {
    if (id) openProject(id);
  }, [id, openProject]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key.toLowerCase() === "z" && e.shiftKey) { e.preventDefault(); redo(); }
      else if (e.key.toLowerCase() === "z") { e.preventDefault(); undo(); }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [undo, redo]);

  const bitmaps = useSceneBitmaps(currentProject?.images ?? []);

  if (!currentProject) {
    return <div className="min-h-screen flex items-center justify-center text-studio-muted">Cargando proyecto...</div>;
  }

  const project = currentProject;

  return (
    <div className="h-screen flex bg-studio-bg text-studio-text overflow-hidden">
      <Sidebar activePanel={activePanel} onSelectPanel={setActivePanel} onExport={() => setShowExport(true)} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-4 py-2 border-b border-studio-border shrink-0">
          <div>
            <p className="text-sm font-medium">{project.info.projectName}</p>
            <p className="text-xs text-studio-muted">
              {project.info.artistName} · {project.info.genre} · {project.aspectRatio}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-studio-muted">
            <span>{saveStatus === "guardando" ? "Guardando..." : saveStatus === "guardado" ? "Guardado" : ""}</span>
          </div>
        </header>

        <div className="flex-1 flex min-h-0">
          <main className="flex-1 flex flex-col min-w-0 overflow-y-auto p-4 gap-4">
            <PreviewPlayer project={project} effects={project.effects} />
            <div className="border-t border-studio-border pt-4">
              {activePanel === "archivos" && <FilesPanel project={project} onSelect={setSelection} />}
              {activePanel === "escenas" && <StoryboardPanel project={project} onSelect={setSelection} />}
              {activePanel === "efectos" && <EffectsPanel project={project} />}
              {activePanel === "subtitulos" && <LyricsPanel project={project} />}
              {activePanel === "lipsync" && <LipSyncPanel project={project} />}
              {activePanel === "ia" && <AIChatPanel project={project} />}
              {activePanel === "ajustes" && <SettingsPanel project={project} />}
            </div>
          </main>

          <aside className="w-[280px] shrink-0 border-l border-studio-border overflow-y-auto p-3">
            <PropertiesPanel project={project} selection={selection} />
          </aside>
        </div>

        <div className="h-[220px] shrink-0">
          <Timeline project={project} selection={selection} onSelect={setSelection} />
        </div>
      </div>

      {showExport && <ExportModal project={project} bitmaps={bitmaps} onClose={() => setShowExport(false)} />}
    </div>
  );
}
