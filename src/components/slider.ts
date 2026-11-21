// Barra deslizable táctil (progreso y volumen). ratio: 0..1

export interface SliderHandlers {
  /** Mientras se arrastra. */
  onInput: (ratio: number) => void;
  /** Al soltar (o con las flechas). null si se canceló el gesto. */
  onChange: (ratio: number | null) => void;
}

export interface SliderControl {
  readonly dragging: boolean;
}

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

const STEPS: Record<string, number> = { ArrowLeft: -0.05, ArrowDown: -0.05, ArrowRight: 0.05, ArrowUp: 0.05 };

export function bindSlider(el: HTMLElement, { onInput, onChange }: SliderHandlers): SliderControl {
  let dragging = false;
  const ratio = (e: PointerEvent): number => {
    const r = el.getBoundingClientRect();
    return clamp01((e.clientX - r.left) / r.width);
  };
  el.addEventListener("pointerdown", (e) => {
    if (e.button > 0) return;
    dragging = true;
    el.setPointerCapture(e.pointerId);
    el.classList.add("drag");
    onInput(ratio(e));
  });
  el.addEventListener("pointermove", (e) => {
    if (dragging) onInput(ratio(e));
  });
  el.addEventListener("pointerup", (e) => {
    if (!dragging) return;
    dragging = false;
    el.classList.remove("drag");
    onChange(ratio(e));
  });
  el.addEventListener("pointercancel", () => {
    dragging = false;
    el.classList.remove("drag");
    onChange(null);
  });
  el.addEventListener("keydown", (e) => {
    const step = STEPS[e.key];
    if (step === undefined) return;
    e.preventDefault();
    onChange(clamp01(Number(el.dataset.value || 0) + step));
  });
  return {
    get dragging() {
      return dragging;
    },
  };
}

export const setSlider = (el: HTMLElement, ratio: number): void => {
  const r = clamp01(ratio || 0);
  el.dataset.value = String(r);
  const fill = el.querySelector<HTMLElement>(".fill");
  if (fill) fill.style.width = `${r * 100}%`;
};
