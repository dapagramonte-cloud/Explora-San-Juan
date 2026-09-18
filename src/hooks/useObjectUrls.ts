import { useEffect, useRef, useState } from "react";
import { loadFileBlob } from "@/lib/db";

export function useObjectUrls(items: Array<{ id: string; blobKey: string }>) {
  const [urls, setUrls] = useState<Map<string, string>>(new Map());
  const cacheRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const cache = cacheRef.current;
      const validIds = new Set(items.map((i) => i.id));

      for (const [id, url] of cache) {
        if (!validIds.has(id)) {
          URL.revokeObjectURL(url);
          cache.delete(id);
        }
      }

      for (const item of items) {
        if (cache.has(item.id)) continue;
        const blob = await loadFileBlob(item.blobKey);
        if (!blob || cancelled) continue;
        cache.set(item.id, URL.createObjectURL(blob));
      }

      if (!cancelled) setUrls(new Map(cache));
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [items]);

  return urls;
}
