// Motor real de analisis de audio usando Web Audio API (sin backend).
// Calcula duracion, forma de onda, BPM aproximado (autocorrelacion de la
// envolvente de energia) y una segmentacion heuristica de la cancion
// (intro/verso/coro/puente/outro/silencio). No pretende ser perfecto: el
// usuario puede corregir manualmente cada seccion (seccion 5 del pliego).

import type { SectionLabel, SongAnalysis, SongSection } from "@/types/project";

export async function decodeAudioFile(file: Blob): Promise<AudioBuffer> {
  const arrayBuffer = await file.arrayBuffer();
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  const ctx: AudioContext = new AudioCtx();
  try {
    const buffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    return buffer;
  } finally {
    ctx.close();
  }
}

function toMono(buffer: AudioBuffer): Float32Array {
  if (buffer.numberOfChannels === 1) return buffer.getChannelData(0);
  const length = buffer.length;
  const mono = new Float32Array(length);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) mono[i] += data[i] / buffer.numberOfChannels;
  }
  return mono;
}

export function computeWaveformPeaks(buffer: AudioBuffer, numPeaks = 800): number[] {
  const mono = toMono(buffer);
  const bucketSize = Math.max(1, Math.floor(mono.length / numPeaks));
  const peaks: number[] = [];
  for (let i = 0; i < numPeaks; i++) {
    const start = i * bucketSize;
    const end = Math.min(mono.length, start + bucketSize);
    let max = 0;
    for (let j = start; j < end; j++) {
      const v = Math.abs(mono[j]);
      if (v > max) max = v;
    }
    peaks.push(max);
  }
  const globalMax = Math.max(...peaks, 0.0001);
  return peaks.map((p) => Math.min(1, p / globalMax));
}

export interface Envelope {
  values: number[]; // RMS normalizado 0..1
  hopSeconds: number;
}

function computeEnergyEnvelope(buffer: AudioBuffer, envelopeHz = 100): Envelope {
  const mono = toMono(buffer);
  const hopSize = Math.max(1, Math.floor(buffer.sampleRate / envelopeHz));
  const numFrames = Math.floor(mono.length / hopSize);
  const values: number[] = new Array(numFrames);
  for (let i = 0; i < numFrames; i++) {
    const start = i * hopSize;
    const end = Math.min(mono.length, start + hopSize);
    let sumSq = 0;
    for (let j = start; j < end; j++) sumSq += mono[j] * mono[j];
    values[i] = Math.sqrt(sumSq / (end - start));
  }
  const max = Math.max(...values, 0.0001);
  return { values: values.map((v) => v / max), hopSeconds: 1 / envelopeHz };
}

function smooth(values: number[], radius: number): number[] {
  const out = new Array(values.length);
  for (let i = 0; i < values.length; i++) {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - radius); j <= Math.min(values.length - 1, i + radius); j++) {
      sum += values[j];
      count++;
    }
    out[i] = sum / count;
  }
  return out;
}

export function estimateBPM(envelope: Envelope): number | null {
  const { values, hopSeconds } = envelope;
  const envHz = 1 / hopSeconds;
  const minLag = Math.round(envHz * 60 / 200); // 200 BPM
  const maxLag = Math.round(envHz * 60 / 40); // 40 BPM
  if (values.length < maxLag * 2) return null;

  // Onset envelope: diferencia positiva (flujo espectral simplificado en energia)
  const onset = new Array(values.length).fill(0);
  for (let i = 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    onset[i] = diff > 0 ? diff : 0;
  }

  let bestLag = -1;
  let bestScore = -Infinity;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let score = 0;
    for (let i = 0; i + lag < onset.length; i++) {
      score += onset[i] * onset[i + lag];
    }
    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  }
  if (bestLag <= 0) return null;
  const bpm = (60 * envHz) / bestLag;
  // Normalizar a un rango musical tipico duplicando/dividiendo octavas de tempo
  let normalized = bpm;
  while (normalized < 70) normalized *= 2;
  while (normalized > 180) normalized /= 2;
  return Math.round(normalized);
}

