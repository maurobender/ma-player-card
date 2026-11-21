/*
 * ma-player-card.js — Reproductor y buscador de música para Music Assistant (Home Assistant)
 *
 * Un solo archivo con dos tarjetas:
 *   custom:ma-player-card   lo que suena + "Reproduciendo" a pantalla completa (cola, letra, buscador)
 *   custom:ma-browser-card  solo el buscador
 *
 * Usa la integración oficial de Music Assistant del core de HA:
 *   - music_assistant.search      (buscar, con return_response)
 *   - music_assistant.get_library (vista inicial: recientes y favoritos)
 *   - music_assistant.get_queue   (cola, solo lectura)
 *   - music_assistant.play_media  (reproducir / encolar)
 *   - media_player.*              (controles) y button.press (favorito)
 *
 * YAML (ver README para todas las opciones):
 *   type: custom:ma-player-card
 *   entity: media_player.salon
 */

const VERSION = "0.5.0";

const TYPES = {
  track:     { label: "Canciones",   key: "tracks",     icon: "mdi:music-note",     enqueue: "play", list: true },
  artist:    { label: "Artistas",    key: "artists",    icon: "mdi:account-music",  enqueue: "replace", round: true },
  album:     { label: "Álbumes",     key: "albums",     icon: "mdi:album",          enqueue: "replace" },
  playlist:  { label: "Playlists",   key: "playlists",  icon: "mdi:playlist-music", enqueue: "replace" },
  radio:     { label: "Radios",      key: "radio",      icon: "mdi:radio",          enqueue: "replace", noQueue: true },
  podcast:   { label: "Podcasts",    key: "podcasts",   icon: "mdi:podcast",        enqueue: "replace" },
  audiobook: { label: "Audiolibros", key: "audiobooks", icon: "mdi:book-music",     enqueue: "replace" },
};
const DEFAULT_TYPES = ["track", "artist", "album", "playlist", "radio"];
// Estantes de la vista inicial. order_by verificado en music_assistant/controllers/music/constants.py
const DEFAULT_HOME = [
  { title: "Escuchado recientemente", media_type: "album", order_by: "last_played_desc" },
  { title: "Tus playlists", media_type: "playlist", favorite: true, order_by: "favorite_timestamp_desc" },
  { title: "Artistas favoritos", media_type: "artist", favorite: true, order_by: "favorite_timestamp_desc" },
  { title: "Álbumes favoritos", media_type: "album", favorite: true, order_by: "favorite_timestamp_desc" },
  { title: "Radios favoritas", media_type: "radio", favorite: true, order_by: "favorite_timestamp_desc" },
];
const HOME_TTL_MS = 5 * 60 * 1000;
const STATE_LABELS = {
  playing: "Reproduciendo", paused: "En pausa", idle: "Inactivo", on: "Encendido",
  off: "Apagado", standby: "En espera", buffering: "Cargando", unavailable: "No disponible",
};
const APPLE_RED = "#fa2d48";
const DEBOUNCE_MS = 350;
const LONG_PRESS_MS = 500;
const MIN_QUERY = 2;
const MIN_TILE_PX = 110;
const AUTO_TILE_PX = 170;
const LIST_COL_PX = 340;

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const names = (list) => (Array.isArray(list) ? list.map((a) => a && a.name).filter(Boolean).join(", ") : "");

let instanceCounter = 0;

// Parlante elegido, compartido entre ma-browser-card y ma-player-card (por dispositivo).
// La clave conserva el nombre original para no perder la elección guardada.
const TARGET_EVENT = "ma-player-card-target";
const Target = {
  key: (entity) => `ma-browser-card.target.${entity}`,
  load(entity) {
    try {
      return localStorage.getItem(this.key(entity)) || null;
    } catch (_) {
      return null; // modo privado o almacenamiento bloqueado
    }
  },
  save(entity, target) {
    try {
      if (target) localStorage.setItem(this.key(entity), target);
      else localStorage.removeItem(this.key(entity));
    } catch (_) { /* sin almacenamiento: dura hasta recargar */ }
    window.dispatchEvent(new CustomEvent(TARGET_EVENT, { detail: { entity, target } }));
  },
};

class MaBrowserCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._id = `ma-browser-${++instanceCounter}`;
    this._q = "";
    this._type = null;
    this._status = "idle"; // idle | loading | ok | empty | error
    this._items = [];
    this._error = "";
    this._cache = new Map();
    this._reqId = 0;
    this._entryIdPromise = null;
    this._home = null;          // [{ title, type, items }]
    this._homeStatus = "idle";  // idle | loading | ok | error
    this._homeLoadedAt = 0;
    this._target = null;        // parlante elegido en el selector
    this._onPopState = this._onPopState.bind(this);
    // Otra tarjeta (o el reproductor) cambió el parlante de esta misma entidad
    this._onTargetEvent = (e) => {
      if (this._config && e.detail.entity === this._config.entity) {
        this._target = e.detail.target;
        this._updateSpeakerLabels();
      }
    };
  }

  // ---------- Ciclo de vida HA ----------

  setConfig(config) {
    if (!config || !config.entity) throw new Error("Falta 'entity' (media_player de Music Assistant)");
    const types = (config.media_types || DEFAULT_TYPES).filter((t) => TYPES[t]);
    if (!types.length) throw new Error(`media_types no válido. Opciones: ${Object.keys(TYPES).join(", ")}`);
    const mode = config.mode || "compact";
    // overlay = sin tarjeta propia; lo usa ma-player-card para abrir el buscador por dentro
    if (!["compact", "inline", "overlay"].includes(mode)) throw new Error("mode debe ser 'compact' o 'inline'");
    const prevEntity = this._config && this._config.entity;
    const home = (config.home || DEFAULT_HOME).filter((h) => h && TYPES[h.media_type]);
    this._config = {
      limit: 20, library_only: false, home_limit: 20, speaker_selector: true,
      ...config, mode, media_types: types, home,
    };
    if (!types.includes(this._type)) this._type = types[0];
    if (prevEntity && prevEntity !== config.entity) this._entryIdPromise = null;
    this._cache.clear();
    this._home = null;
    this._homeLoadedAt = 0;
    this._target = Target.load(this._config.entity);
    if (this._rendered) this._renderShell();
  }

  set hass(hass) {
    this._hass = hass;
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
      (id) => id.startsWith("media_player.") && hass.entities[id].platform === "music_assistant"
    );
    return { entity: ent || "media_player.salon" };
  }

  connectedCallback() {
    window.addEventListener("popstate", this._onPopState);
    window.addEventListener(TARGET_EVENT, this._onTargetEvent);
    if (this._wrap && this._ro) this._ro.observe(this._wrap);
  }

  disconnectedCallback() {
    window.removeEventListener("popstate", this._onPopState);
    window.removeEventListener(TARGET_EVENT, this._onTargetEvent);
    clearTimeout(this._debounce);
    clearTimeout(this._lpTimer);
    clearTimeout(this._toastTimer);
    if (this._ro) this._ro.disconnect();
    if (this._full && this._full.open) this._full.close();
  }

  // ---------- Render ----------

  _renderShell() {
    if (!this._config) return;
    this._rendered = true;
    const compact = this._config.mode !== "inline"; // pantalla completa (compact u overlay)
    const launcher = this._config.mode === "compact";
    const accent = this._config.accent_color === "theme"
      ? "var(--primary-color)"
      : this._config.accent_color || APPLE_RED;
    this.style.setProperty("--accent", accent);

    const tabs = this._config.media_types
      .map((t) => `<button class="tab" role="tab" data-type="${t}" aria-selected="${t === this._type}">${TYPES[t].label}</button>`)
      .join("");

    const browser = `
      <div class="wrap ${compact ? "is-full" : "is-inline"}">
        <div class="head">
          ${compact || this._config.speaker_selector ? `
          <div class="topbar">
            ${compact ? "<h1>Buscar</h1>" : "<span></span>"}
            <div class="actions">
              ${this._config.speaker_selector ? `
              <button class="speaker" id="speaker" aria-label="Elegir parlante">
                <ha-icon icon="mdi:speaker"></ha-icon><span id="speakerName">${esc(this._speakerName())}</span>
                <ha-icon class="chev" icon="mdi:chevron-down"></ha-icon></button>` : ""}
              ${compact ? `<button class="close" id="close" aria-label="Cerrar"><ha-icon icon="mdi:close"></ha-icon></button>` : ""}
            </div>
          </div>` : ""}
          <div class="search">
            <ha-icon icon="mdi:magnify"></ha-icon>
            <input id="q" type="search" placeholder="Artistas, canciones, álbumes…" enterkeyhint="search"
                   autocomplete="off" autocorrect="off" spellcheck="false" value="${esc(this._q)}" />
            <button class="clear" id="clear" aria-label="Borrar búsqueda" ${this._q ? "" : "hidden"}>
              <ha-icon icon="mdi:close-circle"></ha-icon></button>
          </div>
          <div class="tabs" role="tablist">${tabs}</div>
        </div>
        <div class="body" id="body"></div>
      </div>`;

    this.shadowRoot.innerHTML = `
      <style>${STYLES}</style>
      ${compact ? `${launcher ? `
        <ha-card class="launcher-card">
          <button class="launcher" id="launch">
            <span class="l-icon"><ha-icon icon="mdi:magnify"></ha-icon></span>
            <span class="l-text">
              <span class="l-name">${esc(this._config.name || "Buscar música")}</span>
              <span class="l-sub" id="lsub">${esc(this._launcherSubtitle())}</span>
            </span>
            <ha-icon class="l-chev" icon="mdi:chevron-right"></ha-icon>
          </button>
        </ha-card>` : ""}
        <dialog id="full" class="full">${browser}</dialog>`
      : `<ha-card class="inline-card">${browser}</ha-card>`}
      <dialog id="menu" class="menu"></dialog>
      <div id="toast" class="toast" popover="manual" role="status"></div>`;

    const $ = (id) => this.shadowRoot.getElementById(id);
    this._wrap = this.shadowRoot.querySelector(".wrap");
    this._body = $("body");
    this._input = $("q");
    this._menu = $("menu");
    this._toast = $("toast");
    this._full = $("full");
    this._launcherSub = $("lsub");
    this._speakerLabel = $("speakerName");
    if ($("speaker")) $("speaker").addEventListener("click", () => this._openSpeakers());

    if (compact) {
      if (launcher) $("launch").addEventListener("click", () => this._openFull());
      $("close").addEventListener("click", () => this._full.close());
      this._full.addEventListener("close", () => this._onFullClosed());
      // El encabezado se vuelve "vidrio" con borde al desplazar, como en iOS
      this._wrap.addEventListener("scroll", () => {
        this._wrap.classList.toggle("scrolled", this._wrap.scrollTop > 4);
      }, { passive: true });
    }

    this._input.addEventListener("input", () => this._onInput());
    this._input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        clearTimeout(this._debounce);
        this._search();
        this._input.blur(); // esconde el teclado en tablet/móvil
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
    this._menu.addEventListener("click", (e) => {
      if (e.target === this._menu) this._menu.close(); // toque en el fondo
    });

    if (!this._ro) this._ro = new ResizeObserver(() => this._updateColumns());
    this._ro.observe(this._wrap);
    this._renderBody();
    if (!compact) this._loadHome();
  }

  /** Abre el buscador a pantalla completa (lo usa ma-player-card). */
  open() {
    this._openFull();
  }

  _launcherSubtitle() {
    return `en ${this._speakerName()}`;
  }

  // ---------- Pantalla completa ----------

  _openFull() {
    if (!this._full || this._full.open) return;
    this._haptic("light");
    this._full.showModal();
    // Entrada en el historial: el botón "atrás" de Android cierra el buscador
    history.pushState({ ...(history.state || {}), maBrowser: this._id }, "");
    this._pushedState = true;
    this._updateColumns();
    this._loadHome();
    // Con la vista inicial a la vista, no abrimos el teclado: se toca el buscador para escribir.
  }

  _onFullClosed() {
    if (this._menu.open) this._menu.close();
    this._input.blur();
    if (this._pushedState) {
      this._pushedState = false;
      history.back();
    }
  }

  _onPopState() {
    if (this._full && this._full.open && (!history.state || history.state.maBrowser !== this._id)) {
      this._pushedState = false; // el navegador ya volvió atrás
      this._full.close();
    }
  }

  // ---------- Cuadrícula / lista ----------

  _updateColumns() {
    if (!this._wrap) return;
    const w = this._wrap.clientWidth - 32;
    if (w <= 0) return;
    const fit = Math.max(2, Math.floor(w / MIN_TILE_PX));
    const cols = this._config.columns
      ? Math.min(Number(this._config.columns), fit)
      : Math.max(2, Math.round(w / AUTO_TILE_PX));
    const listCols = Math.max(1, Math.min(3, Math.floor(w / LIST_COL_PX)));
    this._wrap.style.setProperty("--cols", cols);
    this._wrap.style.setProperty("--list-cols", listCols);
    // Estantes: N portadas visibles + un pedacito de la siguiente (pista de que se desplaza)
    const n = Math.max(2, Math.round(w / 200));
    this._wrap.style.setProperty("--shelf-w", `${Math.floor((w - 14 * n) / (n + 0.35))}px`);
    this._cols = cols;
  }

  _renderBody() {
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
      html = this._state("mdi:music-off", "Sin resultados",
        `No encontré ${t.label.toLowerCase()} para «${esc(this._q)}».`);
    } else if (this._status === "error") {
      html = this._state("mdi:alert-circle-outline", "Algo salió mal", esc(this._error),
        `<button class="retry" id="retry">Reintentar</button>`);
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
      img.addEventListener("error", () => {
        const art = img.parentElement;
        img.remove();
        art.insertAdjacentHTML("afterbegin", `<ha-icon class="ph" icon="${TYPES[art.dataset.type].icon}"></ha-icon>`);
      }, { once: true });
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

  // Devuelve el item de un elemento: "r" = resultados de búsqueda, número = estante de inicio
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
        <button class="more" aria-label="Más opciones" tabindex="-1"><ha-icon icon="mdi:dots-horizontal"></ha-icon></button>
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
      <button class="more" aria-label="Más opciones" tabindex="-1"><ha-icon icon="mdi:dots-horizontal"></ha-icon></button>
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

  // ---------- Vista inicial (recientes y favoritos) ----------

  async _loadHome(force = false) {
    if (!this._config.home.length || !this._hass) return;
    if (this._homeStatus === "loading") return;
    if (!force && this._home && Date.now() - this._homeLoadedAt < HOME_TTL_MS) return;
    this._homeStatus = "loading";
    if (this._status === "idle") this._renderBody();
    try {
      const entryId = await this._getEntryId();
      // Un pedido por estante, en paralelo. Si uno falla, los demás se muestran igual.
      const results = await Promise.allSettled(this._config.home.map((h) => this._hass.callWS({
        type: "call_service",
        domain: "music_assistant",
        service: "get_library",
        service_data: {
          config_entry_id: entryId,
          media_type: h.media_type,
          limit: Number(h.limit || this._config.home_limit) || 20,
          ...(h.favorite ? { favorite: true } : {}),
          ...(h.order_by ? { order_by: h.order_by } : {}),
        },
        return_response: true,
      })));
      this._home = this._config.home.map((h, idx) => {
        const r = results[idx];
        if (r.status === "rejected") {
          console.warn(`[ma-browser-card] estante "${h.title}" falló:`, r.reason);
          return { title: h.title, type: h.media_type, items: [] };
        }
        const data = (r.value && r.value.response) || r.value || {};
        return { title: h.title, type: h.media_type, items: data.items || [] };
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

  _homeHtml() {
    const hint = this._state("mdi:music-circle-outline", "¿Qué querés escuchar?",
      "Buscá canciones, artistas, álbumes, playlists o radios.");
    if (!this._config.home.length) return hint;
    if (this._homeStatus === "loading" && !this._home) {
      const tile = `<div class="tile skel"><div class="art"></div><div class="meta"><div class="line"></div><div class="line short"></div></div></div>`;
      const shelf = `<section class="shelf-sec"><div class="shelf-title skel-title"></div><div class="shelf">${tile.repeat(8)}</div></section>`;
      return shelf.repeat(2);
    }
    if (this._homeStatus === "error" && !this._home) {
      return this._state("mdi:alert-circle-outline", "No pude cargar tu biblioteca", esc(this._homeError || ""),
        `<button class="retry" id="homeRetry">Reintentar</button>`);
    }
    const shelves = (this._home || [])
      .map((sh, s) => sh.items.length ? `
        <section class="shelf-sec">
          <h2 class="shelf-title">${esc(sh.title)}</h2>
          <div class="shelf">${sh.items.map((it, i) => this._tile(it, i, s)).join("")}</div>
        </section>` : "")
      .join("");
    return shelves || hint;
  }

  // ---------- Selector de parlante ----------

  _speakers() {
    const hass = this._hass;
    if (!hass) return [];
    const list = this._config.speakers ||
      Object.keys(hass.entities || {}).filter(
        (id) => id.startsWith("media_player.") && hass.entities[id].platform === "music_assistant" && !hass.entities[id].hidden
      );
    if (!list.includes(this._config.entity)) list.unshift(this._config.entity);
    return list.filter((id) => hass.states[id]);
  }

  _targetEntity() {
    return this._target || (this._config && this._config.entity);
  }

  _setTarget(entityId) {
    this._target = entityId === this._config.entity ? null : entityId;
    Target.save(this._config.entity, this._target); // avisa a las demás tarjetas
    this._updateSpeakerLabels();
  }

  _updateSpeakerLabels() {
    // Si el parlante guardado ya no existe, volvemos al de la configuración
    if (this._target && this._hass && !this._hass.states[this._target]) this._target = null;
    if (this._launcherSub) this._launcherSub.textContent = this._launcherSubtitle();
    if (this._speakerLabel) this._speakerLabel.textContent = this._speakerName();
  }

  _openSpeakers() {
    const current = this._targetEntity();
    const row = (id) => {
      const st = this._hass.states[id];
      const unavailable = st.state === "unavailable";
      const playing = st.state === "playing" && st.attributes.media_title
        ? `${st.attributes.media_title}${st.attributes.media_artist ? ` · ${st.attributes.media_artist}` : ""}`
        : STATE_LABELS[st.state] || st.state;
      return `<button class="m-opt spk ${id === current ? "sel" : ""}" data-id="${esc(id)}" ${unavailable ? "disabled" : ""}>
        <ha-icon class="spk-icon ${st.state === "playing" ? "on" : ""}" icon="${st.state === "playing" ? "mdi:speaker-wireless" : "mdi:speaker"}"></ha-icon>
        <span class="spk-text"><span class="spk-name">${esc(st.attributes.friendly_name || id)}</span>
          <span class="spk-sub">${esc(playing)}</span></span>
        ${id === current ? `<ha-icon class="spk-check" icon="mdi:check"></ha-icon>` : ""}
      </button>`;
    };
    // Disponibles primero; los no disponibles van al final, plegados.
    // El parlante elegido se muestra siempre arriba, aunque no esté disponible.
    const all = this._speakers();
    const isOff = (id) => this._hass.states[id].state === "unavailable" && id !== current;
    const on = all.filter((id) => !isOff(id));
    const off = all.filter(isOff);
    this._menu.innerHTML = `
      <div class="sheet">
        <div class="m-head"><div class="m-meta"><div class="title">Reproducir en</div></div></div>
        ${on.map(row).join("")}
        ${off.length ? `
        <button class="m-opt off-toggle" data-k="toggle" aria-expanded="false">
          <span>No disponibles (${off.length})</span><ha-icon icon="mdi:chevron-down"></ha-icon></button>
        <div class="off-list">${off.map(row).join("")}</div>` : ""}
      </div>
      <button class="sheet m-cancel" data-k="cancel">Cancelar</button>`;
    this._menu.querySelectorAll("button").forEach((b) =>
      b.addEventListener("click", () => {
        if (b.dataset.k === "toggle") {
          const open = b.getAttribute("aria-expanded") !== "true";
          b.setAttribute("aria-expanded", open);
          return;
        }
        this._menu.close();
        if (b.dataset.id) {
          this._setTarget(b.dataset.id);
          this._haptic("selection");
        }
      })
    );
    this._menu.showModal();
  }

  // ---------- Búsqueda ----------

  _onInput() {
    this._q = this._input.value;
    this.shadowRoot.getElementById("clear").hidden = !this._q;
    clearTimeout(this._debounce);
    this._debounce = setTimeout(() => this._search(), DEBOUNCE_MS);
  }

  _setType(type) {
    this._type = type;
    this.shadowRoot.querySelectorAll(".tab").forEach((b) => b.setAttribute("aria-selected", b.dataset.type === type));
    this._items = [];
    if (this._wrap.classList.contains("is-full")) this._wrap.scrollTop = 0;
    this._search();
  }

  async _getEntryId() {
    if (this._config.config_entry_id) return this._config.config_entry_id;
    if (!this._entryIdPromise) {
      this._entryIdPromise = (async () => {
        try {
          const ent = await this._hass.callWS({ type: "config/entity_registry/get", entity_id: this._config.entity });
          if (ent && ent.platform === "music_assistant" && ent.config_entry_id) return ent.config_entry_id;
        } catch (_) { /* probamos el método B */ }
        const entries = await this._hass.callWS({ type: "config_entries/get", domain: "music_assistant" });
        const e = entries.find((x) => x.state === "loaded") || entries[0];
        if (!e) throw new Error("No encontré la integración Music Assistant.");
        return e.entry_id;
      })();
      this._entryIdPromise.catch(() => (this._entryIdPromise = null));
    }
    return this._entryIdPromise;
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
      const entryId = await this._getEntryId();
      const resp = await this._hass.callWS({
        type: "call_service",
        domain: "music_assistant",
        service: "search",
        service_data: {
          config_entry_id: entryId,
          name: q,
          media_type: type,
          limit: Number(this._config.limit) || 20,
          library_only: !!this._config.library_only,
        },
        return_response: true,
      });
      if (reqId !== this._reqId) return; // llegó una respuesta vieja
      const data = (resp && resp.response) || resp || {};
      const items = data[TYPES[type].key] || data[type] || data[`${type}s`] || [];
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

  // ---------- Toques ----------

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
      body.querySelectorAll(".item.pressed").forEach((t) => t.classList.remove("pressed"));
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

  _openMenu(it, el) {
    if (!it) return;
    const type = this._typeOf(it);
    const t = TYPES[type];
    const sub = this._subtitle(it, type);
    const opts = [
      ["now", "mdi:play", "Reproducir ahora"],
      ...(t.noQueue ? [] : [
        ["next", "mdi:playlist-play", "Reproducir a continuación"],
        ["add", "mdi:playlist-plus", "Agregar a la cola"],
      ]),
    ];
    this._menu.innerHTML = `
      <div class="sheet">
        <div class="m-head">
          <div class="m-art ${t.round ? "round" : ""}">${it.image
            ? `<img src="${esc(it.image)}" alt="" />` : `<ha-icon icon="${t.icon}"></ha-icon>`}</div>
          <div class="m-meta"><div class="title">${esc(it.name)}</div>${sub ? `<div class="sub">${esc(sub)}</div>` : ""}</div>
        </div>
        ${opts.map(([k, icon, label]) =>
          `<button class="m-opt" data-k="${k}"><span>${label}</span><ha-icon icon="${icon}"></ha-icon></button>`).join("")}
      </div>
      <button class="sheet m-cancel" data-k="cancel">Cancelar</button>`;
    this._menu.querySelectorAll("button").forEach((b) =>
      b.addEventListener("click", () => {
        this._menu.close();
        const k = b.dataset.k;
        if (k === "cancel") return;
        this._play(it, k === "now" ? null : k, el);
      })
    );
    this._menu.showModal();
  }

  // ---------- Reproducción ----------

  async _play(it, enqueueOverride, el) {
    if (!it || !it.uri) return;
    const type = this._typeOf(it);
    const enqueue = enqueueOverride || TYPES[type].enqueue;
    const fx = el && el.querySelector(".fx");
    this._haptic("light");
    if (fx) fx.className = "fx busy";

    try {
      await this._hass.callWS({
        type: "call_service",
        domain: "music_assistant",
        service: "play_media",
        service_data: { media_id: it.uri, media_type: type, enqueue },
        target: { entity_id: this._targetEntity() },
      });
      if (fx) {
        fx.className = "fx done";
        setTimeout(() => fx.isConnected && (fx.className = "fx"), 1400);
      }
      const speaker = this._speakerName();
      const msg = {
        play: `Reproduciendo en ${speaker}`,
        replace: `Reproduciendo en ${speaker}`,
        next: "Suena a continuación",
        add: "Agregado a la cola",
      }[enqueue];
      const icon = enqueue === "next" ? "mdi:playlist-play" : enqueue === "add" ? "mdi:playlist-plus" : "mdi:play-circle";
      this._showToast(it, msg, icon);
    } catch (e) {
      console.error("[ma-browser-card] play_media", e);
      if (fx) {
        fx.className = "fx fail";
        setTimeout(() => fx.isConnected && (fx.className = "fx"), 2000);
      }
      this._showToast(it, `No se pudo reproducir: ${(e && e.message) || e}`, "mdi:alert-circle", true);
    }
  }

  _speakerName(entityId = this._targetEntity()) {
    const st = this._hass && entityId && this._hass.states[entityId];
    return (st && st.attributes.friendly_name) || entityId || "";
  }

  _showToast(it, text, icon, isError = false) {
    const t = this._toast;
    t.className = `toast ${isError ? "error" : ""}`;
    t.innerHTML = `
      ${it.image ? `<img src="${esc(it.image)}" alt="" />` : `<ha-icon icon="${icon}"></ha-icon>`}
      <span class="t-text"><span class="t-title">${esc(it.name)}</span><span class="t-sub">${esc(text)}</span></span>
      ${it.image ? `<ha-icon class="t-icon" icon="${icon}"></ha-icon>` : ""}`;
    clearTimeout(this._toastTimer);
    try {
      if (t.showPopover) {
        if (t.matches(":popover-open")) t.hidePopover();
        t.showPopover();
      } else t.classList.add("show");
    } catch (_) {
      t.classList.add("show");
    }
    this._toastTimer = setTimeout(() => {
      try {
        if (t.hidePopover && t.matches(":popover-open")) t.hidePopover();
      } catch (_) { /* nada */ }
      t.classList.remove("show");
    }, isError ? 4500 : 2600);
  }

  _haptic(kind) {
    this.dispatchEvent(new CustomEvent("haptic", { detail: kind, bubbles: true, composed: true }));
  }
}

/* ------------------------------------------------------------------------
 * Estilos — inspirados en Apple Music, construidos sobre las variables de HA
 * para que funcionen en modo claro y oscuro.
 * ---------------------------------------------------------------------- */
const STYLES = `
  :host {
    display: block;
    --accent: ${APPLE_RED};
    --fill: color-mix(in srgb, var(--primary-text-color) 7%, transparent);       /* relleno gris iOS */
    --fill-strong: color-mix(in srgb, var(--primary-text-color) 12%, transparent);
    --sep: color-mix(in srgb, var(--primary-text-color) 12%, transparent);        /* líneas finas */
    --glass: color-mix(in srgb, var(--card-background-color, #fff) 72%, transparent);
    --glass-bg: color-mix(in srgb, var(--primary-background-color, #f2f2f7) 80%, transparent);
    --blur: blur(30px) saturate(180%);
    --art-radius: 10px;
  }

  /* ---------- Botón compacto (tarjeta en el panel) ---------- */
  .launcher-card { height: 100%; overflow: hidden; }
  .launcher { all: unset; box-sizing: border-box; width: 100%; height: 100%; min-height: 56px;
    display: flex; align-items: center; gap: 12px; padding: 8px 16px 8px 8px; cursor: pointer;
    -webkit-tap-highlight-color: transparent; transition: transform .12s ease; }
  .launcher:active { transform: scale(.98); }
  .launcher:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; border-radius: inherit; }
  .l-icon { width: 42px; height: 42px; flex: 0 0 42px; border-radius: 50%; display: grid; place-items: center;
    color: #fff; background: linear-gradient(145deg, color-mix(in srgb, var(--accent) 75%, #fff), var(--accent));
    box-shadow: 0 4px 12px color-mix(in srgb, var(--accent) 35%, transparent); }
  .l-icon ha-icon { --mdc-icon-size: 22px; }
  .l-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .l-name { font-size: 15px; font-weight: 600; color: var(--primary-text-color);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .l-sub { font-size: 13px; color: var(--secondary-text-color);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .l-chev { color: var(--secondary-text-color); opacity: .6; }

  /* ---------- Pantalla completa ---------- */
  dialog.full { position: fixed; inset: 0; width: 100vw; height: 100vh; height: 100dvh;
    max-width: none; max-height: none; margin: 0; padding: 0; border: 0;
    background: var(--glass-bg); -webkit-backdrop-filter: var(--blur); backdrop-filter: var(--blur);
    color: var(--primary-text-color); overflow: hidden; }
  dialog.full::backdrop { background: transparent; }
  dialog.full[open] { animation: rise .32s cubic-bezier(.2, .9, .3, 1); }
  @keyframes rise { from { transform: translateY(24px); opacity: 0; } to { transform: none; opacity: 1; } }

  .wrap { container-type: inline-size; --cols: 4; --list-cols: 1; }
  .wrap.is-full { height: 100%; overflow-y: auto; overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch; }
  .wrap.is-inline { padding: 16px; }

  .head { padding: 0 0 12px; }
  .is-full .head { position: sticky; top: 0; z-index: 2;
    padding: max(12px, env(safe-area-inset-top)) max(20px, env(safe-area-inset-right)) 12px max(20px, env(safe-area-inset-left));
    border-bottom: .5px solid transparent; transition: background .2s, border-color .2s; }
  .is-full.scrolled .head { background: var(--glass); -webkit-backdrop-filter: var(--blur); backdrop-filter: var(--blur);
    border-bottom-color: var(--sep); }
  .is-full .body { padding: 4px max(20px, env(safe-area-inset-right)) max(32px, env(safe-area-inset-bottom)) max(20px, env(safe-area-inset-left)); }

  .topbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 8px 0 10px; }
  .actions { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .speaker { display: flex; align-items: center; gap: 6px; height: 40px; max-width: 46vw; padding: 0 10px 0 12px;
    border-radius: 999px; border: 0; cursor: pointer; font: inherit; font-size: 15px; font-weight: 600;
    background: var(--fill-strong); color: var(--accent); -webkit-tap-highlight-color: transparent; }
  .speaker span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .speaker ha-icon { --mdc-icon-size: 20px; flex: 0 0 auto; }
  .speaker .chev { --mdc-icon-size: 18px; opacity: .7; }
  .speaker:active { filter: brightness(.94); }
  h1 { margin: 0; font-size: 34px; line-height: 1.1; font-weight: 700; letter-spacing: -.02em; }
  .close { width: 40px; height: 40px; border-radius: 50%; border: 0; cursor: pointer; display: grid; place-items: center;
    background: var(--fill-strong); color: var(--secondary-text-color); }
  .close ha-icon { --mdc-icon-size: 22px; }

  /* Buscador estilo iOS */
  .search { display: flex; align-items: center; gap: 6px; height: 44px; padding: 0 4px 0 10px;
    border-radius: 12px; background: var(--fill-strong); color: var(--secondary-text-color); }
  .search > ha-icon { --mdc-icon-size: 22px; }
  .search input { flex: 1; min-width: 0; height: 100%; border: 0; outline: 0; background: transparent;
    color: var(--primary-text-color); font: inherit; font-size: 17px; caret-color: var(--accent); }
  .search input::placeholder { color: var(--secondary-text-color); opacity: .8; }
  .search input::-webkit-search-cancel-button { display: none; }
  .clear { width: 40px; height: 40px; border-radius: 50%; border: 0; background: transparent;
    color: inherit; cursor: pointer; display: grid; place-items: center; opacity: .7; }
  .clear ha-icon { --mdc-icon-size: 20px; }
  .clear[hidden] { display: none; }

  /* Pestañas tipo cápsula */
  .tabs { display: flex; gap: 8px; margin-top: 12px; overflow-x: auto; scrollbar-width: none; }
  .tabs::-webkit-scrollbar { display: none; }
  .tab { flex: 0 0 auto; height: 36px; padding: 0 16px; border-radius: 999px; border: 0; cursor: pointer;
    font: inherit; font-size: 15px; font-weight: 500; background: var(--fill); color: var(--primary-text-color);
    -webkit-tap-highlight-color: transparent; transition: background .2s, color .2s; }
  .tab[aria-selected="true"] { background: var(--accent); color: #fff; font-weight: 600; }

  /* Cuadrícula (artistas, álbumes, playlists, radios) */
  .grid { display: grid; grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); gap: 20px 14px;
    transition: opacity .2s; }
  .grid.dim, .list.dim { opacity: .5; pointer-events: none; }
  .item { cursor: pointer; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;
    -webkit-tap-highlight-color: transparent; outline: none; transition: transform .15s ease; }
  .item.pressed, .item:active { transform: scale(.97); }
  .tile:focus-visible .art { outline: 3px solid var(--accent); outline-offset: 2px; }
  .art { position: relative; aspect-ratio: 1; border-radius: var(--art-radius); overflow: hidden;
    background: var(--fill); display: grid; place-items: center;
    box-shadow: 0 4px 14px rgba(0, 0, 0, .12), 0 0 0 .5px var(--sep); }
  .art.round { border-radius: 50%; }
  .art img { width: 100%; height: 100%; object-fit: cover; display: block; pointer-events: none; }
  .art .ph { --mdc-icon-size: 40%; color: var(--secondary-text-color); opacity: .5; }
  .tile .more { position: absolute; bottom: 8px; right: 8px; width: 36px; height: 36px; border-radius: 50%;
    border: 0; cursor: pointer; display: grid; place-items: center; color: #fff;
    background: rgba(30, 30, 30, .35); -webkit-backdrop-filter: blur(12px) saturate(180%); backdrop-filter: blur(12px) saturate(180%);
    transition: opacity .15s; }
  .tile .art.round .more { bottom: 10%; right: 10%; }
  @media (hover: hover) { .tile .more { opacity: 0; } .tile:hover .more, .tile .more:focus-visible { opacity: 1; } }
  .meta { min-width: 0; }
  .tile .meta { padding: 8px 2px 0; }
  .tile .art.round + .meta { text-align: center; }
  .title { font-size: 14px; font-weight: 500; color: var(--primary-text-color); line-height: 1.25;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .ver { color: var(--secondary-text-color); font-weight: 400; }
  .sub { font-size: 13px; color: var(--secondary-text-color); margin-top: 2px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  /* Estantes de la vista inicial (desplazamiento horizontal) */
  .shelf-sec { margin-bottom: 26px; }
  .shelf-title { margin: 6px 0 12px; font-size: 22px; font-weight: 700; letter-spacing: -.01em; }
  .skel-title { width: 220px; height: 22px; border-radius: 8px; background: var(--fill); }
  .shelf { display: grid; grid-auto-flow: column; grid-auto-columns: var(--shelf-w, 170px); gap: 14px;
    overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; padding-bottom: 6px;
    overscroll-behavior-x: contain; -webkit-overflow-scrolling: touch; }
  .shelf::-webkit-scrollbar { display: none; }
  .shelf > .tile { scroll-snap-align: start; }
  .is-full .shelf { margin: 0 calc(-1 * max(20px, env(safe-area-inset-left))); padding-left: max(20px, env(safe-area-inset-left));
    padding-right: max(20px, env(safe-area-inset-right)); scroll-padding-left: max(20px, env(safe-area-inset-left)); }

  /* Lista (canciones) */
  .list { display: grid; grid-template-columns: repeat(var(--list-cols), minmax(0, 1fr)); column-gap: 28px;
    transition: opacity .2s; }
  .row { display: flex; align-items: center; gap: 12px; min-height: 64px; position: relative; border-radius: 10px; }
  .row::after { content: ""; position: absolute; left: 64px; right: 0; bottom: 0; height: .5px; background: var(--sep); }
  .row .art { width: 52px; flex: 0 0 52px; border-radius: 6px; box-shadow: 0 0 0 .5px var(--sep); }
  .row .meta { flex: 1; }
  .row .title { -webkit-line-clamp: 1; font-size: 15px; font-weight: 400; }
  .row .more { width: 44px; height: 44px; flex: 0 0 44px; border: 0; background: transparent; border-radius: 50%;
    color: var(--primary-text-color); cursor: pointer; display: grid; place-items: center; }
  .row .more:active { background: var(--fill); }
  .row.pressed, .row:active { transform: none; background: var(--fill); }
  .row:focus-visible { background: var(--fill); }

  /* Feedback sobre la portada */
  .fx { position: absolute; inset: 0; display: grid; place-items: center; pointer-events: none;
    background: rgba(0, 0, 0, 0); transition: background .2s; }
  .fx.busy, .fx.done { background: rgba(0, 0, 0, .4); }
  .fx.busy::after { content: ""; width: 32%; aspect-ratio: 1; max-width: 36px; border-radius: 50%;
    border: 3px solid rgba(255, 255, 255, .35); border-top-color: #fff; animation: spin .8s linear infinite; }
  .fx.done::after { content: "✓"; color: #fff; font-size: clamp(20px, 30cqw, 44px); font-weight: 700; animation: pop .35s ease-out; }
  .fx.fail { background: color-mix(in srgb, var(--error-color, #ff3b30) 75%, transparent); }
  .fx.fail::after { content: "!"; color: #fff; font-size: 28px; font-weight: 700; }
  .art { container-type: inline-size; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pop { from { transform: scale(.4); opacity: 0; } to { transform: scale(1); opacity: 1; } }

  /* Esqueleto de carga */
  .skel .art, .skel .line { background: linear-gradient(90deg, var(--fill) 25%, var(--fill-strong) 50%, var(--fill) 75%);
    background-size: 200% 100%; animation: shimmer 1.2s infinite linear; box-shadow: none; }
  .skel .line { height: 12px; border-radius: 6px; margin-top: 6px; width: 80%; }
  .skel .line.short { width: 50%; }
  @keyframes shimmer { to { background-position: -200% 0; } }

  /* Estados vacío / error */
  .state { display: flex; flex-direction: column; align-items: center; text-align: center;
    padding: 56px 16px; color: var(--secondary-text-color); }
  .state ha-icon { --mdc-icon-size: 56px; opacity: .4; margin-bottom: 12px; }
  .state-title { font-size: 20px; font-weight: 700; color: var(--primary-text-color); }
  .state-text { font-size: 15px; margin-top: 6px; max-width: 420px; word-break: break-word; }
  .retry { margin-top: 18px; height: 44px; padding: 0 24px; border-radius: 999px; border: 0;
    background: var(--accent); color: #fff; font: inherit; font-weight: 600; cursor: pointer; }

  /* Menú: hoja de acciones iOS */
  dialog.menu { border: 0; padding: 0; background: transparent; overflow: visible;
    width: min(400px, calc(100vw - 24px)); color: var(--primary-text-color); }
  dialog.menu::backdrop { background: rgba(0, 0, 0, .3);
    -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); }
  dialog.menu[open] { animation: menuIn .22s cubic-bezier(.2, .9, .3, 1.2); }
  @keyframes menuIn { from { transform: scale(.94); opacity: 0; } to { transform: none; opacity: 1; } }
  .sheet { display: block; width: 100%; border-radius: 16px; overflow: hidden;
    background: var(--glass); -webkit-backdrop-filter: var(--blur); backdrop-filter: var(--blur);
    box-shadow: 0 16px 48px rgba(0, 0, 0, .28); }
  .m-head { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: .5px solid var(--sep); }
  .m-art { width: 56px; height: 56px; flex: 0 0 56px; border-radius: 8px; overflow: hidden;
    background: var(--fill); display: grid; place-items: center; }
  .m-art.round { border-radius: 50%; }
  .m-art img { width: 100%; height: 100%; object-fit: cover; }
  .m-meta { min-width: 0; }
  .m-meta .title { font-weight: 600; font-size: 16px; }
  .m-opt { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px;
    height: 54px; padding: 0 18px; border: 0; cursor: pointer; font: inherit; font-size: 17px;
    background: transparent; color: var(--primary-text-color); text-align: left; }
  .m-opt + .m-opt { border-top: .5px solid var(--sep); }
  .m-opt ha-icon { color: var(--accent); }
  .m-opt:active { background: var(--fill); }
  .m-opt:focus, .m-cancel:focus { outline: none; }
  .m-opt:focus-visible { background: var(--fill); }
  .m-cancel { margin-top: 8px; height: 56px; border: 0; cursor: pointer; font: inherit; font-size: 17px;
    font-weight: 600; color: var(--accent); }
  .m-cancel:active { filter: brightness(.95); }
  /* Filas del selector de parlante */
  .spk { justify-content: flex-start; height: auto; min-height: 60px; padding: 8px 18px; }
  .spk[disabled] { opacity: .45; cursor: default; }
  .spk .spk-icon { color: var(--secondary-text-color); }
  .spk .spk-icon.on { color: var(--accent); }
  .spk-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .spk-name { font-size: 17px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .spk-sub { font-size: 13px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .spk.sel .spk-name { font-weight: 600; }
  .spk .spk-check { color: var(--accent); }
  .off-toggle { color: var(--secondary-text-color); font-size: 15px; height: 48px; }
  .off-toggle ha-icon { color: var(--secondary-text-color); transition: transform .2s; }
  .off-toggle[aria-expanded="true"] ha-icon { transform: rotate(180deg); }
  .off-list { display: none; }
  .off-toggle[aria-expanded="true"] + .off-list { display: block; }
  .off-list .m-opt { border-top: .5px solid var(--sep); }
  dialog.menu { max-height: calc(100dvh - 32px); }
  dialog.menu .sheet:first-child { max-height: calc(100dvh - 120px); overflow-y: auto; }

  @media (max-width: 600px) {
    dialog.menu { margin: auto auto max(12px, env(safe-area-inset-bottom)); }
    dialog.menu[open] { animation: sheetUp .28s cubic-bezier(.2, .9, .3, 1); }
    @keyframes sheetUp { from { transform: translateY(40px); opacity: 0; } to { transform: none; opacity: 1; } }
  }

  /* Aviso flotante (toast) de vidrio */
  .toast { position: fixed; inset: auto auto max(24px, env(safe-area-inset-bottom)) 50%; transform: translateX(-50%);
    margin: 0; display: flex; align-items: center; gap: 12px; width: max-content;
    max-width: min(440px, calc(100vw - 32px)); padding: 8px 18px 8px 8px; border: .5px solid var(--sep);
    border-radius: 18px; color: var(--primary-text-color);
    background: var(--glass); -webkit-backdrop-filter: var(--blur); backdrop-filter: var(--blur);
    box-shadow: 0 10px 36px rgba(0, 0, 0, .22); }
  .toast:not(:popover-open):not(.show) { display: none; }
  .toast:popover-open, .toast.show { animation: toastIn .3s cubic-bezier(.2, .9, .3, 1.2); }
  @keyframes toastIn { from { transform: translate(-50%, 16px); opacity: 0; } to { transform: translateX(-50%); opacity: 1; } }
  .toast img { width: 44px; height: 44px; border-radius: 8px; object-fit: cover; }
  .toast > ha-icon:first-child { margin-left: 8px; color: var(--accent); }
  .t-text { display: flex; flex-direction: column; min-width: 0; }
  .t-title { font-size: 15px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .t-sub { font-size: 13px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .t-icon { color: var(--accent); margin-left: 4px; }
  .toast.error { border-color: color-mix(in srgb, var(--error-color, #ff3b30) 50%, transparent); }
  .toast.error .t-icon, .toast.error > ha-icon:first-child { color: var(--error-color, #ff3b30); }

  @container (max-width: 480px) {
    .grid { gap: 16px 12px; }
    h1 { font-size: 30px; }
  }
`;

/* ========================================================================
 * ma-player-card — reproductor (mini en el panel + "Reproduciendo" a pantalla completa)
 *
 * Usa acciones nativas de HA:
 *   media_player.media_play_pause / media_previous_track / media_next_track
 *   media_player.media_seek / volume_set / shuffle_set / repeat_set
 *   music_assistant.get_queue   (cola, solo lectura)
 *   button.press                (botón "Favorito de la canción actual" de Music Assistant)
 * Letras sincronizadas: LRCLIB (https://lrclib.net), gratuito y sin clave.
 * ====================================================================== */

const fmtTime = (secs) => {
  let s = Number.isFinite(secs) && secs > 0 ? Math.floor(secs) : 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  s %= 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
};

// "[01:23.45] texto" → [{ t: 83.45, text: "texto" }]
function parseLrc(lrc) {
  const lines = [];
  for (const raw of String(lrc || "").split(/\r?\n/)) {
    const stamps = [...raw.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)];
    if (!stamps.length) continue;
    const text = raw.replace(/\[[^\]]*\]/g, "").trim();
    for (const m of stamps) lines.push({ t: Number(m[1]) * 60 + Number(m[2]), text });
  }
  return lines.sort((a, b) => a.t - b.t);
}

const lyricsCache = new Map();

// "Canción (feat. X) - Remastered 2011" → "Canción"
const cleanTitle = (t) => String(t || "")
  .replace(/\s*[([](?:feat\.?|ft\.?|with|con|featuring)\s[^)\]]*[)\]]/gi, "")
  .replace(/\s+-\s+.*\b(?:remaster(?:ed)?|version|versión|live|en vivo|radio edit|edit|mono|stereo|acoustic|acústico)\b.*$/i, "")
  .trim();
// "BOM, Miranda!, Lali" → "BOM"
const firstArtist = (a) => String(a || "").split(/\s*(?:,|;|&|\/|\sfeat\.?\s|\sft\.?\s|\sx\s|\sy\s)\s*/i)[0].trim();

async function fetchLyrics(base, { title, artist, album, duration }) {
  const key = `${artist}|${title}`.toLowerCase();
  if (lyricsCache.has(key)) return lyricsCache.get(key);
  const p = (async () => {
    const t2 = cleanTitle(title) || title;
    const a2 = firstArtist(artist) || artist || "";
    const dur = duration ? Math.round(duration) : 0;
    const hasLyrics = (d) => d && (d.syncedLyrics || d.plainLyrics || d.instrumental);
    // De la búsqueda, la que tenga letra sincronizada y duración más parecida (±5 s si la sabemos)
    const best = (list) => {
      const ok = (list || []).filter(hasLyrics)
        .filter((x) => !dur || !x.duration || Math.abs(x.duration - dur) <= 5)
        .sort((x, y) => (!!y.syncedLyrics - !!x.syncedLyrics) ||
          (dur ? Math.abs((x.duration || dur) - dur) - Math.abs((y.duration || dur) - dur) : 0));
      return ok[0] || null;
    };
    const tries = [
      ["get", { track_name: title, artist_name: artist || "", album_name: album || "", duration: dur || "" }],
      ["get", { track_name: t2, artist_name: a2, duration: dur || "" }],
      ["search", { track_name: t2, artist_name: a2 }],
      ["search", { q: `${t2} ${a2}`.trim() }],
      ["search", { track_name: t2 }],
    ];
    const seen = new Set();
    for (const [kind, params] of tries) {
      const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== "" && v != null));
      const url = `${base}/api/${kind}?${q}`;
      if (seen.has(url)) continue;
      seen.add(url);
      const r = await fetch(url);
      if (r.status === 404) continue;
      if (!r.ok) throw new Error(`LRCLIB respondió ${r.status}`);
      const d = await r.json();
      const hit = kind === "get" ? (hasLyrics(d) ? d : null) : best(d);
      if (hit) {
        console.info(`[ma-player-card] letra encontrada en LRCLIB (${kind}: ${q})`);
        return hit;
      }
    }
    console.info(`[ma-player-card] LRCLIB no tiene letra para «${title}» de ${artist}`);
    return null;
  })();
  lyricsCache.set(key, p);
  p.catch(() => lyricsCache.delete(key));
  return p;
}

