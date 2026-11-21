// Vibración: HA (app móvil) la escucha como evento "haptic" que sube por el DOM.
export type HapticKind = "success" | "warning" | "failure" | "light" | "medium" | "heavy" | "selection";

export const haptic = (el: EventTarget, kind: HapticKind): void => {
  el.dispatchEvent(new CustomEvent("haptic", { detail: kind, bubbles: true, composed: true }));
};
