import { stateLabel, type Translate } from "../i18n/index.js";
import type { Hass } from "../models/hass.js";
import { speakerName } from "../services/speakers.js";
import type { MaActionSheet, SheetChoice, SheetSpec } from "./action-sheet.js";

/**
 * The "Play on" sheet. Available players first; unavailable ones are folded at the end,
 * except the selected one, which always stays on top.
 */
export function speakerSheet(hass: Hass, ids: string[], current: string, t: Translate): SheetSpec {
  const choice = (id: string): SheetChoice => {
    const st = hass.states[id];
    const state = st?.state ?? "unavailable";
    const a = st?.attributes ?? {};
    const playing = state === "playing";
    return {
      key: id,
      label: speakerName(hass, id),
      sublabel:
        playing && a.media_title ? `${a.media_title}${a.media_artist ? ` · ${a.media_artist}` : ""}` : stateLabel(t, state),
      icon: playing ? "mdi:speaker-wireless" : "mdi:speaker",
      active: playing,
      selected: id === current,
      disabled: state === "unavailable",
    };
  };
  const isOff = (id: string) => hass.states[id]?.state === "unavailable" && id !== current;
  const off = ids.filter(isOff);
  return {
    header: { title: t("speakers.title") },
    choices: ids.filter((id) => !isOff(id)).map(choice),
    more: off.length ? { label: t("speakers.unavailable", { n: off.length }), choices: off.map(choice) } : undefined,
    cancelLabel: t("common.cancel"),
  };
}

/** Resolves to the picked player, or null when cancelled. */
export function pickSpeaker(
  sheet: MaActionSheet,
  hass: Hass,
  ids: string[],
  current: string,
  t: Translate,
): Promise<string | null> {
  return sheet.show(speakerSheet(hass, ids, current, t));
}
