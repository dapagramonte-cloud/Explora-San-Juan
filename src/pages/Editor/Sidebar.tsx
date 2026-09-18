import { useNavigate } from "react-router-dom";
import type { PanelId } from "./panelTypes";

const NAV_ITEMS: Array<{ id: PanelId | "inicio" | "nuevo" | "proyectos" | "exportar"; label: string; icon: string }> = [
  { id: "inicio", label: "Inicio", icon: "🏠" },
  { id: "nuevo", label: "Nuevo proyecto", icon: "➕" },
  { id: "proyectos", label: "Mis proyectos", icon: "📁" },
  { id: "archivos", label: "Archivos", icon: "🗂️" },
  { id: "escenas", label: "Escenas", icon: "🎬" },
  { id: "efectos", label: "Efectos", icon: "✨" },
  { id: "subtitulos", label: "Subtitulos", icon: "💬" },
  { id: "lipsync", label: "Sincronizacion labial", icon: "👄" },
  { id: "ia", label: "IA", icon: "🤖" },
  { id: "exportar", label: "Exportar", icon: "⬇️" },
  { id: "ajustes", label: "Configuracion", icon: "⚙️" },
];

interface Props {
  activePanel: PanelId;
  onSelectPanel: (id: PanelId) => void;
  onExport: () => void;
}

export function Sidebar({ activePanel, onSelectPanel, onExport }: Props) {
  const navigate = useNavigate();

  function handleClick(id: string) {
    if (id === "inicio") return navigate("/");
    if (id === "nuevo") return navigate("/nuevo");
    if (id === "proyectos") return navigate("/proyectos");
    if (id === "exportar") return onExport();
    onSelectPanel(id as PanelId);
  }

  return (
    <aside className="w-[210px] shrink-0 border-r border-studio-border bg-studio-panel flex flex-col py-3">
      <div className="px-4 pb-3 mb-2 border-b border-studio-border flex items-center gap-2 font-semibold">
        <span className="w-6 h-6 rounded bg-gradient-to-br from-studio-accent to-studio-accent2 flex items-center justify-center text-[10px] text-white">▶</span>
        <span className="text-sm">CLIPSTUDIO AI</span>
      </div>
      <nav className="flex flex-col gap-0.5 px-2">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => handleClick(item.id)}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-left transition ${
              activePanel === item.id ? "bg-studio-accent/15 text-studio-accent" : "text-studio-muted hover:text-studio-text hover:bg-studio-panel2"
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
