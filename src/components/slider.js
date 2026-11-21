// Barra deslizable táctil (progreso y volumen). ratio: 0..1
export function bindSlider(el, { onInput, onChange }) {
  let dragging = false;
  const ratio = (e) => {
    const r = el.getBoundingClientRect();
    return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
  };
  el.addEventListener("pointerdown", (e) => {
    if (e.button > 0) return;
    dragging = true;
    el.setPointerCapture(e.pointerId);
    el.classList.add("drag");
    onInput(ratio(e));
  });
  el.addEventListener("pointermove", (e) => dragging && onInput(ratio(e)));
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
    const step = { ArrowLeft: -0.05, ArrowDown: -0.05, ArrowRight: 0.05, ArrowUp: 0.05 }[e.key];
    if (step === undefined) return;
    e.preventDefault();
    const cur = Number(el.dataset.value || 0);
    onChange(Math.min(1, Math.max(0, cur + step)));
  });
  return {
    get dragging() {
      return dragging;
    },
  };
}

export const setSlider = (el, ratio) => {
  const r = Math.min(1, Math.max(0, ratio || 0));
  el.dataset.value = r;
  el.querySelector(".fill").style.width = `${r * 100}%`;
};
