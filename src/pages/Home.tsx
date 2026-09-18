import { Link } from "react-router-dom";
import { Button } from "@/components/ui";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-studio-bg">
      <header className="flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-2 font-semibold text-lg">
          <span className="w-8 h-8 rounded-md bg-gradient-to-br from-studio-accent to-studio-accent2 flex items-center justify-center text-white">▶</span>
          CLIPSTUDIO <span className="text-studio-accent">AI</span>
        </div>
        <nav className="flex items-center gap-4 text-sm text-studio-muted">
          <Link to="/proyectos" className="hover:text-studio-text">Mis proyectos</Link>
        </nav>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-6">
        <h1 className="text-4xl md:text-6xl font-bold max-w-3xl bg-gradient-to-r from-white to-studio-muted bg-clip-text text-transparent">
          Crea tu videoclip con IA
        </h1>
        <p className="text-studio-muted max-w-xl text-lg">
          Sube tu musica, agrega tus imagenes y deja que CLIPSTUDIO AI haga el resto.
        </p>
        <Link to="/nuevo">
          <Button variant="primary" className="text-base px-6 py-3">+ Nuevo videoclip</Button>
        </Link>
      </main>

      <footer className="text-center text-xs text-studio-muted py-6">
        CLIPSTUDIO AI · creacion profesional de videoclips musicales asistida por IA
      </footer>
    </div>
  );
}
