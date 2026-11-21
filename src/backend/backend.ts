/*
 * Arma el backend que usan las cards, pieza por pieza:
 *   biblioteca y reproductor  → siempre la integración oficial (mass_queue no los tiene)
 *   cola y favoritos          → mass_queue si está instalada (o forzada), si no la oficial
 */

import type { Hass, HassGetter } from "../models/hass.js";
import { MassQueueFavorites } from "./mass-queue/favorites.js";
import { MassQueueQueue } from "./mass-queue/queue.js";
import { NativeFavorites } from "./native/favorites.js";
import { NativeLibrary } from "./native/library.js";
import { HaPlayer } from "./native/player.js";
import { NativeQueue } from "./native/queue.js";
import type { BackendMode, BackendName, MaBackend } from "./types.js";

export interface BackendOptions {
  mode?: BackendMode;
  /** Entidad de Music Assistant de la card (para encontrar la integración). */
  entity: string;
  configEntryId?: string;
}

export function resolveBackendName(hass: Hass | undefined, mode: BackendMode = "auto"): BackendName {
  if (mode === "mass_queue") return "mass_queue";
  if (mode === "auto" && hass?.services?.mass_queue) return "mass_queue";
  return "native";
}

export function createBackend(hass: HassGetter, name: BackendName, options: BackendOptions): MaBackend {
  const nativeQueue = new NativeQueue(hass);
  const queue = name === "mass_queue" ? new MassQueueQueue(hass, nativeQueue) : nativeQueue;
  const favorites = name === "mass_queue" ? new MassQueueFavorites(hass) : new NativeFavorites(hass);
  return {
    name,
    can: { ...queue.can, unfavorite: favorites.canUnfavorite },
    library: new NativeLibrary(hass, options.entity, options.configEntryId),
    queue,
    favorites,
    player: new HaPlayer(hass),
  };
}

/**
 * Lo que guarda cada card: devuelve siempre el mismo backend mientras no cambie
 * cuál corresponde (p. ej. si se instala mass_queue, en la próxima llamada pasa a usarla).
 */
export class BackendHolder {
  private current: { key: string; backend: MaBackend } | null = null;

  constructor(private readonly hass: HassGetter) {}

  get(options: BackendOptions): MaBackend {
    const name = resolveBackendName(this.hass(), options.mode);
    const key = `${name}|${options.entity}|${options.configEntryId || ""}`;
    if (this.current?.key !== key) this.current = { key, backend: createBackend(this.hass, name, options) };
    return this.current.backend;
  }
}
