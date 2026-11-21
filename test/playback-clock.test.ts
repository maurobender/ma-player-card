import { describe, expect, it } from "vitest";
import { type ClockReport, PlaybackClock } from "../src/services/playback-clock.js";

const T0 = Date.parse("2026-11-21T20:00:00.000Z");
const iso = (ms: number) => new Date(ms).toISOString();
const DURATION = 200;
const KEY = "media_player.salon|VIVO DEL POP|BOM";

/** What HA reports: the position measured at `at` (MA's clock). */
const report = (position: number, at: number, playing = true): ClockReport => ({
  state: playing ? "playing" : "idle",
  playing,
  position,
  updatedAt: iso(at),
});

describe("PlaybackClock", () => {
  it("advances from the anchor while playing, plus half a second for MA's truncation", () => {
    const clock = new PlaybackClock();
    clock.sync(KEY, report(30, T0), DURATION, T0);
    expect(clock.position(DURATION, T0)).toBeCloseTo(30.5, 1);
    expect(clock.position(DURATION, T0 + 10_000)).toBeCloseTo(40.5, 1);
  });

  it("stays still while paused", () => {
    const clock = new PlaybackClock();
    clock.sync(KEY, report(30, T0, false), DURATION, T0);
    expect(clock.position(DURATION, T0 + 10_000)).toBe(30);
  });

  it("clamps between 0 and the duration", () => {
    const clock = new PlaybackClock();
    clock.sync(KEY, report(195, T0), DURATION, T0);
    expect(clock.position(DURATION, T0 + 60_000)).toBe(DURATION);
  });

  it("compensates for the skew between MA's clock and the device's", () => {
    const clock = new PlaybackClock();
    const SKEW = 4000; // the device is 4 s ahead of MA
    clock.sync(KEY, report(10, T0), DURATION, T0 + SKEW);
    // a live update measures the skew
    clock.sync(KEY, report(20, T0 + 10_000), DURATION, T0 + 10_000 + SKEW);
    expect(clock.debug.skew).toBe(SKEW);
    expect(clock.position(DURATION, T0 + 15_000 + SKEW)).toBeCloseTo(25.5, 1);
  });

  it("keeps the right position when MA restarts its count after a seek (#7194)", () => {
    const clock = new PlaybackClock();
    clock.sync(KEY, report(89, T0), DURATION, T0);
    // seek to 105 from the card
    clock.setLocal(105, true, T0 + 1000);
    // MA confirms 105…
    clock.sync(KEY, report(105, T0 + 1200), DURATION, T0 + 1200);
    // …then reports 0 a few seconds later because it restarted the stream
    clock.sync(KEY, report(0, T0 + 4000), DURATION, T0 + 4000);
    expect(clock.position(DURATION, T0 + 4000)).toBeCloseTo(108, 0);
    expect(clock.debug.offset).toBeGreaterThan(100);
    // later reports (counting from 0) get the same offset
    clock.sync(KEY, report(10, T0 + 14_000), DURATION, T0 + 14_000);
    expect(clock.position(DURATION, T0 + 14_000)).toBeCloseTo(118, 0);
  });

  it("stays where it was when MA restarts its count after pause and resume", () => {
    const clock = new PlaybackClock();
    clock.sync(KEY, report(39, T0), DURATION, T0);
    clock.setLocal(39.5, false, T0 + 500); // pause
    clock.sync(KEY, report(39, T0 + 600, false), DURATION, T0 + 600);
    clock.setLocal(39.5, true, T0 + 5000); // resume
    clock.sync(KEY, report(0, T0 + 5300), DURATION, T0 + 5300); // MA: 0
    expect(clock.position(DURATION, T0 + 5300)).toBeCloseTo(39.8, 0);
  });

  it("trusts HA again after the 15 s window", () => {
    const clock = new PlaybackClock();
    clock.sync(KEY, report(50, T0), DURATION, T0);
    clock.setLocal(50, true, T0);
    // 20 s later HA reports a real jump (e.g. someone seeked from another app)
    clock.sync(KEY, report(150, T0 + 20_000), DURATION, T0 + 20_000);
    expect(clock.position(DURATION, T0 + 20_000)).toBeCloseTo(150.5, 1);
  });

  it("starts over without the old offset when the song changes", () => {
    const clock = new PlaybackClock();
    clock.sync(KEY, report(89, T0), DURATION, T0);
    clock.setLocal(105, true, T0 + 1000);
    clock.sync(KEY, report(0, T0 + 4000), DURATION, T0 + 4000);
    expect(clock.debug.offset).not.toBe(0);
    clock.sync("media_player.salon|Otra|BOM", report(2, T0 + 5000), DURATION, T0 + 5000);
    expect(clock.debug.offset).toBe(0);
    expect(clock.position(DURATION, T0 + 5000)).toBeCloseTo(2.5, 1);
  });

  it("is 0 without player state", () => {
    const clock = new PlaybackClock();
    clock.sync(KEY, null, DURATION, T0);
    expect(clock.position(DURATION, T0)).toBe(0);
  });
});