interface RawSegment {
  startIdx: number;
  endIdx: number;
  level: number; // energia media 0..1
}

function segmentEnvelope(values: number[]): RawSegment[] {
  const smoothed = smooth(values, 25); // ~0.5s de radio a 100Hz aprox
  const sorted = [...smoothed].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.33)];
  const q2 = sorted[Math.floor(sorted.length * 0.66)];

  const levelOf = (v: number): 0 | 1 | 2 => (v <= q1 ? 0 : v <= q2 ? 1 : 2);

  const segments: RawSegment[] = [];
  let currentLevel = levelOf(smoothed[0]);
  let startIdx = 0;
  for (let i = 1; i < smoothed.length; i++) {
    const lvl = levelOf(smoothed[i]);
    if (lvl !== currentLevel) {
      segments.push({ startIdx, endIdx: i, level: currentLevel });
      startIdx = i;
      currentLevel = lvl;
    }
  }
  segments.push({ startIdx, endIdx: smoothed.length, level: currentLevel });

  // Fusionar segmentos muy cortos (<1.5s aprox) con el vecino de mayor duracion
  const minLen = Math.max(4, Math.round(smoothed.length * 0.01));
  const merged: RawSegment[] = [];
  for (const seg of segments) {
    if (merged.length > 0 && seg.endIdx - seg.startIdx < minLen) {
      merged[merged.length - 1].endIdx = seg.endIdx;
    } else {
      merged.push({ ...seg });
    }
  }
  return merged;
}

function labelSegments(segments: RawSegment[], values: number[], hopSeconds: number): SongSection[] {
  const avgEnergy = (seg: RawSegment) => {
    let sum = 0;
    for (let i = seg.startIdx; i < seg.endIdx; i++) sum += values[i];
    return sum / Math.max(1, seg.endIdx - seg.startIdx);
  };

  const energies = segments.map(avgEnergy);
  const maxEnergy = Math.max(...energies, 0.0001);

  return segments.map((seg, idx) => {
    const energy = energies[idx];
    const relative = energy / maxEnergy;
    let label: SectionLabel;
    if (relative < 0.12) {
      label = "silencio";
    } else if (idx === 0) {
      label = "intro";
    } else if (idx === segments.length - 1) {
      label = "outro";
    } else if (relative > 0.72) {
      label = "coro";
    } else if (relative < 0.4) {
      label = "puente";
    } else {
      label = "verso";
    }
    return {
      id: crypto.randomUUID(),
      label,
      start: Number((seg.startIdx * hopSeconds).toFixed(2)),
      end: Number((seg.endIdx * hopSeconds).toFixed(2)),
      intensity: Number(relative.toFixed(3)),
      manuallyEdited: false,
    };
  });
}

export async function analyzeSong(file: Blob): Promise<SongAnalysis> {
  const buffer = await decodeAudioFile(file);
  const waveformPeaks = computeWaveformPeaks(buffer, 800);
  const envelope = computeEnergyEnvelope(buffer, 100);
  const bpm = estimateBPM(envelope);
  const rawSegments = segmentEnvelope(envelope.values);
  const sections = labelSegments(rawSegments, envelope.values, envelope.hopSeconds);

  return {
    durationSec: buffer.duration,
    bpm,
    waveformPeaks,
    energyEnvelope: envelope,
    sections,
    analyzedAt: new Date().toISOString(),
  };
}

/**
 * Amplitud interpolada (0..1) en un instante t, a partir de la envolvente de
 * energia guardada en el analisis de la cancion. Es la misma fuente de datos
 * para preview y export, para que la animacion de canto se vea igual en
 * ambos.
 */
export function getAmplitudeAt(envelope: Envelope, t: number): number {
  const { values, hopSeconds } = envelope;
  if (values.length === 0) return 0;
  const pos = t / hopSeconds;
  const i0 = Math.max(0, Math.min(values.length - 1, Math.floor(pos)));
  const i1 = Math.min(values.length - 1, i0 + 1);
  const frac = pos - i0;
  return values[i0] + (values[i1] - values[i0]) * frac;
}
