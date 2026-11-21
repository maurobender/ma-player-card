import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { repeat } from "lit/directives/repeat.js";
import { errorMessage } from "../../backend/call.js";
import type { MaBackend, QueueInfo, QueueItem } from "../../backend/types.js";
import type { ToastSpec } from "../../components/toast.js";
import { type Translate, translator } from "../../i18n/index.js";
import { fmtTime } from "../../utils/format.js";
import { haptic } from "../../utils/haptic.js";

interface QueueState {
  current: QueueItem | null;
  upcoming: QueueItem[];
  total: number;
  idx: number;
}

type Status = "idle" | "loading" | "ok" | "empty" | "error";

interface Drag {
  row: HTMLElement;
  rows: HTMLElement[];
  /** Vertical midpoints of the rows when the drag started (viewport coordinates). */
  mids: number[];
  from: number;
  to: number;
  startY: number;
  startScroll: number;
  height: number;
}

/** Where a dragged row lands: past every row whose midpoint its center has crossed. */
export function dropIndex(mids: number[], from: number, center: number): number {
  let to = from;
  for (let k = from + 1; k < mids.length && center > mids[k]; k++) to = k;
  for (let k = from - 1; k >= 0 && center < mids[k]; k--) to = k;
  return to;
}

/**
 * `<ma-player-queue>`: the queue view of "Now playing". It loads the queue from the backend
 * and applies changes optimistically, reloading the real queue afterwards.
 *
 * Events: `queue-info` (detail: QueueInfo) after each load; `toast` (detail: ToastSpec).
 */
export class MaPlayerQueue extends LitElement {
  static properties = {
    backend: { attribute: false },
    entity: {},
    limit: { type: Number },
    language: {},
    queue: { state: true },
    status: { state: true },
    error: { state: true },
  };

  declare backend?: MaBackend;
  declare entity?: string;
  declare limit: number;
  declare language: string;
  declare queue: QueueState | null;
  declare status: Status;
  declare error: string;

  private t: Translate = translator("en");
  private drag: Drag | null = null;
  /** A change is being sent: a reload would bring back the old order. */
  private busy = false;
  /** Swallows the click that follows a drag. */
  private justDragged = false;

  constructor() {
    super();
    this.limit = 50;
    this.language = "en";
    this.queue = null;
    this.status = "idle";
    this.error = "";
  }

  async refresh(withItems = true): Promise<void> {
    const { backend, entity } = this;
    if (!backend || !entity || this.drag || this.busy) return;
    if (withItems && !this.queue) this.status = "loading";
    try {
      const info = await backend.queue.info(entity);
      const upcoming = withItems ? await backend.queue.items(entity, info, this.limit) : (this.queue?.upcoming ?? []);
      if (entity !== this.entity || this.drag || this.busy) return;
      this.queue = { current: info.current, upcoming, total: info.total, idx: info.idx };
      this.status = "ok";
      this.dispatchEvent(new CustomEvent<QueueInfo>("queue-info", { detail: info }));
    } catch (err) {
      if (entity !== this.entity) return;
      const msg = errorMessage(err);
      this.queue = null;
      this.status = /no.?active.?queue/i.test(msg) ? "empty" : "error";
      this.error = msg;
    }
  }

  protected willUpdate(changed: PropertyValues<this>): void {
    if (changed.has("language")) this.t = translator(this.language);
    if (changed.has("entity") && changed.get("entity") !== undefined) {
      this.queue = null;
      this.status = "idle";
    }
  }

  // Rendering mid-drag would undo the rows' transforms.
  protected shouldUpdate(): boolean {
    return !this.drag;
  }

  protected render() {
    const { t, queue: q, status, backend } = this;
    if (status === "loading") return html`<div class="msg">${t("queue.loading")}</div>`;
    if (status === "error") return html`<div class="msg">${t("queue.error")}<br />${this.error}</div>`;
    if (status === "empty" || (q && !q.current && !q.upcoming.length)) return html`<div class="msg">${t("queue.empty")}</div>`;
    if (!q || !backend) return nothing;
    const left = Math.max(0, q.total - (q.idx + 1));
    const more = left - q.upcoming.length;
    const partial = backend.queue.partial;
    return html`
      ${q.current ? html`<div class="sec">${t("queue.now_playing")}</div>${this.row(q.current, -1)}` : nothing}
      <div class="sec">${t("queue.up_next")} <span>· ${t("queue.songs", { n: left })}</span></div>
      <div class="list">
        ${
          q.upcoming.length
            ? repeat(
                q.upcoming,
                (it) => it.id,
                (it, i) => this.row(it, i),
              )
            : html`<div class="note">${t("queue.no_more")}</div>`
        }
      </div>
      ${more > 0 && !partial ? html`<div class="note">${t("queue.and_more", { n: more })}</div>` : nothing}
      ${partial ? html`<div class="note">${t("queue.partial")}</div>` : nothing}
      ${backend.can.reorder ? html`<div class="note">${t("queue.hint")}</div>` : nothing}
      <div class="pad"></div>
    `;
  }

