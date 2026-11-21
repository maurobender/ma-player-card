/* ma-player-card v0.5.1 — built from src/ with `npm run build`. Do not edit by hand. */

// src/backend/types.ts
var UnsupportedError = class extends Error {
};

// src/backend/native/favorites.ts
var NativeFavorites = class {
  constructor(hass) {
    this.hass = hass;
  }
  hass;
  canUnfavorite = false;
  button(entity) {
    const ents = this.hass().entities || {};
    const me = ents[entity];
    if (!me || !me.device_id) return null;
    const btn = Object.values(ents).find(
      (x2) => !!x2 && x2.device_id === me.device_id && x2.entity_id.startsWith("button.") && (x2.translation_key === "favorite_now_playing" || /favorit/.test(x2.entity_id))
    );
    return btn ? btn.entity_id : null;
  }
  canFavorite(entity) {
    return !!this.button(entity);
  }
  async favorite(entity) {
    const btn = this.button(entity);
    if (!btn) throw new Error("Music Assistant favorite button not found");
    await this.hass().callService("button", "press", { entity_id: btn });
  }
  async unfavorite(_entity) {
    throw new UnsupportedError("The official integration cannot remove favorites");
  }
};

// src/backend/mass-queue/favorites.ts
var MassQueueFavorites = class extends NativeFavorites {
  canUnfavorite = true;
  /** Even without the button, a favorite can still be removed. */
  canFavorite(_entity) {
    return true;
  }
  async unfavorite(entity) {
    await this.hass().callService("mass_queue", "unfavorite_current_item", { entity });
  }
};

// src/backend/call.ts
async function callWithResponse(hass, domain, service, data, entity) {
  const r4 = await hass.callWS({
    type: "call_service",
    domain,
    service,
    service_data: data,
    ...entity ? { target: { entity_id: entity } } : {},
    return_response: true
  });
  return r4 && r4.response || r4 || {};
}
function forEntity(response, entity) {
  return response[entity] ?? response;
}
var errorMessage = (err) => {
  if (err && typeof err === "object") {
    const e5 = err;
    if (e5.message || e5.code) return String(e5.message || e5.code);
  }
  return String(err);
};

// src/backend/mass-queue/queue.ts
function fromMassQueue(x2) {
  return {
    id: x2.queue_item_id,
    name: x2.media_title || "",
    artist: x2.media_artist || "",
    album: x2.media_album_name || "",
    image: x2.media_image || (x2.local_image_encoded ? `data:image/jpeg;base64,${x2.local_image_encoded}` : ""),
    duration: 0,
    favorite: x2.favorite
  };
}
function moveSteps(from, to) {
  if (from === to) return [];
  if (to === 0) return ["next"];
  return Array(Math.abs(to - from)).fill(to < from ? "up" : "down");
}
var MassQueueQueue = class {
  constructor(hass, native) {
    this.hass = hass;
    this.native = native;
  }
  hass;
  native;
  can = { reorder: true, remove: true, playItem: true };
  partial = false;
  async call(service, data) {
    await this.hass().callService("mass_queue", service, data);
  }
  info(entity) {
    return this.native.info(entity);
  }
  async items(entity, info, limit) {
    if (info.total <= info.idx + 1) return [];
    const r4 = await callWithResponse(this.hass(), "mass_queue", "get_queue_items", {
      entity,
      offset: info.idx + 1,
      limit
    });
    const list = forEntity(r4, entity);
    return Array.isArray(list) ? list.map(fromMassQueue) : [];
  }
  async moveTo(entity, id, from, to) {
    for (const dir of moveSteps(from, to)) await this.call(`move_queue_item_${dir}`, { entity, queue_item_id: id });
  }
  remove(entity, id) {
    return this.call("remove_queue_item", { entity, queue_item_id: id });
  }
  play(entity, id) {
    return this.call("play_queue_item", { entity, queue_item_id: id });
  }
};

// src/constants.ts
var TYPES = {
  track: { key: "tracks", icon: "mdi:music-note", enqueue: "play", list: true },
  artist: { key: "artists", icon: "mdi:account-music", enqueue: "replace", round: true },
  album: { key: "albums", icon: "mdi:album", enqueue: "replace" },
  playlist: { key: "playlists", icon: "mdi:playlist-music", enqueue: "replace" },
  radio: { key: "radio", icon: "mdi:radio", enqueue: "replace", noQueue: true },
  podcast: { key: "podcasts", icon: "mdi:podcast", enqueue: "replace" },
  audiobook: { key: "audiobooks", icon: "mdi:book-music", enqueue: "replace" }
};
var DEFAULT_TYPES = ["track", "artist", "album", "playlist", "radio"];
var DEFAULT_HOME = [
  { titleKey: "home.recent", media_type: "album", order_by: "last_played_desc" },
  { titleKey: "home.playlists", media_type: "playlist", favorite: true, order_by: "favorite_timestamp_desc" },
  { titleKey: "home.artists", media_type: "artist", favorite: true, order_by: "favorite_timestamp_desc" },
  { titleKey: "home.albums", media_type: "album", favorite: true, order_by: "favorite_timestamp_desc" },
  { titleKey: "home.radio", media_type: "radio", favorite: true, order_by: "favorite_timestamp_desc" }
];
var HOME_TTL_MS = 5 * 60 * 1e3;
var APPLE_RED = "#fa2d48";
var DEBOUNCE_MS = 350;
var LONG_PRESS_MS = 500;
var MIN_QUERY = 2;
var MIN_TILE_PX = 110;
var AUTO_TILE_PX = 170;
var LIST_COL_PX = 340;

// src/backend/native/library.ts
var entryIds = /* @__PURE__ */ new Map();
var NativeLibrary = class {
  constructor(hass, entity, configEntryId) {
    this.hass = hass;
    this.entity = entity;
    this.configEntryId = configEntryId;
  }
  hass;
  entity;
  configEntryId;
  async search(query, type, { limit, libraryOnly }) {
    const data = await callWithResponse(this.hass(), "music_assistant", "search", {
      config_entry_id: await this.entryId(),
      name: query,
      media_type: type,
      limit,
      library_only: !!libraryOnly
    });
    return data[TYPES[type].key] || data[type] || data[`${type}s`] || [];
  }
  async getLibrary({ mediaType, limit, favorite, orderBy }) {
    const data = await callWithResponse(this.hass(), "music_assistant", "get_library", {
      config_entry_id: await this.entryId(),
      media_type: mediaType,
      limit,
      ...favorite ? { favorite: true } : {},
      ...orderBy ? { order_by: orderBy } : {}
    });
    return data.items || [];
  }
  async play(entity, item, enqueue) {
    await this.hass().callWS({
      type: "call_service",
      domain: "music_assistant",
      service: "play_media",
      service_data: { media_id: item.uri, media_type: item.mediaType, enqueue },
      target: { entity_id: entity }
    });
  }
  /** The entity's integration entry, or the first loaded one when that can't be read (non-admin users). */
  entryId() {
    if (this.configEntryId) return Promise.resolve(this.configEntryId);
    let p4 = entryIds.get(this.entity);
    if (!p4) {
      p4 = this.lookupEntryId();
      entryIds.set(this.entity, p4);
      p4.catch(() => entryIds.delete(this.entity));
    }
    return p4;
  }
  async lookupEntryId() {
    const hass = this.hass();
    try {
      const ent = await hass.callWS({
        type: "config/entity_registry/get",
        entity_id: this.entity
      });
      if (ent && ent.platform === "music_assistant" && ent.config_entry_id) return ent.config_entry_id;
    } catch (_2) {
    }
    const entries = await hass.callWS({
      type: "config_entries/get",
      domain: "music_assistant"
    });
    const e5 = entries.find((x2) => x2.state === "loaded") || entries[0];
    if (!e5) throw new Error("Music Assistant integration not found");
    return e5.entry_id;
  }
};

// src/backend/native/player.ts
var HaPlayer = class {
  constructor(hass) {
    this.hass = hass;
  }
  hass;
  async call(entity, service, data = {}) {
    await this.hass().callService("media_player", service, { entity_id: entity, ...data });
  }
  playPause(entity) {
    return this.call(entity, "media_play_pause");
  }
  previous(entity) {
    return this.call(entity, "media_previous_track");
  }
  next(entity) {
    return this.call(entity, "media_next_track");
  }
  seek(entity, seconds) {
    return this.call(entity, "media_seek", { seek_position: seconds });
  }
  setVolume(entity, level) {
    return this.call(entity, "volume_set", { volume_level: level });
  }
  setShuffle(entity, shuffle) {
    return this.call(entity, "shuffle_set", { shuffle });
  }
  setRepeat(entity, repeat) {
    return this.call(entity, "repeat_set", { repeat });
  }
};

// src/utils/format.ts
var names = (list) => Array.isArray(list) ? list.map((a3) => a3?.name).filter(Boolean).join(", ") : "";
var fmtTime = (secs) => {
  let s5 = Number.isFinite(secs) && secs > 0 ? Math.floor(secs) : 0;
  const h4 = Math.floor(s5 / 3600);
  const m3 = Math.floor(s5 % 3600 / 60);
  s5 %= 60;
  const pad = (n4) => String(n4).padStart(2, "0");
  return h4 ? `${h4}:${pad(m3)}:${pad(s5)}` : `${m3}:${pad(s5)}`;
};

// src/backend/native/queue.ts
function fromNative(qi) {
  if (!qi) return null;
  const mi = qi.media_item || {};
  return {
    id: qi.queue_item_id,
    name: mi.name || qi.name || "",
    artist: names(mi.artists),
    album: mi.album?.name || "",
    image: mi.image || "",
    duration: qi.duration || 0,
    favorite: mi.favorite
  };
}
var NativeQueue = class {
  constructor(hass) {
    this.hass = hass;
  }
  hass;
  can = { reorder: false, remove: false, playItem: false };
  /** Whether get_queue accepts offset/limit (Home Assistant from November 2026); undefined until tried. */
  itemsSupported;
  get partial() {
    return this.itemsSupported === false;
  }
  async getQueue(entity, data = {}) {
    const r4 = await callWithResponse(this.hass(), "music_assistant", "get_queue", data, entity);
    return forEntity(r4, entity);
  }
  async info(entity) {
    const q = await this.getQueue(entity);
    return {
      current: fromNative(q.current_item),
      next: fromNative(q.next_item),
      idx: q.current_index == null ? -1 : q.current_index,
      total: q.items || 0,
      elapsed: q.elapsed_time
    };
  }
  async items(entity, info, limit) {
    if (info.total <= info.idx + 1) return [];
    if (this.itemsSupported !== false) {
      try {
        const more = await this.getQueue(entity, { offset: info.idx + 1, limit });
        this.itemsSupported = true;
        return (more.queue_items || []).map(fromNative).filter((x2) => !!x2);
      } catch (err) {
        if (!/not a valid option|extra keys/i.test(errorMessage(err))) throw err;
        this.itemsSupported = false;
      }
    }
    return info.next ? [info.next] : [];
  }
  async moveTo() {
    throw new UnsupportedError("The official integration cannot reorder the queue");
  }
  async remove() {
    throw new UnsupportedError("The official integration cannot remove songs from the queue");
  }
  async play() {
    throw new UnsupportedError("The official integration cannot jump to a song in the queue");
  }
};

// src/backend/backend.ts
function resolveBackendName(hass, mode = "auto") {
  if (mode === "mass_queue") return "mass_queue";
  if (mode === "auto" && hass?.services?.mass_queue) return "mass_queue";
  return "native";
}
function createBackend(hass, name, options) {
  const nativeQueue = new NativeQueue(hass);
  const queue = name === "mass_queue" ? new MassQueueQueue(hass, nativeQueue) : nativeQueue;
  const favorites = name === "mass_queue" ? new MassQueueFavorites(hass) : new NativeFavorites(hass);
  return {
    name,
    can: { ...queue.can, unfavorite: favorites.canUnfavorite },
    library: new NativeLibrary(hass, options.entity, options.configEntryId),
    queue,
    favorites,
    player: new HaPlayer(hass)
  };
}
var BackendHolder = class {
  constructor(hass) {
    this.hass = hass;
  }
  hass;
  current = null;
  get(options) {
    const name = resolveBackendName(this.hass(), options.mode);
    const key = `${name}|${options.entity}|${options.configEntryId || ""}`;
    if (this.current?.key !== key) this.current = { key, backend: createBackend(this.hass, name, options) };
    return this.current.backend;
  }
};

// src/components/overlay-history.ts
var OverlayHistory = class {
  dialog;
  key;
  pushed = false;
  constructor(dialog, id) {
    this.dialog = dialog;
    this.key = `ma:${id}`;
    dialog.addEventListener("close", this.onClose);
  }
  get isOpen() {
    return this.dialog.open;
  }
  open() {
    if (this.dialog.open) return false;
    this.dialog.showModal();
    history.pushState({ ...history.state || {}, [this.key]: true }, "");
    this.pushed = true;
    window.addEventListener("popstate", this.onPopState);
    return true;
  }
  close() {
    if (this.dialog.open) this.dialog.close();
  }
  onClose = () => {
    window.removeEventListener("popstate", this.onPopState);
    if (this.pushed) {
      this.pushed = false;
      history.back();
    }
  };
  onPopState = () => {
    if (this.dialog.open && !history.state?.[this.key]) {
      this.pushed = false;
      this.dialog.close();
    }
  };
};

// src/i18n/en.ts
var en = {
  "common.cancel": "Cancel",
  "common.close": "Close",
  "common.retry": "Retry",
  "common.error_title": "Something went wrong",
  "common.playing": "Playing",
  "common.playing_on": "Playing on {name}",
  "type.track": "Songs",
  "type.artist": "Artists",
  "type.album": "Albums",
  "type.playlist": "Playlists",
  "type.radio": "Radio",
  "type.podcast": "Podcasts",
  "type.audiobook": "Audiobooks",
  "state.playing": "Playing",
  "state.paused": "Paused",
  "state.idle": "Idle",
  "state.on": "On",
  "state.off": "Off",
  "state.standby": "Standby",
  "state.buffering": "Buffering",
  "state.unavailable": "Unavailable",
  "home.recent": "Recently played",
  "home.playlists": "Your playlists",
  "home.artists": "Favorite artists",
  "home.albums": "Favorite albums",
  "home.radio": "Favorite radio",
  "speakers.title": "Play on",
  "speakers.choose": "Choose speaker",
  "speakers.unavailable": "Unavailable ({n})",
  "browser.title": "Search",
  "browser.launcher": "Search music",
  "browser.on_speaker": "on {name}",
  "browser.placeholder": "Artists, songs, albums…",
  "browser.clear": "Clear search",
  "browser.more": "More options",
  "browser.no_results": "No results",
  "browser.no_results_text": "No {types} found for “{query}”.",
  "browser.hint_title": "What do you want to listen to?",
  "browser.hint_text": "Search for songs, artists, albums, playlists or radio.",
  "browser.home_error": "Couldn't load your library",
  "browser.play_now": "Play now",
  "browser.play_next": "Play next",
  "browser.add_to_queue": "Add to queue",
  "browser.queued_next": "Plays next",
  "browser.queued": "Added to queue",
  "browser.play_failed": "Couldn't play: {error}",
  "player.open": "Open player",
  "player.previous": "Previous",
  "player.next": "Next",
  "player.play_pause": "Play or pause",
  "player.position": "Position",
  "player.shuffle": "Shuffle",
  "player.repeat": "Repeat",
  "player.volume": "Volume",
  "player.lyrics": "Lyrics",
  "player.queue": "Queue",
  "player.nothing_playing": "Nothing playing",
  "player.unavailable": "Speaker unavailable",
  "player.tap_to_search": "{name} · tap to search for music",
  "player.favorite": "Add to favorites",
  "player.favorited": "Added to favorites",
  "player.unfavorited": "Removed from favorites",
  "player.already_favorite": "Already a favorite · remove it in Music Assistant",
  "player.favorite_failed": "Couldn't add: {error}",
  "player.unfavorite_failed": "Couldn't remove: {error}",
  "lyrics.loading": "Looking for lyrics…",
  "lyrics.none": "No lyrics found for this song on LRCLIB.",
  "lyrics.search": "Search on lrclib.net",
  "lyrics.instrumental": "♪ Instrumental ♪",
  "lyrics.error": "Couldn't reach the lyrics service.",
  "lyrics.credit": "Lyrics: LRCLIB",
  "lyrics.unsynced": "Unsynced lyrics · LRCLIB",
  "queue.loading": "Loading the queue…",
  "queue.empty": "The queue is empty.",
  "queue.error": "Couldn't load the queue.",
  "queue.now_playing": "Now playing",
  "queue.up_next": "Up next",
  "queue.songs": "{n} songs",
  "queue.no_more": "No more songs in the queue.",
  "queue.and_more": "and {n} more…",
  "queue.partial": "Your Home Assistant version only reports the next song. The full list comes with a newer version of the integration, or by installing mass_queue.",
  "queue.hint": "Tap a song to play it · drag ≡ to move it.",
  "queue.remove": "Remove from queue",
  "queue.drag": "Drag to move",
  "queue.move": "Move song"
};

