/* The parts of Home Assistant's `hass` object this project uses; not the full type. */

export interface MediaPlayerAttributes {
  friendly_name?: string;
  media_title?: string;
  media_artist?: string;
  media_album_name?: string;
  media_duration?: number;
  media_position?: number;
  media_position_updated_at?: string;
  entity_picture?: string;
  entity_picture_local?: string;
  volume_level?: number;
  shuffle?: boolean;
  repeat?: RepeatMode;
  [key: string]: unknown;
}

export type RepeatMode = "off" | "all" | "one";

export interface HassEntityState<A = MediaPlayerAttributes> {
  entity_id: string;
  state: string;
  attributes: A;
  last_updated?: string;
}

/** An entry of `hass.entities` (the entity registry). */
export interface HassEntityRegistryEntry {
  entity_id: string;
  device_id?: string | null;
  platform?: string;
  translation_key?: string | null;
  hidden?: boolean;
}

export interface Hass {
  language?: string;
  locale?: { language?: string };
  states: Record<string, HassEntityState | undefined>;
  entities?: Record<string, HassEntityRegistryEntry | undefined>;
  services?: Record<string, Record<string, unknown> | undefined>;
  callWS<T = unknown>(msg: Record<string, unknown>): Promise<T>;
  callService(domain: string, service: string, data?: Record<string, unknown>): Promise<unknown>;
}

/** A getter, because cards receive a new `hass` object on every state change. */
export type HassGetter = () => Hass;
