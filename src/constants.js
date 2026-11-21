// Constantes compartidas por las cards.

export const TYPES = {
  track: { label: "Canciones", key: "tracks", icon: "mdi:music-note", enqueue: "play", list: true },
  artist: { label: "Artistas", key: "artists", icon: "mdi:account-music", enqueue: "replace", round: true },
  album: { label: "Álbumes", key: "albums", icon: "mdi:album", enqueue: "replace" },
  playlist: { label: "Playlists", key: "playlists", icon: "mdi:playlist-music", enqueue: "replace" },
  radio: { label: "Radios", key: "radio", icon: "mdi:radio", enqueue: "replace", noQueue: true },
  podcast: { label: "Podcasts", key: "podcasts", icon: "mdi:podcast", enqueue: "replace" },
  audiobook: { label: "Audiolibros", key: "audiobooks", icon: "mdi:book-music", enqueue: "replace" },
};
export const DEFAULT_TYPES = ["track", "artist", "album", "playlist", "radio"];
// Estantes de la vista inicial. order_by verificado en music_assistant/controllers/music/constants.py
export const DEFAULT_HOME = [
  { title: "Escuchado recientemente", media_type: "album", order_by: "last_played_desc" },
  { title: "Tus playlists", media_type: "playlist", favorite: true, order_by: "favorite_timestamp_desc" },
  { title: "Artistas favoritos", media_type: "artist", favorite: true, order_by: "favorite_timestamp_desc" },
  { title: "Álbumes favoritos", media_type: "album", favorite: true, order_by: "favorite_timestamp_desc" },
  { title: "Radios favoritas", media_type: "radio", favorite: true, order_by: "favorite_timestamp_desc" },
];
export const HOME_TTL_MS = 5 * 60 * 1000;
export const STATE_LABELS = {
  playing: "Reproduciendo",
  paused: "En pausa",
  idle: "Inactivo",
  on: "Encendido",
  off: "Apagado",
  standby: "En espera",
  buffering: "Cargando",
  unavailable: "No disponible",
};
export const APPLE_RED = "#fa2d48";
export const DEBOUNCE_MS = 350;
export const LONG_PRESS_MS = 500;
export const MIN_QUERY = 2;
export const MIN_TILE_PX = 110;
export const AUTO_TILE_PX = 170;
export const LIST_COL_PX = 340;
