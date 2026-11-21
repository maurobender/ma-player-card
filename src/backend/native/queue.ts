import type { HassGetter } from "../../models/hass.js";
import { names } from "../../utils/format.js";
import { callWithResponse, errorMessage, forEntity } from "../call.js";
import { type QueueApi, type QueueInfo, type QueueItem, UnsupportedError } from "../types.js";

/** Lo que devuelve music_assistant.get_queue (solo lo que usamos). */
interface NativeQueueState {
  current_index?: number | null;
  items?: number;
  elapsed_time?: number;
  current_item?: NativeQueueItem | null;
  next_item?: NativeQueueItem | null;
  queue_items?: NativeQueueItem[];
}

interface NativeQueueItem {
  queue_item_id: string;
  name?: string;
  duration?: number;
  media_item?: {
    name?: string;
    image?: string;
    artists?: { name: string }[];
    album?: { name?: string } | null;
    favorite?: boolean;
  };
}

export function fromNative(qi: NativeQueueItem | null | undefined): QueueItem | null {
  if (!qi) return null;
  const mi = qi.media_item || {};
  return {
    id: qi.queue_item_id,
    name: mi.name || qi.name || "",
    artist: names(mi.artists),
    album: mi.album?.name || "",
    image: mi.image || "",
    duration: qi.duration || 0,
    favorite: mi.favorite,
  };
}

/** Cola de solo lectura con la integración oficial. */
export class NativeQueue implements QueueApi {
  readonly can = { reorder: false, remove: false, playItem: false };
  /** ¿get_queue acepta limit/offset? (HA de noviembre de 2026 en adelante). undefined = no sabemos aún. */
  private itemsSupported: boolean | undefined;

  constructor(private readonly hass: HassGetter) {}

  get partial(): boolean {
    return this.itemsSupported === false;
  }

  private async getQueue(entity: string, data: Record<string, unknown> = {}): Promise<NativeQueueState> {
    const r = await callWithResponse<Record<string, unknown>>(this.hass(), "music_assistant", "get_queue", data, entity);
    return forEntity<NativeQueueState>(r, entity);
  }

  async info(entity: string): Promise<QueueInfo> {
    const q = await this.getQueue(entity);
    return {
      current: fromNative(q.current_item),
      next: fromNative(q.next_item),
      idx: q.current_index == null ? -1 : q.current_index,
      total: q.items || 0,
      elapsed: q.elapsed_time,
    };
  }

  async items(entity: string, info: QueueInfo, limit: number): Promise<QueueItem[]> {
    if (info.total <= info.idx + 1) return [];
    if (this.itemsSupported !== false) {
      try {
        const more = await this.getQueue(entity, { offset: info.idx + 1, limit });
        this.itemsSupported = true;
        return (more.queue_items || []).map(fromNative).filter((x): x is QueueItem => !!x);
      } catch (err) {
        if (!/not a valid option|extra keys/i.test(errorMessage(err))) throw err;
        this.itemsSupported = false; // versión anterior: solo sabemos la próxima
      }
    }
    return info.next ? [info.next] : [];
  }

  async moveTo(): Promise<void> {
    throw new UnsupportedError("La integración oficial no permite mover canciones de la cola");
  }

  async remove(): Promise<void> {
    throw new UnsupportedError("La integración oficial no permite quitar canciones de la cola");
  }

  async play(): Promise<void> {
    throw new UnsupportedError("La integración oficial no permite saltar a una canción de la cola");
  }
}
