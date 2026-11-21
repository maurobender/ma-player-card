import { describe, expect, it } from "vitest";
import { hassLanguage, stateLabel, translator } from "../src/i18n/index.js";
import { fakeHass } from "./helpers/fake-hass.js";

describe("translator", () => {
  it("translates, matching regional variants to their base language", () => {
    expect(translator("es")("common.cancel")).toBe("Cancelar");
    expect(translator("es-AR")("common.cancel")).toBe("Cancelar");
  });

  it("falls back to English for unknown languages", () => {
    expect(translator("ja")("common.cancel")).toBe("Cancel");
  });

  it("fills placeholders and leaves unknown ones alone", () => {
    const t = translator("en");
    expect(t("common.playing_on", { name: "Kitchen" })).toBe("Playing on Kitchen");
    expect(t("common.playing_on")).toBe("Playing on {name}");
  });
});

describe("hassLanguage", () => {
  it("prefers the profile locale", () => {
    expect(hassLanguage({ ...fakeHass(), language: "en", locale: { language: "es" } })).toBe("es");
    expect(hassLanguage({ ...fakeHass(), language: "es" })).toBe("es");
    expect(hassLanguage(undefined)).toBe("en");
  });
});

describe("stateLabel", () => {
  it("translates known states and shows unknown ones as they are", () => {
    const t = translator("es");
    expect(stateLabel(t, "paused")).toBe("En pausa");
    expect(stateLabel(t, "something_new")).toBe("something_new");
  });
});
