import type { HassGetter } from "../../models/hass.js";
import { callWithResponse } from "../call.js";
import type { NativeLibrary } from "../native/library.js";
import type { BrowseTarget, Enqueue, LibraryApi, LibraryQuery, MaMediaItem, MediaType, SearchOptions } from "../types.js";

/** mass_queue.get_podcast_episodes item. */
export interface MassQueueEpisode {
  media_title?: string;
  media_content_id: string;
  media_image?: string;
  local_image_encoded?: string;
  duration?: number;
  release_date?: string | null;
}

export function fromEpisode(x: MassQueueEpisode): MaMediaItem {
  return {
    uri: x.media_content_id,
    name: x.media_title || "",
    media_type: "podcast_episode",
    image: x.media_image || (x.local_image_encoded ? `data:image/jpeg;base64,${x.local_image_encoded}` : null),
    duration: x.duration || 0,
    release_date: x.release_date || null,
  };
}

// Shared by every card on the page.
let entryId: Promise<string> | null = null;

/** The official library, plus podcast episodes, which only mass_queue can list. */
export class MassQueueLibrary implements LibraryApi {
  constructor(
    private readonly hass: HassGetter,
    private readonly native: NativeLibrary,
  ) {}

  search(query: string, type: MediaType, options: SearchOptions): Promise<MaMediaItem[]> {
    return this.native.search(query, type, options);
  }

  getLibrary(query: LibraryQuery): Promise<MaMediaItem[]> {
    return this.native.getLibrary(query);
  }

  play(entity: string, item: { uri: string | string[]; mediaType: MediaType }, enqueue: Enqueue): Promise<void> {
    return this.native.play(entity, item, enqueue);
  }

  canBrowse(type: MediaType): boolean {
    return type === "podcast" || this.native.canBrowse(type);
  }

  async browse(entity: string, item: BrowseTarget): Promise<MaMediaItem[]> {
    if (item.mediaType !== "podcast") return this.native.browse(entity, item);
    const r = await callWithResponse<{ episodes?: MassQueueEpisode[] }>(this.hass(), "mass_queue", "get_podcast_episodes", {
      config_entry_id: await this.entryId(),
      uri: item.uri,
    });
    return (r.episodes || []).map(fromEpisode);
  }

  /** mass_queue's own integration entry (not Music Assistant's). */
  private entryId(): Promise<string> {
    if (!entryId) {
      entryId = this.hass()
        .callWS<{ entry_id: string; state?: string }[]>({ type: "config_entries/get", domain: "mass_queue" })
        .then((entries) => {
          const e = entries.find((x) => x.state === "loaded") || entries[0];
          if (!e) throw new Error("mass_queue integration not found");
          return e.entry_id;
        });
      entryId.catch(() => (entryId = null));
    }
    return entryId;
  }
}
