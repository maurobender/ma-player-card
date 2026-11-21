import { esc } from "../utils/html.js";
import { nextInstanceId } from "../utils/ids.js";
import { OverlayHistory } from "./overlay-history.js";
import { DARK_VARS } from "./theme.js";

export interface SheetHeader {
  title: string;
  subtitle?: string;
  /** Artwork; `icon` replaces it when missing. With neither, only the text is shown. */
  image?: string;
  icon?: string;
  round?: boolean;
}

/** Label on the left, accent icon on the right. */
export interface SheetAction {
  key: string;
  label: string;
  icon?: string;
}

/** Icon on the left, two lines of text, and a check mark when selected. */
export interface SheetChoice {
  key: string;
  label: string;
  sublabel?: string;
  icon: string;
  /** Accent-colored icon (e.g. a player that is playing). */
  active?: boolean;
  selected?: boolean;
  disabled?: boolean;
}

export interface SheetSpec {
  header?: SheetHeader;
  actions?: SheetAction[];
  choices?: SheetChoice[];
  /** Extra choices folded at the end (e.g. unavailable players). */
  more?: { label: string; choices: SheetChoice[] };
  cancelLabel?: string;
}

const STYLES = `
  :host { display: contents; }
  :host([dark]) { ${DARK_VARS} }
  dialog { border: 0; padding: 0; background: transparent; overflow: visible;
    width: min(400px, calc(100vw - 24px)); max-height: calc(100dvh - 32px); color: var(--primary-text-color); }
  dialog::backdrop { background: rgba(0, 0, 0, .3); -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); }
  dialog[open] { animation: menuIn .22s cubic-bezier(.2, .9, .3, 1.2); }
  @keyframes menuIn { from { transform: scale(.94); opacity: 0; } to { transform: none; opacity: 1; } }
  .sheet { display: block; width: 100%; border-radius: 16px; overflow: hidden;
    background: var(--glass); -webkit-backdrop-filter: var(--blur); backdrop-filter: var(--blur);
    box-shadow: 0 16px 48px rgba(0, 0, 0, .28); }
  .sheet:first-child { max-height: calc(100dvh - 120px); overflow-y: auto; }
  .head { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: .5px solid var(--sep); }
  .art { width: 56px; height: 56px; flex: 0 0 56px; border-radius: 8px; overflow: hidden;
    background: var(--fill); display: grid; place-items: center; }
  .art.round { border-radius: 50%; }
  .art img { width: 100%; height: 100%; object-fit: cover; }
  .meta { min-width: 0; }
  .title { font-weight: 600; font-size: 16px; }
  .sub { font-size: 13px; color: var(--secondary-text-color); }
  .opt { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px;
    height: 54px; padding: 0 18px; border: 0; cursor: pointer; font: inherit; font-size: 17px;
    background: transparent; color: var(--primary-text-color); text-align: left; }
  .opt + .opt, .more-list .opt { border-top: .5px solid var(--sep); }
  .opt ha-icon { color: var(--accent); }
  .opt:active { background: var(--fill); }
  .opt:focus, .cancel:focus { outline: none; }
  .opt:focus-visible { background: var(--fill); }
  .cancel { margin-top: 8px; height: 56px; border: 0; cursor: pointer; font: inherit; font-size: 17px;
    font-weight: 600; color: var(--accent); }
  .cancel:active { filter: brightness(.95); }
  .choice { justify-content: flex-start; height: auto; min-height: 60px; padding: 8px 18px; }
  .choice[disabled] { opacity: .45; cursor: default; }
  .choice .c-icon { color: var(--secondary-text-color); }
  .choice .c-icon.on { color: var(--accent); }
  .c-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .c-name { font-size: 17px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .c-sub { font-size: 13px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .choice.sel .c-name { font-weight: 600; }
  .more-toggle { color: var(--secondary-text-color); font-size: 15px; height: 48px; }
  .more-toggle ha-icon { color: var(--secondary-text-color); transition: transform .2s; }
  .more-toggle[aria-expanded="true"] ha-icon { transform: rotate(180deg); }
  .more-list { display: none; }
  .more-toggle[aria-expanded="true"] + .more-list { display: block; }

  @media (max-width: 600px) {
    dialog { margin: auto auto max(12px, env(safe-area-inset-bottom)); }
    dialog[open] { animation: sheetUp .28s cubic-bezier(.2, .9, .3, 1); }
    @keyframes sheetUp { from { transform: translateY(40px); opacity: 0; } to { transform: none; opacity: 1; } }
  }
`;

