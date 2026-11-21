import { APPLE_RED } from "../../constants.js";

/* ------------------------------------------------------------------------
 * Estilos — inspirados en Apple Music, construidos sobre las variables de HA
 * para que funcionen en modo claro y oscuro.
 * ---------------------------------------------------------------------- */
export const STYLES = `
  :host {
    display: block;
    --accent: ${APPLE_RED};
    --fill: color-mix(in srgb, var(--primary-text-color) 7%, transparent);       /* relleno gris iOS */
    --fill-strong: color-mix(in srgb, var(--primary-text-color) 12%, transparent);
    --sep: color-mix(in srgb, var(--primary-text-color) 12%, transparent);        /* líneas finas */
    --glass: color-mix(in srgb, var(--card-background-color, #fff) 72%, transparent);
    --glass-bg: color-mix(in srgb, var(--primary-background-color, #f2f2f7) 80%, transparent);
    --blur: blur(30px) saturate(180%);
    --art-radius: 10px;
  }

  /* ---------- Botón compacto (tarjeta en el panel) ---------- */
  .launcher-card { height: 100%; overflow: hidden; }
  .launcher { all: unset; box-sizing: border-box; width: 100%; height: 100%; min-height: 56px;
    display: flex; align-items: center; gap: 12px; padding: 8px 16px 8px 8px; cursor: pointer;
    -webkit-tap-highlight-color: transparent; transition: transform .12s ease; }
  .launcher:active { transform: scale(.98); }
  .launcher:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; border-radius: inherit; }
  .l-icon { width: 42px; height: 42px; flex: 0 0 42px; border-radius: 50%; display: grid; place-items: center;
    color: #fff; background: linear-gradient(145deg, color-mix(in srgb, var(--accent) 75%, #fff), var(--accent));
    box-shadow: 0 4px 12px color-mix(in srgb, var(--accent) 35%, transparent); }
  .l-icon ha-icon { --mdc-icon-size: 22px; }
  .l-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .l-name { font-size: 15px; font-weight: 600; color: var(--primary-text-color);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .l-sub { font-size: 13px; color: var(--secondary-text-color);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .l-chev { color: var(--secondary-text-color); opacity: .6; }

  /* ---------- Pantalla completa ---------- */
  dialog.full { position: fixed; inset: 0; width: 100vw; height: 100vh; height: 100dvh;
    max-width: none; max-height: none; margin: 0; padding: 0; border: 0;
    background: var(--glass-bg); -webkit-backdrop-filter: var(--blur); backdrop-filter: var(--blur);
    color: var(--primary-text-color); overflow: hidden; }
  dialog.full::backdrop { background: transparent; }

  /* Con algo sonando: mismo fondo que "Reproduciendo" (portada desenfocada, texto claro) */
  :host([artwork]) {
    --primary-text-color: #fff;
    --secondary-text-color: rgba(255, 255, 255, .62);
    --primary-background-color: #1c1c1e;
    --card-background-color: #2c2c2e;
    --glass-bg: rgba(28, 28, 30, .2);
    --fill: rgba(255, 255, 255, .1);
    --fill-strong: rgba(255, 255, 255, .16);
    --sep: rgba(255, 255, 255, .14);
    color-scheme: dark;
  }
  :host([artwork]) dialog.full { background: #1c1c1e; }
  .full-bg, .full-shade { display: none; position: absolute; pointer-events: none; }
  :host([artwork]) .full-bg { display: block; inset: -15%; background: #2c2c2e center / cover no-repeat;
    filter: blur(70px) saturate(1.6) brightness(.8); transform: translateZ(0); }
  :host([artwork]) .full-shade { display: block; inset: 0; background: linear-gradient(180deg, rgba(0, 0, 0, .25), rgba(0, 0, 0, .55)); }
  .wrap.is-full { position: relative; }
  dialog.full[open] { animation: rise .32s cubic-bezier(.2, .9, .3, 1); }
  @keyframes rise { from { transform: translateY(24px); opacity: 0; } to { transform: none; opacity: 1; } }

  .wrap { container-type: inline-size; --cols: 4; --list-cols: 1; }
  .wrap.is-full { height: 100%; overflow-y: auto; overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch; }
  .wrap.is-inline { padding: 16px; }

  .head { padding: 0 0 12px; }
  .is-full .head { position: sticky; top: 0; z-index: 2;
    padding: max(12px, env(safe-area-inset-top)) max(20px, env(safe-area-inset-right)) 12px max(20px, env(safe-area-inset-left));
    border-bottom: .5px solid transparent; transition: background .2s, border-color .2s; }
  .is-full.scrolled .head { background: var(--glass); -webkit-backdrop-filter: var(--blur); backdrop-filter: var(--blur);
    border-bottom-color: var(--sep); }
  .is-full .body { padding: 4px max(20px, env(safe-area-inset-right)) max(32px, env(safe-area-inset-bottom)) max(20px, env(safe-area-inset-left)); }

  .topbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 8px 0 10px; }
  .actions { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .speaker { display: flex; align-items: center; gap: 6px; height: 40px; max-width: 46vw; padding: 0 10px 0 12px;
    border-radius: 999px; border: 0; cursor: pointer; font: inherit; font-size: 15px; font-weight: 600;
    background: var(--fill-strong); color: var(--accent); -webkit-tap-highlight-color: transparent; }
  .speaker span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .speaker ha-icon { --mdc-icon-size: 20px; flex: 0 0 auto; }
  .speaker .chev { --mdc-icon-size: 18px; opacity: .7; }
  .speaker:active { filter: brightness(.94); }
  h1 { margin: 0; font-size: 34px; line-height: 1.1; font-weight: 700; letter-spacing: -.02em; }
  .close { width: 40px; height: 40px; border-radius: 50%; border: 0; cursor: pointer; display: grid; place-items: center;
    background: var(--fill-strong); color: var(--secondary-text-color); }
  .close ha-icon { --mdc-icon-size: 22px; }

  /* Buscador estilo iOS */
  .search { display: flex; align-items: center; gap: 6px; height: 44px; padding: 0 4px 0 10px;
    border-radius: 12px; background: var(--fill-strong); color: var(--secondary-text-color); }
  .search > ha-icon { --mdc-icon-size: 22px; }
  .search input { flex: 1; min-width: 0; height: 100%; border: 0; outline: 0; background: transparent;
    color: var(--primary-text-color); font: inherit; font-size: 17px; caret-color: var(--accent); }
  .search input::placeholder { color: var(--secondary-text-color); opacity: .8; }
  .search input::-webkit-search-cancel-button { display: none; }
  .clear { width: 40px; height: 40px; border-radius: 50%; border: 0; background: transparent;
    color: inherit; cursor: pointer; display: grid; place-items: center; opacity: .7; }
  .clear ha-icon { --mdc-icon-size: 20px; }
  .clear[hidden] { display: none; }

  /* Pestañas tipo cápsula */
  .tabs { display: flex; gap: 8px; margin-top: 12px; overflow-x: auto; scrollbar-width: none; }
  .tabs::-webkit-scrollbar { display: none; }
  .tab { flex: 0 0 auto; height: 36px; padding: 0 16px; border-radius: 999px; border: 0; cursor: pointer;
    font: inherit; font-size: 15px; font-weight: 500; background: var(--fill); color: var(--primary-text-color);
    -webkit-tap-highlight-color: transparent; transition: background .2s, color .2s; }
  .tab[aria-selected="true"] { background: var(--accent); color: #fff; font-weight: 600; }

  /* Cuadrícula (artistas, álbumes, playlists, radios) */
  .grid { display: grid; grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); gap: 20px 14px;
    transition: opacity .2s; }
  .grid.dim, .list.dim { opacity: .5; pointer-events: none; }
  .item { cursor: pointer; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;
    -webkit-tap-highlight-color: transparent; outline: none; transition: transform .15s ease; }
  .item.pressed, .item:active { transform: scale(.97); }
  .tile:focus-visible .art { outline: 3px solid var(--accent); outline-offset: 2px; }
  .art { position: relative; aspect-ratio: 1; border-radius: var(--art-radius); overflow: hidden;
    background: var(--fill); display: grid; place-items: center;
    box-shadow: 0 4px 14px rgba(0, 0, 0, .12), 0 0 0 .5px var(--sep); }
  .art.round { border-radius: 50%; }
  .art img { width: 100%; height: 100%; object-fit: cover; display: block; pointer-events: none; }
  .art .ph { --mdc-icon-size: 40%; color: var(--secondary-text-color); opacity: .5; }
  .tile .more { position: absolute; bottom: 8px; right: 8px; width: 36px; height: 36px; border-radius: 50%;
    border: 0; cursor: pointer; display: grid; place-items: center; color: #fff;
    background: rgba(30, 30, 30, .35); -webkit-backdrop-filter: blur(12px) saturate(180%); backdrop-filter: blur(12px) saturate(180%);
    transition: opacity .15s; }
  .tile .art.round .more { bottom: 10%; right: 10%; }
  @media (hover: hover) { .tile .more { opacity: 0; } .tile:hover .more, .tile .more:focus-visible { opacity: 1; } }
  .meta { min-width: 0; }
  .tile .meta { padding: 8px 2px 0; }
  .tile .art.round + .meta { text-align: center; }
  .title { font-size: 14px; font-weight: 500; color: var(--primary-text-color); line-height: 1.25;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .ver { color: var(--secondary-text-color); font-weight: 400; }
  .sub { font-size: 13px; color: var(--secondary-text-color); margin-top: 2px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  /* Estantes de la vista inicial (desplazamiento horizontal) */
  .shelf-sec { margin-bottom: 26px; }
  .shelf-title { margin: 6px 0 12px; font-size: 22px; font-weight: 700; letter-spacing: -.01em; }
  .skel-title { width: 220px; height: 22px; border-radius: 8px; background: var(--fill); }
  .shelf { display: grid; grid-auto-flow: column; grid-auto-columns: var(--shelf-w, 170px); gap: 14px;
    overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; padding-bottom: 6px;
    overscroll-behavior-x: contain; -webkit-overflow-scrolling: touch; }
  .shelf::-webkit-scrollbar { display: none; }
  .shelf > .tile { scroll-snap-align: start; }
  .is-full .shelf { margin: 0 calc(-1 * max(20px, env(safe-area-inset-left))); padding-left: max(20px, env(safe-area-inset-left));
    padding-right: max(20px, env(safe-area-inset-right)); scroll-padding-left: max(20px, env(safe-area-inset-left)); }

  /* Lista (canciones) */
  .list { display: grid; grid-template-columns: repeat(var(--list-cols), minmax(0, 1fr)); column-gap: 28px;
    transition: opacity .2s; }
  .row { display: flex; align-items: center; gap: 12px; min-height: 64px; position: relative; border-radius: 10px; }
  .row::after { content: ""; position: absolute; left: 64px; right: 0; bottom: 0; height: .5px; background: var(--sep); }
  .row .art { width: 52px; flex: 0 0 52px; border-radius: 6px; box-shadow: 0 0 0 .5px var(--sep); }
  .row .meta { flex: 1; }
  .row .title { -webkit-line-clamp: 1; font-size: 15px; font-weight: 400; }
  .row .more { width: 44px; height: 44px; flex: 0 0 44px; border: 0; background: transparent; border-radius: 50%;
    color: var(--primary-text-color); cursor: pointer; display: grid; place-items: center; }
  .row .more:active { background: var(--fill); }
  .row.pressed, .row:active { transform: none; background: var(--fill); }
  .row:focus-visible { background: var(--fill); }

  /* Feedback sobre la portada */
  .fx { position: absolute; inset: 0; display: grid; place-items: center; pointer-events: none;
    background: rgba(0, 0, 0, 0); transition: background .2s; }
  .fx.busy, .fx.done { background: rgba(0, 0, 0, .4); }
  .fx.busy::after { content: ""; width: 32%; aspect-ratio: 1; max-width: 36px; border-radius: 50%;
    border: 3px solid rgba(255, 255, 255, .35); border-top-color: #fff; animation: spin .8s linear infinite; }
  .fx.done::after { content: "✓"; color: #fff; font-size: clamp(20px, 30cqw, 44px); font-weight: 700; animation: pop .35s ease-out; }
  .fx.fail { background: color-mix(in srgb, var(--error-color, #ff3b30) 75%, transparent); }
  .fx.fail::after { content: "!"; color: #fff; font-size: 28px; font-weight: 700; }
  .art { container-type: inline-size; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pop { from { transform: scale(.4); opacity: 0; } to { transform: scale(1); opacity: 1; } }

  /* Esqueleto de carga */
  .skel .art, .skel .line { background: linear-gradient(90deg, var(--fill) 25%, var(--fill-strong) 50%, var(--fill) 75%);
    background-size: 200% 100%; animation: shimmer 1.2s infinite linear; box-shadow: none; }
  .skel .line { height: 12px; border-radius: 6px; margin-top: 6px; width: 80%; }
  .skel .line.short { width: 50%; }
  @keyframes shimmer { to { background-position: -200% 0; } }

  /* Estados vacío / error */
  .state { display: flex; flex-direction: column; align-items: center; text-align: center;
    padding: 56px 16px; color: var(--secondary-text-color); }
  .state ha-icon { --mdc-icon-size: 56px; opacity: .4; margin-bottom: 12px; }
  .state-title { font-size: 20px; font-weight: 700; color: var(--primary-text-color); }
  .state-text { font-size: 15px; margin-top: 6px; max-width: 420px; word-break: break-word; }
  .retry { margin-top: 18px; height: 44px; padding: 0 24px; border-radius: 999px; border: 0;
    background: var(--accent); color: #fff; font: inherit; font-weight: 600; cursor: pointer; }

  /* Menú: hoja de acciones iOS */
  dialog.menu { border: 0; padding: 0; background: transparent; overflow: visible;
    width: min(400px, calc(100vw - 24px)); color: var(--primary-text-color); }
  dialog.menu::backdrop { background: rgba(0, 0, 0, .3);
    -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); }
  dialog.menu[open] { animation: menuIn .22s cubic-bezier(.2, .9, .3, 1.2); }
  @keyframes menuIn { from { transform: scale(.94); opacity: 0; } to { transform: none; opacity: 1; } }
  .sheet { display: block; width: 100%; border-radius: 16px; overflow: hidden;
    background: var(--glass); -webkit-backdrop-filter: var(--blur); backdrop-filter: var(--blur);
    box-shadow: 0 16px 48px rgba(0, 0, 0, .28); }
  .m-head { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: .5px solid var(--sep); }
  .m-art { width: 56px; height: 56px; flex: 0 0 56px; border-radius: 8px; overflow: hidden;
    background: var(--fill); display: grid; place-items: center; }
  .m-art.round { border-radius: 50%; }
  .m-art img { width: 100%; height: 100%; object-fit: cover; }
  .m-meta { min-width: 0; }
  .m-meta .title { font-weight: 600; font-size: 16px; }
  .m-opt { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px;
    height: 54px; padding: 0 18px; border: 0; cursor: pointer; font: inherit; font-size: 17px;
    background: transparent; color: var(--primary-text-color); text-align: left; }
  .m-opt + .m-opt { border-top: .5px solid var(--sep); }
  .m-opt ha-icon { color: var(--accent); }
  .m-opt:active { background: var(--fill); }
  .m-opt:focus, .m-cancel:focus { outline: none; }
  .m-opt:focus-visible { background: var(--fill); }
  .m-cancel { margin-top: 8px; height: 56px; border: 0; cursor: pointer; font: inherit; font-size: 17px;
    font-weight: 600; color: var(--accent); }
  .m-cancel:active { filter: brightness(.95); }
  /* Filas del selector de parlante */
  .spk { justify-content: flex-start; height: auto; min-height: 60px; padding: 8px 18px; }
  .spk[disabled] { opacity: .45; cursor: default; }
  .spk .spk-icon { color: var(--secondary-text-color); }
  .spk .spk-icon.on { color: var(--accent); }
  .spk-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .spk-name { font-size: 17px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .spk-sub { font-size: 13px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .spk.sel .spk-name { font-weight: 600; }
  .spk .spk-check { color: var(--accent); }
  .off-toggle { color: var(--secondary-text-color); font-size: 15px; height: 48px; }
  .off-toggle ha-icon { color: var(--secondary-text-color); transition: transform .2s; }
  .off-toggle[aria-expanded="true"] ha-icon { transform: rotate(180deg); }
  .off-list { display: none; }
  .off-toggle[aria-expanded="true"] + .off-list { display: block; }
  .off-list .m-opt { border-top: .5px solid var(--sep); }
  dialog.menu { max-height: calc(100dvh - 32px); }
  dialog.menu .sheet:first-child { max-height: calc(100dvh - 120px); overflow-y: auto; }

  @media (max-width: 600px) {
    dialog.menu { margin: auto auto max(12px, env(safe-area-inset-bottom)); }
    dialog.menu[open] { animation: sheetUp .28s cubic-bezier(.2, .9, .3, 1); }
    @keyframes sheetUp { from { transform: translateY(40px); opacity: 0; } to { transform: none; opacity: 1; } }
  }

  /* Aviso flotante (toast) de vidrio */
  .toast { position: fixed; inset: auto auto max(24px, env(safe-area-inset-bottom)) 50%; transform: translateX(-50%);
    margin: 0; display: flex; align-items: center; gap: 12px; width: max-content;
    max-width: min(440px, calc(100vw - 32px)); padding: 8px 18px 8px 8px; border: .5px solid var(--sep);
    border-radius: 18px; color: var(--primary-text-color);
    background: var(--glass); -webkit-backdrop-filter: var(--blur); backdrop-filter: var(--blur);
    box-shadow: 0 10px 36px rgba(0, 0, 0, .22); }
  .toast:not(:popover-open):not(.show) { display: none; }
  .toast:popover-open, .toast.show { animation: toastIn .3s cubic-bezier(.2, .9, .3, 1.2); }
  @keyframes toastIn { from { transform: translate(-50%, 16px); opacity: 0; } to { transform: translateX(-50%); opacity: 1; } }
  .toast img { width: 44px; height: 44px; border-radius: 8px; object-fit: cover; }
  .toast > ha-icon:first-child { margin-left: 8px; color: var(--accent); }
  .t-text { display: flex; flex-direction: column; min-width: 0; }
  .t-title { font-size: 15px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .t-sub { font-size: 13px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .t-icon { color: var(--accent); margin-left: 4px; }
  .toast.error { border-color: color-mix(in srgb, var(--error-color, #ff3b30) 50%, transparent); }
  .toast.error .t-icon, .toast.error > ha-icon:first-child { color: var(--error-color, #ff3b30); }

  @container (max-width: 480px) {
    .grid { gap: 16px 12px; }
    h1 { font-size: 30px; }
  }
`;
