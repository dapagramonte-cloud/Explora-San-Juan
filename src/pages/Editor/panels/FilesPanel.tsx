import { useRef, useState } from "react";
import type { Project, SectionLabel } from "@/types/project";
import { shallow } from "zustand/shallow";
import { useProjectStore } from "@/store/useProjectStore";
import { useObjectUrls } from "@/hooks/useObjectUrls";
import { Button, Card, SectionTitle, Badge, EmptyState } from "@/components/ui";
import { Waveform } from "@/components/Waveform";
import type { Selection } from "../panelTypes";

const AUDIO_ACCEPT = ".mp3,.wav,.m4a,.aac,.flac,audio/*";
const IMAGE_ACCEPT = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";

const SECTION_LABELS: SectionLabel[] = ["intro", "verso", "coro", "puente", "outro", "silencio", "otro"];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function FilesPanel({ project, onSelect }: { project: Project; onSelect: (s: Selection) => void }) {
  const { uploadSong, addImages, removeImage, reorderImages, updateSongSection, isAnalyzingSong, isAnalyzingImages } =
    useProjectStore((s) => ({
      uploadSong: s.uploadSong,
      addImages: s.addImages,
      removeImage: s.removeImage,
      reorderImages: s.reorderImages,
      updateSongSection: s.updateSongSection,
      isAnalyzingSong: s.isAnalyzingSong,
      isAnalyzingImages: s.isAnalyzingImages,
    }), shallow);

  const songInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [dragOverSong, setDragOverSong] = useState(false);
  const [dragOverImages, setDragOverImages] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const imageUrls = useObjectUrls(project.images);

  async function handleSongFiles(files: FileList | null) {
    const file = files?.[0];
    if (file) await uploadSong(file);
  }

  async function handleImageFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    await addImages(Array.from(files));
  }

  function handleImageDrop(id: string) {
    if (!draggedId || draggedId === id) return;
    const ids = project.images.map((i) => i.id);
    const from = ids.indexOf(draggedId);
    const to = ids.indexOf(id);
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    reorderImages(ids);
    setDraggedId(null);
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <section>
        <SectionTitle>Cancion</SectionTitle>
        {!project.song ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOverSong(true); }}
            onDragLeave={() => setDragOverSong(false)}
            onDrop={(e) => { e.preventDefault(); setDragOverSong(false); handleSongFiles(e.dataTransfer.files); }}
            onClick={() => songInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg py-10 text-center cursor-pointer transition ${
              dragOverSong ? "border-studio-accent bg-studio-accent/5" : "border-studio-border"
            }`}
          >
            <p className="text-lg mb-1">🎵 Arrastra tu cancion aqui</p>
            <p className="text-studio-muted text-sm mb-3">MP3, WAV, M4A, AAC o FLAC</p>
            <Button variant="primary" onClick={(e) => { e.stopPropagation(); songInputRef.current?.click(); }}>
              Seleccionar archivo
            </Button>
            <input ref={songInputRef} type="file" accept={AUDIO_ACCEPT} className="hidden" onChange={(e) => handleSongFiles(e.target.files)} />
            {isAnalyzingSong && <p className="text-xs text-studio-accent mt-3">Analizando audio...</p>}
          </div>
        ) : (
          <Card onClick={() => onSelect({ type: "audio" })} className="cursor-pointer">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-medium">{project.song.fileName}</p>
                <p className="text-xs text-studio-muted">
                  {formatBytes(project.song.sizeBytes)}
                  {project.song.analysis && ` · ${formatTime(project.song.analysis.durationSec)}`}
                  {project.song.analysis?.bpm && ` · ${project.song.analysis.bpm} BPM`}
                </p>
              </div>
              <Button variant="ghost" onClick={(e) => { e.stopPropagation(); songInputRef.current?.click(); }}>Reemplazar</Button>
              <input ref={songInputRef} type="file" accept={AUDIO_ACCEPT} className="hidden" onChange={(e) => handleSongFiles(e.target.files)} />
            </div>
            {isAnalyzingSong && <p className="text-xs text-studio-accent mb-2">Analizando audio...</p>}
            {project.song.analysis && (
              <>
                <Waveform peaks={project.song.analysis.waveformPeaks} durationSec={project.song.analysis.durationSec} sections={project.song.analysis.sections} />
                <div className="flex flex-wrap gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                  {project.song.analysis.sections.map((section) => (
                    <div key={section.id} className="flex items-center gap-1 studio-input rounded-md px-2 py-1 text-xs">
                      <select
                        value={section.label}
                        onChange={(e) => updateSongSection(section.id, { label: e.target.value as SectionLabel, manuallyEdited: true })}
                        className="bg-transparent"
                      >
                        {SECTION_LABELS.map((l) => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                      <span className="text-studio-muted">{formatTime(section.start)}–{formatTime(section.end)}</span>
                      {section.manuallyEdited && <Badge tone="accent">editado</Badge>}
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <SectionTitle>Imagenes ({project.images.length})</SectionTitle>
          {isAnalyzingImages && <span className="text-xs text-studio-accent">Analizando imagenes...</span>}
        </div>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOverImages(true); }}
          onDragLeave={() => setDragOverImages(false)}
          onDrop={(e) => { e.preventDefault(); setDragOverImages(false); handleImageFiles(e.dataTransfer.files); }}
          onClick={() => imageInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg py-6 text-center cursor-pointer transition mb-4 ${
            dragOverImages ? "border-studio-accent bg-studio-accent/5" : "border-studio-border"
          }`}
        >
          <p className="mb-1">🖼️ Arrastra tus imagenes aqui</p>
          <p className="text-studio-muted text-xs mb-2">JPG, PNG o WEBP · puedes seleccionar varias</p>
          <Button onClick={(e) => { e.stopPropagation(); imageInputRef.current?.click(); }}>Seleccionar archivos</Button>
          <input ref={imageInputRef} type="file" multiple accept={IMAGE_ACCEPT} className="hidden" onChange={(e) => handleImageFiles(e.target.files)} />
        </div>

        {project.images.length === 0 ? (
          <EmptyState title="Sin imagenes" description="Sube fotografias o imagenes generadas con IA para construir tu videoclip." />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {project.images.map((img) => (
              <div
                key={img.id}
                draggable
                onDragStart={() => setDraggedId(img.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleImageDrop(img.id)}
                onClick={() => onSelect({ type: "image", id: img.id })}
                className="studio-panel rounded-lg overflow-hidden cursor-pointer group relative"
              >
                <div className="aspect-square bg-studio-panel2">
                  {imageUrls.get(img.id) && <img src={imageUrls.get(img.id)} className="w-full h-full object-cover" />}
                </div>
                <div className="p-2">
                  <p className="text-xs truncate">{img.fileName}</p>
                  <p className="text-[10px] text-studio-muted">
                    {img.analysis ? `${img.analysis.width}x${img.analysis.height}` : "..."}
                  </p>
                  {img.analysis?.tags.includes("personaje") && <Badge tone="accent">personaje</Badge>}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white text-xs opacity-0 group-hover:opacity-100 transition"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