// src/i18n/es.ts
var es = {
  "common.cancel": "Cancelar",
  "common.close": "Cerrar",
  "common.retry": "Reintentar",
  "common.error_title": "Algo salió mal",
  "common.playing": "Reproduciendo",
  "common.playing_on": "Reproduciendo en {name}",
  "type.track": "Canciones",
  "type.artist": "Artistas",
  "type.album": "Álbumes",
  "type.playlist": "Playlists",
  "type.radio": "Radios",
  "type.podcast": "Podcasts",
  "type.audiobook": "Audiolibros",
  "state.playing": "Reproduciendo",
  "state.paused": "En pausa",
  "state.idle": "Inactivo",
  "state.on": "Encendido",
  "state.off": "Apagado",
  "state.standby": "En espera",
  "state.buffering": "Cargando",
  "state.unavailable": "No disponible",
  "home.recent": "Escuchado recientemente",
  "home.playlists": "Tus playlists",
  "home.artists": "Artistas favoritos",
  "home.albums": "Álbumes favoritos",
  "home.radio": "Radios favoritas",
  "speakers.title": "Reproducir en",
  "speakers.choose": "Elegir parlante",
  "speakers.unavailable": "No disponibles ({n})",
  "browser.title": "Buscar",
  "browser.launcher": "Buscar música",
  "browser.on_speaker": "en {name}",
  "browser.placeholder": "Artistas, canciones, álbumes…",
  "browser.clear": "Borrar búsqueda",
  "browser.more": "Más opciones",
  "browser.no_results": "Sin resultados",
  "browser.no_results_text": "No encontré {types} para «{query}».",
  "browser.hint_title": "¿Qué querés escuchar?",
  "browser.hint_text": "Buscá canciones, artistas, álbumes, playlists o radios.",
  "browser.home_error": "No pude cargar tu biblioteca",
  "browser.play_now": "Reproducir ahora",
  "browser.play_next": "Reproducir a continuación",
  "browser.add_to_queue": "Agregar a la cola",
  "browser.queued_next": "Suena a continuación",
  "browser.queued": "Agregado a la cola",
  "browser.play_failed": "No se pudo reproducir: {error}",
  "player.open": "Abrir reproductor",
  "player.previous": "Anterior",
  "player.next": "Siguiente",
  "player.play_pause": "Reproducir o pausar",
  "player.position": "Posición",
  "player.shuffle": "Aleatorio",
  "player.repeat": "Repetir",
  "player.volume": "Volumen",
  "player.lyrics": "Letra",
  "player.queue": "Cola",
  "player.nothing_playing": "Nada sonando",
  "player.unavailable": "Parlante no disponible",
  "player.tap_to_search": "{name} · tocá para buscar música",
  "player.favorite": "Agregar a favoritos",
  "player.favorited": "Agregada a favoritos",
  "player.unfavorited": "Quitada de favoritos",
  "player.already_favorite": "Ya es favorita · para quitarla, usá Music Assistant",
  "player.favorite_failed": "No se pudo agregar: {error}",
  "player.unfavorite_failed": "No se pudo quitar: {error}",
  "lyrics.loading": "Buscando la letra…",
  "lyrics.none": "No encontré la letra de esta canción en LRCLIB.",
  "lyrics.search": "Buscar en lrclib.net",
  "lyrics.instrumental": "♪ Instrumental ♪",
  "lyrics.error": "No pude conectar con el servicio de letras.",
  "lyrics.credit": "Letra: LRCLIB",
  "lyrics.unsynced": "Letra sin sincronizar · LRCLIB",
  "queue.loading": "Cargando la cola…",
  "queue.empty": "No hay nada en la cola.",
  "queue.error": "No pude cargar la cola.",
  "queue.now_playing": "Reproduciendo",
  "queue.up_next": "A continuación",
  "queue.songs": "{n} canciones",
  "queue.no_more": "No hay más canciones en la cola.",
  "queue.and_more": "y {n} más…",
  "queue.partial": "Tu versión de Home Assistant solo informa la próxima canción. La lista completa llega con una versión más nueva de la integración, o instalando mass_queue.",
  "queue.hint": "Tocá una canción para escucharla · arrastrá ≡ para moverla.",
  "queue.remove": "Quitar de la cola",
  "queue.drag": "Arrastrar para mover",
  "queue.move": "Mover canción"
};

// src/i18n/index.ts
var LANGUAGES = { en, es };
var hassLanguage = (hass) => hass?.locale?.language || hass?.language || "en";
function translator(language) {
  const strings = LANGUAGES[language] || LANGUAGES[language.split("-")[0]] || en;
  return (key, vars) => {
    const text = strings[key] ?? en[key];
    return vars ? text.replace(/\{(\w+)\}/g, (match, name) => name in vars ? String(vars[name]) : match) : text;
  };
}
var STATES = ["playing", "paused", "idle", "on", "off", "standby", "buffering", "unavailable"];
var stateLabel = (t5, state) => STATES.includes(state) ? t5(`state.${state}`) : state;

// src/services/speakers.ts
function listSpeakers(hass, entity, configured) {
  if (!hass) return [];
  const list = configured ? [...configured] : Object.keys(hass.entities || {}).filter(
    (id) => id.startsWith("media_player.") && hass.entities?.[id]?.platform === "music_assistant" && !hass.entities[id].hidden
  );
  if (!list.includes(entity)) list.unshift(entity);
  return list.filter((id) => hass.states[id]);
}
function speakerName(hass, entityId) {
  if (!entityId) return "";
  const st = hass?.states[entityId];
  return st?.attributes.friendly_name || entityId;
}

// src/components/speaker-picker.ts
function speakerSheet(hass, ids, current, t5) {
  const choice = (id) => {
    const st = hass.states[id];
    const state = st?.state ?? "unavailable";
    const a3 = st?.attributes ?? {};
    const playing = state === "playing";
    return {
      key: id,
      label: speakerName(hass, id),
      sublabel: playing && a3.media_title ? `${a3.media_title}${a3.media_artist ? ` · ${a3.media_artist}` : ""}` : stateLabel(t5, state),
      icon: playing ? "mdi:speaker-wireless" : "mdi:speaker",
      active: playing,
      selected: id === current,
      disabled: state === "unavailable"
    };
  };
  const isOff = (id) => hass.states[id]?.state === "unavailable" && id !== current;
  const off = ids.filter(isOff);
  return {
    header: { title: t5("speakers.title") },
    choices: ids.filter((id) => !isOff(id)).map(choice),
    more: off.length ? { label: t5("speakers.unavailable", { n: off.length }), choices: off.map(choice) } : void 0,
    cancelLabel: t5("common.cancel")
  };
}
function pickSpeaker(sheet, hass, ids, current, t5) {
  return sheet.show(speakerSheet(hass, ids, current, t5));
}

// src/services/speaker-target.ts
var TARGET_EVENT = "ma-player-card-target";
var Target = {
  key: (entity) => `ma-browser-card.target.${entity}`,
  load(entity) {
    try {
      return localStorage.getItem(this.key(entity)) || null;
    } catch (_2) {
      return null;
    }
  },
  save(entity, target) {
    try {
      if (target) localStorage.setItem(this.key(entity), target);
      else localStorage.removeItem(this.key(entity));
    } catch (_2) {
    }
    window.dispatchEvent(new CustomEvent(TARGET_EVENT, { detail: { entity, target } }));
  }
};

// src/utils/haptic.ts
var haptic = (el, kind) => {
  el.dispatchEvent(new CustomEvent("haptic", { detail: kind, bubbles: true, composed: true }));
};

