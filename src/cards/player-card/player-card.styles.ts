import { css } from "lit";

export const playerStyles = css`
  /* Mini player (the card on the dashboard) */
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
  /* MDI glyphs fill their box unevenly (pause ~14/24 high, magnify ~17/24): play needs a clearly bigger box */
  .ib.play { width: 52px; height: 52px; }
  .ib.play ha-icon { --mdc-icon-size: 44px; }
  .ib.search { color: var(--primary-text-color); }
  .ib.search ha-icon { --mdc-icon-size: 24px; }
  .mini.idle .prev, .mini.idle .play, .mini.idle .next, .mini.idle .mini-progress { display: none; }
  .mini-progress { position: absolute; left: 0; right: 0; bottom: 0; height: 3px; background: var(--fill); }
  .mini-progress .fill { height: 100%; width: 0; background: var(--accent); transition: width .5s linear; }
  @container (max-width: 400px) { .mini .prev { display: none; } }

  /* "cover" layout: like HA's media control card, colored after the artwork. Sizes follow the card's width. */
  .cover { position: relative; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between;
    box-sizing: border-box; container-type: inline-size;
    --cover-bg: var(--ha-card-background, var(--card-background-color, #fff)); --cover-fg: var(--primary-text-color);
    background: var(--cover-bg); color: var(--cover-fg); transition: background-color .6s, color .6s; }
  .cover-art { position: absolute; top: 0; right: 0; bottom: 0; aspect-ratio: 1; max-width: 65%;
    background: center / cover no-repeat; }
  /* Fades the artwork into the background color from its left edge */
  .cover-art::after { content: ""; position: absolute; inset: 0;
    background: linear-gradient(to right, var(--cover-bg), color-mix(in srgb, var(--cover-bg) 0%, transparent) 65%); }
  .cover-main { all: unset; position: relative; box-sizing: border-box; display: flex; flex-direction: column; gap: 2px;
    padding: clamp(12px, 3cqw, 16px) clamp(14px, 3.5cqw, 18px) 0; cursor: pointer; -webkit-tap-highlight-color: transparent; }
  .cover-main:focus-visible { outline: 2px solid currentColor; outline-offset: -2px; border-radius: 12px; }
  .cover-title { font-size: clamp(16px, 3.8cqw, 20px); line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cover-sub { font-size: clamp(13px, 3cqw, 16px); line-height: 1.3; opacity: .9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cover.has-art .cover-main { padding-right: 30%; }
  .cover-ctrls { position: relative; display: flex; align-items: center; padding: 2px clamp(6px, 1.6cqw, 10px) clamp(8px, 2cqw, 12px);
    --cb: clamp(36px, 8.5cqw, 44px); }
  .cover-spacer { flex: 1; }
  .cb { width: var(--cb); height: var(--cb); border: 0; border-radius: 50%; padding: 0; display: grid; place-items: center;
    background: transparent; color: inherit; cursor: pointer; -webkit-tap-highlight-color: transparent; transition: transform .1s; }
  .cb:active { transform: scale(.88); }
  .cb:focus { outline: none; }
  .cb:focus-visible { background: color-mix(in srgb, currentColor 15%, transparent); }
  .cb ha-icon { --mdc-icon-size: calc(var(--cb) * .72); }
  .cb.play { --cb: clamp(44px, 10.5cqw, 54px); }
  .cb.play ha-icon { --mdc-icon-size: calc(var(--cb) * .85); }
  .cb.small ha-icon { --mdc-icon-size: calc(var(--cb) * .58); }
  /* They sit over the artwork: a translucent disc of the background color keeps them readable on light covers */
  .cb.small { margin-left: 8px; background: color-mix(in srgb, var(--cover-bg) 55%, transparent);
    -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); }
  .cb.small:focus-visible { background: color-mix(in srgb, var(--cover-bg) 80%, transparent); }
  .cover-progress { position: absolute; left: 0; right: 0; bottom: 0; height: 3px;
    background: color-mix(in srgb, var(--cover-fg) 20%, transparent); }
  .cover-progress .fill { height: 100%; width: 0; background: var(--cover-fg); transition: width .5s linear; }

  /* "Now playing" (full screen) */
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
  .np-close { background: var(--np-fill); }

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
  .np-vol ma-slider { flex: 1; }
  .np-vol ha-icon { --mdc-icon-size: 20px; }
  .np-vol-btn { width: 36px; height: 36px; flex: 0 0 36px; margin: 0 -8px; padding: 0; border: 0; border-radius: 50%;
    display: grid; place-items: center; background: transparent; color: inherit; cursor: pointer;
    -webkit-tap-highlight-color: transparent; transition: transform .1s, color .15s; }
  .np-vol-btn:active { transform: scale(.88); }
  .np-vol-btn:focus { outline: none; }
  .np-vol-btn:focus-visible { background: var(--np-fill); }
  .np-vol-btn[aria-pressed="true"] { color: #fff; }
  .np-bottom { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 14px; }
  .np-pill { display: flex; align-items: center; gap: 8px; min-width: 0; max-width: 60%; height: 40px; padding: 0 16px;
    border-radius: 999px; border: 0; background: var(--np-fill); color: #fff; font: inherit; font-size: 15px; font-weight: 600;
    cursor: pointer; -webkit-tap-highlight-color: transparent; }
  .np-pill span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .np-pill ha-icon { --mdc-icon-size: 20px; flex: 0 0 auto; }
  .np-pill:active { filter: brightness(1.2); }

  /* Queue and lyrics take the artwork's place */
  .np-list, .np-lyrics { overflow-y: auto; overscroll-behavior: contain; scrollbar-width: none;
    -webkit-mask-image: linear-gradient(transparent, #000 20px, #000 calc(100% - 56px), transparent);
    mask-image: linear-gradient(transparent, #000 20px, #000 calc(100% - 56px), transparent); }
  .np-list::-webkit-scrollbar, .np-lyrics::-webkit-scrollbar { display: none; }

  .np-debug { position: absolute; z-index: 5; left: 12px; bottom: 12px; max-width: min(560px, calc(100vw - 24px)); margin: 0;
    padding: 10px 12px; border-radius: 12px; background: rgba(0, 0, 0, .72); color: #9f9; font: 11px/1.45 ui-monospace, monospace;
    white-space: pre-wrap; pointer-events: none; }

  @media (max-width: 480px) {
    .np-title { font-size: 21px; }
    .np-artist { font-size: 17px; }
    .np-btn.big { width: 56px; height: 56px; }
    .np-btn.big ha-icon { --mdc-icon-size: 40px; }
    .np-btn.huge { width: 72px; height: 72px; }
    .np-btn.huge ha-icon { --mdc-icon-size: 54px; }
  }
`;
