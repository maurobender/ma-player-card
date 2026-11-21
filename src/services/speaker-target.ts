// The player picked in the speaker picker, per device and shared by every card for the same entity.
// The storage key keeps its original name so existing choices survive.
export const TARGET_EVENT = "ma-player-card-target";
export interface TargetEventDetail {
  entity: string;
  target: string | null;
}

export const Target = {
  key: (entity: string): string => `ma-browser-card.target.${entity}`,
  load(entity: string): string | null {
    try {
      return localStorage.getItem(this.key(entity)) || null;
    } catch (_) {
      return null; // private mode or blocked storage
    }
  },
  save(entity: string, target: string | null): void {
    try {
      if (target) localStorage.setItem(this.key(entity), target);
      else localStorage.removeItem(this.key(entity));
    } catch (_) {
      /* no storage: the choice lasts until reload */
    }
    window.dispatchEvent(new CustomEvent<TargetEventDetail>(TARGET_EVENT, { detail: { entity, target } }));
  },
};
