# ma-player-card

Reproductor y buscador de **Music Assistant** para Home Assistant, con estilo inspirado en Apple Music.
Un solo archivo (`dist/ma-player-card.js`) con dos tarjetas:

| Tarjeta | Qué es |
|---|---|
| `custom:ma-player-card` | Lo que está sonando + **Reproduciendo** a pantalla completa: controles, progreso, volumen, aleatorio/repetir, favorito, **cola**, **letra sincronizada** y el buscador integrado (🔍). |
| `custom:ma-browser-card` | Solo el buscador: botón que abre la búsqueda a pantalla completa, con recientes y favoritos. |

- Para instalarlo no hace falta compilar nada: `dist/ma-player-card.js` ya viene listo y no tiene dependencias.
  El código fuente está en `src/` (ver *Desarrollo*).
- Funciona solo con la integración **oficial** de Music Assistant del core de HA.
  Si además tenés instalada [`mass_queue`](https://github.com/droans/mass_queue) (HACS), la cola se puede editar (ver *Backends*).

## Acciones de Music Assistant que usa (verificadas en la doc oficial)

| Acción | Para qué | Campos clave |
|---|---|---|
| `music_assistant.search` | Buscar | `config_entry_id`*, `name`*, `media_type` (`track`, `artist`, `album`, `playlist`, `radio`…), `limit` (def. 5), `library_only` |
| `music_assistant.get_library` | Vista inicial: recientes y favoritos | `config_entry_id`*, `media_type`*, `favorite`, `order_by` (`last_played_desc`, `favorite_timestamp_desc`, `play_count_desc`, `timestamp_added_desc`, `name`, `random`…), `limit` (def. 25) |
| `music_assistant.play_media` | Reproducir | target `entity_id`*, `media_id`* (URI), `media_type`, `enqueue` (`play`, `replace`, `next`, `replace_next`, `add`) |
| `music_assistant.get_queue` | Cola (solo lectura) y estado de favorito | target `entity_id`*, `limit`, `offset` |
| `media_player.*` | Controles | `media_play_pause`, `media_previous_track`, `media_next_track`, `media_seek`, `volume_set`, `shuffle_set`, `repeat_set` |
| `button.press` | ♥ Favorito | Botón *Favorito de la canción actual* que Music Assistant crea por cada parlante |
| `mass_queue.*` (opcional) | Editar la cola, quitar favorito | `get_queue_items`, `move_queue_item_up/down/next`, `remove_queue_item`, `play_queue_item`, `unfavorite_current_item` (campo `entity`, no target) |

`search` devuelve listas agrupadas: `artists`, `albums`, `tracks`, `playlists`, `radio`, … con `name`, `uri`, `image`, etc.
`config_entry_id` se detecta automáticamente desde la entidad (o se puede fijar en el YAML).

## Instalación

1. Copiá `dist/ma-player-card.js` a `/config/www/` (por ejemplo con la extensión *File editor* o *Samba*).
2. **Ajustes → Paneles de control → ⋮ → Recursos → Agregar recurso**
   - URL: `/local/ma-player-card.js?v=1`
   - Tipo: **Módulo JavaScript**
3. Recargá el navegador (en la Companion app: *Ajustes → Companion app → Depuración → Restablecer caché del frontend*, o cerrar y abrir la app).

> Si el menú *Recursos* no aparece, activá el **Modo avanzado** en tu perfil de usuario.

### Si venías usando `ma-browser-card.js`

El archivo cambió de nombre: ahora todo está en `ma-player-card.js` (incluido el buscador).

1. Copiá `dist/ma-player-card.js` a `/config/www/`.
2. En **Recursos**, **editá** el recurso viejo `/local/ma-browser-card.js?v=…` y cambiale la URL a `/local/ma-player-card.js?v=1`
   (o borralo y agregá el nuevo). **No dejes los dos**: se cargaría la versión vieja del buscador.
3. Tus tarjetas `custom:ma-browser-card` siguen funcionando igual, y el parlante elegido se conserva.
4. Opcional: borrá `/config/www/ma-browser-card.js`.

## Actualizar (cache-busting)

HA y la Companion app cachean los recursos agresivamente. Cada vez que reemplaces el archivo:

1. Editá el recurso y subí el número: `/local/ma-player-card.js?v=2`, `?v=3`, …
2. Recargá la página (Ctrl+Shift+R en escritorio).
3. Comprobá en la consola (F12) el banner con la versión, p. ej. `MA-PLAYER-CARD v0.5.1`.

## Reproductor (`ma-player-card`)

```yaml
type: custom:ma-player-card
entity: media_player.home_assistant_voice_0a7e7c_media_player_2
# Todas las opciones del buscador (media_types, home, speakers, accent_color, columns…) también valen acá
queue_limit: 50     # canciones de la cola que se muestran
lyrics: true        # botón de letra sincronizada
# backend: auto     # auto | native | mass_queue
```

| Opción | Por defecto | Descripción |
|---|---|---|
| `entity` | — (obligatorio) | Parlante por defecto |
| `queue_limit` | `50` | Próximas canciones que se muestran en la cola |
| `lyrics` | `true` | Muestra el botón de letra |
| `lyrics_offset` | `0.6` | Adelanto de la letra en segundos. Subilo si la letra va atrasada, bajalo (o negativo) si va adelantada |
| `lyrics_url` | `https://lrclib.net` | Servidor LRCLIB (por si usás uno propio) |
| `backend` | `auto` | `auto` usa `mass_queue` si está instalada; `native` fuerza la integración oficial; `mass_queue` la fuerza |
| `debug` | `false` | Muestra un panel con la posición, el backend y los eventos (para diagnosticar) |
| `accent_color` y opciones del buscador | | Se pasan al buscador integrado |

**En el panel** se ve una fila con la portada, título, artista, ⏮ ⏯ ⏭, 🔍 y una barra de progreso fina.
Si no suena nada, tocarla abre directamente el buscador.

**Al tocar la portada o el título** se abre *Reproduciendo* a pantalla completa:

- Fondo con la portada desenfocada; la portada se achica cuando está en pausa.
- ♥ agrega la canción actual a favoritos de Music Assistant. Con `mass_queue`, tocarlo de nuevo la quita.
- Barra de progreso arrastrable (adelantar/retroceder) y volumen.
- Abajo: 💬 letra · parlante · 🔍 buscar · ☰ cola.
- Con algo sonando, el buscador usa el mismo fondo (portada desenfocada y texto claro); sin nada sonando, usa el tema de HA.
- **Cola**: la canción actual y las siguientes (ver *Backends* para qué se puede hacer con cada una).
- **Letra sincronizada**: la línea actual se resalta y la vista se desplaza sola; tocá una línea para saltar a ese momento.
  Si no hay versión sincronizada, se muestra la letra sin sincronizar. Si no aparece, el botón *Buscar en lrclib.net*
  abre la búsqueda en la web para comprobar si existe (LRCLIB es comunitario: se pueden subir letras con la app LRCGET).
- Se cierra con la flecha ⌄, *Esc* o el botón *atrás* de Android (si el buscador está abierto encima, *atrás* cierra primero el buscador).

### Backends: integración oficial o `mass_queue`

La tarjeta habla con Music Assistant a través de un *backend*. La interfaz es la misma; cambia lo que se puede hacer:

| | `native` (oficial) | `mass_queue` (HACS) |
|---|---|---|
| Ver la cola | ✓ (lista completa con HA de noviembre de 2026 o posterior; antes, solo la próxima) | ✓ siempre completa |
| Tocar una canción para saltar a ella | — | ✓ |
| Arrastrar ≡ para reordenar | — | ✓ |
| Quitar de la cola (⊖) | — | ✓ |
| ♥ agregar a favoritos | ✓ | ✓ |
| ♥ quitar de favoritos | — | ✓ (solo canciones de la biblioteca) |
| Duración de cada canción en la cola | ✓ | — (mass_queue no la informa) |

Con `backend: auto` (por defecto) no hay que configurar nada: si instalás `mass_queue`, la tarjeta la usa sola.
`mass_queue` **no** cambia la barra de progreso: el reinicio a 0 después de pausar o adelantar es un problema de
Music Assistant (también le pasa a la tarjeta nativa de HA); la tarjeta lo compensa por su cuenta.

> **Privacidad:** la letra se busca en [LRCLIB](https://lrclib.net), un servicio gratuito y sin clave.
> Para eso, el dispositivo envía a lrclib.net el título, artista, álbum y duración de la canción. Con `lyrics: false` no se envía nada.

## Buscador (`ma-browser-card`)

```yaml
type: custom:ma-browser-card
entity: media_player.home_assistant_voice_0a7e7c_media_player_2
mode: compact      # compact = botón que abre el buscador a pantalla completa | inline = buscador dentro del panel
name: Buscar música
accent_color: "#fa2d48"   # rojo Apple Music; "theme" usa el color primario del tema
media_types: [track, artist, album, playlist, radio]   # pestañas visibles y su orden
limit: 20          # resultados por tipo
columns: 4         # columnas de la cuadrícula (auto en móvil)
library_only: false   # true = buscar solo en tu biblioteca
speaker_selector: true   # botón para elegir en qué parlante reproducir
# speakers: [media_player.salon, media_player.cocina]   # def.: todos los de Music Assistant
# home: ...                # estantes de la vista inicial (ver abajo)
# config_entry_id: 01J...   # opcional
```

| Opción | Por defecto | Descripción |
|---|---|---|
| `entity` | — (obligatorio) | `media_player` de Music Assistant donde se reproduce |
| `mode` | `compact` | `compact`: botón que abre el buscador a pantalla completa. `inline`: buscador dentro del panel |
| `name` | `Buscar música` | Texto del botón (modo `compact`) |
| `accent_color` | `#fa2d48` | Color de acento. `theme` usa `--primary-color` del tema |
| `media_types` | `[track, artist, album, playlist, radio]` | Pestañas y su orden. También `podcast`, `audiobook` |
| `limit` | `20` | Resultados por búsqueda |
| `columns` | auto | Columnas máximas; en pantallas angostas se reducen solas |
| `library_only` | `false` | Buscar solo en la biblioteca |
| `speaker_selector` | `true` | Muestra el botón de parlante arriba a la derecha |
| `speakers` | todos los de MA | Parlantes que aparecen en el selector |
| `home` | ver abajo | Estantes de la vista inicial. `home: []` la desactiva |
| `home_limit` | `20` | Portadas por estante |
| `config_entry_id` | auto | Solo si la detección automática falla |

### Vista inicial (`home`)

Al abrir el buscador sin texto se muestran estantes que se desplazan de costado. Los vacíos se ocultan.
Por defecto:

```yaml
home:
  - title: Escuchado recientemente
    media_type: album
    order_by: last_played_desc
  - title: Tus playlists
    media_type: playlist
    favorite: true
    order_by: favorite_timestamp_desc
  - title: Artistas favoritos
    media_type: artist
    favorite: true
    order_by: favorite_timestamp_desc
  - title: Álbumes favoritos
    media_type: album
    favorite: true
    order_by: favorite_timestamp_desc
  - title: Radios favoritas
    media_type: radio
    favorite: true
    order_by: favorite_timestamp_desc
```

Cada estante acepta `title`, `media_type`, `favorite`, `order_by` y `limit`.

### Selector de parlante

El botón con el nombre del parlante (arriba a la derecha) abre la lista de parlantes de Music Assistant,
con lo que está sonando en cada uno. La elección se recuerda **en ese dispositivo** (la tablet y el móvil
pueden tener parlantes distintos). Si el parlante elegido desaparece, vuelve al de `entity`.

## Uso

- **Tocá el botón** para abrir el buscador a pantalla completa. Sin texto, muestra tus recientes y favoritos. Se cierra con la ✕, con *Esc* o con el botón *atrás* de Android.
- **Escribí** en el buscador: busca solo (a los 350 ms) o al pulsar *Enter*.
- Las **canciones** se muestran en lista (1–3 columnas según el ancho); el resto, en cuadrícula de portadas.
- **Tocá** un resultado: reproduce ya en el parlante.
  - Canciones → `enqueue: play` (suena ahora, conserva la cola).
  - Artistas, álbumes, playlists y radios → `enqueue: replace` (reemplaza la cola).
- **Mantené pulsado** (o tocá **⋯**): *Reproducir ahora*, *Reproducir a continuación* (`next`), *Agregar a la cola* (`add`).
  Las radios solo tienen *Reproducir ahora*.

Con `ma-player-card` no hace falta una tarjeta de búsqueda aparte: el 🔍 abre el mismo buscador.
`ma-browser-card` sigue siendo útil si querés solo el botón de búsqueda en otro panel.

## Desarrollo

Requiere Node.js 20 o posterior.

```bash
npm install
```

| Comando | Qué hace |
|---|---|
| `npm run build` | Compila `src/` en `dist/ma-player-card.js` (lo que se copia a HA) |
| `npm run dev` | Recompila al guardar y sirve los mocks en <http://localhost:8766/player.html> y <http://localhost:8766/browser.html> |
| `npm run lint` | Revisa el código con Biome |
| `npm run format` | Formatea el código con Biome |
| `npm run typecheck` | Revisa los tipos con TypeScript |
| `npm test` | Corre los tests (Vitest) |
| `npm run check` | Lint + tipos + tests + build |

La versión sale de `package.json`: al publicar una versión nueva, subila ahí y corré `npm run build`.
`dist/` se guarda en git para que instalar sea solo copiar un archivo.

Los mocks de `dev/` simulan `hass` en el navegador. En `player.html`, `?mq=1` simula la integración `mass_queue`.

```
src/
  main.ts                 registra las cards (punto de entrada)
  version.ts              versión (la inyecta el build)
  constants.ts            tipos de medio, estantes por defecto, etc.
  models/hass.ts          tipos del objeto hass y las entidades
  cards/
    browser-card/         ma-browser-card y sus estilos
    player-card/          ma-player-card y sus estilos
  backend/                única forma de hablar con Music Assistant
    types.ts              contrato: biblioteca, cola, favoritos, reproductor
    backend.ts            elige native o mass_queue y arma el backend
    native/               integración oficial de HA
    mass-queue/           cola y favoritos con la integración mass_queue
  components/             UI compartida entre las dos cards
    action-sheet.ts       menú estilo iOS (<ma-player-action-sheet>)
    toast.ts              aviso flotante (<ma-player-toast>)
    speaker-picker.ts     selector "Reproducir en"
    overlay-history.ts    el botón "atrás" cierra diálogos y menús
    slider.ts             barras de progreso y volumen
    theme.ts              variables de color (tema claro y oscuro)
  services/
    playback-clock.ts     posición de la canción (incluye el parche del bug #7194)
    lyrics/               letras (LRCLIB y parser LRC)
    speaker-target.ts     parlante elegido (compartido entre cards)
    speakers.ts           lista y nombres de parlantes
  utils/                  escape de HTML, formato, ids, vibración
test/                     tests (Vitest)
dev/                      mocks para probar en el navegador
scripts/build.mjs         build con esbuild
```

Las cards no llaman a `hass` directamente: todo pasa por `backend/`. La biblioteca y los controles
del reproductor usan siempre la integración oficial; la cola y los favoritos usan `mass_queue` si
está instalada (o si se fuerza con `backend:`).
