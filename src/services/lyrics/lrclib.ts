// Lyrics from LRCLIB (https://lrclib.net): free, no API key.

/** LRCLIB record (/api/get, and each /api/search result). */
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
  /** Seconds */
  duration?: number;
}

type Fetch = (url: string) => Promise<Pick<Response, "ok" | "status" | "json">>;

const lyricsCache = new Map<string, Promise<LrclibRecord | null>>();

export const clearLyricsCache = (): void => lyricsCache.clear();

// "Song (feat. X) - Remastered 2011" → "Song"
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

/** Prefers synced lyrics, then the closest duration (within ±5 s when known). */
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
 * Tries from the most precise lookup to the broadest. Music Assistant often sends several
 * artists at once ("BOM, Miranda!, Lali") and titles with "(feat. …)" or "- Remastered",
 * which LRCLIB's /api/get doesn't match, so we retry with cleaned values and /api/search.
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
      if (!r.ok) throw new Error(`LRCLIB responded ${r.status}`);
      const d = await r.json();
      const hit = kind === "get" ? (hasLyrics(d) ? (d as LrclibRecord) : null) : bestMatch(d, dur);
      if (hit) {
        console.info(`[ma-player-card] lyrics found on LRCLIB (${kind}: ${q})`);
        return hit;
      }
    }
    console.info(`[ma-player-card] LRCLIB has no lyrics for "${title}" by ${artist}`);
    return null;
  })();
  lyricsCache.set(key, p);
  p.catch(() => lyricsCache.delete(key));
  return p;
}
