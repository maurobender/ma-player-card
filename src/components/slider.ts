import { css, html, LitElement, type PropertyValues } from "lit";

export const clamp01 = (n: number): number => Math.min(1, Math.max(0, n || 0));

const STEPS: Record<string, number> = { ArrowLeft: -0.05, ArrowDown: -0.05, ArrowRight: 0.05, ArrowUp: 0.05 };

/**
 * `<ma-slider>`: a touch slider for progress and volume, with `value` from 0 to 1.
 * Events (detail: the ratio): `slide` while dragging; `slide-end` on release or arrow keys,
 * with null when the gesture was cancelled.
 */
export class MaSlider extends LitElement {
  static properties = {
    value: { type: Number },
    dragging: { type: Boolean, reflect: true },
  };

  declare value: number;
  declare dragging: boolean;

  constructor() {
    super();
    this.value = 0;
    this.dragging = false;
    this.addEventListener("pointerdown", this.onDown);
    this.addEventListener("pointermove", this.onMove);
    this.addEventListener("pointerup", this.onUp);
    this.addEventListener("pointercancel", this.onCancel);
    this.addEventListener("keydown", this.onKey);
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute("role", "slider");
    if (!this.hasAttribute("tabindex")) this.tabIndex = 0;
  }

  protected updated(changed: PropertyValues<this>): void {
    if (changed.has("value")) this.setAttribute("aria-valuenow", String(Math.round(clamp01(this.value) * 100)));
  }

  protected render() {
    return html`<div class="track"><div class="fill" style="width: ${clamp01(this.value) * 100}%"></div></div>`;
  }

  private ratio(e: PointerEvent): number {
    const r = this.getBoundingClientRect();
    return clamp01((e.clientX - r.left) / r.width);
  }

  private emit(name: "slide" | "slide-end", ratio: number | null): void {
    this.dispatchEvent(new CustomEvent<number | null>(name, { detail: ratio }));
  }

  private onDown = (e: PointerEvent): void => {
    if (e.button > 0) return;
    this.dragging = true;
    this.setPointerCapture(e.pointerId);
    this.emit("slide", this.ratio(e));
  };

  private onMove = (e: PointerEvent): void => {
    if (this.dragging) this.emit("slide", this.ratio(e));
  };

  private onUp = (e: PointerEvent): void => {
    if (!this.dragging) return;
    this.dragging = false;
    this.emit("slide-end", this.ratio(e));
  };

  private onCancel = (): void => {
    this.dragging = false;
    this.emit("slide-end", null);
  };

  private onKey = (e: KeyboardEvent): void => {
    const step = STEPS[e.key];
    if (step === undefined) return;
    e.preventDefault();
    this.emit("slide-end", clamp01(this.value + step));
  };

  static styles = css`
    :host {
      position: relative;
      height: 30px;
      display: flex;
      align-items: center;
      cursor: pointer;
      touch-action: none;
      outline: none;
    }
    .track {
      position: relative;
      width: 100%;
      height: 6px;
      border-radius: 3px;
      overflow: hidden;
      background: rgba(255, 255, 255, 0.25);
      transition: height 0.15s;
    }
    .fill {
      position: absolute;
      inset: 0 auto 0 0;
      background: rgba(255, 255, 255, 0.8);
    }
    :host([dragging]) .track,
    :host(:focus-visible) .track {
      height: 12px;
      border-radius: 6px;
    }
    :host([dragging]) .fill {
      background: #fff;
    }
  `;
}
