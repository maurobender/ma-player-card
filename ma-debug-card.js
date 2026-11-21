/*
 * ma-debug-card.js — Prueba mínima para ma-browser-card (Etapa 0)
 *
 * Objetivo: verificar contra TU Home Assistant
 *   1. Que podemos obtener el config_entry_id de Music Assistant desde el frontend.
 *   2. Que music_assistant.search responde vía hass.callWS con return_response.
 *   3. Qué forma tiene el JSON de respuesta.
 *   4. Si las URLs de portada cargan en el navegador / Companion app.
 *
 * Uso (YAML de la tarjeta):
 *   type: custom:ma-debug-card
 *   entity: media_player.home_assistant_voice_0a7e7c_media_player_2
 *   query: Queen            # opcional
 *   config_entry_id: ...    # opcional, si la detección automática falla
 */

const DEBUG_VERSION = "0.0.1";

class MaDebugCard extends HTMLElement {
  setConfig(config) {
    if (!config.entity) throw new Error("Falta 'entity' (el media_player de Music Assistant)");
    this._config = config;
    this._started = false;
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._started) {
      this._started = true;
      this._render();
    }
  }

  getCardSize() {
    return 10;
  }

  _render() {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        ha-card { padding: 16px; }
        .row { display: flex; gap: 8px; margin-bottom: 12px; }
        input { flex: 1; padding: 10px; border-radius: 12px; border: 1px solid var(--divider-color);
                background: var(--card-background-color); color: var(--primary-text-color); font-size: 16px; }
        button { padding: 10px 16px; border-radius: 12px; border: none; cursor: pointer;
                 background: var(--primary-color); color: var(--text-primary-color, #fff); font-size: 16px; }
        pre { font-size: 11px; max-height: 320px; overflow: auto; white-space: pre-wrap; word-break: break-all;
              background: var(--secondary-background-color); padding: 8px; border-radius: 8px; }
        .log div { font-family: monospace; font-size: 12px; margin: 2px 0; }
        .ok { color: var(--success-color, green); }
        .err { color: var(--error-color, red); }
        .imgs { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; }
        .imgs figure { margin: 0; font-size: 11px; word-break: break-all; }
        .imgs img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 12px;
                    background: var(--secondary-background-color); }
        h3 { margin: 12px 0 6px; }
      </style>
      <ha-card header="MA debug v${DEBUG_VERSION}">
        <div class="row">
          <input id="q" value="${this._config.query || "Queen"}" />
          <button id="go">Buscar</button>
        </div>
        <div class="log" id="log"></div>
        <h3>Portadas</h3>
        <div class="imgs" id="imgs"></div>
        <h3>JSON crudo</h3>
        <pre id="json"></pre>
      </ha-card>`;
    this.shadowRoot.getElementById("go").addEventListener("click", () => this._run());
  }

  _log(msg, cls = "") {
    const d = document.createElement("div");
    d.className = cls;
    d.textContent = msg;
    this.shadowRoot.getElementById("log").appendChild(d);
    console.info("[ma-debug]", msg);
  }

  async _getConfigEntryId() {
    if (this._config.config_entry_id) {
      this._log(`config_entry_id desde YAML: ${this._config.config_entry_id}`, "ok");
      return this._config.config_entry_id;
    }
    // Método A: registro de entidades
    try {
      const ent = await this._hass.callWS({
        type: "config/entity_registry/get",
        entity_id: this._config.entity,
      });
      this._log(`A) entity_registry/get → platform=${ent.platform}, config_entry_id=${ent.config_entry_id}`,
        ent.platform === "music_assistant" ? "ok" : "err");
      if (ent.platform === "music_assistant" && ent.config_entry_id) return ent.config_entry_id;
    } catch (e) {
      this._log(`A) entity_registry/get falló: ${e.message || JSON.stringify(e)}`, "err");
    }
    // Método B: entradas de configuración del dominio
    try {
      const entries = await this._hass.callWS({ type: "config_entries/get", domain: "music_assistant" });
      this._log(`B) config_entries/get → ${entries.length} entrada(s): ` +
        entries.map((e) => `${e.title} [${e.entry_id}] ${e.state}`).join(", "), entries.length ? "ok" : "err");
      const loaded = entries.find((e) => e.state === "loaded") || entries[0];
      if (loaded) return loaded.entry_id;
    } catch (e) {
      this._log(`B) config_entries/get falló: ${e.message || JSON.stringify(e)}`, "err");
    }
    throw new Error("No pude obtener config_entry_id. Agregalo en el YAML.");
  }

  async _run() {
    const root = this.shadowRoot;
    root.getElementById("log").innerHTML = "";
    root.getElementById("imgs").innerHTML = "";
    root.getElementById("json").textContent = "";
    const q = root.getElementById("q").value.trim();

    this._log(`Página: ${location.protocol}//${location.host}  |  UA: ${navigator.userAgent}`);
    const st = this._hass.states[this._config.entity];
    this._log(st ? `Entidad OK: ${st.state}` : `Entidad ${this._config.entity} NO existe`, st ? "ok" : "err");

    let entryId;
    try {
      entryId = await this._getConfigEntryId();
    } catch (e) {
      this._log(e.message, "err");
      return;
    }

    let resp;
    const t0 = performance.now();
    try {
      resp = await this._hass.callWS({
        type: "call_service",
        domain: "music_assistant",
        service: "search",
        service_data: { config_entry_id: entryId, name: q, limit: 4 },
        return_response: true,
      });
      this._log(`search OK en ${Math.round(performance.now() - t0)} ms`, "ok");
    } catch (e) {
      this._log(`search falló: ${e.message || JSON.stringify(e)}`, "err");
      return;
    }

    const data = resp.response || resp;
    root.getElementById("json").textContent = JSON.stringify(data, null, 2);
    this._log(`Claves de respuesta: ${Object.keys(data).join(", ")}`);

    // Recolectar items con imagen
    const items = [];
    for (const [k, list] of Object.entries(data)) {
      if (Array.isArray(list)) list.forEach((it) => items.push({ group: k, it }));
    }
    const withImg = items.filter(({ it }) => it.image);
    this._log(`${items.length} items, ${withImg.length} con imagen`);
    if (withImg[0]) {
      const u = withImg[0].it.image;
      this._log(`Ejemplo URL imagen: ${u}`);
      if (location.protocol === "https:" && u.startsWith("http:"))
        this._log("⚠ Página HTTPS + imagen HTTP → el navegador probablemente la bloquee (mixed content)", "err");
    }

    const grid = root.getElementById("imgs");
    withImg.slice(0, 8).forEach(({ group, it }) => {
      const fig = document.createElement("figure");
      const img = document.createElement("img");
      const cap = document.createElement("figcaption");
      cap.textContent = `[${group}] ${it.name} — cargando…`;
      const t1 = performance.now();
      img.onload = () => {
        cap.textContent = `[${group}] ${it.name} — ✅ ${img.naturalWidth}x${img.naturalHeight} (${Math.round(performance.now() - t1)} ms)`;
        cap.className = "ok";
      };
      img.onerror = () => {
        cap.textContent = `[${group}] ${it.name} — ❌ NO carga: ${it.image}`;
        cap.className = "err";
      };
      img.src = it.image;
      fig.append(img, cap);
      grid.appendChild(fig);
    });
  }
}

customElements.define("ma-debug-card", MaDebugCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "ma-debug-card",
  name: "MA Debug (prueba)",
  description: "Prueba de búsqueda de Music Assistant y carga de portadas",
});
console.info(`%c MA-DEBUG-CARD %c v${DEBUG_VERSION} `, "background:#03a9f4;color:#fff", "");
