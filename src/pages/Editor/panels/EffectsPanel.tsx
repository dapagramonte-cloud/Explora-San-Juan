import type { AspectRatio, Project } from "@/types/project";
import { useProjectStore } from "@/store/useProjectStore";
import { STYLE_PRESETS } from "@/data/stylePresets";
import { Card, SectionTitle, SliderRow } from "@/components/ui";

const ASPECT_OPTIONS: Array<{ value: AspectRatio; label: string; desc: string }> = [
  { value: "16:9", label: "Horizontal 16:9", desc: "YouTube, TV" },
  { value: "9:16", label: "Vertical 9:16", desc: "TikTok, Reels, Shorts" },
  { value: "1:1", label: "Cuadrado 1:1", desc: "Instagram feed" },
];

export function EffectsPanel({ project }: { project: Project }) {
  const { setStylePreset, setAspectRatio, setColorGrade, setEffect } = useProjectStore();

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <section>
        <SectionTitle>Estilo visual</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {STYLE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => setStylePreset(preset.id)}
              className={`studio-panel rounded-lg p-3 text-left transition ${
                project.stylePresetId === preset.id ? "border-studio-accent ring-1 ring-studio-accent" : "hover:border-studio-accent"
              }`}
            >
              <div className="text-2xl mb-1">{preset.emoji}</div>
              <p className="text-sm font-medium">{preset.label}</p>
            </button>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>Formato de video</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          {ASPECT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setAspectRatio(opt.value)}
              className={`studio-panel rounded-lg p-3 text-left transition ${
                project.aspectRatio === opt.value ? "border-studio-accent ring-1 ring-studio-accent" : "hover:border-studio-accent"
              }`}
            >
              <p className="text-sm font-medium">{opt.label}</p>
              <p className="text-xs text-studio-muted">{opt.desc}</p>
            </button>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>Correccion de color</SectionTitle>
        <Card className="grid grid-cols-2 gap-4">
          <SliderRow label="Exposicion" value={project.colorGrade.exposure} onChange={(v) => setColorGrade({ exposure: v })} />
          <SliderRow label="Contraste" value={project.colorGrade.contrast} onChange={(v) => setColorGrade({ contrast: v })} />
          <SliderRow label="Saturacion" value={project.colorGrade.saturation} onChange={(v) => setColorGrade({ saturation: v })} />
          <SliderRow label="Temperatura" value={project.colorGrade.temperature} onChange={(v) => setColorGrade({ temperature: v })} />
          <SliderRow label="Sombras" value={project.colorGrade.shadows} onChange={(v) => setColorGrade({ shadows: v })} />
          <SliderRow label="Luces altas" value={project.colorGrade.highlights} onChange={(v) => setColorGrade({ highlights: v })} />
        </Card>
      </section>

      <section>
        <SectionTitle>Efectos visuales</SectionTitle>
        <Card className="flex gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={project.effects.vignette} onChange={(e) => setEffect("vignette", e.target.checked)} />
            Vineta
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={project.effects.grain} onChange={(e) => setEffect("grain", e.target.checked)} />
            Grano cinematografico
          </label>
        </Card>
        <p className="text-xs text-studio-muted mt-2">
          Otros efectos (particulas, lluvia, nieve, lens flare) estan planificados para una fase posterior y aun no estan disponibles.
        </p>
      </section>
    </div>
  );
}
