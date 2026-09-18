// Deteccion facial real, 100% local (sin backend ni costo): usa blazeface
// (detector) + facemesh (478 puntos, incluye labios/mandibula), servidos
// desde public/models/ en vez de un CDN externo, igual que el core de FFmpeg.

import type { Config } from "@vladmandic/human";

let humanPromise: Promise<any> | null = null;

export async function getHuman() {
  if (!humanPromise) {
    humanPromise = (async () => {
      const { Human } = await import("@vladmandic/human");
      const config: Partial<Config> = {
        modelBasePath: "/models",
        backend: "webgl",
        cacheSensitivity: 0,
        face: {
          enabled: true,
          detector: { enabled: true, maxDetected: 6, minConfidence: 0.4, rotation: false },
          mesh: { enabled: true },
          attention: { enabled: false },
          iris: { enabled: false },
          description: { enabled: false },
          emotion: { enabled: false },
          antispoof: { enabled: false },
          liveness: { enabled: false },
          gear: { enabled: false },
        } as Partial<Config["face"]>,
        body: { enabled: false },
        hand: { enabled: false },
        object: { enabled: false },
        gesture: { enabled: false },
        segmentation: { enabled: false },
      };
      const human = new Human(config);
      await human.load();
      return human;
    })();
  }
  return humanPromise;
}
