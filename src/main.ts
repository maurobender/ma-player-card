/*
 * Entry point: registers the cards. `npm run build` bundles everything into dist/ma-player-card.js.
 *
 *   custom:ma-player-card   mini player + full-screen "Now playing" (queue, lyrics, browser)
 *   custom:ma-browser-card  the browser on its own
 */

import { MaBrowserCard } from "./cards/browser-card/browser-card.js";
import { MaPlayerCard } from "./cards/player-card/player-card.js";
import { MaPlayerLyrics } from "./cards/player-card/player-lyrics.js";
import { MaPlayerQueue } from "./cards/player-card/player-queue.js";
import { MaActionSheet } from "./components/action-sheet.js";
import { MaMarquee } from "./components/marquee.js";
import { MaSlider } from "./components/slider.js";
import { MaToast } from "./components/toast.js";
import { VERSION } from "./version.js";

interface CustomCardInfo {
  type: string;
  name: string;
  description: string;
  preview?: boolean;
  documentationURL?: string;
}

declare global {
  interface Window {
    customCards?: CustomCardInfo[];
  }
}

const defineOnce = (name: string, cls: CustomElementConstructor) => {
  if (!customElements.get(name)) customElements.define(name, cls);
};
// Components first: the cards use them as soon as they are created
defineOnce("ma-player-toast", MaToast);
defineOnce("ma-player-action-sheet", MaActionSheet);
defineOnce("ma-slider", MaSlider);
defineOnce("ma-marquee", MaMarquee);
defineOnce("ma-player-queue", MaPlayerQueue);
defineOnce("ma-player-lyrics", MaPlayerLyrics);
defineOnce("ma-browser-card", MaBrowserCard);
defineOnce("ma-player-card", MaPlayerCard);

window.customCards = window.customCards || [];
const customCards = window.customCards;
for (const card of [
  {
    type: "ma-player-card",
    name: "Music Assistant – Player",
    description: "What's playing, controls, queue, synced lyrics and a music browser.",
  },
  {
    type: "ma-browser-card",
    name: "Music Assistant – Browser",
    description: "Search songs, artists, albums, playlists and radio, and play them on a speaker.",
  },
]) {
  if (!customCards.some((c) => c.type === card.type)) {
    customCards.push({
      ...card,
      preview: true,
      documentationURL: "https://www.home-assistant.io/integrations/music_assistant/",
    });
  }
}
console.info(`%c MA-PLAYER-CARD %c v${VERSION} `, "background:#fa2d48;color:#fff;border-radius:4px 0 0 4px", "");
