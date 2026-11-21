// The Home Assistant companion app vibrates on a bubbling "haptic" event.
export type HapticKind = "success" | "warning" | "failure" | "light" | "medium" | "heavy" | "selection";

export const haptic = (el: EventTarget, kind: HapticKind): void => {
  el.dispatchEvent(new CustomEvent("haptic", { detail: kind, bubbles: true, composed: true }));
};
