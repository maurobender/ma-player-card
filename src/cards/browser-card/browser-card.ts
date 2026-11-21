/*
 * ma-browser-card: search and browse Music Assistant, and play on a speaker.
 * Modes: inline, compact (a button that opens it full screen) and overlay (used inside ma-player-card).
 */

import { html, LitElement, nothing, type PropertyValues, type TemplateResult } from "lit";
import { live } from "lit/directives/live.js";
import { BackendHolder } from "../../backend/backend.js";
import { errorMessage } from "../../backend/call.js";
import type { BackendMode, Enqueue, MaBackend, MaMediaItem, MediaType } from "../../backend/types.js";
import type { MaActionSheet } from "../../components/action-sheet.js";
import { OverlayHistory } from "../../components/overlay-history.js";
import { pickSpeaker } from "../../components/speaker-picker.js";
import { accentColor } from "../../components/theme.js";
import type { MaToast } from "../../components/toast.js";
import {
  AUTO_TILE_PX,
  DEBOUNCE_MS,
  DEFAULT_HOME,
  DEFAULT_TYPES,
  HOME_TTL_MS,
  type HomeShelf,
  LIST_COL_PX,
  LONG_PRESS_MS,
  MIN_QUERY,
  MIN_TILE_PX,
  TYPES,
} from "../../constants.js";
import { hassLanguage, type Translate, translator } from "../../i18n/index.js";
import type { Hass } from "../../models/hass.js";
import { TARGET_EVENT, Target, type TargetEventDetail } from "../../services/speaker-target.js";
import { listSpeakers, speakerName } from "../../services/speakers.js";
import { names } from "../../utils/format.js";
import { haptic } from "../../utils/haptic.js";
import { nextInstanceId } from "../../utils/ids.js";
import { browserStyles } from "./browser-card.styles.js";

export type BrowserMode = "compact" | "inline" | "overlay";

export interface BrowserConfig {
  entity: string;
  mode: BrowserMode;
  name?: string;
  accent_color?: string;
  media_types: MediaType[];
  limit: number;
  columns?: number;
  library_only: boolean;
  speaker_selector: boolean;
  speakers?: string[];
  home: HomeShelf[];
  home_limit: number;
  config_entry_id?: string;
  backend?: BackendMode;
}

export type BrowserConfigInput = Partial<Omit<BrowserConfig, "mode" | "media_types">> & {
  mode?: string;
  media_types?: string[];
  [key: string]: unknown;
};

type Status = "idle" | "loading" | "ok" | "empty" | "error";
type Fx = "busy" | "done" | "fail";

interface Shelf {
  shelf: HomeShelf;
  items: MaMediaItem[];
}

interface Layout {
  cols: number;
  listCols: number;
  shelfW?: number;
}

const isMediaType = (t: unknown): t is MediaType => typeof t === "string" && t in TYPES;

/** Grid columns for a content width of `w` px; `configured` is the card's `columns` option. */
export function gridLayout(w: number, configured?: number): Layout {
  const fit = Math.max(2, Math.floor(w / MIN_TILE_PX));
  const cols = configured ? Math.min(Number(configured), fit) : Math.max(2, Math.round(w / AUTO_TILE_PX));
  const listCols = Math.max(1, Math.min(3, Math.floor(w / LIST_COL_PX)));
  // N whole tiles per shelf plus a sliver of the next one, hinting that it scrolls
  const n = Math.max(2, Math.round(w / 200));
  return { cols, listCols, shelfW: Math.floor((w - 14 * n) / (n + 0.35)) };
}

export function subtitle(it: MaMediaItem, type: MediaType): string {
  const artists = names(it.artists);
  switch (type) {
    case "track":
      return [artists, it.album?.name].filter(Boolean).join(" · ");
    case "album":
      return [artists, it.year].filter(Boolean).join(" · ");
    case "playlist":
      return it.owner || "Playlist";
    case "radio":
      return "Radio";
    case "artist":
      return "";
    default:
      return artists;
  }
}