// Barra deslizable táctil (progreso y volumen). ratio: 0..1
function bindSlider(el, { onInput, onChange }) {
  let dragging = false;
  const ratio = (e) => {
    const r = el.getBoundingClientRect();
    return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
  };
  el.addEventListener("pointerdown", (e) => {
    if (e.button > 0) return;
    dragging = true;
    el.setPointerCapture(e.pointerId);
    el.classList.add("drag");
    onInput(ratio(e));
  });
  el.addEventListener("pointermove", (e) => dragging && onInput(ratio(e)));
  el.addEventListener("pointerup", (e) => {
    if (!dragging) return;
    dragging = false;
    el.classList.remove("drag");
    onChange(ratio(e));
  });
  el.addEventListener("pointercancel", () => {
    dragging = false;
    el.classList.remove("drag");
    onChange(null);
  });
  el.addEventListener("keydown", (e) => {
    const step = { ArrowLeft: -0.05, ArrowDown: -0.05, ArrowRight: 0.05, ArrowUp: 0.05 }[e.key];
    if (step === undefined) return;
    e.preventDefault();
    const cur = Number(el.dataset.value || 0);
    onChange(Math.min(1, Math.max(0, cur + step)));
  });
  return { get dragging() { return dragging; } };
}

const setSlider = (el, ratio) => {
  const r = Math.min(1, Math.max(0, ratio || 0));
  el.dataset.value = r;
  el.querySelector(".fill").style.width = `${r * 100}%`;
};

