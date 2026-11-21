/*
 * ma-player-card — reproductor y buscador de música para Music Assistant (Home Assistant).
 *
 * Este archivo es el punto de entrada: registra las cards. Se compila con
 * `npm run build` a dist/ma-player-card.js (un solo archivo, sin dependencias).
 *
 *   custom:ma-player-card   lo que suena + "Reproduciendo" a pantalla completa (cola, letra, buscador)
 *   custom:ma-browser-card  solo el buscador
 */

import { MaBrowserCard } from "./cards/browser-card/browser-card.js";
import { MaPlayerCard } from "./cards/player-card/player-card.js";
import { VERSION } from "./version.js";

const defineOnce = (name, cls) => {
  if (!customElements.get(name)) customElements.define(name, cls);
};
defineOnce("ma-browser-card", MaBrowserCard);
defineOnce("ma-player-card", MaPlayerCard);

window.customCards = window.customCards || [];
for (const card of [
  {
    type: "ma-player-card",
    name: "Music Assistant – Reproductor",
    description: "Lo que está sonando, controles, cola, letra sincronizada y buscador de música.",
  },
  {
    type: "ma-browser-card",
    name: "Music Assistant – Buscador",
    description: "Buscá canciones, artistas, álbumes, playlists y radios y reproducilos en un parlante.",
  },
]) {
  if (!window.customCards.some((c) => c.type === card.type)) {
    window.customCards.push({
      ...card,
      preview: true,
      documentationURL: "https://www.home-assistant.io/integrations/music_assistant/",
    });
  }
}
console.info(`%c MA-PLAYER-CARD %c v${VERSION} `, "background:#fa2d48;color:#fff;border-radius:4px 0 0 4px", "");
