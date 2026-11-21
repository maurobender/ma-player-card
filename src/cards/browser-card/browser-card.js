/*
 * ma-browser-card: search and browse Music Assistant, and play on a speaker.
 * Modes: inline, compact (a button that opens it full screen) and overlay (used inside ma-player-card).
 */

import { BackendHolder } from "../../backend/backend.js";
import { OverlayHistory } from "../../components/overlay-history.js";
import { pickSpeaker } from "../../components/speaker-picker.js";
import {
  APPLE_RED,
  AUTO_TILE_PX,
  DEBOUNCE_MS,
  DEFAULT_HOME,
  DEFAULT_TYPES,
  HOME_TTL_MS,
  LIST_COL_PX,
  LONG_PRESS_MS,
  MIN_QUERY,
  MIN_TILE_PX,
  TYPES,
} from "../../constants.js";
import { hassLanguage, translator } from "../../i18n/index.js";
import { TARGET_EVENT, Target } from "../../services/speaker-target.js";
import { listSpeakers, speakerName } from "../../services/speakers.js";
import { names } from "../../utils/format.js";
import { haptic } from "../../utils/haptic.js";
import { esc } from "../../utils/html.js";
import { nextInstanceId } from "../../utils/ids.js";
import { STYLES } from "./browser-card.styles.js";

