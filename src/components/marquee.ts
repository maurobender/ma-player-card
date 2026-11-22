import { css, html, LitElement, nothing, type PropertyValues } from "lit";

/** Scroll speed, in px per second. */
const SPEED = 30;
/** Seconds the text rests at the start of each pass. */
const REST_S = 2.5;
/** Space between the end of the text and its copy, in px. */
const GAP = 48;

/**
 * Marquees that move as one box, like a song's title and artist. When several don't fit, each one is as wide
 * as the longest, so they scroll the same distance at the same speed and loop together.
 * One that fits stays still.
 */
export class MarqueeGroup {
  private readonly members = new Set<MaMarquee>();
  private frame = 0;

  add(m: MaMarquee): void {
    this.members.add(m);
    this.restart();
  }

  delete(m: MaMarquee): void {
    this.members.delete(m);
    this.restart();
  }

  /** Batched to the next frame, so members measured one after the other still start together. */
  restart(): void {
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => {
      const moving = [...this.members].filter((m) => m.overflowing);
      const width = Math.max(0, ...moving.map((m) => m.textWidth));
      for (const m of this.members) m.play(m.overflowing ? width : 0);
    });
  }
}

/**
 * `<ma-marquee .text=${…} .group=${…}>`: one line of text that, when it doesn't fit, rests and then scrolls on its
 * own, followed by a copy so it loops seamlessly. Text that fits stays still.
 */
export class MaMarquee extends LitElement {
  static properties = {
    text: { type: String },
    overflowing: { type: Boolean, reflect: true },
    group: { attribute: false },
  };

  declare text: string;
  declare overflowing: boolean;
  declare group?: MarqueeGroup;
  /** Width of the text alone, in px. */
  textWidth = 0;
  private resize?: ResizeObserver;
  private animation?: Animation;

  constructor() {
    super();
    this.text = "";
    this.overflowing = false;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.resize = new ResizeObserver(() => this.measure());
    this.resize.observe(this);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.resize?.disconnect();
    this.stop();
    this.group?.delete(this);
  }

  protected updated(changed: PropertyValues<this>): void {
    if (changed.has("group")) {
      changed.get("group")?.delete(this);
      this.group?.add(this);
    }
    if (changed.has("text")) this.measure();
  }

  // A range measures the text itself, whatever width the group gave its box
  private measure(): void {
    const first = this.renderRoot.querySelector<HTMLElement>(".copy");
    if (!first) return;
    const range = document.createRange();
    range.selectNodeContents(first);
    const textWidth = Math.ceil(range.getBoundingClientRect().width);
    const overflowing = textWidth > this.clientWidth + 1 && !matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (overflowing === this.overflowing && textWidth === this.textWidth) return;
    this.overflowing = overflowing;
    this.textWidth = textWidth;
    this.updateComplete.then(() => (this.group ? this.group.restart() : this.play(overflowing ? textWidth : 0)));
  }

  /**
   * Scrolls a box `width` px wide (the text, or a longer one in its group) and its copy; 0 stops.
   * The keyframes depend on that width, which CSS keyframes can't take from a variable.
   */
  play(width: number): void {
    this.stop();
    const track = this.renderRoot.querySelector<HTMLElement>(".track");
    if (!track || !width) return;
    this.style.setProperty("--box", `${width}px`);
    const shift = width + GAP;
    const total = REST_S + shift / SPEED;
    this.animation = track.animate(
      [
        { transform: "translateX(0)", offset: 0 },
        { transform: "translateX(0)", offset: REST_S / total },
        { transform: `translateX(${-shift}px)`, offset: 1 },
      ],
      { duration: total * 1000, iterations: Infinity },
    );
  }

  private stop(): void {
    this.animation?.cancel();
    this.animation = undefined;
    this.style.removeProperty("--box");
  }

  protected render() {
    return html`<div class="track" title=${this.text}>
      <span class="copy">${this.text}</span>${this.overflowing ? html`<span class="copy" aria-hidden="true">${this.text}</span>` : nothing}
    </div>`;
  }

  static styles = css`
    :host { display: block; overflow: hidden; white-space: nowrap; }
    .track { display: inline-flex; gap: ${GAP}px; }
    .copy { flex: none; display: inline-block; min-width: var(--box, 0); }
    :host(:not([overflowing])) .track { display: block; overflow: hidden; text-overflow: ellipsis; }
    /* Fades the right edge only, so the text lines up with the rest while it rests */
    :host([overflowing]) {
      mask-image: linear-gradient(90deg, #000 calc(100% - 24px), transparent);
      -webkit-mask-image: linear-gradient(90deg, #000 calc(100% - 24px), transparent);
    }
  `;
}
