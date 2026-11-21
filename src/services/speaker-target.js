// Parlante elegido, compartido entre ma-browser-card y ma-player-card (por dispositivo).
// La clave conserva el nombre original para no perder la elección guardada.
export const TARGET_EVENT = "ma-player-card-target";
export const Target = {
  key: (entity) => `ma-browser-card.target.${entity}`,
  load(entity) {
    try {
      return localStorage.getItem(this.key(entity)) || null;
    } catch (_) {
      return null; // modo privado o almacenamiento bloqueado
    }
  },
  save(entity, target) {
    try {
      if (target) localStorage.setItem(this.key(entity), target);
      else localStorage.removeItem(this.key(entity));
    } catch (_) {
      /* sin almacenamiento: dura hasta recargar */
    }
    window.dispatchEvent(new CustomEvent(TARGET_EVENT, { detail: { entity, target } }));
  },
};