  /** `i` is the index in `upcoming`, or -1 for the current song. */
  private row(it: QueueItem, i: number) {
    const can = this.backend?.can;
    const current = i < 0;
    const tappable = !current && !!can?.playItem;
    const sub = it.artist || it.album;
    return html`
      <div class="row ${current ? "cur" : "up"} ${tappable ? "tap" : ""}" @click=${() => tappable && this.play(i)}>
        <div class="art">
          ${it.image ? html`<img src=${it.image} alt="" loading="lazy" draggable="false" />` : html`<ha-icon icon="mdi:music"></ha-icon>`}
        </div>
        <div class="text">
          <div class="title">${it.name}</div>
          ${sub ? html`<div class="sub">${sub}</div>` : nothing}
        </div>
        ${it.duration ? html`<div class="dur">${fmtTime(it.duration)}</div>` : nothing}
        ${
          !current && can?.remove
            ? html`<button class="btn del" aria-label=${this.t("queue.remove")} @click=${(e: Event) => this.onRemove(e, i)}>
                <ha-icon icon="mdi:minus-circle-outline"></ha-icon>
              </button>`
            : nothing
        }
        ${
          !current && can?.reorder
            ? html`<div
                class="btn handle"
                aria-label=${this.t("queue.drag")}
                @click=${(e: Event) => e.stopPropagation()}
                @pointerdown=${(e: PointerEvent) => this.startDrag(e, i)}
                @pointermove=${this.moveDrag}
                @pointerup=${this.endDrag}
                @pointercancel=${this.endDrag}
              >
                <ha-icon icon="mdi:drag-horizontal-variant"></ha-icon>
              </div>`
            : nothing
        }
      </div>
    `;
  }

  private startDrag(e: PointerEvent, from: number): void {
    if (e.button > 0) return;
    const handle = e.currentTarget as HTMLElement;
    const row = handle.closest<HTMLElement>(".row");
    const rows = [...this.renderRoot.querySelectorAll<HTMLElement>(".row.up")];
    if (!row) return;
    e.preventDefault();
    handle.setPointerCapture(e.pointerId);
    const rects = rows.map((r) => r.getBoundingClientRect());
    this.drag = {
      row,
      rows,
      mids: rects.map((r) => r.top + r.height / 2),
      from,
      to: from,
      startY: e.clientY,
      startScroll: this.scrollTop,
      height: rects[from].height,
    };
    row.classList.add("dragging");
    haptic(this, "selection");
  }

  private moveDrag = (e: PointerEvent): void => {
    const d = this.drag;
    if (!d) return;
    const box = this.getBoundingClientRect();
    if (e.clientY < box.top + 50) this.scrollTop -= 8;
    else if (e.clientY > box.bottom - 50) this.scrollTop += 8;
    const dy = e.clientY - d.startY + (this.scrollTop - d.startScroll);
    d.row.style.transform = `translateY(${dy}px)`;
    const to = dropIndex(d.mids, d.from, d.mids[d.from] + dy);
    if (to !== d.to) haptic(this, "selection");
    d.to = to;
    d.rows.forEach((r, k) => {
      if (k === d.from) return;
      const shift = d.from < k && k <= to ? -d.height : to <= k && k < d.from ? d.height : 0;
      r.style.transform = shift ? `translateY(${shift}px)` : "";
    });
  };

  private endDrag = async (): Promise<void> => {
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    this.justDragged = true;
    setTimeout(() => (this.justDragged = false), 50);
    // The rows jump to their new place in the list: without this they'd animate back from their drag offset.
    this.toggleAttribute("settling", true);
    for (const r of d.rows) r.style.transform = "";
    d.row.classList.remove("dragging");
    if (d.to !== d.from) this.move(d.from, d.to);
    else this.requestUpdate();
    await this.updateComplete;
    requestAnimationFrame(() => this.toggleAttribute("settling", false));
  };

