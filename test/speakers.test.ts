import { describe, expect, it } from "vitest";
import { speakerSheet } from "../src/components/speaker-picker.js";
import type { HassEntityState } from "../src/models/hass.js";
import { listSpeakers, speakerName } from "../src/services/speakers.js";
import { fakeHass } from "./helpers/fake-hass.js";

const state = (entity_id: string, s: string, attrs: Record<string, unknown> = {}): HassEntityState => ({
  entity_id,
  state: s,
  attributes: { friendly_name: entity_id.split(".")[1], ...attrs },
});

const hass = fakeHass({
  entities: {
    "media_player.salon": { entity_id: "media_player.salon", platform: "music_assistant" },
    "media_player.cocina": { entity_id: "media_player.cocina", platform: "music_assistant" },
    "media_player.patio": { entity_id: "media_player.patio", platform: "music_assistant" },
    "media_player.oculto": { entity_id: "media_player.oculto", platform: "music_assistant", hidden: true },
    "media_player.tv": { entity_id: "media_player.tv", platform: "cast" },
    "media_player.borrado": { entity_id: "media_player.borrado", platform: "music_assistant" },
  },
  states: {
    "media_player.salon": state("media_player.salon", "playing", { media_title: "BAILAR O MORIR", media_artist: "BOM" }),
    "media_player.cocina": state("media_player.cocina", "idle"),
    "media_player.patio": state("media_player.patio", "unavailable"),
    "media_player.oculto": state("media_player.oculto", "idle"),
    "media_player.tv": state("media_player.tv", "idle"),
    "media_player.dormitorio": state("media_player.dormitorio", "paused"),
  },
});

describe("listSpeakers", () => {
  it("lista los parlantes de Music Assistant visibles y con estado", () => {
    expect(listSpeakers(hass, "media_player.salon")).toEqual(["media_player.salon", "media_player.cocina", "media_player.patio"]);
  });

  it("respeta la lista configurada y agrega el de la configuración primero", () => {
    expect(listSpeakers(hass, "media_player.salon", ["media_player.cocina", "media_player.dormitorio"])).toEqual([
      "media_player.salon",
      "media_player.cocina",
      "media_player.dormitorio",
    ]);
  });

  it("sin hass, ninguno", () => {
    expect(listSpeakers(undefined, "media_player.salon")).toEqual([]);
  });
});

describe("speakerName", () => {
  it("usa el nombre amigable o el entity_id", () => {
    expect(speakerName(hass, "media_player.cocina")).toBe("cocina");
    expect(speakerName(hass, "media_player.nada")).toBe("media_player.nada");
    expect(speakerName(hass, null)).toBe("");
  });
});

describe("speakerSheet", () => {
  const ids = ["media_player.salon", "media_player.cocina", "media_player.patio"];

  it("muestra qué suena, marca el elegido y pliega los no disponibles", () => {
    const spec = speakerSheet(hass, ids, "media_player.cocina");
    expect(spec.header?.title).toBe("Reproducir en");
    expect(spec.choices).toEqual([
      {
        key: "media_player.salon",
        label: "salon",
        sublabel: "BAILAR O MORIR · BOM",
        icon: "mdi:speaker-wireless",
        active: true,
        selected: false,
        disabled: false,
      },
      {
        key: "media_player.cocina",
        label: "cocina",
        sublabel: "Inactivo",
        icon: "mdi:speaker",
        active: false,
        selected: true,
        disabled: false,
      },
    ]);
    expect(spec.more?.label).toBe("No disponibles (1)");
    expect(spec.more?.choices.map((c) => [c.key, c.disabled])).toEqual([["media_player.patio", true]]);
  });

  it("el elegido queda arriba aunque no esté disponible", () => {
    const spec = speakerSheet(hass, ids, "media_player.patio");
    expect(spec.choices?.map((c) => c.key)).toContain("media_player.patio");
    expect(spec.more).toBeUndefined();
  });
});
