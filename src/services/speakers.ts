import type { Hass } from "../models/hass.js";

/**
 * The players a user can pick: `speakers` from the config, or else every visible Music Assistant
 * media_player. The card's own entity always comes first.
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
