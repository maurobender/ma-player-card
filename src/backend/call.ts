import type { Hass } from "../models/hass.js";

/** Calls an action that returns data. `hass.callService` drops the response, so this goes through the WebSocket. */
export async function callWithResponse<T>(
  hass: Hass,
  domain: string,
  service: string,
  data: Record<string, unknown>,
  entity?: string,
): Promise<T> {
  const r = await hass.callWS<{ response?: unknown } | undefined>({
    type: "call_service",
    domain,
    service,
    service_data: data,
    ...(entity ? { target: { entity_id: entity } } : {}),
    return_response: true,
  });
  return (r?.response || r || {}) as T;
}

/** Entity actions respond per entity: { "media_player.x": {...} }. */
export function forEntity<T>(response: Record<string, unknown>, entity: string): T {
  return (response[entity] ?? response) as T;
}

export const errorMessage = (err: unknown): string => {
  if (err && typeof err === "object") {
    const e = err as { message?: string; code?: string };
    if (e.message || e.code) return String(e.message || e.code);
  }
  return String(err);
};
