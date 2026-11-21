// Parlantes de Music Assistant: cuáles se pueden elegir y cómo se llaman.
import type { Hass } from "../models/hass.js";

/**
 * Parlantes elegibles: los de `speakers` en la configuración o, si no hay, todos los
 * media_player de Music Assistant visibles. El de la configuración va siempre primero.
 */
export function listSpeakers(hass: Hass | undefined, entity: string, configured?: string[]): string[] {
  if (!hass) return [];
  const list = configured
    ? [...configured]
    : Object.keys(hass.entities || {}).filter(
        (id) =>
          id.startsWith("media_player.") && hass.entities?.[id]?.platform === "music_assistant" && !hass.entities[id].hidden,
      );
  if (!list.includes(entity)) list.unshift(entity);
  return list.filter((id) => hass.states[id]);
}

export function speakerName(hass: Hass | undefined, entityId: string | null | undefined): string {
  if (!entityId) return "";
  const st = hass?.states[entityId];
  return (st?.attributes.friendly_name as string | undefined) || entityId;
}
