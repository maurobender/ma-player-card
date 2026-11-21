/**
 * Makes the back button (Android, HA app, browser) close a modal <dialog> instead of leaving
 * the dashboard.
 *
 * Opening pushes a history entry; closing by any means (button, Escape, backdrop) pops it.
 * Dialogs stack: each marks its own key in history.state and closes only when back removes it.
 */
export class OverlayHistory {
  readonly dialog: HTMLDialogElement;
  private readonly key: string;
  private pushed = false;

  constructor(dialog: HTMLDialogElement, id: string) {
    this.dialog = dialog;
    this.key = `ma:${id}`;
    dialog.addEventListener("close", this.onClose);
  }

  get isOpen(): boolean {
    return this.dialog.open;
  }

  open(): boolean {
    if (this.dialog.open) return false;
    this.dialog.showModal();
    history.pushState({ ...(history.state || {}), [this.key]: true }, "");
    this.pushed = true;
    window.addEventListener("popstate", this.onPopState);
    return true;
  }

  close(): void {
    if (this.dialog.open) this.dialog.close();
  }

  private onClose = (): void => {
    window.removeEventListener("popstate", this.onPopState);
    if (this.pushed) {
      this.pushed = false;
      history.back();
    }
  };

  private onPopState = (): void => {
    if (this.dialog.open && !history.state?.[this.key]) {
      this.pushed = false; // the browser already went back
      this.dialog.close();
    }
  };
}
