export const PLAYER_STYLES = `
  /* ---------- Mini reproductor (tarjeta en el panel) ---------- */
  .mini { position: relative; overflow: hidden; container-type: inline-size; }
  .mini-row { display: flex; align-items: center; gap: 6px; padding: 10px 8px 12px 10px; }
  .mini-main { all: unset; box-sizing: border-box; flex: 1; min-width: 0; display: flex; align-items: center; gap: 12px;
    cursor: pointer; border-radius: 12px; -webkit-tap-highlight-color: transparent; }
  .mini-main:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .mini-main:active .mini-art { transform: scale(.95); }
  .mini-art { width: 56px; height: 56px; flex: 0 0 56px; border-radius: 10px; overflow: hidden; display: grid;
    place-items: center; background: var(--fill); box-shadow: 0 4px 12px rgba(0, 0, 0, .15); transition: transform .15s; }
  .mini-art img { width: 100%; height: 100%; object-fit: cover; }
  .mini-art ha-icon { color: var(--secondary-text-color); }
  .mini-text { min-width: 0; display: flex; flex-direction: column; }
  .mini-title { font-size: 15px; font-weight: 600; color: var(--primary-text-color);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .mini-sub { font-size: 13px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .mini-ctrls { display: flex; align-items: center; }
  .ib { width: 46px; height: 46px; border-radius: 50%; border: 0; background: transparent; cursor: pointer;
    color: var(--primary-text-color); display: grid; place-items: center; -webkit-tap-highlight-color: transparent; }
  .ib:active { background: var(--fill); }
  .ib ha-icon { --mdc-icon-size: 28px; }
  .ib.play ha-icon { --mdc-icon-size: 36px; }
  .ib.search { color: var(--primary-text-color); }
  .ib.search ha-icon { --mdc-icon-size: 26px; }
  .mini.idle .prev, .mini.idle .play, .mini.idle .next, .mini.idle .mini-progress { display: none; }
  .mini-progress { position: absolute; left: 0; right: 0; bottom: 0; height: 3px; background: var(--fill); }
  .mini-progress .fill { height: 100%; width: 0; background: var(--accent); transition: width .5s linear; }
  @container (max-width: 400px) { .mini .prev { display: none; } }

  /* ---------- Reproduciendo (pantalla completa) ---------- */
  dialog.np { position: fixed; inset: 0; width: 100vw; height: 100vh; height: 100dvh; max-width: none; max-height: none;
    margin: 0; padding: 0; border: 0; overflow: hidden; background: #1c1c1e; color: #fff;
    --np-dim: rgba(255, 255, 255, .62); --np-fill: rgba(255, 255, 255, .16); }
  dialog.np::backdrop { background: rgba(0, 0, 0, .4); }
  dialog.np[open] { animation: npUp .38s cubic-bezier(.2, .9, .3, 1); }
  @keyframes npUp { from { transform: translateY(6%); opacity: 0; } to { transform: none; opacity: 1; } }
  .np-bg { position: absolute; inset: -15%; background: #2c2c2e center / cover no-repeat;
    filter: blur(70px) saturate(1.6) brightness(.8); transform: translateZ(0); }
  .np-shade { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0, 0, 0, .08), rgba(0, 0, 0, .45)); }
  .np-inner { position: relative; height: 100%; box-sizing: border-box; display: grid; gap: 14px;
    grid-template-rows: auto minmax(0, 1fr) auto; grid-template-areas: "top" "stage" "panel";
    padding: max(8px, env(safe-area-inset-top)) max(24px, env(safe-area-inset-right))
             max(20px, env(safe-area-inset-bottom)) max(24px, env(safe-area-inset-left)); }
  @media (min-aspect-ratio: 5/4) and (min-width: 760px) {
    .np-inner { grid-template-columns: minmax(0, 1.1fr) minmax(340px, 1fr); grid-template-rows: auto minmax(0, 1fr);
      grid-template-areas: "top top" "stage panel"; column-gap: 6vw; padding-bottom: max(32px, env(safe-area-inset-bottom)); }
    .np-panel { align-self: center; }
  }
  .np-top { grid-area: top; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .np-where { flex: 1; text-align: center; font-size: 12px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase;
    color: var(--np-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .np-top-spacer { width: 44px; flex: 0 0 44px; }
  .np-btn { width: 44px; height: 44px; flex: 0 0 auto; border: 0; border-radius: 50%; background: transparent; color: #fff;
    display: grid; place-items: center; cursor: pointer; -webkit-tap-highlight-color: transparent;
    transition: background .15s, transform .1s; }
  .np-btn:active { transform: scale(.88); }
  .np-btn:focus { outline: none; }
  .np-btn:focus-visible { background: var(--np-fill); }
  .np-btn ha-icon { --mdc-icon-size: 28px; }
  #npClose { background: var(--np-fill); }

  .np-stage { grid-area: stage; min-height: 0; position: relative; container-type: size; }
  .np-stage > * { position: absolute; inset: 0; display: none; }
  .np-stage[data-view="art"] .view-art { display: grid; place-items: center; }
  .np-stage[data-view="queue"] .view-queue, .np-stage[data-view="lyrics"] .view-lyrics { display: block; }
  .np-art { width: min(100cqw, 100cqh); aspect-ratio: 1; border-radius: 14px; overflow: hidden; display: grid;
    place-items: center; background: var(--np-fill); box-shadow: 0 24px 60px rgba(0, 0, 0, .45);
    transition: transform .5s cubic-bezier(.2, .9, .3, 1.15), box-shadow .5s; }
  .np-art.paused { transform: scale(.84); box-shadow: 0 12px 30px rgba(0, 0, 0, .3); }
  .np-art img { width: 100%; height: 100%; object-fit: cover; }
  .np-art ha-icon { --mdc-icon-size: 30cqmin; color: var(--np-dim); }

  .np-panel { grid-area: panel; width: 100%; max-width: 620px; justify-self: center; display: flex; flex-direction: column; gap: 4px; }
  .np-titlerow { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
  .np-text { flex: 1; min-width: 0; }
  .np-title { font-size: 24px; font-weight: 700; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .np-artist { font-size: 19px; color: var(--np-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .fav { background: var(--np-fill); }
  .fav ha-icon { --mdc-icon-size: 24px; }
  .fav.on ha-icon { color: var(--accent); animation: pop .35s ease-out; }

  .slider { position: relative; height: 30px; display: flex; align-items: center; cursor: pointer; touch-action: none; outline: none; }
  .slider .track { position: relative; width: 100%; height: 6px; border-radius: 3px; overflow: hidden;
    background: rgba(255, 255, 255, .25); transition: height .15s; }
  .slider .fill { position: absolute; inset: 0 auto 0 0; width: 0; background: rgba(255, 255, 255, .8); }
  .slider.drag .track, .slider:focus-visible .track { height: 12px; border-radius: 6px; }
  .slider.drag .fill { background: #fff; }
  .np-times { display: flex; justify-content: space-between; margin-top: -4px; font-size: 12px;
    color: var(--np-dim); font-variant-numeric: tabular-nums; }
  .np-ctrls { display: flex; align-items: center; justify-content: space-between; margin: 10px 0 8px; }
  .np-btn.big { width: 64px; height: 64px; }
  .np-btn.big ha-icon { --mdc-icon-size: 46px; }
  .np-btn.huge { width: 82px; height: 82px; }
  .np-btn.huge ha-icon { --mdc-icon-size: 62px; }
  .np-btn.small ha-icon, .np-btn.tool ha-icon { --mdc-icon-size: 24px; color: var(--np-dim); }
  .np-btn.small.on, .np-btn.tool.on { background: var(--np-fill); }
  .np-btn.small.on ha-icon, .np-btn.tool.on ha-icon { color: #fff; }
  .np-vol { display: flex; align-items: center; gap: 10px; color: var(--np-dim); }
  .np-vol .slider { flex: 1; }
  .np-vol ha-icon { --mdc-icon-size: 20px; }
  .np-bottom { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 14px; }
  .np-pill { display: flex; align-items: center; gap: 8px; min-width: 0; max-width: 60%; height: 40px; padding: 0 16px;
    border-radius: 999px; border: 0; background: var(--np-fill); color: #fff; font: inherit; font-size: 15px; font-weight: 600;
    cursor: pointer; -webkit-tap-highlight-color: transparent; }
  .np-pill span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .np-pill ha-icon { --mdc-icon-size: 20px; flex: 0 0 auto; }
  .np-pill:active { filter: brightness(1.2); }

  /* Cola y letra (ocupan el lugar de la portada) */
  .np-list, .np-lyrics { overflow-y: auto; overscroll-behavior: contain; scrollbar-width: none;
    -webkit-mask-image: linear-gradient(transparent, #000 20px, #000 calc(100% - 56px), transparent);
    mask-image: linear-gradient(transparent, #000 20px, #000 calc(100% - 56px), transparent); }
  .np-list::-webkit-scrollbar, .np-lyrics::-webkit-scrollbar { display: none; }
  .np-msg { height: 100%; display: grid; place-items: center; text-align: center; padding: 0 24px;
    font-size: 17px; color: var(--np-dim); }
  .q-sec { margin: 22px 0 6px; font-size: 16px; font-weight: 700; }
  .q-sec span { font-weight: 400; color: var(--np-dim); }
  .q-row { display: flex; align-items: center; gap: 12px; min-height: 60px; border-bottom: .5px solid rgba(255, 255, 255, .12); }
  .q-row.cur { border: 0; }
  .q-art { width: 46px; height: 46px; flex: 0 0 46px; border-radius: 6px; overflow: hidden; display: grid; place-items: center;
    background: var(--np-fill); }
  .q-art img { width: 100%; height: 100%; object-fit: cover; }
  .q-art ha-icon { color: var(--np-dim); }
  .q-text { flex: 1; min-width: 0; }
  .q-title { font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .q-sub { font-size: 13px; color: var(--np-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .q-dur { font-size: 13px; color: var(--np-dim); font-variant-numeric: tabular-nums; }
  .q-empty { padding: 14px 0; color: var(--np-dim); font-size: 14px; }
  .q-pad { height: 48px; }
  .q-list { position: relative; }
  .q-row.up { position: relative; background: transparent; transition: transform .18s ease; }
  .q-row.tap { cursor: pointer; }
  .q-row.tap:active { background: rgba(255, 255, 255, .06); }
  .q-row.dragging { transition: none; z-index: 2; background: rgba(60, 60, 60, .85); border-radius: 10px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, .45); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
  .q-btn { width: 44px; height: 44px; flex: 0 0 44px; display: grid; place-items: center; border: 0; padding: 0;
    background: none; color: var(--np-dim); cursor: pointer; -webkit-tap-highlight-color: transparent; }
  .q-del { color: #ff6b6b; width: 36px; flex-basis: 36px; }
  .q-handle { touch-action: none; cursor: grab; }
  .q-row.dragging .q-handle { cursor: grabbing; color: #fff; }

  .ly-pad { height: 32cqh; }
  .ly-line { margin: 0; padding: 10px 0; font-size: clamp(24px, 4.4cqw, 42px); font-weight: 700; line-height: 1.25;
    color: rgba(255, 255, 255, .34); cursor: pointer; transform-origin: left center; filter: blur(.5px);
    transition: color .35s, transform .35s, filter .35s; -webkit-tap-highlight-color: transparent; }
  .ly-line.past { color: rgba(255, 255, 255, .28); }
  .ly-line.active { color: #fff; filter: none; transform: scale(1.03); }
  .ly-plain { padding: 24px 0 8px; font-size: 22px; font-weight: 600; line-height: 1.55; white-space: pre-wrap;
    color: rgba(255, 255, 255, .88); }
  .ly-note { padding: 18px 0; font-size: 12px; color: var(--np-dim); }
  .np-debug { position: absolute; z-index: 5; left: 12px; bottom: 12px; max-width: min(560px, calc(100vw - 24px)); margin: 0;
    padding: 10px 12px; border-radius: 12px; background: rgba(0, 0, 0, .72); color: #9f9; font: 11px/1.45 ui-monospace, monospace;
    white-space: pre-wrap; pointer-events: none; }
  .ly-link { display: inline-block; margin-top: 14px; padding: 10px 18px; border-radius: 999px; background: var(--np-fill);
    color: #fff; text-decoration: none; font-size: 15px; font-weight: 600; }

  @media (max-width: 480px) {
    .np-title { font-size: 21px; }
    .np-artist { font-size: 17px; }
    .np-btn.big { width: 56px; height: 56px; }
    .np-btn.big ha-icon { --mdc-icon-size: 40px; }
    .np-btn.huge { width: 72px; height: 72px; }
    .np-btn.huge ha-icon { --mdc-icon-size: 54px; }
  }
`;
