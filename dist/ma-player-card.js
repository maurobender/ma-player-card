/* ma-player-card v0.5.1 — built from src/ with `npm run build`. Do not edit by hand. */

// node_modules/@lit/reactive-element/css-tag.js
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
var t = globalThis;
var e = t.ShadowRoot && (void 0 === t.ShadyCSS || t.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype;
var s = /* @__PURE__ */ Symbol();
var o = /* @__PURE__ */ new WeakMap();
var n = class {
  constructor(t5, e5, o5) {
    if (this._$cssResult$ = true, o5 !== s) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t5, this.t = e5;
  }
  get styleSheet() {
    let t5 = this.o;
    const s5 = this.t;
    if (e && void 0 === t5) {
      const e5 = void 0 !== s5 && 1 === s5.length;
      e5 && (t5 = o.get(s5)), void 0 === t5 && ((this.o = t5 = new CSSStyleSheet()).replaceSync(this.cssText), e5 && o.set(s5, t5));
    }
    return t5;
  }
  toString() {
    return this.cssText;
  }
};
var r = (t5) => new n("string" == typeof t5 ? t5 : t5 + "", void 0, s);
var i = (t5, ...e5) => {
  const o5 = 1 === t5.length ? t5[0] : e5.reduce((e6, s5, o6) => e6 + ((t6) => {
    if (true === t6._$cssResult$) return t6.cssText;
    if ("number" == typeof t6) return t6;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + t6 + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s5) + t5[o6 + 1], t5[0]);
  return new n(o5, t5, s);
};
var S = (s5, o5) => {
  if (e) s5.adoptedStyleSheets = o5.map((t5) => t5 instanceof CSSStyleSheet ? t5 : t5.styleSheet);
  else for (const e5 of o5) {
    const o6 = document.createElement("style"), n4 = t.litNonce;
    void 0 !== n4 && o6.setAttribute("nonce", n4), o6.textContent = e5.cssText, s5.appendChild(o6);
  }
};
var c = e ? (t5) => t5 : (t5) => t5 instanceof CSSStyleSheet ? ((t6) => {
  let e5 = "";
  for (const s5 of t6.cssRules) e5 += s5.cssText;
  return r(e5);
})(t5) : t5;

// node_modules/@lit/reactive-element/reactive-element.js
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
var { is: i2, defineProperty: e2, getOwnPropertyDescriptor: h, getOwnPropertyNames: r2, getOwnPropertySymbols: o2, getPrototypeOf: n2 } = Object;
var a = globalThis;
var c2 = a.trustedTypes;
var l = c2 ? c2.emptyScript : "";
var p = a.reactiveElementPolyfillSupport;
var d = (t5, s5) => t5;
var u = { toAttribute(t5, s5) {
  switch (s5) {
    case Boolean:
      t5 = t5 ? l : null;
      break;
    case Object:
    case Array:
      t5 = null == t5 ? t5 : JSON.stringify(t5);
  }
  return t5;
}, fromAttribute(t5, s5) {
  let i7 = t5;
  switch (s5) {
    case Boolean:
      i7 = null !== t5;
      break;
    case Number:
      i7 = null === t5 ? null : Number(t5);
      break;
    case Object:
    case Array:
      try {
        i7 = JSON.parse(t5);
      } catch (t6) {
        i7 = null;
      }
  }
  return i7;
} };
var f = (t5, s5) => !i2(t5, s5);
var b = { attribute: true, type: String, converter: u, reflect: false, useDefault: false, hasChanged: f };
Symbol.metadata ??= /* @__PURE__ */ Symbol("metadata"), a.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var y = class extends HTMLElement {
  static addInitializer(t5) {
    this._$Ei(), (this.l ??= []).push(t5);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t5, s5 = b) {
    if (s5.state && (s5.attribute = false), this._$Ei(), this.prototype.hasOwnProperty(t5) && ((s5 = Object.create(s5)).wrapped = true), this.elementProperties.set(t5, s5), !s5.noAccessor) {
      const i7 = /* @__PURE__ */ Symbol(), h4 = this.getPropertyDescriptor(t5, i7, s5);
      void 0 !== h4 && e2(this.prototype, t5, h4);
    }
  }
  static getPropertyDescriptor(t5, s5, i7) {
    const { get: e5, set: r5 } = h(this.prototype, t5) ?? { get() {
      return this[s5];
    }, set(t6) {
      this[s5] = t6;
    } };
    return { get: e5, set(s6) {
      const h4 = e5?.call(this);
      r5?.call(this, s6), this.requestUpdate(t5, h4, i7);
    }, configurable: true, enumerable: true };
  }
  static getPropertyOptions(t5) {
    return this.elementProperties.get(t5) ?? b;
  }
  static _$Ei() {
    if (this.hasOwnProperty(d("elementProperties"))) return;
    const t5 = n2(this);
    t5.finalize(), void 0 !== t5.l && (this.l = [...t5.l]), this.elementProperties = new Map(t5.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(d("finalized"))) return;
    if (this.finalized = true, this._$Ei(), this.hasOwnProperty(d("properties"))) {
      const t6 = this.properties, s5 = [...r2(t6), ...o2(t6)];
      for (const i7 of s5) this.createProperty(i7, t6[i7]);
    }
    const t5 = this[Symbol.metadata];
    if (null !== t5) {
      const s5 = litPropertyMetadata.get(t5);
      if (void 0 !== s5) for (const [t6, i7] of s5) this.elementProperties.set(t6, i7);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t6, s5] of this.elementProperties) {
      const i7 = this._$Eu(t6, s5);
      void 0 !== i7 && this._$Eh.set(i7, t6);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(s5) {
    const i7 = [];
    if (Array.isArray(s5)) {
      const e5 = new Set(s5.flat(1 / 0).reverse());
      for (const s6 of e5) i7.unshift(c(s6));
    } else void 0 !== s5 && i7.push(c(s5));
    return i7;
  }
  static _$Eu(t5, s5) {
    const i7 = s5.attribute;
    return false === i7 ? void 0 : "string" == typeof i7 ? i7 : "string" == typeof t5 ? t5.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = false, this.hasUpdated = false, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    this._$ES = new Promise((t5) => this.enableUpdating = t5), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((t5) => t5(this));
  }
  addController(t5) {
    (this._$EO ??= /* @__PURE__ */ new Set()).add(t5), void 0 !== this.renderRoot && this.isConnected && t5.hostConnected?.();
  }
  removeController(t5) {
    this._$EO?.delete(t5);
  }
  _$E_() {
    const t5 = /* @__PURE__ */ new Map(), s5 = this.constructor.elementProperties;
    for (const i7 of s5.keys()) this.hasOwnProperty(i7) && (t5.set(i7, this[i7]), delete this[i7]);
    t5.size > 0 && (this._$Ep = t5);
  }
  createRenderRoot() {
    const t5 = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return S(t5, this.constructor.elementStyles), t5;
  }
  connectedCallback() {
    this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(true), this._$EO?.forEach((t5) => t5.hostConnected?.());
  }
  enableUpdating(t5) {
  }
  disconnectedCallback() {
    this._$EO?.forEach((t5) => t5.hostDisconnected?.());
  }
  attributeChangedCallback(t5, s5, i7) {
    this._$AK(t5, i7);
  }
  _$ET(t5, s5) {
    const i7 = this.constructor.elementProperties.get(t5), e5 = this.constructor._$Eu(t5, i7);
    if (void 0 !== e5 && true === i7.reflect) {
      const h4 = (void 0 !== i7.converter?.toAttribute ? i7.converter : u).toAttribute(s5, i7.type);
      this._$Em = t5, null == h4 ? this.removeAttribute(e5) : this.setAttribute(e5, h4), this._$Em = null;
    }
  }
  _$AK(t5, s5) {
    const i7 = this.constructor, e5 = i7._$Eh.get(t5);
    if (void 0 !== e5 && this._$Em !== e5) {
      const t6 = i7.getPropertyOptions(e5), h4 = "function" == typeof t6.converter ? { fromAttribute: t6.converter } : void 0 !== t6.converter?.fromAttribute ? t6.converter : u;
      this._$Em = e5;
      const r5 = h4.fromAttribute(s5, t6.type);
      this[e5] = r5 ?? this._$Ej?.get(e5) ?? r5, this._$Em = null;
    }
  }
  requestUpdate(t5, s5, i7, e5 = false, h4) {
    if (void 0 !== t5) {
      const r5 = this.constructor;
      if (false === e5 && (h4 = this[t5]), i7 ??= r5.getPropertyOptions(t5), !((i7.hasChanged ?? f)(h4, s5) || i7.useDefault && i7.reflect && h4 === this._$Ej?.get(t5) && !this.hasAttribute(r5._$Eu(t5, i7)))) return;
      this.C(t5, s5, i7);
    }
    false === this.isUpdatePending && (this._$ES = this._$EP());
  }
  C(t5, s5, { useDefault: i7, reflect: e5, wrapped: h4 }, r5) {
    i7 && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t5) && (this._$Ej.set(t5, r5 ?? s5 ?? this[t5]), true !== h4 || void 0 !== r5) || (this._$AL.has(t5) || (this.hasUpdated || i7 || (s5 = void 0), this._$AL.set(t5, s5)), true === e5 && this._$Em !== t5 && (this._$Eq ??= /* @__PURE__ */ new Set()).add(t5));
  }
  async _$EP() {
    this.isUpdatePending = true;
    try {
      await this._$ES;
    } catch (t6) {
      Promise.reject(t6);
    }
    const t5 = this.scheduleUpdate();
    return null != t5 && await t5, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
        for (const [t7, s6] of this._$Ep) this[t7] = s6;
        this._$Ep = void 0;
      }
      const t6 = this.constructor.elementProperties;
      if (t6.size > 0) for (const [s6, i7] of t6) {
        const { wrapped: t7 } = i7, e5 = this[s6];
        true !== t7 || this._$AL.has(s6) || void 0 === e5 || this.C(s6, void 0, i7, e5);
      }
    }
    let t5 = false;
    const s5 = this._$AL;
    try {
      t5 = this.shouldUpdate(s5), t5 ? (this.willUpdate(s5), this._$EO?.forEach((t6) => t6.hostUpdate?.()), this.update(s5)) : this._$EM();
    } catch (s6) {
      throw t5 = false, this._$EM(), s6;
    }
    t5 && this._$AE(s5);
  }
  willUpdate(t5) {
  }
  _$AE(t5) {
    this._$EO?.forEach((t6) => t6.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = true, this.firstUpdated(t5)), this.updated(t5);
  }
  _$EM() {
    this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = false;
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._$ES;
  }
  shouldUpdate(t5) {
    return true;
  }
  update(t5) {
    this._$Eq &&= this._$Eq.forEach((t6) => this._$ET(t6, this[t6])), this._$EM();
  }
  updated(t5) {
  }
  firstUpdated(t5) {
  }
};
y.elementStyles = [], y.shadowRootOptions = { mode: "open" }, y[d("elementProperties")] = /* @__PURE__ */ new Map(), y[d("finalized")] = /* @__PURE__ */ new Map(), p?.({ ReactiveElement: y }), (a.reactiveElementVersions ??= []).push("2.1.2");

