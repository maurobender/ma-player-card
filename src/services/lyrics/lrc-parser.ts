// "[01:23.45] text" → [{ t: 83.45, text: "text" }]
export interface LrcLine {
  /** Seconds */
  t: number;
  text: string;
}

export function parseLrc(lrc: string | null | undefined): LrcLine[] {
  const lines: LrcLine[] = [];
  for (const raw of String(lrc || "").split(/\r?\n/)) {
    const stamps = [...raw.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)];
    if (!stamps.length) continue;
    const text = raw.replace(/\[[^\]]*\]/g, "").trim();
    for (const m of stamps) lines.push({ t: Number(m[1]) * 60 + Number(m[2]), text });
  }
  return lines.sort((a, b) => a.t - b.t);
}