/* ========================================================================
 * Backends de cola y favoritos
 *
 * La interfaz no pregunta "¿qué backend es?" sino "¿qué se puede hacer?" (backend.can).
 * Todos devuelven los ítems de la cola con la misma forma:
 *   { id, name, artist, album, image, duration, favorite }
 *
 *   NativeBackend     integración oficial de Music Assistant (core de HA)
 *   MassQueueBackend  agrega la integración mass_queue (HACS): mover, quitar, saltar, desmarcar favorito
 * ====================================================================== */

class NativeBackend {
  constructor(card) {
    this.card = card;
    this.itemsSupported = undefined; // ¿get_queue acepta limit/offset? (HA de noviembre de 2026 en adelante)
  }

  get name() {
    return "native";
  }

  get can() {
    return { reorder: false, remove: false, playItem: false, unfavorite: false };
  }

  get hass() {
    return this.card._hass;
  }

  async _getQueue(ent, data = {}) {
    const r = await this.hass.callWS({
      type: "call_service", domain: "music_assistant", service: "get_queue",
      target: { entity_id: ent }, service_data: data, return_response: true,
    });
    const d = (r && r.response) || {};
    return d[ent] || d; // las acciones con respuesta devuelven un objeto por entidad
  }

  static fromNative(qi) {
    if (!qi) return null;
    const mi = qi.media_item || {};
    return {
      id: qi.queue_item_id,
      name: mi.name || qi.name,
      artist: names(mi.artists),
      album: (mi.album && mi.album.name) || "",
      image: mi.image || "",
      duration: qi.duration || 0,
      favorite: mi.favorite,
    };
  }

  /** Estado de la cola: canción actual, posición y total. Funciona en todas las versiones. */
  async queueInfo(ent) {
    const info = await this._getQueue(ent);
    return {
      current: NativeBackend.fromNative(info.current_item),
      next: NativeBackend.fromNative(info.next_item),
      idx: info.current_index == null ? -1 : info.current_index,
      total: info.items || 0,
    };
  }

  /** Próximas canciones (después de la actual). */
  async queueItems(ent, info, limit) {
    if (info.total <= info.idx + 1) return [];
    if (this.itemsSupported !== false) {
      try {
        const more = await this._getQueue(ent, { offset: info.idx + 1, limit });
        this.itemsSupported = true;
        return (more.queue_items || []).map(NativeBackend.fromNative);
      } catch (err) {
        const msg = (err && (err.message || err.code)) || "";
        if (!/not a valid option|extra keys/i.test(msg)) throw err;
        this.itemsSupported = false; // versión anterior: solo sabemos la próxima
      }
    }
    return info.next ? [info.next] : [];
  }

  /** Lista parcial: la versión de HA solo informa la próxima canción. */
  get partial() {
    return this.itemsSupported === false;
  }

  async favorite(ent) {
    const btn = this.card._favButton(ent);
    if (!btn) throw new Error("No encontré el botón de favorito de Music Assistant");
    await this.hass.callService("button", "press", { entity_id: btn });
  }

  canFavorite(ent) {
    return !!this.card._favButton(ent);
  }

  async unfavorite() {
    throw new Error("La integración oficial no permite quitar favoritos");
  }

  async move() {
    throw new Error("La integración oficial no permite mover canciones de la cola");
  }

  async remove() {
    throw new Error("La integración oficial no permite quitar canciones de la cola");
  }

  async playItem() {
    throw new Error("La integración oficial no permite saltar a una canción de la cola");
  }
}

class MassQueueBackend extends NativeBackend {
  get name() {
    return "mass_queue";
  }

  get can() {
    return { reorder: true, remove: true, playItem: true, unfavorite: true };
  }

  get partial() {
    return false;
  }

  _call(service, data) {
    return this.hass.callService("mass_queue", service, data);
  }

  static fromMassQueue(x) {
    return {
      id: x.queue_item_id,
      name: x.media_title,
      artist: x.media_artist || "",
      album: x.media_album_name || "",
      image: x.media_image || (x.local_image_encoded ? `data:image/jpeg;base64,${x.local_image_encoded}` : ""),
      duration: 0, // mass_queue no informa la duración
      favorite: x.favorite,
    };
  }

