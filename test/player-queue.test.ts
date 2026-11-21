import { describe, expect, it } from "vitest";
import { dropIndex } from "../src/cards/player-card/player-queue.js";

// Four 60 px rows starting at y = 0: midpoints 30, 90, 150, 210.
const mids = [30, 90, 150, 210];

describe("dropIndex", () => {
  it("stays put until the dragged row's center crosses a neighbor's midpoint", () => {
    expect(dropIndex(mids, 1, 90)).toBe(1);
    expect(dropIndex(mids, 1, 149)).toBe(1);
    expect(dropIndex(mids, 1, 31)).toBe(1);
  });

  it("moves down past every crossed midpoint", () => {
    expect(dropIndex(mids, 1, 151)).toBe(2);
    expect(dropIndex(mids, 0, 500)).toBe(3);
  });

  it("moves up past every crossed midpoint", () => {
    expect(dropIndex(mids, 3, 89)).toBe(1);
    expect(dropIndex(mids, 3, -100)).toBe(0);
  });
});
