/*
 * Lo mínimo que usamos del objeto `hass` que Home Assistant le pasa a las cards.
 * No es el tipo completo de HA: solo lo que lee o llama este proyecto.
 */

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

/** Entrada del registro de entidades (`hass.entities`). */
export interface HassEntityRegistryEntry {
  entity_id: string;
  device_id?: string | null;
  platform?: string;
  translation_key?: string | null;
}

export interface Hass {
  states: Record<string, HassEntityState | undefined>;
  entities?: Record<string, HassEntityRegistryEntry | undefined>;
  services?: Record<string, Record<string, unknown> | undefined>;
  callWS<T = unknown>(msg: Record<string, unknown>): Promise<T>;
  callService(domain: string, service: string, data?: Record<string, unknown>): Promise<unknown>;
}

/** Las clases de acceso a HA reciben una función: `hass` cambia en cada actualización. */
export type HassGetter = () => Hass;
