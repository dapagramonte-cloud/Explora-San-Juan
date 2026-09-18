import { openDB, type IDBPDatabase } from "idb";
import type { Project } from "@/types/project";

const DB_NAME = "clipstudio-ai";
const DB_VERSION = 1;

interface ClipStudioDB {
  projects: Project;
  files: Blob;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("projects")) {
          db.createObjectStore("projects", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("files")) {
          db.createObjectStore("files");
        }
      },
    });
  }
  return dbPromise;
}

// --- Proyectos ---

export async function saveProject(project: Project): Promise<void> {
  const db = await getDb();
  await db.put("projects", project);
}

export async function loadProject(id: string): Promise<Project | undefined> {
  const db = await getDb();
  return db.get("projects", id);
}

export async function loadAllProjects(): Promise<Project[]> {
  const db = await getDb();
  return db.getAll("projects");
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("projects", id);
}

// --- Archivos binarios (audio/imagenes) ---

export async function saveFileBlob(key: string, blob: Blob): Promise<void> {
  const db = await getDb();
  await db.put("files", blob, key);
}

export async function loadFileBlob(key: string): Promise<Blob | undefined> {
  const db = await getDb();
  return db.get("files", key);
}

export async function deleteFileBlob(key: string): Promise<void> {
  const db = await getDb();
  await db.delete("files", key);
}

export function newFileKey(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}