  async queueItems(ent, info, limit) {
    if (info.total <= info.idx + 1) return [];
    const r = await this.hass.callWS({
      type: "call_service", domain: "mass_queue", service: "get_queue_items",
      service_data: { entity: ent, offset: info.idx + 1, limit }, return_response: true,
    });
    const d = (r && r.response) || {};
    return (d[ent] || []).map(MassQueueBackend.fromMassQueue);
  }

  canFavorite() {
    return true;
  }

  async favorite(ent) {
    if (this.card._favButton(ent)) return super.favorite(ent);
    throw new Error("No encontré el botón de favorito de Music Assistant");
  }

  async unfavorite(ent) {
    await this._call("unfavorite_current_item", { entity: ent });
  }

  /** dir: "up" | "down" | "next" (justo después de la canción actual) */
  async move(ent, id, dir) {
    await this._call(`move_queue_item_${dir}`, { entity: ent, queue_item_id: id });
  }

  async remove(ent, id) {
    await this._call("remove_queue_item", { entity: ent, queue_item_id: id });
  }

  async playItem(ent, id) {
    await this._call("play_queue_item", { entity: ent, queue_item_id: id });
  }
}

class MaPlayerCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._id = `ma-player-${++instanceCounter}`;
    this._view = "art"; // art | queue | lyrics
    this._target = null;
    this._sig = "";
    this._trackKey = "";
    this._fav = null;
    this._queue = null;
    this._queueStatus = "idle";
    this._lyrics = null;
    this._lyricIdx = -1;
    this._onPopState = this._onPopState.bind(this);
    this._onTargetEvent = (e) => {
      if (this._config && e.detail.entity === this._config.entity) {
        this._target = e.detail.target;
        this._sig = "";
        this._update();
      }
    };
  }

  // ---------- Ciclo de vida HA ----------

  setConfig(config) {
    if (!config || !config.entity) throw new Error("Falta 'entity' (media_player de Music Assistant)");
    this._config = { queue_limit: 50, lyrics: true, lyrics_url: "https://lrclib.net", ...config };
    this._target = Target.load(this._config.entity);
    this._sig = "";
    if (this._browser) this._browser.setConfig(this._browserConfig());
    if (this._rendered) this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._rendered) this._render();
    if (this._browser) this._browser.hass = hass;
    this._update();
  }

  get hass() {
    return this._hass;
  }

  getCardSize() {
    return 2;
  }

  getGridOptions() {
    return { columns: 12, min_columns: 6 };
  }

  static getStubConfig(hass) {
    return MaBrowserCard.getStubConfig(hass);
  }

  connectedCallback() {
    window.addEventListener("popstate", this._onPopState);
    window.addEventListener(TARGET_EVENT, this._onTargetEvent);
    clearInterval(this._timer);
    this._timer = setInterval(() => this._tick(), 500);
  }

  disconnectedCallback() {
    window.removeEventListener("popstate", this._onPopState);
    window.removeEventListener(TARGET_EVENT, this._onTargetEvent);
    clearInterval(this._timer);
    clearTimeout(this._queueTimer);
    if (this._np && this._np.open) this._np.close();
  }

  _browserConfig() {
    // El buscador interno usa las mismas opciones (media_types, home, speakers…) en modo overlay
    // eslint-disable-next-line no-unused-vars
    const { type, queue_limit, lyrics, lyrics_url, name, ...rest } = this._config;
    return { ...rest, mode: "overlay" };
  }

  // ---------- Estado del parlante ----------

  _entity() {
    const t = this._target;
    return t && this._hass && this._hass.states[t] ? t : this._config.entity;
  }

  _state() {
    return this._hass && this._hass.states[this._entity()];
  }

  _isPlaying(st) {
    if (!st) return false;
    if (this._optAt && Date.now() - this._optAt < 2500) return this._optPlaying;
    return st.state === "playing";
  }

  _duration(st) {
    return (st && Number(st.attributes.media_duration)) || 0;
  }

  /*
   * Reloj de reproducción propio. HA informa la posición como un "ancla":
   * media_position (en segundos enteros) + el momento en que se midió (media_position_updated_at,
   * con el reloj del servidor de Music Assistant). Corregimos tres cosas:
   *   - el desfase entre el reloj del servidor y el de la tablet (_skew),
   *   - el redondeo a segundos enteros (+0,5 s de media),
   *   - que con algunos parlantes (p. ej. Voice PE), tras adelantar o reanudar, Music Assistant
   *     reinicia el stream y cuenta el tiempo DESDE ESE REINICIO (manda pos=0 aunque la canción siga
   *     en el segundo 90). Si eso pasa justo después de una acción nuestra, calculamos la diferencia
   *     (_offset) y se la sumamos a todo lo que llegue hasta que cambie la canción.
   */
  _syncClock(st) {
    const a = (st && st.attributes) || {};
    const key = `${this._entity()}|${a.media_title || ""}|${a.media_artist || ""}`;
    if (key !== this._clockKey) {
      // otra canción u otro parlante: empezamos de cero
      this._clockKey = key;
      this._anchor = null;
      this._lastUpd = undefined;
      this._offset = 0;
      this._expect = null;
    }
    if (!st) return;
    const now = Date.now();
    const playing = st.state === "playing";
    const upd = a.media_position_updated_at || "";
    if (upd !== this._lastUpd || !this._anchor) {
      const live = this._lastUpd !== undefined && upd !== this._lastUpd; // llegó mientras mirábamos
      this._lastUpd = upd;
      const updMs = Date.parse(upd);
      if (live && updMs) {
        const obs = now - updMs; // desfase de reloj + latencia: nos quedamos con el menor
        this._skew = this._skew == null ? obs : Math.min(this._skew, obs);
      }
      let ha = Number(a.media_position) || 0;
      if (playing && updMs) ha += 0.5 + Math.max(0, (now - (this._skew || 0) - updMs) / 1000);
      let pos = ha + (this._offset || 0);
      let note = "";
      // Hasta 15 s después de adelantar/pausar/reanudar desde la tarjeta sabemos dónde debería estar
      if (this._expect && now - this._expect.at < 15000 && this._anchor) {
        const mine = this._position(st);
        if (Math.abs(pos - mine) > 3) {
          this._offset = mine - ha;
          pos = mine;
          note = ` · MA reinició el conteo, compenso ${this._offset.toFixed(1)}s`;
        }
      }
      this._anchor = { pos, at: now, playing };
      this._dbg(`HA ${st.state} pos=${a.media_position} upd=${upd ? upd.slice(11, 23) : "-"} ` +
        `(${updMs ? ((now - updMs) / 1000).toFixed(1) : "?"}s) → ancla ${pos.toFixed(1)}${note}`);
    } else if (this._anchor.playing !== playing) {
      // pausa/reanudación sin ancla nueva: re-anclamos donde estábamos
      this._anchor = { pos: this._position(st), at: now, playing };
    }
  }

  // ---------- Diagnóstico (debug: true) ----------

  _dbg(msg) {
    if (!this._config.debug) return;
    const line = `${new Date().toISOString().slice(11, 23)} ${msg}`;
    console.info(`[ma-player-card][debug] ${line}`);
    this._dbgLog = [line, ...(this._dbgLog || [])].slice(0, 10);
  }

  async _dbgPollQueue() {
    // elapsed_time según la cola de Music Assistant, para comparar con lo que calcula la tarjeta
    if (!this._config.debug || !this._np.open || this._dbgBusy) return;
    this._dbgBusy = true;
    const ent = this._entity();
    try {
      const r = await this._hass.callWS({
        type: "call_service", domain: "music_assistant", service: "get_queue",
        target: { entity_id: ent }, service_data: {}, return_response: true,
      });
      const d = (r && r.response) || {};
      const q = d[ent] || d;
      this._dbgQueue = { elapsed: q.elapsed_time, at: Date.now() };
    } catch (err) {
      this._dbgQueue = { error: (err && err.message) || String(err), at: Date.now() };
    }
    this._dbgBusy = false;
  }

  _renderDebug(st, pos) {
    const el = this._els.debug;
    if (!this._config.debug || !el) return;
    if (!this._dbgPollAt || Date.now() - this._dbgPollAt > 2000) {
      this._dbgPollAt = Date.now();
      this._dbgPollQueue();
    }
    const a = (st && st.attributes) || {};
    const an = this._anchor;
    const q = this._dbgQueue;
    const ago = (t) => `${((Date.now() - t) / 1000).toFixed(1)}s`;
    el.textContent = [
      `v${VERSION}  backend: ${this._backend().name}  estado: ${st ? st.state : "-"}  (optimista: ${this._optAt ? this._optPlaying : "-"})`,
      `HA media_position: ${a.media_position}  duración: ${a.media_duration}`,
      `HA updated_at: ${a.media_position_updated_at || "-"}`,
      `reloj tablet: ${new Date().toISOString()}`,
      `desfase reloj (skew): ${this._skew == null ? "sin medir" : `${this._skew} ms`}   compensación MA: ${(this._offset || 0).toFixed(1)}s`,
      `ancla: ${an ? `${an.pos.toFixed(1)}s hace ${ago(an.at)} ${an.playing ? "▶" : "⏸"}${an.local ? " (local)" : ""}` : "-"}`,
      `POSICIÓN TARJETA: ${pos.toFixed(1)}s`,
      `cola MA elapsed_time: ${q ? (q.error ? `error ${q.error}` : `${q.elapsed}s (hace ${ago(q.at)})`) : "…"}`,
      "— eventos —",
      ...(this._dbgLog || []),
    ].join("\n");
  }

  _setLocalPosition(pos, playing) {
    this._dbg(`local ${playing ? "▶" : "⏸"} ancla ${pos.toFixed(1)}`);
    this._expect = { at: Date.now() };
    this._anchor = { pos, at: Date.now(), playing };
  }

  _position(st) {
    const an = this._anchor;
    if (!st || !an) return 0;
    let p = an.pos + (an.playing ? (Date.now() - an.at) / 1000 : 0);
    const d = this._duration(st);
    if (d) p = Math.min(p, d);
    return Math.max(0, p);
  }

  _picture(st) {
    const a = (st && st.attributes) || {};
    return a.entity_picture_local || a.entity_picture || "";
  }

  // ---------- Render ----------

  _render() {
    this._rendered = true;
    const accent = this._config.accent_color === "theme"
      ? "var(--primary-color)"
      : this._config.accent_color || APPLE_RED;
    this.style.setProperty("--accent", accent);

    this.shadowRoot.innerHTML = `
      <style>${STYLES}${PLAYER_STYLES}</style>
      <ha-card class="mini" id="mini">
        <div class="mini-row">
          <button class="mini-main" id="openNp" aria-label="Abrir reproductor">
            <span class="mini-art" id="miniArt"></span>
            <span class="mini-text"><span class="mini-title" id="miniTitle"></span><span class="mini-sub" id="miniSub"></span></span>
          </button>
          <div class="mini-ctrls">
            <button class="ib prev" data-cmd="prev" aria-label="Anterior"><ha-icon icon="mdi:skip-previous"></ha-icon></button>
            <button class="ib play" data-cmd="playpause" aria-label="Reproducir o pausar"><ha-icon id="miniPlay" icon="mdi:play"></ha-icon></button>
            <button class="ib next" data-cmd="next" aria-label="Siguiente"><ha-icon icon="mdi:skip-next"></ha-icon></button>
            <button class="ib search" data-cmd="search" aria-label="Buscar música"><ha-icon icon="mdi:magnify"></ha-icon></button>
          </div>
        </div>
        <div class="mini-progress"><div class="fill" id="miniFill"></div></div>
      </ha-card>

      <dialog class="np" id="np">
        <div class="np-bg" id="npBg"></div>
        <div class="np-shade"></div>
        ${this._config.debug ? `<pre class="np-debug" id="npDebug"></pre>` : ""}
        <div class="np-inner">
          <div class="np-top">
            <button class="np-btn" id="npClose" aria-label="Cerrar"><ha-icon icon="mdi:chevron-down"></ha-icon></button>
            <div class="np-where" id="npWhere"></div>
            <span class="np-top-spacer"></span>
          </div>
          <div class="np-stage" id="npStage" data-view="art">
            <div class="np-art-wrap view-art"><div class="np-art" id="npArt"></div></div>
            <div class="np-list view-queue" id="npQueue"></div>
            <div class="np-lyrics view-lyrics" id="npLyrics"></div>
          </div>
          <div class="np-panel">
            <div class="np-titlerow">
              <div class="np-text"><div class="np-title" id="npTitle"></div><div class="np-artist" id="npArtist"></div></div>
              <button class="np-btn fav" id="npFav" aria-label="Agregar a favoritos" hidden><ha-icon icon="mdi:heart-outline"></ha-icon></button>
            </div>
            <div class="slider seek" id="npSeek" role="slider" tabindex="0" aria-label="Posición"><div class="track"><div class="fill"></div></div></div>
            <div class="np-times"><span id="npElapsed">0:00</span><span id="npRemain">-0:00</span></div>
            <div class="np-ctrls">
              <button class="np-btn small" data-cmd="shuffle" id="npShuffle" aria-label="Aleatorio"><ha-icon icon="mdi:shuffle-variant"></ha-icon></button>
              <button class="np-btn big" data-cmd="prev" aria-label="Anterior"><ha-icon icon="mdi:skip-previous"></ha-icon></button>
              <button class="np-btn huge" data-cmd="playpause" aria-label="Reproducir o pausar"><ha-icon id="npPlay" icon="mdi:play"></ha-icon></button>
              <button class="np-btn big" data-cmd="next" aria-label="Siguiente"><ha-icon icon="mdi:skip-next"></ha-icon></button>
              <button class="np-btn small" data-cmd="repeat" id="npRepeat" aria-label="Repetir"><ha-icon icon="mdi:repeat"></ha-icon></button>
            </div>
            <div class="np-vol">
              <ha-icon icon="mdi:volume-low"></ha-icon>
              <div class="slider vol" id="npVol" role="slider" tabindex="0" aria-label="Volumen"><div class="track"><div class="fill"></div></div></div>
              <ha-icon icon="mdi:volume-high"></ha-icon>
            </div>
            <div class="np-bottom">
              ${this._config.lyrics ? `<button class="np-btn tool" data-view="lyrics" aria-label="Letra"><ha-icon icon="mdi:message-text-outline"></ha-icon></button>` : `<span class="np-top-spacer"></span>`}
              <button class="np-pill" id="npSpeaker" aria-label="Elegir parlante"><ha-icon icon="mdi:speaker"></ha-icon><span id="npSpeakerName"></span></button>
              <button class="np-btn tool" data-cmd="search" aria-label="Buscar música"><ha-icon icon="mdi:magnify"></ha-icon></button>
              <button class="np-btn tool" data-view="queue" aria-label="Cola"><ha-icon icon="mdi:playlist-music"></ha-icon></button>
            </div>
          </div>
        </div>
      </dialog>

      <ma-browser-card id="browser"></ma-browser-card>`;

    const $ = (id) => this.shadowRoot.getElementById(id);
    this._els = {
      mini: $("mini"), miniArt: $("miniArt"), miniTitle: $("miniTitle"), miniSub: $("miniSub"),
      miniPlay: $("miniPlay"), miniFill: $("miniFill"),
      np: $("np"), bg: $("npBg"), where: $("npWhere"), stage: $("npStage"), art: $("npArt"),
      queue: $("npQueue"), lyrics: $("npLyrics"), title: $("npTitle"), artist: $("npArtist"),
      fav: $("npFav"), seek: $("npSeek"), elapsed: $("npElapsed"), remain: $("npRemain"),
      shuffle: $("npShuffle"), repeat: $("npRepeat"), play: $("npPlay"), vol: $("npVol"),
      speakerName: $("npSpeakerName"), debug: $("npDebug"),
    };
    this._np = this._els.np;

    // Buscador interno (mismo componente que la tarjeta de búsqueda, sin tarjeta propia)
    this._browser = $("browser");
    this._browser.setConfig(this._browserConfig());
    if (this._hass) this._browser.hass = this._hass;

    this.shadowRoot.addEventListener("click", (e) => {
      const cmd = e.target.closest("[data-cmd]");
      if (cmd) return this._cmd(cmd.dataset.cmd);
      const view = e.target.closest("[data-view]");
      if (view) return this._setView(this._view === view.dataset.view ? "art" : view.dataset.view);
    });
    $("openNp").addEventListener("click", () => {
      const st = this._state();
      if (st && st.attributes.media_title) this._openNp();
      else this._browser.open(); // nada sonando: directo al buscador
    });
    $("npClose").addEventListener("click", () => this._np.close());
    this._np.addEventListener("close", () => this._onNpClosed());
    $("npSpeaker").addEventListener("click", () => this._browser._openSpeakers());
    this._els.fav.addEventListener("click", () => this._favorite());
    this._bindQueue();

    this._seekCtl = bindSlider(this._els.seek, {
      onInput: (r) => {
        this._dragPos = r * this._duration(this._state());
        this._tick();
      },
      onChange: (r) => {
        this._dragPos = null;
        const d = this._duration(this._state());
        if (r === null || !d) return this._tick();
        const pos = r * d;
        this._setLocalPosition(pos, this._isPlaying(this._state()));
        this._call("media_seek", { seek_position: Math.round(pos * 10) / 10 });
        this._tick();
      },
    });
    let volTimer = null;
    const sendVol = (r) => this._call("volume_set", { volume_level: Math.round(r * 100) / 100 });
    bindSlider(this._els.vol, {
      onInput: (r) => {
        this._vol = { v: r, at: Date.now() };
        setSlider(this._els.vol, r);
        if (!volTimer) volTimer = setTimeout(() => { volTimer = null; sendVol(this._vol.v); }, 250);
      },
      onChange: (r) => {
        if (r === null) return;
        clearTimeout(volTimer);
        volTimer = null;
        this._vol = { v: r, at: Date.now() };
        setSlider(this._els.vol, r);
        sendVol(r);
      },
    });

    // Letra: tocar una línea salta a ese momento; si el usuario desplaza, pausamos el auto-scroll
    this._els.lyrics.addEventListener("click", (e) => {
      const line = e.target.closest(".ly-line");
      if (!line) return;
      const pos = Number(line.dataset.t);
      this._setLocalPosition(pos, this._isPlaying(this._state()));
      this._lyUserAt = 0;
      this._call("media_seek", { seek_position: pos });
      this._haptic("light");
    });
    const userScroll = () => (this._lyUserAt = Date.now());
    this._els.lyrics.addEventListener("wheel", userScroll, { passive: true });
    this._els.lyrics.addEventListener("touchmove", userScroll, { passive: true });

    this._sig = "";
    this._update();
  }

  _setArt(el, url, icon = "mdi:music") {
    if (el.dataset.src === (url || "")) return;
    el.dataset.src = url || "";
    el.innerHTML = url ? `<img src="${esc(url)}" alt="" draggable="false" />` : `<ha-icon icon="${icon}"></ha-icon>`;
    const img = el.querySelector("img");
    if (img) img.addEventListener("error", () => (el.innerHTML = `<ha-icon icon="${icon}"></ha-icon>`), { once: true });
  }

  _update() {
    if (!this._rendered || !this._hass) return;
    const st = this._state();
    const a = (st && st.attributes) || {};
    if (this._optAt && st && (st.state === "playing") === this._optPlaying) this._optAt = 0;
    this._syncClock(st); // siempre, aunque nada visible haya cambiado
    const playing = this._isPlaying(st);
    const pic = this._picture(st);
    const name = this._browser ? this._browser._speakerName(this._entity()) : this._entity();
    const sig = [this._entity(), st && st.state, a.media_title, a.media_artist, a.media_album_name, pic,
      a.shuffle, a.repeat, a.volume_level, a.media_duration, playing, name].join("|");
    if (sig === this._sig) return;
    this._sig = sig;

    const e = this._els;
    const has = !!(st && a.media_title);
    const unavailable = !st || st.state === "unavailable";

    // Mini
    e.mini.classList.toggle("idle", !has);
    this._setArt(e.miniArt, has ? pic : "", "mdi:music");
    e.miniTitle.textContent = has ? a.media_title : unavailable ? "Parlante no disponible" : "Nada sonando";
    e.miniSub.textContent = has ? [a.media_artist, a.media_album_name].filter(Boolean).join(" · ") : `${name} · tocá para buscar música`;
    e.miniPlay.setAttribute("icon", playing ? "mdi:pause" : "mdi:play");

    // Reproduciendo
    e.bg.style.backgroundImage = pic ? `url("${pic.replace(/"/g, "%22")}")` : "";
    this._setArt(e.art, pic, "mdi:music");
    e.art.classList.toggle("paused", !playing);
    e.title.textContent = has ? a.media_title : "Nada sonando";
    e.artist.textContent = has ? [a.media_artist, a.media_album_name].filter(Boolean).join(" — ") : "";
    e.where.textContent = `Reproduciendo en ${name}`;
    e.speakerName.textContent = name;
    e.play.setAttribute("icon", playing ? "mdi:pause" : "mdi:play");
    e.shuffle.classList.toggle("on", !!a.shuffle);
    const rep = a.repeat || "off";
    e.repeat.classList.toggle("on", rep !== "off");
    e.repeat.querySelector("ha-icon").setAttribute("icon", rep === "one" ? "mdi:repeat-once" : rep === "all" ? "mdi:repeat" : "mdi:repeat-off");
    if (!this._vol || Date.now() - this._vol.at > 2000) setSlider(e.vol, Number(a.volume_level) || 0);

    // ¿Cambió la canción o el parlante?
    const key = `${this._entity()}|${a.media_title || ""}|${a.media_artist || ""}`;
    if (key !== this._trackKey) {
      this._trackKey = key;
      this._fav = null;
      this._lyrics = null;
      this._lyricIdx = -1;
      if (this._np.open) this._refreshNp();
    }
    this._renderFav();
    this._tick();
  }

  _tick() {
    if (!this._rendered || !this._hass) return;
    const st = this._state();
    const d = this._duration(st);
    const pos = this._dragPos != null ? this._dragPos : this._position(st);
    const ratio = d ? pos / d : 0;
    this._els.miniFill.style.width = `${Math.min(100, ratio * 100)}%`;
    if (!this._np.open) return;
    setSlider(this._els.seek, ratio);
    this._els.elapsed.textContent = fmtTime(pos);
    this._els.remain.textContent = d ? `-${fmtTime(d - pos)}` : "";
    if (this._view === "lyrics") this._syncLyrics(pos);
    this._renderDebug(st, pos);
  }

  // ---------- Pantalla completa ----------

  _openNp() {
    if (this._np.open) return;
    this._haptic("light");
    this._np.showModal();
    history.pushState({ ...(history.state || {}), maPlayer: this._id }, "");
    this._pushedState = true;
    this._sig = "";
    this._update();
    this._refreshNp();
  }

  _onNpClosed() {
    if (this._pushedState) {
      this._pushedState = false;
      history.back();
    }
  }

  _onPopState() {
    if (this._np && this._np.open && (!history.state || history.state.maPlayer !== this._id)) {
      this._pushedState = false;
      this._np.close();
    }
  }

  _refreshNp() {
    // Cola + estado de favorito (con un pequeño retraso: el parlante suele mandar varios cambios seguidos)
    clearTimeout(this._queueTimer);
    this._queueTimer = setTimeout(() => this._loadQueue(this._view === "queue"), 400);
    if (this._view === "lyrics") this._loadLyrics();
  }

  _setView(view) {
    this._view = view;
    this._els.stage.dataset.view = view;
    this.shadowRoot.querySelectorAll(".np-btn.tool[data-view]").forEach((b) => b.classList.toggle("on", b.dataset.view === view));
    if (view === "queue") this._loadQueue(true);
    if (view === "lyrics") {
      this._lyricIdx = -1;
      this._lyUserAt = 0;
      if (!this._lyrics) this._loadLyrics();
      else this._renderLyrics();
    }
    this._haptic("selection");
  }

  // ---------- Comandos ----------

  _call(service, data = {}) {
    return this._hass
      .callService("media_player", service, { entity_id: this._entity(), ...data })
      .catch((err) => console.error(`[ma-player-card] ${service}`, err));
  }

  _cmd(cmd) {
    const st = this._state();
    const a = (st && st.attributes) || {};
    this._haptic("light");
    switch (cmd) {
      case "playpause":
        this._optPlaying = !this._isPlaying(st);
        this._optAt = Date.now();
        this._setLocalPosition(this._position(st), this._optPlaying);
        this._sig = "";
        this._update();
        return this._call("media_play_pause");
      case "prev":
        return this._call("media_previous_track");
      case "next":
        return this._call("media_next_track");
      case "shuffle":
        return this._call("shuffle_set", { shuffle: !a.shuffle });
      case "repeat": {
        const order = ["off", "all", "one"];
        const next = order[(order.indexOf(a.repeat || "off") + 1) % order.length];
        return this._call("repeat_set", { repeat: next });
      }
      case "search":
        return this._browser.open();
      default:
        return undefined;
    }
  }

  // ---------- Backend ----------

  /** backend: auto (mass_queue si está instalado) | native | mass_queue */
  _backend() {
    const want = this._config.backend || "auto";
    const hasMq = !!(this._hass && this._hass.services && this._hass.services.mass_queue);
    const name = want === "mass_queue" || (want === "auto" && hasMq) ? "mass_queue" : "native";
    if (!this._be || this._be.name !== name) {
      this._be = name === "mass_queue" ? new MassQueueBackend(this) : new NativeBackend(this);
    }
    return this._be;
  }

  // ---------- Favorito ----------

  _favButton(ent = this._entity()) {
    const ents = (this._hass && this._hass.entities) || {};
    const me = ents[ent];
    if (!me || !me.device_id) return null;
    const btn = Object.values(ents).find((x) =>
      x.device_id === me.device_id && x.entity_id.startsWith("button.") &&
      (x.translation_key === "favorite_now_playing" || /favorit/.test(x.entity_id)));
    return btn ? btn.entity_id : null;
  }

  _renderFav() {
    const st = this._state();
    const show = !!(this._backend().canFavorite(this._entity()) && st && st.attributes.media_title);
    this._els.fav.hidden = !show;
    this._els.fav.classList.toggle("on", !!this._fav);
    this._els.fav.querySelector("ha-icon").setAttribute("icon", this._fav ? "mdi:heart" : "mdi:heart-outline");
  }

  async _favorite() {
    const st = this._state();
    const item = { name: st.attributes.media_title, image: this._picture(st) };
    const be = this._backend();
    const ent = this._entity();
    const remove = !!this._fav;
    if (remove && !be.can.unfavorite) {
      this._browser._showToast(item, "Ya es favorita · para quitarla, usá Music Assistant", "mdi:heart");
      return;
    }
    this._fav = !remove;
    this._favAt = Date.now(); // durante unos segundos ignoramos lo que diga el servidor (puede venir desactualizado)
    this._renderFav();
    this._haptic(remove ? "light" : "success");
    try {
      if (remove) await be.unfavorite(ent);
      else await be.favorite(ent);
      this._browser._showToast(item, remove ? "Quitada de favoritos" : "Agregada a favoritos", remove ? "mdi:heart-broken" : "mdi:heart");
    } catch (err) {
      this._fav = remove;
      this._renderFav();
      const msg = (err && err.message) || String(err);
      this._browser._showToast(item, `No se pudo ${remove ? "quitar" : "agregar"}: ${msg}`, "mdi:alert-circle", true);
    }
  }

  // ---------- Cola ----------

  async _loadQueue(withItems) {
    if (this._qDrag || this._qBusy) return; // no pisamos la lista mientras se arrastra o se aplica un cambio
    const ent = this._entity();
    const track = this._trackKey;
    const be = this._backend();
    if (withItems && !this._queue) {
      this._queueStatus = "loading";
      this._renderQueue();
    }
    try {
      const info = await be.queueInfo(ent);
      let upcoming = this._queue ? this._queue.upcoming : [];
      if (withItems) upcoming = await be.queueItems(ent, info, Number(this._config.queue_limit) || 50);
      if (ent !== this._entity() || this._qDrag || this._qBusy) return;
      this._queue = { current: info.current, upcoming, total: info.total, idx: info.idx };
      const recentLocal = this._favAt && Date.now() - this._favAt < 6000;
      if (info.current && track === this._trackKey && !recentLocal) this._fav = !!info.current.favorite;
      this._queueStatus = "ok";
    } catch (err) {
      if (ent !== this._entity()) return;
      const msg = (err && (err.message || err.code)) || String(err);
      this._queue = null;
      this._queueStatus = /no.?active.?queue|cola activa/i.test(msg) ? "empty" : "error";
      this._queueError = msg;
    }
    this._renderFav();
    this._renderQueue();
  }

  _queueRow(it, i, cur) {
    const can = this._backend().can;
    const sub = it.artist || it.album || "";
    const tappable = !cur && can.playItem;
    return `<div class="q-row ${cur ? "cur" : "up"} ${tappable ? "tap" : ""}" data-i="${i}">
      <div class="q-art">${it.image ? `<img src="${esc(it.image)}" alt="" loading="lazy" draggable="false" />` : `<ha-icon icon="mdi:music"></ha-icon>`}</div>
      <div class="q-text"><div class="q-title">${esc(it.name)}</div>${sub ? `<div class="q-sub">${esc(sub)}</div>` : ""}</div>
      ${it.duration ? `<div class="q-dur">${fmtTime(it.duration)}</div>` : ""}
      ${!cur && can.remove ? `<button class="q-btn q-del" aria-label="Quitar de la cola"><ha-icon icon="mdi:minus-circle-outline"></ha-icon></button>` : ""}
      ${!cur && can.reorder ? `<div class="q-btn q-handle" aria-label="Arrastrar para mover"><ha-icon icon="mdi:drag-horizontal-variant"></ha-icon></div>` : ""}
    </div>`;
  }

  _renderQueue() {
    if (this._qDrag) return;
    const el = this._els.queue;
    if (this._queueStatus === "loading") {
      el.innerHTML = `<div class="np-msg">Cargando la cola…</div>`;
      return;
    }
    if (this._queueStatus === "empty" || (this._queueStatus === "ok" && !this._queue.current && !this._queue.upcoming.length)) {
      el.innerHTML = `<div class="np-msg">No hay nada en la cola.</div>`;
      return;
    }
    if (this._queueStatus === "error") {
      el.innerHTML = `<div class="np-msg">No pude cargar la cola.<br>${esc(this._queueError || "")}</div>`;
      return;
    }
    if (!this._queue) return;
    const be = this._backend();
    const q = this._queue;
    const left = Math.max(0, q.total - (q.idx + 1));
    const more = left - q.upcoming.length;
    const scroll = el.scrollTop;
    el.innerHTML = `
      ${q.current ? `<div class="q-sec">Reproduciendo</div>${this._queueRow(q.current, -1, true)}` : ""}
      <div class="q-sec">A continuación <span>· ${left} canciones</span></div>
      <div class="q-list">${q.upcoming.length ? q.upcoming.map((x, i) => this._queueRow(x, i)).join("") : `<div class="q-empty">No hay más canciones en la cola.</div>`}</div>
      ${more > 0 && !be.partial ? `<div class="q-empty">y ${more} más…</div>` : ""}
      ${be.partial ? `<div class="q-empty">Tu versión de Home Assistant solo informa la próxima canción.
        La lista completa llega con una versión más nueva de la integración, o instalando mass_queue.</div>` : ""}
      ${be.can.reorder ? `<div class="q-empty">Tocá una canción para escucharla · arrastrá ≡ para moverla.</div>` : ""}
      <div class="q-pad"></div>`;
    el.scrollTop = scroll;
  }

  _bindQueue() {
    const el = this._els.queue;
    el.addEventListener("click", (e) => {
      if (this._qJustDragged) return;
      const row = e.target.closest(".q-row.up");
      if (!row) return;
      const i = Number(row.dataset.i);
      if (e.target.closest(".q-del")) this._queueRemove(i);
      else if (!e.target.closest(".q-handle") && row.classList.contains("tap")) this._queuePlay(i);
    });

    // Arrastrar ≡ para reordenar
    el.addEventListener("pointerdown", (e) => {
      const handle = e.target.closest(".q-handle");
      if (!handle || e.button > 0) return;
      const row = handle.closest(".q-row.up");
      const rows = [...el.querySelectorAll(".q-row.up")];
      const from = rows.indexOf(row);
      if (from < 0) return;
      e.preventDefault();
      handle.setPointerCapture(e.pointerId);
      const rects = rows.map((r) => r.getBoundingClientRect());
      this._qDrag = { row, rows, rects, from, to: from, startY: e.clientY, startScroll: el.scrollTop, h: rects[from].height };
      row.classList.add("dragging");
      this._haptic("selection");
    });
    el.addEventListener("pointermove", (e) => {
      const d = this._qDrag;
      if (!d) return;
      // Desplazamiento automático cerca de los bordes
      const box = el.getBoundingClientRect();
      if (e.clientY < box.top + 50) el.scrollTop -= 8;
      else if (e.clientY > box.bottom - 50) el.scrollTop += 8;
      const dy = e.clientY - d.startY + (el.scrollTop - d.startScroll);
      d.row.style.transform = `translateY(${dy}px)`;
      const center = d.rects[d.from].top + d.h / 2 + dy;
      let to = d.from;
      d.rects.forEach((r, k) => {
        const mid = r.top + r.height / 2;
        if (k > d.from && center > mid) to = k;
        if (k < d.from && center < mid && to >= d.from) to = Math.min(k, to === d.from ? k : to);
      });
      if (to !== d.to) this._haptic("selection");
      d.to = to;
      d.rows.forEach((r, k) => {
        if (k === d.from) return;
        const shift = d.from < k && k <= to ? -d.h : to <= k && k < d.from ? d.h : 0;
        r.style.transform = shift ? `translateY(${shift}px)` : "";
      });
    });
    const end = () => {
      const d = this._qDrag;
      if (!d) return;
      this._qDrag = null;
      d.rows.forEach((r) => (r.style.transform = ""));
      d.row.classList.remove("dragging");
      this._qJustDragged = true;
      setTimeout(() => (this._qJustDragged = false), 50);
      if (d.to !== d.from) this._queueMove(d.from, d.to);
      else this._renderQueue();
    };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
  }

  async _queueAction(label, optimistic, run) {
    const be = this._backend();
    const ent = this._entity();
    const backup = this._queue && { ...this._queue, upcoming: [...this._queue.upcoming] };
    optimistic();
    this._renderQueue();
    this._qBusy = true;
    try {
      await run(be, ent);
    } catch (err) {
      console.error(`[ma-player-card] ${label}`, err);
      this._queue = backup;
      this._browser._showToast({ name: label }, (err && err.message) || String(err), "mdi:alert-circle", true);
    }
    this._qBusy = false;
    this._renderQueue();
    this._loadQueue(true); // releemos el estado real
  }

  _queueMove(from, to) {
    const q = this._queue;
    const item = q.upcoming[from];
    this._queueAction("Mover canción", () => {
      q.upcoming.splice(from, 1);
      q.upcoming.splice(to, 0, item);
    }, async (be, ent) => {
      // mass_queue solo sabe "subir uno", "bajar uno" y "a continuación": encadenamos pasos
      if (to === 0) return be.move(ent, item.id, "next");
      const dir = to < from ? "up" : "down";
      for (let n = Math.abs(to - from); n > 0; n--) await be.move(ent, item.id, dir);
      return undefined;
    });
  }

  _queueRemove(i) {
    const q = this._queue;
    const item = q.upcoming[i];
    this._haptic("light");
    this._queueAction("Quitar de la cola", () => {
      q.upcoming.splice(i, 1);
      q.total -= 1;
    }, (be, ent) => be.remove(ent, item.id));
  }

  async _queuePlay(i) {
    const item = this._queue.upcoming[i];
    this._haptic("light");
    try {
      await this._backend().playItem(this._entity(), item.id);
      this._browser._showToast({ name: item.name, image: item.image }, "Reproduciendo", "mdi:play-circle");
    } catch (err) {
      this._browser._showToast({ name: item.name, image: item.image }, (err && err.message) || String(err), "mdi:alert-circle", true);
    }
  }
  // ---------- Letra sincronizada ----------

  async _loadLyrics() {
    const st = this._state();
    const a = (st && st.attributes) || {};
    const key = this._trackKey;
    if (!a.media_title) {
      this._lyrics = { status: "none" };
      return this._renderLyrics();
    }
    this._lyrics = { status: "loading" };
    this._renderLyrics();
    let lyrics;
    try {
      const d = await fetchLyrics(this._config.lyrics_url.replace(/\/$/, ""), {
        title: a.media_title, artist: a.media_artist, album: a.media_album_name, duration: a.media_duration,
      });
      if (!d) lyrics = { status: "none" };
      else if (d.syncedLyrics) lyrics = { status: "synced", lines: parseLrc(d.syncedLyrics) };
      else if (d.instrumental) lyrics = { status: "instrumental" };
      else lyrics = { status: "plain", text: d.plainLyrics };
    } catch (err) {
      console.warn("[ma-player-card] letra", err);
      lyrics = { status: "error" };
    }
    if (key !== this._trackKey) return; // cambió la canción mientras buscábamos
    this._lyrics = lyrics;
    this._lyricIdx = -1;
    this._renderLyrics();
  }

  _renderLyrics() {
    const el = this._els.lyrics;
    const l = this._lyrics || { status: "loading" };
    const credit = `<div class="ly-note">Letra: LRCLIB</div>`;
    const msg = {
      loading: "Buscando la letra…",
      none: `No encontré la letra de esta canción en LRCLIB.<br><a class="ly-link" href="https://lrclib.net/search/${encodeURIComponent(`${(this._state() || {attributes: {}}).attributes.media_title || ""} ${firstArtist((this._state() || {attributes: {}}).attributes.media_artist)}`.trim())}" target="_blank" rel="noopener">Buscar en lrclib.net</a>`,
      instrumental: "♪ Instrumental ♪",
      error: "No pude conectar con el servicio de letras.",
    }[l.status];
    if (msg) {
      el.innerHTML = `<div class="np-msg">${msg}</div>`;
      return;
    }
    if (l.status === "plain") {
      el.innerHTML = `<div class="ly-plain">${esc(l.text)}</div><div class="ly-note">Letra sin sincronizar · LRCLIB</div>`;
      return;
    }
    el.innerHTML = `<div class="ly-pad"></div>${l.lines
      .map((x, i) => `<p class="ly-line" data-i="${i}" data-t="${x.t}">${x.text ? esc(x.text) : "♪"}</p>`)
      .join("")}${credit}<div class="ly-pad"></div>`;
    this._lyricIdx = -1;
    this._syncLyrics(this._position(this._state()));
  }

  // Adelanto de la letra en segundos (positivo = las líneas aparecen antes). Configurable con lyrics_offset.
  _lyricsOffset() {
    const o = Number(this._config.lyrics_offset);
    return Number.isFinite(o) ? o : 0.6;
  }

  _syncLyrics(pos) {
    const l = this._lyrics;
    if (!l || l.status !== "synced") return;
    let idx = -1;
    for (let i = 0; i < l.lines.length; i++) {
      if (l.lines[i].t <= pos + this._lyricsOffset()) idx = i;
      else break;
    }
    if (idx === this._lyricIdx) return;
    this._lyricIdx = idx;
    const el = this._els.lyrics;
    el.querySelectorAll(".ly-line").forEach((p, i) => {
      p.classList.toggle("active", i === idx);
      p.classList.toggle("past", i < idx);
    });
    // Auto-scroll salvo que el usuario haya desplazado hace poco
    const active = el.querySelector(".ly-line.active");
    if (active && (!this._lyUserAt || Date.now() - this._lyUserAt > 4000)) {
      el.scrollTo({ top: active.offsetTop - el.clientHeight * 0.32, behavior: "smooth" });
    }
  }

  _haptic(kind) {
    this.dispatchEvent(new CustomEvent("haptic", { detail: kind, bubbles: true, composed: true }));
  }
}

