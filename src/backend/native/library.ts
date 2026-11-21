import { TYPES } from "../../constants.js";
import type { HassGetter } from "../../models/hass.js";
import { callWithResponse } from "../call.js";
import type { Enqueue, LibraryApi, LibraryQuery, MaMediaItem, MediaType, SearchOptions } from "../types.js";

// Shared by every card on the page.
const entryIds = new Map<string, Promise<string>>();

export class NativeLibrary implements LibraryApi {
  constructor(
    private readonly hass: HassGetter,
    /** Used to find the integration entry (config_entry_id). */
    private readonly entity: string,
    private readonly configEntryId?: string,
  ) {}

  async search(query: string, type: MediaType, { limit, libraryOnly }: SearchOptions): Promise<MaMediaItem[]> {
    const data = await callWithResponse<Record<string, MaMediaItem[] | undefined>>(this.hass(), "music_assistant", "search", {
      config_entry_id: await this.entryId(),
      name: query,
      media_type: type,
      limit,
      library_only: !!libraryOnly,
    });
    return data[TYPES[type].key] || data[type] || data[`${type}s`] || [];
  }

  async getLibrary({ mediaType, limit, favorite, orderBy }: LibraryQuery): Promise<MaMediaItem[]> {
    const data = await callWithResponse<{ items?: MaMediaItem[] }>(this.hass(), "music_assistant", "get_library", {
      config_entry_id: await this.entryId(),
      media_type: mediaType,
      limit,
      ...(favorite ? { favorite: true } : {}),
      ...(orderBy ? { order_by: orderBy } : {}),
    });
    return data.items || [];
  }

  async play(entity: string, item: { uri: string; mediaType: MediaType }, enqueue: Enqueue): Promise<void> {
    await this.hass().callWS({
      type: "call_service",
      domain: "music_assistant",
      service: "play_media",
      service_data: { media_id: item.uri, media_type: item.mediaType, enqueue },
      target: { entity_id: entity },
    });
  }

  /** The entity's integration entry, or the first loaded one when that can't be read (non-admin users). */
  entryId(): Promise<string> {
    if (this.configEntryId) return Promise.resolve(this.configEntryId);
    let p = entryIds.get(this.entity);
    if (!p) {
      p = this.lookupEntryId();
      entryIds.set(this.entity, p);
      p.catch(() => entryIds.delete(this.entity));
    }
    return p;
  }

  private async lookupEntryId(): Promise<string> {
    const hass = this.hass();
    try {
      const ent = await hass.callWS<{ platform?: string; config_entry_id?: string }>({
        type: "config/entity_registry/get",
        entity_id: this.entity,
      });
      if (ent && ent.platform === "music_assistant" && ent.config_entry_id) return ent.config_entry_id;
    } catch (_) {
      /* fall back to the list of entries */
    }
    const entries = await hass.callWS<{ entry_id: string; state?: string }[]>({
      type: "config_entries/get",
      domain: "music_assistant",
    });
    const e = entries.find((x) => x.state === "loaded") || entries[0];
    if (!e) throw new Error("Music Assistant integration not found");
    return e.entry_id;
  }
}
