/*
 * ma-player-card: a mini player on the dashboard that opens "Now playing" full screen,
 * with the queue, synced lyrics and the music browser.
 */

import { html, LitElement, nothing, type PropertyValues } from "lit";
import { BackendHolder } from "../../backend/backend.js";
import { errorMessage } from "../../backend/call.js";
import type { MaBackend, PlayerApi, QueueInfo } from "../../backend/types.js";
import type { MaActionSheet } from "../../components/action-sheet.js";
import { MarqueeGroup } from "../../components/marquee.js";
import { OverlayHistory } from "../../components/overlay-history.js";
import { pickSpeaker } from "../../components/speaker-picker.js";
import { accentColor } from "../../components/theme.js";
import type { MaToast, ToastSpec } from "../../components/toast.js";
import { hassLanguage, type Translate, translator } from "../../i18n/index.js";
import type { Hass, HassEntityState, RepeatMode } from "../../models/hass.js";
import type { TrackInfo } from "../../services/lyrics/lrclib.js";
import { PlaybackClock } from "../../services/playback-clock.js";
import { TARGET_EVENT, Target, type TargetEventDetail } from "../../services/speaker-target.js";
import { listSpeakers, speakerName } from "../../services/speakers.js";
import { type ArtworkColors, artworkColors } from "../../utils/artwork-colors.js";
import { fmtTime } from "../../utils/format.js";
import { haptic } from "../../utils/haptic.js";
import { nextInstanceId } from "../../utils/ids.js";
import { VERSION } from "../../version.js";
import { type BrowserConfigInput, MaBrowserCard } from "../browser-card/browser-card.js";
import { browserStyles } from "../browser-card/browser-card.styles.js";
import { playerStyles } from "./player-card.styles.js";
import type { MaPlayerQueue } from "./player-queue.js";

export interface PlayerConfig extends BrowserConfigInput {
  entity: string;
  queue_limit: number;
  lyrics: boolean;
  lyrics_url: string;
  lyrics_offset?: number;
  /** The card on the dashboard: "compact" (one row) or "cover" (artwork background, like HA's media control card). */
  layout: "compact" | "cover";
  debug?: boolean;
}

type View = "art" | "queue" | "lyrics";
type Command = "playpause" | "prev" | "next" | "shuffle" | "repeat" | "search";

const REPEAT_ORDER: RepeatMode[] = ["off", "all", "one"];
/** How long our own play/pause wins over HA's state, which arrives a moment later. */
const OPTIMISTIC_MS = 2500;
/** How long our own volume wins over HA's. */
const VOLUME_HOLD_MS = 2000;
/** The queue reports the old favorite state for a few seconds after a change. */
const FAVORITE_HOLD_MS = 6000;
/** MediaPlayerEntityFeature.VOLUME_MUTE */
const FEATURE_VOLUME_MUTE = 8;
/** Unmuting a player without mute support, when the volume before muting is unknown. */
const DEFAULT_UNMUTE_LEVEL = 0.3;

const picture = (st?: HassEntityState): string => st?.attributes.entity_picture_local || st?.attributes.entity_picture || "";
const duration = (st?: HassEntityState): number => Number(st?.attributes.media_duration) || 0;
const canMute = (st?: HassEntityState): boolean => (Number(st?.attributes.supported_features) & FEATURE_VOLUME_MUTE) !== 0;

export class MaPlayerCard extends LitElement {
  static properties = {
    hass: { attribute: false },
    config: { state: true },
    target: { state: true },
    view: { state: true },
    npOpen: { state: true },
    fav: { state: true },
    now: { state: true },
    dragPos: { state: true },
    volume: { state: true },
    mute: { state: true },
    optimistic: { state: true },
    brokenImages: { state: true },
    colors: { state: true },
  };

