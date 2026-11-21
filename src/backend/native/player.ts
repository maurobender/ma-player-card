import type { HassGetter, RepeatMode } from "../../models/hass.js";
import type { PlayerApi } from "../types.js";

export class HaPlayer implements PlayerApi {
  constructor(private readonly hass: HassGetter) {}

  private async call(entity: string, service: string, data: Record<string, unknown> = {}): Promise<void> {
    await this.hass().callService("media_player", service, { entity_id: entity, ...data });
  }

  playPause(entity: string) {
    return this.call(entity, "media_play_pause");
  }

  previous(entity: string) {
    return this.call(entity, "media_previous_track");
  }

  next(entity: string) {
    return this.call(entity, "media_next_track");
  }

  seek(entity: string, seconds: number) {
    return this.call(entity, "media_seek", { seek_position: seconds });
  }

  setVolume(entity: string, level: number) {
    return this.call(entity, "volume_set", { volume_level: level });
  }

  setMute(entity: string, muted: boolean) {
    return this.call(entity, "volume_mute", { is_volume_muted: muted });
  }

  setShuffle(entity: string, shuffle: boolean) {
    return this.call(entity, "shuffle_set", { shuffle });
  }

  setRepeat(entity: string, repeat: RepeatMode) {
    return this.call(entity, "repeat_set", { repeat });
  }
}
