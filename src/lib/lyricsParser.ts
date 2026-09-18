import type { LyricLine } from "@/types/project";

function makeLine(start: number, end: number, text: string): LyricLine {
  return { id: crypto.randomUUID(), start, end, text };
}

export function parseLRC(content: string): LyricLine[] {
  const lines: LyricLine[] = [];
  const timeTag = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;
  const rows = content.split(/\r?\n/);
  const raw: Array<{ time: number; text: string }> = [];

  for (const row of rows) {
    const matches = [...row.matchAll(timeTag)];
    if (matches.length === 0) continue;
    const text = row.replace(timeTag, "").trim();
    for (const m of matches) {
      const minutes = Number(m[1]);
      const seconds = Number(m[2]);
      const millis = Number((m[3] ?? "0").padEnd(3, "0"));
      raw.push({ time: minutes * 60 + seconds + millis / 1000, text });
    }
  }
  raw.sort((a, b) => a.time - b.time);
  for (let i = 0; i < raw.length; i++) {
    const next = raw[i + 1];
    const end = next ? next.time : raw[i].time + 4;
    if (raw[i].text) lines.push(makeLine(raw[i].time, end, raw[i].text));
  }
  return lines;
}

function srtTimeToSec(t: string): number {
  const [h, m, rest] = t.split(":");
  const [s, ms] = rest.split(",");
  return Number(h) * 3600 + Number(m) * 60 + Number(s) + Number(ms) / 1000;
}

export function parseSRT(content: string): LyricLine[] {
  const blocks = content.split(/\r?\n\r?\n/);
  const lines: LyricLine[] = [];
  for (const block of blocks) {
    const rows = block.split(/\r?\n/).filter(Boolean);
    const timeRow = rows.find((r) => r.includes("-->"));
    if (!timeRow) continue;
    const [startStr, endStr] = timeRow.split("-->").map((s) => s.trim());
    const textRows = rows.slice(rows.indexOf(timeRow) + 1);
    const text = textRows.join(" ").trim();
    if (text) lines.push(makeLine(srtTimeToSec(startStr), srtTimeToSec(endStr), text));
  }
  return lines;
}

export function parseTXT(content: string, durationSec: number): LyricLine[] {
  const rows = content.split(/\r?\n/).map((r) => r.trim()).filter(Boolean);
  if (rows.length === 0) return [];
  const perLine = durationSec / rows.length;
  return rows.map((text, i) => makeLine(i * perLine, (i + 1) * perLine, text));
}

export function parseLyricsFile(fileName: string, content: string, durationSec: number): LyricLine[] {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "lrc") return parseLRC(content);
  if (ext === "srt") return parseSRT(content);
  return parseTXT(content, durationSec);
}
