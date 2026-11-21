// Letras desde LRCLIB (https://lrclib.net), gratuito y sin clave.

const lyricsCache = new Map();

// "Canción (feat. X) - Remastered 2011" → "Canción"
export const cleanTitle = (t) =>
  String(t || "")
    .replace(/\s*[([](?:feat\.?|ft\.?|with|con|featuring)\s[^)\]]*[)\]]/gi, "")
    .replace(
      /\s+-\s+.*\b(?:remaster(?:ed)?|version|versión|live|en vivo|radio edit|edit|mono|stereo|acoustic|acústico)\b.*$/i,
      "",
    )
    .trim();
// "BOM, Miranda!, Lali" → "BOM"
export const firstArtist = (a) =>
  String(a || "")
    .split(/\s*(?:,|;|&|\/|\sfeat\.?\s|\sft\.?\s|\sx\s|\sy\s)\s*/i)[0]
    .trim();

export async function fetchLyrics(base, { title, artist, album, duration }) {
  const key = `${artist}|${title}`.toLowerCase();
  if (lyricsCache.has(key)) return lyricsCache.get(key);
  const p = (async () => {
    const t2 = cleanTitle(title) || title;
    const a2 = firstArtist(artist) || artist || "";
    const dur = duration ? Math.round(duration) : 0;
    const hasLyrics = (d) => d && (d.syncedLyrics || d.plainLyrics || d.instrumental);
    // De la búsqueda, la que tenga letra sincronizada y duración más parecida (±5 s si la sabemos)
    const best = (list) => {
      const ok = (list || [])
        .filter(hasLyrics)
        .filter((x) => !dur || !x.duration || Math.abs(x.duration - dur) <= 5)
        .sort(
          (x, y) =>
            !!y.syncedLyrics - !!x.syncedLyrics ||
            (dur ? Math.abs((x.duration || dur) - dur) - Math.abs((y.duration || dur) - dur) : 0),
        );
      return ok[0] || null;
    };
    const tries = [
      ["get", { track_name: title, artist_name: artist || "", album_name: album || "", duration: dur || "" }],
      ["get", { track_name: t2, artist_name: a2, duration: dur || "" }],
      ["search", { track_name: t2, artist_name: a2 }],
      ["search", { q: `${t2} ${a2}`.trim() }],
      ["search", { track_name: t2 }],
    ];
    const seen = new Set();
    for (const [kind, params] of tries) {
      const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== "" && v != null));
      const url = `${base}/api/${kind}?${q}`;
      if (seen.has(url)) continue;
      seen.add(url);
      const r = await fetch(url);
      if (r.status === 404) continue;
      if (!r.ok) throw new Error(`LRCLIB respondió ${r.status}`);
      const d = await r.json();
      const hit = kind === "get" ? (hasLyrics(d) ? d : null) : best(d);
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
