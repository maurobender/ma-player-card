/*
 * The backend contract: the only way the cards talk to Music Assistant and Home Assistant.
 *
 * Views ask "what can I do?" (`can`), never "which backend is this?". Each part is served by
 * whichever integration supports it: the official one always, and mass_queue (HACS) for
 * editing the queue when it is installed.
 */

import type { RepeatMode } from "../models/hass.js";

export type MediaType = "track" | "artist" | "album" | "playlist" | "radio" | "podcast" | "audiobook";

export type Enqueue = "play" | "replace" | "next" | "replace_next" | "add";

/** An item as Music Assistant returns it from search / get_library (only the fields we use). */
export interface MaMediaItem {
  uri: string;
  name: string;
  media_type?: MediaType;
  image?: string | null;
  artists?: { name: string }[];
  album?: { name: string } | null;
  owner?: string;
  favorite?: boolean;
  [key: string]: unknown;
}

export interface QueueItem {
  id: string;
  name: string;
  artist: string;
  album: string;
  image: string;
  /** Seconds; 0 when the backend doesn't report it (mass_queue). */
  duration: number;
  favorite?: boolean;
}

export interface QueueInfo {
  current: QueueItem | null;
  next: QueueItem | null;
  /** -1 when nothing is playing. */
  idx: number;
  total: number;
  /** Seconds played according to the MA queue (diagnostics only). */
  elapsed?: number;
}

export interface Capabilities {
  reorder: boolean;
  remove: boolean;
  playItem: boolean;
  unfavorite: boolean;
}

export type BackendName = "native" | "mass_queue";
export type BackendMode = "auto" | BackendName;

export interface SearchOptions {
  limit: number;
  libraryOnly?: boolean;
}

export interface LibraryQuery {
  mediaType: MediaType;
  limit: number;
  favorite?: boolean;
  orderBy?: string;
}

export interface LibraryApi {
  search(query: string, type: MediaType, options: SearchOptions): Promise<MaMediaItem[]>;
  getLibrary(query: LibraryQuery): Promise<MaMediaItem[]>;
  /** The tracks of an album or playlist, or the albums of an artist. */
  browse(entity: string, item: { uri: string; mediaType: MediaType }): Promise<MaMediaItem[]>;
  /** Several URIs play in order, e.g. an album from one of its tracks. */
  play(entity: string, item: { uri: string | string[]; mediaType: MediaType }, enqueue: Enqueue): Promise<void>;
}

export interface QueueApi {
  readonly can: Pick<Capabilities, "reorder" | "remove" | "playItem">;
  /** Only the next song is known (Home Assistant before November 2026). */
  readonly partial: boolean;
  info(entity: string): Promise<QueueInfo>;
  /** The songs after the current one. */
  items(entity: string, info: QueueInfo, limit: number): Promise<QueueItem[]>;
  /** `from` and `to` are indexes into the upcoming songs. */
  moveTo(entity: string, id: string, from: number, to: number): Promise<void>;
  remove(entity: string, id: string): Promise<void>;
  play(entity: string, id: string): Promise<void>;
  /** Whether `clear` keeps the current song playing; otherwise it empties the whole queue and stops. */
  readonly clearKeepsCurrent: boolean;
  clear(entity: string): Promise<void>;
}

export interface FavoritesApi {
  readonly canUnfavorite: boolean;
  canFavorite(entity: string): boolean;
  favorite(entity: string): Promise<void>;
  unfavorite(entity: string): Promise<void>;
}

export interface PlayerApi {
  playPause(entity: string): Promise<void>;
  previous(entity: string): Promise<void>;
  next(entity: string): Promise<void>;
  seek(entity: string, seconds: number): Promise<void>;
  setVolume(entity: string, level: number): Promise<void>;
  setMute(entity: string, muted: boolean): Promise<void>;
  setShuffle(entity: string, shuffle: boolean): Promise<void>;
  setRepeat(entity: string, repeat: RepeatMode): Promise<void>;
}

export interface MaBackend {
  readonly name: BackendName;
  readonly can: Capabilities;
  readonly library: LibraryApi;
  readonly queue: QueueApi;
  readonly favorites: FavoritesApi;
  readonly player: PlayerApi;
}

export class UnsupportedError extends Error {}
