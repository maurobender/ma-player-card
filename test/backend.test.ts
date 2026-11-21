import { describe, expect, it } from "vitest";
import { BackendHolder, createBackend, resolveBackendName } from "../src/backend/backend.js";
import { moveSteps } from "../src/backend/mass-queue/queue.js";
import { NativeLibrary } from "../src/backend/native/library.js";
import { UnsupportedError } from "../src/backend/types.js";
import { fakeHass } from "./helpers/fake-hass.js";

const ENT = "media_player.salon";

const nativeItem = (i: number) => ({
  queue_item_id: `q${i}`,
  name: `Canción ${i}`,
  duration: 200 + i,
  media_item: { name: `Canción ${i}`, image: `img${i}`, artists: [{ name: "BOM" }, { name: "Lali" }], album: { name: "Álbum" } },
});

const queueResponse = (data: Record<string, unknown>) => ({
  response: {
    [ENT]: { current_index: 4, items: 30, elapsed_time: 12, current_item: nativeItem(4), next_item: nativeItem(5), ...data },
  },
});

describe("resolveBackendName", () => {
  it("auto picks mass_queue only when it is installed", () => {
    expect(resolveBackendName(fakeHass(), "auto")).toBe("native");
    expect(resolveBackendName(fakeHass({ services: { mass_queue: {} } }), "auto")).toBe("mass_queue");
    expect(resolveBackendName(fakeHass({ services: { mass_queue: {} } }), "native")).toBe("native");
    expect(resolveBackendName(fakeHass(), "mass_queue")).toBe("mass_queue");
  });

  it("BackendHolder reuses the backend and switches when mass_queue appears", () => {
    const hass = fakeHass();
    const holder = new BackendHolder(() => hass);
    const a = holder.get({ entity: ENT });
    expect(holder.get({ entity: ENT })).toBe(a);
    hass.services = { mass_queue: {} };
    const b = holder.get({ entity: ENT });
    expect(b.name).toBe("mass_queue");
    expect(b.can).toEqual({ reorder: true, remove: true, playItem: true, unfavorite: true });
  });
});

describe("library (official integration)", () => {
  it("searches with the entity's config_entry_id and returns the requested type", async () => {
    const hass = fakeHass({
      onWs: (msg) => {
        if (msg.type === "config/entity_registry/get") return { platform: "music_assistant", config_entry_id: "E1" };
        if (msg.service === "search") return { response: { tracks: [{ uri: "x://1", name: "Uno" }] } };
        return {};
      },
    });
    const lib = new NativeLibrary(() => hass, "media_player.busqueda");
    const items = await lib.search("queen", "track", { limit: 20 });
    expect(items).toEqual([{ uri: "x://1", name: "Uno" }]);
    const call = hass.calls.find((c) => c.service === "search");
    expect(call?.msg?.service_data).toEqual({
      config_entry_id: "E1",
      name: "queen",
      media_type: "track",
      limit: 20,
      library_only: false,
    });
  });

  it("falls back to the first loaded entry when the entity registry fails", async () => {
    const hass = fakeHass({
      onWs: (msg) => {
        if (msg.type === "config/entity_registry/get") throw new Error("no admin");
        if (msg.type === "config_entries/get")
          return [
            { entry_id: "OFF", state: "not_loaded" },
            { entry_id: "ON", state: "loaded" },
          ];
        return { response: { items: [] } };
      },
    });
    const lib = new NativeLibrary(() => hass, "media_player.fallback");
    expect(await lib.entryId()).toBe("ON");
  });

  it("plays with play_media on the chosen player", async () => {
    const hass = fakeHass();
    const lib = new NativeLibrary(() => hass, ENT, "E1");
    await lib.play("media_player.cocina", { uri: "x://1", mediaType: "album" }, "replace");
    expect(hass.calls[0].msg).toMatchObject({
      service: "play_media",
      service_data: { media_id: "x://1", media_type: "album", enqueue: "replace" },
      target: { entity_id: "media_player.cocina" },
    });
  });
});

describe("queue (official integration)", () => {
  it("normalizes the current and next songs", async () => {
    const hass = fakeHass({ onWs: () => queueResponse({}) });
    const info = await createBackend(() => hass, "native", { entity: ENT }).queue.info(ENT);
    expect(info).toMatchObject({ idx: 4, total: 30, elapsed: 12 });
    expect(info.current).toEqual({
      id: "q4",
      name: "Canción 4",
      artist: "BOM, Lali",
      album: "Álbum",
      image: "img4",
      duration: 204,
      favorite: undefined,
    });
  });

  it("fetches the list with offset/limit on a recent HA", async () => {
    const hass = fakeHass({
      onWs: (msg) => {
        const d = msg.service_data as { offset?: number; limit?: number };
        return queueResponse(d.limit ? { queue_items: [nativeItem(5), nativeItem(6)] } : {});
      },
    });
    const queue = createBackend(() => hass, "native", { entity: ENT }).queue;
    const info = await queue.info(ENT);
    expect((await queue.items(ENT, info, 50)).map((x) => x.id)).toEqual(["q5", "q6"]);
    expect(queue.partial).toBe(false);
  });

  it("shows only the next song on HA before November 2026, without retrying", async () => {
    const hass = fakeHass({
      onWs: (msg) => {
        if ((msg.service_data as { limit?: number }).limit) throw { message: "extra keys not allowed @ data['offset']" };
        return queueResponse({});
      },
    });
    const queue = createBackend(() => hass, "native", { entity: ENT }).queue;
    const info = await queue.info(ENT);
    expect((await queue.items(ENT, info, 50)).map((x) => x.id)).toEqual(["q5"]);
    expect(queue.partial).toBe(true);
    const before = hass.calls.length;
    await queue.items(ENT, info, 50);
    expect(hass.calls.length).toBe(before);
  });

  it("is read-only", async () => {
    const be = createBackend(() => fakeHass(), "native", { entity: ENT });
    expect(be.can).toEqual({ reorder: false, remove: false, playItem: false, unfavorite: false });
    await expect(be.queue.remove(ENT, "q5")).rejects.toBeInstanceOf(UnsupportedError);
  });
});

