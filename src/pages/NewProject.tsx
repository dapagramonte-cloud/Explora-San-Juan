import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProjectStore } from "@/store/useProjectStore";
import { Button, Card, Field, TextInput } from "@/components/ui";
import type { Genre } from "@/types/project";

const GENRES: Genre[] = [
  "Pop",
  "Balada",
  "Reggaeton",
  "Dembow",
  "Bachata",
  "Salsa",
  "Rock",
  "Hip Hop",
  "Gospel",
  "Musica urbana",
  "Otro",
];

export default function NewProject() {
  const navigate = useNavigate();
  const createProject = useProjectStore((s) => s.createProject);
  const [step, setStep] = useState(1);
  const [projectName, setProjectName] = useState("");
  const [songTitle, setSongTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [genre, setGenre] = useState<Genre>("Pop");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const canContinue = projectName.trim().length > 0 && songTitle.trim().length > 0;

  async function handleCreate() {
    setCreating(true);
    try {
      const project = await createProject({ projectName, songTitle, artistName, genre, description });
      navigate(`/editor/${project.id}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-studio-bg flex items-center justify-center px-4">
      <Card className="w-full max-w-lg">
        <p className="text-xs text-studio-muted mb-1">Paso {step} de 1 · Informacion del proyecto</p>
        <h1 className="text-xl font-bold mb-5">Nuevo videoclip</h1>

        <div className="flex flex-col gap-4">
          <Field label="Nombre del proyecto">
            <TextInput value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Ej. Mi videoclip de verano" />
          </Field>
          <Field label="Titulo de la cancion">
            <TextInput value={songTitle} onChange={(e) => setSongTitle(e.target.value)} placeholder="Titulo de la cancion" />
          </Field>
          <Field label="Nombre del artista">
            <TextInput value={artistName} onChange={(e) => setArtistName(e.target.value)} placeholder="Artista" />
          </Field>
          <Field label="Genero musical">
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value as Genre)}
              className="studio-input rounded-md px-3 py-2 text-sm"
            >
              {GENRES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </Field>
          <Field label="Descripcion (opcional)">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="studio-input rounded-md px-3 py-2 text-sm min-h-[70px]"
              placeholder="De que trata la cancion..."
            />
          </Field>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="ghost" onClick={() => navigate("/proyectos")}>Cancelar</Button>
          <Button variant="primary" disabled={!canContinue || creating} onClick={handleCreate}>
            {creating ? "Creando..." : "Crear y continuar"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