const headerHtml = (h: SheetHeader): string => {
  const art = h.image
    ? `<div class="art ${h.round ? "round" : ""}"><img src="${esc(h.image)}" alt="" /></div>`
    : h.icon
      ? `<div class="art ${h.round ? "round" : ""}"><ha-icon icon="${esc(h.icon)}"></ha-icon></div>`
      : "";
  return `<div class="head">${art}<div class="meta"><div class="title">${esc(h.title)}</div>${
    h.subtitle ? `<div class="sub">${esc(h.subtitle)}</div>` : ""
  }</div></div>`;
};

const actionHtml = (a: SheetAction): string =>
  `<button class="opt" data-key="${esc(a.key)}"><span>${esc(a.label)}</span>${
    a.icon ? `<ha-icon icon="${esc(a.icon)}"></ha-icon>` : ""
  }</button>`;

const choiceHtml = (c: SheetChoice): string =>
  `<button class="opt choice ${c.selected ? "sel" : ""}" data-key="${esc(c.key)}" ${c.disabled ? "disabled" : ""}>
    <ha-icon class="c-icon ${c.active ? "on" : ""}" icon="${esc(c.icon)}"></ha-icon>
    <span class="c-text"><span class="c-name">${esc(c.label)}</span>${
      c.sublabel ? `<span class="c-sub">${esc(c.sublabel)}</span>` : ""
    }</span>
    ${c.selected ? `<ha-icon class="c-check" icon="mdi:check"></ha-icon>` : ""}
  </button>`;

/**
 * `<ma-player-action-sheet>`: an iOS-style action sheet, rising from the bottom on phones.
 * `show(spec)` resolves to the chosen `key`, or null when cancelled (Cancel, backdrop, Escape or back).
 * `dark` attribute: dark theme.
 */
export class MaActionSheet extends HTMLElement {
  private dialog: HTMLDialogElement;
  private overlay: OverlayHistory;
  private result: string | null = null;
  private resolve?: (key: string | null) => void;

  constructor() {
    super();
    const root = this.attachShadow({ mode: "open" });
    root.innerHTML = `<style>${STYLES}</style><dialog></dialog>`;
    this.dialog = root.querySelector("dialog") as HTMLDialogElement;
    this.overlay = new OverlayHistory(this.dialog, `sheet-${nextInstanceId()}`);
    this.dialog.addEventListener("close", () => this.settle());
    this.dialog.addEventListener("click", (e) => {
      if (e.target === this.dialog) return this.overlay.close(); // backdrop
      const btn = (e.target as Element).closest("button");
      if (!btn || btn.disabled) return;
      if (btn.classList.contains("more-toggle")) {
        btn.setAttribute("aria-expanded", String(btn.getAttribute("aria-expanded") !== "true"));
        return;
      }
      this.result = btn.dataset.key ?? null;
      this.overlay.close();
    });
  }

  disconnectedCallback(): void {
    this.overlay.close();
  }

  get isOpen(): boolean {
    return this.overlay.isOpen;
  }

  show(spec: SheetSpec): Promise<string | null> {
    this.settle(); // a sheet that was already open counts as cancelled
    const { header, actions = [], choices = [], more, cancelLabel = "Cancel" } = spec;
    this.dialog.innerHTML = `
      <div class="sheet">
        ${header ? headerHtml(header) : ""}
        ${actions.map(actionHtml).join("")}
        ${choices.map(choiceHtml).join("")}
        ${
          more?.choices.length
            ? `<button class="opt more-toggle" aria-expanded="false"><span>${esc(more.label)}</span>
                 <ha-icon icon="mdi:chevron-down"></ha-icon></button>
               <div class="more-list">${more.choices.map(choiceHtml).join("")}</div>`
            : ""
        }
      </div>
      <button class="sheet cancel">${esc(cancelLabel)}</button>`;
    this.result = null;
    const p = new Promise<string | null>((resolve) => {
      this.resolve = resolve;
    });
    if (!this.overlay.open()) this.dialog.scrollTop = 0; // already open: only the content changes
    return p;
  }

  close(): void {
    this.overlay.close();
  }

  private settle(): void {
    const resolve = this.resolve;
    this.resolve = undefined;
    resolve?.(this.result);
    this.result = null;
  }
}
