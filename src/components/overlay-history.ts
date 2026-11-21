/**
 * Conecta un <dialog> modal con el historial del navegador, para que el botón "atrás"
 * (Android, app de HA, navegador) cierre el diálogo en vez de salir del panel.
 *
 * Al abrir agrega una entrada al historial; al cerrar por cualquier vía (botón, Escape,
 * fondo) la saca con history.back(). Se pueden apilar: cada diálogo marca su propia clave
 * en history.state y solo se cierra cuando "atrás" lo saca a él.
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
      this.pushed = false; // el navegador ya volvió atrás
      this.dialog.close();
    }
  };
}