// src/utils/html.ts
var ENTITIES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
var esc = (s5) => String(s5 ?? "").replace(/[&<>"']/g, (c5) => ENTITIES[c5] ?? c5);

// src/utils/ids.ts
var counter = 0;
var nextInstanceId = () => ++counter;

// src/components/theme.ts
var BASE_VARS = `
  --fill: color-mix(in srgb, var(--primary-text-color) 7%, transparent);
  --fill-strong: color-mix(in srgb, var(--primary-text-color) 12%, transparent);
  --sep: color-mix(in srgb, var(--primary-text-color) 12%, transparent);
  --glass: color-mix(in srgb, var(--card-background-color, #fff) 72%, transparent);
  --glass-bg: color-mix(in srgb, var(--primary-background-color, #f2f2f7) 80%, transparent);
  --blur: blur(30px) saturate(180%);
`;
var DARK_VARS = `
  --primary-text-color: #fff;
  --secondary-text-color: rgba(255, 255, 255, .62);
  --primary-background-color: #1c1c1e;
  --card-background-color: #2c2c2e;
  --glass: color-mix(in srgb, #2c2c2e 72%, transparent);
  --glass-bg: rgba(28, 28, 30, .2);
  --fill: rgba(255, 255, 255, .1);
  --fill-strong: rgba(255, 255, 255, .16);
  --sep: rgba(255, 255, 255, .14);
  color-scheme: dark;
`;

// src/cards/browser-card/browser-card.styles.js
var STYLES = `
  :host {
    display: block;
    --accent: ${APPLE_RED};
    ${BASE_VARS}
    --art-radius: 10px;
  }

  /* Compact mode: the launcher button on the dashboard */
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

  /* Full screen */
  dialog.full { position: fixed; inset: 0; width: 100vw; height: 100vh; height: 100dvh;
    max-width: none; max-height: none; margin: 0; padding: 0; border: 0;
    background: var(--glass-bg); -webkit-backdrop-filter: var(--blur); backdrop-filter: var(--blur);
    color: var(--primary-text-color); overflow: hidden; }
  dialog.full::backdrop { background: transparent; }

  /* While something plays: the same blurred-artwork background as "Now playing" */
  :host([artwork]) {
    ${DARK_VARS}
  }
  :host([artwork]) dialog.full { background: #1c1c1e; }
  .full-bg, .full-shade { display: none; position: absolute; pointer-events: none; }
  :host([artwork]) .full-bg { display: block; inset: -15%; background: #2c2c2e center / cover no-repeat;
    filter: blur(70px) saturate(1.6) brightness(.8); transform: translateZ(0); }
  :host([artwork]) .full-shade { display: block; inset: 0; background: linear-gradient(180deg, rgba(0, 0, 0, .25), rgba(0, 0, 0, .55)); }
  .wrap.is-full { position: relative; }
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

  /* Search field */
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

  /* Media type tabs */
  .tabs { display: flex; gap: 8px; margin-top: 12px; overflow-x: auto; scrollbar-width: none; }
  .tabs::-webkit-scrollbar { display: none; }
  .tab { flex: 0 0 auto; height: 36px; padding: 0 16px; border-radius: 999px; border: 0; cursor: pointer;
    font: inherit; font-size: 15px; font-weight: 500; background: var(--fill); color: var(--primary-text-color);
    -webkit-tap-highlight-color: transparent; transition: background .2s, color .2s; }
  .tab[aria-selected="true"] { background: var(--accent); color: #fff; font-weight: 600; }

  /* Grid (artists, albums, playlists, radio) */
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

  /* Home shelves (horizontal scroll) */
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

  /* List (songs) */
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

  /* Play feedback over the artwork */
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

  /* Loading skeleton */
  .skel .art, .skel .line { background: linear-gradient(90deg, var(--fill) 25%, var(--fill-strong) 50%, var(--fill) 75%);
    background-size: 200% 100%; animation: shimmer 1.2s infinite linear; box-shadow: none; }
  .skel .line { height: 12px; border-radius: 6px; margin-top: 6px; width: 80%; }
  .skel .line.short { width: 50%; }
  @keyframes shimmer { to { background-position: -200% 0; } }

  /* Empty and error states */
  .state { display: flex; flex-direction: column; align-items: center; text-align: center;
    padding: 56px 16px; color: var(--secondary-text-color); }
  .state ha-icon { --mdc-icon-size: 56px; opacity: .4; margin-bottom: 12px; }
  .state-title { font-size: 20px; font-weight: 700; color: var(--primary-text-color); }
  .state-text { font-size: 15px; margin-top: 6px; max-width: 420px; word-break: break-word; }
  .retry { margin-top: 18px; height: 44px; padding: 0 24px; border-radius: 999px; border: 0;
    background: var(--accent); color: #fff; font: inherit; font-weight: 600; cursor: pointer; }

  @container (max-width: 480px) {
    .grid { gap: 16px 12px; }
    h1 { font-size: 30px; }
  }
`;

// src/cards/browser-card/browser-card.js
var MaBrowserCard = class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._id = `ma-browser-${nextInstanceId()}`;
    this._backends = new BackendHolder(() => this._hass);
    this._q = "";
    this._type = null;
    this._status = "idle";
    this._items = [];
    this._error = "";
    this._cache = /* @__PURE__ */ new Map();
    this._reqId = 0;
    this._home = null;
    this._homeStatus = "idle";
    this._homeLoadedAt = 0;
    this._target = null;
    this._t = translator("en");
    this._onTargetEvent = (e5) => {
      if (this._config && e5.detail.entity === this._config.entity) {
        this._target = e5.detail.target;
        this._updateSpeakerLabels();
      }
    };
  }
  setConfig(config) {
    if (!config || !config.entity) throw new Error("Missing 'entity' (a Music Assistant media_player)");
    const types = (config.media_types || DEFAULT_TYPES).filter((t5) => TYPES[t5]);
    if (!types.length) throw new Error(`Invalid media_types. Options: ${Object.keys(TYPES).join(", ")}`);
    const mode = config.mode || "compact";
    if (!["compact", "inline", "overlay"].includes(mode)) throw new Error("mode must be 'compact' or 'inline'");
    const home = (config.home || DEFAULT_HOME).filter((h4) => h4 && TYPES[h4.media_type]);
    this._config = {
      limit: 20,
      library_only: false,
      home_limit: 20,
      speaker_selector: true,
      ...config,
      mode,
      media_types: types,
      home
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
    return this._config && this._config.mode === "inline" ? { columns: 12, min_columns: 4 } : { columns: 12, rows: 1, min_columns: 3, min_rows: 1 };
  }
  static getStubConfig(hass) {
    const ent = Object.keys(hass && hass.entities || {}).find(
      (id) => id.startsWith("media_player.") && hass.entities[id].platform === "music_assistant"
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
    const t5 = this._t;
    const compact = this._config.mode !== "inline";
    const launcher = this._config.mode === "compact";
    const accent = this._config.accent_color === "theme" ? "var(--primary-color)" : this._config.accent_color || APPLE_RED;
    this.style.setProperty("--accent", accent);
    const tabs = this._config.media_types.map(
      (type) => `<button class="tab" role="tab" data-type="${type}" aria-selected="${type === this._type}">${t5(`type.${type}`)}</button>`
    ).join("");
    const browser = `
      <div class="wrap ${compact ? "is-full" : "is-inline"}">
        <div class="head">
          ${compact || this._config.speaker_selector ? `
          <div class="topbar">
            ${compact ? `<h1>${t5("browser.title")}</h1>` : "<span></span>"}
            <div class="actions">
              ${this._config.speaker_selector ? `
              <button class="speaker" id="speaker" aria-label="${t5("speakers.choose")}">
                <ha-icon icon="mdi:speaker"></ha-icon><span id="speakerName">${esc(this._speakerName())}</span>
                <ha-icon class="chev" icon="mdi:chevron-down"></ha-icon></button>` : ""}
              ${compact ? `<button class="close" id="close" aria-label="${t5("common.close")}"><ha-icon icon="mdi:close"></ha-icon></button>` : ""}
            </div>
          </div>` : ""}
          <div class="search">
            <ha-icon icon="mdi:magnify"></ha-icon>
            <input id="q" type="search" placeholder="${t5("browser.placeholder")}" enterkeyhint="search"
                   autocomplete="off" autocorrect="off" spellcheck="false" value="${esc(this._q)}" />
            <button class="clear" id="clear" aria-label="${t5("browser.clear")}" ${this._q ? "" : "hidden"}>
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
              <span class="l-name">${esc(this._config.name || t5("browser.launcher"))}</span>
              <span class="l-sub" id="lsub">${esc(this._launcherSubtitle())}</span>
            </span>
            <ha-icon class="l-chev" icon="mdi:chevron-right"></ha-icon>
          </button>
        </ha-card>` : ""}
        <dialog id="full" class="full"><div class="full-bg" id="fullBg"></div><div class="full-shade"></div>${browser}</dialog>` : `<ha-card class="inline-card">${browser}</ha-card>`}
      <ma-player-action-sheet id="menu"></ma-player-action-sheet>
      <ma-player-toast id="toast"></ma-player-toast>`;
    const $2 = (id) => this.shadowRoot.getElementById(id);
    this._wrap = this.shadowRoot.querySelector(".wrap");
    this._body = $2("body");
    this._input = $2("q");
    this._menu = $2("menu");
    this._toast = $2("toast");
    this._full = $2("full");
    this._fullOverlay = this._full ? new OverlayHistory(this._full, `${this._id}:full`) : null;
    this._applyArtwork();
    this._launcherSub = $2("lsub");
    this._speakerLabel = $2("speakerName");
    if ($2("speaker")) $2("speaker").addEventListener("click", () => this._openSpeakers());
    if (compact) {
      if (launcher) $2("launch").addEventListener("click", () => this._openFull());
      $2("close").addEventListener("click", () => this._full.close());
      this._full.addEventListener("close", () => this._onFullClosed());
      this._wrap.addEventListener(
        "scroll",
        () => {
          this._wrap.classList.toggle("scrolled", this._wrap.scrollTop > 4);
        },
        { passive: true }
      );
    }
    this._input.addEventListener("input", () => this._onInput());
    this._input.addEventListener("keydown", (e5) => {
      if (e5.key === "Enter") {
        e5.preventDefault();
        clearTimeout(this._debounce);
        this._search();
        this._input.blur();
      }
    });
    $2("clear").addEventListener("click", () => {
      this._input.value = "";
      this._onInput();
      this._input.focus();
    });
    this.shadowRoot.querySelector(".tabs").addEventListener("click", (e5) => {
      const tab = e5.target.closest(".tab");
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
    this.toggleAttribute("artwork", on);
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
    const w2 = this._wrap.clientWidth - 32;
    if (w2 <= 0) return;
    const fit = Math.max(2, Math.floor(w2 / MIN_TILE_PX));
    const cols = this._config.columns ? Math.min(Number(this._config.columns), fit) : Math.max(2, Math.round(w2 / AUTO_TILE_PX));
    const listCols = Math.max(1, Math.min(3, Math.floor(w2 / LIST_COL_PX)));
    this._wrap.style.setProperty("--cols", cols);
    this._wrap.style.setProperty("--list-cols", listCols);
    const n4 = Math.max(2, Math.round(w2 / 200));
    this._wrap.style.setProperty("--shelf-w", `${Math.floor((w2 - 14 * n4) / (n4 + 0.35))}px`);
    this._cols = cols;
  }
  _renderBody() {
    const tr = this._t;
    const t5 = TYPES[this._type];
    let html = "";
    if (this._status === "idle") {
      html = this._homeHtml();
    } else if (this._status === "loading" && !this._items.length) {
      const n4 = t5.list ? 10 : Math.min(Number(this._config.limit) || 12, (this._cols || 4) * 2);
      const skel = t5.list ? `<div class="row skel"><div class="art"></div><div class="meta"><div class="line"></div><div class="line short"></div></div></div>` : `<div class="tile skel"><div class="art ${t5.round ? "round" : ""}"></div>
           <div class="meta"><div class="line"></div><div class="line short"></div></div></div>`;
      html = `<div class="${t5.list ? "list" : "grid"}">${skel.repeat(n4)}</div>`;
    } else if (this._status === "empty") {
      html = this._state(
        "mdi:music-off",
        tr("browser.no_results"),
        esc(tr("browser.no_results_text", { types: tr(`type.${this._type}`).toLowerCase(), query: this._q }))
      );
    } else if (this._status === "error") {
      html = this._state(
        "mdi:alert-circle-outline",
        tr("common.error_title"),
        esc(this._error),
        `<button class="retry" id="retry">${tr("common.retry")}</button>`
      );
    } else {
      const dim = this._status === "loading" ? "dim" : "";
      html = t5.list ? `<div class="list ${dim}">${this._items.map((it, i7) => this._row(it, i7)).join("")}</div>` : `<div class="grid ${dim}">${this._items.map((it, i7) => this._tile(it, i7)).join("")}</div>`;
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
        { once: true }
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
    const i7 = Number(el.dataset.i);
    const s5 = el.dataset.s;
    if (s5 === "r" || s5 === void 0) return this._items[i7];
    const shelf = this._home && this._home[Number(s5)];
    return shelf && shelf.items[i7];
  }
  _art(it, type) {
    const t5 = TYPES[type];
    const ok = /^(https?:)?\/\//.test(it.image || "") || (it.image || "").startsWith("/");
    const inner = ok ? `<img src="${esc(it.image)}" alt="" loading="lazy" draggable="false" />` : `<ha-icon class="ph" icon="${t5.icon}"></ha-icon>`;
    return `<div class="art ${t5.round ? "round" : ""}" data-type="${type}">${inner}<div class="fx"></div>`;
  }
  _tile(it, i7, s5 = "r") {
    const type = this._typeOf(it);
    const sub = this._subtitle(it, type);
    return `<div class="tile item" data-s="${s5}" data-i="${i7}" role="button" tabindex="0" aria-label="${esc(it.name)}">
      ${this._art(it, type)}
        <button class="more" aria-label="${this._t("browser.more")}" tabindex="-1"><ha-icon icon="mdi:dots-horizontal"></ha-icon></button>
      </div>
      <div class="meta">
        <div class="title">${esc(it.name)}${it.version ? ` <span class="ver">(${esc(it.version)})</span>` : ""}</div>
        ${sub ? `<div class="sub">${esc(sub)}</div>` : ""}
      </div>
    </div>`;
  }
  _row(it, i7) {
    const type = this._typeOf(it);
    const sub = this._subtitle(it, type);
    return `<div class="row item" data-s="r" data-i="${i7}" role="button" tabindex="0" aria-label="${esc(it.name)}">
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
      const results = await Promise.allSettled(
        this._config.home.map(
          (h4) => library.getLibrary({
            mediaType: h4.media_type,
            limit: Number(h4.limit || this._config.home_limit) || 20,
            favorite: !!h4.favorite,
            orderBy: h4.order_by
          })
        )
      );
      this._home = this._config.home.map((h4, idx) => {
        const r4 = results[idx];
        if (r4.status === "rejected") {
          console.warn(`[ma-browser-card] shelf "${this._shelfTitle(h4)}" failed:`, r4.reason);
          return { shelf: h4, type: h4.media_type, items: [] };
        }
        return { shelf: h4, type: h4.media_type, items: r4.value };
      });
      this._homeLoadedAt = Date.now();
      this._homeStatus = results.every((r4) => r4.status === "rejected") ? "error" : "ok";
      if (this._homeStatus === "error") this._homeError = results[0].reason && results[0].reason.message;
    } catch (e5) {
      console.error("[ma-browser-card] home", e5);
      this._homeStatus = "error";
      this._homeError = e5 && e5.message || String(e5);
    }
    if (this._status === "idle") this._renderBody();
  }
  /** Resolved on render so default titles follow a language change. */
  _shelfTitle(h4) {
    return h4.title || (h4.titleKey ? this._t(h4.titleKey) : this._t(`type.${h4.media_type}`));
  }
  _homeHtml() {
    const t5 = this._t;
    const hint = this._state("mdi:music-circle-outline", t5("browser.hint_title"), t5("browser.hint_text"));
    if (!this._config.home.length) return hint;
    if (this._homeStatus === "loading" && !this._home) {
      const tile = `<div class="tile skel"><div class="art"></div><div class="meta"><div class="line"></div><div class="line short"></div></div></div>`;
      const shelf = `<section class="shelf-sec"><div class="shelf-title skel-title"></div><div class="shelf">${tile.repeat(8)}</div></section>`;
      return shelf.repeat(2);
    }
    if (this._homeStatus === "error" && !this._home) {
      return this._state(
        "mdi:alert-circle-outline",
        t5("browser.home_error"),
        esc(this._homeError || ""),
        `<button class="retry" id="homeRetry">${t5("common.retry")}</button>`
      );
    }
    const shelves = (this._home || []).map(
      (sh, s5) => sh.items.length ? `
        <section class="shelf-sec">
          <h2 class="shelf-title">${esc(this._shelfTitle(sh.shelf))}</h2>
          <div class="shelf">${sh.items.map((it, i7) => this._tile(it, i7, s5)).join("")}</div>
        </section>` : ""
    ).join("");
    return shelves || hint;
  }
  _speakers() {
    return listSpeakers(this._hass, this._config.entity, this._config.speakers);
  }
  _targetEntity() {
    return this._target || this._config && this._config.entity;
  }
  _setTarget(entityId) {
    this._target = entityId === this._config.entity ? null : entityId;
    Target.save(this._config.entity, this._target);
    this._updateSpeakerLabels();
  }
  _updateSpeakerLabels() {
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
    for (const b3 of this.shadowRoot.querySelectorAll(".tab")) b3.setAttribute("aria-selected", b3.dataset.type === type);
    this._items = [];
    if (this._wrap.classList.contains("is-full")) this._wrap.scrollTop = 0;
    this._search();
  }
  _backend() {
    return this._backends.get({
      mode: this._config.backend || "auto",
      entity: this._config.entity,
      configEntryId: this._config.config_entry_id
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
        libraryOnly: !!this._config.library_only
      });
      if (reqId !== this._reqId) return;
      this._cache.set(key, items);
      this._items = items;
      this._status = items.length ? "ok" : "empty";
    } catch (e5) {
      if (reqId !== this._reqId) return;
      console.error("[ma-browser-card] search", e5);
      this._items = [];
      this._status = "error";
      this._error = e5 && (e5.message || e5.code) || String(e5);
    }
    this._renderBody();
  }
  _bindGrid() {
    const body = this._body;
    const itemOf = (e5) => e5.target.closest && e5.target.closest(".item");
    body.addEventListener("pointerdown", (e5) => {
      const item = itemOf(e5);
      if (!item || e5.target.closest(".more") || e5.button > 0) return;
      this._lpStart = { x: e5.clientX, y: e5.clientY };
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
      for (const t5 of body.querySelectorAll(".item.pressed")) t5.classList.remove("pressed");
    };
    body.addEventListener("pointermove", (e5) => {
      if (!this._lpStart) return;
      if (Math.hypot(e5.clientX - this._lpStart.x, e5.clientY - this._lpStart.y) > 10) cancel();
    });
    body.addEventListener("pointerup", cancel);
    body.addEventListener("pointercancel", cancel);
    body.addEventListener("pointerleave", cancel);
    body.addEventListener("contextmenu", (e5) => {
      if (itemOf(e5)) e5.preventDefault();
    });
    body.addEventListener("click", (e5) => {
      const item = itemOf(e5);
      if (!item) return;
      if (this._lpFired) {
        this._lpFired = false;
        return;
      }
      const it = this._lookup(item);
      if (e5.target.closest(".more")) {
        e5.stopPropagation();
        this._openMenu(it, item);
      } else {
        this._play(it, null, item);
      }
    });
    body.addEventListener("keydown", (e5) => {
      const item = itemOf(e5);
      if (!item) return;
      if (e5.key === "Enter" || e5.key === " ") {
        e5.preventDefault();
        this._play(this._lookup(item), null, item);
      } else if (e5.key === "ContextMenu" || e5.shiftKey && e5.key === "F10") {
        e5.preventDefault();
        this._openMenu(this._lookup(item), item);
      }
    });
  }
  async _openMenu(it, el) {
    if (!it) return;
    const type = this._typeOf(it);
    const info = TYPES[type];
    const t5 = this._t;
    const k2 = await this._menu.show({
      header: { title: it.name, subtitle: this._subtitle(it, type), image: it.image, icon: info.icon, round: info.round },
      actions: [
        { key: "now", label: t5("browser.play_now"), icon: "mdi:play" },
        ...info.noQueue ? [] : [
          { key: "next", label: t5("browser.play_next"), icon: "mdi:playlist-play" },
          { key: "add", label: t5("browser.add_to_queue"), icon: "mdi:playlist-plus" }
        ]
      ],
      cancelLabel: t5("common.cancel")
    });
    if (k2) this._play(it, k2 === "now" ? null : k2, el);
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
      const msg = enqueue === "next" ? this._t("browser.queued_next") : enqueue === "add" ? this._t("browser.queued") : this._t("common.playing_on", { name: this._speakerName() });
      const icon = enqueue === "next" ? "mdi:playlist-play" : enqueue === "add" ? "mdi:playlist-plus" : "mdi:play-circle";
      this._showToast(it, msg, icon);
    } catch (e5) {
      console.error("[ma-browser-card] play_media", e5);
      if (fx) {
        fx.className = "fx fail";
        setTimeout(() => {
          if (fx.isConnected) fx.className = "fx";
        }, 2e3);
      }
      this._showToast(it, this._t("browser.play_failed", { error: e5 && e5.message || e5 }), "mdi:alert-circle", true);
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
};

// src/components/slider.ts
var clamp01 = (n4) => Math.min(1, Math.max(0, n4));
var STEPS = { ArrowLeft: -0.05, ArrowDown: -0.05, ArrowRight: 0.05, ArrowUp: 0.05 };
function bindSlider(el, { onInput, onChange }) {
  let dragging = false;
  const ratio = (e5) => {
    const r4 = el.getBoundingClientRect();
    return clamp01((e5.clientX - r4.left) / r4.width);
  };
  el.addEventListener("pointerdown", (e5) => {
    if (e5.button > 0) return;
    dragging = true;
    el.setPointerCapture(e5.pointerId);
    el.classList.add("drag");
    onInput(ratio(e5));
  });
  el.addEventListener("pointermove", (e5) => {
    if (dragging) onInput(ratio(e5));
  });
  el.addEventListener("pointerup", (e5) => {
    if (!dragging) return;
    dragging = false;
    el.classList.remove("drag");
    onChange(ratio(e5));
  });
  el.addEventListener("pointercancel", () => {
    dragging = false;
    el.classList.remove("drag");
    onChange(null);
  });
  el.addEventListener("keydown", (e5) => {
    const step = STEPS[e5.key];
    if (step === void 0) return;
    e5.preventDefault();
    onChange(clamp01(Number(el.dataset.value || 0) + step));
  });
  return {
    get dragging() {
      return dragging;
    }
  };
}
var setSlider = (el, ratio) => {
  const r4 = clamp01(ratio || 0);
  el.dataset.value = String(r4);
  const fill = el.querySelector(".fill");
  if (fill) fill.style.width = `${r4 * 100}%`;
};

// src/services/lyrics/lrc-parser.ts
function parseLrc(lrc) {
  const lines = [];
  for (const raw of String(lrc || "").split(/\r?\n/)) {
    const stamps = [...raw.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)];
    if (!stamps.length) continue;
    const text = raw.replace(/\[[^\]]*\]/g, "").trim();
    for (const m3 of stamps) lines.push({ t: Number(m3[1]) * 60 + Number(m3[2]), text });
  }
  return lines.sort((a3, b3) => a3.t - b3.t);
}

// src/services/lyrics/lrclib.ts
var lyricsCache = /* @__PURE__ */ new Map();
var cleanTitle = (t5) => String(t5 || "").replace(/\s*[([](?:feat\.?|ft\.?|with|con|featuring)\s[^)\]]*[)\]]/gi, "").replace(
  /\s+-\s+.*\b(?:remaster(?:ed)?|version|versión|live|en vivo|radio edit|edit|mono|stereo|acoustic|acústico)\b.*$/i,
  ""
).trim();
var firstArtist = (a3) => String(a3 || "").split(/\s*(?:,|;|&|\/|\sfeat\.?\s|\sft\.?\s|\sx\s|\sy\s)\s*/i)[0].trim();
var hasLyrics = (d3) => !!d3 && !!(d3.syncedLyrics || d3.plainLyrics || d3.instrumental);
function bestMatch(list, dur) {
  const ok = (list || []).filter(hasLyrics).filter((x2) => !dur || !x2.duration || Math.abs(x2.duration - dur) <= 5).sort(
    (x2, y3) => Number(!!y3.syncedLyrics) - Number(!!x2.syncedLyrics) || (dur ? Math.abs((x2.duration || dur) - dur) - Math.abs((y3.duration || dur) - dur) : 0)
  );
  return ok[0] || null;
}
function fetchLyrics(base, track, fetchFn = fetch) {
  const { title, artist, album, duration } = track;
  const key = `${artist}|${title}`.toLowerCase();
  const cached = lyricsCache.get(key);
  if (cached) return cached;
  const p4 = (async () => {
    const t22 = cleanTitle(title) || title;
    const a22 = firstArtist(artist) || artist || "";
    const dur = duration ? Math.round(duration) : 0;
    const tries = [
      ["get", { track_name: title, artist_name: artist || "", album_name: album || "", duration: dur || "" }],
      ["get", { track_name: t22, artist_name: a22, duration: dur || "" }],
      ["search", { track_name: t22, artist_name: a22 }],
      ["search", { q: `${t22} ${a22}`.trim() }],
      ["search", { track_name: t22 }]
    ];
    const seen = /* @__PURE__ */ new Set();
    for (const [kind, params] of tries) {
      const q = new URLSearchParams(
        Object.entries(params).filter(([, v3]) => v3 !== "" && v3 != null).map(([k2, v3]) => [k2, String(v3)])
      );
      const url = `${base}/api/${kind}?${q}`;
      if (seen.has(url)) continue;
      seen.add(url);
      const r4 = await fetchFn(url);
      if (r4.status === 404) continue;
      if (!r4.ok) throw new Error(`LRCLIB responded ${r4.status}`);
      const d3 = await r4.json();
      const hit = kind === "get" ? hasLyrics(d3) ? d3 : null : bestMatch(d3, dur);
      if (hit) {
        console.info(`[ma-player-card] lyrics found on LRCLIB (${kind}: ${q})`);
        return hit;
      }
    }
    console.info(`[ma-player-card] LRCLIB has no lyrics for "${title}" by ${artist}`);
    return null;
  })();
  lyricsCache.set(key, p4);
  p4.catch(() => lyricsCache.delete(key));
  return p4;
}

// src/services/playback-clock.ts
var EXPECT_MS = 15e3;
var RESET_THRESHOLD_S = 3;
var PlaybackClock = class {
  constructor(log = () => {
  }) {
    this.log = log;
  }
  log;
  key = "";
  anchor = null;
  lastUpd;
  offset = 0;
  expectAt = 0;
  /** MA's clock minus ours, plus latency, in ms (the smallest seen). */
  skew = null;
  /** `key` identifies song + player: when it changes, everything resets. `report` is null without player state. */
  sync(key, report, duration, now = Date.now()) {
    if (key !== this.key) {
      this.key = key;
      this.anchor = null;
      this.lastUpd = void 0;
      this.offset = 0;
      this.expectAt = 0;
    }
    if (!report) return;
    const { playing, updatedAt: upd } = report;
    if (upd !== this.lastUpd || !this.anchor) {
      const live = this.lastUpd !== void 0 && upd !== this.lastUpd;
      this.lastUpd = upd;
      const updMs = Date.parse(upd);
      if (live && updMs) {
        const obs = now - updMs;
        this.skew = this.skew == null ? obs : Math.min(this.skew, obs);
      }
      let ha = Number(report.position) || 0;
      if (playing && updMs) ha += 0.5 + Math.max(0, (now - (this.skew || 0) - updMs) / 1e3);
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
        `HA ${report.state} pos=${report.position} upd=${upd ? upd.slice(11, 23) : "-"} (${updMs ? ((now - updMs) / 1e3).toFixed(1) : "?"}s) → anchor ${pos.toFixed(1)}${note}`
      );
    } else if (this.anchor.playing !== playing) {
      this.anchor = { pos: this.position(duration, now), at: now, playing };
    }
  }
  /** After our own seek, pause or resume we know the position, even if HA is late or wrong. */
  setLocal(pos, playing, now = Date.now()) {
    this.log(`local ${playing ? "▶" : "⏸"} anchor ${pos.toFixed(1)}`);
    this.expectAt = now;
    this.anchor = { pos, at: now, playing };
  }
  /** Seconds, clamped between 0 and the duration when known. */
  position(duration, now = Date.now()) {
    const an = this.anchor;
    if (!an) return 0;
    let p4 = an.pos + (an.playing ? (now - an.at) / 1e3 : 0);
    if (duration) p4 = Math.min(p4, duration);
    return Math.max(0, p4);
  }
  get debug() {
    return { anchor: this.anchor, skew: this.skew, offset: this.offset };
  }
};

// src/version.ts
var VERSION = "0.5.1";

// src/cards/player-card/player-card.styles.js
var PLAYER_STYLES = `
  /* Mini player (the card on the dashboard) */
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
  .ib.search { color: var(--primary-text-color); }
  .ib.search ha-icon { --mdc-icon-size: 26px; }
  .mini.idle .prev, .mini.idle .play, .mini.idle .next, .mini.idle .mini-progress { display: none; }
  .mini-progress { position: absolute; left: 0; right: 0; bottom: 0; height: 3px; background: var(--fill); }
  .mini-progress .fill { height: 100%; width: 0; background: var(--accent); transition: width .5s linear; }
  @container (max-width: 400px) { .mini .prev { display: none; } }

  /* "Now playing" (full screen) */
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

  /* Queue and lyrics take the artwork's place */
  .np-list, .np-lyrics { overflow-y: auto; overscroll-behavior: contain; scrollbar-width: none;
    -webkit-mask-image: linear-gradient(transparent, #000 20px, #000 calc(100% - 56px), transparent);
    mask-image: linear-gradient(transparent, #000 20px, #000 calc(100% - 56px), transparent); }
  .np-list::-webkit-scrollbar, .np-lyrics::-webkit-scrollbar { display: none; }
  .np-msg { height: 100%; display: grid; place-items: center; text-align: center; padding: 0 24px;
    font-size: 17px; color: var(--np-dim); }

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

// src/cards/player-card/player-card.js
var MaPlayerCard = class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._id = `ma-player-${nextInstanceId()}`;
    this._view = "art";
    this._target = null;
    this._t = translator("en");
    this._sig = "";
    this._trackKey = "";
    this._fav = null;
    this._lyrics = null;
    this._lyricIdx = -1;
    this._backends = new BackendHolder(() => this._hass);
    this._clock = new PlaybackClock((msg) => this._dbg(msg));
    this._onTargetEvent = (e5) => {
      if (this._config && e5.detail.entity === this._config.entity) {
        this._target = e5.detail.target;
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
    const { type, queue_limit, lyrics, lyrics_url, name, ...rest } = this._config;
    return { ...rest, mode: "overlay" };
  }
  _entity() {
    const t5 = this._target;
    return t5 && this._hass && this._hass.states[t5] ? t5 : this._config.entity;
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
    return st && Number(st.attributes.media_duration) || 0;
  }
  _syncClock(st) {
    const a3 = st && st.attributes || {};
    const key = `${this._entity()}|${a3.media_title || ""}|${a3.media_artist || ""}`;
    const report = st ? {
      state: st.state,
      playing: st.state === "playing",
      position: a3.media_position,
      updatedAt: a3.media_position_updated_at || ""
    } : null;
    this._clock.sync(key, report, this._duration(st));
  }
  _dbg(msg) {
    if (!this._config.debug) return;
    const line = `${(/* @__PURE__ */ new Date()).toISOString().slice(11, 23)} ${msg}`;
    console.info(`[ma-player-card][debug] ${line}`);
    this._dbgLog = [line, ...this._dbgLog || []].slice(0, 10);
  }
  async _dbgPollQueue() {
    if (!this._config.debug || !this._np.open || this._dbgBusy) return;
    this._dbgBusy = true;
    const ent = this._entity();
    try {
      const info = await this._backend().queue.info(ent);
      this._dbgQueue = { elapsed: info.elapsed, at: Date.now() };
    } catch (err) {
      this._dbgQueue = { error: err && err.message || String(err), at: Date.now() };
    }
    this._dbgBusy = false;
  }
  _renderDebug(st, pos) {
    const el = this._els.debug;
    if (!this._config.debug || !el) return;
    if (!this._dbgPollAt || Date.now() - this._dbgPollAt > 2e3) {
      this._dbgPollAt = Date.now();
      this._dbgPollQueue();
    }
    const a3 = st && st.attributes || {};
    const { anchor: an, skew, offset } = this._clock.debug;
    const q = this._dbgQueue;
    const ago = (t5) => `${((Date.now() - t5) / 1e3).toFixed(1)}s`;
    el.textContent = [
      `v${VERSION}  backend: ${this._backend().name}  state: ${st ? st.state : "-"}  (optimistic: ${this._optAt ? this._optPlaying : "-"})`,
      `HA media_position: ${a3.media_position}  duration: ${a3.media_duration}`,
      `HA updated_at: ${a3.media_position_updated_at || "-"}`,
      `device clock: ${(/* @__PURE__ */ new Date()).toISOString()}`,
      `clock skew: ${skew == null ? "not measured" : `${skew} ms`}   MA offset: ${offset.toFixed(1)}s`,
      `anchor: ${an ? `${an.pos.toFixed(1)}s ${ago(an.at)} ago ${an.playing ? "▶" : "⏸"}` : "-"}`,
      `CARD POSITION: ${pos.toFixed(1)}s`,
      `MA queue elapsed_time: ${q ? q.error ? `error ${q.error}` : `${q.elapsed}s (${ago(q.at)} ago)` : "…"}`,
      "— events —",
      ...this._dbgLog || []
    ].join("\n");
  }
  _setLocalPosition(pos, playing) {
    this._clock.setLocal(pos, playing);
  }
  _position(st) {
    return st ? this._clock.position(this._duration(st)) : 0;
  }
  _picture(st) {
    const a3 = st && st.attributes || {};
    return a3.entity_picture_local || a3.entity_picture || "";
  }
  _render() {
    this._rendered = true;
    const t5 = this._t;
    const accent = this._config.accent_color === "theme" ? "var(--primary-color)" : this._config.accent_color || APPLE_RED;
    this.style.setProperty("--accent", accent);
    this.shadowRoot.innerHTML = `
      <style>${STYLES}${PLAYER_STYLES}</style>
      <ha-card class="mini" id="mini">
        <div class="mini-row">
          <button class="mini-main" id="openNp" aria-label="${t5("player.open")}">
            <span class="mini-art" id="miniArt"></span>
            <span class="mini-text"><span class="mini-title" id="miniTitle"></span><span class="mini-sub" id="miniSub"></span></span>
          </button>
          <div class="mini-ctrls">
            <button class="ib prev" data-cmd="prev" aria-label="${t5("player.previous")}"><ha-icon icon="mdi:skip-previous"></ha-icon></button>
            <button class="ib play" data-cmd="playpause" aria-label="${t5("player.play_pause")}"><ha-icon id="miniPlay" icon="mdi:play"></ha-icon></button>
            <button class="ib next" data-cmd="next" aria-label="${t5("player.next")}"><ha-icon icon="mdi:skip-next"></ha-icon></button>
            <button class="ib search" data-cmd="search" aria-label="${t5("browser.launcher")}"><ha-icon icon="mdi:magnify"></ha-icon></button>
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
            <button class="np-btn" id="npClose" aria-label="${t5("common.close")}"><ha-icon icon="mdi:chevron-down"></ha-icon></button>
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
              <button class="np-btn fav" id="npFav" aria-label="${t5("player.favorite")}" hidden><ha-icon icon="mdi:heart-outline"></ha-icon></button>
            </div>
            <div class="slider seek" id="npSeek" role="slider" tabindex="0" aria-label="${t5("player.position")}"><div class="track"><div class="fill"></div></div></div>
            <div class="np-times"><span id="npElapsed">0:00</span><span id="npRemain">-0:00</span></div>
            <div class="np-ctrls">
              <button class="np-btn small" data-cmd="shuffle" id="npShuffle" aria-label="${t5("player.shuffle")}"><ha-icon icon="mdi:shuffle-variant"></ha-icon></button>
              <button class="np-btn big" data-cmd="prev" aria-label="${t5("player.previous")}"><ha-icon icon="mdi:skip-previous"></ha-icon></button>
              <button class="np-btn huge" data-cmd="playpause" aria-label="${t5("player.play_pause")}"><ha-icon id="npPlay" icon="mdi:play"></ha-icon></button>
              <button class="np-btn big" data-cmd="next" aria-label="${t5("player.next")}"><ha-icon icon="mdi:skip-next"></ha-icon></button>
              <button class="np-btn small" data-cmd="repeat" id="npRepeat" aria-label="${t5("player.repeat")}"><ha-icon icon="mdi:repeat"></ha-icon></button>
            </div>
            <div class="np-vol">
              <ha-icon icon="mdi:volume-low"></ha-icon>
              <div class="slider vol" id="npVol" role="slider" tabindex="0" aria-label="${t5("player.volume")}"><div class="track"><div class="fill"></div></div></div>
              <ha-icon icon="mdi:volume-high"></ha-icon>
            </div>
            <div class="np-bottom">
              ${this._config.lyrics ? `<button class="np-btn tool" data-view="lyrics" aria-label="${t5("player.lyrics")}"><ha-icon icon="mdi:message-text-outline"></ha-icon></button>` : `<span class="np-top-spacer"></span>`}
              <button class="np-pill" id="npSpeaker" aria-label="${t5("speakers.choose")}"><ha-icon icon="mdi:speaker"></ha-icon><span id="npSpeakerName"></span></button>
              <button class="np-btn tool" data-cmd="search" aria-label="${t5("browser.launcher")}"><ha-icon icon="mdi:magnify"></ha-icon></button>
              <button class="np-btn tool" data-view="queue" aria-label="${t5("player.queue")}"><ha-icon icon="mdi:playlist-music"></ha-icon></button>
            </div>
          </div>
        </div>
      </dialog>

      <ma-browser-card id="browser"></ma-browser-card>
      <!-- Shown over "Now playing", which is always dark -->
      <ma-player-action-sheet id="sheet" dark></ma-player-action-sheet>
      <ma-player-toast id="toast" dark></ma-player-toast>`;
    const $2 = (id) => this.shadowRoot.getElementById(id);
    this._els = {
      mini: $2("mini"),
      miniArt: $2("miniArt"),
      miniTitle: $2("miniTitle"),
      miniSub: $2("miniSub"),
      miniPlay: $2("miniPlay"),
      miniFill: $2("miniFill"),
      np: $2("np"),
      bg: $2("npBg"),
      where: $2("npWhere"),
      stage: $2("npStage"),
      art: $2("npArt"),
      queue: $2("npQueue"),
      lyrics: $2("npLyrics"),
      title: $2("npTitle"),
      artist: $2("npArtist"),
      fav: $2("npFav"),
      seek: $2("npSeek"),
      elapsed: $2("npElapsed"),
      remain: $2("npRemain"),
      shuffle: $2("npShuffle"),
      repeat: $2("npRepeat"),
      play: $2("npPlay"),
      vol: $2("npVol"),
      speakerName: $2("npSpeakerName"),
      debug: $2("npDebug")
    };
    this._np = this._els.np;
    this._npOverlay = new OverlayHistory(this._np, `${this._id}:np`);
    this._sheet = $2("sheet");
    this._toast = $2("toast");
    this._els.queue.addEventListener("queue-info", (e5) => this._onQueueInfo(e5.detail));
    this._els.queue.addEventListener("toast", (e5) => this._toast.show(e5.detail));
    this._browser = $2("browser");
    this._browser.setConfig(this._browserConfig());
    if (this._hass) this._browser.hass = this._hass;
    this.shadowRoot.addEventListener("click", (e5) => {
      const cmd = e5.target.closest("[data-cmd]");
      if (cmd) return this._cmd(cmd.dataset.cmd);
      const view = e5.target.closest("[data-view]");
      if (view) return this._setView(this._view === view.dataset.view ? "art" : view.dataset.view);
    });
    $2("openNp").addEventListener("click", () => {
      const st = this._state();
      if (st && st.attributes.media_title) this._openNp();
      else this._browser.open();
    });
    $2("npClose").addEventListener("click", () => this._np.close());
    $2("npSpeaker").addEventListener("click", () => this._openSpeakers());
    this._els.fav.addEventListener("click", () => this._favorite());
    this._seekCtl = bindSlider(this._els.seek, {
      onInput: (r4) => {
        this._dragPos = r4 * this._duration(this._state());
        this._tick();
      },
      onChange: (r4) => {
        this._dragPos = null;
        const d3 = this._duration(this._state());
        if (r4 === null || !d3) return this._tick();
        const pos = r4 * d3;
        this._setLocalPosition(pos, this._isPlaying(this._state()));
        this._run("media_seek", (p4, e5) => p4.seek(e5, Math.round(pos * 10) / 10));
        this._tick();
      }
    });
    let volTimer = null;
    const sendVol = (r4) => this._run("volume_set", (p4, e5) => p4.setVolume(e5, Math.round(r4 * 100) / 100));
    bindSlider(this._els.vol, {
      onInput: (r4) => {
        this._vol = { v: r4, at: Date.now() };
        setSlider(this._els.vol, r4);
        if (!volTimer)
          volTimer = setTimeout(() => {
            volTimer = null;
            sendVol(this._vol.v);
          }, 250);
      },
      onChange: (r4) => {
        if (r4 === null) return;
        clearTimeout(volTimer);
        volTimer = null;
        this._vol = { v: r4, at: Date.now() };
        setSlider(this._els.vol, r4);
        sendVol(r4);
      }
    });
    this._els.lyrics.addEventListener("click", (e5) => {
      const line = e5.target.closest(".ly-line");
      if (!line) return;
      const pos = Number(line.dataset.t);
      this._setLocalPosition(pos, this._isPlaying(this._state()));
      this._lyUserAt = 0;
      this._run("media_seek", (p4, e6) => p4.seek(e6, pos));
      this._haptic("light");
    });
    const userScroll = () => this._lyUserAt = Date.now();
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
    if (img) img.addEventListener("error", () => el.innerHTML = `<ha-icon icon="${icon}"></ha-icon>`, { once: true });
  }
  _update() {
    if (!this._rendered || !this._hass) return;
    const st = this._state();
    const a3 = st && st.attributes || {};
    if (this._optAt && st && st.state === "playing" === this._optPlaying) this._optAt = 0;
    this._syncClock(st);
    const playing = this._isPlaying(st);
    const pic = this._picture(st);
    const name = speakerName(this._hass, this._entity());
    Object.assign(this._els.queue, {
      backend: this._backend(),
      entity: this._entity(),
      limit: Number(this._config.queue_limit) || 50,
      language: hassLanguage(this._hass)
    });
    const sig = [
      this._entity(),
      st && st.state,
      a3.media_title,
      a3.media_artist,
      a3.media_album_name,
      pic,
      a3.shuffle,
      a3.repeat,
      a3.volume_level,
      a3.media_duration,
      playing,
      name
    ].join("|");
    if (sig === this._sig) return;
    this._sig = sig;
    const e5 = this._els;
    const t5 = this._t;
    const has = !!(st && a3.media_title);
    const unavailable = !st || st.state === "unavailable";
    if (this._browser) this._browser.setArtwork(has ? pic || "" : null);
    e5.mini.classList.toggle("idle", !has);
    this._setArt(e5.miniArt, has ? pic : "", "mdi:music");
    e5.miniTitle.textContent = has ? a3.media_title : t5(unavailable ? "player.unavailable" : "player.nothing_playing");
    e5.miniSub.textContent = has ? [a3.media_artist, a3.media_album_name].filter(Boolean).join(" · ") : t5("player.tap_to_search", { name });
    e5.miniPlay.setAttribute("icon", playing ? "mdi:pause" : "mdi:play");
    e5.bg.style.backgroundImage = pic ? `url("${pic.replace(/"/g, "%22")}")` : "";
    this._setArt(e5.art, pic, "mdi:music");
    e5.art.classList.toggle("paused", !playing);
    e5.title.textContent = has ? a3.media_title : t5("player.nothing_playing");
    e5.artist.textContent = has ? [a3.media_artist, a3.media_album_name].filter(Boolean).join(" — ") : "";
    e5.where.textContent = t5("common.playing_on", { name });
    e5.speakerName.textContent = name;
    e5.play.setAttribute("icon", playing ? "mdi:pause" : "mdi:play");
    e5.shuffle.classList.toggle("on", !!a3.shuffle);
    const rep = a3.repeat || "off";
    e5.repeat.classList.toggle("on", rep !== "off");
    e5.repeat.querySelector("ha-icon").setAttribute("icon", rep === "one" ? "mdi:repeat-once" : rep === "all" ? "mdi:repeat" : "mdi:repeat-off");
    if (!this._vol || Date.now() - this._vol.at > 2e3) setSlider(e5.vol, Number(a3.volume_level) || 0);
    const key = `${this._entity()}|${a3.media_title || ""}|${a3.media_artist || ""}`;
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
    const d3 = this._duration(st);
    const pos = this._dragPos != null ? this._dragPos : this._position(st);
    const ratio = d3 ? pos / d3 : 0;
    this._els.miniFill.style.width = `${Math.min(100, ratio * 100)}%`;
    if (!this._np.open) return;
    setSlider(this._els.seek, ratio);
    this._els.elapsed.textContent = fmtTime(pos);
    this._els.remain.textContent = d3 ? `-${fmtTime(d3 - pos)}` : "";
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
    Target.save(this._config.entity, id === this._config.entity ? null : id);
    this._haptic("selection");
  }
  _refreshNp() {
    clearTimeout(this._queueTimer);
    this._queueTimer = setTimeout(() => this._els.queue.refresh(this._view === "queue"), 400);
    if (this._view === "lyrics") this._loadLyrics();
  }
  _setView(view) {
    this._view = view;
    this._els.stage.dataset.view = view;
    for (const b3 of this.shadowRoot.querySelectorAll(".np-btn.tool[data-view]"))
      b3.classList.toggle("on", b3.dataset.view === view);
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
    const a3 = st && st.attributes || {};
    this._haptic("light");
    switch (cmd) {
      case "playpause":
        this._optPlaying = !this._isPlaying(st);
        this._optAt = Date.now();
        this._setLocalPosition(this._position(st), this._optPlaying);
        this._sig = "";
        this._update();
        return this._run("media_play_pause", (p4, e5) => p4.playPause(e5));
      case "prev":
        return this._run("media_previous_track", (p4, e5) => p4.previous(e5));
      case "next":
        return this._run("media_next_track", (p4, e5) => p4.next(e5));
      case "shuffle":
        return this._run("shuffle_set", (p4, e5) => p4.setShuffle(e5, !a3.shuffle));
      case "repeat": {
        const order = ["off", "all", "one"];
        const next = order[(order.indexOf(a3.repeat || "off") + 1) % order.length];
        return this._run("repeat_set", (p4, e5) => p4.setRepeat(e5, next));
      }
      case "search":
        return this._browser.open();
      default:
        return void 0;
    }
  }
  _backend() {
    return this._backends.get({
      mode: this._config.backend || "auto",
      entity: this._config.entity,
      configEntryId: this._config.config_entry_id
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
    this._favAt = Date.now();
    this._renderFav();
    this._haptic(remove ? "light" : "success");
    try {
      if (remove) await be.favorites.unfavorite(ent);
      else await be.favorites.favorite(ent);
      this._showToast(
        item,
        this._t(remove ? "player.unfavorited" : "player.favorited"),
        remove ? "mdi:heart-broken" : "mdi:heart"
      );
    } catch (err) {
      this._fav = remove;
      this._renderFav();
      const error = err && err.message || String(err);
      this._showToast(
        item,
        this._t(remove ? "player.unfavorite_failed" : "player.favorite_failed", { error }),
        "mdi:alert-circle",
        true
      );
    }
  }
  _onQueueInfo(info) {
    const recentLocal = this._favAt && Date.now() - this._favAt < 6e3;
    if (info.current && !recentLocal) this._fav = !!info.current.favorite;
    this._renderFav();
  }
  async _loadLyrics() {
    const st = this._state();
    const a3 = st && st.attributes || {};
    const key = this._trackKey;
    if (!a3.media_title) {
      this._lyrics = { status: "none" };
      return this._renderLyrics();
    }
    this._lyrics = { status: "loading" };
    this._renderLyrics();
    let lyrics;
    try {
      const d3 = await fetchLyrics(this._config.lyrics_url.replace(/\/$/, ""), {
        title: a3.media_title,
        artist: a3.media_artist,
        album: a3.media_album_name,
        duration: a3.media_duration
      });
      if (!d3) lyrics = { status: "none" };
      else if (d3.syncedLyrics) lyrics = { status: "synced", lines: parseLrc(d3.syncedLyrics) };
      else if (d3.instrumental) lyrics = { status: "instrumental" };
      else lyrics = { status: "plain", text: d3.plainLyrics };
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
    const t5 = this._t;
    const l3 = this._lyrics || { status: "loading" };
    const a3 = (this._state() || { attributes: {} }).attributes;
    const searchUrl = `https://lrclib.net/search/${encodeURIComponent(`${a3.media_title || ""} ${firstArtist(a3.media_artist)}`.trim())}`;
    const msg = {
      loading: esc(t5("lyrics.loading")),
      none: `${esc(t5("lyrics.none"))}<br><a class="ly-link" href="${esc(searchUrl)}" target="_blank" rel="noopener">${esc(t5("lyrics.search"))}</a>`,
      instrumental: esc(t5("lyrics.instrumental")),
      error: esc(t5("lyrics.error"))
    }[l3.status];
    if (msg) {
      el.innerHTML = `<div class="np-msg">${msg}</div>`;
      return;
    }
    if (l3.status === "plain") {
      el.innerHTML = `<div class="ly-plain">${esc(l3.text)}</div><div class="ly-note">${esc(t5("lyrics.unsynced"))}</div>`;
      return;
    }
    el.innerHTML = `<div class="ly-pad"></div>${l3.lines.map((x2, i7) => `<p class="ly-line" data-i="${i7}" data-t="${x2.t}">${x2.text ? esc(x2.text) : "♪"}</p>`).join("")}<div class="ly-note">${esc(t5("lyrics.credit"))}</div><div class="ly-pad"></div>`;
    this._lyricIdx = -1;
    this._syncLyrics(this._position(this._state()));
  }
  // Seconds the lyrics run ahead of the audio (lyrics_offset); lines read better slightly early.
  _lyricsOffset() {
    const o5 = Number(this._config.lyrics_offset);
    return Number.isFinite(o5) ? o5 : 0.6;
  }
  _syncLyrics(pos) {
    const l3 = this._lyrics;
    if (!l3 || l3.status !== "synced") return;
    let idx = -1;
    for (let i7 = 0; i7 < l3.lines.length; i7++) {
      if (l3.lines[i7].t <= pos + this._lyricsOffset()) idx = i7;
      else break;
    }
    if (idx === this._lyricIdx) return;
    this._lyricIdx = idx;
    const el = this._els.lyrics;
    el.querySelectorAll(".ly-line").forEach((p4, i7) => {
      p4.classList.toggle("active", i7 === idx);
      p4.classList.toggle("past", i7 < idx);
    });
    if (this._lyUserAt && Date.now() - this._lyUserAt < 4e3) return;
    const active = el.querySelector(".ly-line.active");
    if (active) el.scrollTo({ top: active.offsetTop - el.clientHeight * 0.32, behavior: "smooth" });
    else el.scrollTo({ top: 0, behavior: "smooth" });
  }
  _showToast(it, text, icon, error = false) {
    this._toast.show({ title: it.name, image: it.image, text, icon, error });
  }
  _haptic(kind) {
    haptic(this, kind);
  }
};

// node_modules/@lit/reactive-element/css-tag.js
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
var t = globalThis;
var e = t.ShadowRoot && (void 0 === t.ShadyCSS || t.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype;
var s = /* @__PURE__ */ Symbol();
var o = /* @__PURE__ */ new WeakMap();
var n = class {
  constructor(t5, e5, o5) {
    if (this._$cssResult$ = true, o5 !== s) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t5, this.t = e5;
  }
  get styleSheet() {
    let t5 = this.o;
    const s5 = this.t;
    if (e && void 0 === t5) {
      const e5 = void 0 !== s5 && 1 === s5.length;
      e5 && (t5 = o.get(s5)), void 0 === t5 && ((this.o = t5 = new CSSStyleSheet()).replaceSync(this.cssText), e5 && o.set(s5, t5));
    }
    return t5;
  }
  toString() {
    return this.cssText;
  }
};
var r = (t5) => new n("string" == typeof t5 ? t5 : t5 + "", void 0, s);
var i = (t5, ...e5) => {
  const o5 = 1 === t5.length ? t5[0] : e5.reduce((e6, s5, o6) => e6 + ((t6) => {
    if (true === t6._$cssResult$) return t6.cssText;
    if ("number" == typeof t6) return t6;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + t6 + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s5) + t5[o6 + 1], t5[0]);
  return new n(o5, t5, s);
};
var S = (s5, o5) => {
  if (e) s5.adoptedStyleSheets = o5.map((t5) => t5 instanceof CSSStyleSheet ? t5 : t5.styleSheet);
  else for (const e5 of o5) {
    const o6 = document.createElement("style"), n4 = t.litNonce;
    void 0 !== n4 && o6.setAttribute("nonce", n4), o6.textContent = e5.cssText, s5.appendChild(o6);
  }
};
var c = e ? (t5) => t5 : (t5) => t5 instanceof CSSStyleSheet ? ((t6) => {
  let e5 = "";
  for (const s5 of t6.cssRules) e5 += s5.cssText;
  return r(e5);
})(t5) : t5;

// node_modules/@lit/reactive-element/reactive-element.js
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
var { is: i2, defineProperty: e2, getOwnPropertyDescriptor: h, getOwnPropertyNames: r2, getOwnPropertySymbols: o2, getPrototypeOf: n2 } = Object;
var a = globalThis;
var c2 = a.trustedTypes;
var l = c2 ? c2.emptyScript : "";
var p = a.reactiveElementPolyfillSupport;
var d = (t5, s5) => t5;
var u = { toAttribute(t5, s5) {
  switch (s5) {
    case Boolean:
      t5 = t5 ? l : null;
      break;
    case Object:
    case Array:
      t5 = null == t5 ? t5 : JSON.stringify(t5);
  }
  return t5;
}, fromAttribute(t5, s5) {
  let i7 = t5;
  switch (s5) {
    case Boolean:
      i7 = null !== t5;
      break;
    case Number:
      i7 = null === t5 ? null : Number(t5);
      break;
    case Object:
    case Array:
      try {
        i7 = JSON.parse(t5);
      } catch (t6) {
        i7 = null;
      }
  }
  return i7;
} };
var f = (t5, s5) => !i2(t5, s5);
var b = { attribute: true, type: String, converter: u, reflect: false, useDefault: false, hasChanged: f };
Symbol.metadata ??= /* @__PURE__ */ Symbol("metadata"), a.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var y = class extends HTMLElement {
  static addInitializer(t5) {
    this._$Ei(), (this.l ??= []).push(t5);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t5, s5 = b) {
    if (s5.state && (s5.attribute = false), this._$Ei(), this.prototype.hasOwnProperty(t5) && ((s5 = Object.create(s5)).wrapped = true), this.elementProperties.set(t5, s5), !s5.noAccessor) {
      const i7 = /* @__PURE__ */ Symbol(), h4 = this.getPropertyDescriptor(t5, i7, s5);
      void 0 !== h4 && e2(this.prototype, t5, h4);
    }
  }
  static getPropertyDescriptor(t5, s5, i7) {
    const { get: e5, set: r4 } = h(this.prototype, t5) ?? { get() {
      return this[s5];
    }, set(t6) {
      this[s5] = t6;
    } };
    return { get: e5, set(s6) {
      const h4 = e5?.call(this);
      r4?.call(this, s6), this.requestUpdate(t5, h4, i7);
    }, configurable: true, enumerable: true };
  }
  static getPropertyOptions(t5) {
    return this.elementProperties.get(t5) ?? b;
  }
  static _$Ei() {
    if (this.hasOwnProperty(d("elementProperties"))) return;
    const t5 = n2(this);
    t5.finalize(), void 0 !== t5.l && (this.l = [...t5.l]), this.elementProperties = new Map(t5.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(d("finalized"))) return;
    if (this.finalized = true, this._$Ei(), this.hasOwnProperty(d("properties"))) {
      const t6 = this.properties, s5 = [...r2(t6), ...o2(t6)];
      for (const i7 of s5) this.createProperty(i7, t6[i7]);
    }
    const t5 = this[Symbol.metadata];
    if (null !== t5) {
      const s5 = litPropertyMetadata.get(t5);
      if (void 0 !== s5) for (const [t6, i7] of s5) this.elementProperties.set(t6, i7);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t6, s5] of this.elementProperties) {
      const i7 = this._$Eu(t6, s5);
      void 0 !== i7 && this._$Eh.set(i7, t6);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(s5) {
    const i7 = [];
    if (Array.isArray(s5)) {
      const e5 = new Set(s5.flat(1 / 0).reverse());
      for (const s6 of e5) i7.unshift(c(s6));
    } else void 0 !== s5 && i7.push(c(s5));
    return i7;
  }
  static _$Eu(t5, s5) {
    const i7 = s5.attribute;
    return false === i7 ? void 0 : "string" == typeof i7 ? i7 : "string" == typeof t5 ? t5.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = false, this.hasUpdated = false, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    this._$ES = new Promise((t5) => this.enableUpdating = t5), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((t5) => t5(this));
  }
  addController(t5) {
    (this._$EO ??= /* @__PURE__ */ new Set()).add(t5), void 0 !== this.renderRoot && this.isConnected && t5.hostConnected?.();
  }
  removeController(t5) {
    this._$EO?.delete(t5);
  }
  _$E_() {
    const t5 = /* @__PURE__ */ new Map(), s5 = this.constructor.elementProperties;
    for (const i7 of s5.keys()) this.hasOwnProperty(i7) && (t5.set(i7, this[i7]), delete this[i7]);
    t5.size > 0 && (this._$Ep = t5);
  }
  createRenderRoot() {
    const t5 = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return S(t5, this.constructor.elementStyles), t5;
  }
  connectedCallback() {
    this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(true), this._$EO?.forEach((t5) => t5.hostConnected?.());
  }
  enableUpdating(t5) {
  }
  disconnectedCallback() {
    this._$EO?.forEach((t5) => t5.hostDisconnected?.());
  }
  attributeChangedCallback(t5, s5, i7) {
    this._$AK(t5, i7);
  }
  _$ET(t5, s5) {
    const i7 = this.constructor.elementProperties.get(t5), e5 = this.constructor._$Eu(t5, i7);
    if (void 0 !== e5 && true === i7.reflect) {
      const h4 = (void 0 !== i7.converter?.toAttribute ? i7.converter : u).toAttribute(s5, i7.type);
      this._$Em = t5, null == h4 ? this.removeAttribute(e5) : this.setAttribute(e5, h4), this._$Em = null;
    }
  }
  _$AK(t5, s5) {
    const i7 = this.constructor, e5 = i7._$Eh.get(t5);
    if (void 0 !== e5 && this._$Em !== e5) {
      const t6 = i7.getPropertyOptions(e5), h4 = "function" == typeof t6.converter ? { fromAttribute: t6.converter } : void 0 !== t6.converter?.fromAttribute ? t6.converter : u;
      this._$Em = e5;
      const r4 = h4.fromAttribute(s5, t6.type);
      this[e5] = r4 ?? this._$Ej?.get(e5) ?? r4, this._$Em = null;
    }
  }
  requestUpdate(t5, s5, i7, e5 = false, h4) {
    if (void 0 !== t5) {
      const r4 = this.constructor;
      if (false === e5 && (h4 = this[t5]), i7 ??= r4.getPropertyOptions(t5), !((i7.hasChanged ?? f)(h4, s5) || i7.useDefault && i7.reflect && h4 === this._$Ej?.get(t5) && !this.hasAttribute(r4._$Eu(t5, i7)))) return;
      this.C(t5, s5, i7);
    }
    false === this.isUpdatePending && (this._$ES = this._$EP());
  }
  C(t5, s5, { useDefault: i7, reflect: e5, wrapped: h4 }, r4) {
    i7 && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t5) && (this._$Ej.set(t5, r4 ?? s5 ?? this[t5]), true !== h4 || void 0 !== r4) || (this._$AL.has(t5) || (this.hasUpdated || i7 || (s5 = void 0), this._$AL.set(t5, s5)), true === e5 && this._$Em !== t5 && (this._$Eq ??= /* @__PURE__ */ new Set()).add(t5));
  }
  async _$EP() {
    this.isUpdatePending = true;
    try {
      await this._$ES;
    } catch (t6) {
      Promise.reject(t6);
    }
    const t5 = this.scheduleUpdate();
    return null != t5 && await t5, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
        for (const [t7, s6] of this._$Ep) this[t7] = s6;
        this._$Ep = void 0;
      }
      const t6 = this.constructor.elementProperties;
      if (t6.size > 0) for (const [s6, i7] of t6) {
        const { wrapped: t7 } = i7, e5 = this[s6];
        true !== t7 || this._$AL.has(s6) || void 0 === e5 || this.C(s6, void 0, i7, e5);
      }
    }
    let t5 = false;
    const s5 = this._$AL;
    try {
      t5 = this.shouldUpdate(s5), t5 ? (this.willUpdate(s5), this._$EO?.forEach((t6) => t6.hostUpdate?.()), this.update(s5)) : this._$EM();
    } catch (s6) {
      throw t5 = false, this._$EM(), s6;
    }
    t5 && this._$AE(s5);
  }
  willUpdate(t5) {
  }
  _$AE(t5) {
    this._$EO?.forEach((t6) => t6.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = true, this.firstUpdated(t5)), this.updated(t5);
  }
  _$EM() {
    this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = false;
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._$ES;
  }
  shouldUpdate(t5) {
    return true;
  }
  update(t5) {
    this._$Eq &&= this._$Eq.forEach((t6) => this._$ET(t6, this[t6])), this._$EM();
  }
  updated(t5) {
  }
  firstUpdated(t5) {
  }
};
y.elementStyles = [], y.shadowRootOptions = { mode: "open" }, y[d("elementProperties")] = /* @__PURE__ */ new Map(), y[d("finalized")] = /* @__PURE__ */ new Map(), p?.({ ReactiveElement: y }), (a.reactiveElementVersions ??= []).push("2.1.2");

// node_modules/lit-html/lit-html.js
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
var t2 = globalThis;
var i3 = (t5) => t5;
var s2 = t2.trustedTypes;
var e3 = s2 ? s2.createPolicy("lit-html", { createHTML: (t5) => t5 }) : void 0;
var h2 = "$lit$";
var o3 = `lit$${Math.random().toFixed(9).slice(2)}$`;
var n3 = "?" + o3;
var r3 = `<${n3}>`;
var l2 = document;
var c3 = () => l2.createComment("");
var a2 = (t5) => null === t5 || "object" != typeof t5 && "function" != typeof t5;
var u2 = Array.isArray;
var d2 = (t5) => u2(t5) || "function" == typeof t5?.[Symbol.iterator];
var f2 = "[ 	\n\f\r]";
var v = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
var _ = /-->/g;
var m = />/g;
var p2 = RegExp(`>|${f2}(?:([^\\s"'>=/]+)(${f2}*=${f2}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g");
var g = /'/g;
var $ = /"/g;
var y2 = /^(?:script|style|textarea|title)$/i;
var x = (t5) => (i7, ...s5) => ({ _$litType$: t5, strings: i7, values: s5 });
var b2 = x(1);
var w = x(2);
var T = x(3);
var E = /* @__PURE__ */ Symbol.for("lit-noChange");
var A = /* @__PURE__ */ Symbol.for("lit-nothing");
var C = /* @__PURE__ */ new WeakMap();
var P = l2.createTreeWalker(l2, 129);
function V(t5, i7) {
  if (!u2(t5) || !t5.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return void 0 !== e3 ? e3.createHTML(i7) : i7;
}
var N = (t5, i7) => {
  const s5 = t5.length - 1, e5 = [];
  let n4, l3 = 2 === i7 ? "<svg>" : 3 === i7 ? "<math>" : "", c5 = v;
  for (let i8 = 0; i8 < s5; i8++) {
    const s6 = t5[i8];
    let a3, u5, d3 = -1, f3 = 0;
    for (; f3 < s6.length && (c5.lastIndex = f3, u5 = c5.exec(s6), null !== u5); ) f3 = c5.lastIndex, c5 === v ? "!--" === u5[1] ? c5 = _ : void 0 !== u5[1] ? c5 = m : void 0 !== u5[2] ? (y2.test(u5[2]) && (n4 = RegExp("</" + u5[2], "g")), c5 = p2) : void 0 !== u5[3] && (c5 = p2) : c5 === p2 ? ">" === u5[0] ? (c5 = n4 ?? v, d3 = -1) : void 0 === u5[1] ? d3 = -2 : (d3 = c5.lastIndex - u5[2].length, a3 = u5[1], c5 = void 0 === u5[3] ? p2 : '"' === u5[3] ? $ : g) : c5 === $ || c5 === g ? c5 = p2 : c5 === _ || c5 === m ? c5 = v : (c5 = p2, n4 = void 0);
    const x2 = c5 === p2 && t5[i8 + 1].startsWith("/>") ? " " : "";
    l3 += c5 === v ? s6 + r3 : d3 >= 0 ? (e5.push(a3), s6.slice(0, d3) + h2 + s6.slice(d3) + o3 + x2) : s6 + o3 + (-2 === d3 ? i8 : x2);
  }
  return [V(t5, l3 + (t5[s5] || "<?>") + (2 === i7 ? "</svg>" : 3 === i7 ? "</math>" : "")), e5];
};
var S2 = class _S {
  constructor({ strings: t5, _$litType$: i7 }, e5) {
    let r4;
    this.parts = [];
    let l3 = 0, a3 = 0;
    const u5 = t5.length - 1, d3 = this.parts, [f3, v3] = N(t5, i7);
    if (this.el = _S.createElement(f3, e5), P.currentNode = this.el.content, 2 === i7 || 3 === i7) {
      const t6 = this.el.content.firstChild;
      t6.replaceWith(...t6.childNodes);
    }
    for (; null !== (r4 = P.nextNode()) && d3.length < u5; ) {
      if (1 === r4.nodeType) {
        if (r4.hasAttributes()) for (const t6 of r4.getAttributeNames()) if (t6.endsWith(h2)) {
          const i8 = v3[a3++], s5 = r4.getAttribute(t6).split(o3), e6 = /([.?@])?(.*)/.exec(i8);
          d3.push({ type: 1, index: l3, name: e6[2], strings: s5, ctor: "." === e6[1] ? I : "?" === e6[1] ? L : "@" === e6[1] ? z : H }), r4.removeAttribute(t6);
        } else t6.startsWith(o3) && (d3.push({ type: 6, index: l3 }), r4.removeAttribute(t6));
        if (y2.test(r4.tagName)) {
          const t6 = r4.textContent.split(o3), i8 = t6.length - 1;
          if (i8 > 0) {
            r4.textContent = s2 ? s2.emptyScript : "";
            for (let s5 = 0; s5 < i8; s5++) r4.append(t6[s5], c3()), P.nextNode(), d3.push({ type: 2, index: ++l3 });
            r4.append(t6[i8], c3());
          }
        }
      } else if (8 === r4.nodeType) if (r4.data === n3) d3.push({ type: 2, index: l3 });
      else {
        let t6 = -1;
        for (; -1 !== (t6 = r4.data.indexOf(o3, t6 + 1)); ) d3.push({ type: 7, index: l3 }), t6 += o3.length - 1;
      }
      l3++;
    }
  }
  static createElement(t5, i7) {
    const s5 = l2.createElement("template");
    return s5.innerHTML = t5, s5;
  }
};
function M(t5, i7, s5 = t5, e5) {
  if (i7 === E) return i7;
  let h4 = void 0 !== e5 ? s5._$Co?.[e5] : s5._$Cl;
  const o5 = a2(i7) ? void 0 : i7._$litDirective$;
  return h4?.constructor !== o5 && (h4?._$AO?.(false), void 0 === o5 ? h4 = void 0 : (h4 = new o5(t5), h4._$AT(t5, s5, e5)), void 0 !== e5 ? (s5._$Co ??= [])[e5] = h4 : s5._$Cl = h4), void 0 !== h4 && (i7 = M(t5, h4._$AS(t5, i7.values), h4, e5)), i7;
}
var R = class {
  constructor(t5, i7) {
    this._$AV = [], this._$AN = void 0, this._$AD = t5, this._$AM = i7;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t5) {
    const { el: { content: i7 }, parts: s5 } = this._$AD, e5 = (t5?.creationScope ?? l2).importNode(i7, true);
    P.currentNode = e5;
    let h4 = P.nextNode(), o5 = 0, n4 = 0, r4 = s5[0];
    for (; void 0 !== r4; ) {
      if (o5 === r4.index) {
        let i8;
        2 === r4.type ? i8 = new k(h4, h4.nextSibling, this, t5) : 1 === r4.type ? i8 = new r4.ctor(h4, r4.name, r4.strings, this, t5) : 6 === r4.type && (i8 = new Z(h4, this, t5)), this._$AV.push(i8), r4 = s5[++n4];
      }
      o5 !== r4?.index && (h4 = P.nextNode(), o5++);
    }
    return P.currentNode = l2, e5;
  }
  p(t5) {
    let i7 = 0;
    for (const s5 of this._$AV) void 0 !== s5 && (void 0 !== s5.strings ? (s5._$AI(t5, s5, i7), i7 += s5.strings.length - 2) : s5._$AI(t5[i7])), i7++;
  }
};
var k = class _k {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t5, i7, s5, e5) {
    this.type = 2, this._$AH = A, this._$AN = void 0, this._$AA = t5, this._$AB = i7, this._$AM = s5, this.options = e5, this._$Cv = e5?.isConnected ?? true;
  }
  get parentNode() {
    let t5 = this._$AA.parentNode;
    const i7 = this._$AM;
    return void 0 !== i7 && 11 === t5?.nodeType && (t5 = i7.parentNode), t5;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t5, i7 = this) {
    t5 = M(this, t5, i7), a2(t5) ? t5 === A || null == t5 || "" === t5 ? (this._$AH !== A && this._$AR(), this._$AH = A) : t5 !== this._$AH && t5 !== E && this._(t5) : void 0 !== t5._$litType$ ? this.$(t5) : void 0 !== t5.nodeType ? this.T(t5) : d2(t5) ? this.k(t5) : this._(t5);
  }
  O(t5) {
    return this._$AA.parentNode.insertBefore(t5, this._$AB);
  }
  T(t5) {
    this._$AH !== t5 && (this._$AR(), this._$AH = this.O(t5));
  }
  _(t5) {
    this._$AH !== A && a2(this._$AH) ? this._$AA.nextSibling.data = t5 : this.T(l2.createTextNode(t5)), this._$AH = t5;
  }
  $(t5) {
    const { values: i7, _$litType$: s5 } = t5, e5 = "number" == typeof s5 ? this._$AC(t5) : (void 0 === s5.el && (s5.el = S2.createElement(V(s5.h, s5.h[0]), this.options)), s5);
    if (this._$AH?._$AD === e5) this._$AH.p(i7);
    else {
      const t6 = new R(e5, this), s6 = t6.u(this.options);
      t6.p(i7), this.T(s6), this._$AH = t6;
    }
  }
  _$AC(t5) {
    let i7 = C.get(t5.strings);
    return void 0 === i7 && C.set(t5.strings, i7 = new S2(t5)), i7;
  }
  k(t5) {
    u2(this._$AH) || (this._$AH = [], this._$AR());
    const i7 = this._$AH;
    let s5, e5 = 0;
    for (const h4 of t5) e5 === i7.length ? i7.push(s5 = new _k(this.O(c3()), this.O(c3()), this, this.options)) : s5 = i7[e5], s5._$AI(h4), e5++;
    e5 < i7.length && (this._$AR(s5 && s5._$AB.nextSibling, e5), i7.length = e5);
  }
  _$AR(t5 = this._$AA.nextSibling, s5) {
    for (this._$AP?.(false, true, s5); t5 !== this._$AB; ) {
      const s6 = i3(t5).nextSibling;
      i3(t5).remove(), t5 = s6;
    }
  }
  setConnected(t5) {
    void 0 === this._$AM && (this._$Cv = t5, this._$AP?.(t5));
  }
};
var H = class {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t5, i7, s5, e5, h4) {
    this.type = 1, this._$AH = A, this._$AN = void 0, this.element = t5, this.name = i7, this._$AM = e5, this.options = h4, s5.length > 2 || "" !== s5[0] || "" !== s5[1] ? (this._$AH = Array(s5.length - 1).fill(new String()), this.strings = s5) : this._$AH = A;
  }
  _$AI(t5, i7 = this, s5, e5) {
    const h4 = this.strings;
    let o5 = false;
    if (void 0 === h4) t5 = M(this, t5, i7, 0), o5 = !a2(t5) || t5 !== this._$AH && t5 !== E, o5 && (this._$AH = t5);
    else {
      const e6 = t5;
      let n4, r4;
      for (t5 = h4[0], n4 = 0; n4 < h4.length - 1; n4++) r4 = M(this, e6[s5 + n4], i7, n4), r4 === E && (r4 = this._$AH[n4]), o5 ||= !a2(r4) || r4 !== this._$AH[n4], r4 === A ? t5 = A : t5 !== A && (t5 += (r4 ?? "") + h4[n4 + 1]), this._$AH[n4] = r4;
    }
    o5 && !e5 && this.j(t5);
  }
  j(t5) {
    t5 === A ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t5 ?? "");
  }
};
var I = class extends H {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t5) {
    this.element[this.name] = t5 === A ? void 0 : t5;
  }
};
var L = class extends H {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t5) {
    this.element.toggleAttribute(this.name, !!t5 && t5 !== A);
  }
};
var z = class extends H {
  constructor(t5, i7, s5, e5, h4) {
    super(t5, i7, s5, e5, h4), this.type = 5;
  }
  _$AI(t5, i7 = this) {
    if ((t5 = M(this, t5, i7, 0) ?? A) === E) return;
    const s5 = this._$AH, e5 = t5 === A && s5 !== A || t5.capture !== s5.capture || t5.once !== s5.once || t5.passive !== s5.passive, h4 = t5 !== A && (s5 === A || e5);
    e5 && this.element.removeEventListener(this.name, this, s5), h4 && this.element.addEventListener(this.name, this, t5), this._$AH = t5;
  }
  handleEvent(t5) {
    "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t5) : this._$AH.handleEvent(t5);
  }
};
var Z = class {
  constructor(t5, i7, s5) {
    this.element = t5, this.type = 6, this._$AN = void 0, this._$AM = i7, this.options = s5;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t5) {
    M(this, t5);
  }
};
var j = { M: h2, P: o3, A: n3, C: 1, L: N, R, D: d2, V: M, I: k, H, N: L, U: z, B: I, F: Z };
var B = t2.litHtmlPolyfillSupport;
B?.(S2, k), (t2.litHtmlVersions ??= []).push("3.3.3");
var D = (t5, i7, s5) => {
  const e5 = s5?.renderBefore ?? i7;
  let h4 = e5._$litPart$;
  if (void 0 === h4) {
    const t6 = s5?.renderBefore ?? null;
    e5._$litPart$ = h4 = new k(i7.insertBefore(c3(), t6), t6, void 0, s5 ?? {});
  }
  return h4._$AI(t5), h4;
};

// node_modules/lit-element/lit-element.js
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
var s3 = globalThis;
var i4 = class extends y {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const t5 = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= t5.firstChild, t5;
  }
  update(t5) {
    const r4 = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t5), this._$Do = D(r4, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    super.connectedCallback(), this._$Do?.setConnected(true);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._$Do?.setConnected(false);
  }
  render() {
    return E;
  }
};
i4._$litElement$ = true, i4["finalized"] = true, s3.litElementHydrateSupport?.({ LitElement: i4 });
var o4 = s3.litElementPolyfillSupport;
o4?.({ LitElement: i4 });
(s3.litElementVersions ??= []).push("4.2.2");

// node_modules/lit-html/is-server.js
/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

// node_modules/lit-html/directive.js
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
var t3 = { ATTRIBUTE: 1, CHILD: 2, PROPERTY: 3, BOOLEAN_ATTRIBUTE: 4, EVENT: 5, ELEMENT: 6 };
var e4 = (t5) => (...e5) => ({ _$litDirective$: t5, values: e5 });
var i5 = class {
  constructor(t5) {
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AT(t5, e5, i7) {
    this._$Ct = t5, this._$AM = e5, this._$Ci = i7;
  }
  _$AS(t5, e5) {
    return this.update(t5, e5);
  }
  update(t5, e5) {
    return this.render(...e5);
  }
};

// node_modules/lit-html/directive-helpers.js
/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
var { I: t4 } = j;
var i6 = (o5) => o5;
var s4 = () => document.createComment("");
var v2 = (o5, n4, e5) => {
  const l3 = o5._$AA.parentNode, d3 = void 0 === n4 ? o5._$AB : n4._$AA;
  if (void 0 === e5) {
    const i7 = l3.insertBefore(s4(), d3), n5 = l3.insertBefore(s4(), d3);
    e5 = new t4(i7, n5, o5, o5.options);
  } else {
    const t5 = e5._$AB.nextSibling, n5 = e5._$AM, c5 = n5 !== o5;
    if (c5) {
      let t6;
      e5._$AQ?.(o5), e5._$AM = o5, void 0 !== e5._$AP && (t6 = o5._$AU) !== n5._$AU && e5._$AP(t6);
    }
    if (t5 !== d3 || c5) {
      let o6 = e5._$AA;
      for (; o6 !== t5; ) {
        const t6 = i6(o6).nextSibling;
        i6(l3).insertBefore(o6, d3), o6 = t6;
      }
    }
  }
  return e5;
};
var u3 = (o5, t5, i7 = o5) => (o5._$AI(t5, i7), o5);
var m2 = {};
var p3 = (o5, t5 = m2) => o5._$AH = t5;
var M2 = (o5) => o5._$AH;
var h3 = (o5) => {
  o5._$AR(), o5._$AA.remove();
};

// node_modules/lit-html/directives/repeat.js
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
var u4 = (e5, s5, t5) => {
  const r4 = /* @__PURE__ */ new Map();
  for (let l3 = s5; l3 <= t5; l3++) r4.set(e5[l3], l3);
  return r4;
};
var c4 = e4(class extends i5 {
  constructor(e5) {
    if (super(e5), e5.type !== t3.CHILD) throw Error("repeat() can only be used in text expressions");
  }
  dt(e5, s5, t5) {
    let r4;
    void 0 === t5 ? t5 = s5 : void 0 !== s5 && (r4 = s5);
    const l3 = [], o5 = [];
    let i7 = 0;
    for (const s6 of e5) l3[i7] = r4 ? r4(s6, i7) : i7, o5[i7] = t5(s6, i7), i7++;
    return { values: o5, keys: l3 };
  }
  render(e5, s5, t5) {
    return this.dt(e5, s5, t5).values;
  }
  update(s5, [t5, r4, c5]) {
    const d3 = M2(s5), { values: p4, keys: a3 } = this.dt(t5, r4, c5);
    if (!Array.isArray(d3)) return this.ut = a3, p4;
    const h4 = this.ut ??= [], v3 = [];
    let m3, y3, x2 = 0, j2 = d3.length - 1, k2 = 0, w2 = p4.length - 1;
    for (; x2 <= j2 && k2 <= w2; ) if (null === d3[x2]) x2++;
    else if (null === d3[j2]) j2--;
    else if (h4[x2] === a3[k2]) v3[k2] = u3(d3[x2], p4[k2]), x2++, k2++;
    else if (h4[j2] === a3[w2]) v3[w2] = u3(d3[j2], p4[w2]), j2--, w2--;
    else if (h4[x2] === a3[w2]) v3[w2] = u3(d3[x2], p4[w2]), v2(s5, v3[w2 + 1], d3[x2]), x2++, w2--;
    else if (h4[j2] === a3[k2]) v3[k2] = u3(d3[j2], p4[k2]), v2(s5, d3[x2], d3[j2]), j2--, k2++;
    else if (void 0 === m3 && (m3 = u4(a3, k2, w2), y3 = u4(h4, x2, j2)), m3.has(h4[x2])) if (m3.has(h4[j2])) {
      const e5 = y3.get(a3[k2]), t6 = void 0 !== e5 ? d3[e5] : null;
      if (null === t6) {
        const e6 = v2(s5, d3[x2]);
        u3(e6, p4[k2]), v3[k2] = e6;
      } else v3[k2] = u3(t6, p4[k2]), v2(s5, d3[x2], t6), d3[e5] = null;
      k2++;
    } else h3(d3[j2]), j2--;
    else h3(d3[x2]), x2++;
    for (; k2 <= w2; ) {
      const e5 = v2(s5, v3[w2 + 1]);
      u3(e5, p4[k2]), v3[k2++] = e5;
    }
    for (; x2 <= j2; ) {
      const e5 = d3[x2++];
      null !== e5 && h3(e5);
    }
    return this.ut = a3, p3(s5, v3), E;
  }
});

// src/cards/player-card/player-queue.ts
function dropIndex(mids, from, center) {
  let to = from;
  for (let k2 = from + 1; k2 < mids.length && center > mids[k2]; k2++) to = k2;
  for (let k2 = from - 1; k2 >= 0 && center < mids[k2]; k2--) to = k2;
  return to;
}
var MaPlayerQueue = class extends i4 {
  static properties = {
    backend: { attribute: false },
    entity: {},
    limit: { type: Number },
    language: {},
    queue: { state: true },
    status: { state: true },
    error: { state: true }
  };
  t = translator("en");
  drag = null;
  /** A change is being sent: a reload would bring back the old order. */
  busy = false;
  /** Swallows the click that follows a drag. */
  justDragged = false;
  constructor() {
    super();
    this.limit = 50;
    this.language = "en";
    this.queue = null;
    this.status = "idle";
    this.error = "";
  }
  async refresh(withItems = true) {
    const { backend, entity } = this;
    if (!backend || !entity || this.drag || this.busy) return;
    if (withItems && !this.queue) this.status = "loading";
    try {
      const info = await backend.queue.info(entity);
      const upcoming = withItems ? await backend.queue.items(entity, info, this.limit) : this.queue?.upcoming ?? [];
      if (entity !== this.entity || this.drag || this.busy) return;
      this.queue = { current: info.current, upcoming, total: info.total, idx: info.idx };
      this.status = "ok";
      this.dispatchEvent(new CustomEvent("queue-info", { detail: info }));
    } catch (err) {
      if (entity !== this.entity) return;
      const msg = errorMessage(err);
      this.queue = null;
      this.status = /no.?active.?queue/i.test(msg) ? "empty" : "error";
      this.error = msg;
    }
  }
  willUpdate(changed) {
    if (changed.has("language")) this.t = translator(this.language);
    if (changed.has("entity") && changed.get("entity") !== void 0) {
      this.queue = null;
      this.status = "idle";
    }
  }
  // Rendering mid-drag would undo the rows' transforms.
  shouldUpdate() {
    return !this.drag;
  }
  render() {
    const { t: t5, queue: q, status, backend } = this;
    if (status === "loading") return b2`<div class="msg">${t5("queue.loading")}</div>`;
    if (status === "error") return b2`<div class="msg">${t5("queue.error")}<br />${this.error}</div>`;
    if (status === "empty" || q && !q.current && !q.upcoming.length) return b2`<div class="msg">${t5("queue.empty")}</div>`;
    if (!q || !backend) return A;
    const left = Math.max(0, q.total - (q.idx + 1));
    const more = left - q.upcoming.length;
    const partial = backend.queue.partial;
    return b2`
      ${q.current ? b2`<div class="sec">${t5("queue.now_playing")}</div>${this.row(q.current, -1)}` : A}
      <div class="sec">${t5("queue.up_next")} <span>· ${t5("queue.songs", { n: left })}</span></div>
      <div class="list">
        ${q.upcoming.length ? c4(
      q.upcoming,
      (it) => it.id,
      (it, i7) => this.row(it, i7)
    ) : b2`<div class="note">${t5("queue.no_more")}</div>`}
      </div>
      ${more > 0 && !partial ? b2`<div class="note">${t5("queue.and_more", { n: more })}</div>` : A}
      ${partial ? b2`<div class="note">${t5("queue.partial")}</div>` : A}
      ${backend.can.reorder ? b2`<div class="note">${t5("queue.hint")}</div>` : A}
      <div class="pad"></div>
    `;
  }
  /** `i` is the index in `upcoming`, or -1 for the current song. */
  row(it, i7) {
    const can = this.backend?.can;
    const current = i7 < 0;
    const tappable = !current && !!can?.playItem;
    const sub = it.artist || it.album;
    return b2`
      <div class="row ${current ? "cur" : "up"} ${tappable ? "tap" : ""}" @click=${() => tappable && this.play(i7)}>
        <div class="art">
          ${it.image ? b2`<img src=${it.image} alt="" loading="lazy" draggable="false" />` : b2`<ha-icon icon="mdi:music"></ha-icon>`}
        </div>
        <div class="text">
          <div class="title">${it.name}</div>
          ${sub ? b2`<div class="sub">${sub}</div>` : A}
        </div>
        ${it.duration ? b2`<div class="dur">${fmtTime(it.duration)}</div>` : A}
        ${!current && can?.remove ? b2`<button class="btn del" aria-label=${this.t("queue.remove")} @click=${(e5) => this.onRemove(e5, i7)}>
                <ha-icon icon="mdi:minus-circle-outline"></ha-icon>
              </button>` : A}
        ${!current && can?.reorder ? b2`<div
                class="btn handle"
                aria-label=${this.t("queue.drag")}
                @click=${(e5) => e5.stopPropagation()}
                @pointerdown=${(e5) => this.startDrag(e5, i7)}
                @pointermove=${this.moveDrag}
                @pointerup=${this.endDrag}
                @pointercancel=${this.endDrag}
              >
                <ha-icon icon="mdi:drag-horizontal-variant"></ha-icon>
              </div>` : A}
      </div>
    `;
  }
  startDrag(e5, from) {
    if (e5.button > 0) return;
    const handle = e5.currentTarget;
    const row = handle.closest(".row");
    const rows = [...this.renderRoot.querySelectorAll(".row.up")];
    if (!row) return;
    e5.preventDefault();
    handle.setPointerCapture(e5.pointerId);
    const rects = rows.map((r4) => r4.getBoundingClientRect());
    this.drag = {
      row,
      rows,
      mids: rects.map((r4) => r4.top + r4.height / 2),
      from,
      to: from,
      startY: e5.clientY,
      startScroll: this.scrollTop,
      height: rects[from].height
    };
    row.classList.add("dragging");
    haptic(this, "selection");
  }
  moveDrag = (e5) => {
    const d3 = this.drag;
    if (!d3) return;
    const box = this.getBoundingClientRect();
    if (e5.clientY < box.top + 50) this.scrollTop -= 8;
    else if (e5.clientY > box.bottom - 50) this.scrollTop += 8;
    const dy = e5.clientY - d3.startY + (this.scrollTop - d3.startScroll);
    d3.row.style.transform = `translateY(${dy}px)`;
    const to = dropIndex(d3.mids, d3.from, d3.mids[d3.from] + dy);
    if (to !== d3.to) haptic(this, "selection");
    d3.to = to;
    d3.rows.forEach((r4, k2) => {
      if (k2 === d3.from) return;
      const shift = d3.from < k2 && k2 <= to ? -d3.height : to <= k2 && k2 < d3.from ? d3.height : 0;
      r4.style.transform = shift ? `translateY(${shift}px)` : "";
    });
  };
  endDrag = async () => {
    const d3 = this.drag;
    if (!d3) return;
    this.drag = null;
    this.justDragged = true;
    setTimeout(() => this.justDragged = false, 50);
    this.toggleAttribute("settling", true);
    for (const r4 of d3.rows) r4.style.transform = "";
    d3.row.classList.remove("dragging");
    if (d3.to !== d3.from) this.move(d3.from, d3.to);
    else this.requestUpdate();
    await this.updateComplete;
    requestAnimationFrame(() => this.toggleAttribute("settling", false));
  };
  onRemove(e5, i7) {
    e5.stopPropagation();
    const q = this.queue;
    if (!q) return;
    const item = q.upcoming[i7];
    haptic(this, "light");
    this.apply(
      this.t("queue.remove"),
      { ...q, upcoming: q.upcoming.filter((_2, k2) => k2 !== i7), total: q.total - 1 },
      (be, entity) => be.queue.remove(entity, item.id)
    );
  }
  move(from, to) {
    const q = this.queue;
    if (!q) return;
    const item = q.upcoming[from];
    const upcoming = [...q.upcoming];
    upcoming.splice(from, 1);
    upcoming.splice(to, 0, item);
    this.apply(this.t("queue.move"), { ...q, upcoming }, (be, entity) => be.queue.moveTo(entity, item.id, from, to));
  }
  async play(i7) {
    const { backend, entity, queue } = this;
    const item = queue?.upcoming[i7];
    if (this.justDragged || !backend || !entity || !item) return;
    haptic(this, "light");
    try {
      await backend.queue.play(entity, item.id);
      this.toast({ title: item.name, image: item.image, text: this.t("common.playing"), icon: "mdi:play-circle" });
    } catch (err) {
      this.toast({ title: item.name, image: item.image, text: errorMessage(err), icon: "mdi:alert-circle", error: true });
    }
  }
  async apply(label, next, run) {
    const { backend, entity } = this;
    if (!backend || !entity) return;
    const backup = this.queue;
    this.queue = next;
    this.busy = true;
    try {
      await run(backend, entity);
    } catch (err) {
      console.error(`[ma-player-card] ${label}`, err);
      this.queue = backup;
      this.toast({ title: label, text: errorMessage(err), icon: "mdi:alert-circle", error: true });
    }
    this.busy = false;
    this.refresh(true);
  }
  toast(spec) {
    this.dispatchEvent(new CustomEvent("toast", { detail: spec }));
  }
  static styles = i`
    .msg {
      height: 100%;
      display: grid;
      place-items: center;
      text-align: center;
      padding: 0 24px;
      font-size: 17px;
      color: var(--np-dim);
    }
    .sec {
      margin: 22px 0 6px;
      font-size: 16px;
      font-weight: 700;
    }
    .sec span {
      font-weight: 400;
      color: var(--np-dim);
    }
    .list {
      position: relative;
    }
    .row {
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 60px;
      border-bottom: 0.5px solid rgba(255, 255, 255, 0.12);
    }
    .row.cur {
      border: 0;
    }
    .row.up {
      position: relative;
      background: transparent;
      transition: transform 0.18s ease;
    }
    :host([settling]) .row.up {
      transition: none;
    }
    .row.tap {
      cursor: pointer;
    }
    .row.tap:active {
      background: rgba(255, 255, 255, 0.06);
    }
    .row.dragging {
      transition: none;
      z-index: 2;
      background: rgba(60, 60, 60, 0.85);
      border-radius: 10px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
    }
    .art {
      width: 46px;
      height: 46px;
      flex: 0 0 46px;
      border-radius: 6px;
      overflow: hidden;
      display: grid;
      place-items: center;
      background: var(--np-fill);
    }
    .art img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .art ha-icon {
      color: var(--np-dim);
    }
    .text {
      flex: 1;
      min-width: 0;
    }
    .title,
    .sub {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .title {
      font-size: 15px;
    }
    .sub,
    .dur {
      font-size: 13px;
      color: var(--np-dim);
    }
    .dur {
      font-variant-numeric: tabular-nums;
    }
    .note {
      padding: 14px 0;
      color: var(--np-dim);
      font-size: 14px;
    }
    .pad {
      height: 48px;
    }
    .btn {
      width: 44px;
      height: 44px;
      flex: 0 0 44px;
      display: grid;
      place-items: center;
      border: 0;
      padding: 0;
      background: none;
      color: var(--np-dim);
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }
    .del {
      color: #ff6b6b;
      width: 36px;
      flex-basis: 36px;
    }
    .handle {
      touch-action: none;
      cursor: grab;
    }
    .row.dragging .handle {
      cursor: grabbing;
      color: #fff;
    }
  `;
};

// src/components/action-sheet.ts
var STYLES2 = `
  :host { display: contents; }
  :host([dark]) { ${DARK_VARS} }
  dialog { border: 0; padding: 0; background: transparent; overflow: visible;
    width: min(400px, calc(100vw - 24px)); max-height: calc(100dvh - 32px); color: var(--primary-text-color); }
  dialog::backdrop { background: rgba(0, 0, 0, .3); -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); }
  dialog[open] { animation: menuIn .22s cubic-bezier(.2, .9, .3, 1.2); }
  @keyframes menuIn { from { transform: scale(.94); opacity: 0; } to { transform: none; opacity: 1; } }
  .sheet { display: block; width: 100%; border-radius: 16px; overflow: hidden;
    background: var(--glass); -webkit-backdrop-filter: var(--blur); backdrop-filter: var(--blur);
    box-shadow: 0 16px 48px rgba(0, 0, 0, .28); }
  .sheet:first-child { max-height: calc(100dvh - 120px); overflow-y: auto; }
  .head { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: .5px solid var(--sep); }
  .art { width: 56px; height: 56px; flex: 0 0 56px; border-radius: 8px; overflow: hidden;
    background: var(--fill); display: grid; place-items: center; }
  .art.round { border-radius: 50%; }
  .art img { width: 100%; height: 100%; object-fit: cover; }
  .meta { min-width: 0; }
  .title { font-weight: 600; font-size: 16px; }
  .sub { font-size: 13px; color: var(--secondary-text-color); }
  .opt { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px;
    height: 54px; padding: 0 18px; border: 0; cursor: pointer; font: inherit; font-size: 17px;
    background: transparent; color: var(--primary-text-color); text-align: left; }
  .opt + .opt, .more-list .opt { border-top: .5px solid var(--sep); }
  .opt ha-icon { color: var(--accent); }
  .opt:active { background: var(--fill); }
  .opt:focus, .cancel:focus { outline: none; }
  .opt:focus-visible { background: var(--fill); }
  .cancel { margin-top: 8px; height: 56px; border: 0; cursor: pointer; font: inherit; font-size: 17px;
    font-weight: 600; color: var(--accent); }
  .cancel:active { filter: brightness(.95); }
  .choice { justify-content: flex-start; height: auto; min-height: 60px; padding: 8px 18px; }
  .choice[disabled] { opacity: .45; cursor: default; }
  .choice .c-icon { color: var(--secondary-text-color); }
  .choice .c-icon.on { color: var(--accent); }
  .c-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .c-name { font-size: 17px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .c-sub { font-size: 13px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .choice.sel .c-name { font-weight: 600; }
  .more-toggle { color: var(--secondary-text-color); font-size: 15px; height: 48px; }
  .more-toggle ha-icon { color: var(--secondary-text-color); transition: transform .2s; }
  .more-toggle[aria-expanded="true"] ha-icon { transform: rotate(180deg); }
  .more-list { display: none; }
  .more-toggle[aria-expanded="true"] + .more-list { display: block; }

  @media (max-width: 600px) {
    dialog { margin: auto auto max(12px, env(safe-area-inset-bottom)); }
    dialog[open] { animation: sheetUp .28s cubic-bezier(.2, .9, .3, 1); }
    @keyframes sheetUp { from { transform: translateY(40px); opacity: 0; } to { transform: none; opacity: 1; } }
  }
`;
var headerHtml = (h4) => {
  const art = h4.image ? `<div class="art ${h4.round ? "round" : ""}"><img src="${esc(h4.image)}" alt="" /></div>` : h4.icon ? `<div class="art ${h4.round ? "round" : ""}"><ha-icon icon="${esc(h4.icon)}"></ha-icon></div>` : "";
  return `<div class="head">${art}<div class="meta"><div class="title">${esc(h4.title)}</div>${h4.subtitle ? `<div class="sub">${esc(h4.subtitle)}</div>` : ""}</div></div>`;
};
var actionHtml = (a3) => `<button class="opt" data-key="${esc(a3.key)}"><span>${esc(a3.label)}</span>${a3.icon ? `<ha-icon icon="${esc(a3.icon)}"></ha-icon>` : ""}</button>`;
var choiceHtml = (c5) => `<button class="opt choice ${c5.selected ? "sel" : ""}" data-key="${esc(c5.key)}" ${c5.disabled ? "disabled" : ""}>
    <ha-icon class="c-icon ${c5.active ? "on" : ""}" icon="${esc(c5.icon)}"></ha-icon>
    <span class="c-text"><span class="c-name">${esc(c5.label)}</span>${c5.sublabel ? `<span class="c-sub">${esc(c5.sublabel)}</span>` : ""}</span>
    ${c5.selected ? `<ha-icon class="c-check" icon="mdi:check"></ha-icon>` : ""}
  </button>`;
var MaActionSheet = class extends HTMLElement {
  dialog;
  overlay;
  result = null;
  resolve;
  constructor() {
    super();
    const root = this.attachShadow({ mode: "open" });
    root.innerHTML = `<style>${STYLES2}</style><dialog></dialog>`;
    this.dialog = root.querySelector("dialog");
    this.overlay = new OverlayHistory(this.dialog, `sheet-${nextInstanceId()}`);
    this.dialog.addEventListener("close", () => this.settle());
    this.dialog.addEventListener("click", (e5) => {
      if (e5.target === this.dialog) return this.overlay.close();
      const btn = e5.target.closest("button");
      if (!btn || btn.disabled) return;
      if (btn.classList.contains("more-toggle")) {
        btn.setAttribute("aria-expanded", String(btn.getAttribute("aria-expanded") !== "true"));
        return;
      }
      this.result = btn.dataset.key ?? null;
      this.overlay.close();
    });
  }
  disconnectedCallback() {
    this.overlay.close();
  }
  get isOpen() {
    return this.overlay.isOpen;
  }
  show(spec) {
    this.settle();
    const { header, actions = [], choices = [], more, cancelLabel = "Cancel" } = spec;
    this.dialog.innerHTML = `
      <div class="sheet">
        ${header ? headerHtml(header) : ""}
        ${actions.map(actionHtml).join("")}
        ${choices.map(choiceHtml).join("")}
        ${more?.choices.length ? `<button class="opt more-toggle" aria-expanded="false"><span>${esc(more.label)}</span>
                 <ha-icon icon="mdi:chevron-down"></ha-icon></button>
               <div class="more-list">${more.choices.map(choiceHtml).join("")}</div>` : ""}
      </div>
      <button class="sheet cancel">${esc(cancelLabel)}</button>`;
    this.result = null;
    const p4 = new Promise((resolve) => {
      this.resolve = resolve;
    });
    if (!this.overlay.open()) this.dialog.scrollTop = 0;
    return p4;
  }
  close() {
    this.overlay.close();
  }
  settle() {
    const resolve = this.resolve;
    this.resolve = void 0;
    resolve?.(this.result);
    this.result = null;
  }
};

// src/components/toast.ts
var STYLES3 = `
  :host { display: contents; }
  :host([dark]) { ${DARK_VARS} }
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
`;
var MaToast = class extends HTMLElement {
  el;
  timer;
  constructor() {
    super();
    const root = this.attachShadow({ mode: "open" });
    root.innerHTML = `<style>${STYLES3}</style><div class="toast" popover="manual" role="status"></div>`;
    this.el = root.querySelector(".toast");
  }
  disconnectedCallback() {
    clearTimeout(this.timer);
  }
  show({ title, text, icon, image, error = false }) {
    const t5 = this.el;
    t5.className = `toast ${error ? "error" : ""}`;
    t5.innerHTML = `
      ${image ? `<img src="${esc(image)}" alt="" />` : `<ha-icon icon="${esc(icon)}"></ha-icon>`}
      <span class="t-text"><span class="t-title">${esc(title)}</span><span class="t-sub">${esc(text)}</span></span>
      ${image ? `<ha-icon class="t-icon" icon="${esc(icon)}"></ha-icon>` : ""}`;
    clearTimeout(this.timer);
    try {
      if (t5.showPopover) {
        if (t5.matches(":popover-open")) t5.hidePopover();
        t5.showPopover();
      } else t5.classList.add("show");
    } catch (_2) {
      t5.classList.add("show");
    }
    this.timer = setTimeout(() => this.hide(), error ? 4500 : 2600);
  }
  hide() {
    const t5 = this.el;
    try {
      if (t5.hidePopover && t5.matches(":popover-open")) t5.hidePopover();
    } catch (_2) {
    }
    t5.classList.remove("show");
  }
};

// src/main.ts
var defineOnce = (name, cls) => {
  if (!customElements.get(name)) customElements.define(name, cls);
};
defineOnce("ma-player-toast", MaToast);
defineOnce("ma-player-action-sheet", MaActionSheet);
defineOnce("ma-player-queue", MaPlayerQueue);
defineOnce("ma-browser-card", MaBrowserCard);
defineOnce("ma-player-card", MaPlayerCard);
window.customCards = window.customCards || [];
var customCards = window.customCards;
for (const card of [
  {
    type: "ma-player-card",
    name: "Music Assistant – Player",
    description: "What's playing, controls, queue, synced lyrics and a music browser."
  },
  {
    type: "ma-browser-card",
    name: "Music Assistant – Browser",
    description: "Search songs, artists, albums, playlists and radio, and play them on a speaker."
  }
]) {
  if (!customCards.some((c5) => c5.type === card.type)) {
    customCards.push({
      ...card,
      preview: true,
      documentationURL: "https://www.home-assistant.io/integrations/music_assistant/"
    });
  }
}
console.info(`%c MA-PLAYER-CARD %c v${VERSION} `, "background:#fa2d48;color:#fff;border-radius:4px 0 0 4px", "");
