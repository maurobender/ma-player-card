import { describe, expect, it } from "vitest";
import { speakerSheet } from "../src/components/speaker-picker.js";
import { translator } from "../src/i18n/index.js";
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
  it("lists the visible Music Assistant players that have a state", () => {
    expect(listSpeakers(hass, "media_player.salon")).toEqual(["media_player.salon", "media_player.cocina", "media_player.patio"]);
  });

  it("uses the configured list, with the card's entity first", () => {
    expect(listSpeakers(hass, "media_player.salon", ["media_player.cocina", "media_player.dormitorio"])).toEqual([
      "media_player.salon",
      "media_player.cocina",
      "media_player.dormitorio",
    ]);
  });

  it("returns nothing without hass", () => {
    expect(listSpeakers(undefined, "media_player.salon")).toEqual([]);
  });
});

describe("speakerName", () => {
  it("uses the friendly name, or else the entity_id", () => {
    expect(speakerName(hass, "media_player.cocina")).toBe("cocina");
    expect(speakerName(hass, "media_player.nada")).toBe("media_player.nada");
    expect(speakerName(hass, null)).toBe("");
  });
});

describe("speakerSheet", () => {
  const ids = ["media_player.salon", "media_player.cocina", "media_player.patio"];

  it("shows what plays, marks the selected one and folds the unavailable ones", () => {
    const spec = speakerSheet(hass, ids, "media_player.cocina", translator("es"));
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

  it("keeps the selected player on top even when unavailable", () => {
    const spec = speakerSheet(hass, ids, "media_player.patio", translator("es"));
    expect(spec.choices?.map((c) => c.key)).toContain("media_player.patio");
    expect(spec.more).toBeUndefined();
  });
});
