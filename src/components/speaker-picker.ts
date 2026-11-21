// Selector de parlante ("Reproducir en"), sobre la hoja de acciones.
import { STATE_LABELS } from "../constants.js";
import type { Hass } from "../models/hass.js";
import { speakerName } from "../services/speakers.js";
import type { MaActionSheet, SheetChoice, SheetSpec } from "./action-sheet.js";

/**
 * Disponibles primero; los no disponibles van al final, plegados.
 * El parlante elegido se muestra siempre arriba, aunque no esté disponible.
 */
export function speakerSheet(hass: Hass, ids: string[], current: string): SheetSpec {
  const choice = (id: string): SheetChoice => {
    const st = hass.states[id];
    const state = st?.state ?? "unavailable";
    const a = st?.attributes ?? {};
    const playing = state === "playing";
    return {
      key: id,
      label: speakerName(hass, id),
      sublabel:
        playing && a.media_title
          ? `${a.media_title}${a.media_artist ? ` · ${a.media_artist}` : ""}`
          : STATE_LABELS[state] || state,
      icon: playing ? "mdi:speaker-wireless" : "mdi:speaker",
      active: playing,
      selected: id === current,
      disabled: state === "unavailable",
    };
  };
  const isOff = (id: string) => hass.states[id]?.state === "unavailable" && id !== current;
  const off = ids.filter(isOff);
  return {
    header: { title: "Reproducir en" },
    choices: ids.filter((id) => !isOff(id)).map(choice),
    more: off.length ? { label: `No disponibles (${off.length})`, choices: off.map(choice) } : undefined,
  };
}

/** Abre el selector y devuelve el parlante elegido, o null si se canceló. */
export function pickSpeaker(sheet: MaActionSheet, hass: Hass, ids: string[], current: string): Promise<string | null> {
  return sheet.show(speakerSheet(hass, ids, current));
}
