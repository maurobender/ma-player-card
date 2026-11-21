import { NativeFavorites } from "../native/favorites.js";

/** Con mass_queue se puede además quitar el favorito (solo canciones de la biblioteca). */
export class MassQueueFavorites extends NativeFavorites {
  override readonly canUnfavorite: boolean = true;

  /** Siempre: aunque no encontremos el botón, se puede quitar un favorito. */
  override canFavorite(_entity: string): boolean {
    return true;
  }

  override async unfavorite(entity: string): Promise<void> {
    await this.hass().callService("mass_queue", "unfavorite_current_item", { entity });
  }
}
