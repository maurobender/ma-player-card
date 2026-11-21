import type { Hass } from "../models/hass.js";

/**
 * Llama a una acción de HA que devuelve datos (return_response) por WebSocket.
 * `hass.callService` no devuelve la respuesta, por eso usamos `call_service` a mano.
 */
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
  return ((r && r.response) || r || {}) as T;
}

/** Las acciones de entidad devuelven un objeto por entidad: { "media_player.x": {...} }. */
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
