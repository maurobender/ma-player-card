import { describe, expect, it } from "vitest";
import { contrast, pickColors, swatches } from "../src/utils/artwork-colors.js";

const pixels = (...groups: [number, [number, number, number]][]): number[] =>
  groups.flatMap(([n, [r, g, b]]) => Array.from({ length: n }, () => [r, g, b, 255]).flat());

describe("artwork colors", () => {
  it("uses the most common color as background and a readable one as text", () => {
    const purple: [number, number, number] = [40, 25, 50];
    const gold: [number, number, number] = [230, 170, 90];
    const muddy: [number, number, number] = [70, 40, 60];
    const c = pickColors(swatches(pixels([70, purple], [20, muddy], [10, gold])));
    expect(c).toEqual({ background: "rgb(40, 25, 50)", foreground: "rgb(230, 170, 90)" });
  });

  it("falls back to white or black when nothing contrasts enough", () => {
    expect(pickColors(swatches(pixels([90, [20, 20, 20]], [10, [40, 40, 40]])))?.foreground).toBe("rgb(255, 255, 255)");
    expect(pickColors(swatches(pixels([90, [240, 240, 240]], [10, [220, 220, 220]])))?.foreground).toBe("rgb(0, 0, 0)");
  });

  it("ignores transparent pixels and empty images", () => {
    expect(pickColors(swatches([255, 0, 0, 0]))).toBeNull();
    expect(contrast([0, 0, 0], [255, 255, 255])).toBeCloseTo(21);
  });
});