  private onRemove(e: Event, i: number): void {
    e.stopPropagation();
    const q = this.queue;
    if (!q) return;
    const item = q.upcoming[i];
    haptic(this, "light");
    this.apply(
      this.t("queue.remove"),
      { ...q, upcoming: q.upcoming.filter((_, k) => k !== i), total: q.total - 1 },
      (be, entity) => be.queue.remove(entity, item.id),
    );
  }

  private move(from: number, to: number): void {
    const q = this.queue;
    if (!q) return;
    const item = q.upcoming[from];
    const upcoming = [...q.upcoming];
    upcoming.splice(from, 1);
    upcoming.splice(to, 0, item);
    this.apply(this.t("queue.move"), { ...q, upcoming }, (be, entity) => be.queue.moveTo(entity, item.id, from, to));
  }

  private async play(i: number): Promise<void> {
    const { backend, entity, queue } = this;
    const item = queue?.upcoming[i];
    if (this.justDragged || !backend || !entity || !item) return;
    haptic(this, "light");
    try {
      await backend.queue.play(entity, item.id);
      this.toast({ title: item.name, image: item.image, text: this.t("common.playing"), icon: "mdi:play-circle" });
    } catch (err) {
      this.toast({ title: item.name, image: item.image, text: errorMessage(err), icon: "mdi:alert-circle", error: true });
    }
  }

  private async apply(label: string, next: QueueState, run: (be: MaBackend, entity: string) => Promise<void>): Promise<void> {
    const { backend, entity } = this;
    if (!backend || !entity) return;
    const backup = this.queue;
    this.queue = next;
    this.busy = true;
    try {
      await run(backend, entity);
    } catch (err) {
      console.error(`[ma-player-card] ${label}`, err);
      this.queue = backup;
      this.toast({ title: label, text: errorMessage(err), icon: "mdi:alert-circle", error: true });
    }
    this.busy = false;
    this.refresh(true);
  }

  private toast(spec: ToastSpec): void {
    this.dispatchEvent(new CustomEvent<ToastSpec>("toast", { detail: spec }));
  }

  static styles = css`
    .msg {
      height: 100%;
      display: grid;
      place-items: center;
      text-align: center;
      padding: 0 24px;
      font-size: 17px;
      color: var(--np-dim);
    }
    .sec {
      margin: 22px 0 6px;
      font-size: 16px;
      font-weight: 700;
    }
    .sec span {
      font-weight: 400;
      color: var(--np-dim);
    }
    .list {
      position: relative;
    }
    .row {
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 60px;
      border-bottom: 0.5px solid rgba(255, 255, 255, 0.12);
    }
    .row.cur {
      border: 0;
    }
    .row.up {
      position: relative;
      background: transparent;
      transition: transform 0.18s ease;
    }
    :host([settling]) .row.up {
      transition: none;
    }
    .row.tap {
      cursor: pointer;
    }
    .row.tap:active {
      background: rgba(255, 255, 255, 0.06);
    }
    .row.dragging {
      transition: none;
      z-index: 2;
      background: rgba(60, 60, 60, 0.85);
      border-radius: 10px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
    }
    .art {
      width: 46px;
      height: 46px;
      flex: 0 0 46px;
      border-radius: 6px;
      overflow: hidden;
      display: grid;
      place-items: center;
      background: var(--np-fill);
    }
    .art img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .art ha-icon {
      color: var(--np-dim);
    }
    .text {
      flex: 1;
      min-width: 0;
    }
    .title,
    .sub {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .title {
      font-size: 15px;
    }
    .sub,
    .dur {
      font-size: 13px;
      color: var(--np-dim);
    }
    .dur {
      font-variant-numeric: tabular-nums;
    }
    .note {
      padding: 14px 0;
      color: var(--np-dim);
      font-size: 14px;
    }
    .pad {
      height: 48px;
    }
    .btn {
      width: 44px;
      height: 44px;
      flex: 0 0 44px;
      display: grid;
      place-items: center;
      border: 0;
      padding: 0;
      background: none;
      color: var(--np-dim);
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }
    .del {
      color: #ff6b6b;
      width: 36px;
      flex-basis: 36px;
    }
    .handle {
      touch-action: none;
      cursor: grab;
    }
    .row.dragging .handle {
      cursor: grabbing;
      color: #fff;
    }
  `;
}