const hasImage = (url: string | null | undefined): url is string => !!url && (/^(https?:)?\/\//.test(url) || url.startsWith("/"));

export class MaBrowserCard extends LitElement {
  static properties = {
    hass: { attribute: false },
    /** Background behind the full screen: null = HA theme · "" = dark, no image · URL = blurred artwork. */
    artwork: { attribute: false },
    config: { state: true },
    q: { state: true },
    type: { state: true },
    status: { state: true },
    items: { state: true },
    error: { state: true },
    home: { state: true },
    homeStatus: { state: true },
    homeError: { state: true },
    target: { state: true },
    layout: { state: true },
    scrolled: { state: true },
  };

  declare hass?: Hass;
  declare artwork: string | null;
  declare config?: BrowserConfig;
  declare q: string;
  declare type: MediaType;
  declare status: Status;
  declare items: MaMediaItem[];
  declare error: string;
  declare home: Shelf[] | null;
  declare homeStatus: "idle" | "loading" | "ok" | "error";
  declare homeError: string;
  declare target: string | null;
  declare layout: Layout;
  declare scrolled: boolean;

  private readonly instanceId = `ma-browser-${nextInstanceId()}`;
  private readonly backends = new BackendHolder(() => this.hass as Hass);
  private uiLang = "";
  private t: Translate = translator("en");
  private cache = new Map<string, MaMediaItem[]>();
  private reqId = 0;
  private homeLoadedAt = 0;
  private debounce?: ReturnType<typeof setTimeout>;
  private overlay: OverlayHistory | null = null;
  private ro = new ResizeObserver(() => this.measure());
  private observed: Element | null = null;
  /** Play feedback over the artwork, by `itemKey`. */
  private fx = new Map<string, Fx>();
  private brokenImages = new Set<string>();
  private longPress: { timer?: ReturnType<typeof setTimeout>; x: number; y: number; fired: boolean } = {
    x: 0,
    y: 0,
    fired: false,
  };

  static styles = browserStyles;

  constructor() {
    super();
    this.artwork = null;
    this.q = "";
    this.type = "track";
    this.status = "idle";
    this.items = [];
    this.error = "";
    this.home = null;
    this.homeStatus = "idle";
    this.homeError = "";
    this.target = null;
    this.layout = { cols: 4, listCols: 1 };
    this.scrolled = false;
  }

  setConfig(input: BrowserConfigInput): void {
    if (!input?.entity) throw new Error("Missing 'entity' (a Music Assistant media_player)");
    const types = (input.media_types || DEFAULT_TYPES).filter(isMediaType);
    if (!types.length) throw new Error(`Invalid media_types. Options: ${Object.keys(TYPES).join(", ")}`);
    const mode = input.mode || "compact";
    if (mode !== "compact" && mode !== "inline" && mode !== "overlay") throw new Error("mode must be 'compact' or 'inline'");
    const home = (input.home || DEFAULT_HOME).filter((h) => h && isMediaType(h.media_type));
    this.config = {
      limit: 20,
      library_only: false,
      home_limit: 20,
      speaker_selector: true,
      ...input,
      entity: input.entity,
      mode,
      media_types: types,
      home,
    };
    if (!types.includes(this.type)) this.type = types[0];
    this.cache.clear();
    this.home = null;
    this.homeStatus = "idle";
    this.homeLoadedAt = 0;
    this.target = Target.load(this.config.entity);
  }

  getCardSize(): number {
    return this.config?.mode === "inline" ? 8 : 1;
  }

  getGridOptions() {
    return this.config?.mode === "inline"
      ? { columns: 12, min_columns: 4 }
      : { columns: 12, rows: 1, min_columns: 3, min_rows: 1 };
  }

  static getStubConfig(hass?: Hass) {
    const entities = hass?.entities || {};
    const ent = Object.keys(entities).find(
      (id) => id.startsWith("media_player.") && entities[id]?.platform === "music_assistant",
    );
    return { entity: ent || "media_player.salon" };
  }

  /** Opens the browser full screen (compact and overlay modes). */
  open(): void {
    if (!this.overlay?.open()) return;
    haptic(this, "light");
    this.measure();
    this.loadHome();
  }

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener(TARGET_EVENT, this.onTargetEvent);
    if (this.observed) this.ro.observe(this.observed);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener(TARGET_EVENT, this.onTargetEvent);
    clearTimeout(this.debounce);
    clearTimeout(this.longPress.timer);
    this.ro.disconnect();
    this.overlay?.close();
  }

  private onTargetEvent = (e: Event): void => {
    const { entity, target } = (e as CustomEvent<TargetEventDetail>).detail;
    if (entity === this.config?.entity) this.target = target;
  };

  protected willUpdate(changed: PropertyValues<this>): void {
    if (changed.has("hass")) {
      const lang = hassLanguage(this.hass);
      if (lang !== this.uiLang) {
        this.uiLang = lang;
        this.t = translator(lang);
      }
      // A saved speaker that no longer exists falls back to the configured one
      if (this.target && this.hass && !this.hass.states[this.target]) this.target = null;
    }
    if (changed.has("config") && this.config) this.style.setProperty("--accent", accentColor(this.config.accent_color));
    if (changed.has("artwork")) this.toggleAttribute("artwork", this.artwork != null); // the player's CSS styles .art
  }

  protected updated(): void {
    const dialog = this.renderRoot.querySelector<HTMLDialogElement>("dialog.full");
    if (dialog !== (this.overlay?.dialog ?? null)) {
      this.overlay?.close();
      this.overlay = dialog ? new OverlayHistory(dialog, `${this.instanceId}:full`) : null;
    }
    const wrap = this.renderRoot.querySelector(".wrap");
    if (wrap !== this.observed) {
      if (this.observed) this.ro.unobserve(this.observed);
      if (wrap) this.ro.observe(wrap);
      this.observed = wrap;
    }
    if (this.config?.mode === "inline" && this.homeStatus === "idle") this.loadHome();
  }

  private measure(): void {
    const wrap = this.observed as HTMLElement | null;
    if (!wrap || !this.config) return;
    const w = wrap.clientWidth - 32;
    if (w <= 0) return;
    const next = gridLayout(w, this.config.columns);
    const cur = this.layout;
    if (next.cols !== cur.cols || next.listCols !== cur.listCols || next.shelfW !== cur.shelfW) this.layout = next;
  }

  private get backend(): MaBackend {
    const c = this.config as BrowserConfig;
    return this.backends.get({ mode: c.backend || "auto", entity: c.entity, configEntryId: c.config_entry_id });
  }

  private get targetEntity(): string {
    return this.target || (this.config as BrowserConfig).entity;
  }

  private get speakerLabel(): string {
    return speakerName(this.hass, this.targetEntity);
  }

  protected render() {
    const c = this.config;
    if (!c) return nothing;
    const full = c.mode !== "inline";
    const browser = this.renderBrowser(full);
    return html`
      ${
        full
          ? html`
            ${c.mode === "compact" ? this.renderLauncher(c) : nothing}
            <dialog class="full" @close=${this.onFullClosed}>
              <div
                class="full-bg"
                style=${this.artwork ? `background-image: url("${this.artwork.replace(/"/g, "%22")}")` : ""}
              ></div>
              <div class="full-shade"></div>
              ${browser}
            </dialog>
          `
          : html`<ha-card class="inline-card">${browser}</ha-card>`
      }
      <ma-player-action-sheet></ma-player-action-sheet>
      <ma-player-toast></ma-player-toast>
    `;
  }

  private renderLauncher(c: BrowserConfig) {
    return html`
      <ha-card class="launcher-card">
        <button class="launcher" @click=${() => this.open()}>
          <span class="l-icon"><ha-icon icon="mdi:magnify"></ha-icon></span>
          <span class="l-text">
            <span class="l-name">${c.name || this.t("browser.launcher")}</span>
            <span class="l-sub">${this.t("browser.on_speaker", { name: this.speakerLabel })}</span>
          </span>
          <ha-icon class="l-chev" icon="mdi:chevron-right"></ha-icon>
        </button>
      </ha-card>
    `;
  }

  private renderBrowser(full: boolean) {
    const { t, layout } = this;
    const c = this.config as BrowserConfig;
    const vars = `--cols: ${layout.cols}; --list-cols: ${layout.listCols};${layout.shelfW ? ` --shelf-w: ${layout.shelfW}px;` : ""}`;
    return html`
      <div
        class="wrap ${full ? "is-full" : "is-inline"} ${this.scrolled ? "scrolled" : ""}"
        style=${vars}
        @scroll=${full ? this.onScroll : nothing}
      >
        <div class="head">
          ${
            full || c.speaker_selector
              ? html`
                <div class="topbar">
                  ${full ? html`<h1>${t("browser.title")}</h1>` : html`<span></span>`}
                  <div class="actions">
                    ${
                      c.speaker_selector
                        ? html`<button class="speaker" aria-label=${t("speakers.choose")} @click=${this.openSpeakers}>
                          <ha-icon icon="mdi:speaker"></ha-icon><span>${this.speakerLabel}</span>
                          <ha-icon class="chev" icon="mdi:chevron-down"></ha-icon>
                        </button>`
                        : nothing
                    }
                    ${
                      full
                        ? html`<button class="close" aria-label=${t("common.close")} @click=${() => this.overlay?.close()}>
                          <ha-icon icon="mdi:close"></ha-icon>
                        </button>`
                        : nothing
                    }
                  </div>
                </div>
              `
              : nothing
          }
          <div class="search">
            <ha-icon icon="mdi:magnify"></ha-icon>
            <input
              type="search"
              placeholder=${t("browser.placeholder")}
              enterkeyhint="search"
              autocomplete="off"
              autocorrect="off"
              spellcheck="false"
              .value=${live(this.q)}
              @input=${this.onInput}
              @keydown=${this.onSearchKey}
            />
            <button class="clear" aria-label=${t("browser.clear")} ?hidden=${!this.q} @click=${this.clearSearch}>
              <ha-icon icon="mdi:close-circle"></ha-icon>
            </button>
          </div>
          ${
            // The tabs only filter search results, so they stay hidden while the home view is shown
            this.q.trim()
              ? html`<div class="tabs" role="tablist">
                  ${c.media_types.map(
                    (type) =>
                      html`<button
                        class="tab"
                        role="tab"
                        aria-selected=${type === this.type ? "true" : "false"}
                        @click=${() => this.setType(type)}
                      >
                        ${t(`type.${type}`)}
                      </button>`,
                  )}
                </div>`
              : nothing
          }
        </div>
        <div
          class="body"
          @pointerdown=${this.onPointerDown}
          @pointermove=${this.onPointerMove}
          @pointerup=${this.cancelLongPress}
          @pointercancel=${this.cancelLongPress}
          @pointerleave=${this.cancelLongPress}
          @contextmenu=${this.onContextMenu}
          @click=${this.onItemClick}
          @keydown=${this.onItemKey}
        >
          ${this.renderBody()}
        </div>
      </div>
    `;
  }

  private renderBody(): TemplateResult {
    const { t } = this;
    const info = TYPES[this.type];
    switch (this.status) {
      case "idle":
        return this.renderHome();
      case "empty":
        return this.renderState(
          "mdi:music-off",
          t("browser.no_results"),
          t("browser.no_results_text", { types: t(`type.${this.type}`).toLowerCase(), query: this.q }),
        );
      case "error":
        return this.renderState(
          "mdi:alert-circle-outline",
          t("common.error_title"),
          this.error,
          html`<button class="retry" @click=${() => this.search(true)}>${t("common.retry")}</button>`,
        );
    }
    if (this.status === "loading" && !this.items.length) {
      const n = info.list ? 10 : Math.min(Number(this.config?.limit) || 12, this.layout.cols * 2);
      const skel = info.list
        ? html`<div class="row skel">
            <div class="art"></div>
            <div class="meta"><div class="line"></div><div class="line short"></div></div>
          </div>`
        : html`<div class="tile skel">
            <div class="art ${info.round ? "round" : ""}"></div>
            <div class="meta"><div class="line"></div><div class="line short"></div></div>
          </div>`;
      return html`<div class=${info.list ? "list" : "grid"}>${Array.from({ length: n }, () => skel)}</div>`;
    }
    const dim = this.status === "loading" ? "dim" : "";
    return info.list
      ? html`<div class="list ${dim}">${this.items.map((it, i) => this.renderRow(it, i))}</div>`
      : html`<div class="grid ${dim}">${this.items.map((it, i) => this.renderTile(it, i, "r"))}</div>`;
  }

  private renderState(icon: string, title: string, text: string, extra: unknown = nothing) {
    return html`<div class="state">
      <ha-icon icon=${icon}></ha-icon>
      <div class="state-title">${title}</div>
      <div class="state-text">${text}</div>
      ${extra}
    </div>`;
  }

  /** Resolved on render so default titles follow a language change. */
  private shelfTitle(h: HomeShelf): string {
    return h.title || (h.titleKey ? this.t(h.titleKey) : this.t(`type.${h.media_type}`));
  }

  private renderHome(): TemplateResult {
    const { t } = this;
    const hint = this.renderState("mdi:music-circle-outline", t("browser.hint_title"), t("browser.hint_text"));
    if (!this.config?.home.length) return hint;
    if (this.homeStatus === "loading" && !this.home) {
      const tile = html`<div class="tile skel">
        <div class="art"></div>
        <div class="meta"><div class="line"></div><div class="line short"></div></div>
      </div>`;
      const shelf = html`<section class="shelf-sec">
        <div class="shelf-title skel-title"></div>
        <div class="shelf">${Array.from({ length: 8 }, () => tile)}</div>
      </section>`;
      return html`${shelf}${shelf}`;
    }
    if (this.homeStatus === "error" && !this.home) {
      return this.renderState(
        "mdi:alert-circle-outline",
        t("browser.home_error"),
        this.homeError,
        html`<button class="retry" @click=${() => this.loadHome(true)}>${t("common.retry")}</button>`,
      );
    }
    const home = this.home || [];
    if (!home.some((sh) => sh.items.length)) return hint;
    return html`${home.map((sh, s) =>
      sh.items.length
        ? html`<section class="shelf-sec">
            <h2 class="shelf-title">${this.shelfTitle(sh.shelf)}</h2>
            <div class="shelf">${sh.items.map((it, i) => this.renderTile(it, i, String(s)))}</div>
          </section>`
        : nothing,
    )}`;
  }

  private typeOf(it: MaMediaItem): MediaType {
    return isMediaType(it.media_type) ? it.media_type : this.type;
  }

  /** `s`: "r" for search results, or the index of a home shelf. */
  private itemKey(s: string, it: MaMediaItem): string {
    return `${s}|${it.uri}`;
  }

  private renderArt(it: MaMediaItem, type: MediaType, s: string, extra: unknown = nothing) {
    const info = TYPES[type];
    const img = hasImage(it.image) && !this.brokenImages.has(it.image) ? it.image : null;
    return html`<div class="art ${info.round ? "round" : ""}">
      ${
        img
          ? html`<img src=${img} alt="" loading="lazy" draggable="false" @error=${() => this.onImageError(img)} />`
          : html`<ha-icon class="ph" icon=${info.icon}></ha-icon>`
      }
      <div class="fx ${this.fx.get(this.itemKey(s, it)) || ""}"></div>
      ${extra}
    </div>`;
  }

  private renderMeta(it: MaMediaItem, sub: string) {
    return html`<div class="meta">
      <div class="title">${it.name}${it.version ? html` <span class="ver">(${it.version})</span>` : nothing}</div>
      ${sub ? html`<div class="sub">${sub}</div>` : nothing}
    </div>`;
  }

  private renderMore() {
    return html`<button class="more" aria-label=${this.t("browser.more")} tabindex="-1">
      <ha-icon icon="mdi:dots-horizontal"></ha-icon>
    </button>`;
  }

  private renderTile(it: MaMediaItem, i: number, s: string) {
    const type = this.typeOf(it);
    return html`<div class="tile item" data-s=${s} data-i=${i} role="button" tabindex="0" aria-label=${it.name}>
      ${this.renderArt(it, type, s, this.renderMore())} ${this.renderMeta(it, subtitle(it, type))}
    </div>`;
  }

  private renderRow(it: MaMediaItem, i: number) {
    const type = this.typeOf(it);
    return html`<div class="row item" data-s="r" data-i=${i} role="button" tabindex="0" aria-label=${it.name}>
      ${this.renderArt(it, type, "r")} ${this.renderMeta(it, subtitle(it, type))} ${this.renderMore()}
    </div>`;
  }

  private onImageError(url: string): void {
    this.brokenImages.add(url);
    this.requestUpdate();
  }

  private onFullClosed = (): void => {
    this.sheet?.close();
    this.renderRoot.querySelector("input")?.blur();
  };

  // The header turns into frosted glass once the content scrolls under it
  private onScroll = (e: Event): void => {
    const scrolled = (e.currentTarget as HTMLElement).scrollTop > 4;
    if (scrolled !== this.scrolled) this.scrolled = scrolled;
  };

  private get sheet(): MaActionSheet | null {
    return this.renderRoot.querySelector("ma-player-action-sheet");
  }

  private get toast(): MaToast | null {
    return this.renderRoot.querySelector("ma-player-toast");
  }

  private openSpeakers = async (): Promise<void> => {
    const c = this.config;
    const sheet = this.sheet;
    if (!c || !sheet || !this.hass) return;
    const ids = listSpeakers(this.hass, c.entity, c.speakers);
    const id = await pickSpeaker(sheet, this.hass, ids, this.targetEntity, this.t);
    if (!id) return;
    this.target = id === c.entity ? null : id;
    Target.save(c.entity, this.target);
    haptic(this, "selection");
  };

  private onInput = (e: Event): void => {
    this.q = (e.target as HTMLInputElement).value;
    clearTimeout(this.debounce);
    this.debounce = setTimeout(() => this.search(), DEBOUNCE_MS);
  };

  private onSearchKey = (e: KeyboardEvent): void => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    clearTimeout(this.debounce);
    this.search();
    (e.target as HTMLInputElement).blur(); // hides the on-screen keyboard
  };

  private clearSearch = (): void => {
    this.q = "";
    clearTimeout(this.debounce);
    this.search();
    this.renderRoot.querySelector("input")?.focus();
  };

  private setType(type: MediaType): void {
    if (type === this.type) return;
    this.type = type;
    this.items = [];
    const wrap = this.observed as HTMLElement | null;
    if (wrap?.classList.contains("is-full")) wrap.scrollTop = 0;
    this.search();
  }

  private async search(force = false): Promise<void> {
    const c = this.config;
    if (!c) return;
    const q = this.q.trim();
    const type = this.type;
    const reqId = ++this.reqId;
    if (q.length < MIN_QUERY) {
      this.status = "idle";
      this.items = [];
      return;
    }
    const key = `${type}|${q.toLowerCase()}`;
    const cached = this.cache.get(key);
    if (!force && cached) {
      this.items = cached;
      this.status = cached.length ? "ok" : "empty";
      return;
    }
    this.status = "loading";
    try {
      const items = await this.backend.library.search(q, type, { limit: Number(c.limit) || 20, libraryOnly: !!c.library_only });
      if (reqId !== this.reqId) return;
      this.cache.set(key, items);
      this.items = items;
      this.status = items.length ? "ok" : "empty";
    } catch (err) {
      if (reqId !== this.reqId) return;
      console.error("[ma-browser-card] search", err);
      this.items = [];
      this.status = "error";
      this.error = errorMessage(err);
    }
  }

  private async loadHome(force = false): Promise<void> {
    const c = this.config;
    if (!c?.home.length || !this.hass || this.homeStatus === "loading") return;
    if (!force && this.home && Date.now() - this.homeLoadedAt < HOME_TTL_MS) return;
    this.homeStatus = "loading";
    const library = this.backend.library;
    // One request per shelf; the others still show if one fails.
    const results = await Promise.allSettled(
      c.home.map((h) =>
        library.getLibrary({
          mediaType: h.media_type,
          limit: Number(h.limit || c.home_limit) || 20,
          favorite: !!h.favorite,
          orderBy: h.order_by,
        }),
      ),
    );
    if (c !== this.config) return;
    this.home = c.home.map((shelf, i) => {
      const r = results[i];
      if (r.status === "fulfilled") return { shelf, items: r.value };
      console.warn(`[ma-browser-card] shelf "${this.shelfTitle(shelf)}" failed:`, r.reason);
      return { shelf, items: [] };
    });
    this.homeLoadedAt = Date.now();
    const failed = results.find((r): r is PromiseRejectedResult => r.status === "rejected");
    this.homeStatus = failed && results.every((r) => r.status === "rejected") ? "error" : "ok";
    if (this.homeStatus === "error") this.homeError = errorMessage(failed?.reason);
  }

  private itemOf(e: Event): HTMLElement | null {
    return (e.target as Element).closest?.<HTMLElement>(".item") ?? null;
  }

  private lookup(el: HTMLElement): { it: MaMediaItem; s: string } | null {
    const i = Number(el.dataset.i);
    const s = el.dataset.s || "r";
    const it = s === "r" ? this.items[i] : this.home?.[Number(s)]?.items[i];
    return it ? { it, s } : null;
  }

  private onPointerDown = (e: PointerEvent): void => {
    const el = this.itemOf(e);
    if (!el || (e.target as Element).closest(".more") || e.button > 0) return;
    const lp = this.longPress;
    clearTimeout(lp.timer);
    Object.assign(lp, { x: e.clientX, y: e.clientY, fired: false });
    el.classList.add("pressed");
    lp.timer = setTimeout(() => {
      lp.fired = true;
      el.classList.remove("pressed");
      haptic(this, "medium");
      this.openMenu(el);
    }, LONG_PRESS_MS);
  };

  private onPointerMove = (e: PointerEvent): void => {
    const lp = this.longPress;
    if (lp.timer && Math.hypot(e.clientX - lp.x, e.clientY - lp.y) > 10) this.cancelLongPress();
  };

  private cancelLongPress = (): void => {
    clearTimeout(this.longPress.timer);
    this.longPress.timer = undefined;
    for (const el of this.renderRoot.querySelectorAll(".item.pressed")) el.classList.remove("pressed");
  };

  private onContextMenu = (e: Event): void => {
    if (this.itemOf(e)) e.preventDefault();
  };

  private onItemClick = (e: Event): void => {
    const el = this.itemOf(e);
    if (!el) return;
    if (this.longPress.fired) {
      this.longPress.fired = false;
      return;
    }
    if ((e.target as Element).closest(".more")) {
      e.stopPropagation();
      this.openMenu(el);
    } else this.play(el);
  };

  private onItemKey = (e: KeyboardEvent): void => {
    const el = this.itemOf(e);
    if (!el) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      this.play(el);
    } else if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) {
      e.preventDefault();
      this.openMenu(el);
    }
  };

  private async openMenu(el: HTMLElement): Promise<void> {
    const found = this.lookup(el);
    const sheet = this.sheet;
    if (!found || !sheet) return;
    const { it } = found;
    const type = this.typeOf(it);
    const info = TYPES[type];
    const { t } = this;
    const key = await sheet.show({
      header: { title: it.name, subtitle: subtitle(it, type), image: it.image || undefined, icon: info.icon, round: info.round },
      actions: [
        { key: "now", label: t("browser.play_now"), icon: "mdi:play" },
        ...(info.noQueue
          ? []
          : [
              { key: "next", label: t("browser.play_next"), icon: "mdi:playlist-play" },
              { key: "add", label: t("browser.add_to_queue"), icon: "mdi:playlist-plus" },
            ]),
      ],
      cancelLabel: t("common.cancel"),
    });
    if (key === "next" || key === "add") this.play(el, key);
    else if (key === "now") this.play(el);
  }

  private setFx(key: string, fx: Fx | null, clearAfter?: number): void {
    if (fx) this.fx.set(key, fx);
    else this.fx.delete(key);
    this.requestUpdate();
    if (clearAfter)
      setTimeout(() => {
        if (this.fx.get(key) === fx) this.setFx(key, null);
      }, clearAfter);
  }

  private async play(el: HTMLElement, enqueueOverride?: Enqueue): Promise<void> {
    const found = this.lookup(el);
    if (!found?.it.uri) return;
    const { it, s } = found;
    const type = this.typeOf(it);
    const enqueue = enqueueOverride || TYPES[type].enqueue;
    const key = this.itemKey(s, it);
    const { t } = this;
    haptic(this, "light");
    this.setFx(key, "busy");
    try {
      await this.backend.library.play(this.targetEntity, { uri: it.uri, mediaType: type }, enqueue);
      this.setFx(key, "done", 1400);
      const msg =
        enqueue === "next"
          ? t("browser.queued_next")
          : enqueue === "add"
            ? t("browser.queued")
            : t("common.playing_on", { name: this.speakerLabel });
      const icon = enqueue === "next" ? "mdi:playlist-play" : enqueue === "add" ? "mdi:playlist-plus" : "mdi:play-circle";
      this.toast?.show({ title: it.name, image: it.image || undefined, text: msg, icon });
    } catch (err) {
      console.error("[ma-browser-card] play_media", err);
      this.setFx(key, "fail", 2000);
      this.toast?.show({
        title: it.name,
        image: it.image || undefined,
        text: t("browser.play_failed", { error: errorMessage(err) }),
        icon: "mdi:alert-circle",
        error: true,
      });
    }
  }
}
