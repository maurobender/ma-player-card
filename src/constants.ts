import type { Enqueue, MediaType } from "./backend/types.js";
import type { TranslationKey } from "./i18n/index.js";

export interface MediaTypeInfo {
  /** Key of this type's list in the music_assistant.search response. */
  key: string;
  icon: string;
  /** What tapping a result of this type does. */
  enqueue: Enqueue;
  /** Shown as a list instead of a grid. */
  list?: boolean;
  /** Round artwork. */
  round?: boolean;
  /** Can't be queued (radio). */
  noQueue?: boolean;
}

export interface HomeShelf {
  /** From the user's config; the default shelves use `titleKey` instead. */
  title?: string;
  titleKey?: TranslationKey;
  media_type: MediaType;
  favorite?: boolean;
  order_by?: string;
  limit?: number;
}

export const TYPES: Record<MediaType, MediaTypeInfo> = {
  track: { key: "tracks", icon: "mdi:music-note", enqueue: "play", list: true },
  artist: { key: "artists", icon: "mdi:account-music", enqueue: "replace", round: true },
  album: { key: "albums", icon: "mdi:album", enqueue: "replace" },
  playlist: { key: "playlists", icon: "mdi:playlist-music", enqueue: "replace" },
  radio: { key: "radio", icon: "mdi:radio", enqueue: "replace", noQueue: true },
  podcast: { key: "podcasts", icon: "mdi:podcast", enqueue: "replace" },
  audiobook: { key: "audiobooks", icon: "mdi:book-music", enqueue: "replace" },
};
export const DEFAULT_TYPES: MediaType[] = ["track", "artist", "album", "playlist", "radio"];
// order_by values from music_assistant/controllers/music/constants.py
export const DEFAULT_HOME: HomeShelf[] = [
  { titleKey: "home.recent", media_type: "album", order_by: "last_played_desc" },
  { titleKey: "home.playlists", media_type: "playlist", favorite: true, order_by: "favorite_timestamp_desc" },
  { titleKey: "home.artists", media_type: "artist", favorite: true, order_by: "favorite_timestamp_desc" },
  { titleKey: "home.albums", media_type: "album", favorite: true, order_by: "favorite_timestamp_desc" },
  { titleKey: "home.radio", media_type: "radio", favorite: true, order_by: "favorite_timestamp_desc" },
];
export const HOME_TTL_MS = 5 * 60 * 1000;
export const APPLE_RED = "#fa2d48";
export const DEBOUNCE_MS = 350;
export const LONG_PRESS_MS = 500;
export const MIN_QUERY = 2;
export const MIN_TILE_PX = 110;
export const AUTO_TILE_PX = 170;
export const LIST_COL_PX = 340;
