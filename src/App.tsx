import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useProjectStore } from "@/store/useProjectStore";
import { ensureDemoProject } from "@/lib/demoProject";
import Home from "@/pages/Home";
import Projects from "@/pages/Projects";
import NewProject from "@/pages/NewProject";
import EditorPage from "@/pages/Editor/EditorPage";

export default function App() {
  const refreshProjects = useProjectStore((s) => s.refreshProjects);

  useEffect(() => {
    (async () => {
      try {
        await ensureDemoProject();
      } catch (err) {
        console.error("No se pudo crear el proyecto de demostracion:", err);
      }
      await refreshProjects();
    })();
  }, [refreshProjects]);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/proyectos" element={<Projects />} />
      <Route path="/nuevo" element={<NewProject />} />
      <Route path="/editor/:id" element={<EditorPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
