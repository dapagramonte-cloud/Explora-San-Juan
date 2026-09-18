import type { Scene } from "@/types/project";

export interface LaidOutScene extends Scene {
  layoutStartSec: number;
}

/**
 * Las escenas se reproducen secuencialmente segun su duracion actual, no
 * segun el `startSec` guardado en el momento de la generacion automatica
 * (que puede quedar desactualizado tras ediciones manuales de duracion).
 * Esta funcion es la unica fuente de verdad para calcular tiempos reales.
 */
export function computeTimelineLayout(scenes: Scene[]): LaidOutScene[] {
  const sorted = [...scenes].sort((a, b) => a.order - b.order);
  let cursor = 0;
  return sorted.map((scene) => {
    const laidOut: LaidOutScene = { ...scene, layoutStartSec: cursor };
    cursor += scene.durationSec;
    return laidOut;
  });
}

export function getTotalDuration(scenes: Scene[]): number {
  return scenes.reduce((sum, s) => sum + s.durationSec, 0);
}
