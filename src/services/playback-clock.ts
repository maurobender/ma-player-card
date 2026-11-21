/*
 * Playback position. HA reports it as an anchor: media_position (whole seconds) plus when it
 * was measured (media_position_updated_at, by the Music Assistant server's clock). We correct:
 *   - the skew between the server's clock and this device's,
 *   - the truncation to whole seconds (+0.5 s on average),
 *   - that with some players (e.g. Voice PE) Music Assistant restarts the stream after a seek
 *     or resume and counts from that restart (it reports 0 while the song is at 90 s). When that
 *     happens right after one of our actions, we keep the difference (offset) and add it to every
 *     report until the song changes. MA bug: https://github.com/music-assistant/support/issues/7194
 */

export interface ClockReport {
  /** Only for the debug log. */
  state: string;
  playing: boolean;
  /** media_position */
  position: number;
  /** media_position_updated_at (ISO) */
  updatedAt: string;
}

export interface ClockAnchor {
  pos: number;
  at: number;
  playing: boolean;
}

/** How long after one of our actions we trust our own count over HA's. */
const EXPECT_MS = 15000;
/** A difference larger than this means MA restarted its count. */
const RESET_THRESHOLD_S = 3;

export class PlaybackClock {
  private key = "";
  private anchor: ClockAnchor | null = null;
  private lastUpd: string | undefined;
  private offset = 0;
  private expectAt = 0;
  /** MA's clock minus ours, plus latency, in ms (the smallest seen). */
  private skew: number | null = null;

  constructor(private readonly log: (msg: string) => void = () => {}) {}

  /** `key` identifies song + player: when it changes, everything resets. `report` is null without player state. */
  sync(key: string, report: ClockReport | null, duration: number, now = Date.now()): void {
    if (key !== this.key) {
      this.key = key;
      this.anchor = null;
      this.lastUpd = undefined;
      this.offset = 0;
      this.expectAt = 0;
    }
    if (!report) return;
    const { playing, updatedAt: upd } = report;
    if (upd !== this.lastUpd || !this.anchor) {
      const live = this.lastUpd !== undefined && upd !== this.lastUpd; // arrived while we were watching
      this.lastUpd = upd;
      const updMs = Date.parse(upd);
      if (live && updMs) {
        const obs = now - updMs;
        this.skew = this.skew == null ? obs : Math.min(this.skew, obs);
      }
      let ha = Number(report.position) || 0;
      if (playing && updMs) ha += 0.5 + Math.max(0, (now - (this.skew || 0) - updMs) / 1000);
      let pos = ha + this.offset;
      let note = "";
      if (this.expectAt && now - this.expectAt < EXPECT_MS && this.anchor) {
        const mine = this.position(duration, now);
        if (Math.abs(pos - mine) > RESET_THRESHOLD_S) {
          this.offset = mine - ha;
          pos = mine;
          note = ` · MA restarted its count, offset ${this.offset.toFixed(1)}s`;
        }
      }
      this.anchor = { pos, at: now, playing };
      this.log(
        `HA ${report.state} pos=${report.position} upd=${upd ? upd.slice(11, 23) : "-"} ` +
          `(${updMs ? ((now - updMs) / 1000).toFixed(1) : "?"}s) → anchor ${pos.toFixed(1)}${note}`,
      );
    } else if (this.anchor.playing !== playing) {
      // paused or resumed without a new anchor: re-anchor where we are
      this.anchor = { pos: this.position(duration, now), at: now, playing };
    }
  }

  /** After our own seek, pause or resume we know the position, even if HA is late or wrong. */
  setLocal(pos: number, playing: boolean, now = Date.now()): void {
    this.log(`local ${playing ? "▶" : "⏸"} anchor ${pos.toFixed(1)}`);
    this.expectAt = now;
    this.anchor = { pos, at: now, playing };
  }

  /** Seconds, clamped between 0 and the duration when known. */
  position(duration: number, now = Date.now()): number {
    const an = this.anchor;
    if (!an) return 0;
    let p = an.pos + (an.playing ? (now - an.at) / 1000 : 0);
    if (duration) p = Math.min(p, duration);
    return Math.max(0, p);
  }

  get debug(): { anchor: ClockAnchor | null; skew: number | null; offset: number } {
    return { anchor: this.anchor, skew: this.skew, offset: this.offset };
  }
}
