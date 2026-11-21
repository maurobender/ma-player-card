import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseLrc } from "../src/services/lyrics/lrc-parser.js";
import { bestMatch, cleanTitle, clearLyricsCache, fetchLyrics, firstArtist } from "../src/services/lyrics/lrclib.js";

describe("parseLrc", () => {
  it("convierte las marcas de tiempo a segundos y ordena", () => {
    expect(parseLrc("[00:12.50] Hola\n[00:05.00] Intro\n[01:02] Chau")).toEqual([
      { t: 5, text: "Intro" },
      { t: 12.5, text: "Hola" },
      { t: 62, text: "Chau" },
    ]);
  });

  it("repite la línea si tiene varias marcas e ignora lo que no tiene", () => {
    expect(parseLrc("[ar: BOM]\n[00:01.00][00:30.00] Estribillo\ntexto suelto")).toEqual([
      { t: 1, text: "Estribillo" },
      { t: 30, text: "Estribillo" },
    ]);
  });

  it("tolera null", () => {
    expect(parseLrc(null)).toEqual([]);
  });
});

describe("cleanTitle / firstArtist", () => {
  it("saca feat. y versiones", () => {
    expect(cleanTitle("Canción (feat. X)")).toBe("Canción");
    expect(cleanTitle("Song - Remastered 2011")).toBe("Song");
    expect(cleanTitle("Tema [con Y] - Live")).toBe("Tema");
    expect(cleanTitle("Normal")).toBe("Normal");
  });

  it("se queda con el primer artista", () => {
    expect(firstArtist("BOM, Miranda!, Lali")).toBe("BOM");
    expect(firstArtist("A & B")).toBe("A");
    expect(firstArtist("A feat. B")).toBe("A");
    expect(firstArtist(undefined)).toBe("");
  });
});

describe("bestMatch", () => {
  it("prefiere letra sincronizada y duración parecida", () => {
    const list = [
      { trackName: "a", duration: 150, plainLyrics: "x" },
      { trackName: "b", duration: 300, syncedLyrics: "[00:01]x" },
      { trackName: "c", duration: 152, syncedLyrics: "[00:01]x" },
    ];
    expect(bestMatch(list, 151)?.trackName).toBe("c");
    expect(bestMatch(list, 0)?.trackName).toBe("b");
    expect(bestMatch([], 100)).toBeNull();
  });
});

describe("fetchLyrics", () => {
  beforeEach(() => {
    clearLyricsCache();
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  const res = (status: number, body: unknown = null) => ({ ok: status < 400, status, json: async () => body });

  it("si /api/get no la encuentra, prueba limpiando título y artista y después busca", async () => {
    const urls: string[] = [];
    const fetchFn = vi.fn(async (url: string) => {
      urls.push(url);
      if (url.includes("/api/search") && url.includes("artist_name=BOM")) {
        return res(200, [{ trackName: "VIVO DEL POP", duration: 180, syncedLyrics: "[00:01.00] hola" }]);
      }
      return res(404);
    });
    const hit = await fetchLyrics(
      "https://lrclib.net",
      { title: "VIVO DEL POP (feat. Lali)", artist: "BOM, Miranda!, Lali", duration: 181 },
      fetchFn,
    );
    expect(hit?.syncedLyrics).toContain("hola");
    expect(urls[0]).toContain("/api/get?track_name=VIVO+DEL+POP+%28feat.+Lali%29");
    expect(urls[1]).toContain("/api/get?track_name=VIVO+DEL+POP&artist_name=BOM");
    expect(urls[2]).toContain("/api/search?track_name=VIVO+DEL+POP&artist_name=BOM");
  });

  it("guarda el resultado en caché", async () => {
    const fetchFn = vi.fn(async () => res(200, { plainLyrics: "x" }));
    await fetchLyrics("b", { title: "T", artist: "A" }, fetchFn);
    await fetchLyrics("b", { title: "T", artist: "A" }, fetchFn);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("devuelve null si nada coincide y falla si el servidor da error", async () => {
    expect(await fetchLyrics("b", { title: "Nada" }, async () => res(404))).toBeNull();
    await expect(fetchLyrics("b", { title: "Error" }, async () => res(500))).rejects.toThrow("500");
  });
});