  declare hass?: Hass;
  declare config?: PlayerConfig;
  declare target: string | null;
  declare view: View;
  declare npOpen: boolean;
  /** null while unknown. */
  declare fav: boolean | null;
  /** Re-renders the progress every tick. */
  declare now: number;
  /** Seek position while the slider is dragged. */
  declare dragPos: number | null;
  declare volume: { level: number; at: number } | null;
  declare mute: { muted: boolean; at: number } | null;
  declare optimistic: { playing: boolean; at: number } | null;
  declare brokenImages: ReadonlySet<string>;
  /** Colors of the current artwork ("cover" layout); null when there are none. */
  declare colors: ArtworkColors | null;

  private readonly instanceId = `ma-player-${nextInstanceId()}`;
  private readonly backends = new BackendHolder(() => this.hass as Hass);
  private readonly clock = new PlaybackClock((msg) => this.log(msg));
  /** The title and artist of the full screen player scroll together. */
  private readonly titleMarquee = new MarqueeGroup();
  private uiLang = "";
  private t: Translate = translator("en");
  private trackKey = "";
  private favAt = 0;
  private overlay: OverlayHistory | null = null;
  /** The config last passed to the embedded browser. */
  private browserConfigured?: PlayerConfig;
  private timer?: ReturnType<typeof setInterval>;
  private queueTimer?: ReturnType<typeof setTimeout>;
  private queueRecheckTimer?: ReturnType<typeof setTimeout>;
  /** Entity and shuffle state the queue was last loaded for: shuffling reorders it without changing the song. */
  private shuffleKey = "";
  private volumeTimer?: ReturnType<typeof setTimeout>;
  /** The volume to go back to, per player, when the player can't mute and muting set it to 0. */
  private unmuteLevels = new Map<string, number>();
  private debugLog: string[] = [];
  private debugQueue?: { elapsed?: number; error?: string; at: number };
  private debugPollAt = 0;
  private debugBusy = false;
  private colorsUrl = "";

  static styles = [browserStyles, playerStyles];

  constructor() {
    super();
    this.target = null;
    this.view = "art";
    this.npOpen = false;
    this.fav = null;
    this.now = Date.now();
    this.dragPos = null;
    this.volume = null;
    this.mute = null;
    this.optimistic = null;
    this.brokenImages = new Set();
    this.colors = null;
  }

  setConfig(config: Partial<PlayerConfig>): void {
    if (!config?.entity) throw new Error("Missing 'entity' (a Music Assistant media_player)");
    if (config.layout && config.layout !== "compact" && config.layout !== "cover")
      throw new Error("layout must be 'compact' or 'cover'");
    this.config = {
      queue_limit: 50,
      lyrics: true,
      lyrics_url: "https://lrclib.net",
      layout: "compact",
      ...config,
      entity: config.entity,
    };
    this.target = Target.load(this.config.entity);
  }

  getCardSize(): number {
    return 2;
  }

  getGridOptions() {
    return { columns: 12, min_columns: 6 };
  }

