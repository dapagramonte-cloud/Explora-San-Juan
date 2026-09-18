import type { ExperienceMode, Genre, Project } from "@/types/project";
import { useProjectStore } from "@/store/useProjectStore";
import { Card, Field, SectionTitle, TextInput } from "@/components/ui";

const GENRES: Genre[] = ["Pop", "Balada", "Reggaeton", "Dembow", "Bachata", "Salsa", "Rock", "Hip Hop", "Gospel", "Musica urbana", "Otro"];
const MODES: Array<{ id: ExperienceMode; label: string; desc: string }> = [
  { id: "simple", label: "Simple", desc: "Sube, elige estilo y crea con un clic" },
  { id: "creativo", label: "Creativo", desc: "Storyboard, estilos, escenas IA, subtitulos" },
  { id: "profesional", label: "Profesional", desc: "Timeline, color, audio, efectos, lip sync" },
];

export function SettingsPanel({ project }: { project: Project }) {
  const { patch, setMode } = useProjectStore();

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <section>
        <SectionTitle>Modo de edicion</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`studio-panel rounded-lg p-3 text-left transition ${project.mode === m.id ? "border-studio-accent ring-1 ring-studio-accent" : "hover:border-studio-accent"}`}
            >
              <p className="text-sm font-medium">{m.label}</p>
              <p className="text-xs text-studio-muted">{m.desc}</p>
            </button>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>Informacion del proyecto</SectionTitle>
        <Card className="grid grid-cols-2 gap-4">
          <Field label="Nombre del proyecto">
            <TextInput value={project.info.projectName} onChange={(e) => patch((d) => { d.info.projectName = e.target.value; })} />
          </Field>
          <Field label="Titulo de la cancion">
            <TextInput value={project.info.songTitle} onChange={(e) => patch((d) => { d.info.songTitle = e.target.value; })} />
          </Field>
          <Field label="Artista">
            <TextInput value={project.info.artistName} onChange={(e) => patch((d) => { d.info.artistName = e.target.value; })} />
          </Field>
          <Field label="Genero">
            <select
              value={project.info.genre}
              onChange={(e) => patch((d) => { d.info.genre = e.target.value as Genre; })}
              className="studio-input rounded-md px-3 py-2 text-sm"
            >
              {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </Field>
          <Field label="Descripcion">
            <textarea
              value={project.info.description}
              onChange={(e) => patch((d) => { d.info.description = e.target.value; })}
              className="studio-input rounded-md px-3 py-2 text-sm min-h-[70px] col-span-2"
            />
          </Field>
        </Card>
      </section>
    </div>
  );
}
