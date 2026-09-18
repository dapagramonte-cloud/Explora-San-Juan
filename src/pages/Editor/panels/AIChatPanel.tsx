import { useState } from "react";
import type { Project } from "@/types/project";
import { useProjectStore } from "@/store/useProjectStore";
import { interpretCommand, buildProjectContextSummary } from "@/lib/aiAssistant";
import { Button, Card, SectionTitle } from "@/components/ui";

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
}

const SUGGESTIONS = [
  "Hazme un videoclip romantico",
  "Quiero una estetica cinematografica",
  "Usa tonos calidos",
  "Haz una version mas dramatica",
  "Cambia las transiciones por unas mas suaves",
  "Haz que las imagenes tengan movimiento",
];

export function AIChatPanel({ project }: { project: Project }) {
  const { patch } = useProjectStore();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Soy CLIPSTUDIO AI ASSISTANT. Ya conozco tu proyecto (cancion, imagenes y escenas). Dime que quieres cambiar.",
    },
  ]);
  const [input, setInput] = useState("");

  function send(text: string) {
    if (!text.trim()) return;
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", text };
    const result = interpretCommand(text, project);
    const assistantMsg: Message = { id: crypto.randomUUID(), role: "assistant", text: result.reply };
    setMessages((m) => [...m, userMsg, assistantMsg]);
    if (result.patch) patch(result.patch);
    setInput("");
  }

  return (
    <div className="flex flex-col gap-4 max-w-2xl h-full">
      <SectionTitle>CLIPSTUDIO AI ASSISTANT</SectionTitle>
      <Card className="text-xs text-studio-muted">{buildProjectContextSummary(project)}</Card>

      <Card className="flex-1 flex flex-col gap-2 overflow-y-auto max-h-96 min-h-[240px]">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${
              m.role === "user" ? "self-end bg-studio-accent text-white" : "self-start bg-studio-panel2"
            }`}
          >
            {m.text}
          </div>
        ))}
      </Card>

      <div className="flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button key={s} onClick={() => send(s)} className="text-xs px-2 py-1 rounded-full studio-panel hover:border-studio-accent">
            {s}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); send(input); }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe una instruccion para tu videoclip..."
          className="studio-input rounded-md px-3 py-2 text-sm flex-1"
        />
        <Button type="submit" variant="primary">Enviar</Button>
      </form>
      <p className="text-[11px] text-studio-muted">
        Asistente basado en reglas locales (sin conexion a un modelo de lenguaje externo). Interpreta un conjunto de instrucciones comunes de direccion y edicion.
      </p>
    </div>
  );
}
