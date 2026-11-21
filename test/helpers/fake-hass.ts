import type { Hass, HassEntityRegistryEntry, HassEntityState } from "../../src/models/hass.js";

export interface RecordedCall {
  kind: "ws" | "service";
  domain?: string;
  service?: string;
  data?: Record<string, unknown>;
  msg?: Record<string, unknown>;
}

type WsHandler = (msg: Record<string, unknown>) => unknown;

/** A fake hass that records every call and answers WebSocket messages with `onWs`. */
export function fakeHass(
  opts: {
    onWs?: WsHandler;
    services?: Record<string, Record<string, unknown>>;
    entities?: Record<string, HassEntityRegistryEntry>;
    states?: Record<string, HassEntityState>;
  } = {},
): Hass & { calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  return {
    calls,
    states: opts.states || {},
    entities: opts.entities || {},
    services: opts.services || {},
    async callWS<T>(msg: Record<string, unknown>): Promise<T> {
      calls.push({ kind: "ws", msg, domain: msg.domain as string, service: msg.service as string });
      return (opts.onWs ? await opts.onWs(msg) : {}) as T;
    },
    async callService(domain: string, service: string, data?: Record<string, unknown>) {
      calls.push({ kind: "service", domain, service, data });
      return undefined;
    },
  };
}
