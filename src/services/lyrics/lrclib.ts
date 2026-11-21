// Letras desde LRCLIB (https://lrclib.net), gratuito y sin clave.

/** Respuesta de LRCLIB (/api/get y cada resultado de /api/search). */
export interface LrclibRecord {
  trackName?: string;
  artistName?: string;
  duration?: number;
  instrumental?: boolean;
  plainLyrics?: string | null;
  syncedLyrics?: string | null;
}

export interface TrackInfo {
  title: string;
  artist?: string;
  album?: string;
  /** Segundos */
  duration?: number;
}

type Fetch = (url: string) => Promise<Pick<Response, "ok" | "status" | "json">>;

const lyricsCache = new Map<string, Promise<LrclibRecord | null>>();

/** Para los tests. */
export const clearLyricsCache = (): void => lyricsCache.clear();

// "Canción (feat. X) - Remastered 2011" → "Canción"
export const cleanTitle = (t: string | null | undefined): string =>
  String(t || "")
    .replace(/\s*[([](?:feat\.?|ft\.?|with|con|featuring)\s[^)\]]*[)\]]/gi, "")
    .replace(
      /\s+-\s+.*\b(?:remaster(?:ed)?|version|versión|live|en vivo|radio edit|edit|mono|stereo|acoustic|acústico)\b.*$/i,
      "",
    )
    .trim();

// "BOM, Miranda!, Lali" → "BOM"
export const firstArtist = (a: string | null | undefined): string =>
  String(a || "")
    .split(/\s*(?:,|;|&|\/|\sfeat\.?\s|\sft\.?\s|\sx\s|\sy\s)\s*/i)[0]
    .trim();

const hasLyrics = (d: LrclibRecord | null | undefined): boolean => !!d && !!(d.syncedLyrics || d.plainLyrics || d.instrumental);

/** De una búsqueda, la que tenga letra sincronizada y la duración más parecida (±5 s si la sabemos). */
export function bestMatch(list: LrclibRecord[] | null | undefined, dur: number): LrclibRecord | null {
  const ok = (list || [])
    .filter(hasLyrics)
    .filter((x) => !dur || !x.duration || Math.abs(x.duration - dur) <= 5)
    .sort(
      (x, y) =>
        Number(!!y.syncedLyrics) - Number(!!x.syncedLyrics) ||
        (dur ? Math.abs((x.duration || dur) - dur) - Math.abs((y.duration || dur) - dur) : 0),
    );
  return ok[0] || null;
}

/**
 * Busca la letra probando de lo más preciso a lo más amplio. Music Assistant suele mandar
 * varios artistas juntos ("BOM, Miranda!, Lali") y títulos con "(feat. …)" o "- Remastered",
 * que LRCLIB no encuentra con /api/get; por eso después probamos limpiando y con /api/search.
 */
export function fetchLyrics(base: string, track: TrackInfo, fetchFn: Fetch = fetch): Promise<LrclibRecord | null> {
  const { title, artist, album, duration } = track;
  const key = `${artist}|${title}`.toLowerCase();
  const cached = lyricsCache.get(key);
  if (cached) return cached;
  const p = (async () => {
    const t2 = cleanTitle(title) || title;
    const a2 = firstArtist(artist) || artist || "";
    const dur = duration ? Math.round(duration) : 0;
    const tries: ["get" | "search", Record<string, string | number>][] = [
      ["get", { track_name: title, artist_name: artist || "", album_name: album || "", duration: dur || "" }],
      ["get", { track_name: t2, artist_name: a2, duration: dur || "" }],
      ["search", { track_name: t2, artist_name: a2 }],
      ["search", { q: `${t2} ${a2}`.trim() }],
      ["search", { track_name: t2 }],
    ];
    const seen = new Set<string>();
    for (const [kind, params] of tries) {
      const q = new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v !== "" && v != null)
          .map(([k, v]) => [k, String(v)]),
      );
      const url = `${base}/api/${kind}?${q}`;
      if (seen.has(url)) continue;
      seen.add(url);
      const r = await fetchFn(url);
      if (r.status === 404) continue;
      if (!r.ok) throw new Error(`LRCLIB respondió ${r.status}`);
      const d = await r.json();
      const hit = kind === "get" ? (hasLyrics(d) ? (d as LrclibRecord) : null) : bestMatch(d, dur);
      if (hit) {
        console.info(`[ma-player-card] letra encontrada en LRCLIB (${kind}: ${q})`);
        return hit;
      }
    }
    console.info(`[ma-player-card] LRCLIB no tiene letra para «${title}» de ${artist}`);
    return null;
  })();
  lyricsCache.set(key, p);
  p.catch(() => lyricsCache.delete(key));
  return p;
}
