import { describe, expect, it } from "vitest";
import { gridLayout, subtitle } from "../src/cards/browser-card/browser-card.js";

describe("gridLayout", () => {
  it("picks columns from the width, at least two", () => {
    expect(gridLayout(700).cols).toBe(4);
    expect(gridLayout(200).cols).toBe(2);
  });

  it("caps the configured columns to what fits", () => {
    expect(gridLayout(1000, 3).cols).toBe(3);
    expect(gridLayout(300, 8).cols).toBe(2);
  });

  it("lays songs out in one to three columns", () => {
    expect(gridLayout(300).listCols).toBe(1);
    expect(gridLayout(700).listCols).toBe(2);
    expect(gridLayout(2000).listCols).toBe(3);
  });

  it("leaves a sliver of the next shelf tile visible", () => {
    const { shelfW = 0 } = gridLayout(800);
    expect(800 / (shelfW + 14)).toBeGreaterThan(4);
    expect(800 / (shelfW + 14)).toBeLessThan(5);
  });
});

describe("subtitle", () => {
  const artists = [{ name: "Queen" }, { name: "David Bowie" }];

  it("describes each media type", () => {
    expect(subtitle({ uri: "t", name: "Under Pressure", artists, album: { name: "Hot Space" } }, "track")).toBe(
      "Queen, David Bowie · Hot Space",
    );
    expect(subtitle({ uri: "a", name: "Hot Space", artists, year: 1982 }, "album")).toBe("Queen, David Bowie · 1982");
    expect(subtitle({ uri: "p", name: "Mix", owner: "DJ" }, "playlist")).toBe("DJ");
    expect(subtitle({ uri: "p", name: "Mix" }, "playlist")).toBe("Playlist");
    expect(subtitle({ uri: "r", name: "FM" }, "radio")).toBe("Radio");
    expect(subtitle({ uri: "x", name: "Queen", artists }, "artist")).toBe("");
  });
});
