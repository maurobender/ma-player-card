import type { HassGetter } from "../../models/hass.js";
import { type FavoritesApi, UnsupportedError } from "../types.js";

/**
 * Favorito de la canción actual con el botón que Music Assistant crea en cada parlante
 * ("Favorito de la canción actual"). La integración oficial no tiene forma de quitarlo.
 */
export class NativeFavorites implements FavoritesApi {
  readonly canUnfavorite: boolean = false;

  constructor(protected readonly hass: HassGetter) {}

  /** El botón está en el mismo dispositivo que el media_player. */
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
    if (!btn) throw new Error("No encontré el botón de favorito de Music Assistant");
    await this.hass().callService("button", "press", { entity_id: btn });
  }

  async unfavorite(_entity: string): Promise<void> {
    throw new UnsupportedError("La integración oficial no permite quitar favoritos");
  }
}
