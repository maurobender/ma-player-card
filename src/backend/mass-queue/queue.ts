import type { HassGetter } from "../../models/hass.js";
import { callWithResponse, forEntity } from "../call.js";
import type { NativeQueue } from "../native/queue.js";
import type { QueueApi, QueueInfo, QueueItem } from "../types.js";

/** Ítem de mass_queue.get_queue_items (no trae la duración). */
export interface MassQueueItem {
  queue_item_id: string;
  media_title?: string;
  media_artist?: string;
  media_album_name?: string;
  media_image?: string;
  local_image_encoded?: string;
  favorite?: boolean;
}

export function fromMassQueue(x: MassQueueItem): QueueItem {
  return {
    id: x.queue_item_id,
    name: x.media_title || "",
    artist: x.media_artist || "",
    album: x.media_album_name || "",
    image: x.media_image || (x.local_image_encoded ? `data:image/jpeg;base64,${x.local_image_encoded}` : ""),
    duration: 0,
    favorite: x.favorite,
  };
}

/**
 * Los pasos para llevar una canción de `from` a `to` con las acciones de mass_queue,
 * que solo saben "subir uno", "bajar uno" y "poner a continuación".
 */
export function moveSteps(from: number, to: number): ("up" | "down" | "next")[] {
  if (from === to) return [];
  if (to === 0) return ["next"];
  return Array<"up" | "down">(Math.abs(to - from)).fill(to < from ? "up" : "down");
}

/**
 * Cola editable con mass_queue (HACS). La posición actual y el total los sigue dando la
 * integración oficial; mass_queue aporta la lista completa y las acciones para editarla.
 */
export class MassQueueQueue implements QueueApi {
  readonly can = { reorder: true, remove: true, playItem: true };
  readonly partial = false;

  constructor(
    private readonly hass: HassGetter,
    private readonly native: NativeQueue,
  ) {}

  private async call(service: string, data: Record<string, unknown>): Promise<void> {
    await this.hass().callService("mass_queue", service, data);
  }

  info(entity: string): Promise<QueueInfo> {
    return this.native.info(entity);
  }

  async items(entity: string, info: QueueInfo, limit: number): Promise<QueueItem[]> {
    if (info.total <= info.idx + 1) return [];
    // mass_queue identifica al parlante con el campo `entity`, no con un target
    const r = await callWithResponse<Record<string, unknown>>(this.hass(), "mass_queue", "get_queue_items", {
      entity,
      offset: info.idx + 1,
      limit,
    });
    const list = forEntity<MassQueueItem[] | Record<string, unknown>>(r, entity);
    return Array.isArray(list) ? list.map(fromMassQueue) : [];
  }

  async moveTo(entity: string, id: string, from: number, to: number): Promise<void> {
    for (const dir of moveSteps(from, to)) await this.call(`move_queue_item_${dir}`, { entity, queue_item_id: id });
  }

  remove(entity: string, id: string): Promise<void> {
    return this.call("remove_queue_item", { entity, queue_item_id: id });
  }

  play(entity: string, id: string): Promise<void> {
    return this.call("play_queue_item", { entity, queue_item_id: id });
  }
}
