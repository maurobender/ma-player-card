/*
 * Reloj de reproducción propio. HA informa la posición como un "ancla":
 * media_position (en segundos enteros) + el momento en que se midió (media_position_updated_at,
 * con el reloj del servidor de Music Assistant). Corregimos tres cosas:
 *   - el desfase entre el reloj del servidor y el del dispositivo (skew),
 *   - el redondeo a segundos enteros (+0,5 s de media),
 *   - que con algunos parlantes (p. ej. Voice PE), tras adelantar o reanudar, Music Assistant
 *     reinicia el stream y cuenta el tiempo DESDE ESE REINICIO (manda pos=0 aunque la canción siga
 *     en el segundo 90). Si eso pasa justo después de una acción nuestra, calculamos la diferencia
 *     (offset) y se la sumamos a todo lo que llegue hasta que cambie la canción.
 *     Bug de MA: https://github.com/music-assistant/support/issues/7194
 */

/** Lo que informa HA del parlante en un momento dado. */
export interface ClockReport {
  /** Estado de HA (solo para el log de diagnóstico). */
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

/** Tiempo durante el que, después de una acción nuestra, confiamos más en nuestra cuenta que en HA. */
const EXPECT_MS = 15000;
/** Diferencia a partir de la cual consideramos que MA reinició el conteo. */
const RESET_THRESHOLD_S = 3;

export class PlaybackClock {
  private key = "";
  private anchor: ClockAnchor | null = null;
  private lastUpd: string | undefined;
  private offset = 0;
  private expectAt = 0;
  /** Desfase entre el reloj de MA y el nuestro + latencia, en ms (el menor observado). */
  private skew: number | null = null;

  constructor(private readonly log: (msg: string) => void = () => {}) {}

  /**
   * Incorpora lo que informa HA. `key` identifica canción + parlante: si cambia, empezamos de cero.
   * `report` es null si no hay estado del parlante.
   */
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
      const live = this.lastUpd !== undefined && upd !== this.lastUpd; // llegó mientras mirábamos
      this.lastUpd = upd;
      const updMs = Date.parse(upd);
      if (live && updMs) {
        const obs = now - updMs; // desfase de reloj + latencia: nos quedamos con el menor
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
          note = ` · MA reinició el conteo, compenso ${this.offset.toFixed(1)}s`;
        }
      }
      this.anchor = { pos, at: now, playing };
      this.log(
        `HA ${report.state} pos=${report.position} upd=${upd ? upd.slice(11, 23) : "-"} ` +
          `(${updMs ? ((now - updMs) / 1000).toFixed(1) : "?"}s) → ancla ${pos.toFixed(1)}${note}`,
      );
    } else if (this.anchor.playing !== playing) {
      // pausa/reanudación sin ancla nueva: re-anclamos donde estábamos
      this.anchor = { pos: this.position(duration, now), at: now, playing };
    }
  }

  /** Acción nuestra (adelantar, pausar, reanudar): sabemos dónde está, aunque HA tarde o mienta. */
  setLocal(pos: number, playing: boolean, now = Date.now()): void {
    this.log(`local ${playing ? "▶" : "⏸"} ancla ${pos.toFixed(1)}`);
    this.expectAt = now;
    this.anchor = { pos, at: now, playing };
  }

  /** Posición actual en segundos, entre 0 y la duración (si se conoce). */
  position(duration: number, now = Date.now()): number {
    const an = this.anchor;
    if (!an) return 0;
    let p = an.pos + (an.playing ? (now - an.at) / 1000 : 0);
    if (duration) p = Math.min(p, duration);
    return Math.max(0, p);
  }

  /** Para el panel de diagnóstico. */
  get debug(): { anchor: ClockAnchor | null; skew: number | null; offset: number } {
    return { anchor: this.anchor, skew: this.skew, offset: this.offset };
  }
}
