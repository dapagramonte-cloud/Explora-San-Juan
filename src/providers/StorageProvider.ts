// Capa de almacenamiento abstracta (seccion 26/27/38 del pliego).
// Por defecto usa IndexedDB local (funcional, sin backend). Si se configuran
// variables de entorno de Supabase, se puede sustituir por SupabaseStorageProvider
// sin tocar el resto de la aplicacion.

import { saveFileBlob, loadFileBlob, deleteFileBlob, newFileKey } from "@/lib/db";

export interface StorageProvider {
  readonly name: string;
  readonly configured: boolean;
  upload(prefix: string, file: Blob): Promise<string>; // devuelve blobKey/ruta
  getObjectUrl(key: string): Promise<string | null>;
  remove(key: string): Promise<void>;
}

class IndexedDbStorageProvider implements StorageProvider {
  name = "IndexedDB (local)";
  configured = true;

  async upload(prefix: string, file: Blob): Promise<string> {
    const key = newFileKey(prefix);
    await saveFileBlob(key, file);
    return key;
  }

  async getObjectUrl(key: string): Promise<string | null> {
    const blob = await loadFileBlob(key);
    if (!blob) return null;
    return URL.createObjectURL(blob);
  }

  async remove(key: string): Promise<void> {
    await deleteFileBlob(key);
  }
}

class NotConfiguredStorageProvider implements StorageProvider {
  name = "Supabase Storage";
  configured = false;

  async upload(): Promise<string> {
    throw new Error(
      "Proveedor de almacenamiento no configurado. Define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para usar Supabase Storage."
    );
  }
  async getObjectUrl(): Promise<string | null> {
    return null;
  }
  async remove(): Promise<void> {
    // no-op
  }
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Mientras no exista integracion real con Supabase Storage (requiere backend
// desplegado con claves de servidor, seccion 27), la app usa almacenamiento
// local funcional en IndexedDB, que persiste proyectos y archivos reales en
// el navegador sin simular ninguna subida.
export const storageProvider: StorageProvider = new IndexedDbStorageProvider();

export const notConfiguredStorageProvider = new NotConfiguredStorageProvider();
