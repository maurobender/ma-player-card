import { BackendHolder } from "../../backend/backend.js";
import { OverlayHistory } from "../../components/overlay-history.js";
import { bindSlider, setSlider } from "../../components/slider.js";
import { pickSpeaker } from "../../components/speaker-picker.js";
import { APPLE_RED } from "../../constants.js";
import { hassLanguage, translator } from "../../i18n/index.js";
import { parseLrc } from "../../services/lyrics/lrc-parser.js";
import { fetchLyrics, firstArtist } from "../../services/lyrics/lrclib.js";
import { PlaybackClock } from "../../services/playback-clock.js";
import { TARGET_EVENT, Target } from "../../services/speaker-target.js";
import { listSpeakers, speakerName } from "../../services/speakers.js";
import { fmtTime } from "../../utils/format.js";
import { haptic } from "../../utils/haptic.js";
import { esc } from "../../utils/html.js";
import { nextInstanceId } from "../../utils/ids.js";
import { VERSION } from "../../version.js";
import { MaBrowserCard } from "../browser-card/browser-card.js";
import { STYLES } from "../browser-card/browser-card.styles.js";
import { PLAYER_STYLES } from "./player-card.styles.js";

/*
 * ma-player-card: a mini player on the dashboard that opens "Now playing" full screen,
 * with the queue, synced lyrics and the music browser.
 */