const PLAYER_STYLES = `
  /* ---------- Mini reproductor (tarjeta en el panel) ---------- */
  .mini { position: relative; overflow: hidden; container-type: inline-size; }
  .mini-row { display: flex; align-items: center; gap: 6px; padding: 10px 8px 12px 10px; }
  .mini-main { all: unset; box-sizing: border-box; flex: 1; min-width: 0; display: flex; align-items: center; gap: 12px;
    cursor: pointer; border-radius: 12px; -webkit-tap-highlight-color: transparent; }
  .mini-main:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .mini-main:active .mini-art { transform: scale(.95); }
  .mini-art { width: 56px; height: 56px; flex: 0 0 56px; border-radius: 10px; overflow: hidden; display: grid;
    place-items: center; background: var(--fill); box-shadow: 0 4px 12px rgba(0, 0, 0, .15); transition: transform .15s; }
  .mini-art img { width: 100%; height: 100%; object-fit: cover; }
  .mini-art ha-icon { color: var(--secondary-text-color); }
  .mini-text { min-width: 0; display: flex; flex-direction: column; }
  .mini-title { font-size: 15px; font-weight: 600; color: var(--primary-text-color);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .mini-sub { font-size: 13px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .mini-ctrls { display: flex; align-items: center; }
  .ib { width: 46px; height: 46px; border-radius: 50%; border: 0; background: transparent; cursor: pointer;
    color: var(--primary-text-color); display: grid; place-items: center; -webkit-tap-highlight-color: transparent; }
  .ib:active { background: var(--fill); }
  .ib ha-icon { --mdc-icon-size: 28px; }
  .ib.play ha-icon { --mdc-icon-size: 36px; }
  .ib.search { color: var(--accent); }
  .ib.search ha-icon { --mdc-icon-size: 26px; }
  .mini.idle .prev, .mini.idle .play, .mini.idle .next, .mini.idle .mini-progress { display: none; }
  .mini-progress { position: absolute; left: 0; right: 0; bottom: 0; height: 3px; background: var(--fill); }
  .mini-progress .fill { height: 100%; width: 0; background: var(--accent); transition: width .5s linear; }
  @container (max-width: 400px) { .mini .prev { display: none; } }

  /* ---------- Reproduciendo (pantalla completa) ---------- */
  dialog.np { position: fixed; inset: 0; width: 100vw; height: 100vh; height: 100dvh; max-width: none; max-height: none;
    margin: 0; padding: 0; border: 0; overflow: hidden; background: #1c1c1e; color: #fff;
    --np-dim: rgba(255, 255, 255, .62); --np-fill: rgba(255, 255, 255, .16); }
  dialog.np::backdrop { background: rgba(0, 0, 0, .4); }
  dialog.np[open] { animation: npUp .38s cubic-bezier(.2, .9, .3, 1); }
  @keyframes npUp { from { transform: translateY(6%); opacity: 0; } to { transform: none; opacity: 1; } }
  .np-bg { position: absolute; inset: -15%; background: #2c2c2e center / cover no-repeat;
    filter: blur(70px) saturate(1.6) brightness(.8); transform: translateZ(0); }
  .np-shade { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0, 0, 0, .08), rgba(0, 0, 0, .45)); }
  .np-inner { position: relative; height: 100%; box-sizing: border-box; display: grid; gap: 14px;
    grid-template-rows: auto minmax(0, 1fr) auto; grid-template-areas: "top" "stage" "panel";
    padding: max(8px, env(safe-area-inset-top)) max(24px, env(safe-area-inset-right))
             max(20px, env(safe-area-inset-bottom)) max(24px, env(safe-area-inset-left)); }
  @media (min-aspect-ratio: 5/4) and (min-width: 760px) {
    .np-inner { grid-template-columns: minmax(0, 1.1fr) minmax(340px, 1fr); grid-template-rows: auto minmax(0, 1fr);
      grid-template-areas: "top top" "stage panel"; column-gap: 6vw; padding-bottom: max(32px, env(safe-area-inset-bottom)); }
    .np-panel { align-self: center; }
  }
  .np-top { grid-area: top; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .np-where { flex: 1; text-align: center; font-size: 12px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase;
    color: var(--np-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .np-top-spacer { width: 44px; flex: 0 0 44px; }
  .np-btn { width: 44px; height: 44px; flex: 0 0 auto; border: 0; border-radius: 50%; background: transparent; color: #fff;
    display: grid; place-items: center; cursor: pointer; -webkit-tap-highlight-color: transparent;
    transition: background .15s, transform .1s; }
  .np-btn:active { transform: scale(.88); }
  .np-btn:focus { outline: none; }
  .np-btn:focus-visible { background: var(--np-fill); }
  .np-btn ha-icon { --mdc-icon-size: 28px; }
  #npClose { background: var(--np-fill); }

  .np-stage { grid-area: stage; min-height: 0; position: relative; container-type: size; }
  .np-stage > * { position: absolute; inset: 0; display: none; }
  .np-stage[data-view="art"] .view-art { display: grid; place-items: center; }
  .np-stage[data-view="queue"] .view-queue, .np-stage[data-view="lyrics"] .view-lyrics { display: block; }
  .np-art { width: min(100cqw, 100cqh); aspect-ratio: 1; border-radius: 14px; overflow: hidden; display: grid;
    place-items: center; background: var(--np-fill); box-shadow: 0 24px 60px rgba(0, 0, 0, .45);
    transition: transform .5s cubic-bezier(.2, .9, .3, 1.15), box-shadow .5s; }
  .np-art.paused { transform: scale(.84); box-shadow: 0 12px 30px rgba(0, 0, 0, .3); }
  .np-art img { width: 100%; height: 100%; object-fit: cover; }
  .np-art ha-icon { --mdc-icon-size: 30cqmin; color: var(--np-dim); }

  .np-panel { grid-area: panel; width: 100%; max-width: 620px; justify-self: center; display: flex; flex-direction: column; gap: 4px; }
  .np-titlerow { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
  .np-text { flex: 1; min-width: 0; }
  .np-title { font-size: 24px; font-weight: 700; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .np-artist { font-size: 19px; color: var(--np-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .fav { background: var(--np-fill); }
  .fav ha-icon { --mdc-icon-size: 24px; }
  .fav.on ha-icon { color: var(--accent); animation: pop .35s ease-out; }

  .slider { position: relative; height: 30px; display: flex; align-items: center; cursor: pointer; touch-action: none; outline: none; }
  .slider .track { position: relative; width: 100%; height: 6px; border-radius: 3px; overflow: hidden;
    background: rgba(255, 255, 255, .25); transition: height .15s; }
  .slider .fill { position: absolute; inset: 0 auto 0 0; width: 0; background: rgba(255, 255, 255, .8); }
  .slider.drag .track, .slider:focus-visible .track { height: 12px; border-radius: 6px; }
  .slider.drag .fill { background: #fff; }
  .np-times { display: flex; justify-content: space-between; margin-top: -4px; font-size: 12px;
    color: var(--np-dim); font-variant-numeric: tabular-nums; }
  .np-ctrls { display: flex; align-items: center; justify-content: space-between; margin: 10px 0 8px; }
  .np-btn.big { width: 64px; height: 64px; }
  .np-btn.big ha-icon { --mdc-icon-size: 46px; }
  .np-btn.huge { width: 82px; height: 82px; }
  .np-btn.huge ha-icon { --mdc-icon-size: 62px; }
  .np-btn.small ha-icon, .np-btn.tool ha-icon { --mdc-icon-size: 24px; color: var(--np-dim); }
  .np-btn.small.on, .np-btn.tool.on { background: var(--np-fill); }
  .np-btn.small.on ha-icon, .np-btn.tool.on ha-icon { color: #fff; }
  .np-vol { display: flex; align-items: center; gap: 10px; color: var(--np-dim); }
  .np-vol .slider { flex: 1; }
  .np-vol ha-icon { --mdc-icon-size: 20px; }
  .np-bottom { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 14px; }
  .np-pill { display: flex; align-items: center; gap: 8px; min-width: 0; max-width: 60%; height: 40px; padding: 0 16px;
    border-radius: 999px; border: 0; background: var(--np-fill); color: #fff; font: inherit; font-size: 15px; font-weight: 600;
    cursor: pointer; -webkit-tap-highlight-color: transparent; }
  .np-pill span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .np-pill ha-icon { --mdc-icon-size: 20px; flex: 0 0 auto; }
  .np-pill:active { filter: brightness(1.2); }

  /* Cola y letra (ocupan el lugar de la portada) */
  .np-list, .np-lyrics { overflow-y: auto; overscroll-behavior: contain; scrollbar-width: none;
    -webkit-mask-image: linear-gradient(transparent, #000 20px, #000 calc(100% - 56px), transparent);
    mask-image: linear-gradient(transparent, #000 20px, #000 calc(100% - 56px), transparent); }
  .np-list::-webkit-scrollbar, .np-lyrics::-webkit-scrollbar { display: none; }
  .np-msg { height: 100%; display: grid; place-items: center; text-align: center; padding: 0 24px;
    font-size: 17px; color: var(--np-dim); }
  .q-sec { margin: 22px 0 6px; font-size: 16px; font-weight: 700; }
  .q-sec span { font-weight: 400; color: var(--np-dim); }
  .q-row { display: flex; align-items: center; gap: 12px; min-height: 60px; border-bottom: .5px solid rgba(255, 255, 255, .12); }
  .q-row.cur { border: 0; }
  .q-art { width: 46px; height: 46px; flex: 0 0 46px; border-radius: 6px; overflow: hidden; display: grid; place-items: center;
    background: var(--np-fill); }
  .q-art img { width: 100%; height: 100%; object-fit: cover; }
  .q-art ha-icon { color: var(--np-dim); }
  .q-text { flex: 1; min-width: 0; }
  .q-title { font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .q-sub { font-size: 13px; color: var(--np-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .q-dur { font-size: 13px; color: var(--np-dim); font-variant-numeric: tabular-nums; }
  .q-empty { padding: 14px 0; color: var(--np-dim); font-size: 14px; }
  .q-pad { height: 48px; }
  .q-list { position: relative; }
  .q-row.up { position: relative; background: transparent; transition: transform .18s ease; }
  .q-row.tap { cursor: pointer; }
  .q-row.tap:active { background: rgba(255, 255, 255, .06); }
  .q-row.dragging { transition: none; z-index: 2; background: rgba(60, 60, 60, .85); border-radius: 10px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, .45); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
  .q-btn { width: 44px; height: 44px; flex: 0 0 44px; display: grid; place-items: center; border: 0; padding: 0;
    background: none; color: var(--np-dim); cursor: pointer; -webkit-tap-highlight-color: transparent; }
  .q-del { color: #ff6b6b; width: 36px; flex-basis: 36px; }
  .q-handle { touch-action: none; cursor: grab; }
  .q-row.dragging .q-handle { cursor: grabbing; color: #fff; }

  .ly-pad { height: 32cqh; }
  .ly-line { margin: 0; padding: 10px 0; font-size: clamp(24px, 4.4cqw, 42px); font-weight: 700; line-height: 1.25;
    color: rgba(255, 255, 255, .34); cursor: pointer; transform-origin: left center; filter: blur(.5px);
    transition: color .35s, transform .35s, filter .35s; -webkit-tap-highlight-color: transparent; }
  .ly-line.past { color: rgba(255, 255, 255, .28); }
  .ly-line.active { color: #fff; filter: none; transform: scale(1.03); }
  .ly-plain { padding: 24px 0 8px; font-size: 22px; font-weight: 600; line-height: 1.55; white-space: pre-wrap;
    color: rgba(255, 255, 255, .88); }
  .ly-note { padding: 18px 0; font-size: 12px; color: var(--np-dim); }
  .np-debug { position: absolute; z-index: 5; left: 12px; bottom: 12px; max-width: min(560px, calc(100vw - 24px)); margin: 0;
    padding: 10px 12px; border-radius: 12px; background: rgba(0, 0, 0, .72); color: #9f9; font: 11px/1.45 ui-monospace, monospace;
    white-space: pre-wrap; pointer-events: none; }
  .ly-link { display: inline-block; margin-top: 14px; padding: 10px 18px; border-radius: 999px; background: var(--np-fill);
    color: #fff; text-decoration: none; font-size: 15px; font-weight: 600; }

  @media (max-width: 480px) {
    .np-title { font-size: 21px; }
    .np-artist { font-size: 17px; }
    .np-btn.big { width: 56px; height: 56px; }
    .np-btn.big ha-icon { --mdc-icon-size: 40px; }
    .np-btn.huge { width: 72px; height: 72px; }
    .np-btn.huge ha-icon { --mdc-icon-size: 54px; }
  }
`;

// ---------- Registro ----------

const defineOnce = (name, cls) => {
  if (!customElements.get(name)) customElements.define(name, cls);
};
defineOnce("ma-browser-card", MaBrowserCard);
defineOnce("ma-player-card", MaPlayerCard);

window.customCards = window.customCards || [];
for (const card of [
  {
    type: "ma-player-card",
    name: "Music Assistant – Reproductor",
    description: "Lo que está sonando, controles, cola, letra sincronizada y buscador de música.",
  },
  {
    type: "ma-browser-card",
    name: "Music Assistant – Buscador",
    description: "Buscá canciones, artistas, álbumes, playlists y radios y reproducilos en un parlante.",
  },
]) {
  if (!window.customCards.some((c) => c.type === card.type)) {
    window.customCards.push({ ...card, preview: true, documentationURL: "https://www.home-assistant.io/integrations/music_assistant/" });
  }
}
console.info(`%c MA-PLAYER-CARD %c v${VERSION} `, "background:#fa2d48;color:#fff;border-radius:4px 0 0 4px", "");
