import { TYPES } from "../../constants.js";
import type { HassGetter } from "../../models/hass.js";
import { callWithResponse } from "../call.js";
import type { BrowseTarget, Enqueue, LibraryApi, LibraryQuery, MaMediaItem, MediaType, SearchOptions } from "../types.js";

interface BrowseMedia {
  title: string;
  media_class: string;
  media_content_id: string;
  thumbnail?: string | null;
  children?: BrowseMedia[];
}

/** Music Assistant titles its tracks and albums "<first artist> - <name>". */
export function fromBrowseMedia(b: BrowseMedia): MaMediaItem {
  const sep = b.title.indexOf(" - ");
  const artist = sep > 0 ? b.title.slice(0, sep) : "";
  return {
    uri: b.media_content_id,
    name: sep > 0 ? b.title.slice(sep + 3) : b.title,
    media_type: b.media_class in TYPES ? (b.media_class as MediaType) : undefined,
    image: b.thumbnail || null,
    artists: artist ? [{ name: artist }] : [],
  };
}

/** Songs shown on an artist's page. */
const ARTIST_TRACKS = 10;
const ARTIST_SEARCH_LIMIT = 50;

const normalize = (s: string | undefined): string => (s || "").trim().toLocaleLowerCase();

/** Providers repeat the same song or album; the first one wins. */
function uniqueByName(items: MaMediaItem[]): MaMediaItem[] {
  const seen = new Set<string>();
  return items.filter((it) => {
    const key = `${it.media_type}|${normalize(it.name)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

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

  canBrowse(type: MediaType): boolean {
    return type === "artist" || type === "album" || type === "playlist";
  }

  // Home Assistant's media browser is the only way the official integration lists what's inside an item
  async browse(entity: string, { uri, mediaType, name }: BrowseTarget): Promise<MaMediaItem[]> {
    const listing = this.hass().callWS<BrowseMedia>({
      type: "media_player/browse_media",
      entity_id: entity,
      media_content_id: uri,
      media_content_type: mediaType,
    });
    if (mediaType !== "artist") return ((await listing).children || []).map(fromBrowseMedia);
    // For an artist in the library, Music Assistant only lists the albums that are in the library too,
    // so a search fills in their songs and the albums the providers have.
    const [res, tracks, albums] = await Promise.all([
      listing,
      name ? this.searchByArtist(name, "track") : [],
      name ? this.searchByArtist(name, "album") : [],
    ]);
    const listed = (res.children || []).map(fromBrowseMedia);
    return [...uniqueByName(tracks).slice(0, ARTIST_TRACKS), ...uniqueByName([...listed, ...albums])];
  }

  /** Search results credited to the artist; a failed search only leaves the page shorter. */
  private async searchByArtist(artist: string, type: MediaType): Promise<MaMediaItem[]> {
    const wanted = normalize(artist);
    try {
      const found = await this.search(artist, type, { limit: ARTIST_SEARCH_LIMIT });
      return found
        .filter((it) => (it.artists || []).some((a) => normalize(a.name) === wanted))
        .map((it) => ({ ...it, media_type: it.media_type || type }));
    } catch (err) {
      console.warn("[ma-player-card] artist search", err);
      return [];
    }
  }

  async play(entity: string, item: { uri: string | string[]; mediaType: MediaType }, enqueue: Enqueue): Promise<void> {
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
