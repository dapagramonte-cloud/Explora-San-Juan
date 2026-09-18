import { useEffect, useRef, useState } from "react";
import type { ImageAsset } from "@/types/project";
import { loadFileBlob } from "@/lib/db";

export function useSceneBitmaps(images: ImageAsset[]) {
  const [bitmaps, setBitmaps] = useState<Map<string, ImageBitmap>>(new Map());
  const cacheRef = useRef<Map<string, ImageBitmap>>(new Map());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const cache = cacheRef.current;
      const validIds = new Set(images.map((i) => i.id));

      for (const [id, bmp] of cache) {
        if (!validIds.has(id)) {
          bmp.close();
          cache.delete(id);
        }
      }

      for (const image of images) {
        if (cache.has(image.id)) continue;
        const blob = await loadFileBlob(image.blobKey);
        if (!blob || cancelled) continue;
        try {
          const bitmap = await createImageBitmap(blob);
          cache.set(image.id, bitmap);
        } catch {
          // imagen invalida o corrupta: se omite silenciosamente en preview
        }
      }

      if (!cancelled) setBitmaps(new Map(cache));
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [images]);

  return bitmaps;
}
