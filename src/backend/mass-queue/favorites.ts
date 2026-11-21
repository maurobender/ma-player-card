import { NativeFavorites } from "../native/favorites.js";

/** mass_queue can also remove the favorite (library songs only). */
export class MassQueueFavorites extends NativeFavorites {
  override readonly canUnfavorite: boolean = true;

  /** Even without the button, a favorite can still be removed. */
  override canFavorite(_entity: string): boolean {
    return true;
  }

  override async unfavorite(entity: string): Promise<void> {
    await this.hass().callService("mass_queue", "unfavorite_current_item", { entity });
  }
}