// node_modules/lit-html/lit-html.js
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
var t2 = globalThis;
var i3 = (t5) => t5;
var s2 = t2.trustedTypes;
var e3 = s2 ? s2.createPolicy("lit-html", { createHTML: (t5) => t5 }) : void 0;
var h2 = "$lit$";
var o3 = `lit$${Math.random().toFixed(9).slice(2)}$`;
var n3 = "?" + o3;
var r3 = `<${n3}>`;
var l2 = document;
var c3 = () => l2.createComment("");
var a2 = (t5) => null === t5 || "object" != typeof t5 && "function" != typeof t5;
var u2 = Array.isArray;
var d2 = (t5) => u2(t5) || "function" == typeof t5?.[Symbol.iterator];
var f2 = "[ 	\n\f\r]";
var v = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
var _ = /-->/g;
var m = />/g;
var p2 = RegExp(`>|${f2}(?:([^\\s"'>=/]+)(${f2}*=${f2}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g");
var g = /'/g;
var $ = /"/g;
var y2 = /^(?:script|style|textarea|title)$/i;
var x = (t5) => (i7, ...s5) => ({ _$litType$: t5, strings: i7, values: s5 });
var b2 = x(1);
var w = x(2);
var T = x(3);
var E = /* @__PURE__ */ Symbol.for("lit-noChange");
var A = /* @__PURE__ */ Symbol.for("lit-nothing");
var C = /* @__PURE__ */ new WeakMap();
var P = l2.createTreeWalker(l2, 129);
function V(t5, i7) {
  if (!u2(t5) || !t5.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return void 0 !== e3 ? e3.createHTML(i7) : i7;
}
var N = (t5, i7) => {
  const s5 = t5.length - 1, e5 = [];
  let n4, l4 = 2 === i7 ? "<svg>" : 3 === i7 ? "<math>" : "", c5 = v;
  for (let i8 = 0; i8 < s5; i8++) {
    const s6 = t5[i8];
    let a3, u5, d3 = -1, f3 = 0;
    for (; f3 < s6.length && (c5.lastIndex = f3, u5 = c5.exec(s6), null !== u5); ) f3 = c5.lastIndex, c5 === v ? "!--" === u5[1] ? c5 = _ : void 0 !== u5[1] ? c5 = m : void 0 !== u5[2] ? (y2.test(u5[2]) && (n4 = RegExp("</" + u5[2], "g")), c5 = p2) : void 0 !== u5[3] && (c5 = p2) : c5 === p2 ? ">" === u5[0] ? (c5 = n4 ?? v, d3 = -1) : void 0 === u5[1] ? d3 = -2 : (d3 = c5.lastIndex - u5[2].length, a3 = u5[1], c5 = void 0 === u5[3] ? p2 : '"' === u5[3] ? $ : g) : c5 === $ || c5 === g ? c5 = p2 : c5 === _ || c5 === m ? c5 = v : (c5 = p2, n4 = void 0);
    const x2 = c5 === p2 && t5[i8 + 1].startsWith("/>") ? " " : "";
    l4 += c5 === v ? s6 + r3 : d3 >= 0 ? (e5.push(a3), s6.slice(0, d3) + h2 + s6.slice(d3) + o3 + x2) : s6 + o3 + (-2 === d3 ? i8 : x2);
  }
  return [V(t5, l4 + (t5[s5] || "<?>") + (2 === i7 ? "</svg>" : 3 === i7 ? "</math>" : "")), e5];
};
var S2 = class _S {
  constructor({ strings: t5, _$litType$: i7 }, e5) {
    let r5;
    this.parts = [];
    let l4 = 0, a3 = 0;
    const u5 = t5.length - 1, d3 = this.parts, [f3, v3] = N(t5, i7);
    if (this.el = _S.createElement(f3, e5), P.currentNode = this.el.content, 2 === i7 || 3 === i7) {
      const t6 = this.el.content.firstChild;
      t6.replaceWith(...t6.childNodes);
    }
    for (; null !== (r5 = P.nextNode()) && d3.length < u5; ) {
      if (1 === r5.nodeType) {
        if (r5.hasAttributes()) for (const t6 of r5.getAttributeNames()) if (t6.endsWith(h2)) {
          const i8 = v3[a3++], s5 = r5.getAttribute(t6).split(o3), e6 = /([.?@])?(.*)/.exec(i8);
          d3.push({ type: 1, index: l4, name: e6[2], strings: s5, ctor: "." === e6[1] ? I : "?" === e6[1] ? L : "@" === e6[1] ? z : H }), r5.removeAttribute(t6);
        } else t6.startsWith(o3) && (d3.push({ type: 6, index: l4 }), r5.removeAttribute(t6));
        if (y2.test(r5.tagName)) {
          const t6 = r5.textContent.split(o3), i8 = t6.length - 1;
          if (i8 > 0) {
            r5.textContent = s2 ? s2.emptyScript : "";
            for (let s5 = 0; s5 < i8; s5++) r5.append(t6[s5], c3()), P.nextNode(), d3.push({ type: 2, index: ++l4 });
            r5.append(t6[i8], c3());
          }
        }
      } else if (8 === r5.nodeType) if (r5.data === n3) d3.push({ type: 2, index: l4 });
      else {
        let t6 = -1;
        for (; -1 !== (t6 = r5.data.indexOf(o3, t6 + 1)); ) d3.push({ type: 7, index: l4 }), t6 += o3.length - 1;
      }
      l4++;
    }
  }
  static createElement(t5, i7) {
    const s5 = l2.createElement("template");
    return s5.innerHTML = t5, s5;
  }
};
function M(t5, i7, s5 = t5, e5) {
  if (i7 === E) return i7;
  let h4 = void 0 !== e5 ? s5._$Co?.[e5] : s5._$Cl;
  const o5 = a2(i7) ? void 0 : i7._$litDirective$;
  return h4?.constructor !== o5 && (h4?._$AO?.(false), void 0 === o5 ? h4 = void 0 : (h4 = new o5(t5), h4._$AT(t5, s5, e5)), void 0 !== e5 ? (s5._$Co ??= [])[e5] = h4 : s5._$Cl = h4), void 0 !== h4 && (i7 = M(t5, h4._$AS(t5, i7.values), h4, e5)), i7;
}
var R = class {
  constructor(t5, i7) {
    this._$AV = [], this._$AN = void 0, this._$AD = t5, this._$AM = i7;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t5) {
    const { el: { content: i7 }, parts: s5 } = this._$AD, e5 = (t5?.creationScope ?? l2).importNode(i7, true);
    P.currentNode = e5;
    let h4 = P.nextNode(), o5 = 0, n4 = 0, r5 = s5[0];
    for (; void 0 !== r5; ) {
      if (o5 === r5.index) {
        let i8;
        2 === r5.type ? i8 = new k(h4, h4.nextSibling, this, t5) : 1 === r5.type ? i8 = new r5.ctor(h4, r5.name, r5.strings, this, t5) : 6 === r5.type && (i8 = new Z(h4, this, t5)), this._$AV.push(i8), r5 = s5[++n4];
      }
      o5 !== r5?.index && (h4 = P.nextNode(), o5++);
    }
    return P.currentNode = l2, e5;
  }
  p(t5) {
    let i7 = 0;
    for (const s5 of this._$AV) void 0 !== s5 && (void 0 !== s5.strings ? (s5._$AI(t5, s5, i7), i7 += s5.strings.length - 2) : s5._$AI(t5[i7])), i7++;
  }
};
var k = class _k {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t5, i7, s5, e5) {
    this.type = 2, this._$AH = A, this._$AN = void 0, this._$AA = t5, this._$AB = i7, this._$AM = s5, this.options = e5, this._$Cv = e5?.isConnected ?? true;
  }
  get parentNode() {
    let t5 = this._$AA.parentNode;
    const i7 = this._$AM;
    return void 0 !== i7 && 11 === t5?.nodeType && (t5 = i7.parentNode), t5;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t5, i7 = this) {
    t5 = M(this, t5, i7), a2(t5) ? t5 === A || null == t5 || "" === t5 ? (this._$AH !== A && this._$AR(), this._$AH = A) : t5 !== this._$AH && t5 !== E && this._(t5) : void 0 !== t5._$litType$ ? this.$(t5) : void 0 !== t5.nodeType ? this.T(t5) : d2(t5) ? this.k(t5) : this._(t5);
  }
  O(t5) {
    return this._$AA.parentNode.insertBefore(t5, this._$AB);
  }
  T(t5) {
    this._$AH !== t5 && (this._$AR(), this._$AH = this.O(t5));
  }
  _(t5) {
    this._$AH !== A && a2(this._$AH) ? this._$AA.nextSibling.data = t5 : this.T(l2.createTextNode(t5)), this._$AH = t5;
  }
  $(t5) {
    const { values: i7, _$litType$: s5 } = t5, e5 = "number" == typeof s5 ? this._$AC(t5) : (void 0 === s5.el && (s5.el = S2.createElement(V(s5.h, s5.h[0]), this.options)), s5);
    if (this._$AH?._$AD === e5) this._$AH.p(i7);
    else {
      const t6 = new R(e5, this), s6 = t6.u(this.options);
      t6.p(i7), this.T(s6), this._$AH = t6;
    }
  }
  _$AC(t5) {
    let i7 = C.get(t5.strings);
    return void 0 === i7 && C.set(t5.strings, i7 = new S2(t5)), i7;
  }
  k(t5) {
    u2(this._$AH) || (this._$AH = [], this._$AR());
    const i7 = this._$AH;
    let s5, e5 = 0;
    for (const h4 of t5) e5 === i7.length ? i7.push(s5 = new _k(this.O(c3()), this.O(c3()), this, this.options)) : s5 = i7[e5], s5._$AI(h4), e5++;
    e5 < i7.length && (this._$AR(s5 && s5._$AB.nextSibling, e5), i7.length = e5);
  }
  _$AR(t5 = this._$AA.nextSibling, s5) {
    for (this._$AP?.(false, true, s5); t5 !== this._$AB; ) {
      const s6 = i3(t5).nextSibling;
      i3(t5).remove(), t5 = s6;
    }
  }
  setConnected(t5) {
    void 0 === this._$AM && (this._$Cv = t5, this._$AP?.(t5));
  }
};
var H = class {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t5, i7, s5, e5, h4) {
    this.type = 1, this._$AH = A, this._$AN = void 0, this.element = t5, this.name = i7, this._$AM = e5, this.options = h4, s5.length > 2 || "" !== s5[0] || "" !== s5[1] ? (this._$AH = Array(s5.length - 1).fill(new String()), this.strings = s5) : this._$AH = A;
  }
  _$AI(t5, i7 = this, s5, e5) {
    const h4 = this.strings;
    let o5 = false;
    if (void 0 === h4) t5 = M(this, t5, i7, 0), o5 = !a2(t5) || t5 !== this._$AH && t5 !== E, o5 && (this._$AH = t5);
    else {
      const e6 = t5;
      let n4, r5;
      for (t5 = h4[0], n4 = 0; n4 < h4.length - 1; n4++) r5 = M(this, e6[s5 + n4], i7, n4), r5 === E && (r5 = this._$AH[n4]), o5 ||= !a2(r5) || r5 !== this._$AH[n4], r5 === A ? t5 = A : t5 !== A && (t5 += (r5 ?? "") + h4[n4 + 1]), this._$AH[n4] = r5;
    }
    o5 && !e5 && this.j(t5);
  }
  j(t5) {
    t5 === A ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t5 ?? "");
  }
};
var I = class extends H {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t5) {
    this.element[this.name] = t5 === A ? void 0 : t5;
  }
};
var L = class extends H {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t5) {
    this.element.toggleAttribute(this.name, !!t5 && t5 !== A);
  }
};
var z = class extends H {
  constructor(t5, i7, s5, e5, h4) {
    super(t5, i7, s5, e5, h4), this.type = 5;
  }
  _$AI(t5, i7 = this) {
    if ((t5 = M(this, t5, i7, 0) ?? A) === E) return;
    const s5 = this._$AH, e5 = t5 === A && s5 !== A || t5.capture !== s5.capture || t5.once !== s5.once || t5.passive !== s5.passive, h4 = t5 !== A && (s5 === A || e5);
    e5 && this.element.removeEventListener(this.name, this, s5), h4 && this.element.addEventListener(this.name, this, t5), this._$AH = t5;
  }
  handleEvent(t5) {
    "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t5) : this._$AH.handleEvent(t5);
  }
};
var Z = class {
  constructor(t5, i7, s5) {
    this.element = t5, this.type = 6, this._$AN = void 0, this._$AM = i7, this.options = s5;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t5) {
    M(this, t5);
  }
};
var j = { M: h2, P: o3, A: n3, C: 1, L: N, R, D: d2, V: M, I: k, H, N: L, U: z, B: I, F: Z };
var B = t2.litHtmlPolyfillSupport;
B?.(S2, k), (t2.litHtmlVersions ??= []).push("3.3.3");
var D = (t5, i7, s5) => {
  const e5 = s5?.renderBefore ?? i7;
  let h4 = e5._$litPart$;
  if (void 0 === h4) {
    const t6 = s5?.renderBefore ?? null;
    e5._$litPart$ = h4 = new k(i7.insertBefore(c3(), t6), t6, void 0, s5 ?? {});
  }
  return h4._$AI(t5), h4;
};

// node_modules/lit-element/lit-element.js
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
var s3 = globalThis;
var i4 = class extends y {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const t5 = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= t5.firstChild, t5;
  }
  update(t5) {
    const r5 = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t5), this._$Do = D(r5, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    super.connectedCallback(), this._$Do?.setConnected(true);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._$Do?.setConnected(false);
  }
  render() {
    return E;
  }
};
i4._$litElement$ = true, i4["finalized"] = true, s3.litElementHydrateSupport?.({ LitElement: i4 });
var o4 = s3.litElementPolyfillSupport;
o4?.({ LitElement: i4 });
(s3.litElementVersions ??= []).push("4.2.2");

// node_modules/lit-html/is-server.js
/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

// node_modules/lit-html/directive.js
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
var t3 = { ATTRIBUTE: 1, CHILD: 2, PROPERTY: 3, BOOLEAN_ATTRIBUTE: 4, EVENT: 5, ELEMENT: 6 };
var e4 = (t5) => (...e5) => ({ _$litDirective$: t5, values: e5 });
var i5 = class {
  constructor(t5) {
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AT(t5, e5, i7) {
    this._$Ct = t5, this._$AM = e5, this._$Ci = i7;
  }
  _$AS(t5, e5) {
    return this.update(t5, e5);
  }
  update(t5, e5) {
    return this.render(...e5);
  }
};

// node_modules/lit-html/directive-helpers.js
/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
var { I: t4 } = j;
var i6 = (o5) => o5;
var r4 = (o5) => void 0 === o5.strings;
var s4 = () => document.createComment("");
var v2 = (o5, n4, e5) => {
  const l4 = o5._$AA.parentNode, d3 = void 0 === n4 ? o5._$AB : n4._$AA;
  if (void 0 === e5) {
    const i7 = l4.insertBefore(s4(), d3), n5 = l4.insertBefore(s4(), d3);
    e5 = new t4(i7, n5, o5, o5.options);
  } else {
    const t5 = e5._$AB.nextSibling, n5 = e5._$AM, c5 = n5 !== o5;
    if (c5) {
      let t6;
      e5._$AQ?.(o5), e5._$AM = o5, void 0 !== e5._$AP && (t6 = o5._$AU) !== n5._$AU && e5._$AP(t6);
    }
    if (t5 !== d3 || c5) {
      let o6 = e5._$AA;
      for (; o6 !== t5; ) {
        const t6 = i6(o6).nextSibling;
        i6(l4).insertBefore(o6, d3), o6 = t6;
      }
    }
  }
  return e5;
};
var u3 = (o5, t5, i7 = o5) => (o5._$AI(t5, i7), o5);
var m2 = {};
var p3 = (o5, t5 = m2) => o5._$AH = t5;
var M2 = (o5) => o5._$AH;
var h3 = (o5) => {
  o5._$AR(), o5._$AA.remove();
};

// node_modules/lit-html/directives/live.js
/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
var l3 = e4(class extends i5 {
  constructor(r5) {
    if (super(r5), r5.type !== t3.PROPERTY && r5.type !== t3.ATTRIBUTE && r5.type !== t3.BOOLEAN_ATTRIBUTE) throw Error("The `live` directive is not allowed on child or event bindings");
    if (!r4(r5)) throw Error("`live` bindings can only contain a single expression");
  }
  render(r5) {
    return r5;
  }
  update(i7, [t5]) {
    if (t5 === E || t5 === A) return t5;
    const o5 = i7.element, l4 = i7.name;
    if (i7.type === t3.PROPERTY) {
      if (t5 === o5[l4]) return E;
    } else if (i7.type === t3.BOOLEAN_ATTRIBUTE) {
      if (!!t5 === o5.hasAttribute(l4)) return E;
    } else if (i7.type === t3.ATTRIBUTE && o5.getAttribute(l4) === t5 + "") return E;
    return p3(i7), t5;
  }
});

// src/backend/types.ts
var UnsupportedError = class extends Error {
};

// src/backend/native/favorites.ts
var NativeFavorites = class {
  constructor(hass) {
    this.hass = hass;
  }
  hass;
  canUnfavorite = false;
  button(entity) {
    const ents = this.hass().entities || {};
    const me = ents[entity];
    if (!me?.device_id) return null;
    const btn = Object.values(ents).find(
      (x2) => !!x2 && x2.device_id === me.device_id && x2.entity_id.startsWith("button.") && (x2.translation_key === "favorite_now_playing" || /favorit/.test(x2.entity_id))
    );
    return btn ? btn.entity_id : null;
  }
  canFavorite(entity) {
    return !!this.button(entity);
  }
  async favorite(entity) {
    const btn = this.button(entity);
    if (!btn) throw new Error("Music Assistant favorite button not found");
    await this.hass().callService("button", "press", { entity_id: btn });
  }
  async unfavorite(_entity) {
    throw new UnsupportedError("The official integration cannot remove favorites");
  }
};

// src/backend/mass-queue/favorites.ts
var MassQueueFavorites = class extends NativeFavorites {
  canUnfavorite = true;
  /** Even without the button, a favorite can still be removed. */
  canFavorite(_entity) {
    return true;
  }
  async unfavorite(entity) {
    await this.hass().callService("mass_queue", "unfavorite_current_item", { entity });
  }
};

// src/backend/call.ts
async function callWithResponse(hass, domain, service, data, entity) {
  const r5 = await hass.callWS({
    type: "call_service",
    domain,
    service,
    service_data: data,
    ...entity ? { target: { entity_id: entity } } : {},
    return_response: true
  });
  return r5?.response || r5 || {};
}
function forEntity(response, entity) {
  return response[entity] ?? response;
}
var errorMessage = (err) => {
  if (err && typeof err === "object") {
    const e5 = err;
    if (e5.message || e5.code) return String(e5.message || e5.code);
  }
  return String(err);
};

// src/backend/mass-queue/queue.ts
function fromMassQueue(x2) {
  return {
    id: x2.queue_item_id,
    name: x2.media_title || "",
    artist: x2.media_artist || "",
    album: x2.media_album_name || "",
    image: x2.media_image || (x2.local_image_encoded ? `data:image/jpeg;base64,${x2.local_image_encoded}` : ""),
    duration: 0,
    favorite: x2.favorite
  };
}
function moveSteps(from, to) {
  if (from === to) return [];
  if (to === 0) return ["next"];
  return Array(Math.abs(to - from)).fill(to < from ? "up" : "down");
}
var MassQueueQueue = class {
  constructor(hass, native) {
    this.hass = hass;
    this.native = native;
  }
  hass;
  native;
  can = { reorder: true, remove: true, playItem: true };
  partial = false;
  async call(service, data) {
    await this.hass().callService("mass_queue", service, data);
  }
  info(entity) {
    return this.native.info(entity);
  }
  async items(entity, info, limit) {
    if (info.total <= info.idx + 1) return [];
    const r5 = await callWithResponse(this.hass(), "mass_queue", "get_queue_items", {
      entity,
      offset: info.idx + 1,
      limit
    });
    const list = forEntity(r5, entity);
    return Array.isArray(list) ? list.map(fromMassQueue) : [];
  }
  async moveTo(entity, id, from, to) {
    for (const dir of moveSteps(from, to)) await this.call(`move_queue_item_${dir}`, { entity, queue_item_id: id });
  }
  remove(entity, id) {
    return this.call("remove_queue_item", { entity, queue_item_id: id });
  }
  play(entity, id) {
    return this.call("play_queue_item", { entity, queue_item_id: id });
  }
};

// src/constants.ts
var TYPES = {
  track: { key: "tracks", icon: "mdi:music-note", enqueue: "play", list: true },
  artist: { key: "artists", icon: "mdi:account-music", enqueue: "replace", round: true },
  album: { key: "albums", icon: "mdi:album", enqueue: "replace" },
  playlist: { key: "playlists", icon: "mdi:playlist-music", enqueue: "replace" },
  radio: { key: "radio", icon: "mdi:radio", enqueue: "replace", noQueue: true },
  podcast: { key: "podcasts", icon: "mdi:podcast", enqueue: "replace" },
  audiobook: { key: "audiobooks", icon: "mdi:book-music", enqueue: "replace" }
};
var DEFAULT_TYPES = ["track", "artist", "album", "playlist", "radio"];
var DEFAULT_HOME = [
  { titleKey: "home.recent", media_type: "album", order_by: "last_played_desc" },
  { titleKey: "home.playlists", media_type: "playlist", favorite: true, order_by: "favorite_timestamp_desc" },
  { titleKey: "home.artists", media_type: "artist", favorite: true, order_by: "favorite_timestamp_desc" },
  { titleKey: "home.albums", media_type: "album", favorite: true, order_by: "favorite_timestamp_desc" },
  { titleKey: "home.radio", media_type: "radio", favorite: true, order_by: "favorite_timestamp_desc" }
];
var HOME_TTL_MS = 5 * 60 * 1e3;
var APPLE_RED = "#fa2d48";
var DEBOUNCE_MS = 350;
var LONG_PRESS_MS = 500;
var MIN_QUERY = 2;
var MIN_TILE_PX = 110;
var AUTO_TILE_PX = 170;
var LIST_COL_PX = 340;

// src/backend/native/library.ts
var entryIds = /* @__PURE__ */ new Map();
var NativeLibrary = class {
  constructor(hass, entity, configEntryId) {
    this.hass = hass;
    this.entity = entity;
    this.configEntryId = configEntryId;
  }
  hass;
  entity;
  configEntryId;
  async search(query, type, { limit, libraryOnly }) {
    const data = await callWithResponse(this.hass(), "music_assistant", "search", {
      config_entry_id: await this.entryId(),
      name: query,
      media_type: type,
      limit,
      library_only: !!libraryOnly
    });
    return data[TYPES[type].key] || data[type] || data[`${type}s`] || [];
  }
  async getLibrary({ mediaType, limit, favorite, orderBy }) {
    const data = await callWithResponse(this.hass(), "music_assistant", "get_library", {
      config_entry_id: await this.entryId(),
      media_type: mediaType,
      limit,
      ...favorite ? { favorite: true } : {},
      ...orderBy ? { order_by: orderBy } : {}
    });
    return data.items || [];
  }
  async play(entity, item, enqueue) {
    await this.hass().callWS({
      type: "call_service",
      domain: "music_assistant",
      service: "play_media",
      service_data: { media_id: item.uri, media_type: item.mediaType, enqueue },
      target: { entity_id: entity }
    });
  }
  /** The entity's integration entry, or the first loaded one when that can't be read (non-admin users). */
  entryId() {
    if (this.configEntryId) return Promise.resolve(this.configEntryId);
    let p4 = entryIds.get(this.entity);
    if (!p4) {
      p4 = this.lookupEntryId();
      entryIds.set(this.entity, p4);
      p4.catch(() => entryIds.delete(this.entity));
    }
    return p4;
  }
  async lookupEntryId() {
    const hass = this.hass();
    try {
      const ent = await hass.callWS({
        type: "config/entity_registry/get",
        entity_id: this.entity
      });
      if (ent && ent.platform === "music_assistant" && ent.config_entry_id) return ent.config_entry_id;
    } catch (_2) {
    }
    const entries = await hass.callWS({
      type: "config_entries/get",
      domain: "music_assistant"
    });
    const e5 = entries.find((x2) => x2.state === "loaded") || entries[0];
    if (!e5) throw new Error("Music Assistant integration not found");
    return e5.entry_id;
  }
};

// src/backend/native/player.ts
var HaPlayer = class {
  constructor(hass) {
    this.hass = hass;
  }
  hass;
  async call(entity, service, data = {}) {
    await this.hass().callService("media_player", service, { entity_id: entity, ...data });
  }
  playPause(entity) {
    return this.call(entity, "media_play_pause");
  }
  previous(entity) {
    return this.call(entity, "media_previous_track");
  }
  next(entity) {
    return this.call(entity, "media_next_track");
  }
  seek(entity, seconds) {
    return this.call(entity, "media_seek", { seek_position: seconds });
  }
  setVolume(entity, level) {
    return this.call(entity, "volume_set", { volume_level: level });
  }
  setShuffle(entity, shuffle) {
    return this.call(entity, "shuffle_set", { shuffle });
  }
  setRepeat(entity, repeat) {
    return this.call(entity, "repeat_set", { repeat });
  }
};

// src/utils/format.ts
var names = (list) => Array.isArray(list) ? list.map((a3) => a3?.name).filter(Boolean).join(", ") : "";
var fmtTime = (secs) => {
  let s5 = Number.isFinite(secs) && secs > 0 ? Math.floor(secs) : 0;
  const h4 = Math.floor(s5 / 3600);
  const m3 = Math.floor(s5 % 3600 / 60);
  s5 %= 60;
  const pad = (n4) => String(n4).padStart(2, "0");
  return h4 ? `${h4}:${pad(m3)}:${pad(s5)}` : `${m3}:${pad(s5)}`;
};

// src/backend/native/queue.ts
function fromNative(qi) {
  if (!qi) return null;
  const mi = qi.media_item || {};
  return {
    id: qi.queue_item_id,
    name: mi.name || qi.name || "",
    artist: names(mi.artists),
    album: mi.album?.name || "",
    image: mi.image || "",
    duration: qi.duration || 0,
    favorite: mi.favorite
  };
}
var NativeQueue = class {
  constructor(hass) {
    this.hass = hass;
  }
  hass;
  can = { reorder: false, remove: false, playItem: false };
  /** Whether get_queue accepts offset/limit (Home Assistant from November 2026); undefined until tried. */
  itemsSupported;
  get partial() {
    return this.itemsSupported === false;
  }
  async getQueue(entity, data = {}) {
    const r5 = await callWithResponse(this.hass(), "music_assistant", "get_queue", data, entity);
    return forEntity(r5, entity);
  }
  async info(entity) {
    const q = await this.getQueue(entity);
    return {
      current: fromNative(q.current_item),
      next: fromNative(q.next_item),
      idx: q.current_index == null ? -1 : q.current_index,
      total: q.items || 0,
      elapsed: q.elapsed_time
    };
  }
  async items(entity, info, limit) {
    if (info.total <= info.idx + 1) return [];
    if (this.itemsSupported !== false) {
      try {
        const more = await this.getQueue(entity, { offset: info.idx + 1, limit });
        this.itemsSupported = true;
        return (more.queue_items || []).map(fromNative).filter((x2) => !!x2);
      } catch (err) {
        if (!/not a valid option|extra keys/i.test(errorMessage(err))) throw err;
        this.itemsSupported = false;
      }
    }
    return info.next ? [info.next] : [];
  }
  async moveTo() {
    throw new UnsupportedError("The official integration cannot reorder the queue");
  }
  async remove() {
    throw new UnsupportedError("The official integration cannot remove songs from the queue");
  }
  async play() {
    throw new UnsupportedError("The official integration cannot jump to a song in the queue");
  }
};

// src/backend/backend.ts
function resolveBackendName(hass, mode = "auto") {
  if (mode === "mass_queue") return "mass_queue";
  if (mode === "auto" && hass?.services?.mass_queue) return "mass_queue";
  return "native";
}
function createBackend(hass, name, options) {
  const nativeQueue = new NativeQueue(hass);
  const queue = name === "mass_queue" ? new MassQueueQueue(hass, nativeQueue) : nativeQueue;
  const favorites = name === "mass_queue" ? new MassQueueFavorites(hass) : new NativeFavorites(hass);
  return {
    name,
    can: { ...queue.can, unfavorite: favorites.canUnfavorite },
    library: new NativeLibrary(hass, options.entity, options.configEntryId),
    queue,
    favorites,
    player: new HaPlayer(hass)
  };
}
var BackendHolder = class {
  constructor(hass) {
    this.hass = hass;
  }
  hass;
  current = null;
  get(options) {
    const name = resolveBackendName(this.hass(), options.mode);
    const key = `${name}|${options.entity}|${options.configEntryId || ""}`;
    if (this.current?.key !== key) this.current = { key, backend: createBackend(this.hass, name, options) };
    return this.current.backend;
  }
};

// src/components/overlay-history.ts
var OverlayHistory = class {
  dialog;
  key;
  pushed = false;
  constructor(dialog, id) {
    this.dialog = dialog;
    this.key = `ma:${id}`;
    dialog.addEventListener("close", this.onClose);
  }
  get isOpen() {
    return this.dialog.open;
  }
  open() {
    if (this.dialog.open) return false;
    this.dialog.showModal();
    history.pushState({ ...history.state || {}, [this.key]: true }, "");
    this.pushed = true;
    window.addEventListener("popstate", this.onPopState);
    return true;
  }
  close() {
    if (this.dialog.open) this.dialog.close();
  }
  onClose = () => {
    window.removeEventListener("popstate", this.onPopState);
    if (this.pushed) {
      this.pushed = false;
      history.back();
    }
  };
  onPopState = () => {
    if (this.dialog.open && !history.state?.[this.key]) {
      this.pushed = false;
      this.dialog.close();
    }
  };
};

// src/i18n/en.ts
var en = {
  "common.cancel": "Cancel",
  "common.close": "Close",
  "common.retry": "Retry",
  "common.error_title": "Something went wrong",
  "common.playing": "Playing",
  "common.playing_on": "Playing on {name}",
  "type.track": "Songs",
  "type.artist": "Artists",
  "type.album": "Albums",
  "type.playlist": "Playlists",
  "type.radio": "Radio",
  "type.podcast": "Podcasts",
  "type.audiobook": "Audiobooks",
  "state.playing": "Playing",
  "state.paused": "Paused",
  "state.idle": "Idle",
  "state.on": "On",
  "state.off": "Off",
  "state.standby": "Standby",
  "state.buffering": "Buffering",
  "state.unavailable": "Unavailable",
  "home.recent": "Recently played",
  "home.playlists": "Your playlists",
  "home.artists": "Favorite artists",
  "home.albums": "Favorite albums",
  "home.radio": "Favorite radio",
  "speakers.title": "Play on",
  "speakers.choose": "Choose speaker",
  "speakers.unavailable": "Unavailable ({n})",
  "browser.title": "Search",
  "browser.launcher": "Search music",
  "browser.on_speaker": "on {name}",
  "browser.placeholder": "Artists, songs, albums…",
  "browser.clear": "Clear search",
  "browser.more": "More options",
  "browser.no_results": "No results",
  "browser.no_results_text": "No {types} found for “{query}”.",
  "browser.hint_title": "What do you want to listen to?",
  "browser.hint_text": "Search for songs, artists, albums, playlists or radio.",
  "browser.home_error": "Couldn't load your library",
  "browser.play_now": "Play now",
  "browser.play_next": "Play next",
  "browser.add_to_queue": "Add to queue",
  "browser.queued_next": "Plays next",
  "browser.queued": "Added to queue",
  "browser.play_failed": "Couldn't play: {error}",
  "player.open": "Open player",
  "player.previous": "Previous",
  "player.next": "Next",
  "player.play_pause": "Play or pause",
  "player.position": "Position",
  "player.shuffle": "Shuffle",
  "player.repeat": "Repeat",
  "player.volume": "Volume",
  "player.lyrics": "Lyrics",
  "player.queue": "Queue",
  "player.nothing_playing": "Nothing playing",
  "player.unavailable": "Speaker unavailable",
  "player.tap_to_search": "{name} · tap to search for music",
  "player.favorite": "Add to favorites",
  "player.favorited": "Added to favorites",
  "player.unfavorited": "Removed from favorites",
  "player.already_favorite": "Already a favorite · remove it in Music Assistant",
  "player.favorite_failed": "Couldn't add: {error}",
  "player.unfavorite_failed": "Couldn't remove: {error}",
  "lyrics.loading": "Looking for lyrics…",
  "lyrics.none": "No lyrics found for this song on LRCLIB.",
  "lyrics.search": "Search on lrclib.net",
  "lyrics.instrumental": "♪ Instrumental ♪",
  "lyrics.error": "Couldn't reach the lyrics service.",
  "lyrics.credit": "Lyrics: LRCLIB",
  "lyrics.unsynced": "Unsynced lyrics · LRCLIB",
  "queue.loading": "Loading the queue…",
  "queue.empty": "The queue is empty.",
  "queue.error": "Couldn't load the queue.",
  "queue.now_playing": "Now playing",
  "queue.up_next": "Up next",
  "queue.songs": "{n} songs",
  "queue.no_more": "No more songs in the queue.",
  "queue.and_more": "and {n} more…",
  "queue.partial": "Your Home Assistant version only reports the next song. The full list comes with a newer version of the integration, or by installing mass_queue.",
  "queue.hint": "Tap a song to play it · drag ≡ to move it.",
  "queue.remove": "Remove from queue",
  "queue.drag": "Drag to move",
  "queue.move": "Move song"
};

// src/i18n/es.ts
var es = {
  "common.cancel": "Cancelar",
  "common.close": "Cerrar",
  "common.retry": "Reintentar",
  "common.error_title": "Algo salió mal",
  "common.playing": "Reproduciendo",
  "common.playing_on": "Reproduciendo en {name}",
  "type.track": "Canciones",
  "type.artist": "Artistas",
  "type.album": "Álbumes",
  "type.playlist": "Playlists",
  "type.radio": "Radios",
  "type.podcast": "Podcasts",
  "type.audiobook": "Audiolibros",
  "state.playing": "Reproduciendo",
  "state.paused": "En pausa",
  "state.idle": "Inactivo",
  "state.on": "Encendido",
  "state.off": "Apagado",
  "state.standby": "En espera",
  "state.buffering": "Cargando",
  "state.unavailable": "No disponible",
  "home.recent": "Escuchado recientemente",
  "home.playlists": "Tus playlists",
  "home.artists": "Artistas favoritos",
  "home.albums": "Álbumes favoritos",
  "home.radio": "Radios favoritas",
  "speakers.title": "Reproducir en",
  "speakers.choose": "Elegir parlante",
  "speakers.unavailable": "No disponibles ({n})",
  "browser.title": "Buscar",
  "browser.launcher": "Buscar música",
  "browser.on_speaker": "en {name}",
  "browser.placeholder": "Artistas, canciones, álbumes…",
  "browser.clear": "Borrar búsqueda",
  "browser.more": "Más opciones",
  "browser.no_results": "Sin resultados",
  "browser.no_results_text": "No encontré {types} para «{query}».",
  "browser.hint_title": "¿Qué querés escuchar?",
  "browser.hint_text": "Buscá canciones, artistas, álbumes, playlists o radios.",
  "browser.home_error": "No pude cargar tu biblioteca",
  "browser.play_now": "Reproducir ahora",
  "browser.play_next": "Reproducir a continuación",
  "browser.add_to_queue": "Agregar a la cola",
  "browser.queued_next": "Suena a continuación",
  "browser.queued": "Agregado a la cola",
  "browser.play_failed": "No se pudo reproducir: {error}",
  "player.open": "Abrir reproductor",
  "player.previous": "Anterior",
  "player.next": "Siguiente",
  "player.play_pause": "Reproducir o pausar",
  "player.position": "Posición",
  "player.shuffle": "Aleatorio",
  "player.repeat": "Repetir",
  "player.volume": "Volumen",
  "player.lyrics": "Letra",
  "player.queue": "Cola",
  "player.nothing_playing": "Nada sonando",
  "player.unavailable": "Parlante no disponible",
  "player.tap_to_search": "{name} · tocá para buscar música",
  "player.favorite": "Agregar a favoritos",
  "player.favorited": "Agregada a favoritos",
  "player.unfavorited": "Quitada de favoritos",
  "player.already_favorite": "Ya es favorita · para quitarla, usá Music Assistant",
  "player.favorite_failed": "No se pudo agregar: {error}",
  "player.unfavorite_failed": "No se pudo quitar: {error}",
  "lyrics.loading": "Buscando la letra…",
  "lyrics.none": "No encontré la letra de esta canción en LRCLIB.",
  "lyrics.search": "Buscar en lrclib.net",
  "lyrics.instrumental": "♪ Instrumental ♪",
  "lyrics.error": "No pude conectar con el servicio de letras.",
  "lyrics.credit": "Letra: LRCLIB",
  "lyrics.unsynced": "Letra sin sincronizar · LRCLIB",
  "queue.loading": "Cargando la cola…",
  "queue.empty": "No hay nada en la cola.",
  "queue.error": "No pude cargar la cola.",
  "queue.now_playing": "Reproduciendo",
  "queue.up_next": "A continuación",
  "queue.songs": "{n} canciones",
  "queue.no_more": "No hay más canciones en la cola.",
  "queue.and_more": "y {n} más…",
  "queue.partial": "Tu versión de Home Assistant solo informa la próxima canción. La lista completa llega con una versión más nueva de la integración, o instalando mass_queue.",
  "queue.hint": "Tocá una canción para escucharla · arrastrá ≡ para moverla.",
  "queue.remove": "Quitar de la cola",
  "queue.drag": "Arrastrar para mover",
  "queue.move": "Mover canción"
};

// src/i18n/index.ts
var LANGUAGES = { en, es };
var hassLanguage = (hass) => hass?.locale?.language || hass?.language || "en";
function translator(language) {
  const strings = LANGUAGES[language] || LANGUAGES[language.split("-")[0]] || en;
  return (key, vars) => {
    const text = strings[key] ?? en[key];
    return vars ? text.replace(/\{(\w+)\}/g, (match, name) => name in vars ? String(vars[name]) : match) : text;
  };
}
var STATES = ["playing", "paused", "idle", "on", "off", "standby", "buffering", "unavailable"];
var stateLabel = (t5, state) => STATES.includes(state) ? t5(`state.${state}`) : state;

// src/services/speakers.ts
function listSpeakers(hass, entity, configured) {
  if (!hass) return [];
  const list = configured ? [...configured] : Object.keys(hass.entities || {}).filter(
    (id) => id.startsWith("media_player.") && hass.entities?.[id]?.platform === "music_assistant" && !hass.entities[id].hidden
  );
  if (!list.includes(entity)) list.unshift(entity);
  return list.filter((id) => hass.states[id]);
}
function speakerName(hass, entityId) {
  if (!entityId) return "";
  const st = hass?.states[entityId];
  return st?.attributes.friendly_name || entityId;
}

// src/components/speaker-picker.ts
function speakerSheet(hass, ids, current, t5) {
  const choice = (id) => {
    const st = hass.states[id];
    const state = st?.state ?? "unavailable";
    const a3 = st?.attributes ?? {};
    const playing = state === "playing";
    return {
      key: id,
      label: speakerName(hass, id),
      sublabel: playing && a3.media_title ? `${a3.media_title}${a3.media_artist ? ` · ${a3.media_artist}` : ""}` : stateLabel(t5, state),
      icon: playing ? "mdi:speaker-wireless" : "mdi:speaker",
      active: playing,
      selected: id === current,
      disabled: state === "unavailable"
    };
  };
  const isOff = (id) => hass.states[id]?.state === "unavailable" && id !== current;
  const off = ids.filter(isOff);
  return {
    header: { title: t5("speakers.title") },
    choices: ids.filter((id) => !isOff(id)).map(choice),
    more: off.length ? { label: t5("speakers.unavailable", { n: off.length }), choices: off.map(choice) } : void 0,
    cancelLabel: t5("common.cancel")
  };
}
function pickSpeaker(sheet, hass, ids, current, t5) {
  return sheet.show(speakerSheet(hass, ids, current, t5));
}

// src/components/theme.ts
var BASE_VARS = `
  --fill: color-mix(in srgb, var(--primary-text-color) 7%, transparent);
  --fill-strong: color-mix(in srgb, var(--primary-text-color) 12%, transparent);
  --sep: color-mix(in srgb, var(--primary-text-color) 12%, transparent);
  --glass: color-mix(in srgb, var(--card-background-color, #fff) 72%, transparent);
  --glass-bg: color-mix(in srgb, var(--primary-background-color, #f2f2f7) 80%, transparent);
  --blur: blur(30px) saturate(180%);
`;
var DARK_VARS = `
  --primary-text-color: #fff;
  --secondary-text-color: rgba(255, 255, 255, .62);
  --primary-background-color: #1c1c1e;
  --card-background-color: #2c2c2e;
  --glass: color-mix(in srgb, #2c2c2e 72%, transparent);
  --glass-bg: rgba(28, 28, 30, .2);
  --fill: rgba(255, 255, 255, .1);
  --fill-strong: rgba(255, 255, 255, .16);
  --sep: rgba(255, 255, 255, .14);
  color-scheme: dark;
`;
var accentColor = (option) => option === "theme" ? "var(--primary-color)" : option || APPLE_RED;

// src/services/speaker-target.ts
var TARGET_EVENT = "ma-player-card-target";
var Target = {
  key: (entity) => `ma-browser-card.target.${entity}`,
  load(entity) {
    try {
      return localStorage.getItem(this.key(entity)) || null;
    } catch (_2) {
      return null;
    }
  },
  save(entity, target) {
    try {
      if (target) localStorage.setItem(this.key(entity), target);
      else localStorage.removeItem(this.key(entity));
    } catch (_2) {
    }
    window.dispatchEvent(new CustomEvent(TARGET_EVENT, { detail: { entity, target } }));
  }
};

// src/utils/haptic.ts
var haptic = (el, kind) => {
  el.dispatchEvent(new CustomEvent("haptic", { detail: kind, bubbles: true, composed: true }));
};

// src/utils/ids.ts
var counter = 0;
var nextInstanceId = () => ++counter;

// src/cards/browser-card/browser-card.styles.ts
var browserStyles = i`
  :host {
    display: block;
    --accent: ${r(APPLE_RED)};
    ${r(BASE_VARS)}
    --art-radius: 10px;
  }

  /* Compact mode: the launcher button on the dashboard */
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

  /* Full screen */
  dialog.full { position: fixed; inset: 0; width: 100vw; height: 100vh; height: 100dvh;
    max-width: none; max-height: none; margin: 0; padding: 0; border: 0;
    background: var(--glass-bg); -webkit-backdrop-filter: var(--blur); backdrop-filter: var(--blur);
    color: var(--primary-text-color); overflow: hidden; }
  dialog.full::backdrop { background: transparent; }

  /* While something plays: the same blurred-artwork background as "Now playing" */
  :host([artwork]) {
    ${r(DARK_VARS)}
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

  /* Search field */
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

  /* Media type tabs */
  .tabs { display: flex; gap: 8px; margin-top: 12px; overflow-x: auto; scrollbar-width: none; }
  .tabs::-webkit-scrollbar { display: none; }
  .tab { flex: 0 0 auto; height: 36px; padding: 0 16px; border-radius: 999px; border: 0; cursor: pointer;
    font: inherit; font-size: 15px; font-weight: 500; background: var(--fill); color: var(--primary-text-color);
    -webkit-tap-highlight-color: transparent; transition: background .2s, color .2s; }
  .tab[aria-selected="true"] { background: var(--accent); color: #fff; font-weight: 600; }

  /* Grid (artists, albums, playlists, radio) */
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

  /* Home shelves (horizontal scroll) */
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

  /* List (songs) */
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

  /* Play feedback over the artwork */
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

  /* Loading skeleton */
  .skel .art, .skel .line { background: linear-gradient(90deg, var(--fill) 25%, var(--fill-strong) 50%, var(--fill) 75%);
    background-size: 200% 100%; animation: shimmer 1.2s infinite linear; box-shadow: none; }
  .skel .line { height: 12px; border-radius: 6px; margin-top: 6px; width: 80%; }
  .skel .line.short { width: 50%; }
  @keyframes shimmer { to { background-position: -200% 0; } }

  /* Empty and error states */
  .state { display: flex; flex-direction: column; align-items: center; text-align: center;
    padding: 56px 16px; color: var(--secondary-text-color); }
  .state ha-icon { --mdc-icon-size: 56px; opacity: .4; margin-bottom: 12px; }
  .state-title { font-size: 20px; font-weight: 700; color: var(--primary-text-color); }
  .state-text { font-size: 15px; margin-top: 6px; max-width: 420px; word-break: break-word; }
  .retry { margin-top: 18px; height: 44px; padding: 0 24px; border-radius: 999px; border: 0;
    background: var(--accent); color: #fff; font: inherit; font-weight: 600; cursor: pointer; }

  @container (max-width: 480px) {
    .grid { gap: 16px 12px; }
    h1 { font-size: 30px; }
  }
`;

// src/cards/browser-card/browser-card.ts
var isMediaType = (t5) => typeof t5 === "string" && t5 in TYPES;
function gridLayout(w2, configured) {
  const fit = Math.max(2, Math.floor(w2 / MIN_TILE_PX));
  const cols = configured ? Math.min(Number(configured), fit) : Math.max(2, Math.round(w2 / AUTO_TILE_PX));
  const listCols = Math.max(1, Math.min(3, Math.floor(w2 / LIST_COL_PX)));
  const n4 = Math.max(2, Math.round(w2 / 200));
  return { cols, listCols, shelfW: Math.floor((w2 - 14 * n4) / (n4 + 0.35)) };
}
function subtitle(it, type) {
  const artists = names(it.artists);
  switch (type) {
    case "track":
      return [artists, it.album?.name].filter(Boolean).join(" · ");
    case "album":
      return [artists, it.year].filter(Boolean).join(" · ");
    case "playlist":
      return it.owner || "Playlist";
    case "radio":
      return "Radio";
    case "artist":
      return "";
    default:
      return artists;
  }
}
var hasImage = (url) => !!url && (/^(https?:)?\/\//.test(url) || url.startsWith("/"));
var MaBrowserCard = class extends i4 {
  static properties = {
    hass: { attribute: false },
    /** Background behind the full screen: null = HA theme · "" = dark, no image · URL = blurred artwork. */
    artwork: { attribute: false },
    config: { state: true },
    q: { state: true },
    type: { state: true },
    status: { state: true },
    items: { state: true },
    error: { state: true },
    home: { state: true },
    homeStatus: { state: true },
    homeError: { state: true },
    target: { state: true },
    layout: { state: true },
    scrolled: { state: true }
  };
  instanceId = `ma-browser-${nextInstanceId()}`;
  backends = new BackendHolder(() => this.hass);
  uiLang = "";
  t = translator("en");
  cache = /* @__PURE__ */ new Map();
  reqId = 0;
  homeLoadedAt = 0;
  debounce;
  overlay = null;
  ro = new ResizeObserver(() => this.measure());
  observed = null;
  /** Play feedback over the artwork, by `itemKey`. */
  fx = /* @__PURE__ */ new Map();
  brokenImages = /* @__PURE__ */ new Set();
  longPress = {
    x: 0,
    y: 0,
    fired: false
  };
  static styles = browserStyles;
  constructor() {
    super();
    this.artwork = null;
    this.q = "";
    this.type = "track";
    this.status = "idle";
    this.items = [];
    this.error = "";
    this.home = null;
    this.homeStatus = "idle";
    this.homeError = "";
    this.target = null;
    this.layout = { cols: 4, listCols: 1 };
    this.scrolled = false;
  }
  setConfig(input) {
    if (!input?.entity) throw new Error("Missing 'entity' (a Music Assistant media_player)");
    const types = (input.media_types || DEFAULT_TYPES).filter(isMediaType);
    if (!types.length) throw new Error(`Invalid media_types. Options: ${Object.keys(TYPES).join(", ")}`);
    const mode = input.mode || "compact";
    if (mode !== "compact" && mode !== "inline" && mode !== "overlay") throw new Error("mode must be 'compact' or 'inline'");
    const home = (input.home || DEFAULT_HOME).filter((h4) => h4 && isMediaType(h4.media_type));
    this.config = {
      limit: 20,
      library_only: false,
      home_limit: 20,
      speaker_selector: true,
      ...input,
      entity: input.entity,
      mode,
      media_types: types,
      home
    };
    if (!types.includes(this.type)) this.type = types[0];
    this.cache.clear();
    this.home = null;
    this.homeStatus = "idle";
    this.homeLoadedAt = 0;
    this.target = Target.load(this.config.entity);
  }
  getCardSize() {
    return this.config?.mode === "inline" ? 8 : 1;
  }
  getGridOptions() {
    return this.config?.mode === "inline" ? { columns: 12, min_columns: 4 } : { columns: 12, rows: 1, min_columns: 3, min_rows: 1 };
  }
  static getStubConfig(hass) {
    const entities = hass?.entities || {};
    const ent = Object.keys(entities).find(
      (id) => id.startsWith("media_player.") && entities[id]?.platform === "music_assistant"
    );
    return { entity: ent || "media_player.salon" };
  }
  /** Opens the browser full screen (compact and overlay modes). */
  open() {
    if (!this.overlay?.open()) return;
    haptic(this, "light");
    this.measure();
    this.loadHome();
  }
  connectedCallback() {
    super.connectedCallback();
    window.addEventListener(TARGET_EVENT, this.onTargetEvent);
    if (this.observed) this.ro.observe(this.observed);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener(TARGET_EVENT, this.onTargetEvent);
    clearTimeout(this.debounce);
    clearTimeout(this.longPress.timer);
    this.ro.disconnect();
    this.overlay?.close();
  }
  onTargetEvent = (e5) => {
    const { entity, target } = e5.detail;
    if (entity === this.config?.entity) this.target = target;
  };
  willUpdate(changed) {
    if (changed.has("hass")) {
      const lang = hassLanguage(this.hass);
      if (lang !== this.uiLang) {
        this.uiLang = lang;
        this.t = translator(lang);
      }
      if (this.target && this.hass && !this.hass.states[this.target]) this.target = null;
    }
    if (changed.has("config") && this.config) this.style.setProperty("--accent", accentColor(this.config.accent_color));
    if (changed.has("artwork")) this.toggleAttribute("artwork", this.artwork != null);
  }
  updated() {
    const dialog = this.renderRoot.querySelector("dialog.full");
    if (dialog !== (this.overlay?.dialog ?? null)) {
      this.overlay?.close();
      this.overlay = dialog ? new OverlayHistory(dialog, `${this.instanceId}:full`) : null;
    }
    const wrap = this.renderRoot.querySelector(".wrap");
    if (wrap !== this.observed) {
      if (this.observed) this.ro.unobserve(this.observed);
      if (wrap) this.ro.observe(wrap);
      this.observed = wrap;
    }
    if (this.config?.mode === "inline" && this.homeStatus === "idle") this.loadHome();
  }
  measure() {
    const wrap = this.observed;
    if (!wrap || !this.config) return;
    const w2 = wrap.clientWidth - 32;
    if (w2 <= 0) return;
    const next = gridLayout(w2, this.config.columns);
    const cur = this.layout;
    if (next.cols !== cur.cols || next.listCols !== cur.listCols || next.shelfW !== cur.shelfW) this.layout = next;
  }
  get backend() {
    const c5 = this.config;
    return this.backends.get({ mode: c5.backend || "auto", entity: c5.entity, configEntryId: c5.config_entry_id });
  }
  get targetEntity() {
    return this.target || this.config.entity;
  }
  get speakerLabel() {
    return speakerName(this.hass, this.targetEntity);
  }
  render() {
    const c5 = this.config;
    if (!c5) return A;
    const full = c5.mode !== "inline";
    const browser = this.renderBrowser(full);
    return b2`
      ${full ? b2`
            ${c5.mode === "compact" ? this.renderLauncher(c5) : A}
            <dialog class="full" @close=${this.onFullClosed}>
              <div
                class="full-bg"
                style=${this.artwork ? `background-image: url("${this.artwork.replace(/"/g, "%22")}")` : ""}
              ></div>
              <div class="full-shade"></div>
              ${browser}
            </dialog>
          ` : b2`<ha-card class="inline-card">${browser}</ha-card>`}
      <ma-player-action-sheet></ma-player-action-sheet>
      <ma-player-toast></ma-player-toast>
    `;
  }
  renderLauncher(c5) {
    return b2`
      <ha-card class="launcher-card">
        <button class="launcher" @click=${() => this.open()}>
          <span class="l-icon"><ha-icon icon="mdi:magnify"></ha-icon></span>
          <span class="l-text">
            <span class="l-name">${c5.name || this.t("browser.launcher")}</span>
            <span class="l-sub">${this.t("browser.on_speaker", { name: this.speakerLabel })}</span>
          </span>
          <ha-icon class="l-chev" icon="mdi:chevron-right"></ha-icon>
        </button>
      </ha-card>
    `;
  }
  renderBrowser(full) {
    const { t: t5, layout } = this;
    const c5 = this.config;
    const vars = `--cols: ${layout.cols}; --list-cols: ${layout.listCols};${layout.shelfW ? ` --shelf-w: ${layout.shelfW}px;` : ""}`;
    return b2`
      <div
        class="wrap ${full ? "is-full" : "is-inline"} ${this.scrolled ? "scrolled" : ""}"
        style=${vars}
        @scroll=${full ? this.onScroll : A}
      >
        <div class="head">
          ${full || c5.speaker_selector ? b2`
                <div class="topbar">
                  ${full ? b2`<h1>${t5("browser.title")}</h1>` : b2`<span></span>`}
                  <div class="actions">
                    ${c5.speaker_selector ? b2`<button class="speaker" aria-label=${t5("speakers.choose")} @click=${this.openSpeakers}>
                          <ha-icon icon="mdi:speaker"></ha-icon><span>${this.speakerLabel}</span>
                          <ha-icon class="chev" icon="mdi:chevron-down"></ha-icon>
                        </button>` : A}
                    ${full ? b2`<button class="close" aria-label=${t5("common.close")} @click=${() => this.overlay?.close()}>
                          <ha-icon icon="mdi:close"></ha-icon>
                        </button>` : A}
                  </div>
                </div>
              ` : A}
          <div class="search">
            <ha-icon icon="mdi:magnify"></ha-icon>
            <input
              type="search"
              placeholder=${t5("browser.placeholder")}
              enterkeyhint="search"
              autocomplete="off"
              autocorrect="off"
              spellcheck="false"
              .value=${l3(this.q)}
              @input=${this.onInput}
              @keydown=${this.onSearchKey}
            />
            <button class="clear" aria-label=${t5("browser.clear")} ?hidden=${!this.q} @click=${this.clearSearch}>
              <ha-icon icon="mdi:close-circle"></ha-icon>
            </button>
          </div>
          <div class="tabs" role="tablist">
            ${c5.media_types.map(
      (type) => b2`<button
                  class="tab"
                  role="tab"
                  aria-selected=${type === this.type ? "true" : "false"}
                  @click=${() => this.setType(type)}
                >
                  ${t5(`type.${type}`)}
                </button>`
    )}
          </div>
        </div>
        <div
          class="body"
          @pointerdown=${this.onPointerDown}
          @pointermove=${this.onPointerMove}
          @pointerup=${this.cancelLongPress}
          @pointercancel=${this.cancelLongPress}
          @pointerleave=${this.cancelLongPress}
          @contextmenu=${this.onContextMenu}
          @click=${this.onItemClick}
          @keydown=${this.onItemKey}
        >
          ${this.renderBody()}
        </div>
      </div>
    `;
  }
  renderBody() {
    const { t: t5 } = this;
    const info = TYPES[this.type];
    switch (this.status) {
      case "idle":
        return this.renderHome();
      case "empty":
        return this.renderState(
          "mdi:music-off",
          t5("browser.no_results"),
          t5("browser.no_results_text", { types: t5(`type.${this.type}`).toLowerCase(), query: this.q })
        );
      case "error":
        return this.renderState(
          "mdi:alert-circle-outline",
          t5("common.error_title"),
          this.error,
          b2`<button class="retry" @click=${() => this.search(true)}>${t5("common.retry")}</button>`
        );
    }
    if (this.status === "loading" && !this.items.length) {
      const n4 = info.list ? 10 : Math.min(Number(this.config?.limit) || 12, this.layout.cols * 2);
      const skel = info.list ? b2`<div class="row skel">
            <div class="art"></div>
            <div class="meta"><div class="line"></div><div class="line short"></div></div>
          </div>` : b2`<div class="tile skel">
            <div class="art ${info.round ? "round" : ""}"></div>
            <div class="meta"><div class="line"></div><div class="line short"></div></div>
          </div>`;
      return b2`<div class=${info.list ? "list" : "grid"}>${Array.from({ length: n4 }, () => skel)}</div>`;
    }
    const dim = this.status === "loading" ? "dim" : "";
    return info.list ? b2`<div class="list ${dim}">${this.items.map((it, i7) => this.renderRow(it, i7))}</div>` : b2`<div class="grid ${dim}">${this.items.map((it, i7) => this.renderTile(it, i7, "r"))}</div>`;
  }
  renderState(icon, title, text, extra = A) {
    return b2`<div class="state">
      <ha-icon icon=${icon}></ha-icon>
      <div class="state-title">${title}</div>
      <div class="state-text">${text}</div>
      ${extra}
    </div>`;
  }
  /** Resolved on render so default titles follow a language change. */
  shelfTitle(h4) {
    return h4.title || (h4.titleKey ? this.t(h4.titleKey) : this.t(`type.${h4.media_type}`));
  }
  renderHome() {
    const { t: t5 } = this;
    const hint = this.renderState("mdi:music-circle-outline", t5("browser.hint_title"), t5("browser.hint_text"));
    if (!this.config?.home.length) return hint;
    if (this.homeStatus === "loading" && !this.home) {
      const tile = b2`<div class="tile skel">
        <div class="art"></div>
        <div class="meta"><div class="line"></div><div class="line short"></div></div>
      </div>`;
      const shelf = b2`<section class="shelf-sec">
        <div class="shelf-title skel-title"></div>
        <div class="shelf">${Array.from({ length: 8 }, () => tile)}</div>
      </section>`;
      return b2`${shelf}${shelf}`;
    }
    if (this.homeStatus === "error" && !this.home) {
      return this.renderState(
        "mdi:alert-circle-outline",
        t5("browser.home_error"),
        this.homeError,
        b2`<button class="retry" @click=${() => this.loadHome(true)}>${t5("common.retry")}</button>`
      );
    }
    const home = this.home || [];
    if (!home.some((sh) => sh.items.length)) return hint;
    return b2`${home.map(
      (sh, s5) => sh.items.length ? b2`<section class="shelf-sec">
            <h2 class="shelf-title">${this.shelfTitle(sh.shelf)}</h2>
            <div class="shelf">${sh.items.map((it, i7) => this.renderTile(it, i7, String(s5)))}</div>
          </section>` : A
    )}`;
  }
  typeOf(it) {
    return isMediaType(it.media_type) ? it.media_type : this.type;
  }
  /** `s`: "r" for search results, or the index of a home shelf. */
  itemKey(s5, it) {
    return `${s5}|${it.uri}`;
  }
  renderArt(it, type, s5, extra = A) {
    const info = TYPES[type];
    const img = hasImage(it.image) && !this.brokenImages.has(it.image) ? it.image : null;
    return b2`<div class="art ${info.round ? "round" : ""}">
      ${img ? b2`<img src=${img} alt="" loading="lazy" draggable="false" @error=${() => this.onImageError(img)} />` : b2`<ha-icon class="ph" icon=${info.icon}></ha-icon>`}
      <div class="fx ${this.fx.get(this.itemKey(s5, it)) || ""}"></div>
      ${extra}
    </div>`;
  }
  renderMeta(it, sub) {
    return b2`<div class="meta">
      <div class="title">${it.name}${it.version ? b2` <span class="ver">(${it.version})</span>` : A}</div>
      ${sub ? b2`<div class="sub">${sub}</div>` : A}
    </div>`;
  }
  renderMore() {
    return b2`<button class="more" aria-label=${this.t("browser.more")} tabindex="-1">
      <ha-icon icon="mdi:dots-horizontal"></ha-icon>
    </button>`;
  }
  renderTile(it, i7, s5) {
    const type = this.typeOf(it);
    return b2`<div class="tile item" data-s=${s5} data-i=${i7} role="button" tabindex="0" aria-label=${it.name}>
      ${this.renderArt(it, type, s5, this.renderMore())} ${this.renderMeta(it, subtitle(it, type))}
    </div>`;
  }
  renderRow(it, i7) {
    const type = this.typeOf(it);
    return b2`<div class="row item" data-s="r" data-i=${i7} role="button" tabindex="0" aria-label=${it.name}>
      ${this.renderArt(it, type, "r")} ${this.renderMeta(it, subtitle(it, type))} ${this.renderMore()}
    </div>`;
  }
  onImageError(url) {
    this.brokenImages.add(url);
    this.requestUpdate();
  }
  onFullClosed = () => {
    this.sheet?.close();
    this.renderRoot.querySelector("input")?.blur();
  };
  // The header turns into frosted glass once the content scrolls under it
  onScroll = (e5) => {
    const scrolled = e5.currentTarget.scrollTop > 4;
    if (scrolled !== this.scrolled) this.scrolled = scrolled;
  };
  get sheet() {
    return this.renderRoot.querySelector("ma-player-action-sheet");
  }
  get toast() {
    return this.renderRoot.querySelector("ma-player-toast");
  }
  openSpeakers = async () => {
    const c5 = this.config;
    const sheet = this.sheet;
    if (!c5 || !sheet || !this.hass) return;
    const ids = listSpeakers(this.hass, c5.entity, c5.speakers);
    const id = await pickSpeaker(sheet, this.hass, ids, this.targetEntity, this.t);
    if (!id) return;
    this.target = id === c5.entity ? null : id;
    Target.save(c5.entity, this.target);
    haptic(this, "selection");
  };
  onInput = (e5) => {
    this.q = e5.target.value;
    clearTimeout(this.debounce);
    this.debounce = setTimeout(() => this.search(), DEBOUNCE_MS);
  };
  onSearchKey = (e5) => {
    if (e5.key !== "Enter") return;
    e5.preventDefault();
    clearTimeout(this.debounce);
    this.search();
    e5.target.blur();
  };
  clearSearch = () => {
    this.q = "";
    clearTimeout(this.debounce);
    this.search();
    this.renderRoot.querySelector("input")?.focus();
  };
  setType(type) {
    if (type === this.type) return;
    this.type = type;
    this.items = [];
    const wrap = this.observed;
    if (wrap?.classList.contains("is-full")) wrap.scrollTop = 0;
    this.search();
  }
  async search(force = false) {
    const c5 = this.config;
    if (!c5) return;
    const q = this.q.trim();
    const type = this.type;
    const reqId = ++this.reqId;
    if (q.length < MIN_QUERY) {
      this.status = "idle";
      this.items = [];
      return;
    }
    const key = `${type}|${q.toLowerCase()}`;
    const cached = this.cache.get(key);
    if (!force && cached) {
      this.items = cached;
      this.status = cached.length ? "ok" : "empty";
      return;
    }
    this.status = "loading";
    try {
      const items = await this.backend.library.search(q, type, { limit: Number(c5.limit) || 20, libraryOnly: !!c5.library_only });
      if (reqId !== this.reqId) return;
      this.cache.set(key, items);
      this.items = items;
      this.status = items.length ? "ok" : "empty";
    } catch (err) {
      if (reqId !== this.reqId) return;
      console.error("[ma-browser-card] search", err);
      this.items = [];
      this.status = "error";
      this.error = errorMessage(err);
    }
  }
  async loadHome(force = false) {
    const c5 = this.config;
    if (!c5?.home.length || !this.hass || this.homeStatus === "loading") return;
    if (!force && this.home && Date.now() - this.homeLoadedAt < HOME_TTL_MS) return;
    this.homeStatus = "loading";
    const library = this.backend.library;
    const results = await Promise.allSettled(
      c5.home.map(
        (h4) => library.getLibrary({
          mediaType: h4.media_type,
          limit: Number(h4.limit || c5.home_limit) || 20,
          favorite: !!h4.favorite,
          orderBy: h4.order_by
        })
      )
    );
    if (c5 !== this.config) return;
    this.home = c5.home.map((shelf, i7) => {
      const r5 = results[i7];
      if (r5.status === "fulfilled") return { shelf, items: r5.value };
      console.warn(`[ma-browser-card] shelf "${this.shelfTitle(shelf)}" failed:`, r5.reason);
      return { shelf, items: [] };
    });
    this.homeLoadedAt = Date.now();
    const failed = results.find((r5) => r5.status === "rejected");
    this.homeStatus = failed && results.every((r5) => r5.status === "rejected") ? "error" : "ok";
    if (this.homeStatus === "error") this.homeError = errorMessage(failed?.reason);
  }
  itemOf(e5) {
    return e5.target.closest?.(".item") ?? null;
  }
  lookup(el) {
    const i7 = Number(el.dataset.i);
    const s5 = el.dataset.s || "r";
    const it = s5 === "r" ? this.items[i7] : this.home?.[Number(s5)]?.items[i7];
    return it ? { it, s: s5 } : null;
  }
  onPointerDown = (e5) => {
    const el = this.itemOf(e5);
    if (!el || e5.target.closest(".more") || e5.button > 0) return;
    const lp = this.longPress;
    clearTimeout(lp.timer);
    Object.assign(lp, { x: e5.clientX, y: e5.clientY, fired: false });
    el.classList.add("pressed");
    lp.timer = setTimeout(() => {
      lp.fired = true;
      el.classList.remove("pressed");
      haptic(this, "medium");
      this.openMenu(el);
    }, LONG_PRESS_MS);
  };
  onPointerMove = (e5) => {
    const lp = this.longPress;
    if (lp.timer && Math.hypot(e5.clientX - lp.x, e5.clientY - lp.y) > 10) this.cancelLongPress();
  };
  cancelLongPress = () => {
    clearTimeout(this.longPress.timer);
    this.longPress.timer = void 0;
    for (const el of this.renderRoot.querySelectorAll(".item.pressed")) el.classList.remove("pressed");
  };
  onContextMenu = (e5) => {
    if (this.itemOf(e5)) e5.preventDefault();
  };
  onItemClick = (e5) => {
    const el = this.itemOf(e5);
    if (!el) return;
    if (this.longPress.fired) {
      this.longPress.fired = false;
      return;
    }
    if (e5.target.closest(".more")) {
      e5.stopPropagation();
      this.openMenu(el);
    } else this.play(el);
  };
  onItemKey = (e5) => {
    const el = this.itemOf(e5);
    if (!el) return;
    if (e5.key === "Enter" || e5.key === " ") {
      e5.preventDefault();
      this.play(el);
    } else if (e5.key === "ContextMenu" || e5.shiftKey && e5.key === "F10") {
      e5.preventDefault();
      this.openMenu(el);
    }
  };
  async openMenu(el) {
    const found = this.lookup(el);
    const sheet = this.sheet;
    if (!found || !sheet) return;
    const { it } = found;
    const type = this.typeOf(it);
    const info = TYPES[type];
    const { t: t5 } = this;
    const key = await sheet.show({
      header: { title: it.name, subtitle: subtitle(it, type), image: it.image || void 0, icon: info.icon, round: info.round },
      actions: [
        { key: "now", label: t5("browser.play_now"), icon: "mdi:play" },
        ...info.noQueue ? [] : [
          { key: "next", label: t5("browser.play_next"), icon: "mdi:playlist-play" },
          { key: "add", label: t5("browser.add_to_queue"), icon: "mdi:playlist-plus" }
        ]
      ],
      cancelLabel: t5("common.cancel")
    });
    if (key === "next" || key === "add") this.play(el, key);
    else if (key === "now") this.play(el);
  }
  setFx(key, fx, clearAfter) {
    if (fx) this.fx.set(key, fx);
    else this.fx.delete(key);
    this.requestUpdate();
    if (clearAfter)
      setTimeout(() => {
        if (this.fx.get(key) === fx) this.setFx(key, null);
      }, clearAfter);
  }
  async play(el, enqueueOverride) {
    const found = this.lookup(el);
    if (!found?.it.uri) return;
    const { it, s: s5 } = found;
    const type = this.typeOf(it);
    const enqueue = enqueueOverride || TYPES[type].enqueue;
    const key = this.itemKey(s5, it);
    const { t: t5 } = this;
    haptic(this, "light");
    this.setFx(key, "busy");
    try {
      await this.backend.library.play(this.targetEntity, { uri: it.uri, mediaType: type }, enqueue);
      this.setFx(key, "done", 1400);
      const msg = enqueue === "next" ? t5("browser.queued_next") : enqueue === "add" ? t5("browser.queued") : t5("common.playing_on", { name: this.speakerLabel });
      const icon = enqueue === "next" ? "mdi:playlist-play" : enqueue === "add" ? "mdi:playlist-plus" : "mdi:play-circle";
      this.toast?.show({ title: it.name, image: it.image || void 0, text: msg, icon });
    } catch (err) {
      console.error("[ma-browser-card] play_media", err);
      this.setFx(key, "fail", 2e3);
      this.toast?.show({
        title: it.name,
        image: it.image || void 0,
        text: t5("browser.play_failed", { error: errorMessage(err) }),
        icon: "mdi:alert-circle",
        error: true
      });
    }
  }
};

// src/services/playback-clock.ts
var EXPECT_MS = 15e3;
var RESET_THRESHOLD_S = 3;
var PlaybackClock = class {
  constructor(log = () => {
  }) {
    this.log = log;
  }
  log;
  key = "";
  anchor = null;
  lastUpd;
  offset = 0;
  expectAt = 0;
  /** MA's clock minus ours, plus latency, in ms (the smallest seen). */
  skew = null;
  /** `key` identifies song + player: when it changes, everything resets. `report` is null without player state. */
  sync(key, report, duration2, now = Date.now()) {
    if (key !== this.key) {
      this.key = key;
      this.anchor = null;
      this.lastUpd = void 0;
      this.offset = 0;
      this.expectAt = 0;
    }
    if (!report) return;
    const { playing, updatedAt: upd } = report;
    if (upd !== this.lastUpd || !this.anchor) {
      const live = this.lastUpd !== void 0 && upd !== this.lastUpd;
      this.lastUpd = upd;
      const updMs = Date.parse(upd);
      if (live && updMs) {
        const obs = now - updMs;
        this.skew = this.skew == null ? obs : Math.min(this.skew, obs);
      }
      let ha = Number(report.position) || 0;
      if (playing && updMs) ha += 0.5 + Math.max(0, (now - (this.skew || 0) - updMs) / 1e3);
      let pos = ha + this.offset;
      let note = "";
      if (this.expectAt && now - this.expectAt < EXPECT_MS && this.anchor) {
        const mine = this.position(duration2, now);
        if (Math.abs(pos - mine) > RESET_THRESHOLD_S) {
          this.offset = mine - ha;
          pos = mine;
          note = ` · MA restarted its count, offset ${this.offset.toFixed(1)}s`;
        }
      }
      this.anchor = { pos, at: now, playing };
      this.log(
        `HA ${report.state} pos=${report.position} upd=${upd ? upd.slice(11, 23) : "-"} (${updMs ? ((now - updMs) / 1e3).toFixed(1) : "?"}s) → anchor ${pos.toFixed(1)}${note}`
      );
    } else if (this.anchor.playing !== playing) {
      this.anchor = { pos: this.position(duration2, now), at: now, playing };
    }
  }
  /** After our own seek, pause or resume we know the position, even if HA is late or wrong. */
  setLocal(pos, playing, now = Date.now()) {
    this.log(`local ${playing ? "▶" : "⏸"} anchor ${pos.toFixed(1)}`);
    this.expectAt = now;
    this.anchor = { pos, at: now, playing };
  }
  /** Seconds, clamped between 0 and the duration when known. */
  position(duration2, now = Date.now()) {
    const an = this.anchor;
    if (!an) return 0;
    let p4 = an.pos + (an.playing ? (now - an.at) / 1e3 : 0);
    if (duration2) p4 = Math.min(p4, duration2);
    return Math.max(0, p4);
  }
  get debug() {
    return { anchor: this.anchor, skew: this.skew, offset: this.offset };
  }
};

// src/version.ts
var VERSION = "0.5.1";

// src/cards/player-card/player-card.styles.ts
var playerStyles = i`
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
  .ib.play ha-icon { --mdc-icon-size: 36px; }
  .ib.search { color: var(--primary-text-color); }
  .ib.search ha-icon { --mdc-icon-size: 26px; }
  .mini.idle .prev, .mini.idle .play, .mini.idle .next, .mini.idle .mini-progress { display: none; }
  .mini-progress { position: absolute; left: 0; right: 0; bottom: 0; height: 3px; background: var(--fill); }
  .mini-progress .fill { height: 100%; width: 0; background: var(--accent); transition: width .5s linear; }
  @container (max-width: 400px) { .mini .prev { display: none; } }

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

// src/cards/player-card/player-card.ts
var REPEAT_ORDER = ["off", "all", "one"];
var OPTIMISTIC_MS = 2500;
var VOLUME_HOLD_MS = 2e3;
var FAVORITE_HOLD_MS = 6e3;
var picture = (st) => st?.attributes.entity_picture_local || st?.attributes.entity_picture || "";
var duration = (st) => Number(st?.attributes.media_duration) || 0;
var MaPlayerCard = class extends i4 {
  static properties = {
    hass: { attribute: false },
    config: { state: true },
    target: { state: true },
    view: { state: true },
    npOpen: { state: true },
    fav: { state: true },
    now: { state: true },
    dragPos: { state: true },
    volume: { state: true },
    optimistic: { state: true },
    brokenImages: { state: true }
  };
  instanceId = `ma-player-${nextInstanceId()}`;
  backends = new BackendHolder(() => this.hass);
  clock = new PlaybackClock((msg) => this.log(msg));
  uiLang = "";
  t = translator("en");
  trackKey = "";
  favAt = 0;
  overlay = null;
  /** The config last passed to the embedded browser. */
  browserConfigured;
  timer;
  queueTimer;
  volumeTimer;
  debugLog = [];
  debugQueue;
  debugPollAt = 0;
  debugBusy = false;
  static styles = [browserStyles, playerStyles];
  constructor() {
    super();
    this.target = null;
    this.view = "art";
    this.npOpen = false;
    this.fav = null;
    this.now = Date.now();
    this.dragPos = null;
    this.volume = null;
    this.optimistic = null;
    this.brokenImages = /* @__PURE__ */ new Set();
  }
  setConfig(config) {
    if (!config?.entity) throw new Error("Missing 'entity' (a Music Assistant media_player)");
    this.config = { queue_limit: 50, lyrics: true, lyrics_url: "https://lrclib.net", ...config, entity: config.entity };
    this.target = Target.load(this.config.entity);
  }
  getCardSize() {
    return 2;
  }
  getGridOptions() {
    return { columns: 12, min_columns: 6 };
  }
  static getStubConfig(hass) {
    return MaBrowserCard.getStubConfig(hass);
  }
  connectedCallback() {
    super.connectedCallback();
    window.addEventListener(TARGET_EVENT, this.onTargetEvent);
    clearInterval(this.timer);
    this.timer = setInterval(() => this.tick(), 500);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener(TARGET_EVENT, this.onTargetEvent);
    clearInterval(this.timer);
    clearTimeout(this.queueTimer);
    clearTimeout(this.volumeTimer);
    this.overlay?.close();
  }
  onTargetEvent = (e5) => {
    const { entity, target } = e5.detail;
    if (entity === this.config?.entity) this.target = target;
  };
  get entity() {
    const t5 = this.target;
    return t5 && this.hass?.states[t5] ? t5 : this.config.entity;
  }
  get state() {
    return this.hass?.states[this.entity];
  }
  get backend() {
    const c5 = this.config;
    return this.backends.get({ mode: c5.backend || "auto", entity: c5.entity, configEntryId: c5.config_entry_id });
  }
  isPlaying(st = this.state) {
    if (!st) return false;
    const o5 = this.optimistic;
    if (o5 && Date.now() - o5.at < OPTIMISTIC_MS) return o5.playing;
    return st.state === "playing";
  }
  position(st = this.state) {
    return st ? this.clock.position(duration(st)) : 0;
  }
  willUpdate(changed) {
    if (changed.has("config") && this.config) this.style.setProperty("--accent", accentColor(this.config.accent_color));
    if (!this.config || !this.hass) return;
    if (changed.has("hass")) {
      const lang = hassLanguage(this.hass);
      if (lang !== this.uiLang) {
        this.uiLang = lang;
        this.t = translator(lang);
      }
    }
    if (changed.has("hass") || changed.has("target")) this.syncState();
  }
  /** Runs on every new state, even when nothing visible changed. */
  syncState() {
    const st = this.state;
    const a3 = st?.attributes ?? {};
    if (this.optimistic && st && st.state === "playing" === this.optimistic.playing) this.optimistic = null;
    const key = `${this.entity}|${a3.media_title || ""}|${a3.media_artist || ""}`;
    this.clock.sync(
      key,
      st ? {
        state: st.state,
        playing: st.state === "playing",
        position: Number(a3.media_position) || 0,
        updatedAt: a3.media_position_updated_at || ""
      } : null,
      duration(st)
    );
    if (key !== this.trackKey) {
      this.trackKey = key;
      this.fav = null;
      if (this.npOpen) this.refreshQueue();
    }
  }
  updated() {
    const dialog = this.renderRoot.querySelector("dialog.np");
    if (dialog && dialog !== this.overlay?.dialog) this.overlay = new OverlayHistory(dialog, `${this.instanceId}:np`);
    const browser = this.browser;
    if (browser && this.config && this.browserConfigured !== this.config) {
      this.browserConfigured = this.config;
      browser.setConfig(this.browserConfig());
    }
  }
  browserConfig() {
    const { type, queue_limit, lyrics, lyrics_url, lyrics_offset, debug, name, ...rest } = this.config;
    return { ...rest, mode: "overlay" };
  }
  get browser() {
    return this.renderRoot.querySelector("ma-browser-card");
  }
  get queueEl() {
    return this.renderRoot.querySelector("ma-player-queue");
  }
  get sheet() {
    return this.renderRoot.querySelector("ma-player-action-sheet");
  }
  showToast(spec) {
    this.renderRoot.querySelector("ma-player-toast")?.show(spec);
  }
  tick() {
    if (!this.hass || !this.config) return;
    this.now = Date.now();
    if (this.config.debug && this.npOpen && Date.now() - this.debugPollAt > 2e3) {
      this.debugPollAt = Date.now();
      this.pollDebugQueue();
    }
  }
  render() {
    const c5 = this.config;
    const hass = this.hass;
    if (!c5 || !hass) return A;
    const { t: t5 } = this;
    const st = this.state;
    const a3 = st?.attributes ?? {};
    const has = !!(st && a3.media_title);
    const unavailable = !st || st.state === "unavailable";
    const playing = this.isPlaying(st);
    const pic = picture(st);
    const name = speakerName(hass, this.entity);
    const d3 = duration(st);
    const pos = this.dragPos ?? this.position(st);
    const ratio = d3 ? Math.min(1, pos / d3) : 0;
    const playIcon = playing ? "mdi:pause" : "mdi:play";
    const backend = this.backend;
    const showFav = has && backend.favorites.canFavorite(this.entity);
    const repeat = a3.repeat || "off";
    const volume = this.volume && Date.now() - this.volume.at < VOLUME_HOLD_MS ? this.volume.level : Number(a3.volume_level) || 0;
    const track = has ? { title: a3.media_title, artist: a3.media_artist, album: a3.media_album_name, duration: a3.media_duration } : null;
    return b2`
      <ha-card class="mini ${has ? "" : "idle"}">
        <div class="mini-row">
          <button class="mini-main" aria-label=${t5("player.open")} @click=${() => has ? this.openNowPlaying() : this.browser?.open()}>
            <span class="mini-art">${this.renderArt(has ? pic : "")}</span>
            <span class="mini-text">
              <span class="mini-title">${has ? a3.media_title : t5(unavailable ? "player.unavailable" : "player.nothing_playing")}</span>
              <span class="mini-sub">
                ${has ? [a3.media_artist, a3.media_album_name].filter(Boolean).join(" · ") : t5("player.tap_to_search", { name })}
              </span>
            </span>
          </button>
          <div class="mini-ctrls">
            ${this.renderCmd("ib prev", "prev", t5("player.previous"), "mdi:skip-previous")}
            ${this.renderCmd("ib play", "playpause", t5("player.play_pause"), playIcon)}
            ${this.renderCmd("ib next", "next", t5("player.next"), "mdi:skip-next")}
            ${this.renderCmd("ib search", "search", t5("browser.launcher"), "mdi:magnify")}
          </div>
        </div>
        <div class="mini-progress"><div class="fill" style="width: ${ratio * 100}%"></div></div>
      </ha-card>

      <dialog class="np" @close=${this.onNowPlayingClosed}>
        <div class="np-bg" style=${pic ? `background-image: url("${pic.replace(/"/g, "%22")}")` : ""}></div>
        <div class="np-shade"></div>
        ${c5.debug && this.npOpen ? b2`<pre class="np-debug">${this.debugText(st, pos)}</pre>` : A}
        <div class="np-inner">
          <div class="np-top">
            <button class="np-btn np-close" aria-label=${t5("common.close")} @click=${() => this.overlay?.close()}>
              <ha-icon icon="mdi:chevron-down"></ha-icon>
            </button>
            <div class="np-where">${t5("common.playing_on", { name })}</div>
            <span class="np-top-spacer"></span>
          </div>
          <div class="np-stage" data-view=${this.view}>
            <div class="np-art-wrap view-art"><div class="np-art ${playing ? "" : "paused"}">${this.renderArt(pic)}</div></div>
            <ma-player-queue
              class="np-list view-queue"
              .backend=${backend}
              entity=${this.entity}
              .limit=${Number(c5.queue_limit) || 50}
              language=${this.uiLang}
              @queue-info=${this.onQueueInfo}
              @toast=${(e5) => this.showToast(e5.detail)}
            ></ma-player-queue>
            ${c5.lyrics ? b2`<ma-player-lyrics
                    class="np-lyrics view-lyrics"
                    .track=${track}
                    .position=${pos}
                    .offset=${this.lyricsOffset()}
                    ?active=${this.npOpen && this.view === "lyrics"}
                    url=${c5.lyrics_url}
                    language=${this.uiLang}
                    @seek=${(e5) => this.seek(e5.detail)}
                  ></ma-player-lyrics>` : A}
          </div>
          <div class="np-panel">
            <div class="np-titlerow">
              <div class="np-text">
                <div class="np-title">${has ? a3.media_title : t5("player.nothing_playing")}</div>
                <div class="np-artist">${has ? [a3.media_artist, a3.media_album_name].filter(Boolean).join(" — ") : ""}</div>
              </div>
              ${showFav ? b2`<button class="np-btn fav ${this.fav ? "on" : ""}" aria-label=${t5("player.favorite")} @click=${this.toggleFavorite}>
                      <ha-icon icon=${this.fav ? "mdi:heart" : "mdi:heart-outline"}></ha-icon>
                    </button>` : A}
            </div>
            <ma-slider
              class="seek"
              aria-label=${t5("player.position")}
              .value=${ratio}
              @slide=${(e5) => this.dragPos = e5.detail * d3}
              @slide-end=${this.onSeekEnd}
            ></ma-slider>
            <div class="np-times"><span>${fmtTime(pos)}</span><span>${d3 ? `-${fmtTime(d3 - pos)}` : ""}</span></div>
            <div class="np-ctrls">
              ${this.renderCmd(`np-btn small ${a3.shuffle ? "on" : ""}`, "shuffle", t5("player.shuffle"), "mdi:shuffle-variant")}
              ${this.renderCmd("np-btn big", "prev", t5("player.previous"), "mdi:skip-previous")}
              ${this.renderCmd("np-btn huge", "playpause", t5("player.play_pause"), playIcon)}
              ${this.renderCmd("np-btn big", "next", t5("player.next"), "mdi:skip-next")}
              ${this.renderCmd(
      `np-btn small ${repeat !== "off" ? "on" : ""}`,
      "repeat",
      t5("player.repeat"),
      repeat === "one" ? "mdi:repeat-once" : repeat === "all" ? "mdi:repeat" : "mdi:repeat-off"
    )}
            </div>
            <div class="np-vol">
              <ha-icon icon="mdi:volume-low"></ha-icon>
              <ma-slider
                class="vol"
                aria-label=${t5("player.volume")}
                .value=${volume}
                @slide=${(e5) => this.setVolume(e5.detail, false)}
                @slide-end=${(e5) => e5.detail !== null && this.setVolume(e5.detail, true)}
              ></ma-slider>
              <ha-icon icon="mdi:volume-high"></ha-icon>
            </div>
            <div class="np-bottom">
              ${c5.lyrics ? this.renderViewButton("lyrics", t5("player.lyrics"), "mdi:message-text-outline") : b2`<span class="np-top-spacer"></span>`}
              <button class="np-pill" aria-label=${t5("speakers.choose")} @click=${this.openSpeakers}>
                <ha-icon icon="mdi:speaker"></ha-icon><span>${name}</span>
              </button>
              ${this.renderCmd("np-btn tool", "search", t5("browser.launcher"), "mdi:magnify")}
              ${this.renderViewButton("queue", t5("player.queue"), "mdi:playlist-music")}
            </div>
          </div>
        </div>
      </dialog>

      <ma-browser-card .hass=${hass} .artwork=${has ? pic : null}></ma-browser-card>
      <!-- Shown over "Now playing", which is always dark -->
      <ma-player-action-sheet dark></ma-player-action-sheet>
      <ma-player-toast dark></ma-player-toast>
    `;
  }
  renderArt(url) {
    return url && !this.brokenImages.has(url) ? b2`<img src=${url} alt="" draggable="false" @error=${() => this.brokenImages = new Set(this.brokenImages).add(url)} />` : b2`<ha-icon icon="mdi:music"></ha-icon>`;
  }
  renderCmd(cls, cmd, label, icon) {
    return b2`<button class=${cls} aria-label=${label} @click=${() => this.cmd(cmd)}><ha-icon icon=${icon}></ha-icon></button>`;
  }
  renderViewButton(view, label, icon) {
    return b2`<button
      class="np-btn tool ${this.view === view ? "on" : ""}"
      aria-label=${label}
      @click=${() => this.setView(this.view === view ? "art" : view)}
    >
      <ha-icon icon=${icon}></ha-icon>
    </button>`;
  }
  openNowPlaying() {
    if (!this.overlay?.open()) return;
    this.npOpen = true;
    haptic(this, "light");
    this.refreshQueue();
  }
  onNowPlayingClosed = () => {
    this.npOpen = false;
  };
  openSpeakers = async () => {
    const c5 = this.config;
    const sheet = this.sheet;
    if (!c5 || !sheet || !this.hass) return;
    const ids = listSpeakers(this.hass, c5.entity, c5.speakers);
    const id = await pickSpeaker(sheet, this.hass, ids, this.entity, this.t);
    if (!id) return;
    Target.save(c5.entity, id === c5.entity ? null : id);
    haptic(this, "selection");
  };
  /** Delayed: a player usually sends several state changes in a row. */
  refreshQueue() {
    clearTimeout(this.queueTimer);
    this.queueTimer = setTimeout(() => this.queueEl?.refresh(this.view === "queue"), 400);
  }
  setView(view) {
    this.view = view;
    if (view === "queue") this.queueEl?.refresh(true);
    haptic(this, "selection");
  }
  /** Player commands only log their errors: the state update shows whether they worked. */
  run(label, fn) {
    return fn(this.backend.player, this.entity).catch((err) => console.error(`[ma-player-card] ${label}`, err));
  }
  cmd(cmd) {
    const st = this.state;
    const a3 = st?.attributes ?? {};
    haptic(this, "light");
    switch (cmd) {
      case "playpause": {
        const playing = !this.isPlaying(st);
        this.clock.setLocal(this.position(st), playing);
        this.optimistic = { playing, at: Date.now() };
        this.run("media_play_pause", (p4, e5) => p4.playPause(e5));
        return;
      }
      case "prev":
        this.run("media_previous_track", (p4, e5) => p4.previous(e5));
        return;
      case "next":
        this.run("media_next_track", (p4, e5) => p4.next(e5));
        return;
      case "shuffle":
        this.run("shuffle_set", (p4, e5) => p4.setShuffle(e5, !a3.shuffle));
        return;
      case "repeat": {
        const next = REPEAT_ORDER[(REPEAT_ORDER.indexOf(a3.repeat || "off") + 1) % REPEAT_ORDER.length];
        this.run("repeat_set", (p4, e5) => p4.setRepeat(e5, next));
        return;
      }
      case "search":
        this.browser?.open();
    }
  }
  seek(pos) {
    this.clock.setLocal(pos, this.isPlaying());
    this.requestUpdate();
    this.run("media_seek", (p4, e5) => p4.seek(e5, Math.round(pos * 10) / 10));
  }
  onSeekEnd = (e5) => {
    this.dragPos = null;
    const d3 = duration(this.state);
    if (e5.detail !== null && d3) this.seek(e5.detail * d3);
  };
  /** Sends at most every 250 ms while dragging, and always on release. */
  setVolume(level, final) {
    this.volume = { level, at: Date.now() };
    const send = () => {
      this.volumeTimer = void 0;
      const v3 = Math.round((this.volume?.level ?? level) * 100) / 100;
      this.run("volume_set", (p4, e5) => p4.setVolume(e5, v3));
    };
    if (final) {
      clearTimeout(this.volumeTimer);
      send();
    } else if (!this.volumeTimer) this.volumeTimer = setTimeout(send, 250);
  }
  lyricsOffset() {
    const o5 = Number(this.config?.lyrics_offset);
    return Number.isFinite(o5) ? o5 : 0.6;
  }
  toggleFavorite = async () => {
    const st = this.state;
    if (!st) return;
    const item = { title: String(st.attributes.media_title || ""), image: picture(st) || void 0 };
    const be = this.backend;
    const ent = this.entity;
    const remove = !!this.fav;
    const { t: t5 } = this;
    if (remove && !be.can.unfavorite) {
      this.showToast({ ...item, text: t5("player.already_favorite"), icon: "mdi:heart" });
      return;
    }
    this.fav = !remove;
    this.favAt = Date.now();
    haptic(this, remove ? "light" : "success");
    try {
      if (remove) await be.favorites.unfavorite(ent);
      else await be.favorites.favorite(ent);
      this.showToast({
        ...item,
        text: t5(remove ? "player.unfavorited" : "player.favorited"),
        icon: remove ? "mdi:heart-broken" : "mdi:heart"
      });
    } catch (err) {
      this.fav = remove;
      this.showToast({
        ...item,
        text: t5(remove ? "player.unfavorite_failed" : "player.favorite_failed", { error: errorMessage(err) }),
        icon: "mdi:alert-circle",
        error: true
      });
    }
  };
  onQueueInfo = (e5) => {
    const info = e5.detail;
    if (info.current && Date.now() - this.favAt > FAVORITE_HOLD_MS) this.fav = !!info.current.favorite;
  };
  log(msg) {
    if (!this.config?.debug) return;
    const line = `${(/* @__PURE__ */ new Date()).toISOString().slice(11, 23)} ${msg}`;
    console.info(`[ma-player-card][debug] ${line}`);
    this.debugLog = [line, ...this.debugLog].slice(0, 10);
  }
  /** Music Assistant's own elapsed_time, to compare with the card's position. */
  async pollDebugQueue() {
    if (this.debugBusy) return;
    this.debugBusy = true;
    try {
      const info = await this.backend.queue.info(this.entity);
      this.debugQueue = { elapsed: info.elapsed, at: Date.now() };
    } catch (err) {
      this.debugQueue = { error: errorMessage(err), at: Date.now() };
    }
    this.debugBusy = false;
  }
  debugText(st, pos) {
    const a3 = st?.attributes ?? {};
    const { anchor: an, skew, offset } = this.clock.debug;
    const q = this.debugQueue;
    const ago = (t5) => `${((Date.now() - t5) / 1e3).toFixed(1)}s`;
    const o5 = this.optimistic;
    return [
      `v${VERSION}  backend: ${this.backend.name}  state: ${st ? st.state : "-"}  (optimistic: ${o5 ? o5.playing : "-"})`,
      `HA media_position: ${a3.media_position}  duration: ${a3.media_duration}`,
      `HA updated_at: ${a3.media_position_updated_at || "-"}`,
      `device clock: ${(/* @__PURE__ */ new Date()).toISOString()}`,
      `clock skew: ${skew == null ? "not measured" : `${skew} ms`}   MA offset: ${offset.toFixed(1)}s`,
      `anchor: ${an ? `${an.pos.toFixed(1)}s ${ago(an.at)} ago ${an.playing ? "▶" : "⏸"}` : "-"}`,
      `CARD POSITION: ${pos.toFixed(1)}s`,
      `MA queue elapsed_time: ${q ? q.error ? `error ${q.error}` : `${q.elapsed}s (${ago(q.at)} ago)` : "…"}`,
      "— events —",
      ...this.debugLog
    ].join("\n");
  }
};

// src/services/lyrics/lrc-parser.ts
function parseLrc(lrc) {
  const lines = [];
  for (const raw of String(lrc || "").split(/\r?\n/)) {
    const stamps = [...raw.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)];
    if (!stamps.length) continue;
    const text = raw.replace(/\[[^\]]*\]/g, "").trim();
    for (const m3 of stamps) lines.push({ t: Number(m3[1]) * 60 + Number(m3[2]), text });
  }
  return lines.sort((a3, b3) => a3.t - b3.t);
}

// src/services/lyrics/lrclib.ts
var lyricsCache = /* @__PURE__ */ new Map();
var cleanTitle = (t5) => String(t5 || "").replace(/\s*[([](?:feat\.?|ft\.?|with|con|featuring)\s[^)\]]*[)\]]/gi, "").replace(
  /\s+-\s+.*\b(?:remaster(?:ed)?|version|versión|live|en vivo|radio edit|edit|mono|stereo|acoustic|acústico)\b.*$/i,
  ""
).trim();
var firstArtist = (a3) => String(a3 || "").split(/\s*(?:,|;|&|\/|\sfeat\.?\s|\sft\.?\s|\sx\s|\sy\s)\s*/i)[0].trim();
var hasLyrics = (d3) => !!d3 && !!(d3.syncedLyrics || d3.plainLyrics || d3.instrumental);
function bestMatch(list, dur) {
  const ok = (list || []).filter(hasLyrics).filter((x2) => !dur || !x2.duration || Math.abs(x2.duration - dur) <= 5).sort(
    (x2, y3) => Number(!!y3.syncedLyrics) - Number(!!x2.syncedLyrics) || (dur ? Math.abs((x2.duration || dur) - dur) - Math.abs((y3.duration || dur) - dur) : 0)
  );
  return ok[0] || null;
}
function fetchLyrics(base, track, fetchFn = fetch) {
  const { title, artist, album, duration: duration2 } = track;
  const key = `${artist}|${title}`.toLowerCase();
  const cached = lyricsCache.get(key);
  if (cached) return cached;
  const p4 = (async () => {
    const t22 = cleanTitle(title) || title;
    const a22 = firstArtist(artist) || artist || "";
    const dur = duration2 ? Math.round(duration2) : 0;
    const tries = [
      ["get", { track_name: title, artist_name: artist || "", album_name: album || "", duration: dur || "" }],
      ["get", { track_name: t22, artist_name: a22, duration: dur || "" }],
      ["search", { track_name: t22, artist_name: a22 }],
      ["search", { q: `${t22} ${a22}`.trim() }],
      ["search", { track_name: t22 }]
    ];
    const seen = /* @__PURE__ */ new Set();
    for (const [kind, params] of tries) {
      const q = new URLSearchParams(
        Object.entries(params).filter(([, v3]) => v3 !== "" && v3 != null).map(([k2, v3]) => [k2, String(v3)])
      );
      const url = `${base}/api/${kind}?${q}`;
      if (seen.has(url)) continue;
      seen.add(url);
      const r5 = await fetchFn(url);
      if (r5.status === 404) continue;
      if (!r5.ok) throw new Error(`LRCLIB responded ${r5.status}`);
      const d3 = await r5.json();
      const hit = kind === "get" ? hasLyrics(d3) ? d3 : null : bestMatch(d3, dur);
      if (hit) {
        console.info(`[ma-player-card] lyrics found on LRCLIB (${kind}: ${q})`);
        return hit;
      }
    }
    console.info(`[ma-player-card] LRCLIB has no lyrics for "${title}" by ${artist}`);
    return null;
  })();
  lyricsCache.set(key, p4);
  p4.catch(() => lyricsCache.delete(key));
  return p4;
}

// src/cards/player-card/player-lyrics.ts
var USER_SCROLL_MS = 4e3;
function lyricIndex(lines, pos) {
  let idx = -1;
  for (let i7 = 0; i7 < lines.length && lines[i7].t <= pos; i7++) idx = i7;
  return idx;
}
var MaPlayerLyrics = class extends i4 {
  static properties = {
    track: { attribute: false },
    position: { type: Number },
    offset: { type: Number },
    active: { type: Boolean },
    url: {},
    language: {},
    lyrics: { state: true }
  };
  t = translator("en");
  trackKey = "";
  /** The line last scrolled to. */
  shownIdx = -1;
  userScrollAt = 0;
  constructor() {
    super();
    this.track = null;
    this.position = 0;
    this.offset = 0;
    this.active = false;
    this.url = "https://lrclib.net";
    this.language = "en";
    this.lyrics = null;
    const onUserScroll = () => this.userScrollAt = Date.now();
    this.addEventListener("wheel", onUserScroll, { passive: true });
    this.addEventListener("touchmove", onUserScroll, { passive: true });
  }
  shouldUpdate(changed) {
    return this.active || !(changed.size === 1 && changed.has("position"));
  }
  willUpdate(changed) {
    if (changed.has("language")) this.t = translator(this.language);
    if (changed.has("track")) {
      const key = this.track ? `${this.track.title}|${this.track.artist}` : "";
      if (key !== this.trackKey) {
        this.trackKey = key;
        this.lyrics = null;
        this.shownIdx = -1;
        this.userScrollAt = 0;
        this.scrollTop = 0;
      }
    }
    if (changed.has("active") && this.active) {
      this.shownIdx = -1;
      this.userScrollAt = 0;
    }
    if (this.active && !this.lyrics) this.load();
  }
  updated() {
    const l4 = this.lyrics;
    if (!this.active || l4?.status !== "synced") return;
    const idx = this.index(l4.lines);
    if (idx === this.shownIdx) return;
    this.shownIdx = idx;
    if (this.userScrollAt && Date.now() - this.userScrollAt < USER_SCROLL_MS) return;
    const line = this.renderRoot.querySelector(".line.active");
    const top = line ? line.getBoundingClientRect().top - this.getBoundingClientRect().top + this.scrollTop : 0;
    this.scrollTo({ top: line ? top - this.clientHeight * 0.32 : 0, behavior: "smooth" });
  }
  index(lines) {
    return lyricIndex(lines, this.position + this.offset);
  }
  async load() {
    const track = this.track;
    const key = this.trackKey;
    if (!track?.title) {
      this.lyrics = { status: "none" };
      return;
    }
    this.lyrics = { status: "loading" };
    let lyrics;
    try {
      const d3 = await fetchLyrics(this.url.replace(/\/$/, ""), track);
      if (!d3) lyrics = { status: "none" };
      else if (d3.syncedLyrics) lyrics = { status: "synced", lines: parseLrc(d3.syncedLyrics) };
      else if (d3.instrumental) lyrics = { status: "instrumental" };
      else lyrics = { status: "plain", text: d3.plainLyrics || "" };
    } catch (err) {
      console.warn("[ma-player-card] lyrics", err);
      lyrics = { status: "error" };
    }
    if (key !== this.trackKey) return;
    this.shownIdx = -1;
    this.lyrics = lyrics;
  }
  seek(t5) {
    this.userScrollAt = 0;
    haptic(this, "light");
    this.dispatchEvent(new CustomEvent("seek", { detail: t5 }));
  }
  render() {
    const { t: t5 } = this;
    const l4 = this.lyrics ?? { status: "loading" };
    switch (l4.status) {
      case "loading":
      case "instrumental":
      case "error":
        return b2`<div class="msg">${t5(`lyrics.${l4.status}`)}</div>`;
      case "none": {
        const q = `${this.track?.title || ""} ${firstArtist(this.track?.artist)}`.trim();
        return b2`<div class="msg">
          <div>
            ${t5("lyrics.none")}<br />
            <a class="link" href="https://lrclib.net/search/${encodeURIComponent(q)}" target="_blank" rel="noopener"
              >${t5("lyrics.search")}</a
            >
          </div>
        </div>`;
      }
      case "plain":
        return b2`<div class="plain">${l4.text}</div>
          <div class="note">${t5("lyrics.unsynced")}</div>`;
      case "synced": {
        const idx = this.index(l4.lines);
        return b2`<div class="pad"></div>
          ${l4.lines.map(
          (x2, i7) => b2`<p class="line ${i7 === idx ? "active" : i7 < idx ? "past" : ""}" @click=${() => this.seek(x2.t)}>
                ${x2.text || "♪"}
              </p>`
        )}
          <div class="note">${t5("lyrics.credit")}</div>
          <div class="pad"></div>`;
      }
    }
  }
  static styles = i`
    .msg {
      height: 100%;
      display: grid;
      place-items: center;
      text-align: center;
      padding: 0 24px;
      font-size: 17px;
      color: var(--np-dim);
    }
    .link {
      display: inline-block;
      margin-top: 14px;
      padding: 10px 18px;
      border-radius: 999px;
      background: var(--np-fill);
      color: #fff;
      text-decoration: none;
      font-size: 15px;
      font-weight: 600;
    }
    .pad {
      height: 32cqh;
    }
    .line {
      margin: 0;
      padding: 10px 0;
      font-size: clamp(24px, 4.4cqw, 42px);
      font-weight: 700;
      line-height: 1.25;
      color: rgba(255, 255, 255, 0.34);
      cursor: pointer;
      transform-origin: left center;
      filter: blur(0.5px);
      transition:
        color 0.35s,
        transform 0.35s,
        filter 0.35s;
      -webkit-tap-highlight-color: transparent;
    }
    .line.past {
      color: rgba(255, 255, 255, 0.28);
    }
    .line.active {
      color: #fff;
      filter: none;
      transform: scale(1.03);
    }
    .plain {
      padding: 24px 0 8px;
      font-size: 22px;
      font-weight: 600;
      line-height: 1.55;
      white-space: pre-wrap;
      color: rgba(255, 255, 255, 0.88);
    }
    .note {
      padding: 18px 0;
      font-size: 12px;
      color: var(--np-dim);
    }
  `;
};

// node_modules/lit-html/directives/repeat.js
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
var u4 = (e5, s5, t5) => {
  const r5 = /* @__PURE__ */ new Map();
  for (let l4 = s5; l4 <= t5; l4++) r5.set(e5[l4], l4);
  return r5;
};
var c4 = e4(class extends i5 {
  constructor(e5) {
    if (super(e5), e5.type !== t3.CHILD) throw Error("repeat() can only be used in text expressions");
  }
  dt(e5, s5, t5) {
    let r5;
    void 0 === t5 ? t5 = s5 : void 0 !== s5 && (r5 = s5);
    const l4 = [], o5 = [];
    let i7 = 0;
    for (const s6 of e5) l4[i7] = r5 ? r5(s6, i7) : i7, o5[i7] = t5(s6, i7), i7++;
    return { values: o5, keys: l4 };
  }
  render(e5, s5, t5) {
    return this.dt(e5, s5, t5).values;
  }
  update(s5, [t5, r5, c5]) {
    const d3 = M2(s5), { values: p4, keys: a3 } = this.dt(t5, r5, c5);
    if (!Array.isArray(d3)) return this.ut = a3, p4;
    const h4 = this.ut ??= [], v3 = [];
    let m3, y3, x2 = 0, j2 = d3.length - 1, k2 = 0, w2 = p4.length - 1;
    for (; x2 <= j2 && k2 <= w2; ) if (null === d3[x2]) x2++;
    else if (null === d3[j2]) j2--;
    else if (h4[x2] === a3[k2]) v3[k2] = u3(d3[x2], p4[k2]), x2++, k2++;
    else if (h4[j2] === a3[w2]) v3[w2] = u3(d3[j2], p4[w2]), j2--, w2--;
    else if (h4[x2] === a3[w2]) v3[w2] = u3(d3[x2], p4[w2]), v2(s5, v3[w2 + 1], d3[x2]), x2++, w2--;
    else if (h4[j2] === a3[k2]) v3[k2] = u3(d3[j2], p4[k2]), v2(s5, d3[x2], d3[j2]), j2--, k2++;
    else if (void 0 === m3 && (m3 = u4(a3, k2, w2), y3 = u4(h4, x2, j2)), m3.has(h4[x2])) if (m3.has(h4[j2])) {
      const e5 = y3.get(a3[k2]), t6 = void 0 !== e5 ? d3[e5] : null;
      if (null === t6) {
        const e6 = v2(s5, d3[x2]);
        u3(e6, p4[k2]), v3[k2] = e6;
      } else v3[k2] = u3(t6, p4[k2]), v2(s5, d3[x2], t6), d3[e5] = null;
      k2++;
    } else h3(d3[j2]), j2--;
    else h3(d3[x2]), x2++;
    for (; k2 <= w2; ) {
      const e5 = v2(s5, v3[w2 + 1]);
      u3(e5, p4[k2]), v3[k2++] = e5;
    }
    for (; x2 <= j2; ) {
      const e5 = d3[x2++];
      null !== e5 && h3(e5);
    }
    return this.ut = a3, p3(s5, v3), E;
  }
});

// src/cards/player-card/player-queue.ts
function dropIndex(mids, from, center) {
  let to = from;
  for (let k2 = from + 1; k2 < mids.length && center > mids[k2]; k2++) to = k2;
  for (let k2 = from - 1; k2 >= 0 && center < mids[k2]; k2--) to = k2;
  return to;
}
var MaPlayerQueue = class extends i4 {
  static properties = {
    backend: { attribute: false },
    entity: {},
    limit: { type: Number },
    language: {},
    queue: { state: true },
    status: { state: true },
    error: { state: true }
  };
  t = translator("en");
  drag = null;
  /** A change is being sent: a reload would bring back the old order. */
  busy = false;
  /** Swallows the click that follows a drag. */
  justDragged = false;
  constructor() {
    super();
    this.limit = 50;
    this.language = "en";
    this.queue = null;
    this.status = "idle";
    this.error = "";
  }
  async refresh(withItems = true) {
    const { backend, entity } = this;
    if (!backend || !entity || this.drag || this.busy) return;
    if (withItems && !this.queue) this.status = "loading";
    try {
      const info = await backend.queue.info(entity);
      const upcoming = withItems ? await backend.queue.items(entity, info, this.limit) : this.queue?.upcoming ?? [];
      if (entity !== this.entity || this.drag || this.busy) return;
      this.queue = { current: info.current, upcoming, total: info.total, idx: info.idx };
      this.status = "ok";
      this.dispatchEvent(new CustomEvent("queue-info", { detail: info }));
    } catch (err) {
      if (entity !== this.entity) return;
      const msg = errorMessage(err);
      this.queue = null;
      this.status = /no.?active.?queue/i.test(msg) ? "empty" : "error";
      this.error = msg;
    }
  }
  willUpdate(changed) {
    if (changed.has("language")) this.t = translator(this.language);
    if (changed.has("entity") && changed.get("entity") !== void 0) {
      this.queue = null;
      this.status = "idle";
    }
  }
  // Rendering mid-drag would undo the rows' transforms.
  shouldUpdate() {
    return !this.drag;
  }
  render() {
    const { t: t5, queue: q, status, backend } = this;
    if (status === "loading") return b2`<div class="msg">${t5("queue.loading")}</div>`;
    if (status === "error") return b2`<div class="msg">${t5("queue.error")}<br />${this.error}</div>`;
    if (status === "empty" || q && !q.current && !q.upcoming.length) return b2`<div class="msg">${t5("queue.empty")}</div>`;
    if (!q || !backend) return A;
    const left = Math.max(0, q.total - (q.idx + 1));
    const more = left - q.upcoming.length;
    const partial = backend.queue.partial;
    return b2`
      ${q.current ? b2`<div class="sec">${t5("queue.now_playing")}</div>${this.row(q.current, -1)}` : A}
      <div class="sec">${t5("queue.up_next")} <span>· ${t5("queue.songs", { n: left })}</span></div>
      <div class="list">
        ${q.upcoming.length ? c4(
      q.upcoming,
      (it) => it.id,
      (it, i7) => this.row(it, i7)
    ) : b2`<div class="note">${t5("queue.no_more")}</div>`}
      </div>
      ${more > 0 && !partial ? b2`<div class="note">${t5("queue.and_more", { n: more })}</div>` : A}
      ${partial ? b2`<div class="note">${t5("queue.partial")}</div>` : A}
      ${backend.can.reorder ? b2`<div class="note">${t5("queue.hint")}</div>` : A}
      <div class="pad"></div>
    `;
  }
  /** `i` is the index in `upcoming`, or -1 for the current song. */
  row(it, i7) {
    const can = this.backend?.can;
    const current = i7 < 0;
    const tappable = !current && !!can?.playItem;
    const sub = it.artist || it.album;
    return b2`
      <div class="row ${current ? "cur" : "up"} ${tappable ? "tap" : ""}" @click=${() => tappable && this.play(i7)}>
        <div class="art">
          ${it.image ? b2`<img src=${it.image} alt="" loading="lazy" draggable="false" />` : b2`<ha-icon icon="mdi:music"></ha-icon>`}
        </div>
        <div class="text">
          <div class="title">${it.name}</div>
          ${sub ? b2`<div class="sub">${sub}</div>` : A}
        </div>
        ${it.duration ? b2`<div class="dur">${fmtTime(it.duration)}</div>` : A}
        ${!current && can?.remove ? b2`<button class="btn del" aria-label=${this.t("queue.remove")} @click=${(e5) => this.onRemove(e5, i7)}>
                <ha-icon icon="mdi:minus-circle-outline"></ha-icon>
              </button>` : A}
        ${!current && can?.reorder ? b2`<div
                class="btn handle"
                aria-label=${this.t("queue.drag")}
                @click=${(e5) => e5.stopPropagation()}
                @pointerdown=${(e5) => this.startDrag(e5, i7)}
                @pointermove=${this.moveDrag}
                @pointerup=${this.endDrag}
                @pointercancel=${this.endDrag}
              >
                <ha-icon icon="mdi:drag-horizontal-variant"></ha-icon>
              </div>` : A}
      </div>
    `;
  }
  startDrag(e5, from) {
    if (e5.button > 0) return;
    const handle = e5.currentTarget;
    const row = handle.closest(".row");
    const rows = [...this.renderRoot.querySelectorAll(".row.up")];
    if (!row) return;
    e5.preventDefault();
    handle.setPointerCapture(e5.pointerId);
    const rects = rows.map((r5) => r5.getBoundingClientRect());
    this.drag = {
      row,
      rows,
      mids: rects.map((r5) => r5.top + r5.height / 2),
      from,
      to: from,
      startY: e5.clientY,
      startScroll: this.scrollTop,
      height: rects[from].height
    };
    row.classList.add("dragging");
    haptic(this, "selection");
  }
  moveDrag = (e5) => {
    const d3 = this.drag;
    if (!d3) return;
    const box = this.getBoundingClientRect();
    if (e5.clientY < box.top + 50) this.scrollTop -= 8;
    else if (e5.clientY > box.bottom - 50) this.scrollTop += 8;
    const dy = e5.clientY - d3.startY + (this.scrollTop - d3.startScroll);
    d3.row.style.transform = `translateY(${dy}px)`;
    const to = dropIndex(d3.mids, d3.from, d3.mids[d3.from] + dy);
    if (to !== d3.to) haptic(this, "selection");
    d3.to = to;
    d3.rows.forEach((r5, k2) => {
      if (k2 === d3.from) return;
      const shift = d3.from < k2 && k2 <= to ? -d3.height : to <= k2 && k2 < d3.from ? d3.height : 0;
      r5.style.transform = shift ? `translateY(${shift}px)` : "";
    });
  };
  endDrag = async () => {
    const d3 = this.drag;
    if (!d3) return;
    this.drag = null;
    this.justDragged = true;
    setTimeout(() => this.justDragged = false, 50);
    this.toggleAttribute("settling", true);
    for (const r5 of d3.rows) r5.style.transform = "";
    d3.row.classList.remove("dragging");
    if (d3.to !== d3.from) this.move(d3.from, d3.to);
    else this.requestUpdate();
    await this.updateComplete;
    requestAnimationFrame(() => this.toggleAttribute("settling", false));
  };
  onRemove(e5, i7) {
    e5.stopPropagation();
    const q = this.queue;
    if (!q) return;
    const item = q.upcoming[i7];
    haptic(this, "light");
    this.apply(
      this.t("queue.remove"),
      { ...q, upcoming: q.upcoming.filter((_2, k2) => k2 !== i7), total: q.total - 1 },
      (be, entity) => be.queue.remove(entity, item.id)
    );
  }
  move(from, to) {
    const q = this.queue;
    if (!q) return;
    const item = q.upcoming[from];
    const upcoming = [...q.upcoming];
    upcoming.splice(from, 1);
    upcoming.splice(to, 0, item);
    this.apply(this.t("queue.move"), { ...q, upcoming }, (be, entity) => be.queue.moveTo(entity, item.id, from, to));
  }
  async play(i7) {
    const { backend, entity, queue } = this;
    const item = queue?.upcoming[i7];
    if (this.justDragged || !backend || !entity || !item) return;
    haptic(this, "light");
    try {
      await backend.queue.play(entity, item.id);
      this.toast({ title: item.name, image: item.image, text: this.t("common.playing"), icon: "mdi:play-circle" });
    } catch (err) {
      this.toast({ title: item.name, image: item.image, text: errorMessage(err), icon: "mdi:alert-circle", error: true });
    }
  }
  async apply(label, next, run) {
    const { backend, entity } = this;
    if (!backend || !entity) return;
    const backup = this.queue;
    this.queue = next;
    this.busy = true;
    try {
      await run(backend, entity);
    } catch (err) {
      console.error(`[ma-player-card] ${label}`, err);
      this.queue = backup;
      this.toast({ title: label, text: errorMessage(err), icon: "mdi:alert-circle", error: true });
    }
    this.busy = false;
    this.refresh(true);
  }
  toast(spec) {
    this.dispatchEvent(new CustomEvent("toast", { detail: spec }));
  }
  static styles = i`
    .msg {
      height: 100%;
      display: grid;
      place-items: center;
      text-align: center;
      padding: 0 24px;
      font-size: 17px;
      color: var(--np-dim);
    }
    .sec {
      margin: 22px 0 6px;
      font-size: 16px;
      font-weight: 700;
    }
    .sec span {
      font-weight: 400;
      color: var(--np-dim);
    }
    .list {
      position: relative;
    }
    .row {
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 60px;
      border-bottom: 0.5px solid rgba(255, 255, 255, 0.12);
    }
    .row.cur {
      border: 0;
    }
    .row.up {
      position: relative;
      background: transparent;
      transition: transform 0.18s ease;
    }
    :host([settling]) .row.up {
      transition: none;
    }
    .row.tap {
      cursor: pointer;
    }
    .row.tap:active {
      background: rgba(255, 255, 255, 0.06);
    }
    .row.dragging {
      transition: none;
      z-index: 2;
      background: rgba(60, 60, 60, 0.85);
      border-radius: 10px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
    }
    .art {
      width: 46px;
      height: 46px;
      flex: 0 0 46px;
      border-radius: 6px;
      overflow: hidden;
      display: grid;
      place-items: center;
      background: var(--np-fill);
    }
    .art img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .art ha-icon {
      color: var(--np-dim);
    }
    .text {
      flex: 1;
      min-width: 0;
    }
    .title,
    .sub {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .title {
      font-size: 15px;
    }
    .sub,
    .dur {
      font-size: 13px;
      color: var(--np-dim);
    }
    .dur {
      font-variant-numeric: tabular-nums;
    }
    .note {
      padding: 14px 0;
      color: var(--np-dim);
      font-size: 14px;
    }
    .pad {
      height: 48px;
    }
    .btn {
      width: 44px;
      height: 44px;
      flex: 0 0 44px;
      display: grid;
      place-items: center;
      border: 0;
      padding: 0;
      background: none;
      color: var(--np-dim);
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }
    .del {
      color: #ff6b6b;
      width: 36px;
      flex-basis: 36px;
    }
    .handle {
      touch-action: none;
      cursor: grab;
    }
    .row.dragging .handle {
      cursor: grabbing;
      color: #fff;
    }
  `;
};

// src/utils/html.ts
var ENTITIES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
var esc = (s5) => String(s5 ?? "").replace(/[&<>"']/g, (c5) => ENTITIES[c5] ?? c5);

// src/components/action-sheet.ts
var STYLES = `
  :host { display: contents; }
  :host([dark]) { ${DARK_VARS} }
  dialog { border: 0; padding: 0; background: transparent; overflow: visible;
    width: min(400px, calc(100vw - 24px)); max-height: calc(100dvh - 32px); color: var(--primary-text-color); }
  dialog::backdrop { background: rgba(0, 0, 0, .3); -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); }
  dialog[open] { animation: menuIn .22s cubic-bezier(.2, .9, .3, 1.2); }
  @keyframes menuIn { from { transform: scale(.94); opacity: 0; } to { transform: none; opacity: 1; } }
  .sheet { display: block; width: 100%; border-radius: 16px; overflow: hidden;
    background: var(--glass); -webkit-backdrop-filter: var(--blur); backdrop-filter: var(--blur);
    box-shadow: 0 16px 48px rgba(0, 0, 0, .28); }
  .sheet:first-child { max-height: calc(100dvh - 120px); overflow-y: auto; }
  .head { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: .5px solid var(--sep); }
  .art { width: 56px; height: 56px; flex: 0 0 56px; border-radius: 8px; overflow: hidden;
    background: var(--fill); display: grid; place-items: center; }
  .art.round { border-radius: 50%; }
  .art img { width: 100%; height: 100%; object-fit: cover; }
  .meta { min-width: 0; }
  .title { font-weight: 600; font-size: 16px; }
  .sub { font-size: 13px; color: var(--secondary-text-color); }
  .opt { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px;
    height: 54px; padding: 0 18px; border: 0; cursor: pointer; font: inherit; font-size: 17px;
    background: transparent; color: var(--primary-text-color); text-align: left; }
  .opt + .opt, .more-list .opt { border-top: .5px solid var(--sep); }
  .opt ha-icon { color: var(--accent); }
  .opt:active { background: var(--fill); }
  .opt:focus, .cancel:focus { outline: none; }
  .opt:focus-visible { background: var(--fill); }
  .cancel { margin-top: 8px; height: 56px; border: 0; cursor: pointer; font: inherit; font-size: 17px;
    font-weight: 600; color: var(--accent); }
  .cancel:active { filter: brightness(.95); }
  .choice { justify-content: flex-start; height: auto; min-height: 60px; padding: 8px 18px; }
  .choice[disabled] { opacity: .45; cursor: default; }
  .choice .c-icon { color: var(--secondary-text-color); }
  .choice .c-icon.on { color: var(--accent); }
  .c-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .c-name { font-size: 17px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .c-sub { font-size: 13px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .choice.sel .c-name { font-weight: 600; }
  .more-toggle { color: var(--secondary-text-color); font-size: 15px; height: 48px; }
  .more-toggle ha-icon { color: var(--secondary-text-color); transition: transform .2s; }
  .more-toggle[aria-expanded="true"] ha-icon { transform: rotate(180deg); }
  .more-list { display: none; }
  .more-toggle[aria-expanded="true"] + .more-list { display: block; }

  @media (max-width: 600px) {
    dialog { margin: auto auto max(12px, env(safe-area-inset-bottom)); }
    dialog[open] { animation: sheetUp .28s cubic-bezier(.2, .9, .3, 1); }
    @keyframes sheetUp { from { transform: translateY(40px); opacity: 0; } to { transform: none; opacity: 1; } }
  }
`;
var headerHtml = (h4) => {
  const art = h4.image ? `<div class="art ${h4.round ? "round" : ""}"><img src="${esc(h4.image)}" alt="" /></div>` : h4.icon ? `<div class="art ${h4.round ? "round" : ""}"><ha-icon icon="${esc(h4.icon)}"></ha-icon></div>` : "";
  return `<div class="head">${art}<div class="meta"><div class="title">${esc(h4.title)}</div>${h4.subtitle ? `<div class="sub">${esc(h4.subtitle)}</div>` : ""}</div></div>`;
};
var actionHtml = (a3) => `<button class="opt" data-key="${esc(a3.key)}"><span>${esc(a3.label)}</span>${a3.icon ? `<ha-icon icon="${esc(a3.icon)}"></ha-icon>` : ""}</button>`;
var choiceHtml = (c5) => `<button class="opt choice ${c5.selected ? "sel" : ""}" data-key="${esc(c5.key)}" ${c5.disabled ? "disabled" : ""}>
    <ha-icon class="c-icon ${c5.active ? "on" : ""}" icon="${esc(c5.icon)}"></ha-icon>
    <span class="c-text"><span class="c-name">${esc(c5.label)}</span>${c5.sublabel ? `<span class="c-sub">${esc(c5.sublabel)}</span>` : ""}</span>
    ${c5.selected ? `<ha-icon class="c-check" icon="mdi:check"></ha-icon>` : ""}
  </button>`;
var MaActionSheet = class extends HTMLElement {
  dialog;
  overlay;
  result = null;
  resolve;
  constructor() {
    super();
    const root = this.attachShadow({ mode: "open" });
    root.innerHTML = `<style>${STYLES}</style><dialog></dialog>`;
    this.dialog = root.querySelector("dialog");
    this.overlay = new OverlayHistory(this.dialog, `sheet-${nextInstanceId()}`);
    this.dialog.addEventListener("close", () => this.settle());
    this.dialog.addEventListener("click", (e5) => {
      if (e5.target === this.dialog) return this.overlay.close();
      const btn = e5.target.closest("button");
      if (!btn || btn.disabled) return;
      if (btn.classList.contains("more-toggle")) {
        btn.setAttribute("aria-expanded", String(btn.getAttribute("aria-expanded") !== "true"));
        return;
      }
      this.result = btn.dataset.key ?? null;
      this.overlay.close();
    });
  }
  disconnectedCallback() {
    this.overlay.close();
  }
  get isOpen() {
    return this.overlay.isOpen;
  }
  show(spec) {
    this.settle();
    const { header, actions = [], choices = [], more, cancelLabel = "Cancel" } = spec;
    this.dialog.innerHTML = `
      <div class="sheet">
        ${header ? headerHtml(header) : ""}
        ${actions.map(actionHtml).join("")}
        ${choices.map(choiceHtml).join("")}
        ${more?.choices.length ? `<button class="opt more-toggle" aria-expanded="false"><span>${esc(more.label)}</span>
                 <ha-icon icon="mdi:chevron-down"></ha-icon></button>
               <div class="more-list">${more.choices.map(choiceHtml).join("")}</div>` : ""}
      </div>
      <button class="sheet cancel">${esc(cancelLabel)}</button>`;
    this.result = null;
    const p4 = new Promise((resolve) => {
      this.resolve = resolve;
    });
    if (!this.overlay.open()) this.dialog.scrollTop = 0;
    return p4;
  }
  close() {
    this.overlay.close();
  }
  settle() {
    const resolve = this.resolve;
    this.resolve = void 0;
    resolve?.(this.result);
    this.result = null;
  }
};

// src/components/slider.ts
var clamp01 = (n4) => Math.min(1, Math.max(0, n4 || 0));
var STEPS = { ArrowLeft: -0.05, ArrowDown: -0.05, ArrowRight: 0.05, ArrowUp: 0.05 };
var MaSlider = class extends i4 {
  static properties = {
    value: { type: Number },
    dragging: { type: Boolean, reflect: true }
  };
  constructor() {
    super();
    this.value = 0;
    this.dragging = false;
    this.addEventListener("pointerdown", this.onDown);
    this.addEventListener("pointermove", this.onMove);
    this.addEventListener("pointerup", this.onUp);
    this.addEventListener("pointercancel", this.onCancel);
    this.addEventListener("keydown", this.onKey);
  }
  connectedCallback() {
    super.connectedCallback();
    this.setAttribute("role", "slider");
    if (!this.hasAttribute("tabindex")) this.tabIndex = 0;
  }
  updated(changed) {
    if (changed.has("value")) this.setAttribute("aria-valuenow", String(Math.round(clamp01(this.value) * 100)));
  }
  render() {
    return b2`<div class="track"><div class="fill" style="width: ${clamp01(this.value) * 100}%"></div></div>`;
  }
  ratio(e5) {
    const r5 = this.getBoundingClientRect();
    return clamp01((e5.clientX - r5.left) / r5.width);
  }
  emit(name, ratio) {
    this.dispatchEvent(new CustomEvent(name, { detail: ratio }));
  }
  onDown = (e5) => {
    if (e5.button > 0) return;
    this.dragging = true;
    this.setPointerCapture(e5.pointerId);
    this.emit("slide", this.ratio(e5));
  };
  onMove = (e5) => {
    if (this.dragging) this.emit("slide", this.ratio(e5));
  };
  onUp = (e5) => {
    if (!this.dragging) return;
    this.dragging = false;
    this.emit("slide-end", this.ratio(e5));
  };
  onCancel = () => {
    this.dragging = false;
    this.emit("slide-end", null);
  };
  onKey = (e5) => {
    const step = STEPS[e5.key];
    if (step === void 0) return;
    e5.preventDefault();
    this.emit("slide-end", clamp01(this.value + step));
  };
  static styles = i`
    :host {
      position: relative;
      height: 30px;
      display: flex;
      align-items: center;
      cursor: pointer;
      touch-action: none;
      outline: none;
    }
    .track {
      position: relative;
      width: 100%;
      height: 6px;
      border-radius: 3px;
      overflow: hidden;
      background: rgba(255, 255, 255, 0.25);
      transition: height 0.15s;
    }
    .fill {
      position: absolute;
      inset: 0 auto 0 0;
      background: rgba(255, 255, 255, 0.8);
    }
    :host([dragging]) .track,
    :host(:focus-visible) .track {
      height: 12px;
      border-radius: 6px;
    }
    :host([dragging]) .fill {
      background: #fff;
    }
  `;
};

// src/components/toast.ts
var STYLES2 = `
  :host { display: contents; }
  :host([dark]) { ${DARK_VARS} }
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
`;
var MaToast = class extends HTMLElement {
  el;
  timer;
  constructor() {
    super();
    const root = this.attachShadow({ mode: "open" });
    root.innerHTML = `<style>${STYLES2}</style><div class="toast" popover="manual" role="status"></div>`;
    this.el = root.querySelector(".toast");
  }
  disconnectedCallback() {
    clearTimeout(this.timer);
  }
  show({ title, text, icon, image, error = false }) {
    const t5 = this.el;
    t5.className = `toast ${error ? "error" : ""}`;
    t5.innerHTML = `
      ${image ? `<img src="${esc(image)}" alt="" />` : `<ha-icon icon="${esc(icon)}"></ha-icon>`}
      <span class="t-text"><span class="t-title">${esc(title)}</span><span class="t-sub">${esc(text)}</span></span>
      ${image ? `<ha-icon class="t-icon" icon="${esc(icon)}"></ha-icon>` : ""}`;
    clearTimeout(this.timer);
    try {
      if (t5.showPopover) {
        if (t5.matches(":popover-open")) t5.hidePopover();
        t5.showPopover();
      } else t5.classList.add("show");
    } catch (_2) {
      t5.classList.add("show");
    }
    this.timer = setTimeout(() => this.hide(), error ? 4500 : 2600);
  }
  hide() {
    const t5 = this.el;
    try {
      if (t5.hidePopover && t5.matches(":popover-open")) t5.hidePopover();
    } catch (_2) {
    }
    t5.classList.remove("show");
  }
};

// src/main.ts
var defineOnce = (name, cls) => {
  if (!customElements.get(name)) customElements.define(name, cls);
};
defineOnce("ma-player-toast", MaToast);
defineOnce("ma-player-action-sheet", MaActionSheet);
defineOnce("ma-slider", MaSlider);
defineOnce("ma-player-queue", MaPlayerQueue);
defineOnce("ma-player-lyrics", MaPlayerLyrics);
defineOnce("ma-browser-card", MaBrowserCard);
defineOnce("ma-player-card", MaPlayerCard);
window.customCards = window.customCards || [];
var customCards = window.customCards;
for (const card of [
  {
    type: "ma-player-card",
    name: "Music Assistant – Player",
    description: "What's playing, controls, queue, synced lyrics and a music browser."
  },
  {
    type: "ma-browser-card",
    name: "Music Assistant – Browser",
    description: "Search songs, artists, albums, playlists and radio, and play them on a speaker."
  }
]) {
  if (!customCards.some((c5) => c5.type === card.type)) {
    customCards.push({
      ...card,
      preview: true,
      documentationURL: "https://www.home-assistant.io/integrations/music_assistant/"
    });
  }
}
console.info(`%c MA-PLAYER-CARD %c v${VERSION} `, "background:#fa2d48;color:#fff;border-radius:4px 0 0 4px", "");
