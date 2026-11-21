/*
 * Contrato del backend: la única forma en que las cards hablan con Music Assistant y con HA.
 *
 * Las vistas no preguntan "¿qué backend es?" sino "¿qué se puede hacer?" (`can`).
 * Cada parte (biblioteca, cola, favoritos, reproductor) la resuelve el módulo que la soporte:
 * la integración oficial siempre, y mass_queue (HACS) para editar la cola si está instalada.
 */

import type { RepeatMode } from "../models/hass.js";

export type MediaType = "track" | "artist" | "album" | "playlist" | "radio" | "podcast" | "audiobook";

export type Enqueue = "play" | "replace" | "next" | "replace_next" | "add";

/** Ítem tal como lo devuelve Music Assistant en search / get_library (solo los campos que usamos). */
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

/** Canción de la cola, igual para todos los backends. */
export interface QueueItem {
  id: string;
  name: string;
  artist: string;
  album: string;
  image: string;
  /** Segundos; 0 si el backend no la informa (mass_queue). */
  duration: number;
  favorite?: boolean;
}

export interface QueueInfo {
  current: QueueItem | null;
  next: QueueItem | null;
  /** Índice de la canción actual; -1 si no hay. */
  idx: number;
  total: number;
  /** Segundos transcurridos según la cola de MA (solo para diagnóstico). */
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
  play(entity: string, item: { uri: string; mediaType: MediaType }, enqueue: Enqueue): Promise<void>;
}

export interface QueueApi {
  readonly can: Pick<Capabilities, "reorder" | "remove" | "playItem">;
  /** true si solo podemos conocer la próxima canción (HA anterior a noviembre de 2026). */
  readonly partial: boolean;
  info(entity: string): Promise<QueueInfo>;
  /** Próximas canciones, después de la actual. */
  items(entity: string, info: QueueInfo, limit: number): Promise<QueueItem[]>;
  /** Mueve una canción de las próximas de la posición `from` a `to` (índices dentro de las próximas). */
  moveTo(entity: string, id: string, from: number, to: number): Promise<void>;
  remove(entity: string, id: string): Promise<void>;
  play(entity: string, id: string): Promise<void>;
}

export interface FavoritesApi {
  readonly canUnfavorite: boolean;
  /** ¿Se puede marcar la canción actual de este parlante? */
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
