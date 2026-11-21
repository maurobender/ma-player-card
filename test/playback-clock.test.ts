import { describe, expect, it } from "vitest";
import { type ClockReport, PlaybackClock } from "../src/services/playback-clock.js";

const T0 = Date.parse("2026-11-21T20:00:00.000Z");
const iso = (ms: number) => new Date(ms).toISOString();
const DURATION = 200;
const KEY = "media_player.salon|VIVO DEL POP|BOM";

/** Lo que informa HA: posición medida en el instante `at` (reloj de MA). */
const report = (position: number, at: number, playing = true): ClockReport => ({
  state: playing ? "playing" : "idle",
  playing,
  position,
  updatedAt: iso(at),
});

describe("PlaybackClock", () => {
  it("avanza desde el ancla mientras suena y suma medio segundo por el redondeo de MA", () => {
    const clock = new PlaybackClock();
    clock.sync(KEY, report(30, T0), DURATION, T0);
    expect(clock.position(DURATION, T0)).toBeCloseTo(30.5, 1);
    expect(clock.position(DURATION, T0 + 10_000)).toBeCloseTo(40.5, 1);
  });

  it("no avanza en pausa", () => {
    const clock = new PlaybackClock();
    clock.sync(KEY, report(30, T0, false), DURATION, T0);
    expect(clock.position(DURATION, T0 + 10_000)).toBe(30);
  });

  it("se limita entre 0 y la duración", () => {
    const clock = new PlaybackClock();
    clock.sync(KEY, report(195, T0), DURATION, T0);
    expect(clock.position(DURATION, T0 + 60_000)).toBe(DURATION);
  });

  it("compensa el desfase entre el reloj de MA y el del dispositivo", () => {
    const clock = new PlaybackClock();
    const SKEW = 4000; // el dispositivo va 4 s adelantado respecto de MA
    clock.sync(KEY, report(10, T0), DURATION, T0 + SKEW);
    // llega una actualización en vivo: con eso mide el desfase
    clock.sync(KEY, report(20, T0 + 10_000), DURATION, T0 + 10_000 + SKEW);
    expect(clock.debug.skew).toBe(SKEW);
    expect(clock.position(DURATION, T0 + 15_000 + SKEW)).toBeCloseTo(25.5, 1);
  });

  it("si MA reinicia el conteo después de adelantar, sigue en la posición correcta (#7194)", () => {
    const clock = new PlaybackClock();
    clock.sync(KEY, report(89, T0), DURATION, T0);
    // adelantamos a 105 desde la tarjeta
    clock.setLocal(105, true, T0 + 1000);
    // MA confirma 105…
    clock.sync(KEY, report(105, T0 + 1200), DURATION, T0 + 1200);
    // …y a los pocos segundos manda 0 porque reinició el stream
    clock.sync(KEY, report(0, T0 + 4000), DURATION, T0 + 4000);
    expect(clock.position(DURATION, T0 + 4000)).toBeCloseTo(108, 0);
    expect(clock.debug.offset).toBeGreaterThan(100);
    // lo siguiente que mande MA (contando desde 0) se corrige con el mismo desfase
    clock.sync(KEY, report(10, T0 + 14_000), DURATION, T0 + 14_000);
    expect(clock.position(DURATION, T0 + 14_000)).toBeCloseTo(118, 0);
  });

  it("si MA reinicia el conteo después de pausar y reanudar, sigue donde estaba", () => {
    const clock = new PlaybackClock();
    clock.sync(KEY, report(39, T0), DURATION, T0);
    clock.setLocal(39.5, false, T0 + 500); // pausa
    clock.sync(KEY, report(39, T0 + 600, false), DURATION, T0 + 600);
    clock.setLocal(39.5, true, T0 + 5000); // reanuda
    clock.sync(KEY, report(0, T0 + 5300), DURATION, T0 + 5300); // MA: 0
    expect(clock.position(DURATION, T0 + 5300)).toBeCloseTo(39.8, 0);
  });

  it("después de la ventana de 15 s vuelve a confiar en HA", () => {
    const clock = new PlaybackClock();
    clock.sync(KEY, report(50, T0), DURATION, T0);
    clock.setLocal(50, true, T0);
    // 20 s después HA informa un salto real (p. ej. alguien adelantó desde otra app)
    clock.sync(KEY, report(150, T0 + 20_000), DURATION, T0 + 20_000);
    expect(clock.position(DURATION, T0 + 20_000)).toBeCloseTo(150.5, 1);
  });

  it("al cambiar de canción empieza de cero, sin la compensación anterior", () => {
    const clock = new PlaybackClock();
    clock.sync(KEY, report(89, T0), DURATION, T0);
    clock.setLocal(105, true, T0 + 1000);
    clock.sync(KEY, report(0, T0 + 4000), DURATION, T0 + 4000);
    expect(clock.debug.offset).not.toBe(0);
    clock.sync("media_player.salon|Otra|BOM", report(2, T0 + 5000), DURATION, T0 + 5000);
    expect(clock.debug.offset).toBe(0);
    expect(clock.position(DURATION, T0 + 5000)).toBeCloseTo(2.5, 1);
  });

  it("sin estado del parlante la posición es 0", () => {
    const clock = new PlaybackClock();
    clock.sync(KEY, null, DURATION, T0);
    expect(clock.position(DURATION, T0)).toBe(0);
  });
});
