import { describe, expect, it } from "vitest";
import { lyricIndex } from "../src/cards/player-card/player-lyrics.js";

describe("lyricIndex", () => {
  const lines = [
    { t: 5, text: "one" },
    { t: 10, text: "two" },
    { t: 15, text: "three" },
  ];

  it("is -1 before the first line", () => {
    expect(lyricIndex(lines, 4.9)).toBe(-1);
  });

  it("is the last line that has started", () => {
    expect(lyricIndex(lines, 5)).toBe(0);
    expect(lyricIndex(lines, 14.9)).toBe(1);
    expect(lyricIndex(lines, 99)).toBe(2);
  });
});
