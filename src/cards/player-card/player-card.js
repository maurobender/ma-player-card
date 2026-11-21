import { MassQueueBackend } from "../../backend/mass-queue.js";
import { NativeBackend } from "../../backend/native.js";
import { bindSlider, setSlider } from "../../components/slider.js";
import { APPLE_RED } from "../../constants.js";
import { parseLrc } from "../../services/lyrics/lrc-parser.js";
import { fetchLyrics, firstArtist } from "../../services/lyrics/lrclib.js";
import { TARGET_EVENT, Target } from "../../services/speaker-target.js";
import { fmtTime } from "../../utils/format.js";
import { esc } from "../../utils/html.js";
import { nextInstanceId } from "../../utils/ids.js";
import { VERSION } from "../../version.js";
import { MaBrowserCard } from "../browser-card/browser-card.js";
import { STYLES } from "../browser-card/browser-card.styles.js";
import { PLAYER_STYLES } from "./player-card.styles.js";

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

export class MaPlayerCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._id = `ma-player-${nextInstanceId()}`;
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
      this._dbg(
        `HA ${st.state} pos=${a.media_position} upd=${upd ? upd.slice(11, 23) : "-"} ` +
          `(${updMs ? ((now - updMs) / 1000).toFixed(1) : "?"}s) → ancla ${pos.toFixed(1)}${note}`,
      );
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
        type: "call_service",
        domain: "music_assistant",
        service: "get_queue",
        target: { entity_id: ent },
        service_data: {},
        return_response: true,
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
    const accent = this._config.accent_color === "theme" ? "var(--primary-color)" : this._config.accent_color || APPLE_RED;
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
      mini: $("mini"),
      miniArt: $("miniArt"),
      miniTitle: $("miniTitle"),
      miniSub: $("miniSub"),
      miniPlay: $("miniPlay"),
      miniFill: $("miniFill"),
      np: $("np"),
      bg: $("npBg"),
      where: $("npWhere"),
      stage: $("npStage"),
      art: $("npArt"),
      queue: $("npQueue"),
      lyrics: $("npLyrics"),
      title: $("npTitle"),
      artist: $("npArtist"),
      fav: $("npFav"),
      seek: $("npSeek"),
      elapsed: $("npElapsed"),
      remain: $("npRemain"),
      shuffle: $("npShuffle"),
      repeat: $("npRepeat"),
      play: $("npPlay"),
      vol: $("npVol"),
      speakerName: $("npSpeakerName"),
      debug: $("npDebug"),
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
        if (!volTimer)
          volTimer = setTimeout(() => {
            volTimer = null;
            sendVol(this._vol.v);
          }, 250);
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
    const sig = [
      this._entity(),
      st && st.state,
      a.media_title,
      a.media_artist,
      a.media_album_name,
      pic,
      a.shuffle,
      a.repeat,
      a.volume_level,
      a.media_duration,
      playing,
      name,
    ].join("|");
    if (sig === this._sig) return;
    this._sig = sig;

    const e = this._els;
    const has = !!(st && a.media_title);
    const unavailable = !st || st.state === "unavailable";
    if (this._browser) this._browser.setArtwork(has ? pic || "" : null); // el buscador usa el mismo fondo

    // Mini
    e.mini.classList.toggle("idle", !has);
    this._setArt(e.miniArt, has ? pic : "", "mdi:music");
    e.miniTitle.textContent = has ? a.media_title : unavailable ? "Parlante no disponible" : "Nada sonando";
    e.miniSub.textContent = has
      ? [a.media_artist, a.media_album_name].filter(Boolean).join(" · ")
      : `${name} · tocá para buscar música`;
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
    e.repeat
      .querySelector("ha-icon")
      .setAttribute("icon", rep === "one" ? "mdi:repeat-once" : rep === "all" ? "mdi:repeat" : "mdi:repeat-off");
    if (!this._vol || Date.now() - this._vol.at > 2000) setSlider(e.vol, Number(a.volume_level) || 0);

    // ¿Cambió la canción o el parlante?
    const key = `${this._entity()}|${a.media_title || ""}|${a.media_artist || ""}`;
    if (key !== this._trackKey) {
      this._trackKey = key;
      this._fav = null;
      this._lyrics = null;
      this._lyricIdx = -1;
      this._lyUserAt = 0;
      this._els.lyrics.scrollTop = 0; // canción nueva: la letra arranca desde arriba
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
    for (const b of this.shadowRoot.querySelectorAll(".np-btn.tool[data-view]"))
      b.classList.toggle("on", b.dataset.view === view);
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
    const btn = Object.values(ents).find(
      (x) =>
        x.device_id === me.device_id &&
        x.entity_id.startsWith("button.") &&
        (x.translation_key === "favorite_now_playing" || /favorit/.test(x.entity_id)),
    );
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
      this._browser._showToast(
        item,
        remove ? "Quitada de favoritos" : "Agregada a favoritos",
        remove ? "mdi:heart-broken" : "mdi:heart",
      );
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
      ${
        be.partial
          ? `<div class="q-empty">Tu versión de Home Assistant solo informa la próxima canción.
        La lista completa llega con una versión más nueva de la integración, o instalando mass_queue.</div>`
          : ""
      }
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
      for (const r of d.rows) r.style.transform = "";
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
    this._queueAction(
      "Mover canción",
      () => {
        q.upcoming.splice(from, 1);
        q.upcoming.splice(to, 0, item);
      },
      async (be, ent) => {
        // mass_queue solo sabe "subir uno", "bajar uno" y "a continuación": encadenamos pasos
        if (to === 0) return be.move(ent, item.id, "next");
        const dir = to < from ? "up" : "down";
        for (let n = Math.abs(to - from); n > 0; n--) await be.move(ent, item.id, dir);
        return undefined;
      },
    );
  }

  _queueRemove(i) {
    const q = this._queue;
    const item = q.upcoming[i];
    this._haptic("light");
    this._queueAction(
      "Quitar de la cola",
      () => {
        q.upcoming.splice(i, 1);
        q.total -= 1;
      },
      (be, ent) => be.remove(ent, item.id),
    );
  }

  async _queuePlay(i) {
    const item = this._queue.upcoming[i];
    this._haptic("light");
    try {
      await this._backend().playItem(this._entity(), item.id);
      this._browser._showToast({ name: item.name, image: item.image }, "Reproduciendo", "mdi:play-circle");
    } catch (err) {
      this._browser._showToast(
        { name: item.name, image: item.image },
        (err && err.message) || String(err),
        "mdi:alert-circle",
        true,
      );
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
        title: a.media_title,
        artist: a.media_artist,
        album: a.media_album_name,
        duration: a.media_duration,
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
      none: `No encontré la letra de esta canción en LRCLIB.<br><a class="ly-link" href="https://lrclib.net/search/${encodeURIComponent(`${(this._state() || { attributes: {} }).attributes.media_title || ""} ${firstArtist((this._state() || { attributes: {} }).attributes.media_artist)}`.trim())}" target="_blank" rel="noopener">Buscar en lrclib.net</a>`,
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
    if (this._lyUserAt && Date.now() - this._lyUserAt < 4000) return;
    const active = el.querySelector(".ly-line.active");
    if (active) el.scrollTo({ top: active.offsetTop - el.clientHeight * 0.32, behavior: "smooth" });
    else el.scrollTo({ top: 0, behavior: "smooth" }); // antes de la primera línea (intro o volver al inicio)
  }

  _haptic(kind) {
    this.dispatchEvent(new CustomEvent("haptic", { detail: kind, bubbles: true, composed: true }));
  }
}
