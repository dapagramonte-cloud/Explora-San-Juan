import { useRef } from "react";
import type { LyricsStyle, Project } from "@/types/project";
import { shallow } from "zustand/shallow";
import { useProjectStore } from "@/store/useProjectStore";
import { parseLyricsFile } from "@/lib/lyricsParser";
import { Button, Card, EmptyState, Field, SectionTitle, TextInput } from "@/components/ui";

const STYLES: LyricsStyle[] = ["minimalista", "karaoke", "cinematografico", "moderno", "elegante"];

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = (sec % 60).toFixed(1);
  return `${m}:${s.padStart(4, "0")}`;
}

export function LyricsPanel({ project }: { project: Project }) {
  const { setLyricsConfig, setLyricLines, addLyricLine, updateLyricLine, removeLyricLine } = useProjectStore(
    (s) => ({
      setLyricsConfig: s.setLyricsConfig,
      setLyricLines: s.setLyricLines,
      addLyricLine: s.addLyricLine,
      updateLyricLine: s.updateLyricLine,
      removeLyricLine: s.removeLyricLine,
    }),
    shallow
  );
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    const content = await file.text();
    const duration = project.song?.analysis?.durationSec ?? 210;
    const lines = parseLyricsFile(file.name, content, duration);
    setLyricLines(lines);
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <section className="flex items-center justify-between">
        <SectionTitle>Letra de la cancion</SectionTitle>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={project.lyrics.enabled} onChange={(e) => setLyricsConfig({ enabled: e.target.checked })} />
          Mostrar en el video
        </label>
      </section>

      <Card className="flex flex-col gap-3">
        <div className="flex gap-2">
          <Button onClick={() => fileRef.current?.click()}>Importar TXT / SRT / LRC</Button>
          <input ref={fileRef} type="file" accept=".txt,.srt,.lrc" className="hidden" onChange={(e) => handleFile(e.target.files)} />
          <Button onClick={addLyricLine}>+ Agregar linea</Button>
        </div>

        {project.lyrics.lines.length === 0 ? (
          <EmptyState title="Sin letra cargada" description="Importa un archivo o agrega lineas manualmente y sincronizalas con el audio." />
        ) : (
          <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
            {project.lyrics.lines.map((line) => (
              <div key={line.id} className="flex items-center gap-2 text-sm">
                <TextInput
                  type="number"
                  step={0.1}
                  value={line.start}
                  onChange={(e) => updateLyricLine(line.id, { start: Number(e.target.value) })}
                  className="w-20"
                />
                <TextInput
                  type="number"
                  step={0.1}
                  value={line.end}
                  onChange={(e) => updateLyricLine(line.id, { end: Number(e.target.value) })}
                  className="w-20"
                />
                <TextInput
                  value={line.text}
                  onChange={(e) => updateLyricLine(line.id, { text: e.target.value })}
                  className="flex-1"
                  placeholder="Texto de la linea"
                />
                <span className="text-xs text-studio-muted w-24 shrink-0">
                  {formatTime(line.start)}–{formatTime(line.end)}
                </span>
                <Button variant="danger" onClick={() => removeLyricLine(line.id)}>✕</Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <section>
        <SectionTitle>Estilo</SectionTitle>
        <Card className="grid grid-cols-2 gap-4">
          <Field label="Estilo visual">
            <select
              value={project.lyrics.style}
              onChange={(e) => setLyricsConfig({ style: e.target.value as LyricsStyle })}
              className="studio-input rounded-md px-3 py-2 text-sm"
            >
              {STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Posicion">
            <select
              value={project.lyrics.position}
              onChange={(e) => setLyricsConfig({ position: e.target.value as any })}
              className="studio-input rounded-md px-3 py-2 text-sm"
            >
              <option value="arriba">Arriba</option>
              <option value="centro">Centro</option>
              <option value="abajo">Abajo</option>
            </select>
          </Field>
          <Field label="Tamano de fuente">
            <TextInput type="number" value={project.lyrics.fontSize} onChange={(e) => setLyricsConfig({ fontSize: Number(e.target.value) })} />
          </Field>
          <Field label="Color">
            <input type="color" value={project.lyrics.color} onChange={(e) => setLyricsConfig({ color: e.target.value })} className="h-9 w-full rounded-md" />
          </Field>
          <label className="flex items-center gap-2 text-sm col-span-2">
            <input type="checkbox" checked={project.lyrics.showBackground} onChange={(e) => setLyricsConfig({ showBackground: e.target.checked })} />
            Fondo detras del texto
          </label>
        </Card>
      </section>
    </div>
  );
}