  static getStubConfig(hass?: Hass) {
    return MaBrowserCard.getStubConfig(hass);
  }

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener(TARGET_EVENT, this.onTargetEvent);
    clearInterval(this.timer);
    this.timer = setInterval(() => this.tick(), 500);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener(TARGET_EVENT, this.onTargetEvent);
    clearInterval(this.timer);
    clearTimeout(this.queueTimer);
    clearTimeout(this.queueRecheckTimer);
    clearTimeout(this.volumeTimer);
    this.overlay?.close();
  }

  private onTargetEvent = (e: Event): void => {
    const { entity, target } = (e as CustomEvent<TargetEventDetail>).detail;
    if (entity === this.config?.entity) this.target = target;
  };

  private get entity(): string {
    const t = this.target;
    return t && this.hass?.states[t] ? t : (this.config as PlayerConfig).entity;
  }

  private get state(): HassEntityState | undefined {
    return this.hass?.states[this.entity];
  }

  private get backend(): MaBackend {
    const c = this.config as PlayerConfig;
    return this.backends.get({ mode: c.backend || "auto", entity: c.entity, configEntryId: c.config_entry_id });
  }

  private isPlaying(st = this.state): boolean {
    if (!st) return false;
    const o = this.optimistic;
    if (o && Date.now() - o.at < OPTIMISTIC_MS) return o.playing;
    return st.state === "playing";
  }

  private volumeLevel(st = this.state): number {
    const v = this.volume;
    return v && Date.now() - v.at < VOLUME_HOLD_MS ? v.level : Number(st?.attributes.volume_level) || 0;
  }

  /** Players without mute support count as muted at volume 0. */
  private isMuted(st = this.state): boolean {
    if (!st) return false;
    if (!canMute(st)) return this.volumeLevel(st) === 0;
    const m = this.mute;
    return m && Date.now() - m.at < OPTIMISTIC_MS ? m.muted : !!st.attributes.is_volume_muted;
  }

  private position(st = this.state): number {
    return st ? this.clock.position(duration(st)) : 0;
  }

  protected willUpdate(changed: PropertyValues<this>): void {
    if (changed.has("config") && this.config) this.style.setProperty("--accent", accentColor(this.config.accent_color));
    if (!this.config || !this.hass) return;
    if (changed.has("hass")) {
      const lang = hassLanguage(this.hass);
      if (lang !== this.uiLang) {
        this.uiLang = lang;
        this.t = translator(lang);
      }
    }
    if (changed.has("hass") || changed.has("target")) {
      this.syncState();
      if (this.config.layout === "cover") this.syncColors();
    }
  }

  private syncColors(): void {
    const st = this.state;
    const url = st?.attributes.media_title ? picture(st) : "";
    if (url === this.colorsUrl) return;
    this.colorsUrl = url;
    if (!url) {
      this.colors = null;
      return;
    }
    // The previous colors stay until the new ones are ready, so the card fades instead of flashing
    artworkColors(url).then((colors) => {
      if (this.colorsUrl === url) this.colors = colors;
    });
  }

  /** Runs on every new state, even when nothing visible changed. */
  private syncState(): void {
    const st = this.state;
    const a = st?.attributes ?? {};
    if (this.optimistic && st && (st.state === "playing") === this.optimistic.playing) this.optimistic = null;
    if (this.mute && st && !!a.is_volume_muted === this.mute.muted) this.mute = null;
    const key = `${this.entity}|${a.media_title || ""}|${a.media_artist || ""}`;
    this.clock.sync(
      key,
      st
        ? {
            state: st.state,
            playing: st.state === "playing",
            position: Number(a.media_position) || 0,
            updatedAt: a.media_position_updated_at || "",
          }
        : null,
      duration(st),
    );
    if (key !== this.trackKey) {
      this.trackKey = key;
      this.fav = null;
      if (this.npOpen) this.refreshQueue();
    }
    const shuffleKey = `${this.entity}|${!!a.shuffle}`;
    if (shuffleKey !== this.shuffleKey) {
      const toggled = this.shuffleKey.startsWith(`${this.entity}|`);
      this.shuffleKey = shuffleKey;
      if (toggled && this.npOpen) this.refreshQueue(true);
    }
  }

  protected updated(): void {
    const dialog = this.renderRoot.querySelector<HTMLDialogElement>("dialog.np");
    if (dialog && dialog !== this.overlay?.dialog) this.overlay = new OverlayHistory(dialog, `${this.instanceId}:np`);
    const browser = this.browser;
    if (browser && this.config && this.browserConfigured !== this.config) {
      this.browserConfigured = this.config;
      browser.setConfig(this.browserConfig());
    }
  }

  private browserConfig(): BrowserConfigInput {
    // The embedded browser shares the card's options (media_types, home, speakers…)
    const { type, queue_limit, lyrics, lyrics_url, lyrics_offset, layout, debug, name, ...rest } = this.config as PlayerConfig;
    return { ...rest, mode: "overlay" };
  }

  private get browser(): MaBrowserCard | null {
    return this.renderRoot.querySelector("ma-browser-card");
  }

  private get queueEl(): MaPlayerQueue | null {
    return this.renderRoot.querySelector("ma-player-queue");
  }

  private get sheet(): MaActionSheet | null {
    return this.renderRoot.querySelector("ma-player-action-sheet");
  }

  private showToast(spec: ToastSpec): void {
    this.renderRoot.querySelector<MaToast>("ma-player-toast")?.show(spec);
  }

  private tick(): void {
    if (!this.hass || !this.config) return;
    this.now = Date.now();
    if (this.config.debug && this.npOpen && Date.now() - this.debugPollAt > 2000) {
      this.debugPollAt = Date.now();
      this.pollDebugQueue();
    }
  }

  protected render() {
    const c = this.config;
    const hass = this.hass;
    if (!c || !hass) return nothing;
    const { t } = this;
    const st = this.state;
    const a = st?.attributes ?? {};
    const has = !!(st && a.media_title);
    const unavailable = !st || st.state === "unavailable";
    const playing = this.isPlaying(st);
    const pic = picture(st);
    const name = speakerName(hass, this.entity);
    const d = duration(st);
    const pos = this.dragPos ?? this.position(st);
    const ratio = d ? Math.min(1, pos / d) : 0;
    const playIcon = playing ? "mdi:pause" : "mdi:play";
    const backend = this.backend;
    const showFav = has && backend.favorites.canFavorite(this.entity);
    const repeat = a.repeat || "off";
    const muted = this.isMuted(st);
    const volume = muted ? 0 : this.volumeLevel(st);
    const track: TrackInfo | null = has
      ? { title: a.media_title as string, artist: a.media_artist, album: a.media_album_name, duration: a.media_duration }
      : null;

    const open = () => (has ? this.openNowPlaying() : this.browser?.open());
    const sub = has ? [a.media_artist, a.media_album_name].filter(Boolean).join(" · ") : t("player.tap_to_search", { name });
    const dashboard =
      c.layout === "cover"
        ? this.renderCover({
            has,
            pic,
            playIcon,
            ratio,
            open,
            title: has ? String(a.media_title) : t(unavailable ? "player.unavailable" : "player.nothing_playing"),
            sub: has ? String(a.media_artist || "") : sub,
          })
        : html`      <ha-card class="mini ${has ? "" : "idle"}">
        <div class="mini-row">
          <button class="mini-main" aria-label=${t("player.open")} @click=${open}>
            <span class="mini-art">${this.renderArt(has ? pic : "")}</span>
            <span class="mini-text">
              <span class="mini-title">${has ? a.media_title : t(unavailable ? "player.unavailable" : "player.nothing_playing")}</span>
              <span class="mini-sub">
                ${sub}
              </span>
            </span>
          </button>
          <div class="mini-ctrls">
            ${this.renderCmd("ib prev", "prev", t("player.previous"), "mdi:skip-previous")}
            ${this.renderCmd("ib play", "playpause", t("player.play_pause"), playIcon)}
            ${this.renderCmd("ib next", "next", t("player.next"), "mdi:skip-next")}
            ${this.renderCmd("ib search", "search", t("browser.launcher"), "mdi:magnify")}
          </div>
        </div>
        <div class="mini-progress"><div class="fill" style="width: ${ratio * 100}%"></div></div>
      </ha-card>`;

    return html`
      ${dashboard}

      <dialog class="np" @close=${this.onNowPlayingClosed}>
        <div class="np-bg" style=${pic ? `background-image: url("${pic.replace(/"/g, "%22")}")` : ""}></div>
        <div class="np-shade"></div>
        ${c.debug && this.npOpen ? html`<pre class="np-debug">${this.debugText(st, pos)}</pre>` : nothing}
        <div class="np-inner">
          <div class="np-top">
            <button class="np-btn np-close" aria-label=${t("common.close")} @click=${() => this.overlay?.close()}>
              <ha-icon icon="mdi:chevron-down"></ha-icon>
            </button>
            <div class="np-where">${t("common.playing_on", { name })}</div>
            <span class="np-top-spacer"></span>
          </div>
          <div class="np-stage" data-view=${this.view}>
            <div class="np-art-wrap view-art"><div class="np-art ${playing ? "" : "paused"}">${this.renderArt(pic)}</div></div>
            <ma-player-queue
              class="np-list view-queue"
              .backend=${backend}
              entity=${this.entity}
              .limit=${Number(c.queue_limit) || 50}
              language=${this.uiLang}
              @queue-info=${this.onQueueInfo}
              @toast=${(e: CustomEvent<ToastSpec>) => this.showToast(e.detail)}
            ></ma-player-queue>
            ${
              c.lyrics
                ? html`<ma-player-lyrics
                    class="np-lyrics view-lyrics"
                    .track=${track}
                    .position=${pos}
                    .offset=${this.lyricsOffset()}
                    ?active=${this.npOpen && this.view === "lyrics"}
                    url=${c.lyrics_url}
                    language=${this.uiLang}
                    @seek=${(e: CustomEvent<number>) => this.seek(e.detail)}
                  ></ma-player-lyrics>`
                : nothing
            }
          </div>
          <div class="np-panel">
            <div class="np-titlerow">
              <div class="np-text">
                <ma-marquee class="np-title" .group=${this.titleMarquee} .text=${has ? a.media_title || "" : t("player.nothing_playing")}></ma-marquee>
                <ma-marquee class="np-artist" .group=${this.titleMarquee} .text=${has ? [a.media_artist, a.media_album_name].filter(Boolean).join(" — ") : ""}></ma-marquee>
              </div>
              ${
                showFav
                  ? html`<button class="np-btn fav ${this.fav ? "on" : ""}" aria-label=${t("player.favorite")} @click=${this.toggleFavorite}>
                      <ha-icon icon=${this.fav ? "mdi:heart" : "mdi:heart-outline"}></ha-icon>
                    </button>`
                  : nothing
              }
            </div>
            <ma-slider
              class="seek"
              aria-label=${t("player.position")}
              .value=${ratio}
              @slide=${(e: CustomEvent<number>) => (this.dragPos = e.detail * d)}
              @slide-end=${this.onSeekEnd}
            ></ma-slider>
            <div class="np-times"><span>${fmtTime(pos)}</span><span>${d ? `-${fmtTime(d - pos)}` : ""}</span></div>
            <div class="np-ctrls">
              ${this.renderCmd(`np-btn small ${a.shuffle ? "on" : ""}`, "shuffle", t("player.shuffle"), "mdi:shuffle-variant")}
              ${this.renderCmd("np-btn big", "prev", t("player.previous"), "mdi:skip-previous")}
              ${this.renderCmd("np-btn huge", "playpause", t("player.play_pause"), playIcon)}
              ${this.renderCmd("np-btn big", "next", t("player.next"), "mdi:skip-next")}
              ${this.renderCmd(
                `np-btn small ${repeat !== "off" ? "on" : ""}`,
                "repeat",
                t("player.repeat"),
                repeat === "one" ? "mdi:repeat-once" : repeat === "all" ? "mdi:repeat" : "mdi:repeat-off",
              )}
            </div>
            <div class="np-vol">
              <button
                class="np-vol-btn"
                aria-label=${t(muted ? "player.unmute" : "player.mute")}
                aria-pressed=${muted ? "true" : "false"}
                @click=${this.toggleMute}
              >
                <ha-icon icon=${muted ? "mdi:volume-off" : "mdi:volume-low"}></ha-icon>
              </button>
              <ma-slider
                class="vol"
                aria-label=${t("player.volume")}
                .value=${volume}
                @slide=${(e: CustomEvent<number>) => this.setVolume(e.detail, false)}
                @slide-end=${(e: CustomEvent<number | null>) => e.detail !== null && this.setVolume(e.detail, true)}
              ></ma-slider>
              <ha-icon icon="mdi:volume-high"></ha-icon>
            </div>
            <div class="np-bottom">
              ${c.lyrics ? this.renderViewButton("lyrics", t("player.lyrics"), "mdi:message-text-outline") : html`<span class="np-top-spacer"></span>`}
              <button class="np-pill" aria-label=${t("speakers.choose")} @click=${this.openSpeakers}>
                <ha-icon icon="mdi:speaker"></ha-icon><span>${name}</span>
              </button>
              ${this.renderCmd("np-btn tool", "search", t("browser.launcher"), "mdi:magnify")}
              ${this.renderViewButton("queue", t("player.queue"), "mdi:playlist-music")}
            </div>
          </div>
        </div>
      </dialog>

      <ma-browser-card .hass=${hass} .artwork=${has ? pic : null}></ma-browser-card>
      <!-- Shown over "Now playing", which is always dark -->
      <ma-player-action-sheet dark></ma-player-action-sheet>
      <ma-player-toast dark></ma-player-toast>
    `;
  }

  /** The "cover" layout: title, artist and controls over the artwork's colors, the artwork fading in on the right. */
  private renderCover(p: {
    has: boolean;
    pic: string;
    playIcon: string;
    ratio: number;
    open: () => void;
    title: string;
    sub: string;
  }) {
    const { t } = this;
    const colors = this.colors;
    const art = p.has && p.pic && !this.brokenImages.has(p.pic) ? p.pic : "";
    const vars = colors ? `--cover-bg: ${colors.background}; --cover-fg: ${colors.foreground};` : "";
    return html`<ha-card class="cover ${p.has ? "" : "idle"} ${art ? "has-art" : ""}" style=${vars}>
      ${art ? html`<div class="cover-art" style=${`background-image: url("${art.replace(/"/g, "%22")}")`}></div>` : nothing}
      <button class="cover-main" aria-label=${t("player.open")} @click=${p.open}>
        <span class="cover-title">${p.title}</span>
        ${p.sub ? html`<span class="cover-sub">${p.sub}</span>` : nothing}
      </button>
      <div class="cover-ctrls">
        ${
          p.has
            ? html`${this.renderCmd("cb", "prev", t("player.previous"), "mdi:skip-previous")}
              ${this.renderCmd("cb play", "playpause", t("player.play_pause"), p.playIcon)}
              ${this.renderCmd("cb", "next", t("player.next"), "mdi:skip-next")}`
            : nothing
        }
        <span class="cover-spacer"></span>
        ${this.renderCmd("cb small", "search", t("browser.launcher"), "mdi:magnify")}
        ${
          p.has
            ? html`<button class="cb small" aria-label=${t("player.open")} @click=${p.open}>
              <ha-icon icon="mdi:arrow-expand"></ha-icon>
            </button>`
            : nothing
        }
      </div>
      ${p.has ? html`<div class="cover-progress"><div class="fill" style="width: ${p.ratio * 100}%"></div></div>` : nothing}
    </ha-card>`;
  }

  private renderArt(url: string) {
    return url && !this.brokenImages.has(url)
      ? html`<img src=${url} alt="" draggable="false" @error=${() => (this.brokenImages = new Set(this.brokenImages).add(url))} />`
      : html`<ha-icon icon="mdi:music"></ha-icon>`;
  }

  private renderCmd(cls: string, cmd: Command, label: string, icon: string) {
    return html`<button class=${cls} aria-label=${label} @click=${() => this.cmd(cmd)}><ha-icon icon=${icon}></ha-icon></button>`;
  }

  private renderViewButton(view: View, label: string, icon: string) {
    return html`<button
      class="np-btn tool ${this.view === view ? "on" : ""}"
      aria-label=${label}
      @click=${() => this.setView(this.view === view ? "art" : view)}
    >
      <ha-icon icon=${icon}></ha-icon>
    </button>`;
  }

  private openNowPlaying(): void {
    if (!this.overlay?.open()) return;
    this.npOpen = true;
    haptic(this, "light");
    this.refreshQueue();
  }

  private onNowPlayingClosed = (): void => {
    this.npOpen = false;
  };

  private openSpeakers = async (): Promise<void> => {
    const c = this.config;
    const sheet = this.sheet;
    if (!c || !sheet || !this.hass) return;
    const ids = listSpeakers(this.hass, c.entity, c.speakers);
    const id = await pickSpeaker(sheet, this.hass, ids, this.entity, this.t);
    if (!id) return;
    // Every card for this entity updates through onTargetEvent, this one included
    Target.save(c.entity, id === c.entity ? null : id);
    haptic(this, "selection");
  };

  /** Delayed: a player usually sends several state changes in a row. */
  private refreshQueue(recheck = false): void {
    clearTimeout(this.queueTimer);
    this.queueTimer = setTimeout(() => this.queueEl?.refresh(this.view === "queue"), 400);
    // mass_queue can still answer with the old order right after a reorder, until it reloads its cache
    if (recheck) {
      clearTimeout(this.queueRecheckTimer);
      this.queueRecheckTimer = setTimeout(() => this.queueEl?.refresh(this.view === "queue"), 2500);
    }
  }

  private setView(view: View): void {
    this.view = view;
    if (view === "queue") this.queueEl?.refresh(true);
    haptic(this, "selection");
  }

  /** Player commands only log their errors: the state update shows whether they worked. */
  private run(label: string, fn: (player: PlayerApi, entity: string) => Promise<void>): Promise<void> {
    return fn(this.backend.player, this.entity).catch((err) => console.error(`[ma-player-card] ${label}`, err));
  }

  private cmd(cmd: Command): void {
    const st = this.state;
    const a = st?.attributes ?? {};
    haptic(this, "light");
    switch (cmd) {
      case "playpause": {
        const playing = !this.isPlaying(st);
        this.clock.setLocal(this.position(st), playing);
        this.optimistic = { playing, at: Date.now() };
        this.run("media_play_pause", (p, e) => p.playPause(e));
        return;
      }
      case "prev":
        this.run("media_previous_track", (p, e) => p.previous(e));
        return;
      case "next":
        this.run("media_next_track", (p, e) => p.next(e));
        return;
      case "shuffle":
        this.run("shuffle_set", (p, e) => p.setShuffle(e, !a.shuffle));
        return;
      case "repeat": {
        const next = REPEAT_ORDER[(REPEAT_ORDER.indexOf(a.repeat || "off") + 1) % REPEAT_ORDER.length];
        this.run("repeat_set", (p, e) => p.setRepeat(e, next));
        return;
      }
      case "search":
        this.browser?.open();
    }
  }

  private seek(pos: number): void {
    this.clock.setLocal(pos, this.isPlaying());
    this.requestUpdate();
    this.run("media_seek", (p, e) => p.seek(e, Math.round(pos * 10) / 10));
  }

  private onSeekEnd = (e: CustomEvent<number | null>): void => {
    this.dragPos = null;
    const d = duration(this.state);
    if (e.detail !== null && d) this.seek(e.detail * d);
  };

  /** Mutes, or unmutes back to the previous volume. */
  private toggleMute = (): void => {
    const st = this.state;
    if (!st) return;
    const muted = this.isMuted(st);
    haptic(this, "light");
    if (canMute(st)) {
      this.mute = { muted: !muted, at: Date.now() };
      this.run("volume_mute", (p, e) => p.setMute(e, !muted));
    } else if (muted) {
      this.setVolume(this.unmuteLevels.get(this.entity) || DEFAULT_UNMUTE_LEVEL, true);
    } else {
      this.unmuteLevels.set(this.entity, this.volumeLevel(st));
      this.setVolume(0, true);
    }
  };

  /** Sends at most every 250 ms while dragging, and always on release. Moving the slider unmutes. */
  private setVolume(level: number, final: boolean): void {
    const st = this.state;
    if (level > 0 && canMute(st) && this.isMuted(st)) {
      this.mute = { muted: false, at: Date.now() };
      this.run("volume_mute", (p, e) => p.setMute(e, false));
    }
    this.volume = { level, at: Date.now() };
    const send = () => {
      this.volumeTimer = undefined;
      const v = Math.round((this.volume?.level ?? level) * 100) / 100;
      this.run("volume_set", (p, e) => p.setVolume(e, v));
    };
    if (final) {
      clearTimeout(this.volumeTimer);
      send();
    } else if (!this.volumeTimer) this.volumeTimer = setTimeout(send, 250);
  }

  private lyricsOffset(): number {
    const o = Number(this.config?.lyrics_offset);
    return Number.isFinite(o) ? o : 0.6;
  }

  private toggleFavorite = async (): Promise<void> => {
    const st = this.state;
    if (!st) return;
    const item = { title: String(st.attributes.media_title || ""), image: picture(st) || undefined };
    const be = this.backend;
    const ent = this.entity;
    const remove = !!this.fav;
    const { t } = this;
    if (remove && !be.can.unfavorite) {
      this.showToast({ ...item, text: t("player.already_favorite"), icon: "mdi:heart" });
      return;
    }
    this.fav = !remove;
    this.favAt = Date.now();
    haptic(this, remove ? "light" : "success");
    try {
      if (remove) await be.favorites.unfavorite(ent);
      else await be.favorites.favorite(ent);
      this.showToast({
        ...item,
        text: t(remove ? "player.unfavorited" : "player.favorited"),
        icon: remove ? "mdi:heart-broken" : "mdi:heart",
      });
    } catch (err) {
      this.fav = remove;
      this.showToast({
        ...item,
        text: t(remove ? "player.unfavorite_failed" : "player.favorite_failed", { error: errorMessage(err) }),
        icon: "mdi:alert-circle",
        error: true,
      });
    }
  };

  private onQueueInfo = (e: CustomEvent<QueueInfo>): void => {
    const info = e.detail;
    if (info.current && Date.now() - this.favAt > FAVORITE_HOLD_MS) this.fav = !!info.current.favorite;
  };

  private log(msg: string): void {
    if (!this.config?.debug) return;
    const line = `${new Date().toISOString().slice(11, 23)} ${msg}`;
    console.info(`[ma-player-card][debug] ${line}`);
    this.debugLog = [line, ...this.debugLog].slice(0, 10);
  }

  /** Music Assistant's own elapsed_time, to compare with the card's position. */
  private async pollDebugQueue(): Promise<void> {
    if (this.debugBusy) return;
    this.debugBusy = true;
    try {
      const info = await this.backend.queue.info(this.entity);
      this.debugQueue = { elapsed: info.elapsed, at: Date.now() };
    } catch (err) {
      this.debugQueue = { error: errorMessage(err), at: Date.now() };
    }
    this.debugBusy = false;
  }

  private debugText(st: HassEntityState | undefined, pos: number): string {
    const a = st?.attributes ?? {};
    const { anchor: an, skew, offset } = this.clock.debug;
    const q = this.debugQueue;
    const ago = (t: number) => `${((Date.now() - t) / 1000).toFixed(1)}s`;
    const o = this.optimistic;
    return [
      `v${VERSION}  backend: ${this.backend.name}  state: ${st ? st.state : "-"}  (optimistic: ${o ? o.playing : "-"})`,
      `HA media_position: ${a.media_position}  duration: ${a.media_duration}`,
      `HA updated_at: ${a.media_position_updated_at || "-"}`,
      `device clock: ${new Date().toISOString()}`,
      `clock skew: ${skew == null ? "not measured" : `${skew} ms`}   MA offset: ${offset.toFixed(1)}s`,
      `anchor: ${an ? `${an.pos.toFixed(1)}s ${ago(an.at)} ago ${an.playing ? "▶" : "⏸"}` : "-"}`,
      `CARD POSITION: ${pos.toFixed(1)}s`,
      `MA queue elapsed_time: ${q ? (q.error ? `error ${q.error}` : `${q.elapsed}s (${ago(q.at)} ago)`) : "…"}`,
      "— events —",
      ...this.debugLog,
    ].join("\n");
  }
}