export class MaPlayerCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._id = `ma-player-${nextInstanceId()}`;
    this._view = "art"; // art | queue | lyrics
    this._target = null;
    this._t = translator("en");
    this._sig = "";
    this._trackKey = "";
    this._fav = null;
    this._lyrics = null;
    this._lyricIdx = -1;
    this._backends = new BackendHolder(() => this._hass);
    this._clock = new PlaybackClock((msg) => this._dbg(msg));
    this._onTargetEvent = (e) => {
      if (this._config && e.detail.entity === this._config.entity) {
        this._target = e.detail.target;
        this._sig = "";
        this._update();
      }
    };
  }

  setConfig(config) {
    if (!config || !config.entity) throw new Error("Missing 'entity' (a Music Assistant media_player)");
    this._config = { queue_limit: 50, lyrics: true, lyrics_url: "https://lrclib.net", ...config };
    this._target = Target.load(this._config.entity);
    this._sig = "";
    if (this._browser) this._browser.setConfig(this._browserConfig());
    if (this._rendered) this._render();
  }

  set hass(hass) {
    this._hass = hass;
    const lang = hassLanguage(hass);
    if (lang !== this._lang) {
      this._lang = lang;
      this._t = translator(lang);
      this._rendered = false;
    }
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
    window.addEventListener(TARGET_EVENT, this._onTargetEvent);
    clearInterval(this._timer);
    this._timer = setInterval(() => this._tick(), 500);
  }

  disconnectedCallback() {
    window.removeEventListener(TARGET_EVENT, this._onTargetEvent);
    clearInterval(this._timer);
    clearTimeout(this._queueTimer);
    if (this._npOverlay) this._npOverlay.close();
  }

  _browserConfig() {
    // The embedded browser shares the card's options (media_types, home, speakers…)
    const { type, queue_limit, lyrics, lyrics_url, name, ...rest } = this._config;
    return { ...rest, mode: "overlay" };
  }

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

  _syncClock(st) {
    const a = (st && st.attributes) || {};
    const key = `${this._entity()}|${a.media_title || ""}|${a.media_artist || ""}`;
    const report = st
      ? {
          state: st.state,
          playing: st.state === "playing",
          position: a.media_position,
          updatedAt: a.media_position_updated_at || "",
        }
      : null;
    this._clock.sync(key, report, this._duration(st));
  }

  _dbg(msg) {
    if (!this._config.debug) return;
    const line = `${new Date().toISOString().slice(11, 23)} ${msg}`;
    console.info(`[ma-player-card][debug] ${line}`);
    this._dbgLog = [line, ...(this._dbgLog || [])].slice(0, 10);
  }

  async _dbgPollQueue() {
    // Music Assistant's own elapsed_time, to compare with the card's position
    if (!this._config.debug || !this._np.open || this._dbgBusy) return;
    this._dbgBusy = true;
    const ent = this._entity();
    try {
      const info = await this._backend().queue.info(ent);
      this._dbgQueue = { elapsed: info.elapsed, at: Date.now() };
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
    const { anchor: an, skew, offset } = this._clock.debug;
    const q = this._dbgQueue;
    const ago = (t) => `${((Date.now() - t) / 1000).toFixed(1)}s`;
    el.textContent = [
      `v${VERSION}  backend: ${this._backend().name}  state: ${st ? st.state : "-"}  (optimistic: ${this._optAt ? this._optPlaying : "-"})`,
      `HA media_position: ${a.media_position}  duration: ${a.media_duration}`,
      `HA updated_at: ${a.media_position_updated_at || "-"}`,
      `device clock: ${new Date().toISOString()}`,
      `clock skew: ${skew == null ? "not measured" : `${skew} ms`}   MA offset: ${offset.toFixed(1)}s`,
      `anchor: ${an ? `${an.pos.toFixed(1)}s ${ago(an.at)} ago ${an.playing ? "▶" : "⏸"}` : "-"}`,
      `CARD POSITION: ${pos.toFixed(1)}s`,
      `MA queue elapsed_time: ${q ? (q.error ? `error ${q.error}` : `${q.elapsed}s (${ago(q.at)} ago)`) : "…"}`,
      "— events —",
      ...(this._dbgLog || []),
    ].join("\n");
  }

  _setLocalPosition(pos, playing) {
    this._clock.setLocal(pos, playing);
  }

  _position(st) {
    return st ? this._clock.position(this._duration(st)) : 0;
  }

  _picture(st) {
    const a = (st && st.attributes) || {};
    return a.entity_picture_local || a.entity_picture || "";
  }

  _render() {
    this._rendered = true;
    const t = this._t;
    const accent = this._config.accent_color === "theme" ? "var(--primary-color)" : this._config.accent_color || APPLE_RED;
    this.style.setProperty("--accent", accent);

    this.shadowRoot.innerHTML = `
      <style>${STYLES}${PLAYER_STYLES}</style>
      <ha-card class="mini" id="mini">
        <div class="mini-row">
          <button class="mini-main" id="openNp" aria-label="${t("player.open")}">
            <span class="mini-art" id="miniArt"></span>
            <span class="mini-text"><span class="mini-title" id="miniTitle"></span><span class="mini-sub" id="miniSub"></span></span>
          </button>
          <div class="mini-ctrls">
            <button class="ib prev" data-cmd="prev" aria-label="${t("player.previous")}"><ha-icon icon="mdi:skip-previous"></ha-icon></button>
            <button class="ib play" data-cmd="playpause" aria-label="${t("player.play_pause")}"><ha-icon id="miniPlay" icon="mdi:play"></ha-icon></button>
            <button class="ib next" data-cmd="next" aria-label="${t("player.next")}"><ha-icon icon="mdi:skip-next"></ha-icon></button>
            <button class="ib search" data-cmd="search" aria-label="${t("browser.launcher")}"><ha-icon icon="mdi:magnify"></ha-icon></button>
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
            <button class="np-btn" id="npClose" aria-label="${t("common.close")}"><ha-icon icon="mdi:chevron-down"></ha-icon></button>
            <div class="np-where" id="npWhere"></div>
            <span class="np-top-spacer"></span>
          </div>
          <div class="np-stage" id="npStage" data-view="art">
            <div class="np-art-wrap view-art"><div class="np-art" id="npArt"></div></div>
            <ma-player-queue class="np-list view-queue" id="npQueue"></ma-player-queue>
            <div class="np-lyrics view-lyrics" id="npLyrics"></div>
          </div>
          <div class="np-panel">
            <div class="np-titlerow">
              <div class="np-text"><div class="np-title" id="npTitle"></div><div class="np-artist" id="npArtist"></div></div>
              <button class="np-btn fav" id="npFav" aria-label="${t("player.favorite")}" hidden><ha-icon icon="mdi:heart-outline"></ha-icon></button>
            </div>
            <div class="slider seek" id="npSeek" role="slider" tabindex="0" aria-label="${t("player.position")}"><div class="track"><div class="fill"></div></div></div>
            <div class="np-times"><span id="npElapsed">0:00</span><span id="npRemain">-0:00</span></div>
            <div class="np-ctrls">
              <button class="np-btn small" data-cmd="shuffle" id="npShuffle" aria-label="${t("player.shuffle")}"><ha-icon icon="mdi:shuffle-variant"></ha-icon></button>
              <button class="np-btn big" data-cmd="prev" aria-label="${t("player.previous")}"><ha-icon icon="mdi:skip-previous"></ha-icon></button>
              <button class="np-btn huge" data-cmd="playpause" aria-label="${t("player.play_pause")}"><ha-icon id="npPlay" icon="mdi:play"></ha-icon></button>
              <button class="np-btn big" data-cmd="next" aria-label="${t("player.next")}"><ha-icon icon="mdi:skip-next"></ha-icon></button>
              <button class="np-btn small" data-cmd="repeat" id="npRepeat" aria-label="${t("player.repeat")}"><ha-icon icon="mdi:repeat"></ha-icon></button>
            </div>
            <div class="np-vol">
              <ha-icon icon="mdi:volume-low"></ha-icon>
              <div class="slider vol" id="npVol" role="slider" tabindex="0" aria-label="${t("player.volume")}"><div class="track"><div class="fill"></div></div></div>
              <ha-icon icon="mdi:volume-high"></ha-icon>
            </div>
            <div class="np-bottom">
              ${this._config.lyrics ? `<button class="np-btn tool" data-view="lyrics" aria-label="${t("player.lyrics")}"><ha-icon icon="mdi:message-text-outline"></ha-icon></button>` : `<span class="np-top-spacer"></span>`}
              <button class="np-pill" id="npSpeaker" aria-label="${t("speakers.choose")}"><ha-icon icon="mdi:speaker"></ha-icon><span id="npSpeakerName"></span></button>
              <button class="np-btn tool" data-cmd="search" aria-label="${t("browser.launcher")}"><ha-icon icon="mdi:magnify"></ha-icon></button>
              <button class="np-btn tool" data-view="queue" aria-label="${t("player.queue")}"><ha-icon icon="mdi:playlist-music"></ha-icon></button>
            </div>
          </div>
        </div>
      </dialog>

      <ma-browser-card id="browser"></ma-browser-card>
      <!-- Shown over "Now playing", which is always dark -->
      <ma-player-action-sheet id="sheet" dark></ma-player-action-sheet>
      <ma-player-toast id="toast" dark></ma-player-toast>`;

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
    this._npOverlay = new OverlayHistory(this._np, `${this._id}:np`);
    this._sheet = $("sheet");
    this._toast = $("toast");
    this._els.queue.addEventListener("queue-info", (e) => this._onQueueInfo(e.detail));
    this._els.queue.addEventListener("toast", (e) => this._toast.show(e.detail));

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
      else this._browser.open();
    });
    $("npClose").addEventListener("click", () => this._np.close());
    $("npSpeaker").addEventListener("click", () => this._openSpeakers());
    this._els.fav.addEventListener("click", () => this._favorite());

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
        this._run("media_seek", (p, e) => p.seek(e, Math.round(pos * 10) / 10));
        this._tick();
      },
    });
    let volTimer = null;
    const sendVol = (r) => this._run("volume_set", (p, e) => p.setVolume(e, Math.round(r * 100) / 100));
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

    // Tapping a lyric line seeks to it; scrolling by hand pauses the auto-scroll for a while
    this._els.lyrics.addEventListener("click", (e) => {
      const line = e.target.closest(".ly-line");
      if (!line) return;
      const pos = Number(line.dataset.t);
      this._setLocalPosition(pos, this._isPlaying(this._state()));
      this._lyUserAt = 0;
      this._run("media_seek", (p, e) => p.seek(e, pos));
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
    this._syncClock(st); // even when nothing visible changed
    const playing = this._isPlaying(st);
    const pic = this._picture(st);
    const name = speakerName(this._hass, this._entity());
    Object.assign(this._els.queue, {
      backend: this._backend(),
      entity: this._entity(),
      limit: Number(this._config.queue_limit) || 50,
      language: hassLanguage(this._hass),
    });
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
    const t = this._t;
    const has = !!(st && a.media_title);
    const unavailable = !st || st.state === "unavailable";
    if (this._browser) this._browser.setArtwork(has ? pic || "" : null);

    e.mini.classList.toggle("idle", !has);
    this._setArt(e.miniArt, has ? pic : "", "mdi:music");
    e.miniTitle.textContent = has ? a.media_title : t(unavailable ? "player.unavailable" : "player.nothing_playing");
    e.miniSub.textContent = has
      ? [a.media_artist, a.media_album_name].filter(Boolean).join(" · ")
      : t("player.tap_to_search", { name });
    e.miniPlay.setAttribute("icon", playing ? "mdi:pause" : "mdi:play");

    e.bg.style.backgroundImage = pic ? `url("${pic.replace(/"/g, "%22")}")` : "";
    this._setArt(e.art, pic, "mdi:music");
    e.art.classList.toggle("paused", !playing);
    e.title.textContent = has ? a.media_title : t("player.nothing_playing");
    e.artist.textContent = has ? [a.media_artist, a.media_album_name].filter(Boolean).join(" — ") : "";
    e.where.textContent = t("common.playing_on", { name });
    e.speakerName.textContent = name;
    e.play.setAttribute("icon", playing ? "mdi:pause" : "mdi:play");
    e.shuffle.classList.toggle("on", !!a.shuffle);
    const rep = a.repeat || "off";
    e.repeat.classList.toggle("on", rep !== "off");
    e.repeat
      .querySelector("ha-icon")
      .setAttribute("icon", rep === "one" ? "mdi:repeat-once" : rep === "all" ? "mdi:repeat" : "mdi:repeat-off");
    if (!this._vol || Date.now() - this._vol.at > 2000) setSlider(e.vol, Number(a.volume_level) || 0);

    const key = `${this._entity()}|${a.media_title || ""}|${a.media_artist || ""}`;
    if (key !== this._trackKey) {
      this._trackKey = key;
      this._fav = null;
      this._lyrics = null;
      this._lyricIdx = -1;
      this._lyUserAt = 0;
      this._els.lyrics.scrollTop = 0;
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

  _openNp() {
    if (!this._npOverlay.open()) return;
    this._haptic("light");
    this._sig = "";
    this._update();
    this._refreshNp();
  }

  async _openSpeakers() {
    const ids = listSpeakers(this._hass, this._config.entity, this._config.speakers);
    const id = await pickSpeaker(this._sheet, this._hass, ids, this._entity(), this._t);
    if (!id) return;
    // Every card for this entity updates through _onTargetEvent, this one included
    Target.save(this._config.entity, id === this._config.entity ? null : id);
    this._haptic("selection");
  }

  _refreshNp() {
    // Delayed: a player usually sends several state changes in a row
    clearTimeout(this._queueTimer);
    this._queueTimer = setTimeout(() => this._els.queue.refresh(this._view === "queue"), 400);
    if (this._view === "lyrics") this._loadLyrics();
  }

  _setView(view) {
    this._view = view;
    this._els.stage.dataset.view = view;
    for (const b of this.shadowRoot.querySelectorAll(".np-btn.tool[data-view]"))
      b.classList.toggle("on", b.dataset.view === view);
    if (view === "queue") this._els.queue.refresh(true);
    if (view === "lyrics") {
      this._lyricIdx = -1;
      this._lyUserAt = 0;
      if (!this._lyrics) this._loadLyrics();
      else this._renderLyrics();
    }
    this._haptic("selection");
  }

  /** Player commands only log their errors: the state update shows whether they worked. */
  _run(label, fn) {
    return fn(this._backend().player, this._entity()).catch((err) => console.error(`[ma-player-card] ${label}`, err));
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
        return this._run("media_play_pause", (p, e) => p.playPause(e));
      case "prev":
        return this._run("media_previous_track", (p, e) => p.previous(e));
      case "next":
        return this._run("media_next_track", (p, e) => p.next(e));
      case "shuffle":
        return this._run("shuffle_set", (p, e) => p.setShuffle(e, !a.shuffle));
      case "repeat": {
        const order = ["off", "all", "one"];
        const next = order[(order.indexOf(a.repeat || "off") + 1) % order.length];
        return this._run("repeat_set", (p, e) => p.setRepeat(e, next));
      }
      case "search":
        return this._browser.open();
      default:
        return undefined;
    }
  }

  _backend() {
    return this._backends.get({
      mode: this._config.backend || "auto",
      entity: this._config.entity,
      configEntryId: this._config.config_entry_id,
    });
  }

  _renderFav() {
    const st = this._state();
    const show = !!(this._backend().favorites.canFavorite(this._entity()) && st && st.attributes.media_title);
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
      this._showToast(item, this._t("player.already_favorite"), "mdi:heart");
      return;
    }
    this._fav = !remove;
    this._favAt = Date.now(); // the queue reports the old value for a few seconds
    this._renderFav();
    this._haptic(remove ? "light" : "success");
    try {
      if (remove) await be.favorites.unfavorite(ent);
      else await be.favorites.favorite(ent);
      this._showToast(
        item,
        this._t(remove ? "player.unfavorited" : "player.favorited"),
        remove ? "mdi:heart-broken" : "mdi:heart",
      );
    } catch (err) {
      this._fav = remove;
      this._renderFav();
      const error = (err && err.message) || String(err);
      this._showToast(
        item,
        this._t(remove ? "player.unfavorite_failed" : "player.favorite_failed", { error }),
        "mdi:alert-circle",
        true,
      );
    }
  }

  _onQueueInfo(info) {
    const recentLocal = this._favAt && Date.now() - this._favAt < 6000;
    if (info.current && !recentLocal) this._fav = !!info.current.favorite;
    this._renderFav();
  }

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
      console.warn("[ma-player-card] lyrics", err);
      lyrics = { status: "error" };
    }
    if (key !== this._trackKey) return;
    this._lyrics = lyrics;
    this._lyricIdx = -1;
    this._renderLyrics();
  }

  _renderLyrics() {
    const el = this._els.lyrics;
    const t = this._t;
    const l = this._lyrics || { status: "loading" };
    const a = (this._state() || { attributes: {} }).attributes;
    const searchUrl = `https://lrclib.net/search/${encodeURIComponent(`${a.media_title || ""} ${firstArtist(a.media_artist)}`.trim())}`;
    const msg = {
      loading: esc(t("lyrics.loading")),
      none: `${esc(t("lyrics.none"))}<br><a class="ly-link" href="${esc(searchUrl)}" target="_blank" rel="noopener">${esc(t("lyrics.search"))}</a>`,
      instrumental: esc(t("lyrics.instrumental")),
      error: esc(t("lyrics.error")),
    }[l.status];
    if (msg) {
      el.innerHTML = `<div class="np-msg">${msg}</div>`;
      return;
    }
    if (l.status === "plain") {
      el.innerHTML = `<div class="ly-plain">${esc(l.text)}</div><div class="ly-note">${esc(t("lyrics.unsynced"))}</div>`;
      return;
    }
    el.innerHTML = `<div class="ly-pad"></div>${l.lines
      .map((x, i) => `<p class="ly-line" data-i="${i}" data-t="${x.t}">${x.text ? esc(x.text) : "♪"}</p>`)
      .join("")}<div class="ly-note">${esc(t("lyrics.credit"))}</div><div class="ly-pad"></div>`;
    this._lyricIdx = -1;
    this._syncLyrics(this._position(this._state()));
  }

  // Seconds the lyrics run ahead of the audio (lyrics_offset); lines read better slightly early.
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
    if (this._lyUserAt && Date.now() - this._lyUserAt < 4000) return;
    const active = el.querySelector(".ly-line.active");
    if (active) el.scrollTo({ top: active.offsetTop - el.clientHeight * 0.32, behavior: "smooth" });
    else el.scrollTo({ top: 0, behavior: "smooth" }); // before the first line
  }

  _showToast(it, text, icon, error = false) {
    this._toast.show({ title: it.name, image: it.image, text, icon, error });
  }

  _haptic(kind) {
    haptic(this, kind);
  }
}
