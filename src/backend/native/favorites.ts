import type { HassGetter } from "../../models/hass.js";
import { type FavoritesApi, UnsupportedError } from "../types.js";

/**
 * Favorites the current song with the button Music Assistant adds to each player device.
 * The official integration has no way to remove a favorite.
 */
export class NativeFavorites implements FavoritesApi {
  readonly canUnfavorite: boolean = false;

  constructor(protected readonly hass: HassGetter) {}

  button(entity: string): string | null {
    const ents = this.hass().entities || {};
    const me = ents[entity];
    if (!me || !me.device_id) return null;
    const btn = Object.values(ents).find(
      (x) =>
        !!x &&
        x.device_id === me.device_id &&
        x.entity_id.startsWith("button.") &&
        (x.translation_key === "favorite_now_playing" || /favorit/.test(x.entity_id)),
    );
    return btn ? btn.entity_id : null;
  }

  canFavorite(entity: string): boolean {
    return !!this.button(entity);
  }

  async favorite(entity: string): Promise<void> {
    const btn = this.button(entity);
    if (!btn) throw new Error("Music Assistant favorite button not found");
    await this.hass().callService("button", "press", { entity_id: btn });
  }

  async unfavorite(_entity: string): Promise<void> {
    throw new UnsupportedError("The official integration cannot remove favorites");
  }
}
