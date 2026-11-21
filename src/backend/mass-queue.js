// Backend que suma la integración mass_queue (HACS) a la oficial.

import { NativeBackend } from "./native.js";

export class MassQueueBackend extends NativeBackend {
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
      type: "call_service",
      domain: "mass_queue",
      service: "get_queue_items",
      service_data: { entity: ent, offset: info.idx + 1, limit },
      return_response: true,
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
