import { names } from "../utils/format.js";

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

export class NativeBackend {
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
      type: "call_service",
      domain: "music_assistant",
      service: "get_queue",
      target: { entity_id: ent },
      service_data: data,
      return_response: true,
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
