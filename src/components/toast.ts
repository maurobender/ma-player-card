// Aviso flotante de vidrio (abajo al centro), por encima de los diálogos abiertos.
import { esc } from "../utils/html.js";
import { DARK_VARS } from "./theme.js";

export interface ToastSpec {
  title: string;
  text: string;
  /** Ícono mdi: a la izquierda si no hay imagen, a la derecha si la hay. */
  icon: string;
  image?: string;
  error?: boolean;
}

const STYLES = `
  :host { display: contents; }
  :host([dark]) { ${DARK_VARS} }
  .toast { position: fixed; inset: auto auto max(24px, env(safe-area-inset-bottom)) 50%; transform: translateX(-50%);
    margin: 0; display: flex; align-items: center; gap: 12px; width: max-content;
    max-width: min(440px, calc(100vw - 32px)); padding: 8px 18px 8px 8px; border: .5px solid var(--sep);
    border-radius: 18px; color: var(--primary-text-color);
    background: var(--glass); -webkit-backdrop-filter: var(--blur); backdrop-filter: var(--blur);
    box-shadow: 0 10px 36px rgba(0, 0, 0, .22); }
  .toast:not(:popover-open):not(.show) { display: none; }
  .toast:popover-open, .toast.show { animation: toastIn .3s cubic-bezier(.2, .9, .3, 1.2); }
  @keyframes toastIn { from { transform: translate(-50%, 16px); opacity: 0; } to { transform: translateX(-50%); opacity: 1; } }
  .toast img { width: 44px; height: 44px; border-radius: 8px; object-fit: cover; }
  .toast > ha-icon:first-child { margin-left: 8px; color: var(--accent); }
  .t-text { display: flex; flex-direction: column; min-width: 0; }
  .t-title { font-size: 15px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .t-sub { font-size: 13px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .t-icon { color: var(--accent); margin-left: 4px; }
  .toast.error { border-color: color-mix(in srgb, var(--error-color, #ff3b30) 50%, transparent); }
  .toast.error .t-icon, .toast.error > ha-icon:first-child { color: var(--error-color, #ff3b30); }
`;

/** `<ma-player-toast>`: usar `show()`. Con el atributo `dark` usa el tema oscuro. */
export class MaToast extends HTMLElement {
  private el: HTMLDivElement;
  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    super();
    const root = this.attachShadow({ mode: "open" });
    root.innerHTML = `<style>${STYLES}</style><div class="toast" popover="manual" role="status"></div>`;
    this.el = root.querySelector(".toast") as HTMLDivElement;
  }

  disconnectedCallback(): void {
    clearTimeout(this.timer);
  }

  show({ title, text, icon, image, error = false }: ToastSpec): void {
    const t = this.el;
    t.className = `toast ${error ? "error" : ""}`;
    t.innerHTML = `
      ${image ? `<img src="${esc(image)}" alt="" />` : `<ha-icon icon="${esc(icon)}"></ha-icon>`}
      <span class="t-text"><span class="t-title">${esc(title)}</span><span class="t-sub">${esc(text)}</span></span>
      ${image ? `<ha-icon class="t-icon" icon="${esc(icon)}"></ha-icon>` : ""}`;
    clearTimeout(this.timer);
    // popover: queda por encima de los <dialog> modales (capa superior). Sin soporte, una clase.
    try {
      if (t.showPopover) {
        if (t.matches(":popover-open")) t.hidePopover();
        t.showPopover();
      } else t.classList.add("show");
    } catch (_) {
      t.classList.add("show");
    }
    this.timer = setTimeout(() => this.hide(), error ? 4500 : 2600);
  }

  hide(): void {
    const t = this.el;
    try {
      if (t.hidePopover && t.matches(":popover-open")) t.hidePopover();
    } catch (_) {
      /* nada */
    }
    t.classList.remove("show");
  }
}