export class MaBrowserCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._id = `ma-browser-${nextInstanceId()}`;
    this._backends = new BackendHolder(() => this._hass);
    this._q = "";
    this._type = null;
    this._status = "idle"; // idle | loading | ok | empty | error
    this._items = [];
    this._error = "";
    this._cache = new Map();
    this._reqId = 0;
    this._home = null; // [{ title, type, items }]
    this._homeStatus = "idle"; // idle | loading | ok | error
    this._homeLoadedAt = 0;
    this._target = null;
    this._t = translator("en");
    this._onTargetEvent = (e) => {
      if (this._config && e.detail.entity === this._config.entity) {
        this._target = e.detail.target;
        this._updateSpeakerLabels();
      }
    };
  }

  setConfig(config) {
    if (!config || !config.entity) throw new Error("Missing 'entity' (a Music Assistant media_player)");
    const types = (config.media_types || DEFAULT_TYPES).filter((t) => TYPES[t]);
    if (!types.length) throw new Error(`Invalid media_types. Options: ${Object.keys(TYPES).join(", ")}`);
    const mode = config.mode || "compact";
    if (!["compact", "inline", "overlay"].includes(mode)) throw new Error("mode must be 'compact' or 'inline'");
    const home = (config.home || DEFAULT_HOME).filter((h) => h && TYPES[h.media_type]);
    this._config = {
      limit: 20,
      library_only: false,
      home_limit: 20,
      speaker_selector: true,
      ...config,
      mode,
      media_types: types,
      home,
    };
    if (!types.includes(this._type)) this._type = types[0];
    this._cache.clear();
    this._home = null;
    this._homeLoadedAt = 0;
    this._target = Target.load(this._config.entity);
    if (this._rendered) this._renderShell();
  }

  set hass(hass) {
    this._hass = hass;
    const lang = hassLanguage(hass);
    if (lang !== this._lang) {
      this._lang = lang;
      this._t = translator(lang);
      this._rendered = false;
    }
    if (!this._rendered) this._renderShell();
    else this._updateSpeakerLabels();
  }

  get hass() {
    return this._hass;
  }

  getCardSize() {
    return this._config && this._config.mode === "inline" ? 8 : 1;
  }

  getGridOptions() {
    return this._config && this._config.mode === "inline"
      ? { columns: 12, min_columns: 4 }
      : { columns: 12, rows: 1, min_columns: 3, min_rows: 1 };
  }

  static getStubConfig(hass) {
    const ent = Object.keys((hass && hass.entities) || {}).find(
      (id) => id.startsWith("media_player.") && hass.entities[id].platform === "music_assistant",
    );
    return { entity: ent || "media_player.salon" };
  }

  connectedCallback() {
    window.addEventListener(TARGET_EVENT, this._onTargetEvent);
    if (this._wrap && this._ro) this._ro.observe(this._wrap);
  }

  disconnectedCallback() {
    window.removeEventListener(TARGET_EVENT, this._onTargetEvent);
    clearTimeout(this._debounce);
    clearTimeout(this._lpTimer);
    if (this._ro) this._ro.disconnect();
    if (this._fullOverlay) this._fullOverlay.close();
  }

  _renderShell() {
    if (!this._config) return;
    this._rendered = true;
    const t = this._t;
    const compact = this._config.mode !== "inline"; // full screen: compact or overlay
    const launcher = this._config.mode === "compact";
    const accent = this._config.accent_color === "theme" ? "var(--primary-color)" : this._config.accent_color || APPLE_RED;
    this.style.setProperty("--accent", accent);

    const tabs = this._config.media_types
      .map(
        (type) =>
          `<button class="tab" role="tab" data-type="${type}" aria-selected="${type === this._type}">${t(`type.${type}`)}</button>`,
      )
      .join("");

    const browser = `
      <div class="wrap ${compact ? "is-full" : "is-inline"}">
        <div class="head">
          ${
            compact || this._config.speaker_selector
              ? `
          <div class="topbar">
            ${compact ? `<h1>${t("browser.title")}</h1>` : "<span></span>"}
            <div class="actions">
              ${
                this._config.speaker_selector
                  ? `
              <button class="speaker" id="speaker" aria-label="${t("speakers.choose")}">
                <ha-icon icon="mdi:speaker"></ha-icon><span id="speakerName">${esc(this._speakerName())}</span>
                <ha-icon class="chev" icon="mdi:chevron-down"></ha-icon></button>`
                  : ""
              }
              ${compact ? `<button class="close" id="close" aria-label="${t("common.close")}"><ha-icon icon="mdi:close"></ha-icon></button>` : ""}
            </div>
          </div>`
              : ""
          }
          <div class="search">
            <ha-icon icon="mdi:magnify"></ha-icon>
            <input id="q" type="search" placeholder="${t("browser.placeholder")}" enterkeyhint="search"
                   autocomplete="off" autocorrect="off" spellcheck="false" value="${esc(this._q)}" />
            <button class="clear" id="clear" aria-label="${t("browser.clear")}" ${this._q ? "" : "hidden"}>
              <ha-icon icon="mdi:close-circle"></ha-icon></button>
          </div>
          <div class="tabs" role="tablist">${tabs}</div>
        </div>
        <div class="body" id="body"></div>
      </div>`;

    this.shadowRoot.innerHTML = `
      <style>${STYLES}</style>
      ${
        compact
          ? `${
              launcher
                ? `
        <ha-card class="launcher-card">
          <button class="launcher" id="launch">
            <span class="l-icon"><ha-icon icon="mdi:magnify"></ha-icon></span>
            <span class="l-text">
              <span class="l-name">${esc(this._config.name || t("browser.launcher"))}</span>
              <span class="l-sub" id="lsub">${esc(this._launcherSubtitle())}</span>
            </span>
            <ha-icon class="l-chev" icon="mdi:chevron-right"></ha-icon>
          </button>
        </ha-card>`
                : ""
            }
        <dialog id="full" class="full"><div class="full-bg" id="fullBg"></div><div class="full-shade"></div>${browser}</dialog>`
          : `<ha-card class="inline-card">${browser}</ha-card>`
      }
      <ma-player-action-sheet id="menu"></ma-player-action-sheet>
      <ma-player-toast id="toast"></ma-player-toast>`;

    const $ = (id) => this.shadowRoot.getElementById(id);
    this._wrap = this.shadowRoot.querySelector(".wrap");
    this._body = $("body");
    this._input = $("q");
    this._menu = $("menu");
    this._toast = $("toast");
    this._full = $("full");
    this._fullOverlay = this._full ? new OverlayHistory(this._full, `${this._id}:full`) : null;
    this._applyArtwork();
    this._launcherSub = $("lsub");
    this._speakerLabel = $("speakerName");
    if ($("speaker")) $("speaker").addEventListener("click", () => this._openSpeakers());

    if (compact) {
      if (launcher) $("launch").addEventListener("click", () => this._openFull());
      $("close").addEventListener("click", () => this._full.close());
      this._full.addEventListener("close", () => this._onFullClosed());
      // The header turns into frosted glass once the content scrolls under it
      this._wrap.addEventListener(
        "scroll",
        () => {
          this._wrap.classList.toggle("scrolled", this._wrap.scrollTop > 4);
        },
        { passive: true },
      );
    }

    this._input.addEventListener("input", () => this._onInput());
    this._input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        clearTimeout(this._debounce);
        this._search();
        this._input.blur(); // hides the on-screen keyboard
      }
    });
    $("clear").addEventListener("click", () => {
      this._input.value = "";
      this._onInput();
      this._input.focus();
    });
    this.shadowRoot.querySelector(".tabs").addEventListener("click", (e) => {
      const tab = e.target.closest(".tab");
      if (tab && tab.dataset.type !== this._type) this._setType(tab.dataset.type);
    });
    this._bindGrid();

    if (!this._ro) this._ro = new ResizeObserver(() => this._updateColumns());
    this._ro.observe(this._wrap);
    this._renderBody();
    if (!compact) this._loadHome();
  }

  open() {
    this._openFull();
  }

  /** Background behind the full screen: null = HA theme · "" = dark, no image · URL = blurred artwork. */
  setArtwork(url) {
    if (url === this._artwork) return;
    this._artwork = url;
    this._applyArtwork();
  }

  _applyArtwork() {
    const on = this._artwork != null;
    this.toggleAttribute("artwork", on); // an attribute, not a class: the player's CSS styles .art
    const bg = this.shadowRoot && this.shadowRoot.getElementById("fullBg");
    if (bg) bg.style.backgroundImage = on && this._artwork ? `url("${this._artwork.replace(/"/g, "%22")}")` : "";
  }

  _launcherSubtitle() {
    return this._t("browser.on_speaker", { name: this._speakerName() });
  }

  _openFull() {
    if (!this._fullOverlay || !this._fullOverlay.open()) return;
    this._haptic("light");
    this._updateColumns();
    this._loadHome();
  }

  _onFullClosed() {
    this._menu.close();
    this._input.blur();
  }

  _updateColumns() {
    if (!this._wrap) return;
    const w = this._wrap.clientWidth - 32;
    if (w <= 0) return;
    const fit = Math.max(2, Math.floor(w / MIN_TILE_PX));
    const cols = this._config.columns ? Math.min(Number(this._config.columns), fit) : Math.max(2, Math.round(w / AUTO_TILE_PX));
    const listCols = Math.max(1, Math.min(3, Math.floor(w / LIST_COL_PX)));
    this._wrap.style.setProperty("--cols", cols);
    this._wrap.style.setProperty("--list-cols", listCols);
    // N whole tiles per shelf plus a sliver of the next one, hinting that it scrolls
    const n = Math.max(2, Math.round(w / 200));
    this._wrap.style.setProperty("--shelf-w", `${Math.floor((w - 14 * n) / (n + 0.35))}px`);
    this._cols = cols;
  }

  _renderBody() {
    const tr = this._t;
    const t = TYPES[this._type];
    let html = "";
    if (this._status === "idle") {
      html = this._homeHtml();
    } else if (this._status === "loading" && !this._items.length) {
      const n = t.list ? 10 : Math.min(Number(this._config.limit) || 12, (this._cols || 4) * 2);
      const skel = t.list
        ? `<div class="row skel"><div class="art"></div><div class="meta"><div class="line"></div><div class="line short"></div></div></div>`
        : `<div class="tile skel"><div class="art ${t.round ? "round" : ""}"></div>
           <div class="meta"><div class="line"></div><div class="line short"></div></div></div>`;
      html = `<div class="${t.list ? "list" : "grid"}">${skel.repeat(n)}</div>`;
    } else if (this._status === "empty") {
      html = this._state(
        "mdi:music-off",
        tr("browser.no_results"),
        esc(tr("browser.no_results_text", { types: tr(`type.${this._type}`).toLowerCase(), query: this._q })),
      );
    } else if (this._status === "error") {
      html = this._state(
        "mdi:alert-circle-outline",
        tr("common.error_title"),
        esc(this._error),
        `<button class="retry" id="retry">${tr("common.retry")}</button>`,
      );
    } else {
      const dim = this._status === "loading" ? "dim" : "";
      html = t.list
        ? `<div class="list ${dim}">${this._items.map((it, i) => this._row(it, i)).join("")}</div>`
        : `<div class="grid ${dim}">${this._items.map((it, i) => this._tile(it, i)).join("")}</div>`;
    }
    this._body.innerHTML = html;

    const retry = this._body.querySelector("#retry");
    if (retry) retry.addEventListener("click", () => this._search(true));
    const homeRetry = this._body.querySelector("#homeRetry");
    if (homeRetry) homeRetry.addEventListener("click", () => this._loadHome(true));
    this._body.querySelectorAll("img").forEach((img) => {
      img.addEventListener(
        "error",
        () => {
          const art = img.parentElement;
          img.remove();
          art.insertAdjacentHTML("afterbegin", `<ha-icon class="ph" icon="${TYPES[art.dataset.type].icon}"></ha-icon>`);
        },
        { once: true },
      );
    });
  }

  _state(icon, title, text, extra = "") {
    return `<div class="state">
      <ha-icon icon="${icon}"></ha-icon>
      <div class="state-title">${title}</div>
      <div class="state-text">${text}</div>${extra}</div>`;
  }

  _typeOf(it) {
    return TYPES[it.media_type] ? it.media_type : this._type;
  }

  // data-s: "r" for search results, or the index of a home shelf
  _lookup(el) {
    const i = Number(el.dataset.i);
    const s = el.dataset.s;
    if (s === "r" || s === undefined) return this._items[i];
    const shelf = this._home && this._home[Number(s)];
    return shelf && shelf.items[i];
  }

  _art(it, type) {
    const t = TYPES[type];
    const ok = /^(https?:)?\/\//.test(it.image || "") || (it.image || "").startsWith("/");
    const inner = ok
      ? `<img src="${esc(it.image)}" alt="" loading="lazy" draggable="false" />`
      : `<ha-icon class="ph" icon="${t.icon}"></ha-icon>`;
    return `<div class="art ${t.round ? "round" : ""}" data-type="${type}">${inner}<div class="fx"></div>`;
  }

  _tile(it, i, s = "r") {
    const type = this._typeOf(it);
    const sub = this._subtitle(it, type);
    return `<div class="tile item" data-s="${s}" data-i="${i}" role="button" tabindex="0" aria-label="${esc(it.name)}">
      ${this._art(it, type)}
        <button class="more" aria-label="${this._t("browser.more")}" tabindex="-1"><ha-icon icon="mdi:dots-horizontal"></ha-icon></button>
      </div>
      <div class="meta">
        <div class="title">${esc(it.name)}${it.version ? ` <span class="ver">(${esc(it.version)})</span>` : ""}</div>
        ${sub ? `<div class="sub">${esc(sub)}</div>` : ""}
      </div>
    </div>`;
  }

  _row(it, i) {
    const type = this._typeOf(it);
    const sub = this._subtitle(it, type);
    return `<div class="row item" data-s="r" data-i="${i}" role="button" tabindex="0" aria-label="${esc(it.name)}">
      ${this._art(it, type)}</div>
      <div class="meta">
        <div class="title">${esc(it.name)}${it.version ? ` <span class="ver">(${esc(it.version)})</span>` : ""}</div>
        ${sub ? `<div class="sub">${esc(sub)}</div>` : ""}
      </div>
      <button class="more" aria-label="${this._t("browser.more")}" tabindex="-1"><ha-icon icon="mdi:dots-horizontal"></ha-icon></button>
    </div>`;
  }

  _subtitle(it, type) {
    const artists = names(it.artists);
    switch (type) {
      case "track":
        return [artists, it.album && it.album.name].filter(Boolean).join(" · ");
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

  async _loadHome(force = false) {
    if (!this._config.home.length || !this._hass) return;
    if (this._homeStatus === "loading") return;
    if (!force && this._home && Date.now() - this._homeLoadedAt < HOME_TTL_MS) return;
    this._homeStatus = "loading";
    if (this._status === "idle") this._renderBody();
    try {
      const library = this._backend().library;
      // One request per shelf; the others still show if one fails.
      const results = await Promise.allSettled(
        this._config.home.map((h) =>
          library.getLibrary({
            mediaType: h.media_type,
            limit: Number(h.limit || this._config.home_limit) || 20,
            favorite: !!h.favorite,
            orderBy: h.order_by,
          }),
        ),
      );
      this._home = this._config.home.map((h, idx) => {
        const r = results[idx];
        if (r.status === "rejected") {
          console.warn(`[ma-browser-card] shelf "${this._shelfTitle(h)}" failed:`, r.reason);
          return { shelf: h, type: h.media_type, items: [] };
        }
        return { shelf: h, type: h.media_type, items: r.value };
      });
      this._homeLoadedAt = Date.now();
      this._homeStatus = results.every((r) => r.status === "rejected") ? "error" : "ok";
      if (this._homeStatus === "error") this._homeError = results[0].reason && results[0].reason.message;
    } catch (e) {
      console.error("[ma-browser-card] home", e);
      this._homeStatus = "error";
      this._homeError = (e && e.message) || String(e);
    }
    if (this._status === "idle") this._renderBody();
  }

  /** Resolved on render so default titles follow a language change. */
  _shelfTitle(h) {
    return h.title || (h.titleKey ? this._t(h.titleKey) : this._t(`type.${h.media_type}`));
  }

  _homeHtml() {
    const t = this._t;
    const hint = this._state("mdi:music-circle-outline", t("browser.hint_title"), t("browser.hint_text"));
    if (!this._config.home.length) return hint;
    if (this._homeStatus === "loading" && !this._home) {
      const tile = `<div class="tile skel"><div class="art"></div><div class="meta"><div class="line"></div><div class="line short"></div></div></div>`;
      const shelf = `<section class="shelf-sec"><div class="shelf-title skel-title"></div><div class="shelf">${tile.repeat(8)}</div></section>`;
      return shelf.repeat(2);
    }
    if (this._homeStatus === "error" && !this._home) {
      return this._state(
        "mdi:alert-circle-outline",
        t("browser.home_error"),
        esc(this._homeError || ""),
        `<button class="retry" id="homeRetry">${t("common.retry")}</button>`,
      );
    }
    const shelves = (this._home || [])
      .map((sh, s) =>
        sh.items.length
          ? `
        <section class="shelf-sec">
          <h2 class="shelf-title">${esc(this._shelfTitle(sh.shelf))}</h2>
          <div class="shelf">${sh.items.map((it, i) => this._tile(it, i, s)).join("")}</div>
        </section>`
          : "",
      )
      .join("");
    return shelves || hint;
  }

  _speakers() {
    return listSpeakers(this._hass, this._config.entity, this._config.speakers);
  }

  _targetEntity() {
    return this._target || (this._config && this._config.entity);
  }

  _setTarget(entityId) {
    this._target = entityId === this._config.entity ? null : entityId;
    Target.save(this._config.entity, this._target);
    this._updateSpeakerLabels();
  }

  _updateSpeakerLabels() {
    // A saved speaker that no longer exists falls back to the configured one
    if (this._target && this._hass && !this._hass.states[this._target]) this._target = null;
    if (this._launcherSub) this._launcherSub.textContent = this._launcherSubtitle();
    if (this._speakerLabel) this._speakerLabel.textContent = this._speakerName();
  }

  async _openSpeakers() {
    const id = await pickSpeaker(this._menu, this._hass, this._speakers(), this._targetEntity(), this._t);
    if (!id) return;
    this._setTarget(id);
    this._haptic("selection");
  }

  _onInput() {
    this._q = this._input.value;
    this.shadowRoot.getElementById("clear").hidden = !this._q;
    clearTimeout(this._debounce);
    this._debounce = setTimeout(() => this._search(), DEBOUNCE_MS);
  }

  _setType(type) {
    this._type = type;
    for (const b of this.shadowRoot.querySelectorAll(".tab")) b.setAttribute("aria-selected", b.dataset.type === type);
    this._items = [];
    if (this._wrap.classList.contains("is-full")) this._wrap.scrollTop = 0;
    this._search();
  }

  _backend() {
    return this._backends.get({
      mode: this._config.backend || "auto",
      entity: this._config.entity,
      configEntryId: this._config.config_entry_id,
    });
  }

  async _search(force = false) {
    const q = this._q.trim();
    const type = this._type;
    const reqId = ++this._reqId;

    if (q.length < MIN_QUERY) {
      this._status = "idle";
      this._items = [];
      this._renderBody();
      return;
    }
    const key = `${type}|${q.toLowerCase()}`;
    if (!force && this._cache.has(key)) {
      this._items = this._cache.get(key);
      this._status = this._items.length ? "ok" : "empty";
      this._renderBody();
      return;
    }

    this._status = "loading";
    this._renderBody();
    try {
      const items = await this._backend().library.search(q, type, {
        limit: Number(this._config.limit) || 20,
        libraryOnly: !!this._config.library_only,
      });
      if (reqId !== this._reqId) return;
      this._cache.set(key, items);
      this._items = items;
      this._status = items.length ? "ok" : "empty";
    } catch (e) {
      if (reqId !== this._reqId) return;
      console.error("[ma-browser-card] search", e);
      this._items = [];
      this._status = "error";
      this._error = (e && (e.message || e.code)) || String(e);
    }
    this._renderBody();
  }

  _bindGrid() {
    const body = this._body;
    const itemOf = (e) => e.target.closest && e.target.closest(".item");

    body.addEventListener("pointerdown", (e) => {
      const item = itemOf(e);
      if (!item || e.target.closest(".more") || e.button > 0) return;
      this._lpStart = { x: e.clientX, y: e.clientY };
      this._lpFired = false;
      clearTimeout(this._lpTimer);
      item.classList.add("pressed");
      this._lpTimer = setTimeout(() => {
        this._lpFired = true;
        item.classList.remove("pressed");
        this._haptic("medium");
        this._openMenu(this._lookup(item), item);
      }, LONG_PRESS_MS);
    });
    const cancel = () => {
      clearTimeout(this._lpTimer);
      for (const t of body.querySelectorAll(".item.pressed")) t.classList.remove("pressed");
    };
    body.addEventListener("pointermove", (e) => {
      if (!this._lpStart) return;
      if (Math.hypot(e.clientX - this._lpStart.x, e.clientY - this._lpStart.y) > 10) cancel();
    });
    body.addEventListener("pointerup", cancel);
    body.addEventListener("pointercancel", cancel);
    body.addEventListener("pointerleave", cancel);
    body.addEventListener("contextmenu", (e) => {
      if (itemOf(e)) e.preventDefault();
    });

    body.addEventListener("click", (e) => {
      const item = itemOf(e);
      if (!item) return;
      if (this._lpFired) {
        this._lpFired = false;
        return;
      }
      const it = this._lookup(item);
      if (e.target.closest(".more")) {
        e.stopPropagation();
        this._openMenu(it, item);
      } else {
        this._play(it, null, item);
      }
    });
    body.addEventListener("keydown", (e) => {
      const item = itemOf(e);
      if (!item) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this._play(this._lookup(item), null, item);
      } else if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) {
        e.preventDefault();
        this._openMenu(this._lookup(item), item);
      }
    });
  }

  async _openMenu(it, el) {
    if (!it) return;
    const type = this._typeOf(it);
    const info = TYPES[type];
    const t = this._t;
    const k = await this._menu.show({
      header: { title: it.name, subtitle: this._subtitle(it, type), image: it.image, icon: info.icon, round: info.round },
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
    if (k) this._play(it, k === "now" ? null : k, el);
  }

  async _play(it, enqueueOverride, el) {
    if (!it || !it.uri) return;
    const type = this._typeOf(it);
    const enqueue = enqueueOverride || TYPES[type].enqueue;
    const fx = el && el.querySelector(".fx");
    this._haptic("light");
    if (fx) fx.className = "fx busy";

    try {
      await this._backend().library.play(this._targetEntity(), { uri: it.uri, mediaType: type }, enqueue);
      if (fx) {
        fx.className = "fx done";
        setTimeout(() => {
          if (fx.isConnected) fx.className = "fx";
        }, 1400);
      }
      const msg =
        enqueue === "next"
          ? this._t("browser.queued_next")
          : enqueue === "add"
            ? this._t("browser.queued")
            : this._t("common.playing_on", { name: this._speakerName() });
      const icon = enqueue === "next" ? "mdi:playlist-play" : enqueue === "add" ? "mdi:playlist-plus" : "mdi:play-circle";
      this._showToast(it, msg, icon);
    } catch (e) {
      console.error("[ma-browser-card] play_media", e);
      if (fx) {
        fx.className = "fx fail";
        setTimeout(() => {
          if (fx.isConnected) fx.className = "fx";
        }, 2000);
      }
      this._showToast(it, this._t("browser.play_failed", { error: (e && e.message) || e }), "mdi:alert-circle", true);
    }
  }

  _speakerName(entityId = this._targetEntity()) {
    return speakerName(this._hass, entityId);
  }

  _showToast(it, text, icon, error = false) {
    this._toast.show({ title: it.name, image: it.image, text, icon, error });
  }

  _haptic(kind) {
    haptic(this, kind);
  }
}
