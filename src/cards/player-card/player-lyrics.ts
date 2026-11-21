import { css, html, LitElement, type PropertyValues } from "lit";
import { type Translate, translator } from "../../i18n/index.js";
import { type LrcLine, parseLrc } from "../../services/lyrics/lrc-parser.js";
import { fetchLyrics, firstArtist, type TrackInfo } from "../../services/lyrics/lrclib.js";
import { haptic } from "../../utils/haptic.js";

type Lyrics =
  | { status: "loading" | "none" | "instrumental" | "error" }
  | { status: "plain"; text: string }
  | { status: "synced"; lines: LrcLine[] };

/** How long scrolling by hand pauses the auto-scroll. */
const USER_SCROLL_MS = 4000;

/** The line being sung at `pos` seconds, or -1 before the first one. */
export function lyricIndex(lines: LrcLine[], pos: number): number {
  let idx = -1;
  for (let i = 0; i < lines.length && lines[i].t <= pos; i++) idx = i;
  return idx;
}

/**
 * `<ma-player-lyrics>`: the song's lyrics from LRCLIB, synced when possible. They load the first
 * time the view is `active`; the current line follows `position`, shifted `offset` seconds early.
 *
 * Events: `seek` (detail: seconds) when a line is tapped.
 */
export class MaPlayerLyrics extends LitElement {
  static properties = {
    track: { attribute: false },
    position: { type: Number },
    offset: { type: Number },
    active: { type: Boolean },
    url: {},
    language: {},
    lyrics: { state: true },
  };

  declare track: TrackInfo | null;
  declare position: number;
  declare offset: number;
  declare active: boolean;
  declare url: string;
  declare language: string;
  declare lyrics: Lyrics | null;

  private t: Translate = translator("en");
  private trackKey = "";
  /** The line last scrolled to. */
  private shownIdx = -1;
  private userScrollAt = 0;

  constructor() {
    super();
    this.track = null;
    this.position = 0;
    this.offset = 0;
    this.active = false;
    this.url = "https://lrclib.net";
    this.language = "en";
    this.lyrics = null;
    const onUserScroll = () => (this.userScrollAt = Date.now());
    this.addEventListener("wheel", onUserScroll, { passive: true });
    this.addEventListener("touchmove", onUserScroll, { passive: true });
  }

  protected shouldUpdate(changed: PropertyValues<this>): boolean {
    return this.active || !(changed.size === 1 && changed.has("position"));
  }

  protected willUpdate(changed: PropertyValues<this>): void {
    if (changed.has("language")) this.t = translator(this.language);
    if (changed.has("track")) {
      const key = this.track ? `${this.track.title}|${this.track.artist}` : "";
      if (key !== this.trackKey) {
        this.trackKey = key;
        this.lyrics = null;
        this.shownIdx = -1;
        this.userScrollAt = 0;
        this.scrollTop = 0;
      }
    }
    if (changed.has("active") && this.active) {
      this.shownIdx = -1;
      this.userScrollAt = 0;
    }
    if (this.active && !this.lyrics) this.load();
  }

  protected updated(): void {
    const l = this.lyrics;
    if (!this.active || l?.status !== "synced") return;
    const idx = this.index(l.lines);
    if (idx === this.shownIdx) return;
    this.shownIdx = idx;
    if (this.userScrollAt && Date.now() - this.userScrollAt < USER_SCROLL_MS) return;
    const line = this.renderRoot.querySelector<HTMLElement>(".line.active");
    const top = line ? line.getBoundingClientRect().top - this.getBoundingClientRect().top + this.scrollTop : 0;
    this.scrollTo({ top: line ? top - this.clientHeight * 0.32 : 0, behavior: "smooth" });
  }

  private index(lines: LrcLine[]): number {
    return lyricIndex(lines, this.position + this.offset);
  }

  private async load(): Promise<void> {
    const track = this.track;
    const key = this.trackKey;
    if (!track?.title) {
      this.lyrics = { status: "none" };
      return;
    }
    this.lyrics = { status: "loading" };
    let lyrics: Lyrics;
    try {
      const d = await fetchLyrics(this.url.replace(/\/$/, ""), track);
      if (!d) lyrics = { status: "none" };
      else if (d.syncedLyrics) lyrics = { status: "synced", lines: parseLrc(d.syncedLyrics) };
      else if (d.instrumental) lyrics = { status: "instrumental" };
      else lyrics = { status: "plain", text: d.plainLyrics || "" };
    } catch (err) {
      console.warn("[ma-player-card] lyrics", err);
      lyrics = { status: "error" };
    }
    if (key !== this.trackKey) return;
    this.shownIdx = -1;
    this.lyrics = lyrics;
  }

  private seek(t: number): void {
    this.userScrollAt = 0;
    haptic(this, "light");
    this.dispatchEvent(new CustomEvent<number>("seek", { detail: t }));
  }

  protected render() {
    const { t } = this;
    const l = this.lyrics ?? { status: "loading" };
    switch (l.status) {
      case "loading":
      case "instrumental":
      case "error":
        return html`<div class="msg">${t(`lyrics.${l.status}`)}</div>`;
      case "none": {
        const q = `${this.track?.title || ""} ${firstArtist(this.track?.artist)}`.trim();
        return html`<div class="msg">
          <div>
            ${t("lyrics.none")}<br />
            <a class="link" href="https://lrclib.net/search/${encodeURIComponent(q)}" target="_blank" rel="noopener"
              >${t("lyrics.search")}</a
            >
          </div>
        </div>`;
      }
      case "plain":
        return html`<div class="plain">${l.text}</div>
          <div class="note">${t("lyrics.unsynced")}</div>`;
      case "synced": {
        const idx = this.index(l.lines);
        return html`<div class="pad"></div>
          ${l.lines.map(
            (x, i) =>
              html`<p class="line ${i === idx ? "active" : i < idx ? "past" : ""}" @click=${() => this.seek(x.t)}>
                ${x.text || "♪"}
              </p>`,
          )}
          <div class="note">${t("lyrics.credit")}</div>
          <div class="pad"></div>`;
      }
    }
  }

  static styles = css`
    .msg {
      height: 100%;
      display: grid;
      place-items: center;
      text-align: center;
      padding: 0 24px;
      font-size: 17px;
      color: var(--np-dim);
    }
    .link {
      display: inline-block;
      margin-top: 14px;
      padding: 10px 18px;
      border-radius: 999px;
      background: var(--np-fill);
      color: #fff;
      text-decoration: none;
      font-size: 15px;
      font-weight: 600;
    }
    .pad {
      height: 32cqh;
    }
    .line {
      margin: 0;
      padding: 10px 0;
      font-size: clamp(24px, 4.4cqw, 42px);
      font-weight: 700;
      line-height: 1.25;
      color: rgba(255, 255, 255, 0.34);
      cursor: pointer;
      transform-origin: left center;
      filter: blur(0.5px);
      transition:
        color 0.35s,
        transform 0.35s,
        filter 0.35s;
      -webkit-tap-highlight-color: transparent;
    }
    .line.past {
      color: rgba(255, 255, 255, 0.28);
    }
    .line.active {
      color: #fff;
      filter: none;
      transform: scale(1.03);
    }
    .plain {
      padding: 24px 0 8px;
      font-size: 22px;
      font-weight: 600;
      line-height: 1.55;
      white-space: pre-wrap;
      color: rgba(255, 255, 255, 0.88);
    }
    .note {
      padding: 18px 0;
      font-size: 12px;
      color: var(--np-dim);
    }
  `;
}