describe("queue with mass_queue", () => {
  it("normalizes get_queue_items items (no duration)", async () => {
    const hass = fakeHass({
      services: { mass_queue: {} },
      onWs: (msg) => {
        if (msg.domain === "mass_queue") {
          return {
            response: {
              [ENT]: [
                {
                  queue_item_id: "m1",
                  media_title: "Uno",
                  media_artist: "BOM",
                  media_album_name: "A",
                  media_image: "i",
                  favorite: true,
                },
              ],
            },
          };
        }
        return queueResponse({});
      },
    });
    const queue = createBackend(() => hass, "mass_queue", { entity: ENT }).queue;
    const items = await queue.items(ENT, await queue.info(ENT), 50);
    expect(items).toEqual([{ id: "m1", name: "Uno", artist: "BOM", album: "A", image: "i", duration: 0, favorite: true }]);
    const call = hass.calls.find((c) => c.domain === "mass_queue");
    expect(call?.msg?.service_data).toEqual({ entity: ENT, offset: 5, limit: 50 });
    expect(call?.msg?.target).toBeUndefined();
  });

  it("turns a move into up/down/next steps", () => {
    expect(moveSteps(3, 3)).toEqual([]);
    expect(moveSteps(4, 0)).toEqual(["next"]);
    expect(moveSteps(5, 2)).toEqual(["up", "up", "up"]);
    expect(moveSteps(1, 3)).toEqual(["down", "down"]);
  });

  it("moves, removes, jumps and unfavorites with the entity field", async () => {
    const hass = fakeHass({ services: { mass_queue: {} } });
    const be = createBackend(() => hass, "mass_queue", { entity: ENT });
    await be.queue.moveTo(ENT, "q9", 4, 2);
    await be.queue.remove(ENT, "q9");
    await be.queue.play(ENT, "q9");
    await be.favorites.unfavorite(ENT);
    expect(hass.calls.map((c) => `${c.domain}.${c.service}`)).toEqual([
      "mass_queue.move_queue_item_up",
      "mass_queue.move_queue_item_up",
      "mass_queue.remove_queue_item",
      "mass_queue.play_queue_item",
      "mass_queue.unfavorite_current_item",
    ]);
    expect(hass.calls[0].data).toEqual({ entity: ENT, queue_item_id: "q9" });
  });
});

describe("favorites (official integration)", () => {
  const entities = {
    [ENT]: { entity_id: ENT, device_id: "d1" },
    "button.salon_favorite_current_song": {
      entity_id: "button.salon_favorite_current_song",
      device_id: "d1",
      translation_key: "favorite_now_playing",
    },
    "button.otro_favorite_current_song": {
      entity_id: "button.otro_favorite_current_song",
      device_id: "d2",
      translation_key: "favorite_now_playing",
    },
  };

  it("presses the button on the same device", async () => {
    const hass = fakeHass({ entities });
    const fav = createBackend(() => hass, "native", { entity: ENT }).favorites;
    expect(fav.canFavorite(ENT)).toBe(true);
    await fav.favorite(ENT);
    expect(hass.calls[0]).toMatchObject({
      domain: "button",
      service: "press",
      data: { entity_id: "button.salon_favorite_current_song" },
    });
  });

  it("can't favorite without the button, and can't unfavorite", async () => {
    const fav = createBackend(() => fakeHass(), "native", { entity: ENT }).favorites;
    expect(fav.canFavorite(ENT)).toBe(false);
    await expect(fav.unfavorite(ENT)).rejects.toBeInstanceOf(UnsupportedError);
  });
});

describe("player", () => {
  it("sends media_player.* actions to the player", async () => {
    const hass = fakeHass();
    const p = createBackend(() => hass, "native", { entity: ENT }).player;
    await p.seek(ENT, 105.3);
    await p.setRepeat(ENT, "all");
    await p.setMute(ENT, true);
    expect(hass.calls.map((c) => [c.service, c.data])).toEqual([
      ["media_seek", { entity_id: ENT, seek_position: 105.3 }],
      ["repeat_set", { entity_id: ENT, repeat: "all" }],
      ["volume_mute", { entity_id: ENT, is_volume_muted: true }],
    ]);
  });
});
