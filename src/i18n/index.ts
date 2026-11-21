import type { Hass } from "../models/hass.js";
import { en } from "./en.js";
import { es } from "./es.js";

export type TranslationKey = keyof typeof en;
export type Translations = Record<TranslationKey, string>;
export type TranslationVars = Record<string, string | number>;
export type Translate = (key: TranslationKey, vars?: TranslationVars) => string;

const LANGUAGES: Record<string, Translations> = { en, es };

export const hassLanguage = (hass: Hass | undefined): string => hass?.locale?.language || hass?.language || "en";

/** Looks up `key` in `language` (or its base, "es-AR" → "es"), falling back to English. `{name}` placeholders take `vars`. */
export function translator(language: string): Translate {
  const strings = LANGUAGES[language] || LANGUAGES[language.split("-")[0]] || en;
  return (key, vars) => {
    const text = strings[key] ?? en[key];
    return vars ? text.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match)) : text;
  };
}

const STATES = ["playing", "paused", "idle", "on", "off", "standby", "buffering", "unavailable"] as const;

/** A media_player state for display; unknown states are shown as they are. */
export const stateLabel = (t: Translate, state: string): string =>
  (STATES as readonly string[]).includes(state) ? t(`state.${state}` as TranslationKey) : state;
