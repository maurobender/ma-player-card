/*
 * Builds the backend part by part:
 *   library and player  → always the official integration (mass_queue has neither)
 *   queue and favorites → mass_queue when installed (or forced), otherwise the official one
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
  /** The card's Music Assistant entity, used to find its integration entry. */
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

/** Returns the same backend until the right one changes (e.g. mass_queue gets installed). */
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
