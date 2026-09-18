import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { shallow } from "zustand/shallow";
import { useProjectStore } from "@/store/useProjectStore";
import { Button, Card, Badge, EmptyState } from "@/components/ui";

const STATUS_TONE: Record<string, "default" | "accent" | "warning" | "success"> = {
  Borrador: "default",
  Procesando: "warning",
  Listo: "success",
  Error: "warning",
};

export default function Projects() {
  const { projects, refreshProjects, removeProject, duplicateProject } = useProjectStore(
    (s) => ({ projects: s.projects, refreshProjects: s.refreshProjects, removeProject: s.removeProject, duplicateProject: s.duplicateProject }),
    shallow
  );
  const navigate = useNavigate();

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  return (
    <div className="min-h-screen bg-studio-bg px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link to="/" className="text-sm text-studio-muted hover:text-studio-text">← CLIPSTUDIO AI</Link>
          <h1 className="text-2xl font-bold mt-1">Mis proyectos</h1>
        </div>
        <Link to="/nuevo">
          <Button variant="primary">+ Nuevo videoclip</Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <EmptyState title="Aun no tienes proyectos" description="Crea tu primer videoclip subiendo una cancion e imagenes." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {projects.map((p) => (
            <Card key={p.id} className="flex flex-col gap-3">
              <div
                className="aspect-video rounded-md bg-studio-panel2 flex items-center justify-center text-studio-muted cursor-pointer overflow-hidden"
                onClick={() => navigate(`/editor/${p.id}`)}
              >
                {p.thumbnailDataUrl ? (
                  <img src={p.thumbnailDataUrl} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl">🎬</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <p className="font-medium truncate">{p.info.projectName}</p>
                <Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge>
              </div>
              <p className="text-xs text-studio-muted">
                {p.info.artistName || "Sin artista"} · {p.aspectRatio} · {new Date(p.updatedAt).toLocaleDateString()}
              </p>
              <div className="flex gap-2 text-xs">
                <Button className="flex-1" onClick={() => navigate(`/editor/${p.id}`)}>Abrir</Button>
                <Button onClick={() => duplicateProject(p.id)}>Duplicar</Button>
                <Button variant="danger" onClick={() => removeProject(p.id)}>Eliminar</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
