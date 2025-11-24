var Rs = Object.defineProperty;
var xs = (l, e, t) => e in l ? Rs(l, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : l[e] = t;
var x = (l, e, t) => xs(l, typeof e != "symbol" ? e + "" : e, t);
import { inject as Ts, ref as F, watch as He, nextTick as zt, onBeforeUnmount as zi, computed as Y, defineComponent as ks, onMounted as Ms, createElementBlock as T, openBlock as k, createElementVNode as p, createCommentVNode as Q, toDisplayString as y, unref as R, createVNode as mt, createTextVNode as ee, normalizeClass as pe, withModifiers as Dt, Transition as gt, withCtx as bt, withDirectives as Xe, vShow as vt, Fragment as xe, renderList as Te, vModelText as Si } from "vue";
import { useQueryClient as bi, useQuery as vi } from "@tanstack/vue-query";
import { useSupabase as Tt, generatePositionMappingKey as _t, usePositionTradeMappingsQuery as Ls, usePositionPositionMappingsQuery as Ss, fetchPositionsBySymbolRoot as Pi, savePositionTradeMappings as Ds, savePositionPositionMappings as _s } from "@y2kfund/core";
const Fs = Symbol.for("y2kfund.supabase");
function wi() {
  const l = Ts(Fs, null);
  if (!l) throw new Error("[@y2kfund/core] Supabase client not found. Did you install createCore()?");
  return l;
}
async function Ci(l, e) {
  if (!e)
    return console.log("⚠️ No userId provided, showing all positions"), [];
  try {
    console.log("👤 Fetching accessible accounts for user:", e);
    const { data: t, error: i } = await l.schema("hf").from("user_account_access").select("internal_account_id").eq("user_id", e).eq("is_active", !0);
    if (i)
      return console.error("❌ Error fetching user account access:", i), [];
    if (!t || t.length === 0)
      return console.log("⚠️ No account access found for user, showing all positions"), [];
    const s = t.map((n) => n.internal_account_id);
    return console.log("✅ User has access to accounts:", s), s;
  } catch (t) {
    return console.error("❌ Exception fetching account access:", t), [];
  }
}
const zs = {
  details: (l, e) => ["currentPosition", l, e]
};
function Ps(l, e) {
  const t = wi(), i = bi(), s = zs.details(l, e), n = vi({
    queryKey: s,
    queryFn: async () => {
      const r = e == null ? void 0 : e.trim();
      if (!r)
        return console.log("⚠️ No symbol provided, returning empty array"), [];
      console.log("🔍 [CurrentPosition] Querying with:", {
        userId: l || "none (all accounts)",
        symbolName: r
      });
      const a = await Ci(t, l);
      l && a.length === 0 ? console.log("⚠️ User has no account access restrictions - showing all accounts") : a.length > 0 && console.log("🔒 User has access to accounts:", a);
      const { data: h, error: d } = await t.schema("hf").from("positions").select("fetched_at").order("fetched_at", { ascending: !1 }).limit(1).single();
      if (d)
        throw console.error("❌ Error fetching latest fetched_at:", d), d;
      if (!h || !h.fetched_at)
        return console.log("⚠️ No positions found in database"), [];
      const u = h.fetched_at;
      console.log("📅 Latest fetched_at:", u);
      let c = t.schema("hf").from("positions").select("*").eq("fetched_at", u).eq("asset_class", "STK").eq("symbol", `${r}`).order("symbol", { ascending: !0 });
      a.length > 0 && (c = c.in("internal_account_id", a));
      const { data: g, error: m } = await c;
      if (m)
        throw console.error("❌ Error fetching positions:", m), m;
      if (!g || g.length === 0)
        return console.log("📊 No positions found matching criteria"), [];
      console.log(`✅ Found ${g.length} position(s) matching symbol "${r}"`);
      const E = Array.from(
        new Set(g.map((D) => D.internal_account_id))
      ), [w, v] = await Promise.all([
        t.schema("hf").from("user_accounts_master").select("internal_account_id, legal_entity").in("internal_account_id", E),
        l ? t.schema("hf").from("user_account_alias").select("internal_account_id, alias").eq("user_id", l).in("internal_account_id", E) : { data: [], error: null }
      ]);
      w.error && console.warn("⚠️ Error fetching account names:", w.error), v.error && console.warn("⚠️ Error fetching account aliases:", v.error);
      const M = new Map(
        (w.data || []).map((D) => [D.internal_account_id, D.legal_entity])
      ), z = new Map(
        (v.data || []).map((D) => [D.internal_account_id, D.alias])
      ), P = g.map((D) => {
        let V = M.get(D.internal_account_id);
        return z.has(D.internal_account_id) && (V = z.get(D.internal_account_id)), {
          ...D,
          legal_entity: V
        };
      });
      return console.log("✅ Successfully enriched positions with account info"), P;
    },
    enabled: !!e && e.trim().length > 0,
    // Only run if symbol provided
    staleTime: 6e4,
    // 1 minute cache
    retry: 2
    // Retry failed queries up to 2 times
  }), o = t.channel(`instrument-details:${e}`).on(
    "postgres_changes",
    {
      schema: "hf",
      table: "positions",
      event: "*"
    },
    () => {
      console.log("🔄 Positions table changed, invalidating instrument details query"), i.invalidateQueries({ queryKey: s });
    }
  ).subscribe();
  return {
    ...n,
    _cleanup: () => {
      var r;
      console.log("🧹 Cleaning up instrument details subscription"), (r = o == null ? void 0 : o.unsubscribe) == null || r.call(o);
    }
  };
}
async function Hs(l, e, t) {
  var i;
  const s = await Ci(l, t);
  console.log("🔍 Querying put positions with:", {
    symbolRoot: e,
    userId: t || "none",
    accessibleAccountIds: s.length > 0 ? s : "all"
  });
  const { data: n, error: o } = await l.schema("hf").from("positions").select("fetched_at").order("fetched_at", { ascending: !1 }).limit(1).single();
  if (o)
    throw console.error("❌ Error fetching latest fetched_at:", o), o;
  const r = n.fetched_at;
  console.log("📅 Latest fetched_at:", r);
  let a = l.schema("hf").from("positions").select("*").eq("fetched_at", r).ilike("symbol", `%${e}% P %`);
  s.length > 0 && (a = a.in("internal_account_id", s));
  const { data: h, error: d } = await a;
  if (d)
    throw console.error("❌ Error fetching put positions:", d), d;
  const [u, c] = await Promise.all([
    l.schema("hf").from("user_accounts_master").select("internal_account_id, legal_entity"),
    t ? l.schema("hf").from("user_account_alias").select("internal_account_id, alias").eq("user_id", t) : { data: [], error: null }
  ]);
  if (u.error)
    throw console.error("❌ Accounts query error:", u.error), u.error;
  console.log("✅ Put positions query success:", {
    positionsCount: (h == null ? void 0 : h.length) || 0,
    accountsCount: (i = u.data) == null ? void 0 : i.length,
    filtered: s.length > 0
  });
  const g = new Map(
    (c.data || []).map((w) => [w.internal_account_id, w.alias])
  ), m = new Map(
    (u.data || []).map((w) => [w.internal_account_id, w.legal_entity])
  ), E = (h || []).map((w) => {
    let v = m.get(w.internal_account_id) || void 0;
    return g.has(w.internal_account_id) && (v = g.get(w.internal_account_id)), {
      ...w,
      legal_entity: v
    };
  });
  return console.log("✅ Enriched put positions with accounts", E.length), E;
}
function As(l, e) {
  const t = wi(), i = bi(), s = ["putPositions", l, e], n = vi({
    queryKey: s,
    queryFn: async () => l ? await Hs(t, l, e) : [],
    enabled: !!l,
    staleTime: 6e4
    // 1 minute
  }), o = t.channel(`put-positions:${l}:${e}`).on(
    "postgres_changes",
    {
      event: "*",
      schema: "hf",
      table: "positions",
      filter: `symbol=ilike.%${l}%P%`
    },
    () => {
      console.log("🔄 Put positions changed, invalidating query..."), i.invalidateQueries({ queryKey: s });
    }
  ).subscribe();
  return { ...n, _cleanup: () => {
    o.unsubscribe();
  } };
}
async function Os(l, e, t) {
  var i;
  const s = await Ci(l, t);
  console.log("🔍 Querying call positions with:", {
    symbolRoot: e,
    userId: t || "none",
    accessibleAccountIds: s.length > 0 ? s : "all"
  });
  const { data: n, error: o } = await l.schema("hf").from("positions").select("fetched_at").order("fetched_at", { ascending: !1 }).limit(1).single();
  if (o)
    throw console.error("❌ Error fetching latest fetched_at:", o), o;
  const r = n.fetched_at;
  console.log("📅 Latest fetched_at:", r);
  let a = l.schema("hf").from("positions").select("*").eq("fetched_at", r).ilike("symbol", `%${e}% C %`);
  s.length > 0 && (a = a.in("internal_account_id", s));
  const { data: h, error: d } = await a;
  if (d)
    throw console.error("❌ Error fetching call positions:", d), d;
  const [u, c] = await Promise.all([
    l.schema("hf").from("user_accounts_master").select("internal_account_id, legal_entity"),
    t ? l.schema("hf").from("user_account_alias").select("internal_account_id, alias").eq("user_id", t) : { data: [], error: null }
  ]);
  if (u.error)
    throw console.error("❌ Accounts query error:", u.error), u.error;
  console.log("✅ Call positions query success:", {
    positionsCount: (h == null ? void 0 : h.length) || 0,
    accountsCount: (i = u.data) == null ? void 0 : i.length,
    filtered: s.length > 0
  });
  const g = new Map(
    (c.data || []).map((w) => [w.internal_account_id, w.alias])
  ), m = new Map(
    (u.data || []).map((w) => [w.internal_account_id, w.legal_entity])
  ), E = (h || []).map((w) => {
    let v = m.get(w.internal_account_id) || void 0;
    return g.has(w.internal_account_id) && (v = g.get(w.internal_account_id)), {
      ...w,
      legal_entity: v
    };
  });
  return console.log("✅ Enriched call positions with accounts", E.length), E;
}
function Bs(l, e) {
  const t = wi(), i = bi(), s = ["callPositions", l, e], n = vi({
    queryKey: s,
    queryFn: async () => l ? await Os(t, l, e) : [],
    enabled: !!l,
    staleTime: 6e4
    // 1 minute
  }), o = t.channel(`call-positions:${l}:${e}`).on(
    "postgres_changes",
    {
      event: "*",
      schema: "hf",
      table: "positions",
      filter: `symbol=ilike.%${l}%P%`
    },
    () => {
      console.log("🔄 Call positions changed, invalidating query..."), i.invalidateQueries({ queryKey: s });
    }
  ).subscribe();
  return { ...n, _cleanup: () => {
    o.unsubscribe();
  } };
}
class ne {
  constructor(e) {
    this.table = e;
  }
  //////////////////////////////////////////
  /////////////// DataLoad /////////////////
  //////////////////////////////////////////
  reloadData(e, t, i) {
    return this.table.dataLoader.load(e, void 0, void 0, void 0, t, i);
  }
  //////////////////////////////////////////
  ///////////// Localization ///////////////
  //////////////////////////////////////////
  langText() {
    return this.table.modules.localize.getText(...arguments);
  }
  langBind() {
    return this.table.modules.localize.bind(...arguments);
  }
  langLocale() {
    return this.table.modules.localize.getLocale(...arguments);
  }
  //////////////////////////////////////////
  ////////// Inter Table Comms /////////////
  //////////////////////////////////////////
  commsConnections() {
    return this.table.modules.comms.getConnections(...arguments);
  }
  commsSend() {
    return this.table.modules.comms.send(...arguments);
  }
  //////////////////////////////////////////
  //////////////// Layout  /////////////////
  //////////////////////////////////////////
  layoutMode() {
    return this.table.modules.layout.getMode();
  }
  layoutRefresh(e) {
    return this.table.modules.layout.layout(e);
  }
  //////////////////////////////////////////
  /////////////// Event Bus ////////////////
  //////////////////////////////////////////
  subscribe() {
    return this.table.eventBus.subscribe(...arguments);
  }
  unsubscribe() {
    return this.table.eventBus.unsubscribe(...arguments);
  }
  subscribed(e) {
    return this.table.eventBus.subscribed(e);
  }
  subscriptionChange() {
    return this.table.eventBus.subscriptionChange(...arguments);
  }
  dispatch() {
    return this.table.eventBus.dispatch(...arguments);
  }
  chain() {
    return this.table.eventBus.chain(...arguments);
  }
  confirm() {
    return this.table.eventBus.confirm(...arguments);
  }
  dispatchExternal() {
    return this.table.externalEvents.dispatch(...arguments);
  }
  subscribedExternal(e) {
    return this.table.externalEvents.subscribed(e);
  }
  subscriptionChangeExternal() {
    return this.table.externalEvents.subscriptionChange(...arguments);
  }
  //////////////////////////////////////////
  //////////////// Options /////////////////
  //////////////////////////////////////////
  options(e) {
    return this.table.options[e];
  }
  setOption(e, t) {
    return typeof t < "u" && (this.table.options[e] = t), this.table.options[e];
  }
  //////////////////////////////////////////
  /////////// Deprecation Checks ///////////
  //////////////////////////////////////////
  deprecationCheck(e, t, i) {
    return this.table.deprecationAdvisor.check(e, t, i);
  }
  deprecationCheckMsg(e, t) {
    return this.table.deprecationAdvisor.checkMsg(e, t);
  }
  deprecationMsg(e) {
    return this.table.deprecationAdvisor.msg(e);
  }
  //////////////////////////////////////////
  //////////////// Modules /////////////////
  //////////////////////////////////////////
  module(e) {
    return this.table.module(e);
  }
}
class U {
  static elVisible(e) {
    return !(e.offsetWidth <= 0 && e.offsetHeight <= 0);
  }
  static elOffset(e) {
    var t = e.getBoundingClientRect();
    return {
      top: t.top + window.pageYOffset - document.documentElement.clientTop,
      left: t.left + window.pageXOffset - document.documentElement.clientLeft
    };
  }
  static retrieveNestedData(e, t, i) {
    var s = e ? t.split(e) : [t], n = s.length, o;
    for (let r = 0; r < n && (i = i[s[r]], o = i, !!i); r++)
      ;
    return o;
  }
  static deepClone(e, t, i = []) {
    var s = {}.__proto__, n = [].__proto__;
    t || (t = Object.assign(Array.isArray(e) ? [] : {}, e));
    for (var o in e) {
      let r = e[o], a, h;
      r != null && typeof r == "object" && (r.__proto__ === s || r.__proto__ === n) && (a = i.findIndex((d) => d.subject === r), a > -1 ? t[o] = i[a].copy : (h = Object.assign(Array.isArray(r) ? [] : {}, r), i.unshift({ subject: r, copy: h }), t[o] = this.deepClone(r, h, i)));
    }
    return t;
  }
}
let Ns = class Hi extends ne {
  constructor(e, t, i) {
    super(e), this.element = t, this.container = this._lookupContainer(), this.parent = i, this.reversedX = !1, this.childPopup = null, this.blurable = !1, this.blurCallback = null, this.blurEventsBound = !1, this.renderedCallback = null, this.visible = !1, this.hideable = !0, this.element.classList.add("tabulator-popup-container"), this.blurEvent = this.hide.bind(this, !1), this.escEvent = this._escapeCheck.bind(this), this.destroyBinding = this.tableDestroyed.bind(this), this.destroyed = !1;
  }
  tableDestroyed() {
    this.destroyed = !0, this.hide(!0);
  }
  _lookupContainer() {
    var e = this.table.options.popupContainer;
    return typeof e == "string" ? (e = document.querySelector(e), e || console.warn("Menu Error - no container element found matching selector:", this.table.options.popupContainer, "(defaulting to document body)")) : e === !0 && (e = this.table.element), e && !this._checkContainerIsParent(e) && (e = !1, console.warn("Menu Error - container element does not contain this table:", this.table.options.popupContainer, "(defaulting to document body)")), e || (e = document.body), e;
  }
  _checkContainerIsParent(e, t = this.table.element) {
    return e === t ? !0 : t.parentNode ? this._checkContainerIsParent(e, t.parentNode) : !1;
  }
  renderCallback(e) {
    this.renderedCallback = e;
  }
  containerEventCoords(e) {
    var t = !(e instanceof MouseEvent), i = t ? e.touches[0].pageX : e.pageX, s = t ? e.touches[0].pageY : e.pageY;
    if (this.container !== document.body) {
      let n = U.elOffset(this.container);
      i -= n.left, s -= n.top;
    }
    return { x: i, y: s };
  }
  elementPositionCoords(e, t = "right") {
    var i = U.elOffset(e), s, n, o;
    switch (this.container !== document.body && (s = U.elOffset(this.container), i.left -= s.left, i.top -= s.top), t) {
      case "right":
        n = i.left + e.offsetWidth, o = i.top - 1;
        break;
      case "bottom":
        n = i.left, o = i.top + e.offsetHeight;
        break;
      case "left":
        n = i.left, o = i.top - 1;
        break;
      case "top":
        n = i.left, o = i.top;
        break;
      case "center":
        n = i.left + e.offsetWidth / 2, o = i.top + e.offsetHeight / 2;
        break;
    }
    return { x: n, y: o, offset: i };
  }
  show(e, t) {
    var i, s, n, o, r;
    return this.destroyed || this.table.destroyed ? this : (e instanceof HTMLElement ? (n = e, r = this.elementPositionCoords(e, t), o = r.offset, i = r.x, s = r.y) : typeof e == "number" ? (o = { top: 0, left: 0 }, i = e, s = t) : (r = this.containerEventCoords(e), i = r.x, s = r.y, this.reversedX = !1), this.element.style.top = s + "px", this.element.style.left = i + "px", this.container.appendChild(this.element), typeof this.renderedCallback == "function" && this.renderedCallback(), this._fitToScreen(i, s, n, o, t), this.visible = !0, this.subscribe("table-destroy", this.destroyBinding), this.element.addEventListener("mousedown", (a) => {
      a.stopPropagation();
    }), this);
  }
  _fitToScreen(e, t, i, s, n) {
    var o = this.container === document.body ? document.documentElement.scrollTop : this.container.scrollTop;
    (e + this.element.offsetWidth >= this.container.offsetWidth || this.reversedX) && (this.element.style.left = "", i ? this.element.style.right = this.container.offsetWidth - s.left + "px" : this.element.style.right = this.container.offsetWidth - e + "px", this.reversedX = !0);
    let r = Math.max(this.container.offsetHeight, o ? this.container.scrollHeight : 0);
    if (t + this.element.offsetHeight > r)
      if (i)
        switch (n) {
          case "bottom":
            this.element.style.top = parseInt(this.element.style.top) - this.element.offsetHeight - i.offsetHeight - 1 + "px";
            break;
          default:
            this.element.style.top = parseInt(this.element.style.top) - this.element.offsetHeight + i.offsetHeight + 1 + "px";
        }
      else
        this.element.style.height = r + "px";
  }
  isVisible() {
    return this.visible;
  }
  hideOnBlur(e) {
    return this.blurable = !0, this.visible && (setTimeout(() => {
      this.visible && (this.table.rowManager.element.addEventListener("scroll", this.blurEvent), this.subscribe("cell-editing", this.blurEvent), document.body.addEventListener("click", this.blurEvent), document.body.addEventListener("contextmenu", this.blurEvent), document.body.addEventListener("mousedown", this.blurEvent), window.addEventListener("resize", this.blurEvent), document.body.addEventListener("keydown", this.escEvent), this.blurEventsBound = !0);
    }, 100), this.blurCallback = e), this;
  }
  _escapeCheck(e) {
    e.keyCode == 27 && this.hide();
  }
  blockHide() {
    this.hideable = !1;
  }
  restoreHide() {
    this.hideable = !0;
  }
  hide(e = !1) {
    return this.visible && this.hideable && (this.blurable && this.blurEventsBound && (document.body.removeEventListener("keydown", this.escEvent), document.body.removeEventListener("click", this.blurEvent), document.body.removeEventListener("contextmenu", this.blurEvent), document.body.removeEventListener("mousedown", this.blurEvent), window.removeEventListener("resize", this.blurEvent), this.table.rowManager.element.removeEventListener("scroll", this.blurEvent), this.unsubscribe("cell-editing", this.blurEvent), this.blurEventsBound = !1), this.childPopup && this.childPopup.hide(), this.parent && (this.parent.childPopup = null), this.element.parentNode && this.element.parentNode.removeChild(this.element), this.visible = !1, this.blurCallback && !e && this.blurCallback(), this.unsubscribe("table-destroy", this.destroyBinding)), this;
  }
  child(e) {
    return this.childPopup && this.childPopup.hide(), this.childPopup = new Hi(this.table, e, this), this.childPopup;
  }
};
class O extends ne {
  constructor(e, t) {
    super(e), this._handler = null;
  }
  initialize() {
  }
  ///////////////////////////////////
  ////// Options Registration ///////
  ///////////////////////////////////
  registerTableOption(e, t) {
    this.table.optionsList.register(e, t);
  }
  registerColumnOption(e, t) {
    this.table.columnManager.optionsList.register(e, t);
  }
  ///////////////////////////////////
  /// Public Function Registration ///
  ///////////////////////////////////
  registerTableFunction(e, t) {
    typeof this.table[e] > "u" ? this.table[e] = (...i) => (this.table.initGuard(e), t(...i)) : console.warn("Unable to bind table function, name already in use", e);
  }
  registerComponentFunction(e, t, i) {
    return this.table.componentFunctionBinder.bind(e, t, i);
  }
  ///////////////////////////////////
  ////////// Data Pipeline //////////
  ///////////////////////////////////
  registerDataHandler(e, t) {
    this.table.rowManager.registerDataPipelineHandler(e, t), this._handler = e;
  }
  registerDisplayHandler(e, t) {
    this.table.rowManager.registerDisplayPipelineHandler(e, t), this._handler = e;
  }
  displayRows(e) {
    var t = this.table.rowManager.displayRows.length - 1, i;
    if (this._handler && (i = this.table.rowManager.displayPipeline.findIndex((s) => s.handler === this._handler), i > -1 && (t = i)), e && (t = t + e), this._handler)
      return t > -1 ? this.table.rowManager.getDisplayRows(t) : this.activeRows();
  }
  activeRows() {
    return this.table.rowManager.activeRows;
  }
  refreshData(e, t) {
    t || (t = this._handler), t && this.table.rowManager.refreshActiveData(t, !1, e);
  }
  ///////////////////////////////////
  //////// Footer Management ////////
  ///////////////////////////////////
  footerAppend(e) {
    return this.table.footerManager.append(e);
  }
  footerPrepend(e) {
    return this.table.footerManager.prepend(e);
  }
  footerRemove(e) {
    return this.table.footerManager.remove(e);
  }
  ///////////////////////////////////
  //////// Popups Management ////////
  ///////////////////////////////////
  popup(e, t) {
    return new Ns(this.table, e, t);
  }
  ///////////////////////////////////
  //////// Alert Management ////////
  ///////////////////////////////////
  alert(e, t) {
    return this.table.alertManager.alert(e, t);
  }
  clearAlert() {
    return this.table.alertManager.clear();
  }
}
var Vs = {
  rownum: function(l, e, t, i, s, n) {
    return n.getPosition();
  }
};
const ot = class ot extends O {
  constructor(e) {
    super(e), this.allowedTypes = ["", "data", "download", "clipboard", "print", "htmlOutput"], this.registerColumnOption("accessor"), this.registerColumnOption("accessorParams"), this.registerColumnOption("accessorData"), this.registerColumnOption("accessorDataParams"), this.registerColumnOption("accessorDownload"), this.registerColumnOption("accessorDownloadParams"), this.registerColumnOption("accessorClipboard"), this.registerColumnOption("accessorClipboardParams"), this.registerColumnOption("accessorPrint"), this.registerColumnOption("accessorPrintParams"), this.registerColumnOption("accessorHtmlOutput"), this.registerColumnOption("accessorHtmlOutputParams");
  }
  initialize() {
    this.subscribe("column-layout", this.initializeColumn.bind(this)), this.subscribe("row-data-retrieve", this.transformRow.bind(this));
  }
  //initialize column accessor
  initializeColumn(e) {
    var t = !1, i = {};
    this.allowedTypes.forEach((s) => {
      var n = "accessor" + (s.charAt(0).toUpperCase() + s.slice(1)), o;
      e.definition[n] && (o = this.lookupAccessor(e.definition[n]), o && (t = !0, i[n] = {
        accessor: o,
        params: e.definition[n + "Params"] || {}
      }));
    }), t && (e.modules.accessor = i);
  }
  lookupAccessor(e) {
    var t = !1;
    switch (typeof e) {
      case "string":
        ot.accessors[e] ? t = ot.accessors[e] : console.warn("Accessor Error - No such accessor found, ignoring: ", e);
        break;
      case "function":
        t = e;
        break;
    }
    return t;
  }
  //apply accessor to row
  transformRow(e, t) {
    var i = "accessor" + (t.charAt(0).toUpperCase() + t.slice(1)), s = e.getComponent(), n = U.deepClone(e.data || {});
    return this.table.columnManager.traverse(function(o) {
      var r, a, h, d;
      o.modules.accessor && (a = o.modules.accessor[i] || o.modules.accessor.accessor || !1, a && (r = o.getFieldValue(n), r != "undefined" && (d = o.getComponent(), h = typeof a.params == "function" ? a.params(r, n, t, d, s) : a.params, o.setFieldValue(n, a.accessor(r, n, t, h, d, s)))));
    }), n;
  }
};
x(ot, "moduleName", "accessor"), //load defaults
x(ot, "accessors", Vs);
let Gt = ot;
var Is = {
  method: "GET"
};
function $t(l, e) {
  var t = [];
  if (e = e || "", Array.isArray(l))
    l.forEach((s, n) => {
      t = t.concat($t(s, e ? e + "[" + n + "]" : n));
    });
  else if (typeof l == "object")
    for (var i in l)
      t = t.concat($t(l[i], e ? e + "[" + i + "]" : i));
  else
    t.push({ key: e, value: l });
  return t;
}
function Ws(l) {
  var e = $t(l), t = [];
  return e.forEach(function(i) {
    t.push(encodeURIComponent(i.key) + "=" + encodeURIComponent(i.value));
  }), t.join("&");
}
function Ai(l, e, t) {
  return l && t && Object.keys(t).length && (!e.method || e.method.toLowerCase() == "get") && (e.method = "get", l += (l.includes("?") ? "&" : "?") + Ws(t)), l;
}
function Gs(l, e, t) {
  var i;
  return new Promise((s, n) => {
    if (l = this.urlGenerator.call(this.table, l, e, t), e.method.toUpperCase() != "GET")
      if (i = typeof this.table.options.ajaxContentType == "object" ? this.table.options.ajaxContentType : this.contentTypeFormatters[this.table.options.ajaxContentType], i) {
        for (var o in i.headers)
          e.headers || (e.headers = {}), typeof e.headers[o] > "u" && (e.headers[o] = i.headers[o]);
        e.body = i.body.call(this, l, e, t);
      } else
        console.warn("Ajax Error - Invalid ajaxContentType value:", this.table.options.ajaxContentType);
    l ? (typeof e.headers > "u" && (e.headers = {}), typeof e.headers.Accept > "u" && (e.headers.Accept = "application/json"), typeof e.headers["X-Requested-With"] > "u" && (e.headers["X-Requested-With"] = "XMLHttpRequest"), typeof e.mode > "u" && (e.mode = "cors"), e.mode == "cors" ? (typeof e.headers.Origin > "u" && (e.headers.Origin = window.location.origin), typeof e.credentials > "u" && (e.credentials = "same-origin")) : typeof e.credentials > "u" && (e.credentials = "include"), fetch(l, e).then((r) => {
      r.ok ? r.json().then((a) => {
        s(a);
      }).catch((a) => {
        n(a), console.warn("Ajax Load Error - Invalid JSON returned", a);
      }) : (console.error("Ajax Load Error - Connection Error: " + r.status, r.statusText), n(r));
    }).catch((r) => {
      console.error("Ajax Load Error - Connection Error: ", r), n(r);
    })) : (console.warn("Ajax Load Error - No URL Set"), s([]));
  });
}
function jt(l, e) {
  var t = [];
  if (e = e || "", Array.isArray(l))
    l.forEach((s, n) => {
      t = t.concat(jt(s, e ? e + "[" + n + "]" : n));
    });
  else if (typeof l == "object")
    for (var i in l)
      t = t.concat(jt(l[i], e ? e + "[" + i + "]" : i));
  else
    t.push({ key: e, value: l });
  return t;
}
var $s = {
  json: {
    headers: {
      "Content-Type": "application/json"
    },
    body: function(l, e, t) {
      return JSON.stringify(t);
    }
  },
  form: {
    headers: {},
    body: function(l, e, t) {
      var i = jt(t), s = new FormData();
      return i.forEach(function(n) {
        s.append(n.key, n.value);
      }), s;
    }
  }
};
const Ce = class Ce extends O {
  constructor(e) {
    super(e), this.config = {}, this.url = "", this.urlGenerator = !1, this.params = !1, this.loaderPromise = !1, this.registerTableOption("ajaxURL", !1), this.registerTableOption("ajaxURLGenerator", !1), this.registerTableOption("ajaxParams", {}), this.registerTableOption("ajaxConfig", "get"), this.registerTableOption("ajaxContentType", "form"), this.registerTableOption("ajaxRequestFunc", !1), this.registerTableOption("ajaxRequesting", function() {
    }), this.registerTableOption("ajaxResponse", !1), this.contentTypeFormatters = Ce.contentTypeFormatters;
  }
  //initialize setup options
  initialize() {
    this.loaderPromise = this.table.options.ajaxRequestFunc || Ce.defaultLoaderPromise, this.urlGenerator = this.table.options.ajaxURLGenerator || Ce.defaultURLGenerator, this.table.options.ajaxURL && this.setUrl(this.table.options.ajaxURL), this.setDefaultConfig(this.table.options.ajaxConfig), this.registerTableFunction("getAjaxUrl", this.getUrl.bind(this)), this.subscribe("data-loading", this.requestDataCheck.bind(this)), this.subscribe("data-params", this.requestParams.bind(this)), this.subscribe("data-load", this.requestData.bind(this));
  }
  requestParams(e, t, i, s) {
    var n = this.table.options.ajaxParams;
    return n && (typeof n == "function" && (n = n.call(this.table)), s = Object.assign(Object.assign({}, n), s)), s;
  }
  requestDataCheck(e, t, i, s) {
    return !!(!e && this.url || typeof e == "string");
  }
  requestData(e, t, i, s, n) {
    var o;
    return !n && this.requestDataCheck(e) ? (e && this.setUrl(e), o = this.generateConfig(i), this.sendRequest(this.url, t, o)) : n;
  }
  setDefaultConfig(e = {}) {
    this.config = Object.assign({}, Ce.defaultConfig), typeof e == "string" ? this.config.method = e : Object.assign(this.config, e);
  }
  //load config object
  generateConfig(e = {}) {
    var t = Object.assign({}, this.config);
    return typeof e == "string" ? t.method = e : Object.assign(t, e), t;
  }
  //set request url
  setUrl(e) {
    this.url = e;
  }
  //get request url
  getUrl() {
    return this.url;
  }
  //send ajax request
  sendRequest(e, t, i) {
    return this.table.options.ajaxRequesting.call(this.table, e, t) !== !1 ? this.loaderPromise(e, i, t).then((s) => (this.table.options.ajaxResponse && (s = this.table.options.ajaxResponse.call(this.table, e, t, s)), s)) : Promise.reject();
  }
};
x(Ce, "moduleName", "ajax"), //load defaults
x(Ce, "defaultConfig", Is), x(Ce, "defaultURLGenerator", Ai), x(Ce, "defaultLoaderPromise", Gs), x(Ce, "contentTypeFormatters", $s);
let Ut = Ce;
var js = {
  replace: function(l) {
    return this.table.setData(l);
  },
  update: function(l) {
    return this.table.updateOrAddData(l);
  },
  insert: function(l) {
    return this.table.addData(l);
  }
}, Us = {
  table: function(l) {
    var e = [], t = !0, i = this.table.columnManager.columns, s = [], n = [];
    return l = l.split(`
`), l.forEach(function(o) {
      e.push(o.split("	"));
    }), e.length && !(e.length === 1 && e[0].length < 2) ? (e[0].forEach(function(o) {
      var r = i.find(function(a) {
        return o && a.definition.title && o.trim() && a.definition.title.trim() === o.trim();
      });
      r ? s.push(r) : t = !1;
    }), t || (t = !0, s = [], e[0].forEach(function(o) {
      var r = i.find(function(a) {
        return o && a.field && o.trim() && a.field.trim() === o.trim();
      });
      r ? s.push(r) : t = !1;
    }), t || (s = this.table.columnManager.columnsByIndex)), t && e.shift(), e.forEach(function(o) {
      var r = {};
      o.forEach(function(a, h) {
        s[h] && (r[s[h].field] = a);
      }), n.push(r);
    }), n) : !1;
  }
}, qs = {
  copyToClipboard: ["ctrl + 67", "meta + 67"]
}, Ks = {
  copyToClipboard: function(l) {
    this.table.modules.edit.currentCell || this.table.modExists("clipboard", !0) && this.table.modules.clipboard.copy(!1, !0);
  }
}, Xs = {
  keybindings: {
    bindings: qs,
    actions: Ks
  }
};
const Ne = class Ne extends O {
  constructor(e) {
    super(e), this.mode = !0, this.pasteParser = function() {
    }, this.pasteAction = function() {
    }, this.customSelection = !1, this.rowRange = !1, this.blocked = !0, this.registerTableOption("clipboard", !1), this.registerTableOption("clipboardCopyStyled", !0), this.registerTableOption("clipboardCopyConfig", !1), this.registerTableOption("clipboardCopyFormatter", !1), this.registerTableOption("clipboardCopyRowRange", "active"), this.registerTableOption("clipboardPasteParser", "table"), this.registerTableOption("clipboardPasteAction", "insert"), this.registerColumnOption("clipboard"), this.registerColumnOption("titleClipboard");
  }
  initialize() {
    this.mode = this.table.options.clipboard, this.rowRange = this.table.options.clipboardCopyRowRange, (this.mode === !0 || this.mode === "copy") && this.table.element.addEventListener("copy", (e) => {
      var t, i, s;
      this.blocked || (e.preventDefault(), this.customSelection ? (t = this.customSelection, this.table.options.clipboardCopyFormatter && (t = this.table.options.clipboardCopyFormatter("plain", t))) : (s = this.table.modules.export.generateExportList(this.table.options.clipboardCopyConfig, this.table.options.clipboardCopyStyled, this.rowRange, "clipboard"), i = this.table.modules.export.generateHTMLTable(s), t = i ? this.generatePlainContent(s) : "", this.table.options.clipboardCopyFormatter && (t = this.table.options.clipboardCopyFormatter("plain", t), i = this.table.options.clipboardCopyFormatter("html", i))), window.clipboardData && window.clipboardData.setData ? window.clipboardData.setData("Text", t) : e.clipboardData && e.clipboardData.setData ? (e.clipboardData.setData("text/plain", t), i && e.clipboardData.setData("text/html", i)) : e.originalEvent && e.originalEvent.clipboardData.setData && (e.originalEvent.clipboardData.setData("text/plain", t), i && e.originalEvent.clipboardData.setData("text/html", i)), this.dispatchExternal("clipboardCopied", t, i), this.reset());
    }), (this.mode === !0 || this.mode === "paste") && this.table.element.addEventListener("paste", (e) => {
      this.paste(e);
    }), this.setPasteParser(this.table.options.clipboardPasteParser), this.setPasteAction(this.table.options.clipboardPasteAction), this.registerTableFunction("copyToClipboard", this.copy.bind(this));
  }
  reset() {
    this.blocked = !0, this.customSelection = !1;
  }
  generatePlainContent(e) {
    var t = [];
    return e.forEach((i) => {
      var s = [];
      i.columns.forEach((n) => {
        var o = "";
        if (n)
          if (i.type === "group" && (n.value = n.component.getKey()), n.value === null)
            o = "";
          else
            switch (typeof n.value) {
              case "object":
                o = JSON.stringify(n.value);
                break;
              case "undefined":
                o = "";
                break;
              default:
                o = n.value;
            }
        s.push(o);
      }), t.push(s.join("	"));
    }), t.join(`
`);
  }
  copy(e, t) {
    var i, s;
    this.blocked = !1, this.customSelection = !1, (this.mode === !0 || this.mode === "copy") && (this.rowRange = e || this.table.options.clipboardCopyRowRange, typeof window.getSelection < "u" && typeof document.createRange < "u" ? (e = document.createRange(), e.selectNodeContents(this.table.element), i = window.getSelection(), i.toString() && t && (this.customSelection = i.toString()), i.removeAllRanges(), i.addRange(e)) : typeof document.selection < "u" && typeof document.body.createTextRange < "u" && (s = document.body.createTextRange(), s.moveToElementText(this.table.element), s.select()), document.execCommand("copy"), i && i.removeAllRanges());
  }
  //PASTE EVENT HANDLING
  setPasteAction(e) {
    switch (typeof e) {
      case "string":
        this.pasteAction = Ne.pasteActions[e], this.pasteAction || console.warn("Clipboard Error - No such paste action found:", e);
        break;
      case "function":
        this.pasteAction = e;
        break;
    }
  }
  setPasteParser(e) {
    switch (typeof e) {
      case "string":
        this.pasteParser = Ne.pasteParsers[e], this.pasteParser || console.warn("Clipboard Error - No such paste parser found:", e);
        break;
      case "function":
        this.pasteParser = e;
        break;
    }
  }
  paste(e) {
    var t, i, s;
    this.checkPasteOrigin(e) && (t = this.getPasteData(e), i = this.pasteParser.call(this, t), i ? (e.preventDefault(), this.table.modExists("mutator") && (i = this.mutateData(i)), s = this.pasteAction.call(this, i), this.dispatchExternal("clipboardPasted", t, i, s)) : this.dispatchExternal("clipboardPasteError", t));
  }
  mutateData(e) {
    var t = [];
    return Array.isArray(e) ? e.forEach((i) => {
      t.push(this.table.modules.mutator.transformRow(i, "clipboard"));
    }) : t = e, t;
  }
  checkPasteOrigin(e) {
    var t = !0, i = this.confirm("clipboard-paste", [e]);
    return (i || !["DIV", "SPAN"].includes(e.target.tagName)) && (t = !1), t;
  }
  getPasteData(e) {
    var t;
    return window.clipboardData && window.clipboardData.getData ? t = window.clipboardData.getData("Text") : e.clipboardData && e.clipboardData.getData ? t = e.clipboardData.getData("text/plain") : e.originalEvent && e.originalEvent.clipboardData.getData && (t = e.originalEvent.clipboardData.getData("text/plain")), t;
  }
};
x(Ne, "moduleName", "clipboard"), x(Ne, "moduleExtensions", Xs), //load defaults
x(Ne, "pasteActions", js), x(Ne, "pasteParsers", Us);
let qt = Ne;
class Js {
  constructor(e) {
    return this._row = e, new Proxy(this, {
      get: function(t, i, s) {
        return typeof t[i] < "u" ? t[i] : t._row.table.componentFunctionBinder.handle("row", t._row, i);
      }
    });
  }
  getData(e) {
    return this._row.getData(e);
  }
  getElement() {
    return this._row.getElement();
  }
  getTable() {
    return this._row.table;
  }
  getCells() {
    var e = [];
    return this._row.getCells().forEach(function(t) {
      e.push(t.getComponent());
    }), e;
  }
  getCell(e) {
    var t = this._row.getCell(e);
    return t ? t.getComponent() : !1;
  }
  _getSelf() {
    return this._row;
  }
}
class Oi {
  constructor(e) {
    return this._cell = e, new Proxy(this, {
      get: function(t, i, s) {
        return typeof t[i] < "u" ? t[i] : t._cell.table.componentFunctionBinder.handle("cell", t._cell, i);
      }
    });
  }
  getValue() {
    return this._cell.getValue();
  }
  getOldValue() {
    return this._cell.getOldValue();
  }
  getInitialValue() {
    return this._cell.initialValue;
  }
  getElement() {
    return this._cell.getElement();
  }
  getRow() {
    return this._cell.row.getComponent();
  }
  getData(e) {
    return this._cell.row.getData(e);
  }
  getType() {
    return "cell";
  }
  getField() {
    return this._cell.column.getField();
  }
  getColumn() {
    return this._cell.column.getComponent();
  }
  setValue(e, t) {
    typeof t > "u" && (t = !0), this._cell.setValue(e, t);
  }
  restoreOldValue() {
    this._cell.setValueActual(this._cell.getOldValue());
  }
  restoreInitialValue() {
    this._cell.setValueActual(this._cell.initialValue);
  }
  checkHeight() {
    this._cell.checkHeight();
  }
  getTable() {
    return this._cell.table;
  }
  _getSelf() {
    return this._cell;
  }
}
class kt extends ne {
  constructor(e, t) {
    super(e.table), this.table = e.table, this.column = e, this.row = t, this.element = null, this.value = null, this.initialValue, this.oldValue = null, this.modules = {}, this.height = null, this.width = null, this.minWidth = null, this.component = null, this.loaded = !1, this.build();
  }
  //////////////// Setup Functions /////////////////
  //generate element
  build() {
    this.generateElement(), this.setWidth(), this._configureCell(), this.setValueActual(this.column.getFieldValue(this.row.data)), this.initialValue = this.value;
  }
  generateElement() {
    this.element = document.createElement("div"), this.element.className = "tabulator-cell", this.element.setAttribute("role", "gridcell"), this.column.isRowHeader && this.element.classList.add("tabulator-row-header");
  }
  _configureCell() {
    var e = this.element, t = this.column.getField(), i = {
      top: "flex-start",
      bottom: "flex-end",
      middle: "center"
    }, s = {
      left: "flex-start",
      right: "flex-end",
      center: "center"
    };
    if (e.style.textAlign = this.column.hozAlign, this.column.vertAlign && (e.style.display = "inline-flex", e.style.alignItems = i[this.column.vertAlign] || "", this.column.hozAlign && (e.style.justifyContent = s[this.column.hozAlign] || "")), t && e.setAttribute("tabulator-field", t), this.column.definition.cssClass) {
      var n = this.column.definition.cssClass.split(" ");
      n.forEach((o) => {
        e.classList.add(o);
      });
    }
    this.dispatch("cell-init", this), this.column.visible || this.hide();
  }
  //generate cell contents
  _generateContents() {
    var e;
    switch (e = this.chain("cell-format", this, null, () => this.element.innerHTML = this.value), typeof e) {
      case "object":
        if (e instanceof Node) {
          for (; this.element.firstChild; ) this.element.removeChild(this.element.firstChild);
          this.element.appendChild(e);
        } else
          this.element.innerHTML = "", e != null && console.warn("Format Error - Formatter has returned a type of object, the only valid formatter object return is an instance of Node, the formatter returned:", e);
        break;
      case "undefined":
        this.element.innerHTML = "";
        break;
      default:
        this.element.innerHTML = e;
    }
  }
  cellRendered() {
    this.dispatch("cell-rendered", this);
  }
  //////////////////// Getters ////////////////////
  getElement(e) {
    return this.loaded || (this.loaded = !0, e || this.layoutElement()), this.element;
  }
  getValue() {
    return this.value;
  }
  getOldValue() {
    return this.oldValue;
  }
  //////////////////// Actions ////////////////////
  setValue(e, t, i) {
    var s = this.setValueProcessData(e, t, i);
    s && (this.dispatch("cell-value-updated", this), this.cellRendered(), this.column.definition.cellEdited && this.column.definition.cellEdited.call(this.table, this.getComponent()), this.dispatchExternal("cellEdited", this.getComponent()), this.subscribedExternal("dataChanged") && this.dispatchExternal("dataChanged", this.table.rowManager.getData()));
  }
  setValueProcessData(e, t, i) {
    var s = !1;
    return (this.value !== e || i) && (s = !0, t && (e = this.chain("cell-value-changing", [this, e], null, e))), this.setValueActual(e), s && this.dispatch("cell-value-changed", this), s;
  }
  setValueActual(e) {
    this.oldValue = this.value, this.value = e, this.dispatch("cell-value-save-before", this), this.column.setFieldValue(this.row.data, e), this.dispatch("cell-value-save-after", this), this.loaded && this.layoutElement();
  }
  layoutElement() {
    this._generateContents(), this.dispatch("cell-layout", this);
  }
  setWidth() {
    this.width = this.column.width, this.element.style.width = this.column.widthStyled;
  }
  clearWidth() {
    this.width = "", this.element.style.width = "";
  }
  getWidth() {
    return this.width || this.element.offsetWidth;
  }
  setMinWidth() {
    this.minWidth = this.column.minWidth, this.element.style.minWidth = this.column.minWidthStyled;
  }
  setMaxWidth() {
    this.maxWidth = this.column.maxWidth, this.element.style.maxWidth = this.column.maxWidthStyled;
  }
  checkHeight() {
    this.row.reinitializeHeight();
  }
  clearHeight() {
    this.element.style.height = "", this.height = null, this.dispatch("cell-height", this, "");
  }
  setHeight() {
    this.height = this.row.height, this.element.style.height = this.row.heightStyled, this.dispatch("cell-height", this, this.row.heightStyled);
  }
  getHeight() {
    return this.height || this.element.offsetHeight;
  }
  show() {
    this.element.style.display = this.column.vertAlign ? "inline-flex" : "";
  }
  hide() {
    this.element.style.display = "none";
  }
  delete() {
    this.dispatch("cell-delete", this), !this.table.rowManager.redrawBlock && this.element.parentNode && this.element.parentNode.removeChild(this.element), this.element = !1, this.column.deleteCell(this), this.row.deleteCell(this), this.calcs = {};
  }
  getIndex() {
    return this.row.getCellIndex(this);
  }
  //////////////// Object Generation /////////////////
  getComponent() {
    return this.component || (this.component = new Oi(this)), this.component;
  }
}
class Bi {
  constructor(e) {
    return this._column = e, this.type = "ColumnComponent", new Proxy(this, {
      get: function(t, i, s) {
        return typeof t[i] < "u" ? t[i] : t._column.table.componentFunctionBinder.handle("column", t._column, i);
      }
    });
  }
  getElement() {
    return this._column.getElement();
  }
  getDefinition() {
    return this._column.getDefinition();
  }
  getField() {
    return this._column.getField();
  }
  getTitleDownload() {
    return this._column.getTitleDownload();
  }
  getCells() {
    var e = [];
    return this._column.cells.forEach(function(t) {
      e.push(t.getComponent());
    }), e;
  }
  isVisible() {
    return this._column.visible;
  }
  show() {
    this._column.isGroup ? this._column.columns.forEach(function(e) {
      e.show();
    }) : this._column.show();
  }
  hide() {
    this._column.isGroup ? this._column.columns.forEach(function(e) {
      e.hide();
    }) : this._column.hide();
  }
  toggle() {
    this._column.visible ? this.hide() : this.show();
  }
  delete() {
    return this._column.delete();
  }
  getSubColumns() {
    var e = [];
    return this._column.columns.length && this._column.columns.forEach(function(t) {
      e.push(t.getComponent());
    }), e;
  }
  getParentColumn() {
    return this._column.getParentComponent();
  }
  _getSelf() {
    return this._column;
  }
  scrollTo(e, t) {
    return this._column.table.columnManager.scrollToColumn(this._column, e, t);
  }
  getTable() {
    return this._column.table;
  }
  move(e, t) {
    var i = this._column.table.columnManager.findColumn(e);
    i ? this._column.table.columnManager.moveColumn(this._column, i, t) : console.warn("Move Error - No matching column found:", i);
  }
  getNextColumn() {
    var e = this._column.nextColumn();
    return e ? e.getComponent() : !1;
  }
  getPrevColumn() {
    var e = this._column.prevColumn();
    return e ? e.getComponent() : !1;
  }
  updateDefinition(e) {
    return this._column.updateDefinition(e);
  }
  getWidth() {
    return this._column.getWidth();
  }
  setWidth(e) {
    var t;
    return e === !0 ? t = this._column.reinitializeWidth(!0) : t = this._column.setWidth(e), this._column.table.columnManager.rerenderColumns(!0), t;
  }
}
var Ni = {
  title: void 0,
  field: void 0,
  columns: void 0,
  visible: void 0,
  hozAlign: void 0,
  vertAlign: void 0,
  width: void 0,
  minWidth: 40,
  maxWidth: void 0,
  maxInitialWidth: void 0,
  cssClass: void 0,
  variableHeight: void 0,
  headerVertical: void 0,
  headerHozAlign: void 0,
  headerWordWrap: !1,
  editableTitle: void 0
};
const Je = class Je extends ne {
  constructor(e, t, i) {
    super(t.table), this.definition = e, this.parent = t, this.type = "column", this.columns = [], this.cells = [], this.isGroup = !1, this.isRowHeader = i, this.element = this.createElement(), this.contentElement = !1, this.titleHolderElement = !1, this.titleElement = !1, this.groupElement = this.createGroupElement(), this.hozAlign = "", this.vertAlign = "", this.field = "", this.fieldStructure = "", this.getFieldValue = "", this.setFieldValue = "", this.titleDownload = null, this.titleFormatterRendered = !1, this.mapDefinitions(), this.setField(this.definition.field), this.modules = {}, this.width = null, this.widthStyled = "", this.maxWidth = null, this.maxWidthStyled = "", this.maxInitialWidth = null, this.minWidth = null, this.minWidthStyled = "", this.widthFixed = !1, this.visible = !0, this.component = null, this.definition.columns ? (this.isGroup = !0, this.definition.columns.forEach((s, n) => {
      var o = new Je(s, this);
      this.attachColumn(o);
    }), this.checkColumnVisibility()) : t.registerColumnField(this), this._initialize();
  }
  createElement() {
    var e = document.createElement("div");
    switch (e.classList.add("tabulator-col"), e.setAttribute("role", "columnheader"), e.setAttribute("aria-sort", "none"), this.isRowHeader && e.classList.add("tabulator-row-header"), this.table.options.columnHeaderVertAlign) {
      case "middle":
        e.style.justifyContent = "center";
        break;
      case "bottom":
        e.style.justifyContent = "flex-end";
        break;
    }
    return e;
  }
  createGroupElement() {
    var e = document.createElement("div");
    return e.classList.add("tabulator-col-group-cols"), e;
  }
  mapDefinitions() {
    var e = this.table.options.columnDefaults;
    if (e)
      for (let t in e)
        typeof this.definition[t] > "u" && (this.definition[t] = e[t]);
    this.definition = this.table.columnManager.optionsList.generate(Je.defaultOptionList, this.definition);
  }
  checkDefinition() {
    Object.keys(this.definition).forEach((e) => {
      Je.defaultOptionList.indexOf(e) === -1 && console.warn("Invalid column definition option in '" + (this.field || this.definition.title) + "' column:", e);
    });
  }
  setField(e) {
    this.field = e, this.fieldStructure = e ? this.table.options.nestedFieldSeparator ? e.split(this.table.options.nestedFieldSeparator) : [e] : [], this.getFieldValue = this.fieldStructure.length > 1 ? this._getNestedData : this._getFlatData, this.setFieldValue = this.fieldStructure.length > 1 ? this._setNestedData : this._setFlatData;
  }
  //register column position with column manager
  registerColumnPosition(e) {
    this.parent.registerColumnPosition(e);
  }
  //register column position with column manager
  registerColumnField(e) {
    this.parent.registerColumnField(e);
  }
  //trigger position registration
  reRegisterPosition() {
    this.isGroup ? this.columns.forEach(function(e) {
      e.reRegisterPosition();
    }) : this.registerColumnPosition(this);
  }
  //build header element
  _initialize() {
    for (var e = this.definition; this.element.firstChild; ) this.element.removeChild(this.element.firstChild);
    e.headerVertical && (this.element.classList.add("tabulator-col-vertical"), e.headerVertical === "flip" && this.element.classList.add("tabulator-col-vertical-flip")), this.contentElement = this._buildColumnHeaderContent(), this.element.appendChild(this.contentElement), this.isGroup ? this._buildGroupHeader() : this._buildColumnHeader(), this.dispatch("column-init", this);
  }
  //build header element for header
  _buildColumnHeader() {
    var e = this.definition;
    if (this.dispatch("column-layout", this), typeof e.visible < "u" && (e.visible ? this.show(!0) : this.hide(!0)), e.cssClass) {
      var t = e.cssClass.split(" ");
      t.forEach((i) => {
        this.element.classList.add(i);
      });
    }
    e.field && this.element.setAttribute("tabulator-field", e.field), this.setMinWidth(parseInt(e.minWidth)), e.maxInitialWidth && (this.maxInitialWidth = parseInt(e.maxInitialWidth)), e.maxWidth && this.setMaxWidth(parseInt(e.maxWidth)), this.reinitializeWidth(), this.hozAlign = this.definition.hozAlign, this.vertAlign = this.definition.vertAlign, this.titleElement.style.textAlign = this.definition.headerHozAlign;
  }
  _buildColumnHeaderContent() {
    var e = document.createElement("div");
    return e.classList.add("tabulator-col-content"), this.titleHolderElement = document.createElement("div"), this.titleHolderElement.classList.add("tabulator-col-title-holder"), e.appendChild(this.titleHolderElement), this.titleElement = this._buildColumnHeaderTitle(), this.titleHolderElement.appendChild(this.titleElement), e;
  }
  //build title element of column
  _buildColumnHeaderTitle() {
    var e = this.definition, t = document.createElement("div");
    if (t.classList.add("tabulator-col-title"), e.headerWordWrap && t.classList.add("tabulator-col-title-wrap"), e.editableTitle) {
      var i = document.createElement("input");
      i.classList.add("tabulator-title-editor"), i.addEventListener("click", (s) => {
        s.stopPropagation(), i.focus();
      }), i.addEventListener("mousedown", (s) => {
        s.stopPropagation();
      }), i.addEventListener("change", () => {
        e.title = i.value, this.dispatchExternal("columnTitleChanged", this.getComponent());
      }), t.appendChild(i), e.field ? this.langBind("columns|" + e.field, (s) => {
        i.value = s || e.title || "&nbsp;";
      }) : i.value = e.title || "&nbsp;";
    } else
      e.field ? this.langBind("columns|" + e.field, (s) => {
        this._formatColumnHeaderTitle(t, s || e.title || "&nbsp;");
      }) : this._formatColumnHeaderTitle(t, e.title || "&nbsp;");
    return t;
  }
  _formatColumnHeaderTitle(e, t) {
    var i = this.chain("column-format", [this, t, e], null, () => t);
    switch (typeof i) {
      case "object":
        i instanceof Node ? e.appendChild(i) : (e.innerHTML = "", console.warn("Format Error - Title formatter has returned a type of object, the only valid formatter object return is an instance of Node, the formatter returned:", i));
        break;
      case "undefined":
        e.innerHTML = "";
        break;
      default:
        e.innerHTML = i;
    }
  }
  //build header element for column group
  _buildGroupHeader() {
    if (this.element.classList.add("tabulator-col-group"), this.element.setAttribute("role", "columngroup"), this.element.setAttribute("aria-title", this.definition.title), this.definition.cssClass) {
      var e = this.definition.cssClass.split(" ");
      e.forEach((t) => {
        this.element.classList.add(t);
      });
    }
    this.titleElement.style.textAlign = this.definition.headerHozAlign, this.element.appendChild(this.groupElement);
  }
  //flat field lookup
  _getFlatData(e) {
    return e[this.field];
  }
  //nested field lookup
  _getNestedData(e) {
    var t = e, i = this.fieldStructure, s = i.length, n;
    for (let o = 0; o < s && (t = t[i[o]], n = t, !!t); o++)
      ;
    return n;
  }
  //flat field set
  _setFlatData(e, t) {
    this.field && (e[this.field] = t);
  }
  //nested field set
  _setNestedData(e, t) {
    var i = e, s = this.fieldStructure, n = s.length;
    for (let o = 0; o < n; o++)
      if (o == n - 1)
        i[s[o]] = t;
      else {
        if (!i[s[o]])
          if (typeof t < "u")
            i[s[o]] = {};
          else
            break;
        i = i[s[o]];
      }
  }
  //attach column to this group
  attachColumn(e) {
    this.groupElement ? (this.columns.push(e), this.groupElement.appendChild(e.getElement()), e.columnRendered()) : console.warn("Column Warning - Column being attached to another column instead of column group");
  }
  //vertically align header in column
  verticalAlign(e, t) {
    var i = this.parent.isGroup ? this.parent.getGroupElement().clientHeight : t || this.parent.getHeadersElement().clientHeight;
    this.element.style.height = i + "px", this.dispatch("column-height", this, this.element.style.height), this.isGroup && (this.groupElement.style.minHeight = i - this.contentElement.offsetHeight + "px"), this.columns.forEach(function(s) {
      s.verticalAlign(e);
    });
  }
  //clear vertical alignment
  clearVerticalAlign() {
    this.element.style.paddingTop = "", this.element.style.height = "", this.element.style.minHeight = "", this.groupElement.style.minHeight = "", this.columns.forEach(function(e) {
      e.clearVerticalAlign();
    }), this.dispatch("column-height", this, "");
  }
  //// Retrieve Column Information ////
  //return column header element
  getElement() {
    return this.element;
  }
  //return column group element
  getGroupElement() {
    return this.groupElement;
  }
  //return field name
  getField() {
    return this.field;
  }
  getTitleDownload() {
    return this.titleDownload;
  }
  //return the first column in a group
  getFirstColumn() {
    return this.isGroup ? this.columns.length ? this.columns[0].getFirstColumn() : !1 : this;
  }
  //return the last column in a group
  getLastColumn() {
    return this.isGroup ? this.columns.length ? this.columns[this.columns.length - 1].getLastColumn() : !1 : this;
  }
  //return all columns in a group
  getColumns(e) {
    var t = [];
    return e ? this.columns.forEach((i) => {
      t.push(i), t = t.concat(i.getColumns(!0));
    }) : t = this.columns, t;
  }
  //return all columns in a group
  getCells() {
    return this.cells;
  }
  //retrieve the top column in a group of columns
  getTopColumn() {
    return this.parent.isGroup ? this.parent.getTopColumn() : this;
  }
  //return column definition object
  getDefinition(e) {
    var t = [];
    return this.isGroup && e && (this.columns.forEach(function(i) {
      t.push(i.getDefinition(!0));
    }), this.definition.columns = t), this.definition;
  }
  //////////////////// Actions ////////////////////
  checkColumnVisibility() {
    var e = !1;
    this.columns.forEach(function(t) {
      t.visible && (e = !0);
    }), e ? (this.show(), this.dispatchExternal("columnVisibilityChanged", this.getComponent(), !1)) : this.hide();
  }
  //show column
  show(e, t) {
    this.visible || (this.visible = !0, this.element.style.display = "", this.parent.isGroup && this.parent.checkColumnVisibility(), this.cells.forEach(function(i) {
      i.show();
    }), !this.isGroup && this.width === null && this.reinitializeWidth(), this.table.columnManager.verticalAlignHeaders(), this.dispatch("column-show", this, t), e || this.dispatchExternal("columnVisibilityChanged", this.getComponent(), !0), this.parent.isGroup && this.parent.matchChildWidths(), this.silent || this.table.columnManager.rerenderColumns());
  }
  //hide column
  hide(e, t) {
    this.visible && (this.visible = !1, this.element.style.display = "none", this.table.columnManager.verticalAlignHeaders(), this.parent.isGroup && this.parent.checkColumnVisibility(), this.cells.forEach(function(i) {
      i.hide();
    }), this.dispatch("column-hide", this, t), e || this.dispatchExternal("columnVisibilityChanged", this.getComponent(), !1), this.parent.isGroup && this.parent.matchChildWidths(), this.silent || this.table.columnManager.rerenderColumns());
  }
  matchChildWidths() {
    var e = 0;
    this.contentElement && this.columns.length && (this.columns.forEach(function(t) {
      t.visible && (e += t.getWidth());
    }), this.contentElement.style.maxWidth = e - 1 + "px", this.table.initialized && (this.element.style.width = e + "px"), this.parent.isGroup && this.parent.matchChildWidths());
  }
  removeChild(e) {
    var t = this.columns.indexOf(e);
    t > -1 && this.columns.splice(t, 1), this.columns.length || this.delete();
  }
  setWidth(e) {
    this.widthFixed = !0, this.setWidthActual(e);
  }
  setWidthActual(e) {
    isNaN(e) && (e = Math.floor(this.table.element.clientWidth / 100 * parseInt(e))), e = Math.max(this.minWidth, e), this.maxWidth && (e = Math.min(this.maxWidth, e)), this.width = e, this.widthStyled = e ? e + "px" : "", this.element.style.width = this.widthStyled, this.isGroup || this.cells.forEach(function(t) {
      t.setWidth();
    }), this.parent.isGroup && this.parent.matchChildWidths(), this.dispatch("column-width", this), this.subscribedExternal("columnWidth") && this.dispatchExternal("columnWidth", this.getComponent());
  }
  checkCellHeights() {
    var e = [];
    this.cells.forEach(function(t) {
      t.row.heightInitialized && (t.row.getElement().offsetParent !== null ? (e.push(t.row), t.row.clearCellHeight()) : t.row.heightInitialized = !1);
    }), e.forEach(function(t) {
      t.calcHeight();
    }), e.forEach(function(t) {
      t.setCellHeight();
    });
  }
  getWidth() {
    var e = 0;
    return this.isGroup ? this.columns.forEach(function(t) {
      t.visible && (e += t.getWidth());
    }) : e = this.width, e;
  }
  getLeftOffset() {
    var e = this.element.offsetLeft;
    return this.parent.isGroup && (e += this.parent.getLeftOffset()), e;
  }
  getHeight() {
    return Math.ceil(this.element.getBoundingClientRect().height);
  }
  setMinWidth(e) {
    this.maxWidth && e > this.maxWidth && (e = this.maxWidth, console.warn("the minWidth (" + e + "px) for column '" + this.field + "' cannot be bigger that its maxWidth (" + this.maxWidthStyled + ")")), this.minWidth = e, this.minWidthStyled = e ? e + "px" : "", this.element.style.minWidth = this.minWidthStyled, this.cells.forEach(function(t) {
      t.setMinWidth();
    });
  }
  setMaxWidth(e) {
    this.minWidth && e < this.minWidth && (e = this.minWidth, console.warn("the maxWidth (" + e + "px) for column '" + this.field + "' cannot be smaller that its minWidth (" + this.minWidthStyled + ")")), this.maxWidth = e, this.maxWidthStyled = e ? e + "px" : "", this.element.style.maxWidth = this.maxWidthStyled, this.cells.forEach(function(t) {
      t.setMaxWidth();
    });
  }
  delete() {
    return new Promise((e, t) => {
      this.isGroup && this.columns.forEach(function(s) {
        s.delete();
      }), this.dispatch("column-delete", this);
      var i = this.cells.length;
      for (let s = 0; s < i; s++)
        this.cells[0].delete();
      this.element.parentNode && this.element.parentNode.removeChild(this.element), this.element = !1, this.contentElement = !1, this.titleElement = !1, this.groupElement = !1, this.parent.isGroup && this.parent.removeChild(this), this.table.columnManager.deregisterColumn(this), this.table.columnManager.rerenderColumns(!0), this.dispatch("column-deleted", this), e();
    });
  }
  columnRendered() {
    this.titleFormatterRendered && this.titleFormatterRendered(), this.dispatch("column-rendered", this);
  }
  //////////////// Cell Management /////////////////
  //generate cell for this column
  generateCell(e) {
    var t = new kt(this, e);
    return this.cells.push(t), t;
  }
  nextColumn() {
    var e = this.table.columnManager.findColumnIndex(this);
    return e > -1 ? this._nextVisibleColumn(e + 1) : !1;
  }
  _nextVisibleColumn(e) {
    var t = this.table.columnManager.getColumnByIndex(e);
    return !t || t.visible ? t : this._nextVisibleColumn(e + 1);
  }
  prevColumn() {
    var e = this.table.columnManager.findColumnIndex(this);
    return e > -1 ? this._prevVisibleColumn(e - 1) : !1;
  }
  _prevVisibleColumn(e) {
    var t = this.table.columnManager.getColumnByIndex(e);
    return !t || t.visible ? t : this._prevVisibleColumn(e - 1);
  }
  reinitializeWidth(e) {
    this.widthFixed = !1, typeof this.definition.width < "u" && !e && this.setWidth(this.definition.width), this.dispatch("column-width-fit-before", this), this.fitToData(e), this.dispatch("column-width-fit-after", this);
  }
  //set column width to maximum cell width for non group columns
  fitToData(e) {
    if (!this.isGroup) {
      this.widthFixed || (this.element.style.width = "", this.cells.forEach((s) => {
        s.clearWidth();
      }));
      var t = this.element.offsetWidth;
      if ((!this.width || !this.widthFixed) && (this.cells.forEach((s) => {
        var n = s.getWidth();
        n > t && (t = n);
      }), t)) {
        var i = t + 1;
        e ? this.setWidth(i) : (this.maxInitialWidth && !e && (i = Math.min(i, this.maxInitialWidth)), this.setWidthActual(i));
      }
    }
  }
  updateDefinition(e) {
    var t;
    return this.isGroup || this.parent.isGroup ? (console.error("Column Update Error - The updateDefinition function is only available on ungrouped columns"), Promise.reject("Column Update Error - The updateDefinition function is only available on columns, not column groups")) : (t = Object.assign({}, this.getDefinition()), t = Object.assign(t, e), this.table.columnManager.addColumn(t, !1, this).then((i) => (t.field == this.field && (this.field = !1), this.delete().then(() => i.getComponent()))));
  }
  deleteCell(e) {
    var t = this.cells.indexOf(e);
    t > -1 && this.cells.splice(t, 1);
  }
  //////////////// Object Generation /////////////////
  getComponent() {
    return this.component || (this.component = new Bi(this)), this.component;
  }
  getPosition() {
    return this.table.columnManager.getVisibleColumnsByIndex().indexOf(this) + 1;
  }
  getParentComponent() {
    return this.parent instanceof Je ? this.parent.getComponent() : !1;
  }
};
x(Je, "defaultOptionList", Ni);
let Ze = Je;
class Pt {
  constructor(e) {
    return this._row = e, new Proxy(this, {
      get: function(t, i, s) {
        return typeof t[i] < "u" ? t[i] : t._row.table.componentFunctionBinder.handle("row", t._row, i);
      }
    });
  }
  getData(e) {
    return this._row.getData(e);
  }
  getElement() {
    return this._row.getElement();
  }
  getCells() {
    var e = [];
    return this._row.getCells().forEach(function(t) {
      e.push(t.getComponent());
    }), e;
  }
  getCell(e) {
    var t = this._row.getCell(e);
    return t ? t.getComponent() : !1;
  }
  getIndex() {
    return this._row.getData("data")[this._row.table.options.index];
  }
  getPosition() {
    return this._row.getPosition();
  }
  watchPosition(e) {
    return this._row.watchPosition(e);
  }
  delete() {
    return this._row.delete();
  }
  scrollTo(e, t) {
    return this._row.table.rowManager.scrollToRow(this._row, e, t);
  }
  move(e, t) {
    this._row.moveToRow(e, t);
  }
  update(e) {
    return this._row.updateData(e);
  }
  normalizeHeight() {
    this._row.normalizeHeight(!0);
  }
  _getSelf() {
    return this._row;
  }
  reformat() {
    return this._row.reinitialize();
  }
  getTable() {
    return this._row.table;
  }
  getNextRow() {
    var e = this._row.nextRow();
    return e && e.getComponent();
  }
  getPrevRow() {
    var e = this._row.prevRow();
    return e && e.getComponent();
  }
}
class re extends ne {
  constructor(e, t, i = "row") {
    super(t.table), this.parent = t, this.data = {}, this.type = i, this.element = !1, this.modules = {}, this.cells = [], this.height = 0, this.heightStyled = "", this.manualHeight = !1, this.outerHeight = 0, this.initialized = !1, this.heightInitialized = !1, this.position = 0, this.positionWatchers = [], this.component = null, this.created = !1, this.setData(e);
  }
  create() {
    this.created || (this.created = !0, this.generateElement());
  }
  createElement() {
    var e = document.createElement("div");
    e.classList.add("tabulator-row"), e.setAttribute("role", "row"), this.element = e;
  }
  getElement() {
    return this.create(), this.element;
  }
  detachElement() {
    this.element && this.element.parentNode && this.element.parentNode.removeChild(this.element);
  }
  generateElement() {
    this.createElement(), this.dispatch("row-init", this);
  }
  generateCells() {
    this.cells = this.table.columnManager.generateCells(this);
  }
  //functions to setup on first render
  initialize(e, t) {
    if (this.create(), !this.initialized || e) {
      for (this.deleteCells(); this.element.firstChild; ) this.element.removeChild(this.element.firstChild);
      this.dispatch("row-layout-before", this), this.generateCells(), this.initialized = !0, this.table.columnManager.renderer.renderRowCells(this, t), e && this.normalizeHeight(), this.dispatch("row-layout", this), this.table.options.rowFormatter && this.table.options.rowFormatter(this.getComponent()), this.dispatch("row-layout-after", this);
    } else
      this.table.columnManager.renderer.rerenderRowCells(this, t);
  }
  rendered() {
    this.cells.forEach((e) => {
      e.cellRendered();
    });
  }
  reinitializeHeight() {
    this.heightInitialized = !1, this.element && this.element.offsetParent !== null && this.normalizeHeight(!0);
  }
  deinitialize() {
    this.initialized = !1;
  }
  deinitializeHeight() {
    this.heightInitialized = !1;
  }
  reinitialize(e) {
    this.initialized = !1, this.heightInitialized = !1, this.manualHeight || (this.height = 0, this.heightStyled = ""), this.element && this.element.offsetParent !== null && this.initialize(!0), this.dispatch("row-relayout", this);
  }
  //get heights when doing bulk row style calcs in virtual DOM
  calcHeight(e) {
    var t = 0, i = 0;
    this.table.options.rowHeight ? this.height = this.table.options.rowHeight : (i = this.calcMinHeight(), t = this.calcMaxHeight(), e ? this.height = Math.max(t, i) : this.height = this.manualHeight ? this.height : Math.max(t, i)), this.heightStyled = this.height ? this.height + "px" : "", this.outerHeight = this.element.offsetHeight;
  }
  calcMinHeight() {
    return this.table.options.resizableRows ? this.element.clientHeight : 0;
  }
  calcMaxHeight() {
    var e = 0;
    return this.cells.forEach(function(t) {
      var i = t.getHeight();
      i > e && (e = i);
    }), e;
  }
  //set of cells
  setCellHeight() {
    this.cells.forEach(function(e) {
      e.setHeight();
    }), this.heightInitialized = !0;
  }
  clearCellHeight() {
    this.cells.forEach(function(e) {
      e.clearHeight();
    });
  }
  //normalize the height of elements in the row
  normalizeHeight(e) {
    e && !this.table.options.rowHeight && this.clearCellHeight(), this.calcHeight(e), this.setCellHeight();
  }
  //set height of rows
  setHeight(e, t) {
    (this.height != e || t) && (this.manualHeight = !0, this.height = e, this.heightStyled = e ? e + "px" : "", this.setCellHeight(), this.outerHeight = this.element.offsetHeight, this.subscribedExternal("rowHeight") && this.dispatchExternal("rowHeight", this.getComponent()));
  }
  //return rows outer height
  getHeight() {
    return this.outerHeight;
  }
  //return rows outer Width
  getWidth() {
    return this.element.offsetWidth;
  }
  //////////////// Cell Management /////////////////
  deleteCell(e) {
    var t = this.cells.indexOf(e);
    t > -1 && this.cells.splice(t, 1);
  }
  //////////////// Data Management /////////////////
  setData(e) {
    this.data = this.chain("row-data-init-before", [this, e], void 0, e), this.dispatch("row-data-init-after", this);
  }
  //update the rows data
  updateData(e) {
    var t = this.element && U.elVisible(this.element), i = {}, s;
    return new Promise((n, o) => {
      typeof e == "string" && (e = JSON.parse(e)), this.dispatch("row-data-save-before", this), this.subscribed("row-data-changing") && (i = Object.assign(i, this.data), i = Object.assign(i, e)), s = this.chain("row-data-changing", [this, i, e], null, e);
      for (let r in s)
        this.data[r] = s[r];
      this.dispatch("row-data-save-after", this);
      for (let r in e)
        this.table.columnManager.getColumnsByFieldRoot(r).forEach((h) => {
          let d = this.getCell(h.getField());
          if (d) {
            let u = h.getFieldValue(s);
            d.getValue() !== u && (d.setValueProcessData(u), t && d.cellRendered());
          }
        });
      t ? (this.normalizeHeight(!0), this.table.options.rowFormatter && this.table.options.rowFormatter(this.getComponent())) : (this.initialized = !1, this.height = 0, this.heightStyled = ""), this.dispatch("row-data-changed", this, t, e), this.dispatchExternal("rowUpdated", this.getComponent()), this.subscribedExternal("dataChanged") && this.dispatchExternal("dataChanged", this.table.rowManager.getData()), n();
    });
  }
  getData(e) {
    return e ? this.chain("row-data-retrieve", [this, e], null, this.data) : this.data;
  }
  getCell(e) {
    var t = !1;
    return e = this.table.columnManager.findColumn(e), !this.initialized && this.cells.length === 0 && this.generateCells(), t = this.cells.find(function(i) {
      return i.column === e;
    }), t;
  }
  getCellIndex(e) {
    return this.cells.findIndex(function(t) {
      return t === e;
    });
  }
  findCell(e) {
    return this.cells.find((t) => t.element === e);
  }
  getCells() {
    return !this.initialized && this.cells.length === 0 && this.generateCells(), this.cells;
  }
  nextRow() {
    var e = this.table.rowManager.nextDisplayRow(this, !0);
    return e || !1;
  }
  prevRow() {
    var e = this.table.rowManager.prevDisplayRow(this, !0);
    return e || !1;
  }
  moveToRow(e, t) {
    var i = this.table.rowManager.findRow(e);
    i ? (this.table.rowManager.moveRowActual(this, i, !t), this.table.rowManager.refreshActiveData("display", !1, !0)) : console.warn("Move Error - No matching row found:", e);
  }
  ///////////////////// Actions  /////////////////////
  delete() {
    return this.dispatch("row-delete", this), this.deleteActual(), Promise.resolve();
  }
  deleteActual(e) {
    this.detachModules(), this.table.rowManager.deleteRow(this, e), this.deleteCells(), this.initialized = !1, this.heightInitialized = !1, this.element = !1, this.dispatch("row-deleted", this);
  }
  detachModules() {
    this.dispatch("row-deleting", this);
  }
  deleteCells() {
    var e = this.cells.length;
    for (let t = 0; t < e; t++)
      this.cells[0].delete();
  }
  wipe() {
    if (this.detachModules(), this.deleteCells(), this.element) {
      for (; this.element.firstChild; ) this.element.removeChild(this.element.firstChild);
      this.element.parentNode && this.element.parentNode.removeChild(this.element);
    }
    this.element = !1, this.modules = {};
  }
  isDisplayed() {
    return this.table.rowManager.getDisplayRows().includes(this);
  }
  getPosition() {
    return this.isDisplayed() ? this.position : !1;
  }
  setPosition(e) {
    e != this.position && (this.position = e, this.positionWatchers.forEach((t) => {
      t(this.position);
    }));
  }
  watchPosition(e) {
    this.positionWatchers.push(e), e(this.position);
  }
  getGroup() {
    return this.modules.group || !1;
  }
  //////////////// Object Generation /////////////////
  getComponent() {
    return this.component || (this.component = new Pt(this)), this.component;
  }
}
var Ys = {
  avg: function(l, e, t) {
    var i = 0, s = typeof t.precision < "u" ? t.precision : 2;
    return l.length && (i = l.reduce(function(n, o) {
      return Number(n) + Number(o);
    }), i = i / l.length, i = s !== !1 ? i.toFixed(s) : i), parseFloat(i).toString();
  },
  max: function(l, e, t) {
    var i = null, s = typeof t.precision < "u" ? t.precision : !1;
    return l.forEach(function(n) {
      n = Number(n), (n > i || i === null) && (i = n);
    }), i !== null ? s !== !1 ? i.toFixed(s) : i : "";
  },
  min: function(l, e, t) {
    var i = null, s = typeof t.precision < "u" ? t.precision : !1;
    return l.forEach(function(n) {
      n = Number(n), (n < i || i === null) && (i = n);
    }), i !== null ? s !== !1 ? i.toFixed(s) : i : "";
  },
  sum: function(l, e, t) {
    var i = 0, s = typeof t.precision < "u" ? t.precision : !1;
    return l.length && l.forEach(function(n) {
      n = Number(n), i += isNaN(n) ? 0 : Number(n);
    }), s !== !1 ? i.toFixed(s) : i;
  },
  concat: function(l, e, t) {
    var i = 0;
    return l.length && (i = l.reduce(function(s, n) {
      return String(s) + String(n);
    })), i;
  },
  count: function(l, e, t) {
    var i = 0;
    return l.length && l.forEach(function(s) {
      s && i++;
    }), i;
  },
  unique: function(l, e, t) {
    var i = l.filter((s, n) => (l || s === 0) && l.indexOf(s) === n);
    return i.length;
  }
};
const Ve = class Ve extends O {
  constructor(e) {
    super(e), this.topCalcs = [], this.botCalcs = [], this.genColumn = !1, this.topElement = this.createElement(), this.botElement = this.createElement(), this.topRow = !1, this.botRow = !1, this.topInitialized = !1, this.botInitialized = !1, this.blocked = !1, this.recalcAfterBlock = !1, this.registerTableOption("columnCalcs", !0), this.registerColumnOption("topCalc"), this.registerColumnOption("topCalcParams"), this.registerColumnOption("topCalcFormatter"), this.registerColumnOption("topCalcFormatterParams"), this.registerColumnOption("bottomCalc"), this.registerColumnOption("bottomCalcParams"), this.registerColumnOption("bottomCalcFormatter"), this.registerColumnOption("bottomCalcFormatterParams");
  }
  createElement() {
    var e = document.createElement("div");
    return e.classList.add("tabulator-calcs-holder"), e;
  }
  initialize() {
    this.genColumn = new Ze({ field: "value" }, this), this.subscribe("cell-value-changed", this.cellValueChanged.bind(this)), this.subscribe("column-init", this.initializeColumnCheck.bind(this)), this.subscribe("row-deleted", this.rowsUpdated.bind(this)), this.subscribe("scroll-horizontal", this.scrollHorizontal.bind(this)), this.subscribe("row-added", this.rowsUpdated.bind(this)), this.subscribe("column-moved", this.recalcActiveRows.bind(this)), this.subscribe("column-add", this.recalcActiveRows.bind(this)), this.subscribe("data-refreshed", this.recalcActiveRowsRefresh.bind(this)), this.subscribe("table-redraw", this.tableRedraw.bind(this)), this.subscribe("rows-visible", this.visibleRows.bind(this)), this.subscribe("scrollbar-vertical", this.adjustForScrollbar.bind(this)), this.subscribe("redraw-blocked", this.blockRedraw.bind(this)), this.subscribe("redraw-restored", this.restoreRedraw.bind(this)), this.subscribe("table-redrawing", this.resizeHolderWidth.bind(this)), this.subscribe("column-resized", this.resizeHolderWidth.bind(this)), this.subscribe("column-show", this.resizeHolderWidth.bind(this)), this.subscribe("column-hide", this.resizeHolderWidth.bind(this)), this.registerTableFunction("getCalcResults", this.getResults.bind(this)), this.registerTableFunction("recalc", this.userRecalc.bind(this)), this.resizeHolderWidth();
  }
  resizeHolderWidth() {
    this.topElement.style.minWidth = this.table.columnManager.headersElement.offsetWidth + "px";
  }
  tableRedraw(e) {
    this.recalc(this.table.rowManager.activeRows), e && this.redraw();
  }
  blockRedraw() {
    this.blocked = !0, this.recalcAfterBlock = !1;
  }
  restoreRedraw() {
    this.blocked = !1, this.recalcAfterBlock && (this.recalcAfterBlock = !1, this.recalcActiveRowsRefresh());
  }
  ///////////////////////////////////
  ///////// Table Functions /////////
  ///////////////////////////////////
  userRecalc() {
    this.recalc(this.table.rowManager.activeRows);
  }
  ///////////////////////////////////
  ///////// Internal Logic //////////
  ///////////////////////////////////
  blockCheck() {
    return this.blocked && (this.recalcAfterBlock = !0), this.blocked;
  }
  visibleRows(e, t) {
    return this.topRow && t.unshift(this.topRow), this.botRow && t.push(this.botRow), t;
  }
  rowsUpdated(e) {
    this.table.options.groupBy ? this.recalcRowGroup(e) : this.recalcActiveRows();
  }
  recalcActiveRowsRefresh() {
    this.table.options.groupBy && this.table.options.dataTreeStartExpanded && this.table.options.dataTree ? this.recalcAll() : this.recalcActiveRows();
  }
  recalcActiveRows() {
    this.recalc(this.table.rowManager.activeRows);
  }
  cellValueChanged(e) {
    (e.column.definition.topCalc || e.column.definition.bottomCalc) && (this.table.options.groupBy ? ((this.table.options.columnCalcs == "table" || this.table.options.columnCalcs == "both") && this.recalcActiveRows(), this.table.options.columnCalcs != "table" && this.recalcRowGroup(e.row)) : this.recalcActiveRows());
  }
  initializeColumnCheck(e) {
    (e.definition.topCalc || e.definition.bottomCalc) && this.initializeColumn(e);
  }
  //initialize column calcs
  initializeColumn(e) {
    var t = e.definition, i = {
      topCalcParams: t.topCalcParams || {},
      botCalcParams: t.bottomCalcParams || {}
    };
    if (t.topCalc) {
      switch (typeof t.topCalc) {
        case "string":
          Ve.calculations[t.topCalc] ? i.topCalc = Ve.calculations[t.topCalc] : console.warn("Column Calc Error - No such calculation found, ignoring: ", t.topCalc);
          break;
        case "function":
          i.topCalc = t.topCalc;
          break;
      }
      i.topCalc && (e.modules.columnCalcs = i, this.topCalcs.push(e), this.table.options.columnCalcs != "group" && this.initializeTopRow());
    }
    if (t.bottomCalc) {
      switch (typeof t.bottomCalc) {
        case "string":
          Ve.calculations[t.bottomCalc] ? i.botCalc = Ve.calculations[t.bottomCalc] : console.warn("Column Calc Error - No such calculation found, ignoring: ", t.bottomCalc);
          break;
        case "function":
          i.botCalc = t.bottomCalc;
          break;
      }
      i.botCalc && (e.modules.columnCalcs = i, this.botCalcs.push(e), this.table.options.columnCalcs != "group" && this.initializeBottomRow());
    }
  }
  //dummy functions to handle being mock column manager
  registerColumnField() {
  }
  removeCalcs() {
    var e = !1;
    this.topInitialized && (this.topInitialized = !1, this.topElement.parentNode.removeChild(this.topElement), e = !0), this.botInitialized && (this.botInitialized = !1, this.footerRemove(this.botElement), e = !0), e && this.table.rowManager.adjustTableSize();
  }
  reinitializeCalcs() {
    this.topCalcs.length && this.initializeTopRow(), this.botCalcs.length && this.initializeBottomRow();
  }
  initializeTopRow() {
    var e = document.createDocumentFragment();
    this.topInitialized || (e.appendChild(document.createElement("br")), e.appendChild(this.topElement), this.table.columnManager.getContentsElement().insertBefore(e, this.table.columnManager.headersElement.nextSibling), this.topInitialized = !0);
  }
  initializeBottomRow() {
    this.botInitialized || (this.footerPrepend(this.botElement), this.botInitialized = !0);
  }
  scrollHorizontal(e) {
    this.botInitialized && this.botRow && (this.botElement.scrollLeft = e);
  }
  recalc(e) {
    var t, i;
    if (!this.blockCheck() && (this.topInitialized || this.botInitialized)) {
      if (t = this.rowsToData(e), this.topInitialized) {
        for (this.topRow && this.topRow.deleteCells(), i = this.generateRow("top", t), this.topRow = i; this.topElement.firstChild; ) this.topElement.removeChild(this.topElement.firstChild);
        this.topElement.appendChild(i.getElement()), i.initialize(!0);
      }
      if (this.botInitialized) {
        for (this.botRow && this.botRow.deleteCells(), i = this.generateRow("bottom", t), this.botRow = i; this.botElement.firstChild; ) this.botElement.removeChild(this.botElement.firstChild);
        this.botElement.appendChild(i.getElement()), i.initialize(!0);
      }
      this.table.rowManager.adjustTableSize(), this.table.modExists("frozenColumns") && this.table.modules.frozenColumns.layout();
    }
  }
  recalcRowGroup(e) {
    this.recalcGroup(this.table.modules.groupRows.getRowGroup(e));
  }
  recalcAll() {
    if ((this.topCalcs.length || this.botCalcs.length) && (this.table.options.columnCalcs !== "group" && this.recalcActiveRows(), this.table.options.groupBy && this.table.options.columnCalcs !== "table")) {
      var e = this.table.modules.groupRows.getChildGroups();
      e.forEach((t) => {
        this.recalcGroup(t);
      });
    }
  }
  recalcGroup(e) {
    var t, i;
    this.blockCheck() || e && e.calcs && (e.calcs.bottom && (t = this.rowsToData(e.rows), i = this.generateRowData("bottom", t), e.calcs.bottom.updateData(i), e.calcs.bottom.reinitialize()), e.calcs.top && (t = this.rowsToData(e.rows), i = this.generateRowData("top", t), e.calcs.top.updateData(i), e.calcs.top.reinitialize()));
  }
  //generate top stats row
  generateTopRow(e) {
    return this.generateRow("top", this.rowsToData(e));
  }
  //generate bottom stats row
  generateBottomRow(e) {
    return this.generateRow("bottom", this.rowsToData(e));
  }
  rowsToData(e) {
    var t = [], i = this.table.options.dataTree && this.table.options.dataTreeChildColumnCalcs, s = this.table.modules.dataTree;
    return e.forEach((n) => {
      var o;
      t.push(n.getData()), i && ((o = n.modules.dataTree) != null && o.open) && this.rowsToData(s.getFilteredTreeChildren(n)).forEach((r) => {
        t.push(n);
      });
    }), t;
  }
  //generate stats row
  generateRow(e, t) {
    var i = this.generateRowData(e, t), s;
    return this.table.modExists("mutator") && this.table.modules.mutator.disable(), s = new re(i, this, "calc"), this.table.modExists("mutator") && this.table.modules.mutator.enable(), s.getElement().classList.add("tabulator-calcs", "tabulator-calcs-" + e), s.component = !1, s.getComponent = () => (s.component || (s.component = new Js(s)), s.component), s.generateCells = () => {
      var n = [];
      this.table.columnManager.columnsByIndex.forEach((o) => {
        this.genColumn.setField(o.getField()), this.genColumn.hozAlign = o.hozAlign, o.definition[e + "CalcFormatter"] && this.table.modExists("format") ? this.genColumn.modules.format = {
          formatter: this.table.modules.format.lookupFormatter(o.definition[e + "CalcFormatter"]),
          params: o.definition[e + "CalcFormatterParams"] || {}
        } : this.genColumn.modules.format = {
          formatter: this.table.modules.format.lookupFormatter("plaintext"),
          params: {}
        }, this.genColumn.definition.cssClass = o.definition.cssClass;
        var r = new kt(this.genColumn, s);
        r.getElement(), r.column = o, r.setWidth(), o.cells.push(r), n.push(r), o.visible || r.hide();
      }), s.cells = n;
    }, s;
  }
  //generate stats row
  generateRowData(e, t) {
    var i = {}, s = e == "top" ? this.topCalcs : this.botCalcs, n = e == "top" ? "topCalc" : "botCalc", o, r;
    return s.forEach(function(a) {
      var h = [];
      a.modules.columnCalcs && a.modules.columnCalcs[n] && (t.forEach(function(d) {
        h.push(a.getFieldValue(d));
      }), r = n + "Params", o = typeof a.modules.columnCalcs[r] == "function" ? a.modules.columnCalcs[r](h, t) : a.modules.columnCalcs[r], a.setFieldValue(i, a.modules.columnCalcs[n](h, t, o)));
    }), i;
  }
  hasTopCalcs() {
    return !!this.topCalcs.length;
  }
  hasBottomCalcs() {
    return !!this.botCalcs.length;
  }
  //handle table redraw
  redraw() {
    this.topRow && this.topRow.normalizeHeight(!0), this.botRow && this.botRow.normalizeHeight(!0);
  }
  //return the calculated
  getResults() {
    var e = {}, t;
    return this.table.options.groupBy && this.table.modExists("groupRows") ? (t = this.table.modules.groupRows.getGroups(!0), t.forEach((i) => {
      e[i.getKey()] = this.getGroupResults(i);
    })) : e = {
      top: this.topRow ? this.topRow.getData() : {},
      bottom: this.botRow ? this.botRow.getData() : {}
    }, e;
  }
  //get results from a group
  getGroupResults(e) {
    var t = e._getSelf(), i = e.getSubGroups(), s = {}, n = {};
    return i.forEach((o) => {
      s[o.getKey()] = this.getGroupResults(o);
    }), n = {
      top: t.calcs.top ? t.calcs.top.getData() : {},
      bottom: t.calcs.bottom ? t.calcs.bottom.getData() : {},
      groups: s
    }, n;
  }
  adjustForScrollbar(e) {
    this.botRow && (this.table.rtl ? this.botElement.style.paddingLeft = e + "px" : this.botElement.style.paddingRight = e + "px");
  }
};
x(Ve, "moduleName", "columnCalcs"), //load defaults
x(Ve, "calculations", Ys);
let Kt = Ve;
class Vi extends O {
  constructor(e) {
    super(e), this.indent = 10, this.field = "", this.collapseEl = null, this.expandEl = null, this.branchEl = null, this.elementField = !1, this.startOpen = function() {
    }, this.registerTableOption("dataTree", !1), this.registerTableOption("dataTreeFilter", !0), this.registerTableOption("dataTreeSort", !0), this.registerTableOption("dataTreeElementColumn", !1), this.registerTableOption("dataTreeBranchElement", !0), this.registerTableOption("dataTreeChildIndent", 9), this.registerTableOption("dataTreeChildField", "_children"), this.registerTableOption("dataTreeCollapseElement", !1), this.registerTableOption("dataTreeExpandElement", !1), this.registerTableOption("dataTreeStartExpanded", !1), this.registerTableOption("dataTreeChildColumnCalcs", !1), this.registerTableOption("dataTreeSelectPropagate", !1), this.registerComponentFunction("row", "treeCollapse", this.collapseRow.bind(this)), this.registerComponentFunction("row", "treeExpand", this.expandRow.bind(this)), this.registerComponentFunction("row", "treeToggle", this.toggleRow.bind(this)), this.registerComponentFunction("row", "getTreeParent", this.getTreeParent.bind(this)), this.registerComponentFunction("row", "getTreeChildren", this.getRowChildren.bind(this)), this.registerComponentFunction("row", "addTreeChild", this.addTreeChildRow.bind(this)), this.registerComponentFunction("row", "isTreeExpanded", this.isRowExpanded.bind(this));
  }
  initialize() {
    if (this.table.options.dataTree) {
      var e = null, t = this.table.options;
      switch (this.field = t.dataTreeChildField, this.indent = t.dataTreeChildIndent, this.options("movableRows") && console.warn("The movableRows option is not available with dataTree enabled, moving of child rows could result in unpredictable behavior"), t.dataTreeBranchElement ? t.dataTreeBranchElement === !0 ? (this.branchEl = document.createElement("div"), this.branchEl.classList.add("tabulator-data-tree-branch")) : typeof t.dataTreeBranchElement == "string" ? (e = document.createElement("div"), e.innerHTML = t.dataTreeBranchElement, this.branchEl = e.firstChild) : this.branchEl = t.dataTreeBranchElement : (this.branchEl = document.createElement("div"), this.branchEl.classList.add("tabulator-data-tree-branch-empty")), t.dataTreeCollapseElement ? typeof t.dataTreeCollapseElement == "string" ? (e = document.createElement("div"), e.innerHTML = t.dataTreeCollapseElement, this.collapseEl = e.firstChild) : this.collapseEl = t.dataTreeCollapseElement : (this.collapseEl = document.createElement("div"), this.collapseEl.classList.add("tabulator-data-tree-control"), this.collapseEl.tabIndex = 0, this.collapseEl.innerHTML = "<div class='tabulator-data-tree-control-collapse'></div>"), t.dataTreeExpandElement ? typeof t.dataTreeExpandElement == "string" ? (e = document.createElement("div"), e.innerHTML = t.dataTreeExpandElement, this.expandEl = e.firstChild) : this.expandEl = t.dataTreeExpandElement : (this.expandEl = document.createElement("div"), this.expandEl.classList.add("tabulator-data-tree-control"), this.expandEl.tabIndex = 0, this.expandEl.innerHTML = "<div class='tabulator-data-tree-control-expand'></div>"), typeof t.dataTreeStartExpanded) {
        case "boolean":
          this.startOpen = function(i, s) {
            return t.dataTreeStartExpanded;
          };
          break;
        case "function":
          this.startOpen = t.dataTreeStartExpanded;
          break;
        default:
          this.startOpen = function(i, s) {
            return t.dataTreeStartExpanded[s];
          };
          break;
      }
      this.subscribe("row-init", this.initializeRow.bind(this)), this.subscribe("row-layout-after", this.layoutRow.bind(this)), this.subscribe("row-deleting", this.rowDeleting.bind(this)), this.subscribe("row-deleted", this.rowDelete.bind(this), 0), this.subscribe("row-data-changed", this.rowDataChanged.bind(this), 10), this.subscribe("cell-value-updated", this.cellValueChanged.bind(this)), this.subscribe("edit-cancelled", this.cellValueChanged.bind(this)), this.subscribe("column-moving-rows", this.columnMoving.bind(this)), this.subscribe("table-built", this.initializeElementField.bind(this)), this.subscribe("table-redrawing", this.tableRedrawing.bind(this)), this.registerDisplayHandler(this.getRows.bind(this), 30);
    }
  }
  tableRedrawing(e) {
    var t;
    e && (t = this.table.rowManager.getRows(), t.forEach((i) => {
      this.reinitializeRowChildren(i);
    }));
  }
  initializeElementField() {
    var e = this.table.columnManager.getFirstVisibleColumn();
    this.elementField = this.table.options.dataTreeElementColumn || (e ? e.field : !1);
  }
  getRowChildren(e) {
    return this.getTreeChildren(e, !0);
  }
  columnMoving() {
    var e = [];
    return this.table.rowManager.rows.forEach((t) => {
      e = e.concat(this.getTreeChildren(t, !1, !0));
    }), e;
  }
  rowDataChanged(e, t, i) {
    this.redrawNeeded(i) && (this.initializeRow(e), t && (this.layoutRow(e), this.refreshData(!0)));
  }
  cellValueChanged(e) {
    var t = e.column.getField();
    t === this.elementField && this.layoutRow(e.row);
  }
  initializeRow(e) {
    var t = e.getData()[this.field], i = Array.isArray(t), s = i || !i && typeof t == "object" && t !== null;
    !s && e.modules.dataTree && e.modules.dataTree.branchEl && e.modules.dataTree.branchEl.parentNode.removeChild(e.modules.dataTree.branchEl), !s && e.modules.dataTree && e.modules.dataTree.controlEl && e.modules.dataTree.controlEl.parentNode.removeChild(e.modules.dataTree.controlEl), e.modules.dataTree = {
      index: e.modules.dataTree ? e.modules.dataTree.index : 0,
      open: s ? e.modules.dataTree ? e.modules.dataTree.open : this.startOpen(e.getComponent(), 0) : !1,
      controlEl: e.modules.dataTree && s ? e.modules.dataTree.controlEl : !1,
      branchEl: e.modules.dataTree && s ? e.modules.dataTree.branchEl : !1,
      parent: e.modules.dataTree ? e.modules.dataTree.parent : !1,
      children: s
    };
  }
  reinitializeRowChildren(e) {
    var t = this.getTreeChildren(e, !1, !0);
    t.forEach(function(i) {
      i.reinitialize(!0);
    });
  }
  layoutRow(e) {
    var t = this.elementField ? e.getCell(this.elementField) : e.getCells()[0], i = t.getElement(), s = e.modules.dataTree;
    s.branchEl && (s.branchEl.parentNode && s.branchEl.parentNode.removeChild(s.branchEl), s.branchEl = !1), s.controlEl && (s.controlEl.parentNode && s.controlEl.parentNode.removeChild(s.controlEl), s.controlEl = !1), this.generateControlElement(e, i), e.getElement().classList.add("tabulator-tree-level-" + s.index), s.index && (this.branchEl ? (s.branchEl = this.branchEl.cloneNode(!0), i.insertBefore(s.branchEl, i.firstChild), this.table.rtl ? s.branchEl.style.marginRight = (s.branchEl.offsetWidth + s.branchEl.style.marginLeft) * (s.index - 1) + s.index * this.indent + "px" : s.branchEl.style.marginLeft = (s.branchEl.offsetWidth + s.branchEl.style.marginRight) * (s.index - 1) + s.index * this.indent + "px") : this.table.rtl ? i.style.paddingRight = parseInt(window.getComputedStyle(i, null).getPropertyValue("padding-right")) + s.index * this.indent + "px" : i.style.paddingLeft = parseInt(window.getComputedStyle(i, null).getPropertyValue("padding-left")) + s.index * this.indent + "px");
  }
  generateControlElement(e, t) {
    var i = e.modules.dataTree, s = i.controlEl;
    t = t || e.getCells()[0].getElement(), i.children !== !1 && (i.open ? (i.controlEl = this.collapseEl.cloneNode(!0), i.controlEl.addEventListener("click", (n) => {
      n.stopPropagation(), this.collapseRow(e);
    })) : (i.controlEl = this.expandEl.cloneNode(!0), i.controlEl.addEventListener("click", (n) => {
      n.stopPropagation(), this.expandRow(e);
    })), i.controlEl.addEventListener("mousedown", (n) => {
      n.stopPropagation();
    }), s && s.parentNode === t ? s.parentNode.replaceChild(i.controlEl, s) : t.insertBefore(i.controlEl, t.firstChild));
  }
  getRows(e) {
    var t = [];
    return e.forEach((i, s) => {
      var n, o;
      t.push(i), i instanceof re && (i.create(), n = i.modules.dataTree, !n.index && n.children !== !1 && (o = this.getChildren(i, !1, !0), o.forEach((r) => {
        r.create(), t.push(r);
      })));
    }), t;
  }
  getChildren(e, t, i) {
    var s = e.modules.dataTree, n = [], o = [];
    return s.children !== !1 && (s.open || t) && (Array.isArray(s.children) || (s.children = this.generateChildren(e)), this.table.modExists("filter") && this.table.options.dataTreeFilter ? n = this.table.modules.filter.filter(s.children) : n = s.children, this.table.modExists("sort") && this.table.options.dataTreeSort && this.table.modules.sort.sort(n, i), n.forEach((r) => {
      o.push(r);
      var a = this.getChildren(r, !1, !0);
      a.forEach((h) => {
        o.push(h);
      });
    })), o;
  }
  generateChildren(e) {
    var t = [], i = e.getData()[this.field];
    return Array.isArray(i) || (i = [i]), i.forEach((s) => {
      var n = new re(s || {}, this.table.rowManager);
      n.create(), n.modules.dataTree.index = e.modules.dataTree.index + 1, n.modules.dataTree.parent = e, n.modules.dataTree.children && (n.modules.dataTree.open = this.startOpen(n.getComponent(), n.modules.dataTree.index)), t.push(n);
    }), t;
  }
  expandRow(e, t) {
    var i = e.modules.dataTree;
    i.children !== !1 && (i.open = !0, e.reinitialize(), this.refreshData(!0), this.dispatchExternal("dataTreeRowExpanded", e.getComponent(), e.modules.dataTree.index));
  }
  collapseRow(e) {
    var t = e.modules.dataTree;
    t.children !== !1 && (t.open = !1, e.reinitialize(), this.refreshData(!0), this.dispatchExternal("dataTreeRowCollapsed", e.getComponent(), e.modules.dataTree.index));
  }
  toggleRow(e) {
    var t = e.modules.dataTree;
    t.children !== !1 && (t.open ? this.collapseRow(e) : this.expandRow(e));
  }
  isRowExpanded(e) {
    return e.modules.dataTree.open;
  }
  getTreeParent(e) {
    return e.modules.dataTree.parent ? e.modules.dataTree.parent.getComponent() : !1;
  }
  getTreeParentRoot(e) {
    return e.modules.dataTree && e.modules.dataTree.parent ? this.getTreeParentRoot(e.modules.dataTree.parent) : e;
  }
  getFilteredTreeChildren(e) {
    var t = e.modules.dataTree, i = [], s;
    return t.children && (Array.isArray(t.children) || (t.children = this.generateChildren(e)), this.table.modExists("filter") && this.table.options.dataTreeFilter ? s = this.table.modules.filter.filter(t.children) : s = t.children, s.forEach((n) => {
      n instanceof re && i.push(n);
    })), i;
  }
  rowDeleting(e) {
    var t = e.modules.dataTree;
    t && t.children && Array.isArray(t.children) && t.children.forEach((i) => {
      i instanceof re && i.wipe();
    });
  }
  rowDelete(e) {
    var t = e.modules.dataTree.parent, i;
    t && (i = this.findChildIndex(e, t), i !== !1 && t.data[this.field].splice(i, 1), t.data[this.field].length || delete t.data[this.field], this.initializeRow(t), this.layoutRow(t)), this.refreshData(!0);
  }
  addTreeChildRow(e, t, i, s) {
    var n = !1;
    typeof t == "string" && (t = JSON.parse(t)), Array.isArray(e.data[this.field]) || (e.data[this.field] = [], e.modules.dataTree.open = this.startOpen(e.getComponent(), e.modules.dataTree.index)), typeof s < "u" && (n = this.findChildIndex(s, e), n !== !1 && e.data[this.field].splice(i ? n : n + 1, 0, t)), n === !1 && (i ? e.data[this.field].unshift(t) : e.data[this.field].push(t)), this.initializeRow(e), this.layoutRow(e), this.refreshData(!0);
  }
  findChildIndex(e, t) {
    var i = !1;
    return typeof e == "object" ? e instanceof re ? i = e.data : e instanceof Pt ? i = e._getSelf().data : typeof HTMLElement < "u" && e instanceof HTMLElement ? t.modules.dataTree && (i = t.modules.dataTree.children.find((s) => s instanceof re ? s.element === e : !1), i && (i = i.data)) : e === null && (i = !1) : typeof e > "u" ? i = !1 : i = t.data[this.field].find((s) => s.data[this.table.options.index] == e), i && (Array.isArray(t.data[this.field]) && (i = t.data[this.field].indexOf(i)), i == -1 && (i = !1)), i;
  }
  getTreeChildren(e, t, i) {
    var s = e.modules.dataTree, n = [];
    return s && s.children && (Array.isArray(s.children) || (s.children = this.generateChildren(e)), s.children.forEach((o) => {
      o instanceof re && (n.push(t ? o.getComponent() : o), i && this.getTreeChildren(o, t, i).forEach((r) => {
        n.push(r);
      }));
    })), n;
  }
  getChildField() {
    return this.field;
  }
  redrawNeeded(e) {
    return (this.field ? typeof e[this.field] < "u" : !1) || (this.elementField ? typeof e[this.elementField] < "u" : !1);
  }
}
x(Vi, "moduleName", "dataTree");
function Qs(l, e = {}, t) {
  var i = e.delimiter ? e.delimiter : ",", s = [], n = [];
  l.forEach((o) => {
    var r = [];
    switch (o.type) {
      case "group":
        console.warn("Download Warning - CSV downloader cannot process row groups");
        break;
      case "calc":
        console.warn("Download Warning - CSV downloader cannot process column calculations");
        break;
      case "header":
        o.columns.forEach((a, h) => {
          a && a.depth === 1 && (n[h] = typeof a.value > "u" || a.value === null ? "" : '"' + String(a.value).split('"').join('""') + '"');
        });
        break;
      case "row":
        o.columns.forEach((a) => {
          if (a) {
            switch (typeof a.value) {
              case "object":
                a.value = a.value !== null ? JSON.stringify(a.value) : "";
                break;
              case "undefined":
                a.value = "";
                break;
            }
            r.push('"' + String(a.value).split('"').join('""') + '"');
          }
        }), s.push(r.join(i));
        break;
    }
  }), n.length && s.unshift(n.join(i)), s = s.join(`
`), e.bom && (s = "\uFEFF" + s), t(s, "text/csv");
}
function Zs(l, e, t) {
  var i = [];
  l.forEach((s) => {
    var n = {};
    switch (s.type) {
      case "header":
        break;
      case "group":
        console.warn("Download Warning - JSON downloader cannot process row groups");
        break;
      case "calc":
        console.warn("Download Warning - JSON downloader cannot process column calculations");
        break;
      case "row":
        s.columns.forEach((o) => {
          o && (n[o.component.getTitleDownload() || o.component.getField()] = o.value);
        }), i.push(n);
        break;
    }
  }), i = JSON.stringify(i, null, "	"), t(i, "application/json");
}
function en(l, e = {}, t) {
  var i = [], s = [], n = {}, o = e.rowGroupStyles || {
    fontStyle: "bold",
    fontSize: 12,
    cellPadding: 6,
    fillColor: 220
  }, r = e.rowCalcStyles || {
    fontStyle: "bold",
    fontSize: 10,
    cellPadding: 4,
    fillColor: 232
  }, a = e.jsPDF || {}, h = e.title ? e.title : "", d, u;
  a.orientation || (a.orientation = e.orientation || "landscape"), a.unit || (a.unit = "pt"), l.forEach((g) => {
    switch (g.type) {
      case "header":
        i.push(c(g));
        break;
      case "group":
        s.push(c(g, o));
        break;
      case "calc":
        s.push(c(g, r));
        break;
      case "row":
        s.push(c(g));
        break;
    }
  });
  function c(g, m) {
    var E = [];
    return g.columns.forEach((w) => {
      var v;
      if (w) {
        switch (typeof w.value) {
          case "object":
            w.value = w.value !== null ? JSON.stringify(w.value) : "";
            break;
          case "undefined":
            w.value = "";
            break;
        }
        v = {
          content: w.value,
          colSpan: w.width,
          rowSpan: w.height
        }, m && (v.styles = m), E.push(v);
      }
    }), E;
  }
  d = this.dependencyRegistry.lookup("jspdf", "jsPDF"), u = new d(a), e.autoTable && (typeof e.autoTable == "function" ? n = e.autoTable(u) || {} : n = e.autoTable), h && (n.didDrawPage = function(g) {
    u.text(h, 40, 30);
  }), n.head = i, n.body = s, u.autoTable(n), e.documentProcessing && e.documentProcessing(u), t(u.output("arraybuffer"), "application/pdf");
}
function tn(l, e, t) {
  var i = this, s = e.sheetName || "Sheet1", n = this.dependencyRegistry.lookup("XLSX"), o = n.utils.book_new(), r = new ne(this), a = "compress" in e ? e.compress : !0, h = e.writeOptions || { bookType: "xlsx", bookSST: !0, compression: a }, d;
  h.type = "binary", o.SheetNames = [], o.Sheets = {};
  function u() {
    var m = [], E = [], w = {}, v = { s: { c: 0, r: 0 }, e: { c: l[0] ? l[0].columns.reduce((M, z) => M + (z && z.width ? z.width : 1), 0) : 0, r: l.length } };
    return l.forEach((M, z) => {
      var P = [];
      M.columns.forEach(function(D, V) {
        D ? (P.push(!(D.value instanceof Date) && typeof D.value == "object" ? JSON.stringify(D.value) : D.value), (D.width > 1 || D.height > -1) && (D.height > 1 || D.width > 1) && E.push({ s: { r: z, c: V }, e: { r: z + D.height - 1, c: V + D.width - 1 } })) : P.push("");
      }), m.push(P);
    }), n.utils.sheet_add_aoa(w, m), w["!ref"] = n.utils.encode_range(v), E.length && (w["!merges"] = E), w;
  }
  if (e.sheetOnly) {
    t(u());
    return;
  }
  if (e.sheets)
    for (var c in e.sheets)
      e.sheets[c] === !0 ? (o.SheetNames.push(c), o.Sheets[c] = u()) : (o.SheetNames.push(c), r.commsSend(e.sheets[c], "download", "intercept", {
        type: "xlsx",
        options: { sheetOnly: !0 },
        active: i.active,
        intercept: function(m) {
          o.Sheets[c] = m;
        }
      }));
  else
    o.SheetNames.push(s), o.Sheets[s] = u();
  e.documentProcessing && (o = e.documentProcessing(o));
  function g(m) {
    for (var E = new ArrayBuffer(m.length), w = new Uint8Array(E), v = 0; v != m.length; ++v) w[v] = m.charCodeAt(v) & 255;
    return E;
  }
  d = n.write(o, h), t(g(d), "application/octet-stream");
}
function sn(l, e, t) {
  this.modExists("export", !0) && t(this.modules.export.generateHTMLTable(l), "text/html");
}
function nn(l, e, t) {
  const i = [];
  l.forEach((s) => {
    const n = {};
    switch (s.type) {
      case "header":
        break;
      case "group":
        console.warn("Download Warning - JSON downloader cannot process row groups");
        break;
      case "calc":
        console.warn("Download Warning - JSON downloader cannot process column calculations");
        break;
      case "row":
        s.columns.forEach((o) => {
          o && (n[o.component.getTitleDownload() || o.component.getField()] = o.value);
        }), i.push(JSON.stringify(n));
        break;
    }
  }), t(i.join(`
`), "application/x-ndjson");
}
var on = {
  csv: Qs,
  json: Zs,
  jsonLines: nn,
  pdf: en,
  xlsx: tn,
  html: sn
};
const rt = class rt extends O {
  constructor(e) {
    super(e), this.registerTableOption("downloadEncoder", function(t, i) {
      return new Blob([t], { type: i });
    }), this.registerTableOption("downloadConfig", {}), this.registerTableOption("downloadRowRange", "active"), this.registerColumnOption("download"), this.registerColumnOption("titleDownload");
  }
  initialize() {
    this.deprecatedOptionsCheck(), this.registerTableFunction("download", this.download.bind(this)), this.registerTableFunction("downloadToTab", this.downloadToTab.bind(this));
  }
  deprecatedOptionsCheck() {
  }
  ///////////////////////////////////
  ///////// Table Functions /////////
  ///////////////////////////////////
  downloadToTab(e, t, i, s) {
    this.download(e, t, i, s, !0);
  }
  ///////////////////////////////////
  ///////// Internal Logic //////////
  ///////////////////////////////////
  //trigger file download
  download(e, t, i, s, n) {
    var o = !1;
    function r(h, d) {
      n ? n === !0 ? this.triggerDownload(h, d, e, t, !0) : n(h) : this.triggerDownload(h, d, e, t);
    }
    if (typeof e == "function" ? o = e : rt.downloaders[e] ? o = rt.downloaders[e] : console.warn("Download Error - No such download type found: ", e), o) {
      var a = this.generateExportList(s);
      o.call(this.table, a, i || {}, r.bind(this));
    }
  }
  generateExportList(e) {
    var t = this.table.modules.export.generateExportList(this.table.options.downloadConfig, !1, e || this.table.options.downloadRowRange, "download"), i = this.table.options.groupHeaderDownload;
    return i && !Array.isArray(i) && (i = [i]), t.forEach((s) => {
      var n;
      s.type === "group" && (n = s.columns[0], i && i[s.indent] && (n.value = i[s.indent](n.value, s.component._group.getRowCount(), s.component._group.getData(), s.component)));
    }), t;
  }
  triggerDownload(e, t, i, s, n) {
    var o = document.createElement("a"), r = this.table.options.downloadEncoder(e, t);
    r && (n ? window.open(window.URL.createObjectURL(r)) : (s = s || "Tabulator." + (typeof i == "function" ? "txt" : i), navigator.msSaveOrOpenBlob ? navigator.msSaveOrOpenBlob(r, s) : (o.setAttribute("href", window.URL.createObjectURL(r)), o.setAttribute("download", s), o.style.display = "none", document.body.appendChild(o), o.click(), document.body.removeChild(o))), this.dispatchExternal("downloadComplete"));
  }
  commsReceived(e, t, i) {
    switch (t) {
      case "intercept":
        this.download(i.type, "", i.options, i.active, i.intercept);
        break;
    }
  }
};
x(rt, "moduleName", "download"), //load defaults
x(rt, "downloaders", on);
let Xt = rt;
function Ht(l, e) {
  var t = e.mask, i = typeof e.maskLetterChar < "u" ? e.maskLetterChar : "A", s = typeof e.maskNumberChar < "u" ? e.maskNumberChar : "9", n = typeof e.maskWildcardChar < "u" ? e.maskWildcardChar : "*";
  function o(r) {
    var a = t[r];
    typeof a < "u" && a !== n && a !== i && a !== s && (l.value = l.value + "" + a, o(r + 1));
  }
  l.addEventListener("keydown", (r) => {
    var a = l.value.length, h = r.key;
    if (r.keyCode > 46 && !r.ctrlKey && !r.metaKey) {
      if (a >= t.length)
        return r.preventDefault(), r.stopPropagation(), !1;
      switch (t[a]) {
        case i:
          if (h.toUpperCase() == h.toLowerCase())
            return r.preventDefault(), r.stopPropagation(), !1;
          break;
        case s:
          if (isNaN(h))
            return r.preventDefault(), r.stopPropagation(), !1;
          break;
        case n:
          break;
        default:
          if (h !== t[a])
            return r.preventDefault(), r.stopPropagation(), !1;
      }
    }
  }), l.addEventListener("keyup", (r) => {
    r.keyCode > 46 && e.maskAutoFill && o(l.value.length);
  }), l.placeholder || (l.placeholder = t), e.maskAutoFill && o(l.value.length);
}
function rn(l, e, t, i, s) {
  var n = l.getValue(), o = document.createElement("input");
  if (o.setAttribute("type", s.search ? "search" : "text"), o.style.padding = "4px", o.style.width = "100%", o.style.boxSizing = "border-box", s.elementAttributes && typeof s.elementAttributes == "object")
    for (let a in s.elementAttributes)
      a.charAt(0) == "+" ? (a = a.slice(1), o.setAttribute(a, o.getAttribute(a) + s.elementAttributes["+" + a])) : o.setAttribute(a, s.elementAttributes[a]);
  o.value = typeof n < "u" ? n : "", e(function() {
    l.getType() === "cell" && (o.focus({ preventScroll: !0 }), o.style.height = "100%", s.selectContents && o.select());
  });
  function r(a) {
    (n === null || typeof n > "u") && o.value !== "" || o.value !== n ? t(o.value) && (n = o.value) : i();
  }
  return o.addEventListener("change", r), o.addEventListener("blur", r), o.addEventListener("keydown", function(a) {
    switch (a.keyCode) {
      case 13:
        r();
        break;
      case 27:
        i();
        break;
      case 35:
      case 36:
        a.stopPropagation();
        break;
    }
  }), s.mask && Ht(o, s), o;
}
function an(l, e, t, i, s) {
  var n = l.getValue(), o = s.verticalNavigation || "hybrid", r = String(n !== null && typeof n < "u" ? n : ""), a = document.createElement("textarea"), h = 0;
  if (a.style.display = "block", a.style.padding = "2px", a.style.height = "100%", a.style.width = "100%", a.style.boxSizing = "border-box", a.style.whiteSpace = "pre-wrap", a.style.resize = "none", s.elementAttributes && typeof s.elementAttributes == "object")
    for (let u in s.elementAttributes)
      u.charAt(0) == "+" ? (u = u.slice(1), a.setAttribute(u, a.getAttribute(u) + s.elementAttributes["+" + u])) : a.setAttribute(u, s.elementAttributes[u]);
  a.value = r, e(function() {
    l.getType() === "cell" && (a.focus({ preventScroll: !0 }), a.style.height = "100%", a.scrollHeight, a.style.height = a.scrollHeight + "px", l.getRow().normalizeHeight(), s.selectContents && a.select());
  });
  function d(u) {
    (n === null || typeof n > "u") && a.value !== "" || a.value !== n ? (t(a.value) && (n = a.value), setTimeout(function() {
      l.getRow().normalizeHeight();
    }, 300)) : i();
  }
  return a.addEventListener("change", d), a.addEventListener("blur", d), a.addEventListener("keyup", function() {
    a.style.height = "";
    var u = a.scrollHeight;
    a.style.height = u + "px", u != h && (h = u, l.getRow().normalizeHeight());
  }), a.addEventListener("keydown", function(u) {
    switch (u.keyCode) {
      case 13:
        u.shiftKey && s.shiftEnterSubmit && d();
        break;
      case 27:
        i();
        break;
      case 38:
        (o == "editor" || o == "hybrid" && a.selectionStart) && (u.stopImmediatePropagation(), u.stopPropagation());
        break;
      case 40:
        (o == "editor" || o == "hybrid" && a.selectionStart !== a.value.length) && (u.stopImmediatePropagation(), u.stopPropagation());
        break;
      case 35:
      case 36:
        u.stopPropagation();
        break;
    }
  }), s.mask && Ht(a, s), a;
}
function ln(l, e, t, i, s) {
  var n = l.getValue(), o = s.verticalNavigation || "editor", r = document.createElement("input");
  if (r.setAttribute("type", "number"), typeof s.max < "u" && r.setAttribute("max", s.max), typeof s.min < "u" && r.setAttribute("min", s.min), typeof s.step < "u" && r.setAttribute("step", s.step), r.style.padding = "4px", r.style.width = "100%", r.style.boxSizing = "border-box", s.elementAttributes && typeof s.elementAttributes == "object")
    for (let d in s.elementAttributes)
      d.charAt(0) == "+" ? (d = d.slice(1), r.setAttribute(d, r.getAttribute(d) + s.elementAttributes["+" + d])) : r.setAttribute(d, s.elementAttributes[d]);
  r.value = n;
  var a = function(d) {
    h();
  };
  e(function() {
    l.getType() === "cell" && (r.removeEventListener("blur", a), r.focus({ preventScroll: !0 }), r.style.height = "100%", r.addEventListener("blur", a), s.selectContents && r.select());
  });
  function h() {
    var d = r.value;
    !isNaN(d) && d !== "" && (d = Number(d)), d !== n ? t(d) && (n = d) : i();
  }
  return r.addEventListener("keydown", function(d) {
    switch (d.keyCode) {
      case 13:
        h();
        break;
      case 27:
        i();
        break;
      case 38:
      case 40:
        o == "editor" && (d.stopImmediatePropagation(), d.stopPropagation());
        break;
      case 35:
      case 36:
        d.stopPropagation();
        break;
    }
  }), s.mask && Ht(r, s), r;
}
function hn(l, e, t, i, s) {
  var n = l.getValue(), o = document.createElement("input");
  if (o.setAttribute("type", "range"), typeof s.max < "u" && o.setAttribute("max", s.max), typeof s.min < "u" && o.setAttribute("min", s.min), typeof s.step < "u" && o.setAttribute("step", s.step), o.style.padding = "4px", o.style.width = "100%", o.style.boxSizing = "border-box", s.elementAttributes && typeof s.elementAttributes == "object")
    for (let a in s.elementAttributes)
      a.charAt(0) == "+" ? (a = a.slice(1), o.setAttribute(a, o.getAttribute(a) + s.elementAttributes["+" + a])) : o.setAttribute(a, s.elementAttributes[a]);
  o.value = n, e(function() {
    l.getType() === "cell" && (o.focus({ preventScroll: !0 }), o.style.height = "100%");
  });
  function r() {
    var a = o.value;
    !isNaN(a) && a !== "" && (a = Number(a)), a != n ? t(a) && (n = a) : i();
  }
  return o.addEventListener("blur", function(a) {
    r();
  }), o.addEventListener("keydown", function(a) {
    switch (a.keyCode) {
      case 13:
        r();
        break;
      case 27:
        i();
        break;
    }
  }), o;
}
function dn(l, e, t, i, s) {
  var n = s.format, o = s.verticalNavigation || "editor", r = n ? window.DateTime || luxon.DateTime : null, a = l.getValue(), h = document.createElement("input");
  function d(c) {
    var g;
    return r.isDateTime(c) ? g = c : n === "iso" ? g = r.fromISO(String(c)) : g = r.fromFormat(String(c), n), g.toFormat("yyyy-MM-dd");
  }
  if (h.type = "date", h.style.padding = "4px", h.style.width = "100%", h.style.boxSizing = "border-box", s.max && h.setAttribute("max", n ? d(s.max) : s.max), s.min && h.setAttribute("min", n ? d(s.min) : s.min), s.elementAttributes && typeof s.elementAttributes == "object")
    for (let c in s.elementAttributes)
      c.charAt(0) == "+" ? (c = c.slice(1), h.setAttribute(c, h.getAttribute(c) + s.elementAttributes["+" + c])) : h.setAttribute(c, s.elementAttributes[c]);
  a = typeof a < "u" ? a : "", n && (r ? a = d(a) : console.error("Editor Error - 'date' editor 'format' param is dependant on luxon.js")), h.value = a, e(function() {
    l.getType() === "cell" && (h.focus({ preventScroll: !0 }), h.style.height = "100%", s.selectContents && h.select());
  });
  function u() {
    var c = h.value, g;
    if ((a === null || typeof a > "u") && c !== "" || c !== a) {
      if (c && n)
        switch (g = r.fromFormat(String(c), "yyyy-MM-dd"), n) {
          case !0:
            c = g;
            break;
          case "iso":
            c = g.toISO();
            break;
          default:
            c = g.toFormat(n);
        }
      t(c) && (a = h.value);
    } else
      i();
  }
  return h.addEventListener("blur", function(c) {
    (c.relatedTarget || c.rangeParent || c.explicitOriginalTarget !== h) && u();
  }), h.addEventListener("keydown", function(c) {
    switch (c.keyCode) {
      case 13:
        u();
        break;
      case 27:
        i();
        break;
      case 35:
      case 36:
        c.stopPropagation();
        break;
      case 38:
      case 40:
        o == "editor" && (c.stopImmediatePropagation(), c.stopPropagation());
        break;
    }
  }), h;
}
function un(l, e, t, i, s) {
  var n = s.format, o = s.verticalNavigation || "editor", r = n ? window.DateTime || luxon.DateTime : null, a, h = l.getValue(), d = document.createElement("input");
  if (d.type = "time", d.style.padding = "4px", d.style.width = "100%", d.style.boxSizing = "border-box", s.elementAttributes && typeof s.elementAttributes == "object")
    for (let c in s.elementAttributes)
      c.charAt(0) == "+" ? (c = c.slice(1), d.setAttribute(c, d.getAttribute(c) + s.elementAttributes["+" + c])) : d.setAttribute(c, s.elementAttributes[c]);
  h = typeof h < "u" ? h : "", n && (r ? (r.isDateTime(h) ? a = h : n === "iso" ? a = r.fromISO(String(h)) : a = r.fromFormat(String(h), n), h = a.toFormat("HH:mm")) : console.error("Editor Error - 'date' editor 'format' param is dependant on luxon.js")), d.value = h, e(function() {
    l.getType() == "cell" && (d.focus({ preventScroll: !0 }), d.style.height = "100%", s.selectContents && d.select());
  });
  function u() {
    var c = d.value, g;
    if ((h === null || typeof h > "u") && c !== "" || c !== h) {
      if (c && n)
        switch (g = r.fromFormat(String(c), "hh:mm"), n) {
          case !0:
            c = g;
            break;
          case "iso":
            c = g.toISO();
            break;
          default:
            c = g.toFormat(n);
        }
      t(c) && (h = d.value);
    } else
      i();
  }
  return d.addEventListener("blur", function(c) {
    (c.relatedTarget || c.rangeParent || c.explicitOriginalTarget !== d) && u();
  }), d.addEventListener("keydown", function(c) {
    switch (c.keyCode) {
      case 13:
        u();
        break;
      case 27:
        i();
        break;
      case 35:
      case 36:
        c.stopPropagation();
        break;
      case 38:
      case 40:
        o == "editor" && (c.stopImmediatePropagation(), c.stopPropagation());
        break;
    }
  }), d;
}
function cn(l, e, t, i, s) {
  var n = s.format, o = s.verticalNavigation || "editor", r = n ? this.table.dependencyRegistry.lookup(["luxon", "DateTime"], "DateTime") : null, a, h = l.getValue(), d = document.createElement("input");
  if (d.type = "datetime-local", d.style.padding = "4px", d.style.width = "100%", d.style.boxSizing = "border-box", s.elementAttributes && typeof s.elementAttributes == "object")
    for (let c in s.elementAttributes)
      c.charAt(0) == "+" ? (c = c.slice(1), d.setAttribute(c, d.getAttribute(c) + s.elementAttributes["+" + c])) : d.setAttribute(c, s.elementAttributes[c]);
  h = typeof h < "u" ? h : "", n && (r ? (r.isDateTime(h) ? a = h : n === "iso" ? a = r.fromISO(String(h)) : a = r.fromFormat(String(h), n), h = a.toFormat("yyyy-MM-dd") + "T" + a.toFormat("HH:mm")) : console.error("Editor Error - 'date' editor 'format' param is dependant on luxon.js")), d.value = h, e(function() {
    l.getType() === "cell" && (d.focus({ preventScroll: !0 }), d.style.height = "100%", s.selectContents && d.select());
  });
  function u() {
    var c = d.value, g;
    if ((h === null || typeof h > "u") && c !== "" || c !== h) {
      if (c && n)
        switch (g = r.fromISO(String(c)), n) {
          case !0:
            c = g;
            break;
          case "iso":
            c = g.toISO();
            break;
          default:
            c = g.toFormat(n);
        }
      t(c) && (h = d.value);
    } else
      i();
  }
  return d.addEventListener("blur", function(c) {
    (c.relatedTarget || c.rangeParent || c.explicitOriginalTarget !== d) && u();
  }), d.addEventListener("keydown", function(c) {
    switch (c.keyCode) {
      case 13:
        u();
        break;
      case 27:
        i();
        break;
      case 35:
      case 36:
        c.stopPropagation();
        break;
      case 38:
      case 40:
        o == "editor" && (c.stopImmediatePropagation(), c.stopPropagation());
        break;
    }
  }), d;
}
let fn = class {
  constructor(e, t, i, s, n, o) {
    this.edit = e, this.table = e.table, this.cell = t, this.params = this._initializeParams(o), this.data = [], this.displayItems = [], this.currentItems = [], this.focusedItem = null, this.input = this._createInputElement(), this.listEl = this._createListElement(), this.initialValues = null, this.isFilter = t.getType() === "header", this.filterTimeout = null, this.filtered = !1, this.typing = !1, this.values = [], this.popup = null, this.listIteration = 0, this.lastAction = "", this.filterTerm = "", this.blurable = !0, this.actions = {
      success: s,
      cancel: n
    }, this._deprecatedOptionsCheck(), this._initializeValue(), i(this._onRendered.bind(this));
  }
  _deprecatedOptionsCheck() {
  }
  _initializeValue() {
    var e = this.cell.getValue();
    typeof e > "u" && typeof this.params.defaultValue < "u" && (e = this.params.defaultValue), this.initialValues = this.params.multiselect ? e : [e], this.isFilter && (this.input.value = this.initialValues ? this.initialValues.join(",") : "", this.headerFilterInitialListGen());
  }
  _onRendered() {
    var e = this.cell.getElement();
    function t(i) {
      i.stopPropagation();
    }
    this.isFilter || (this.input.style.height = "100%", this.input.focus({ preventScroll: !0 })), e.addEventListener("click", t), setTimeout(() => {
      e.removeEventListener("click", t);
    }, 1e3), this.input.addEventListener("mousedown", this._preventPopupBlur.bind(this));
  }
  _createListElement() {
    var e = document.createElement("div");
    return e.classList.add("tabulator-edit-list"), e.addEventListener("mousedown", this._preventBlur.bind(this)), e.addEventListener("keydown", this._inputKeyDown.bind(this)), e;
  }
  _setListWidth() {
    var e = this.isFilter ? this.input : this.cell.getElement();
    this.listEl.style.minWidth = e.offsetWidth + "px", this.params.maxWidth && (this.params.maxWidth === !0 ? this.listEl.style.maxWidth = e.offsetWidth + "px" : typeof this.params.maxWidth == "number" ? this.listEl.style.maxWidth = this.params.maxWidth + "px" : this.listEl.style.maxWidth = this.params.maxWidth);
  }
  _createInputElement() {
    var e = this.params.elementAttributes, t = document.createElement("input");
    if (t.setAttribute("type", this.params.clearable ? "search" : "text"), t.style.padding = "4px", t.style.width = "100%", t.style.boxSizing = "border-box", this.params.autocomplete || (t.style.cursor = "default", t.style.caretColor = "transparent"), e && typeof e == "object")
      for (let i in e)
        i.charAt(0) == "+" ? (i = i.slice(1), t.setAttribute(i, t.getAttribute(i) + e["+" + i])) : t.setAttribute(i, e[i]);
    return this.params.mask && Ht(t, this.params), this._bindInputEvents(t), t;
  }
  _initializeParams(e) {
    var t = ["values", "valuesURL", "valuesLookup"], i;
    return e = Object.assign({}, e), e.verticalNavigation = e.verticalNavigation || "editor", e.placeholderLoading = typeof e.placeholderLoading > "u" ? "Searching ..." : e.placeholderLoading, e.placeholderEmpty = typeof e.placeholderEmpty > "u" ? "No Results Found" : e.placeholderEmpty, e.filterDelay = typeof e.filterDelay > "u" ? 300 : e.filterDelay, e.emptyValue = Object.keys(e).includes("emptyValue") ? e.emptyValue : "", i = Object.keys(e).filter((s) => t.includes(s)).length, i ? i > 1 && console.warn("list editor config error - only one of the values, valuesURL, or valuesLookup options can be set on the same editor") : console.warn("list editor config error - either the values, valuesURL, or valuesLookup option must be set"), e.autocomplete ? e.multiselect && (e.multiselect = !1, console.warn("list editor config error - multiselect option is not available when autocomplete is enabled")) : (e.freetext && (e.freetext = !1, console.warn("list editor config error - freetext option is only available when autocomplete is enabled")), e.filterFunc && (e.filterFunc = !1, console.warn("list editor config error - filterFunc option is only available when autocomplete is enabled")), e.filterRemote && (e.filterRemote = !1, console.warn("list editor config error - filterRemote option is only available when autocomplete is enabled")), e.mask && (e.mask = !1, console.warn("list editor config error - mask option is only available when autocomplete is enabled")), e.allowEmpty && (e.allowEmpty = !1, console.warn("list editor config error - allowEmpty option is only available when autocomplete is enabled")), e.listOnEmpty && (e.listOnEmpty = !1, console.warn("list editor config error - listOnEmpty option is only available when autocomplete is enabled"))), e.filterRemote && !(typeof e.valuesLookup == "function" || e.valuesURL) && (e.filterRemote = !1, console.warn("list editor config error - filterRemote option should only be used when values list is populated from a remote source")), e;
  }
  //////////////////////////////////////
  ////////// Event Handling ////////////
  //////////////////////////////////////
  _bindInputEvents(e) {
    e.addEventListener("focus", this._inputFocus.bind(this)), e.addEventListener("click", this._inputClick.bind(this)), e.addEventListener("blur", this._inputBlur.bind(this)), e.addEventListener("keydown", this._inputKeyDown.bind(this)), e.addEventListener("search", this._inputSearch.bind(this)), this.params.autocomplete && e.addEventListener("keyup", this._inputKeyUp.bind(this));
  }
  _inputFocus(e) {
    this.rebuildOptionsList();
  }
  _filter() {
    this.params.filterRemote ? (clearTimeout(this.filterTimeout), this.filterTimeout = setTimeout(() => {
      this.rebuildOptionsList();
    }, this.params.filterDelay)) : this._filterList();
  }
  _inputClick(e) {
    e.stopPropagation();
  }
  _inputBlur(e) {
    this.blurable && (this.popup ? this.popup.hide() : this._resolveValue(!0));
  }
  _inputSearch() {
    this._clearChoices();
  }
  _inputKeyDown(e) {
    switch (e.keyCode) {
      case 38:
        this._keyUp(e);
        break;
      case 40:
        this._keyDown(e);
        break;
      case 37:
      case 39:
        this._keySide(e);
        break;
      case 13:
        this._keyEnter();
        break;
      case 27:
        this._keyEsc();
        break;
      case 36:
      case 35:
        this._keyHomeEnd(e);
        break;
      case 9:
        this._keyTab(e);
        break;
      default:
        this._keySelectLetter(e);
    }
  }
  _inputKeyUp(e) {
    switch (e.keyCode) {
      case 38:
      case 37:
      case 39:
      case 40:
      case 13:
      case 27:
        break;
      default:
        this._keyAutoCompLetter(e);
    }
  }
  _preventPopupBlur() {
    this.popup && this.popup.blockHide(), setTimeout(() => {
      this.popup && this.popup.restoreHide();
    }, 10);
  }
  _preventBlur() {
    this.blurable = !1, setTimeout(() => {
      this.blurable = !0;
    }, 10);
  }
  //////////////////////////////////////
  //////// Keyboard Navigation /////////
  //////////////////////////////////////
  _keyTab(e) {
    this.params.autocomplete && this.lastAction === "typing" ? this._resolveValue(!0) : this.focusedItem && this._chooseItem(this.focusedItem, !0);
  }
  _keyUp(e) {
    var t = this.displayItems.indexOf(this.focusedItem);
    (this.params.verticalNavigation == "editor" || this.params.verticalNavigation == "hybrid" && t) && (e.stopImmediatePropagation(), e.stopPropagation(), e.preventDefault(), t > 0 && this._focusItem(this.displayItems[t - 1]));
  }
  _keyDown(e) {
    var t = this.displayItems.indexOf(this.focusedItem);
    (this.params.verticalNavigation == "editor" || this.params.verticalNavigation == "hybrid" && t < this.displayItems.length - 1) && (e.stopImmediatePropagation(), e.stopPropagation(), e.preventDefault(), t < this.displayItems.length - 1 && (t == -1 ? this._focusItem(this.displayItems[0]) : this._focusItem(this.displayItems[t + 1])));
  }
  _keySide(e) {
    this.params.autocomplete || (e.stopImmediatePropagation(), e.stopPropagation(), e.preventDefault());
  }
  _keyEnter(e) {
    this.params.autocomplete && this.lastAction === "typing" ? this._resolveValue(!0) : this.focusedItem && this._chooseItem(this.focusedItem);
  }
  _keyEsc(e) {
    this._cancel();
  }
  _keyHomeEnd(e) {
    this.params.autocomplete && e.stopImmediatePropagation();
  }
  _keySelectLetter(e) {
    this.params.autocomplete || (e.preventDefault(), e.keyCode >= 38 && e.keyCode <= 90 && this._scrollToValue(e.keyCode));
  }
  _keyAutoCompLetter(e) {
    this._filter(), this.lastAction = "typing", this.typing = !0;
  }
  _scrollToValue(e) {
    clearTimeout(this.filterTimeout);
    var t = String.fromCharCode(e).toLowerCase();
    this.filterTerm += t.toLowerCase();
    var i = this.displayItems.find((s) => typeof s.label < "u" && s.label.toLowerCase().startsWith(this.filterTerm));
    i && this._focusItem(i), this.filterTimeout = setTimeout(() => {
      this.filterTerm = "";
    }, 800);
  }
  _focusItem(e) {
    this.lastAction = "focus", this.focusedItem && this.focusedItem.element && this.focusedItem.element.classList.remove("focused"), this.focusedItem = e, e && e.element && (e.element.classList.add("focused"), e.element.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" }));
  }
  //////////////////////////////////////
  /////// Data List Generation /////////
  //////////////////////////////////////
  headerFilterInitialListGen() {
    this._generateOptions(!0);
  }
  rebuildOptionsList() {
    this._generateOptions().then(this._sortOptions.bind(this)).then(this._buildList.bind(this)).then(this._showList.bind(this)).catch((e) => {
      Number.isInteger(e) || console.error("List generation error", e);
    });
  }
  _filterList() {
    this._buildList(this._filterOptions()), this._showList();
  }
  _generateOptions(e) {
    var t = [], i = ++this.listIteration;
    return this.filtered = !1, this.params.values ? t = this.params.values : this.params.valuesURL ? t = this._ajaxRequest(this.params.valuesURL, this.input.value) : typeof this.params.valuesLookup == "function" ? t = this.params.valuesLookup(this.cell, this.input.value) : this.params.valuesLookup && (t = this._uniqueColumnValues(this.params.valuesLookupField)), t instanceof Promise ? (e || this._addPlaceholder(this.params.placeholderLoading), t.then().then((s) => this.listIteration === i ? this._parseList(s) : Promise.reject(i))) : Promise.resolve(this._parseList(t));
  }
  _addPlaceholder(e) {
    var t = document.createElement("div");
    typeof e == "function" && (e = e(this.cell.getComponent(), this.listEl)), e && (this._clearList(), e instanceof HTMLElement ? t = e : (t.classList.add("tabulator-edit-list-placeholder"), t.innerHTML = e), this.listEl.appendChild(t), this._showList());
  }
  _ajaxRequest(e, t) {
    var i = this.params.filterRemote ? { term: t } : {};
    return e = Ai(e, {}, i), fetch(e).then((s) => s.ok ? s.json().catch((n) => (console.warn("List Ajax Load Error - Invalid JSON returned", n), Promise.reject(n))) : (console.error("List Ajax Load Error - Connection Error: " + s.status, s.statusText), Promise.reject(s))).catch((s) => (console.error("List Ajax Load Error - Connection Error: ", s), Promise.reject(s)));
  }
  _uniqueColumnValues(e) {
    var t = {}, i = this.table.getData(this.params.valuesLookup), s;
    return e ? s = this.table.columnManager.getColumnByField(e) : s = this.cell.getColumn()._getSelf(), s ? i.forEach((n) => {
      var o = s.getFieldValue(n);
      this._emptyValueCheck(o) || (this.params.multiselect && Array.isArray(o) ? o.forEach((r) => {
        this._emptyValueCheck(r) || (t[r] = !0);
      }) : t[o] = !0);
    }) : (console.warn("unable to find matching column to create select lookup list:", e), t = []), Object.keys(t);
  }
  _emptyValueCheck(e) {
    return e === null || typeof e > "u" || e === "";
  }
  _parseList(e) {
    var t = [];
    return Array.isArray(e) || (e = Object.entries(e).map(([i, s]) => ({
      label: s,
      value: i
    }))), e.forEach((i) => {
      typeof i != "object" && (i = {
        label: i,
        value: i
      }), this._parseListItem(i, t, 0);
    }), !this.currentItems.length && this.params.freetext && (this.input.value = this.initialValues, this.typing = !0, this.lastAction = "typing"), this.data = t, t;
  }
  _parseListItem(e, t, i) {
    var s = {};
    e.options ? s = this._parseListGroup(e, i + 1) : (s = {
      label: e.label,
      value: e.value,
      itemParams: e.itemParams,
      elementAttributes: e.elementAttributes,
      element: !1,
      selected: !1,
      visible: !0,
      level: i,
      original: e
    }, this.initialValues && this.initialValues.indexOf(e.value) > -1 && this._chooseItem(s, !0)), t.push(s);
  }
  _parseListGroup(e, t) {
    var i = {
      label: e.label,
      group: !0,
      itemParams: e.itemParams,
      elementAttributes: e.elementAttributes,
      element: !1,
      visible: !0,
      level: t,
      options: [],
      original: e
    };
    return e.options.forEach((s) => {
      this._parseListItem(s, i.options, t);
    }), i;
  }
  _sortOptions(e) {
    var t;
    return this.params.sort && (t = typeof this.params.sort == "function" ? this.params.sort : this._defaultSortFunction.bind(this), this._sortGroup(t, e)), e;
  }
  _sortGroup(e, t) {
    t.sort((i, s) => e(i.label, s.label, i.value, s.value, i.original, s.original)), t.forEach((i) => {
      i.group && this._sortGroup(e, i.options);
    });
  }
  _defaultSortFunction(e, t) {
    var i, s, n, o, r = 0, a, h = /(\d+)|(\D+)/g, d = /\d/, u = 0;
    if (this.params.sort === "desc" && ([e, t] = [t, e]), !e && e !== 0)
      u = !t && t !== 0 ? 0 : -1;
    else if (!t && t !== 0)
      u = 1;
    else {
      if (isFinite(e) && isFinite(t)) return e - t;
      if (i = String(e).toLowerCase(), s = String(t).toLowerCase(), i === s) return 0;
      if (!(d.test(i) && d.test(s))) return i > s ? 1 : -1;
      for (i = i.match(h), s = s.match(h), a = i.length > s.length ? s.length : i.length; r < a; )
        if (n = i[r], o = s[r++], n !== o)
          return isFinite(n) && isFinite(o) ? (n.charAt(0) === "0" && (n = "." + n), o.charAt(0) === "0" && (o = "." + o), n - o) : n > o ? 1 : -1;
      return i.length > s.length;
    }
    return u;
  }
  _filterOptions() {
    var e = this.params.filterFunc || this._defaultFilterFunc, t = this.input.value;
    return t ? (this.filtered = !0, this.data.forEach((i) => {
      this._filterItem(e, t, i);
    })) : this.filtered = !1, this.data;
  }
  _filterItem(e, t, i) {
    var s = !1;
    return i.group ? (i.options.forEach((n) => {
      this._filterItem(e, t, n) && (s = !0);
    }), i.visible = s) : i.visible = e(t, i.label, i.value, i.original), i.visible;
  }
  _defaultFilterFunc(e, t, i, s) {
    return e = String(e).toLowerCase(), t !== null && typeof t < "u" && (String(t).toLowerCase().indexOf(e) > -1 || String(i).toLowerCase().indexOf(e) > -1);
  }
  //////////////////////////////////////
  /////////// Display List /////////////
  //////////////////////////////////////
  _clearList() {
    for (; this.listEl.firstChild; ) this.listEl.removeChild(this.listEl.firstChild);
    this.displayItems = [];
  }
  _buildList(e) {
    this._clearList(), e.forEach((t) => {
      this._buildItem(t);
    }), this.displayItems.length || this._addPlaceholder(this.params.placeholderEmpty);
  }
  _buildItem(e) {
    var t = e.element, i;
    if (!this.filtered || e.visible) {
      if (!t) {
        if (t = document.createElement("div"), t.tabIndex = 0, i = this.params.itemFormatter ? this.params.itemFormatter(e.label, e.value, e.original, t) : e.label, i instanceof HTMLElement ? t.appendChild(i) : t.innerHTML = i, e.group ? t.classList.add("tabulator-edit-list-group") : t.classList.add("tabulator-edit-list-item"), t.classList.add("tabulator-edit-list-group-level-" + e.level), e.elementAttributes && typeof e.elementAttributes == "object")
          for (let s in e.elementAttributes)
            s.charAt(0) == "+" ? (s = s.slice(1), t.setAttribute(s, this.input.getAttribute(s) + e.elementAttributes["+" + s])) : t.setAttribute(s, e.elementAttributes[s]);
        e.group ? t.addEventListener("click", this._groupClick.bind(this, e)) : t.addEventListener("click", this._itemClick.bind(this, e)), t.addEventListener("mousedown", this._preventBlur.bind(this)), e.element = t;
      }
      this._styleItem(e), this.listEl.appendChild(t), e.group ? e.options.forEach((s) => {
        this._buildItem(s);
      }) : this.displayItems.push(e);
    }
  }
  _showList() {
    var e = this.popup && this.popup.isVisible();
    if (this.input.parentNode) {
      if (this.params.autocomplete && this.input.value === "" && !this.params.listOnEmpty) {
        this.popup && this.popup.hide(!0);
        return;
      }
      this._setListWidth(), this.popup || (this.popup = this.edit.popup(this.listEl)), this.popup.show(this.cell.getElement(), "bottom"), e || setTimeout(() => {
        this.popup.hideOnBlur(this._resolveValue.bind(this, !0));
      }, 10);
    }
  }
  _styleItem(e) {
    e && e.element && (e.selected ? e.element.classList.add("active") : e.element.classList.remove("active"));
  }
  //////////////////////////////////////
  ///////// User Interaction ///////////
  //////////////////////////////////////
  _itemClick(e, t) {
    t.stopPropagation(), this._chooseItem(e);
  }
  _groupClick(e, t) {
    t.stopPropagation();
  }
  //////////////////////////////////////
  ////// Current Item Management ///////
  //////////////////////////////////////
  _cancel() {
    this.popup.hide(!0), this.actions.cancel();
  }
  _clearChoices() {
    this.typing = !0, this.currentItems.forEach((e) => {
      e.selected = !1, this._styleItem(e);
    }), this.currentItems = [], this.focusedItem = null;
  }
  _chooseItem(e, t) {
    var i;
    this.typing = !1, this.params.multiselect ? (i = this.currentItems.indexOf(e), i > -1 ? (this.currentItems.splice(i, 1), e.selected = !1) : (this.currentItems.push(e), e.selected = !0), this.input.value = this.currentItems.map((s) => s.label).join(","), this._styleItem(e)) : (this.currentItems = [e], e.selected = !0, this.input.value = e.label, this._styleItem(e), t || this._resolveValue()), this._focusItem(e);
  }
  _resolveValue(e) {
    var t, i;
    if (this.popup && this.popup.hide(!0), this.params.multiselect)
      t = this.currentItems.map((s) => s.value);
    else if (e && this.params.autocomplete && this.typing)
      if (this.params.freetext || this.params.allowEmpty && this.input.value === "")
        t = this.input.value;
      else {
        this.actions.cancel();
        return;
      }
    else
      this.currentItems[0] ? t = this.currentItems[0].value : (i = Array.isArray(this.initialValues) ? this.initialValues[0] : this.initialValues, i === null || typeof i > "u" || i === "" ? t = i : t = this.params.emptyValue);
    t === "" && (t = this.params.emptyValue), this.actions.success(t), this.isFilter && (this.initialValues = t && !Array.isArray(t) ? [t] : t, this.currentItems = []);
  }
};
function pn(l, e, t, i, s) {
  var n = new fn(this, l, e, t, i, s);
  return n.input;
}
function mn(l, e, t, i, s) {
  var n = this, o = l.getElement(), r = l.getValue(), a = o.getElementsByTagName("svg").length || 5, h = o.getElementsByTagName("svg")[0] ? o.getElementsByTagName("svg")[0].getAttribute("width") : 14, d = [], u = document.createElement("div"), c = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  function g(v) {
    d.forEach(function(M, z) {
      z < v ? (n.table.browser == "ie" ? M.setAttribute("class", "tabulator-star-active") : M.classList.replace("tabulator-star-inactive", "tabulator-star-active"), M.innerHTML = '<polygon fill="#488CE9" stroke="#014AAE" stroke-width="37.6152" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" points="259.216,29.942 330.27,173.919 489.16,197.007 374.185,309.08 401.33,467.31 259.216,392.612 117.104,467.31 144.25,309.08 29.274,197.007 188.165,173.919 "/>') : (n.table.browser == "ie" ? M.setAttribute("class", "tabulator-star-inactive") : M.classList.replace("tabulator-star-active", "tabulator-star-inactive"), M.innerHTML = '<polygon fill="#010155" stroke="#686868" stroke-width="37.6152" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" points="259.216,29.942 330.27,173.919 489.16,197.007 374.185,309.08 401.33,467.31 259.216,392.612 117.104,467.31 144.25,309.08 29.274,197.007 188.165,173.919 "/>');
    });
  }
  function m(v) {
    var M = document.createElement("span"), z = c.cloneNode(!0);
    d.push(z), M.addEventListener("mouseenter", function(P) {
      P.stopPropagation(), P.stopImmediatePropagation(), g(v);
    }), M.addEventListener("mousemove", function(P) {
      P.stopPropagation(), P.stopImmediatePropagation();
    }), M.addEventListener("click", function(P) {
      P.stopPropagation(), P.stopImmediatePropagation(), t(v), o.blur();
    }), M.appendChild(z), u.appendChild(M);
  }
  function E(v) {
    r = v, g(v);
  }
  if (o.style.whiteSpace = "nowrap", o.style.overflow = "hidden", o.style.textOverflow = "ellipsis", u.style.verticalAlign = "middle", u.style.display = "inline-block", u.style.padding = "4px", c.setAttribute("width", h), c.setAttribute("height", h), c.setAttribute("viewBox", "0 0 512 512"), c.setAttribute("xml:space", "preserve"), c.style.padding = "0 1px", s.elementAttributes && typeof s.elementAttributes == "object")
    for (let v in s.elementAttributes)
      v.charAt(0) == "+" ? (v = v.slice(1), u.setAttribute(v, u.getAttribute(v) + s.elementAttributes["+" + v])) : u.setAttribute(v, s.elementAttributes[v]);
  for (var w = 1; w <= a; w++)
    m(w);
  return r = Math.min(parseInt(r), a), g(r), u.addEventListener("mousemove", function(v) {
    g(0);
  }), u.addEventListener("click", function(v) {
    t(0);
  }), o.addEventListener("blur", function(v) {
    i();
  }), o.addEventListener("keydown", function(v) {
    switch (v.keyCode) {
      case 39:
        E(r + 1);
        break;
      case 37:
        E(r - 1);
        break;
      case 13:
        t(r);
        break;
      case 27:
        i();
        break;
    }
  }), u;
}
function gn(l, e, t, i, s) {
  var n = l.getElement(), o = typeof s.max > "u" ? n.getElementsByTagName("div")[0] && n.getElementsByTagName("div")[0].getAttribute("max") || 100 : s.max, r = typeof s.min > "u" ? n.getElementsByTagName("div")[0] && n.getElementsByTagName("div")[0].getAttribute("min") || 0 : s.min, a = (o - r) / 100, h = l.getValue() || 0, d = document.createElement("div"), u = document.createElement("div"), c, g;
  function m() {
    var E = window.getComputedStyle(n, null), w = a * Math.round(u.offsetWidth / ((n.clientWidth - parseInt(E.getPropertyValue("padding-left")) - parseInt(E.getPropertyValue("padding-right"))) / 100)) + r;
    t(w), n.setAttribute("aria-valuenow", w), n.setAttribute("aria-label", h);
  }
  if (d.style.position = "absolute", d.style.right = "0", d.style.top = "0", d.style.bottom = "0", d.style.width = "5px", d.classList.add("tabulator-progress-handle"), u.style.display = "inline-block", u.style.position = "relative", u.style.height = "100%", u.style.backgroundColor = "#488CE9", u.style.maxWidth = "100%", u.style.minWidth = "0%", s.elementAttributes && typeof s.elementAttributes == "object")
    for (let E in s.elementAttributes)
      E.charAt(0) == "+" ? (E = E.slice(1), u.setAttribute(E, u.getAttribute(E) + s.elementAttributes["+" + E])) : u.setAttribute(E, s.elementAttributes[E]);
  return n.style.padding = "4px 4px", h = Math.min(parseFloat(h), o), h = Math.max(parseFloat(h), r), h = Math.round((h - r) / a), u.style.width = h + "%", n.setAttribute("aria-valuemin", r), n.setAttribute("aria-valuemax", o), u.appendChild(d), d.addEventListener("mousedown", function(E) {
    c = E.screenX, g = u.offsetWidth;
  }), d.addEventListener("mouseover", function() {
    d.style.cursor = "ew-resize";
  }), n.addEventListener("mousemove", function(E) {
    c && (u.style.width = g + E.screenX - c + "px");
  }), n.addEventListener("mouseup", function(E) {
    c && (E.stopPropagation(), E.stopImmediatePropagation(), c = !1, g = !1, m());
  }), n.addEventListener("keydown", function(E) {
    switch (E.keyCode) {
      case 39:
        E.preventDefault(), u.style.width = u.clientWidth + n.clientWidth / 100 + "px";
        break;
      case 37:
        E.preventDefault(), u.style.width = u.clientWidth - n.clientWidth / 100 + "px";
        break;
      case 9:
      case 13:
        m();
        break;
      case 27:
        i();
        break;
    }
  }), n.addEventListener("blur", function() {
    i();
  }), u;
}
function bn(l, e, t, i, s) {
  var n = l.getValue(), o = document.createElement("input"), r = s.tristate, a = typeof s.indeterminateValue > "u" ? null : s.indeterminateValue, h = !1, d = Object.keys(s).includes("trueValue"), u = Object.keys(s).includes("falseValue");
  if (o.setAttribute("type", "checkbox"), o.style.marginTop = "5px", o.style.boxSizing = "border-box", s.elementAttributes && typeof s.elementAttributes == "object")
    for (let g in s.elementAttributes)
      g.charAt(0) == "+" ? (g = g.slice(1), o.setAttribute(g, o.getAttribute(g) + s.elementAttributes["+" + g])) : o.setAttribute(g, s.elementAttributes[g]);
  o.value = n, r && (typeof n > "u" || n === a || n === "") && (h = !0, o.indeterminate = !0), this.table.browser != "firefox" && this.table.browser != "safari" && e(function() {
    l.getType() === "cell" && o.focus({ preventScroll: !0 });
  }), o.checked = d ? n === s.trueValue : n === !0 || n === "true" || n === "True" || n === 1;
  function c(g) {
    var m = o.checked;
    return d && m ? m = s.trueValue : u && !m && (m = s.falseValue), r ? g ? h ? a : m : o.checked && !h ? (o.checked = !1, o.indeterminate = !0, h = !0, a) : (h = !1, m) : m;
  }
  return o.addEventListener("change", function(g) {
    t(c());
  }), o.addEventListener("blur", function(g) {
    t(c(!0));
  }), o.addEventListener("keydown", function(g) {
    g.keyCode == 13 && t(c()), g.keyCode == 27 && i();
  }), o;
}
function vn(l, e, t, i, s) {
  var n = l._getSelf().column, o, r, a;
  function h(d) {
    var u = d.getValue(), c = "input";
    switch (typeof u) {
      case "number":
        c = "number";
        break;
      case "boolean":
        c = "tickCross";
        break;
      case "string":
        u.includes(`
`) && (c = "textarea");
        break;
    }
    return c;
  }
  return o = s.editorLookup ? s.editorLookup(l) : h(l), s.paramsLookup && (a = typeof s.paramsLookup == "function" ? s.paramsLookup(o, l) : s.paramsLookup[o]), r = this.table.modules.edit.lookupEditor(o, n), r.call(this, l, e, t, i, a || {});
}
var wn = {
  input: rn,
  textarea: an,
  number: ln,
  range: hn,
  date: dn,
  time: un,
  datetime: cn,
  list: pn,
  star: mn,
  progress: gn,
  tickCross: bn,
  adaptable: vn
};
const Ct = class Ct extends O {
  constructor(e) {
    super(e), this.currentCell = !1, this.mouseClick = !1, this.recursionBlock = !1, this.invalidEdit = !1, this.editedCells = [], this.convertEmptyValues = !1, this.editors = Ct.editors, this.registerTableOption("editTriggerEvent", "focus"), this.registerTableOption("editorEmptyValue"), this.registerTableOption("editorEmptyValueFunc", this.emptyValueCheck.bind(this)), this.registerColumnOption("editable"), this.registerColumnOption("editor"), this.registerColumnOption("editorParams"), this.registerColumnOption("editorEmptyValue"), this.registerColumnOption("editorEmptyValueFunc"), this.registerColumnOption("cellEditing"), this.registerColumnOption("cellEdited"), this.registerColumnOption("cellEditCancelled"), this.registerTableFunction("getEditedCells", this.getEditedCells.bind(this)), this.registerTableFunction("clearCellEdited", this.clearCellEdited.bind(this)), this.registerTableFunction("navigatePrev", this.navigatePrev.bind(this)), this.registerTableFunction("navigateNext", this.navigateNext.bind(this)), this.registerTableFunction("navigateLeft", this.navigateLeft.bind(this)), this.registerTableFunction("navigateRight", this.navigateRight.bind(this)), this.registerTableFunction("navigateUp", this.navigateUp.bind(this)), this.registerTableFunction("navigateDown", this.navigateDown.bind(this)), this.registerComponentFunction("cell", "isEdited", this.cellIsEdited.bind(this)), this.registerComponentFunction("cell", "clearEdited", this.clearEdited.bind(this)), this.registerComponentFunction("cell", "edit", this.editCell.bind(this)), this.registerComponentFunction("cell", "cancelEdit", this.cellCancelEdit.bind(this)), this.registerComponentFunction("cell", "navigatePrev", this.navigatePrev.bind(this)), this.registerComponentFunction("cell", "navigateNext", this.navigateNext.bind(this)), this.registerComponentFunction("cell", "navigateLeft", this.navigateLeft.bind(this)), this.registerComponentFunction("cell", "navigateRight", this.navigateRight.bind(this)), this.registerComponentFunction("cell", "navigateUp", this.navigateUp.bind(this)), this.registerComponentFunction("cell", "navigateDown", this.navigateDown.bind(this));
  }
  initialize() {
    this.subscribe("cell-init", this.bindEditor.bind(this)), this.subscribe("cell-delete", this.clearEdited.bind(this)), this.subscribe("cell-value-changed", this.updateCellClass.bind(this)), this.subscribe("column-layout", this.initializeColumnCheck.bind(this)), this.subscribe("column-delete", this.columnDeleteCheck.bind(this)), this.subscribe("row-deleting", this.rowDeleteCheck.bind(this)), this.subscribe("row-layout", this.rowEditableCheck.bind(this)), this.subscribe("data-refreshing", this.cancelEdit.bind(this)), this.subscribe("clipboard-paste", this.pasteBlocker.bind(this)), this.subscribe("keybinding-nav-prev", this.navigatePrev.bind(this, void 0)), this.subscribe("keybinding-nav-next", this.keybindingNavigateNext.bind(this)), this.subscribe("keybinding-nav-up", this.navigateUp.bind(this, void 0)), this.subscribe("keybinding-nav-down", this.navigateDown.bind(this, void 0)), Object.keys(this.table.options).includes("editorEmptyValue") && (this.convertEmptyValues = !0);
  }
  ///////////////////////////////////
  ///////// Paste Negation //////////
  ///////////////////////////////////
  pasteBlocker(e) {
    if (this.currentCell)
      return !0;
  }
  ///////////////////////////////////
  ////// Keybinding Functions ///////
  ///////////////////////////////////
  keybindingNavigateNext(e) {
    var t = this.currentCell, i = this.options("tabEndNewRow");
    t && (this.navigateNext(t, e) || i && (t.getElement().firstChild.blur(), this.invalidEdit || (i === !0 ? i = this.table.addRow({}) : typeof i == "function" ? i = this.table.addRow(i(t.row.getComponent())) : i = this.table.addRow(Object.assign({}, i)), i.then(() => {
      setTimeout(() => {
        t.getComponent().navigateNext();
      });
    }))));
  }
  ///////////////////////////////////
  ///////// Cell Functions //////////
  ///////////////////////////////////
  cellIsEdited(e) {
    return !!e.modules.edit && e.modules.edit.edited;
  }
  cellCancelEdit(e) {
    e === this.currentCell ? this.table.modules.edit.cancelEdit() : console.warn("Cancel Editor Error - This cell is not currently being edited ");
  }
  ///////////////////////////////////
  ///////// Table Functions /////////
  ///////////////////////////////////
  updateCellClass(e) {
    this.allowEdit(e) ? e.getElement().classList.add("tabulator-editable") : e.getElement().classList.remove("tabulator-editable");
  }
  clearCellEdited(e) {
    e || (e = this.table.modules.edit.getEditedCells()), Array.isArray(e) || (e = [e]), e.forEach((t) => {
      this.table.modules.edit.clearEdited(t._getSelf());
    });
  }
  navigatePrev(e = this.currentCell, t) {
    var i, s;
    if (e) {
      if (t && t.preventDefault(), i = this.navigateLeft(), i)
        return !0;
      if (s = this.table.rowManager.prevDisplayRow(e.row, !0), s && (i = this.findPrevEditableCell(s, s.cells.length), i))
        return i.getComponent().edit(), !0;
    }
    return !1;
  }
  navigateNext(e = this.currentCell, t) {
    var i, s;
    if (e) {
      if (t && t.preventDefault(), i = this.navigateRight(), i)
        return !0;
      if (s = this.table.rowManager.nextDisplayRow(e.row, !0), s && (i = this.findNextEditableCell(s, -1), i))
        return i.getComponent().edit(), !0;
    }
    return !1;
  }
  navigateLeft(e = this.currentCell, t) {
    var i, s;
    return e && (t && t.preventDefault(), i = e.getIndex(), s = this.findPrevEditableCell(e.row, i), s) ? (s.getComponent().edit(), !0) : !1;
  }
  navigateRight(e = this.currentCell, t) {
    var i, s;
    return e && (t && t.preventDefault(), i = e.getIndex(), s = this.findNextEditableCell(e.row, i), s) ? (s.getComponent().edit(), !0) : !1;
  }
  navigateUp(e = this.currentCell, t) {
    var i, s;
    return e && (t && t.preventDefault(), i = e.getIndex(), s = this.table.rowManager.prevDisplayRow(e.row, !0), s) ? (s.cells[i].getComponent().edit(), !0) : !1;
  }
  navigateDown(e = this.currentCell, t) {
    var i, s;
    return e && (t && t.preventDefault(), i = e.getIndex(), s = this.table.rowManager.nextDisplayRow(e.row, !0), s) ? (s.cells[i].getComponent().edit(), !0) : !1;
  }
  findNextEditableCell(e, t) {
    var i = !1;
    if (t < e.cells.length - 1)
      for (var s = t + 1; s < e.cells.length; s++) {
        let n = e.cells[s];
        if (n.column.modules.edit && U.elVisible(n.getElement()) && this.allowEdit(n)) {
          i = n;
          break;
        }
      }
    return i;
  }
  findPrevEditableCell(e, t) {
    var i = !1;
    if (t > 0)
      for (var s = t - 1; s >= 0; s--) {
        let n = e.cells[s];
        if (n.column.modules.edit && U.elVisible(n.getElement()) && this.allowEdit(n)) {
          i = n;
          break;
        }
      }
    return i;
  }
  ///////////////////////////////////
  ///////// Internal Logic //////////
  ///////////////////////////////////
  initializeColumnCheck(e) {
    typeof e.definition.editor < "u" && this.initializeColumn(e);
  }
  columnDeleteCheck(e) {
    this.currentCell && this.currentCell.column === e && this.cancelEdit();
  }
  rowDeleteCheck(e) {
    this.currentCell && this.currentCell.row === e && this.cancelEdit();
  }
  rowEditableCheck(e) {
    e.getCells().forEach((t) => {
      t.column.modules.edit && typeof t.column.modules.edit.check == "function" && this.updateCellClass(t);
    });
  }
  //initialize column editor
  initializeColumn(e) {
    var t = Object.keys(e.definition).includes("editorEmptyValue"), i = {
      editor: !1,
      blocked: !1,
      check: e.definition.editable,
      params: e.definition.editorParams || {},
      convertEmptyValues: t,
      editorEmptyValue: e.definition.editorEmptyValue,
      editorEmptyValueFunc: e.definition.editorEmptyValueFunc
    };
    i.editor = this.lookupEditor(e.definition.editor, e), i.editor && (e.modules.edit = i);
  }
  lookupEditor(e, t) {
    var i;
    switch (typeof e) {
      case "string":
        this.editors[e] ? i = this.editors[e] : console.warn("Editor Error - No such editor found: ", e);
        break;
      case "function":
        i = e;
        break;
      case "boolean":
        e === !0 && (typeof t.definition.formatter != "function" ? this.editors[t.definition.formatter] ? i = this.editors[t.definition.formatter] : i = this.editors.input : console.warn("Editor Error - Cannot auto lookup editor for a custom formatter: ", t.definition.formatter));
        break;
    }
    return i;
  }
  getCurrentCell() {
    return this.currentCell ? this.currentCell.getComponent() : !1;
  }
  clearEditor(e) {
    var t = this.currentCell, i;
    if (this.invalidEdit = !1, t) {
      for (this.currentCell = !1, i = t.getElement(), this.dispatch("edit-editor-clear", t, e), i.classList.remove("tabulator-editing"); i.firstChild; ) i.removeChild(i.firstChild);
      t.row.getElement().classList.remove("tabulator-editing"), t.table.element.classList.remove("tabulator-editing");
    }
  }
  cancelEdit() {
    if (this.currentCell) {
      var e = this.currentCell, t = this.currentCell.getComponent();
      this.clearEditor(!0), e.setValueActual(e.getValue()), e.cellRendered(), (e.column.definition.editor == "textarea" || e.column.definition.variableHeight) && e.row.normalizeHeight(!0), e.column.definition.cellEditCancelled && e.column.definition.cellEditCancelled.call(this.table, t), this.dispatch("edit-cancelled", e), this.dispatchExternal("cellEditCancelled", t);
    }
  }
  //return a formatted value for a cell
  bindEditor(e) {
    if (e.column.modules.edit) {
      var t = this, i = e.getElement(!0);
      this.updateCellClass(e), i.setAttribute("tabindex", 0), i.addEventListener("mousedown", function(s) {
        s.button === 2 ? s.preventDefault() : t.mouseClick = !0;
      }), this.options("editTriggerEvent") === "dblclick" && i.addEventListener("dblclick", function(s) {
        i.classList.contains("tabulator-editing") || (i.focus({ preventScroll: !0 }), t.edit(e, s, !1));
      }), (this.options("editTriggerEvent") === "focus" || this.options("editTriggerEvent") === "click") && i.addEventListener("click", function(s) {
        i.classList.contains("tabulator-editing") || (i.focus({ preventScroll: !0 }), t.edit(e, s, !1));
      }), this.options("editTriggerEvent") === "focus" && i.addEventListener("focus", function(s) {
        t.recursionBlock || t.edit(e, s, !1);
      });
    }
  }
  focusCellNoEvent(e, t) {
    this.recursionBlock = !0, t && this.table.browser === "ie" || e.getElement().focus({ preventScroll: !0 }), this.recursionBlock = !1;
  }
  editCell(e, t) {
    this.focusCellNoEvent(e), this.edit(e, !1, t);
  }
  focusScrollAdjust(e) {
    if (this.table.rowManager.getRenderMode() == "virtual") {
      var t = this.table.rowManager.element.scrollTop, i = this.table.rowManager.element.clientHeight + this.table.rowManager.element.scrollTop, s = e.row.getElement();
      s.offsetTop < t ? this.table.rowManager.element.scrollTop -= t - s.offsetTop : s.offsetTop + s.offsetHeight > i && (this.table.rowManager.element.scrollTop += s.offsetTop + s.offsetHeight - i);
      var n = this.table.rowManager.element.scrollLeft, o = this.table.rowManager.element.clientWidth + this.table.rowManager.element.scrollLeft, r = e.getElement();
      this.table.modExists("frozenColumns") && (n += parseInt(this.table.modules.frozenColumns.leftMargin || 0), o -= parseInt(this.table.modules.frozenColumns.rightMargin || 0)), this.table.options.renderHorizontal === "virtual" && (n -= parseInt(this.table.columnManager.renderer.vDomPadLeft), o -= parseInt(this.table.columnManager.renderer.vDomPadLeft)), r.offsetLeft < n ? this.table.rowManager.element.scrollLeft -= n - r.offsetLeft : r.offsetLeft + r.offsetWidth > o && (this.table.rowManager.element.scrollLeft += r.offsetLeft + r.offsetWidth - o);
    }
  }
  allowEdit(e) {
    var t = !!e.column.modules.edit;
    if (e.column.modules.edit)
      switch (typeof e.column.modules.edit.check) {
        case "function":
          e.row.initialized && (t = e.column.modules.edit.check(e.getComponent()));
          break;
        case "string":
          t = !!e.row.data[e.column.modules.edit.check];
          break;
        case "boolean":
          t = e.column.modules.edit.check;
          break;
      }
    return t;
  }
  edit(e, t, i) {
    var s = this, n = !0, o = function() {
    }, r = e.getElement(), a = !1, h, d, u;
    if (this.currentCell) {
      !this.invalidEdit && this.currentCell !== e && this.cancelEdit();
      return;
    }
    function c(v) {
      if (s.currentCell === e && !a) {
        var M = s.chain("edit-success", [e, v], !0, !0);
        return M === !0 || s.table.options.validationMode === "highlight" ? (a = !0, s.clearEditor(), e.modules.edit || (e.modules.edit = {}), e.modules.edit.edited = !0, s.editedCells.indexOf(e) == -1 && s.editedCells.push(e), v = s.transformEmptyValues(v, e), e.setValue(v, !0), M === !0) : (a = !0, s.invalidEdit = !0, s.focusCellNoEvent(e, !0), o(), setTimeout(() => {
          a = !1;
        }, 10), !1);
      }
    }
    function g() {
      s.currentCell === e && !a && s.cancelEdit();
    }
    function m(v) {
      o = v;
    }
    if (e.column.modules.edit.blocked)
      return this.mouseClick = !1, this.blur(r), !1;
    if (t && t.stopPropagation(), n = this.allowEdit(e), n || i) {
      if (s.cancelEdit(), s.currentCell = e, this.focusScrollAdjust(e), d = e.getComponent(), this.mouseClick && (this.mouseClick = !1, e.column.definition.cellClick && e.column.definition.cellClick.call(this.table, t, d)), e.column.definition.cellEditing && e.column.definition.cellEditing.call(this.table, d), this.dispatch("cell-editing", e), this.dispatchExternal("cellEditing", d), u = typeof e.column.modules.edit.params == "function" ? e.column.modules.edit.params(d) : e.column.modules.edit.params, h = e.column.modules.edit.editor.call(s, d, m, c, g, u), this.currentCell && h !== !1)
        if (h instanceof Node) {
          for (r.classList.add("tabulator-editing"), e.row.getElement().classList.add("tabulator-editing"), e.table.element.classList.add("tabulator-editing"); r.firstChild; ) r.removeChild(r.firstChild);
          r.appendChild(h), o();
          for (var E = r.children, w = 0; w < E.length; w++)
            E[w].addEventListener("click", function(v) {
              v.stopPropagation();
            });
        } else
          return console.warn("Edit Error - Editor should return an instance of Node, the editor returned:", h), this.blur(r), !1;
      else
        return this.blur(r), !1;
      return !0;
    } else
      return this.mouseClick = !1, this.blur(r), !1;
  }
  emptyValueCheck(e) {
    return e === "" || e === null || typeof e > "u";
  }
  transformEmptyValues(e, t) {
    var i = t.column.modules.edit, s = i.convertEmptyValues || this.convertEmptyValues, n;
    return s && (n = i.editorEmptyValueFunc || this.options("editorEmptyValueFunc"), n && n(e) && (e = i.convertEmptyValues ? i.editorEmptyValue : this.options("editorEmptyValue"))), e;
  }
  blur(e) {
    this.confirm("edit-blur", [e]) || e.blur();
  }
  getEditedCells() {
    var e = [];
    return this.editedCells.forEach((t) => {
      e.push(t.getComponent());
    }), e;
  }
  clearEdited(e) {
    var t;
    e.modules.edit && e.modules.edit.edited && (e.modules.edit.edited = !1, this.dispatch("edit-edited-clear", e)), t = this.editedCells.indexOf(e), t > -1 && this.editedCells.splice(t, 1);
  }
};
x(Ct, "moduleName", "edit"), //load defaults
x(Ct, "editors", wn);
let Jt = Ct;
class Di {
  constructor(e, t, i, s) {
    this.type = e, this.columns = t, this.component = i || !1, this.indent = s || 0;
  }
}
class It {
  constructor(e, t, i, s, n) {
    this.value = e, this.component = t || !1, this.width = i, this.height = s, this.depth = n;
  }
}
var Cn = {}, yn = {
  visible: function() {
    return this.rowManager.getVisibleRows(!1, !0);
  },
  all: function() {
    return this.rowManager.rows;
  },
  selected: function() {
    return this.modules.selectRow.selectedRows;
  },
  active: function() {
    return this.options.pagination ? this.rowManager.getDisplayRows(this.rowManager.displayRows.length - 2) : this.rowManager.getDisplayRows();
  }
};
const Ie = class Ie extends O {
  constructor(e) {
    super(e), this.config = {}, this.cloneTableStyle = !0, this.colVisProp = "", this.colVisPropAttach = "", this.registerTableOption("htmlOutputConfig", !1), this.registerColumnOption("htmlOutput"), this.registerColumnOption("titleHtmlOutput");
  }
  initialize() {
    this.registerTableFunction("getHtml", this.getHtml.bind(this));
  }
  ///////////////////////////////////
  ///////// Internal Logic //////////
  ///////////////////////////////////
  generateExportList(e, t, i, s) {
    var n, o, r, a;
    return this.cloneTableStyle = t, this.config = e || {}, this.colVisProp = s, this.colVisPropAttach = this.colVisProp.charAt(0).toUpperCase() + this.colVisProp.slice(1), a = Ie.columnLookups[i], a && (r = a.call(this.table), r = r.filter((h) => this.columnVisCheck(h))), n = this.config.columnHeaders !== !1 ? this.headersToExportRows(this.generateColumnGroupHeaders(r)) : [], r && (r = r.map((h) => h.getComponent())), o = this.bodyToExportRows(this.rowLookup(i), r), n.concat(o);
  }
  generateTable(e, t, i, s) {
    var n = this.generateExportList(e, t, i, s);
    return this.generateTableElement(n);
  }
  rowLookup(e) {
    var t = [], i;
    return typeof e == "function" ? e.call(this.table).forEach((s) => {
      s = this.table.rowManager.findRow(s), s && t.push(s);
    }) : (i = Ie.rowLookups[e] || Ie.rowLookups.active, t = i.call(this.table)), Object.assign([], t);
  }
  generateColumnGroupHeaders(e) {
    var t = [];
    return e || (e = this.config.columnGroups !== !1 ? this.table.columnManager.columns : this.table.columnManager.columnsByIndex), e.forEach((i) => {
      var s = this.processColumnGroup(i);
      s && t.push(s);
    }), t;
  }
  processColumnGroup(e) {
    var t = e.columns, i = 0, s = e.definition["title" + this.colVisPropAttach] || e.definition.title, n = {
      title: s,
      column: e,
      depth: 1
    };
    if (t.length) {
      if (n.subGroups = [], n.width = 0, t.forEach((o) => {
        var r = this.processColumnGroup(o);
        r && (n.width += r.width, n.subGroups.push(r), r.depth > i && (i = r.depth));
      }), n.depth += i, !n.width)
        return !1;
    } else if (this.columnVisCheck(e))
      n.width = 1;
    else
      return !1;
    return n;
  }
  columnVisCheck(e) {
    var t = e.definition[this.colVisProp];
    return this.config.rowHeaders === !1 && e.isRowHeader ? !1 : (typeof t == "function" && (t = t.call(this.table, e.getComponent())), t === !1 || t === !0 ? t : e.visible && e.field);
  }
  headersToExportRows(e) {
    var t = [], i = 0, s = [];
    function n(o, r) {
      var a = i - r;
      if (typeof t[r] > "u" && (t[r] = []), o.height = o.subGroups ? 1 : a - o.depth + 1, t[r].push(o), o.height > 1)
        for (let h = 1; h < o.height; h++)
          typeof t[r + h] > "u" && (t[r + h] = []), t[r + h].push(!1);
      if (o.width > 1)
        for (let h = 1; h < o.width; h++)
          t[r].push(!1);
      o.subGroups && o.subGroups.forEach(function(h) {
        n(h, r + 1);
      });
    }
    return e.forEach(function(o) {
      o.depth > i && (i = o.depth);
    }), e.forEach(function(o) {
      n(o, 0);
    }), t.forEach((o) => {
      var r = [];
      o.forEach((a) => {
        if (a) {
          let h = typeof a.title > "u" ? "" : a.title;
          r.push(new It(h, a.column.getComponent(), a.width, a.height, a.depth));
        } else
          r.push(null);
      }), s.push(new Di("header", r));
    }), s;
  }
  bodyToExportRows(e, t = []) {
    var i = [];
    return t.length === 0 && this.table.columnManager.columnsByIndex.forEach((s) => {
      this.columnVisCheck(s) && t.push(s.getComponent());
    }), this.config.columnCalcs !== !1 && this.table.modExists("columnCalcs") && (this.table.modules.columnCalcs.topInitialized && e.unshift(this.table.modules.columnCalcs.topRow), this.table.modules.columnCalcs.botInitialized && e.push(this.table.modules.columnCalcs.botRow)), e = e.filter((s) => {
      switch (s.type) {
        case "group":
          return this.config.rowGroups !== !1;
        case "calc":
          return this.config.columnCalcs !== !1;
        case "row":
          return !(this.table.options.dataTree && this.config.dataTree === !1 && s.modules.dataTree.parent);
      }
      return !0;
    }), e.forEach((s, n) => {
      var o = s.getData(this.colVisProp), r = [], a = 0;
      switch (s.type) {
        case "group":
          a = s.level, r.push(new It(s.key, s.getComponent(), t.length, 1));
          break;
        case "calc":
        case "row":
          t.forEach((h) => {
            r.push(new It(h._column.getFieldValue(o), h, 1, 1));
          }), this.table.options.dataTree && this.config.dataTree !== !1 && (a = s.modules.dataTree.index);
          break;
      }
      i.push(new Di(s.type, r, s.getComponent(), a));
    }), i;
  }
  generateTableElement(e) {
    var t = document.createElement("table"), i = document.createElement("thead"), s = document.createElement("tbody"), n = this.lookupTableStyles(), o = this.table.options["rowFormatter" + this.colVisPropAttach], r = {};
    return r.rowFormatter = o !== null ? o : this.table.options.rowFormatter, this.table.options.dataTree && this.config.dataTree !== !1 && this.table.modExists("columnCalcs") && (r.treeElementField = this.table.modules.dataTree.elementField), r.groupHeader = this.table.options["groupHeader" + this.colVisPropAttach], r.groupHeader && !Array.isArray(r.groupHeader) && (r.groupHeader = [r.groupHeader]), t.classList.add("tabulator-print-table"), this.mapElementStyles(this.table.columnManager.getHeadersElement(), i, ["border-top", "border-left", "border-right", "border-bottom", "background-color", "color", "font-weight", "font-family", "font-size"]), e.length > 1e3 && console.warn("It may take a long time to render an HTML table with more than 1000 rows"), e.forEach((a, h) => {
      let d;
      switch (a.type) {
        case "header":
          i.appendChild(this.generateHeaderElement(a, r, n));
          break;
        case "group":
          s.appendChild(this.generateGroupElement(a, r, n));
          break;
        case "calc":
          s.appendChild(this.generateCalcElement(a, r, n));
          break;
        case "row":
          d = this.generateRowElement(a, r, n), this.mapElementStyles(h % 2 && n.evenRow ? n.evenRow : n.oddRow, d, ["border-top", "border-left", "border-right", "border-bottom", "color", "font-weight", "font-family", "font-size", "background-color"]), s.appendChild(d);
          break;
      }
    }), i.innerHTML && t.appendChild(i), t.appendChild(s), this.mapElementStyles(this.table.element, t, ["border-top", "border-left", "border-right", "border-bottom"]), t;
  }
  lookupTableStyles() {
    var e = {};
    return this.cloneTableStyle && window.getComputedStyle && (e.oddRow = this.table.element.querySelector(".tabulator-row-odd:not(.tabulator-group):not(.tabulator-calcs)"), e.evenRow = this.table.element.querySelector(".tabulator-row-even:not(.tabulator-group):not(.tabulator-calcs)"), e.calcRow = this.table.element.querySelector(".tabulator-row.tabulator-calcs"), e.firstRow = this.table.element.querySelector(".tabulator-row:not(.tabulator-group):not(.tabulator-calcs)"), e.firstGroup = this.table.element.getElementsByClassName("tabulator-group")[0], e.firstRow && (e.styleCells = e.firstRow.getElementsByClassName("tabulator-cell"), e.styleRowHeader = e.firstRow.getElementsByClassName("tabulator-row-header")[0], e.firstCell = e.styleCells[0], e.lastCell = e.styleCells[e.styleCells.length - 1])), e;
  }
  generateHeaderElement(e, t, i) {
    var s = document.createElement("tr");
    return e.columns.forEach((n) => {
      if (n) {
        var o = document.createElement("th"), r = n.component._column.definition.cssClass ? n.component._column.definition.cssClass.split(" ") : [];
        o.colSpan = n.width, o.rowSpan = n.height, o.innerHTML = n.value, this.cloneTableStyle && (o.style.boxSizing = "border-box"), r.forEach(function(a) {
          o.classList.add(a);
        }), this.mapElementStyles(n.component.getElement(), o, ["text-align", "border-left", "border-right", "background-color", "color", "font-weight", "font-family", "font-size"]), this.mapElementStyles(n.component._column.contentElement, o, ["padding-top", "padding-left", "padding-right", "padding-bottom"]), n.component._column.visible ? this.mapElementStyles(n.component.getElement(), o, ["width"]) : n.component._column.definition.width && (o.style.width = n.component._column.definition.width + "px"), n.component._column.parent && n.component._column.parent.isGroup ? this.mapElementStyles(n.component._column.parent.groupElement, o, ["border-top"]) : this.mapElementStyles(n.component.getElement(), o, ["border-top"]), n.component._column.isGroup ? this.mapElementStyles(n.component.getElement(), o, ["border-bottom"]) : this.mapElementStyles(this.table.columnManager.getElement(), o, ["border-bottom"]), s.appendChild(o);
      }
    }), s;
  }
  generateGroupElement(e, t, i) {
    var s = document.createElement("tr"), n = document.createElement("td"), o = e.columns[0];
    return s.classList.add("tabulator-print-table-row"), t.groupHeader && t.groupHeader[e.indent] ? o.value = t.groupHeader[e.indent](o.value, e.component._group.getRowCount(), e.component._group.getData(), e.component) : t.groupHeader !== !1 && (o.value = e.component._group.generator(o.value, e.component._group.getRowCount(), e.component._group.getData(), e.component)), n.colSpan = o.width, n.innerHTML = o.value, s.classList.add("tabulator-print-table-group"), s.classList.add("tabulator-group-level-" + e.indent), o.component.isVisible() && s.classList.add("tabulator-group-visible"), this.mapElementStyles(i.firstGroup, s, ["border-top", "border-left", "border-right", "border-bottom", "color", "font-weight", "font-family", "font-size", "background-color"]), this.mapElementStyles(i.firstGroup, n, ["padding-top", "padding-left", "padding-right", "padding-bottom"]), s.appendChild(n), s;
  }
  generateCalcElement(e, t, i) {
    var s = this.generateRowElement(e, t, i);
    return s.classList.add("tabulator-print-table-calcs"), this.mapElementStyles(i.calcRow, s, ["border-top", "border-left", "border-right", "border-bottom", "color", "font-weight", "font-family", "font-size", "background-color"]), s;
  }
  generateRowElement(e, t, i) {
    var s = document.createElement("tr");
    if (s.classList.add("tabulator-print-table-row"), e.columns.forEach((n, o) => {
      if (n) {
        var r = document.createElement("td"), a = n.component._column, h = this.table, d = h.columnManager.findColumnIndex(a), u = n.value, c, g, m = {
          modules: {},
          getValue: function() {
            return u;
          },
          getField: function() {
            return a.definition.field;
          },
          getElement: function() {
            return r;
          },
          getType: function() {
            return "cell";
          },
          getColumn: function() {
            return a.getComponent();
          },
          getData: function() {
            return e.component.getData();
          },
          getRow: function() {
            return e.component;
          },
          getTable: function() {
            return h;
          },
          getComponent: function() {
            return m;
          },
          column: a
        }, E = a.definition.cssClass ? a.definition.cssClass.split(" ") : [];
        if (E.forEach(function(w) {
          r.classList.add(w);
        }), this.table.modExists("format") && this.config.formatCells !== !1)
          u = this.table.modules.format.formatExportValue(m, this.colVisProp);
        else
          switch (typeof u) {
            case "object":
              u = u !== null ? JSON.stringify(u) : "";
              break;
            case "undefined":
              u = "";
              break;
          }
        u instanceof Node ? r.appendChild(u) : r.innerHTML = u, g = ["padding-top", "padding-left", "padding-right", "padding-bottom", "border-top", "border-left", "border-right", "border-bottom", "color", "font-weight", "font-family", "font-size", "text-align"], a.isRowHeader ? (c = i.styleRowHeader, g.push("background-color")) : c = i.styleCells && i.styleCells[d] ? i.styleCells[d] : i.firstCell, c && (this.mapElementStyles(c, r, g), a.definition.align && (r.style.textAlign = a.definition.align)), this.table.options.dataTree && this.config.dataTree !== !1 && (t.treeElementField && t.treeElementField == a.field || !t.treeElementField && o == 0) && (e.component._row.modules.dataTree.controlEl && r.insertBefore(e.component._row.modules.dataTree.controlEl.cloneNode(!0), r.firstChild), e.component._row.modules.dataTree.branchEl && r.insertBefore(e.component._row.modules.dataTree.branchEl.cloneNode(!0), r.firstChild)), s.appendChild(r), m.modules.format && m.modules.format.renderedCallback && m.modules.format.renderedCallback();
      }
    }), t.rowFormatter && e.type === "row" && this.config.formatCells !== !1) {
      let n = Object.assign(e.component);
      n.getElement = function() {
        return s;
      }, t.rowFormatter(e.component);
    }
    return s;
  }
  generateHTMLTable(e) {
    var t = document.createElement("div");
    return t.appendChild(this.generateTableElement(e)), t.innerHTML;
  }
  getHtml(e, t, i, s) {
    var n = this.generateExportList(i || this.table.options.htmlOutputConfig, t, e, s || "htmlOutput");
    return this.generateHTMLTable(n);
  }
  mapElementStyles(e, t, i) {
    if (this.cloneTableStyle && e && t) {
      var s = {
        "background-color": "backgroundColor",
        color: "fontColor",
        width: "width",
        "font-weight": "fontWeight",
        "font-family": "fontFamily",
        "font-size": "fontSize",
        "text-align": "textAlign",
        "border-top": "borderTop",
        "border-left": "borderLeft",
        "border-right": "borderRight",
        "border-bottom": "borderBottom",
        "padding-top": "paddingTop",
        "padding-left": "paddingLeft",
        "padding-right": "paddingRight",
        "padding-bottom": "paddingBottom"
      };
      if (window.getComputedStyle) {
        var n = window.getComputedStyle(e);
        i.forEach(function(o) {
          t.style[s[o]] || (t.style[s[o]] = n.getPropertyValue(o));
        });
      }
    }
  }
};
x(Ie, "moduleName", "export"), x(Ie, "columnLookups", Cn), x(Ie, "rowLookups", yn);
let Yt = Ie;
var En = {
  //equal to
  "=": function(l, e, t, i) {
    return e == l;
  },
  //less than
  "<": function(l, e, t, i) {
    return e < l;
  },
  //less than or equal to
  "<=": function(l, e, t, i) {
    return e <= l;
  },
  //greater than
  ">": function(l, e, t, i) {
    return e > l;
  },
  //greater than or equal to
  ">=": function(l, e, t, i) {
    return e >= l;
  },
  //not equal to
  "!=": function(l, e, t, i) {
    return e != l;
  },
  regex: function(l, e, t, i) {
    return typeof l == "string" && (l = new RegExp(l)), l.test(e);
  },
  //contains the string
  like: function(l, e, t, i) {
    return l === null || typeof l > "u" ? e === l : typeof e < "u" && e !== null ? String(e).toLowerCase().indexOf(l.toLowerCase()) > -1 : !1;
  },
  //contains the keywords
  keywords: function(l, e, t, i) {
    var s = l.toLowerCase().split(typeof i.separator > "u" ? " " : i.separator), n = String(e === null || typeof e > "u" ? "" : e).toLowerCase(), o = [];
    return s.forEach((r) => {
      n.includes(r) && o.push(!0);
    }), i.matchAll ? o.length === s.length : !!o.length;
  },
  //starts with the string
  starts: function(l, e, t, i) {
    return l === null || typeof l > "u" ? e === l : typeof e < "u" && e !== null ? String(e).toLowerCase().startsWith(l.toLowerCase()) : !1;
  },
  //ends with the string
  ends: function(l, e, t, i) {
    return l === null || typeof l > "u" ? e === l : typeof e < "u" && e !== null ? String(e).toLowerCase().endsWith(l.toLowerCase()) : !1;
  },
  //in array
  in: function(l, e, t, i) {
    return Array.isArray(l) ? l.length ? l.indexOf(e) > -1 : !0 : (console.warn("Filter Error - filter value is not an array:", l), !1);
  }
};
const ze = class ze extends O {
  constructor(e) {
    super(e), this.filterList = [], this.headerFilters = {}, this.headerFilterColumns = [], this.prevHeaderFilterChangeCheck = "", this.prevHeaderFilterChangeCheck = "{}", this.changed = !1, this.tableInitialized = !1, this.registerTableOption("filterMode", "local"), this.registerTableOption("initialFilter", !1), this.registerTableOption("initialHeaderFilter", !1), this.registerTableOption("headerFilterLiveFilterDelay", 300), this.registerTableOption("placeholderHeaderFilter", !1), this.registerColumnOption("headerFilter"), this.registerColumnOption("headerFilterPlaceholder"), this.registerColumnOption("headerFilterParams"), this.registerColumnOption("headerFilterEmptyCheck"), this.registerColumnOption("headerFilterFunc"), this.registerColumnOption("headerFilterFuncParams"), this.registerColumnOption("headerFilterLiveFilter"), this.registerTableFunction("searchRows", this.searchRows.bind(this)), this.registerTableFunction("searchData", this.searchData.bind(this)), this.registerTableFunction("setFilter", this.userSetFilter.bind(this)), this.registerTableFunction("refreshFilter", this.userRefreshFilter.bind(this)), this.registerTableFunction("addFilter", this.userAddFilter.bind(this)), this.registerTableFunction("getFilters", this.getFilters.bind(this)), this.registerTableFunction("setHeaderFilterFocus", this.userSetHeaderFilterFocus.bind(this)), this.registerTableFunction("getHeaderFilterValue", this.userGetHeaderFilterValue.bind(this)), this.registerTableFunction("setHeaderFilterValue", this.userSetHeaderFilterValue.bind(this)), this.registerTableFunction("getHeaderFilters", this.getHeaderFilters.bind(this)), this.registerTableFunction("removeFilter", this.userRemoveFilter.bind(this)), this.registerTableFunction("clearFilter", this.userClearFilter.bind(this)), this.registerTableFunction("clearHeaderFilter", this.userClearHeaderFilter.bind(this)), this.registerComponentFunction("column", "headerFilterFocus", this.setHeaderFilterFocus.bind(this)), this.registerComponentFunction("column", "reloadHeaderFilter", this.reloadHeaderFilter.bind(this)), this.registerComponentFunction("column", "getHeaderFilterValue", this.getHeaderFilterValue.bind(this)), this.registerComponentFunction("column", "setHeaderFilterValue", this.setHeaderFilterValue.bind(this));
  }
  initialize() {
    this.subscribe("column-init", this.initializeColumnHeaderFilter.bind(this)), this.subscribe("column-width-fit-before", this.hideHeaderFilterElements.bind(this)), this.subscribe("column-width-fit-after", this.showHeaderFilterElements.bind(this)), this.subscribe("table-built", this.tableBuilt.bind(this)), this.subscribe("placeholder", this.generatePlaceholder.bind(this)), this.table.options.filterMode === "remote" && this.subscribe("data-params", this.remoteFilterParams.bind(this)), this.registerDataHandler(this.filter.bind(this), 10);
  }
  tableBuilt() {
    this.table.options.initialFilter && this.setFilter(this.table.options.initialFilter), this.table.options.initialHeaderFilter && this.table.options.initialHeaderFilter.forEach((e) => {
      var t = this.table.columnManager.findColumn(e.field);
      if (t)
        this.setHeaderFilterValue(t, e.value);
      else
        return console.warn("Column Filter Error - No matching column found:", e.field), !1;
    }), this.tableInitialized = !0;
  }
  remoteFilterParams(e, t, i, s) {
    return s.filter = this.getFilters(!0, !0), s;
  }
  generatePlaceholder(e) {
    if (this.table.options.placeholderHeaderFilter && Object.keys(this.headerFilters).length)
      return this.table.options.placeholderHeaderFilter;
  }
  ///////////////////////////////////
  ///////// Table Functions /////////
  ///////////////////////////////////
  //set standard filters
  userSetFilter(e, t, i, s) {
    this.setFilter(e, t, i, s), this.refreshFilter();
  }
  //set standard filters
  userRefreshFilter() {
    this.refreshFilter();
  }
  //add filter to array
  userAddFilter(e, t, i, s) {
    this.addFilter(e, t, i, s), this.refreshFilter();
  }
  userSetHeaderFilterFocus(e) {
    var t = this.table.columnManager.findColumn(e);
    if (t)
      this.setHeaderFilterFocus(t);
    else
      return console.warn("Column Filter Focus Error - No matching column found:", e), !1;
  }
  userGetHeaderFilterValue(e) {
    var t = this.table.columnManager.findColumn(e);
    if (t)
      return this.getHeaderFilterValue(t);
    console.warn("Column Filter Error - No matching column found:", e);
  }
  userSetHeaderFilterValue(e, t) {
    var i = this.table.columnManager.findColumn(e);
    if (i)
      this.setHeaderFilterValue(i, t);
    else
      return console.warn("Column Filter Error - No matching column found:", e), !1;
  }
  //remove filter from array
  userRemoveFilter(e, t, i) {
    this.removeFilter(e, t, i), this.refreshFilter();
  }
  //clear filters
  userClearFilter(e) {
    this.clearFilter(e), this.refreshFilter();
  }
  //clear header filters
  userClearHeaderFilter() {
    this.clearHeaderFilter(), this.refreshFilter();
  }
  //search for specific row components
  searchRows(e, t, i) {
    return this.search("rows", e, t, i);
  }
  //search for specific data
  searchData(e, t, i) {
    return this.search("data", e, t, i);
  }
  ///////////////////////////////////
  ///////// Internal Logic //////////
  ///////////////////////////////////
  initializeColumnHeaderFilter(e) {
    var t = e.definition;
    t.headerFilter && this.initializeColumn(e);
  }
  //initialize column header filter
  initializeColumn(e, t) {
    var i = this, s = e.getField();
    function n(o) {
      var r = e.modules.filter.tagType == "input" && e.modules.filter.attrType == "text" || e.modules.filter.tagType == "textarea" ? "partial" : "match", a = "", h = "", d;
      if (typeof e.modules.filter.prevSuccess > "u" || e.modules.filter.prevSuccess !== o) {
        if (e.modules.filter.prevSuccess = o, e.modules.filter.emptyFunc(o))
          delete i.headerFilters[s];
        else {
          switch (e.modules.filter.value = o, typeof e.definition.headerFilterFunc) {
            case "string":
              ze.filters[e.definition.headerFilterFunc] ? (a = e.definition.headerFilterFunc, d = function(u) {
                var c = e.definition.headerFilterFuncParams || {}, g = e.getFieldValue(u);
                return c = typeof c == "function" ? c(o, g, u) : c, ze.filters[e.definition.headerFilterFunc](o, g, u, c);
              }) : console.warn("Header Filter Error - Matching filter function not found: ", e.definition.headerFilterFunc);
              break;
            case "function":
              d = function(u) {
                var c = e.definition.headerFilterFuncParams || {}, g = e.getFieldValue(u);
                return c = typeof c == "function" ? c(o, g, u) : c, e.definition.headerFilterFunc(o, g, u, c);
              }, a = d;
              break;
          }
          if (!d)
            switch (r) {
              case "partial":
                d = function(u) {
                  var c = e.getFieldValue(u);
                  return typeof c < "u" && c !== null ? String(c).toLowerCase().indexOf(String(o).toLowerCase()) > -1 : !1;
                }, a = "like";
                break;
              default:
                d = function(u) {
                  return e.getFieldValue(u) == o;
                }, a = "=";
            }
          i.headerFilters[s] = { value: o, func: d, type: a };
        }
        e.modules.filter.value = o, h = JSON.stringify(i.headerFilters), i.prevHeaderFilterChangeCheck !== h && (i.prevHeaderFilterChangeCheck = h, i.trackChanges(), i.refreshFilter());
      }
      return !0;
    }
    e.modules.filter = {
      success: n,
      attrType: !1,
      tagType: !1,
      emptyFunc: !1
    }, this.generateHeaderFilterElement(e);
  }
  generateHeaderFilterElement(e, t, i) {
    var s = this, n = e.modules.filter.success, o = e.getField(), r, a, h, d, u, c, g, m;
    e.modules.filter.value = t;
    function E() {
    }
    function w(v) {
      m = v;
    }
    if (e.modules.filter.headerElement && e.modules.filter.headerElement.parentNode && e.contentElement.removeChild(e.modules.filter.headerElement.parentNode), o) {
      switch (e.modules.filter.emptyFunc = e.definition.headerFilterEmptyCheck || function(v) {
        return !v && v !== 0;
      }, r = document.createElement("div"), r.classList.add("tabulator-header-filter"), typeof e.definition.headerFilter) {
        case "string":
          s.table.modules.edit.editors[e.definition.headerFilter] ? (a = s.table.modules.edit.editors[e.definition.headerFilter], (e.definition.headerFilter === "tick" || e.definition.headerFilter === "tickCross") && !e.definition.headerFilterEmptyCheck && (e.modules.filter.emptyFunc = function(v) {
            return v !== !0 && v !== !1;
          })) : console.warn("Filter Error - Cannot build header filter, No such editor found: ", e.definition.editor);
          break;
        case "function":
          a = e.definition.headerFilter;
          break;
        case "boolean":
          e.modules.edit && e.modules.edit.editor ? a = e.modules.edit.editor : e.definition.formatter && s.table.modules.edit.editors[e.definition.formatter] ? (a = s.table.modules.edit.editors[e.definition.formatter], (e.definition.formatter === "tick" || e.definition.formatter === "tickCross") && !e.definition.headerFilterEmptyCheck && (e.modules.filter.emptyFunc = function(v) {
            return v !== !0 && v !== !1;
          })) : a = s.table.modules.edit.editors.input;
          break;
      }
      if (a) {
        if (d = {
          getValue: function() {
            return typeof t < "u" ? t : "";
          },
          getField: function() {
            return e.definition.field;
          },
          getElement: function() {
            return r;
          },
          getColumn: function() {
            return e.getComponent();
          },
          getTable: () => this.table,
          getType: () => "header",
          getRow: function() {
            return {
              normalizeHeight: function() {
              }
            };
          }
        }, g = e.definition.headerFilterParams || {}, g = typeof g == "function" ? g.call(s.table, d) : g, h = a.call(this.table.modules.edit, d, w, n, E, g), !h) {
          console.warn("Filter Error - Cannot add filter to " + o + " column, editor returned a value of false");
          return;
        }
        if (!(h instanceof Node)) {
          console.warn("Filter Error - Cannot add filter to " + o + " column, editor should return an instance of Node, the editor returned:", h);
          return;
        }
        s.langBind("headerFilters|columns|" + e.definition.field, function(v) {
          h.setAttribute("placeholder", typeof v < "u" && v ? v : e.definition.headerFilterPlaceholder || s.langText("headerFilters|default"));
        }), h.addEventListener("click", function(v) {
          v.stopPropagation(), h.focus();
        }), h.addEventListener("focus", (v) => {
          var M = this.table.columnManager.contentsElement.scrollLeft, z = this.table.rowManager.element.scrollLeft;
          M !== z && (this.table.rowManager.scrollHorizontal(M), this.table.columnManager.scrollHorizontal(M));
        }), u = !1, c = function(v) {
          u && clearTimeout(u), u = setTimeout(function() {
            n(h.value);
          }, s.table.options.headerFilterLiveFilterDelay);
        }, e.modules.filter.headerElement = h, e.modules.filter.attrType = h.hasAttribute("type") ? h.getAttribute("type").toLowerCase() : "", e.modules.filter.tagType = h.tagName.toLowerCase(), e.definition.headerFilterLiveFilter !== !1 && (e.definition.headerFilter === "autocomplete" || e.definition.headerFilter === "tickCross" || (e.definition.editor === "autocomplete" || e.definition.editor === "tickCross") && e.definition.headerFilter === !0 || (h.addEventListener("keyup", c), h.addEventListener("search", c), e.modules.filter.attrType == "number" && h.addEventListener("change", function(v) {
          n(h.value);
        }), e.modules.filter.attrType == "text" && this.table.browser !== "ie" && h.setAttribute("type", "search")), (e.modules.filter.tagType == "input" || e.modules.filter.tagType == "select" || e.modules.filter.tagType == "textarea") && h.addEventListener("mousedown", function(v) {
          v.stopPropagation();
        })), r.appendChild(h), e.contentElement.appendChild(r), i || s.headerFilterColumns.push(e), m && m();
      }
    } else
      console.warn("Filter Error - Cannot add header filter, column has no field set:", e.definition.title);
  }
  //hide all header filter elements (used to ensure correct column widths in "fitData" layout mode)
  hideHeaderFilterElements() {
    this.headerFilterColumns.forEach(function(e) {
      e.modules.filter && e.modules.filter.headerElement && (e.modules.filter.headerElement.style.display = "none");
    });
  }
  //show all header filter elements (used to ensure correct column widths in "fitData" layout mode)
  showHeaderFilterElements() {
    this.headerFilterColumns.forEach(function(e) {
      e.modules.filter && e.modules.filter.headerElement && (e.modules.filter.headerElement.style.display = "");
    });
  }
  //programmatically set focus of header filter
  setHeaderFilterFocus(e) {
    e.modules.filter && e.modules.filter.headerElement ? e.modules.filter.headerElement.focus() : console.warn("Column Filter Focus Error - No header filter set on column:", e.getField());
  }
  //programmatically get value of header filter
  getHeaderFilterValue(e) {
    if (e.modules.filter && e.modules.filter.headerElement)
      return e.modules.filter.value;
    console.warn("Column Filter Error - No header filter set on column:", e.getField());
  }
  //programmatically set value of header filter
  setHeaderFilterValue(e, t) {
    e && (e.modules.filter && e.modules.filter.headerElement ? (this.generateHeaderFilterElement(e, t, !0), e.modules.filter.success(t)) : console.warn("Column Filter Error - No header filter set on column:", e.getField()));
  }
  reloadHeaderFilter(e) {
    e && (e.modules.filter && e.modules.filter.headerElement ? this.generateHeaderFilterElement(e, e.modules.filter.value, !0) : console.warn("Column Filter Error - No header filter set on column:", e.getField()));
  }
  refreshFilter() {
    this.tableInitialized && (this.table.options.filterMode === "remote" ? this.reloadData(null, !1, !1) : this.refreshData(!0));
  }
  //check if the filters has changed since last use
  trackChanges() {
    this.changed = !0, this.dispatch("filter-changed");
  }
  //check if the filters has changed since last use
  hasChanged() {
    var e = this.changed;
    return this.changed = !1, e;
  }
  //set standard filters
  setFilter(e, t, i, s) {
    this.filterList = [], Array.isArray(e) || (e = [{ field: e, type: t, value: i, params: s }]), this.addFilter(e);
  }
  //add filter to array
  addFilter(e, t, i, s) {
    var n = !1;
    Array.isArray(e) || (e = [{ field: e, type: t, value: i, params: s }]), e.forEach((o) => {
      o = this.findFilter(o), o && (this.filterList.push(o), n = !0);
    }), n && this.trackChanges();
  }
  findFilter(e) {
    var t;
    if (Array.isArray(e))
      return this.findSubFilters(e);
    var i = !1;
    return typeof e.field == "function" ? i = function(s) {
      return e.field(s, e.type || {});
    } : ze.filters[e.type] ? (t = this.table.columnManager.getColumnByField(e.field), t ? i = function(s) {
      return ze.filters[e.type](e.value, t.getFieldValue(s), s, e.params || {});
    } : i = function(s) {
      return ze.filters[e.type](e.value, s[e.field], s, e.params || {});
    }) : console.warn("Filter Error - No such filter type found, ignoring: ", e.type), e.func = i, e.func ? e : !1;
  }
  findSubFilters(e) {
    var t = [];
    return e.forEach((i) => {
      i = this.findFilter(i), i && t.push(i);
    }), t.length ? t : !1;
  }
  //get all filters
  getFilters(e, t) {
    var i = [];
    return e && (i = this.getHeaderFilters()), t && i.forEach(function(s) {
      typeof s.type == "function" && (s.type = "function");
    }), i = i.concat(this.filtersToArray(this.filterList, t)), i;
  }
  //filter to Object
  filtersToArray(e, t) {
    var i = [];
    return e.forEach((s) => {
      var n;
      Array.isArray(s) ? i.push(this.filtersToArray(s, t)) : (n = { field: s.field, type: s.type, value: s.value }, t && typeof n.type == "function" && (n.type = "function"), i.push(n));
    }), i;
  }
  //get all filters
  getHeaderFilters() {
    var e = [];
    for (var t in this.headerFilters)
      e.push({ field: t, type: this.headerFilters[t].type, value: this.headerFilters[t].value });
    return e;
  }
  //remove filter from array
  removeFilter(e, t, i) {
    Array.isArray(e) || (e = [{ field: e, type: t, value: i }]), e.forEach((s) => {
      var n = -1;
      typeof s.field == "object" ? n = this.filterList.findIndex((o) => s === o) : n = this.filterList.findIndex((o) => s.field === o.field && s.type === o.type && s.value === o.value), n > -1 ? this.filterList.splice(n, 1) : console.warn("Filter Error - No matching filter type found, ignoring: ", s.type);
    }), this.trackChanges();
  }
  //clear filters
  clearFilter(e) {
    this.filterList = [], e && this.clearHeaderFilter(), this.trackChanges();
  }
  //clear header filters
  clearHeaderFilter() {
    this.headerFilters = {}, this.prevHeaderFilterChangeCheck = "{}", this.headerFilterColumns.forEach((e) => {
      typeof e.modules.filter.value < "u" && delete e.modules.filter.value, e.modules.filter.prevSuccess = void 0, this.reloadHeaderFilter(e);
    }), this.trackChanges();
  }
  //search data and return matching rows
  search(e, t, i, s) {
    var n = [], o = [];
    return Array.isArray(t) || (t = [{ field: t, type: i, value: s }]), t.forEach((r) => {
      r = this.findFilter(r), r && o.push(r);
    }), this.table.rowManager.rows.forEach((r) => {
      var a = !0;
      o.forEach((h) => {
        this.filterRecurse(h, r.getData()) || (a = !1);
      }), a && n.push(e === "data" ? r.getData("data") : r.getComponent());
    }), n;
  }
  //filter row array
  filter(e, t) {
    var i = [], s = [];
    return this.subscribedExternal("dataFiltering") && this.dispatchExternal("dataFiltering", this.getFilters(!0)), this.table.options.filterMode !== "remote" && (this.filterList.length || Object.keys(this.headerFilters).length) ? e.forEach((n) => {
      this.filterRow(n) && i.push(n);
    }) : i = e.slice(0), this.subscribedExternal("dataFiltered") && (i.forEach((n) => {
      s.push(n.getComponent());
    }), this.dispatchExternal("dataFiltered", this.getFilters(!0), s)), i;
  }
  //filter individual row
  filterRow(e, t) {
    var i = !0, s = e.getData();
    this.filterList.forEach((o) => {
      this.filterRecurse(o, s) || (i = !1);
    });
    for (var n in this.headerFilters)
      this.headerFilters[n].func(s) || (i = !1);
    return i;
  }
  filterRecurse(e, t) {
    var i = !1;
    return Array.isArray(e) ? e.forEach((s) => {
      this.filterRecurse(s, t) && (i = !0);
    }) : i = e.func(t), i;
  }
};
x(ze, "moduleName", "filter"), //load defaults
x(ze, "filters", En);
let Qt = ze;
function Rn(l, e, t) {
  return this.emptyToSpace(this.sanitizeHTML(l.getValue()));
}
function xn(l, e, t) {
  return l.getValue();
}
function Tn(l, e, t) {
  return l.getElement().style.whiteSpace = "pre-wrap", this.emptyToSpace(this.sanitizeHTML(l.getValue()));
}
function kn(l, e, t) {
  var i = parseFloat(l.getValue()), s = "", n, o, r, a, h, d = e.decimal || ".", u = e.thousand || ",", c = e.negativeSign || "-", g = e.symbol || "", m = !!e.symbolAfter, E = typeof e.precision < "u" ? e.precision : 2;
  if (isNaN(i))
    return this.emptyToSpace(this.sanitizeHTML(l.getValue()));
  if (i < 0 && (i = Math.abs(i), s = c), n = E !== !1 ? i.toFixed(E) : i, n = String(n).split("."), o = n[0], r = n.length > 1 ? d + n[1] : "", e.thousand !== !1)
    for (a = /(\d+)(\d{3})/; a.test(o); )
      o = o.replace(a, "$1" + u + "$2");
  return h = o + r, s === !0 ? (h = "(" + h + ")", m ? h + g : g + h) : m ? s + h + g : s + g + h;
}
function Mn(l, e, t) {
  var i = l.getValue(), s = e.urlPrefix || "", n = e.download, o = i, r = document.createElement("a"), a;
  function h(d, u) {
    var c = d.shift(), g = u[c];
    return d.length && typeof g == "object" ? h(d, g) : g;
  }
  if (e.labelField && (a = l.getData(), o = h(e.labelField.split(this.table.options.nestedFieldSeparator), a)), e.label)
    switch (typeof e.label) {
      case "string":
        o = e.label;
        break;
      case "function":
        o = e.label(l);
        break;
    }
  if (o) {
    if (e.urlField && (a = l.getData(), i = U.retrieveNestedData(this.table.options.nestedFieldSeparator, e.urlField, a)), e.url)
      switch (typeof e.url) {
        case "string":
          i = e.url;
          break;
        case "function":
          i = e.url(l);
          break;
      }
    return r.setAttribute("href", s + i), e.target && r.setAttribute("target", e.target), e.download && (typeof n == "function" ? n = n(l) : n = n === !0 ? "" : n, r.setAttribute("download", n)), r.innerHTML = this.emptyToSpace(this.sanitizeHTML(o)), r;
  } else
    return "&nbsp;";
}
function Ln(l, e, t) {
  var i = document.createElement("img"), s = l.getValue();
  switch (e.urlPrefix && (s = e.urlPrefix + l.getValue()), e.urlSuffix && (s = s + e.urlSuffix), i.setAttribute("src", s), typeof e.height) {
    case "number":
      i.style.height = e.height + "px";
      break;
    case "string":
      i.style.height = e.height;
      break;
  }
  switch (typeof e.width) {
    case "number":
      i.style.width = e.width + "px";
      break;
    case "string":
      i.style.width = e.width;
      break;
  }
  return i.addEventListener("load", function() {
    l.getRow().normalizeHeight();
  }), i;
}
function Sn(l, e, t) {
  var i = l.getValue(), s = l.getElement(), n = e.allowEmpty, o = e.allowTruthy, r = Object.keys(e).includes("trueValue"), a = typeof e.tickElement < "u" ? e.tickElement : '<svg enable-background="new 0 0 24 24" height="14" width="14" viewBox="0 0 24 24" xml:space="preserve" ><path fill="#2DC214" clip-rule="evenodd" d="M21.652,3.211c-0.293-0.295-0.77-0.295-1.061,0L9.41,14.34  c-0.293,0.297-0.771,0.297-1.062,0L3.449,9.351C3.304,9.203,3.114,9.13,2.923,9.129C2.73,9.128,2.534,9.201,2.387,9.351  l-2.165,1.946C0.078,11.445,0,11.63,0,11.823c0,0.194,0.078,0.397,0.223,0.544l4.94,5.184c0.292,0.296,0.771,0.776,1.062,1.07  l2.124,2.141c0.292,0.293,0.769,0.293,1.062,0l14.366-14.34c0.293-0.294,0.293-0.777,0-1.071L21.652,3.211z" fill-rule="evenodd"/></svg>', h = typeof e.crossElement < "u" ? e.crossElement : '<svg enable-background="new 0 0 24 24" height="14" width="14"  viewBox="0 0 24 24" xml:space="preserve" ><path fill="#CE1515" d="M22.245,4.015c0.313,0.313,0.313,0.826,0,1.139l-6.276,6.27c-0.313,0.312-0.313,0.826,0,1.14l6.273,6.272  c0.313,0.313,0.313,0.826,0,1.14l-2.285,2.277c-0.314,0.312-0.828,0.312-1.142,0l-6.271-6.271c-0.313-0.313-0.828-0.313-1.141,0  l-6.276,6.267c-0.313,0.313-0.828,0.313-1.141,0l-2.282-2.28c-0.313-0.313-0.313-0.826,0-1.14l6.278-6.269  c0.313-0.312,0.313-0.826,0-1.14L1.709,5.147c-0.314-0.313-0.314-0.827,0-1.14l2.284-2.278C4.308,1.417,4.821,1.417,5.135,1.73  L11.405,8c0.314,0.314,0.828,0.314,1.141,0.001l6.276-6.267c0.312-0.312,0.826-0.312,1.141,0L22.245,4.015z"/></svg>';
  return r && i === e.trueValue || !r && (o && i || i === !0 || i === "true" || i === "True" || i === 1 || i === "1") ? (s.setAttribute("aria-checked", !0), a || "") : n && (i === "null" || i === "" || i === null || typeof i > "u") ? (s.setAttribute("aria-checked", "mixed"), "") : (s.setAttribute("aria-checked", !1), h || "");
}
function Dn(l, e, t) {
  var i = this.table.dependencyRegistry.lookup(["luxon", "DateTime"], "DateTime"), s = e.inputFormat || "yyyy-MM-dd HH:mm:ss", n = e.outputFormat || "dd/MM/yyyy HH:mm:ss", o = typeof e.invalidPlaceholder < "u" ? e.invalidPlaceholder : "", r = l.getValue();
  if (typeof i < "u") {
    var a;
    return i.isDateTime(r) ? a = r : s === "iso" ? a = i.fromISO(String(r)) : a = i.fromFormat(String(r), s), a.isValid ? (e.timezone && (a = a.setZone(e.timezone)), a.toFormat(n)) : o === !0 || !r ? r : typeof o == "function" ? o(r) : o;
  } else
    console.error("Format Error - 'datetime' formatter is dependant on luxon.js");
}
function _n(l, e, t) {
  var i = this.table.dependencyRegistry.lookup(["luxon", "DateTime"], "DateTime"), s = e.inputFormat || "yyyy-MM-dd HH:mm:ss", n = typeof e.invalidPlaceholder < "u" ? e.invalidPlaceholder : "", o = typeof e.suffix < "u" ? e.suffix : !1, r = typeof e.unit < "u" ? e.unit : "days", a = typeof e.humanize < "u" ? e.humanize : !1, h = typeof e.date < "u" ? e.date : i.now(), d = l.getValue();
  if (typeof i < "u") {
    var u;
    return i.isDateTime(d) ? u = d : s === "iso" ? u = i.fromISO(String(d)) : u = i.fromFormat(String(d), s), u.isValid ? a ? u.diff(h, r).toHuman() + (o ? " " + o : "") : parseInt(u.diff(h, r)[r]) + (o ? " " + o : "") : n === !0 ? d : typeof n == "function" ? n(d) : n;
  } else
    console.error("Format Error - 'datetimediff' formatter is dependant on luxon.js");
}
function Fn(l, e, t) {
  var i = l.getValue();
  return typeof e[i] > "u" ? (console.warn("Missing display value for " + i), i) : e[i];
}
function zn(l, e, t) {
  var i = l.getValue(), s = l.getElement(), n = e && e.stars ? e.stars : 5, o = document.createElement("span"), r = document.createElementNS("http://www.w3.org/2000/svg", "svg"), a = '<polygon fill="#FFEA00" stroke="#C1AB60" stroke-width="37.6152" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" points="259.216,29.942 330.27,173.919 489.16,197.007 374.185,309.08 401.33,467.31 259.216,392.612 117.104,467.31 144.25,309.08 29.274,197.007 188.165,173.919 "/>', h = '<polygon fill="#D2D2D2" stroke="#686868" stroke-width="37.6152" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" points="259.216,29.942 330.27,173.919 489.16,197.007 374.185,309.08 401.33,467.31 259.216,392.612 117.104,467.31 144.25,309.08 29.274,197.007 188.165,173.919 "/>';
  o.style.verticalAlign = "middle", r.setAttribute("width", "14"), r.setAttribute("height", "14"), r.setAttribute("viewBox", "0 0 512 512"), r.setAttribute("xml:space", "preserve"), r.style.padding = "0 1px", i = i && !isNaN(i) ? parseInt(i) : 0, i = Math.max(0, Math.min(i, n));
  for (var d = 1; d <= n; d++) {
    var u = r.cloneNode(!0);
    u.innerHTML = d <= i ? a : h, o.appendChild(u);
  }
  return s.style.whiteSpace = "nowrap", s.style.overflow = "hidden", s.style.textOverflow = "ellipsis", s.setAttribute("aria-label", i), o;
}
function Pn(l, e, t) {
  var i = this.sanitizeHTML(l.getValue()) || 0, s = document.createElement("span"), n = e && e.max ? e.max : 100, o = e && e.min ? e.min : 0, r = e && typeof e.color < "u" ? e.color : ["red", "orange", "green"], a = "#666666", h, d;
  if (!(isNaN(i) || typeof l.getValue() > "u")) {
    switch (s.classList.add("tabulator-traffic-light"), d = parseFloat(i) <= n ? parseFloat(i) : n, d = parseFloat(d) >= o ? parseFloat(d) : o, h = (n - o) / 100, d = Math.round((d - o) / h), typeof r) {
      case "string":
        a = r;
        break;
      case "function":
        a = r(i);
        break;
      case "object":
        if (Array.isArray(r)) {
          var u = 100 / r.length, c = Math.floor(d / u);
          c = Math.min(c, r.length - 1), c = Math.max(c, 0), a = r[c];
          break;
        }
    }
    return s.style.backgroundColor = a, s;
  }
}
function Hn(l, e = {}, t) {
  var i = this.sanitizeHTML(l.getValue()) || 0, s = l.getElement(), n = e.max ? e.max : 100, o = e.min ? e.min : 0, r = e.legendAlign ? e.legendAlign : "center", a, h, d, u, c;
  switch (h = parseFloat(i) <= n ? parseFloat(i) : n, h = parseFloat(h) >= o ? parseFloat(h) : o, a = (n - o) / 100, h = Math.round((h - o) / a), typeof e.color) {
    case "string":
      d = e.color;
      break;
    case "function":
      d = e.color(i);
      break;
    case "object":
      if (Array.isArray(e.color)) {
        let w = 100 / e.color.length, v = Math.floor(h / w);
        v = Math.min(v, e.color.length - 1), v = Math.max(v, 0), d = e.color[v];
        break;
      }
    default:
      d = "#2DC214";
  }
  switch (typeof e.legend) {
    case "string":
      u = e.legend;
      break;
    case "function":
      u = e.legend(i);
      break;
    case "boolean":
      u = i;
      break;
    default:
      u = !1;
  }
  switch (typeof e.legendColor) {
    case "string":
      c = e.legendColor;
      break;
    case "function":
      c = e.legendColor(i);
      break;
    case "object":
      if (Array.isArray(e.legendColor)) {
        let w = 100 / e.legendColor.length, v = Math.floor(h / w);
        v = Math.min(v, e.legendColor.length - 1), v = Math.max(v, 0), c = e.legendColor[v];
      }
      break;
    default:
      c = "#000";
  }
  s.style.minWidth = "30px", s.style.position = "relative", s.setAttribute("aria-label", h);
  var g = document.createElement("div");
  g.style.display = "inline-block", g.style.width = h + "%", g.style.backgroundColor = d, g.style.height = "100%", g.setAttribute("data-max", n), g.setAttribute("data-min", o);
  var m = document.createElement("div");
  if (m.style.position = "relative", m.style.width = "100%", m.style.height = "100%", u) {
    var E = document.createElement("div");
    E.style.position = "absolute", E.style.top = 0, E.style.left = 0, E.style.textAlign = r, E.style.width = "100%", E.style.color = c, E.innerHTML = u;
  }
  return t(function() {
    if (!(l instanceof Oi)) {
      var w = document.createElement("div");
      w.style.position = "absolute", w.style.top = "4px", w.style.bottom = "4px", w.style.left = "4px", w.style.right = "4px", s.appendChild(w), s = w;
    }
    s.appendChild(m), m.appendChild(g), u && m.appendChild(E);
  }), "";
}
function An(l, e, t) {
  return l.getElement().style.backgroundColor = this.sanitizeHTML(l.getValue()), "";
}
function On(l, e, t) {
  return '<svg enable-background="new 0 0 24 24" height="14" width="14" viewBox="0 0 24 24" xml:space="preserve" ><path fill="#2DC214" clip-rule="evenodd" d="M21.652,3.211c-0.293-0.295-0.77-0.295-1.061,0L9.41,14.34  c-0.293,0.297-0.771,0.297-1.062,0L3.449,9.351C3.304,9.203,3.114,9.13,2.923,9.129C2.73,9.128,2.534,9.201,2.387,9.351  l-2.165,1.946C0.078,11.445,0,11.63,0,11.823c0,0.194,0.078,0.397,0.223,0.544l4.94,5.184c0.292,0.296,0.771,0.776,1.062,1.07  l2.124,2.141c0.292,0.293,0.769,0.293,1.062,0l14.366-14.34c0.293-0.294,0.293-0.777,0-1.071L21.652,3.211z" fill-rule="evenodd"/></svg>';
}
function Bn(l, e, t) {
  return '<svg enable-background="new 0 0 24 24" height="14" width="14" viewBox="0 0 24 24" xml:space="preserve" ><path fill="#CE1515" d="M22.245,4.015c0.313,0.313,0.313,0.826,0,1.139l-6.276,6.27c-0.313,0.312-0.313,0.826,0,1.14l6.273,6.272  c0.313,0.313,0.313,0.826,0,1.14l-2.285,2.277c-0.314,0.312-0.828,0.312-1.142,0l-6.271-6.271c-0.313-0.313-0.828-0.313-1.141,0  l-6.276,6.267c-0.313,0.313-0.828,0.313-1.141,0l-2.282-2.28c-0.313-0.313-0.313-0.826,0-1.14l6.278-6.269  c0.313-0.312,0.313-0.826,0-1.14L1.709,5.147c-0.314-0.313-0.314-0.827,0-1.14l2.284-2.278C4.308,1.417,4.821,1.417,5.135,1.73  L11.405,8c0.314,0.314,0.828,0.314,1.141,0.001l6.276-6.267c0.312-0.312,0.826-0.312,1.141,0L22.245,4.015z"/></svg>';
}
function Nn(l, e, t) {
  var i = l.getValue(), s = e.size || 15, n = s + "px", o, r, a = e.hasOwnProperty("onValue") ? e.onValue : !0, h = e.hasOwnProperty("offValue") ? e.offValue : !1, d = e.onTruthy ? i : i === a;
  return o = document.createElement("div"), o.classList.add("tabulator-toggle"), d ? (o.classList.add("tabulator-toggle-on"), o.style.flexDirection = "row-reverse", e.onColor && (o.style.background = e.onColor)) : e.offColor && (o.style.background = e.offColor), o.style.width = 2.5 * s + "px", o.style.borderRadius = n, e.clickable && o.addEventListener("click", (u) => {
    l.setValue(d ? h : a);
  }), r = document.createElement("div"), r.classList.add("tabulator-toggle-switch"), r.style.height = n, r.style.width = n, r.style.borderRadius = n, o.appendChild(r), o;
}
function Vn(l, e, t) {
  var i = document.createElement("span"), s = l.getRow(), n = l.getTable();
  return s.watchPosition((o) => {
    e.relativeToPage && (o += n.modules.page.getPageSize() * (n.modules.page.getPage() - 1)), i.innerText = o;
  }), i;
}
function In(l, e, t) {
  return l.getElement().classList.add("tabulator-row-handle"), "<div class='tabulator-row-handle-box'><div class='tabulator-row-handle-bar'></div><div class='tabulator-row-handle-bar'></div><div class='tabulator-row-handle-bar'></div></div>";
}
function Wn(l, e, t) {
  var i, s, n;
  function o(r) {
    var a = r.getValue(), h = "plaintext";
    switch (typeof a) {
      case "boolean":
        h = "tickCross";
        break;
      case "string":
        a.includes(`
`) && (h = "textarea");
        break;
    }
    return h;
  }
  return i = e.formatterLookup ? e.formatterLookup(l) : o(l), e.paramsLookup && (n = typeof e.paramsLookup == "function" ? e.paramsLookup(i, l) : e.paramsLookup[i]), s = this.table.modules.format.lookupFormatter(i), s.call(this, l, n || {}, t);
}
function Gn(l, e, t) {
  var i = e.delimiter || ",", s = l.getValue(), n = this.table, o;
  return e.valueMap && (typeof e.valueMap == "string" ? o = function(r) {
    return r.map((a) => U.retrieveNestedData(n.options.nestedFieldSeparator, e.valueMap, a));
  } : o = e.valueMap), Array.isArray(s) ? (o && (s = o(s)), s.join(i)) : s;
}
function $n(l, e, t) {
  var i = e.indent || "	", s = typeof e.multiline > "u" ? !0 : e.multiline, n = e.replacer || null, o = l.getValue();
  return s && (l.getElement().style.whiteSpace = "pre-wrap"), JSON.stringify(o, n, i);
}
var jn = {
  plaintext: Rn,
  html: xn,
  textarea: Tn,
  money: kn,
  link: Mn,
  image: Ln,
  tickCross: Sn,
  datetime: Dn,
  datetimediff: _n,
  lookup: Fn,
  star: zn,
  traffic: Pn,
  progress: Hn,
  color: An,
  buttonTick: On,
  buttonCross: Bn,
  toggle: Nn,
  rownum: Vn,
  handle: In,
  adaptable: Wn,
  array: Gn,
  json: $n
};
const We = class We extends O {
  constructor(e) {
    super(e), this.registerColumnOption("formatter"), this.registerColumnOption("formatterParams"), this.registerColumnOption("formatterPrint"), this.registerColumnOption("formatterPrintParams"), this.registerColumnOption("formatterClipboard"), this.registerColumnOption("formatterClipboardParams"), this.registerColumnOption("formatterHtmlOutput"), this.registerColumnOption("formatterHtmlOutputParams"), this.registerColumnOption("titleFormatter"), this.registerColumnOption("titleFormatterParams");
  }
  initialize() {
    this.subscribe("cell-format", this.formatValue.bind(this)), this.subscribe("cell-rendered", this.cellRendered.bind(this)), this.subscribe("column-layout", this.initializeColumn.bind(this)), this.subscribe("column-format", this.formatHeader.bind(this));
  }
  //initialize column formatter
  initializeColumn(e) {
    e.modules.format = this.lookupTypeFormatter(e, ""), typeof e.definition.formatterPrint < "u" && (e.modules.format.print = this.lookupTypeFormatter(e, "Print")), typeof e.definition.formatterClipboard < "u" && (e.modules.format.clipboard = this.lookupTypeFormatter(e, "Clipboard")), typeof e.definition.formatterHtmlOutput < "u" && (e.modules.format.htmlOutput = this.lookupTypeFormatter(e, "HtmlOutput"));
  }
  lookupTypeFormatter(e, t) {
    var i = { params: e.definition["formatter" + t + "Params"] || {} }, s = e.definition["formatter" + t];
    return i.formatter = this.lookupFormatter(s), i;
  }
  lookupFormatter(e) {
    var t;
    switch (typeof e) {
      case "string":
        We.formatters[e] ? t = We.formatters[e] : (console.warn("Formatter Error - No such formatter found: ", e), t = We.formatters.plaintext);
        break;
      case "function":
        t = e;
        break;
      default:
        t = We.formatters.plaintext;
        break;
    }
    return t;
  }
  cellRendered(e) {
    e.modules.format && e.modules.format.renderedCallback && !e.modules.format.rendered && (e.modules.format.renderedCallback(), e.modules.format.rendered = !0);
  }
  //return a formatted value for a column header
  formatHeader(e, t, i) {
    var s, n, o, r;
    return e.definition.titleFormatter ? (s = this.lookupFormatter(e.definition.titleFormatter), o = (a) => {
      e.titleFormatterRendered = a;
    }, r = {
      getValue: function() {
        return t;
      },
      getElement: function() {
        return i;
      },
      getType: function() {
        return "header";
      },
      getColumn: function() {
        return e.getComponent();
      },
      getTable: () => this.table
    }, n = e.definition.titleFormatterParams || {}, n = typeof n == "function" ? n() : n, s.call(this, r, n, o)) : t;
  }
  //return a formatted value for a cell
  formatValue(e) {
    var t = e.getComponent(), i = typeof e.column.modules.format.params == "function" ? e.column.modules.format.params(t) : e.column.modules.format.params;
    function s(n) {
      e.modules.format || (e.modules.format = {}), e.modules.format.renderedCallback = n, e.modules.format.rendered = !1;
    }
    return e.column.modules.format.formatter.call(this, t, i, s);
  }
  formatExportValue(e, t) {
    var i = e.column.modules.format[t], s;
    if (i) {
      let n = function(o) {
        e.modules.format || (e.modules.format = {}), e.modules.format.renderedCallback = o, e.modules.format.rendered = !1;
      };
      return s = typeof i.params == "function" ? i.params(e.getComponent()) : i.params, i.formatter.call(this, e.getComponent(), s, n);
    } else
      return this.formatValue(e);
  }
  sanitizeHTML(e) {
    if (e) {
      var t = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
        "/": "&#x2F;",
        "`": "&#x60;",
        "=": "&#x3D;"
      };
      return String(e).replace(/[&<>"'`=/]/g, function(i) {
        return t[i];
      });
    } else
      return e;
  }
  emptyToSpace(e) {
    return e === null || typeof e > "u" || e === "" ? "&nbsp;" : e;
  }
};
x(We, "moduleName", "format"), //load defaults
x(We, "formatters", jn);
let Zt = We;
class Ii extends O {
  constructor(e) {
    super(e), this.leftColumns = [], this.rightColumns = [], this.initializationMode = "left", this.active = !1, this.blocked = !0, this.registerColumnOption("frozen");
  }
  //reset initial state
  reset() {
    this.initializationMode = "left", this.leftColumns = [], this.rightColumns = [], this.active = !1;
  }
  initialize() {
    this.subscribe("cell-layout", this.layoutCell.bind(this)), this.subscribe("column-init", this.initializeColumn.bind(this)), this.subscribe("column-width", this.layout.bind(this)), this.subscribe("row-layout-after", this.layoutRow.bind(this)), this.subscribe("table-layout", this.layout.bind(this)), this.subscribe("columns-loading", this.reset.bind(this)), this.subscribe("column-add", this.reinitializeColumns.bind(this)), this.subscribe("column-deleted", this.reinitializeColumns.bind(this)), this.subscribe("column-hide", this.reinitializeColumns.bind(this)), this.subscribe("column-show", this.reinitializeColumns.bind(this)), this.subscribe("columns-loaded", this.reinitializeColumns.bind(this)), this.subscribe("table-redraw", this.layout.bind(this)), this.subscribe("layout-refreshing", this.blockLayout.bind(this)), this.subscribe("layout-refreshed", this.unblockLayout.bind(this)), this.subscribe("scrollbar-vertical", this.adjustForScrollbar.bind(this));
  }
  blockLayout() {
    this.blocked = !0;
  }
  unblockLayout() {
    this.blocked = !1;
  }
  layoutCell(e) {
    this.layoutElement(e.element, e.column);
  }
  reinitializeColumns() {
    this.reset(), this.table.columnManager.columnsByIndex.forEach((e) => {
      this.initializeColumn(e);
    }), this.layout();
  }
  //initialize specific column
  initializeColumn(e) {
    var t = { margin: 0, edge: !1 };
    e.isGroup || (this.frozenCheck(e) ? (t.position = this.initializationMode, this.initializationMode == "left" ? this.leftColumns.push(e) : this.rightColumns.unshift(e), this.active = !0, e.modules.frozen = t) : this.initializationMode = "right");
  }
  frozenCheck(e) {
    return e.parent.isGroup && e.definition.frozen && console.warn("Frozen Column Error - Parent column group must be frozen, not individual columns or sub column groups"), e.parent.isGroup ? this.frozenCheck(e.parent) : e.definition.frozen;
  }
  //layout calculation rows
  layoutCalcRows() {
    this.table.modExists("columnCalcs") && (this.table.modules.columnCalcs.topInitialized && this.table.modules.columnCalcs.topRow && this.layoutRow(this.table.modules.columnCalcs.topRow), this.table.modules.columnCalcs.botInitialized && this.table.modules.columnCalcs.botRow && this.layoutRow(this.table.modules.columnCalcs.botRow), this.table.modExists("groupRows") && this.layoutGroupCalcs(this.table.modules.groupRows.getGroups()));
  }
  layoutGroupCalcs(e) {
    e.forEach((t) => {
      t.calcs.top && this.layoutRow(t.calcs.top), t.calcs.bottom && this.layoutRow(t.calcs.bottom), t.groupList && t.groupList.length && this.layoutGroupCalcs(t.groupList);
    });
  }
  //calculate column positions and layout headers
  layoutColumnPosition(e) {
    var t = [], i = 0, s = 0;
    this.leftColumns.forEach((n, o) => {
      if (n.modules.frozen.marginValue = i, n.modules.frozen.margin = n.modules.frozen.marginValue + "px", n.visible && (i += n.getWidth()), o == this.leftColumns.length - 1 ? n.modules.frozen.edge = !0 : n.modules.frozen.edge = !1, n.parent.isGroup) {
        var r = this.getColGroupParentElement(n);
        t.includes(r) || (this.layoutElement(r, n), t.push(r)), r.classList.toggle("tabulator-frozen-left", n.modules.frozen.edge && n.modules.frozen.position === "left"), r.classList.toggle("tabulator-frozen-right", n.modules.frozen.edge && n.modules.frozen.position === "right");
      } else
        this.layoutElement(n.getElement(), n);
      e && n.cells.forEach((a) => {
        this.layoutElement(a.getElement(!0), n);
      });
    }), this.rightColumns.forEach((n, o) => {
      n.modules.frozen.marginValue = s, n.modules.frozen.margin = n.modules.frozen.marginValue + "px", n.visible && (s += n.getWidth()), o == this.rightColumns.length - 1 ? n.modules.frozen.edge = !0 : n.modules.frozen.edge = !1, n.parent.isGroup ? this.layoutElement(this.getColGroupParentElement(n), n) : this.layoutElement(n.getElement(), n), e && n.cells.forEach((r) => {
        this.layoutElement(r.getElement(!0), n);
      });
    });
  }
  getColGroupParentElement(e) {
    return e.parent.isGroup ? this.getColGroupParentElement(e.parent) : e.getElement();
  }
  //layout columns appropriately
  layout() {
    this.active && !this.blocked && (this.layoutColumnPosition(), this.reinitializeRows(), this.layoutCalcRows());
  }
  reinitializeRows() {
    var e = this.table.rowManager.getVisibleRows(!0), t = this.table.rowManager.getRows().filter((i) => !e.includes(i));
    t.forEach((i) => {
      i.deinitialize();
    }), e.forEach((i) => {
      i.type === "row" && this.layoutRow(i);
    });
  }
  layoutRow(e) {
    this.table.options.layout === "fitDataFill" && this.rightColumns.length && (this.table.rowManager.getTableElement().style.minWidth = "calc(100% - " + this.rightMargin + ")"), this.leftColumns.forEach((t) => {
      var i = e.getCell(t);
      i && this.layoutElement(i.getElement(!0), t);
    }), this.rightColumns.forEach((t) => {
      var i = e.getCell(t);
      i && this.layoutElement(i.getElement(!0), t);
    });
  }
  layoutElement(e, t) {
    var i;
    t.modules.frozen && e && (e.style.position = "sticky", this.table.rtl ? i = t.modules.frozen.position === "left" ? "right" : "left" : i = t.modules.frozen.position, e.style[i] = t.modules.frozen.margin, e.classList.add("tabulator-frozen"), e.classList.toggle("tabulator-frozen-left", t.modules.frozen.edge && t.modules.frozen.position === "left"), e.classList.toggle("tabulator-frozen-right", t.modules.frozen.edge && t.modules.frozen.position === "right"));
  }
  adjustForScrollbar(e) {
    this.rightColumns.length && (this.table.columnManager.getContentsElement().style.width = "calc(100% - " + e + "px)");
  }
  getFrozenColumns() {
    return this.leftColumns.concat(this.rightColumns);
  }
  _calcSpace(e, t) {
    var i = 0;
    for (let s = 0; s < t; s++)
      e[s].visible && (i += e[s].getWidth());
    return i;
  }
}
x(Ii, "moduleName", "frozenColumns");
class Wi extends O {
  constructor(e) {
    super(e), this.topElement = document.createElement("div"), this.rows = [], this.registerComponentFunction("row", "freeze", this.freezeRow.bind(this)), this.registerComponentFunction("row", "unfreeze", this.unfreezeRow.bind(this)), this.registerComponentFunction("row", "isFrozen", this.isRowFrozen.bind(this)), this.registerTableOption("frozenRowsField", "id"), this.registerTableOption("frozenRows", !1);
  }
  initialize() {
    var e = document.createDocumentFragment();
    this.rows = [], this.topElement.classList.add("tabulator-frozen-rows-holder"), e.appendChild(document.createElement("br")), e.appendChild(this.topElement), this.table.columnManager.getContentsElement().insertBefore(e, this.table.columnManager.headersElement.nextSibling), this.subscribe("row-deleting", this.detachRow.bind(this)), this.subscribe("rows-visible", this.visibleRows.bind(this)), this.registerDisplayHandler(this.getRows.bind(this), 10), this.table.options.frozenRows && (this.subscribe("data-processed", this.initializeRows.bind(this)), this.subscribe("row-added", this.initializeRow.bind(this)), this.subscribe("table-redrawing", this.resizeHolderWidth.bind(this)), this.subscribe("column-resized", this.resizeHolderWidth.bind(this)), this.subscribe("column-show", this.resizeHolderWidth.bind(this)), this.subscribe("column-hide", this.resizeHolderWidth.bind(this))), this.resizeHolderWidth();
  }
  resizeHolderWidth() {
    this.topElement.style.minWidth = this.table.columnManager.headersElement.offsetWidth + "px";
  }
  initializeRows() {
    this.table.rowManager.getRows().forEach((e) => {
      this.initializeRow(e);
    });
  }
  initializeRow(e) {
    var t = this.table.options.frozenRows, i = typeof t;
    i === "number" ? e.getPosition() && e.getPosition() + this.rows.length <= t && this.freezeRow(e) : i === "function" ? t.call(this.table, e.getComponent()) && this.freezeRow(e) : Array.isArray(t) && t.includes(e.data[this.options("frozenRowsField")]) && this.freezeRow(e);
  }
  isRowFrozen(e) {
    var t = this.rows.indexOf(e);
    return t > -1;
  }
  isFrozen() {
    return !!this.rows.length;
  }
  visibleRows(e, t) {
    return this.rows.forEach((i) => {
      t.push(i);
    }), t;
  }
  //filter frozen rows out of display data
  getRows(e) {
    var t = e.slice(0);
    return this.rows.forEach(function(i) {
      var s = t.indexOf(i);
      s > -1 && t.splice(s, 1);
    }), t;
  }
  freezeRow(e) {
    e.modules.frozen ? console.warn("Freeze Error - Row is already frozen") : (e.modules.frozen = !0, this.topElement.appendChild(e.getElement()), e.initialize(), e.normalizeHeight(), this.rows.push(e), this.refreshData(!1, "display"), this.table.rowManager.adjustTableSize(), this.styleRows());
  }
  unfreezeRow(e) {
    e.modules.frozen ? (e.modules.frozen = !1, this.detachRow(e), this.table.rowManager.adjustTableSize(), this.refreshData(!1, "display"), this.rows.length && this.styleRows()) : console.warn("Freeze Error - Row is already unfrozen");
  }
  detachRow(e) {
    var t = this.rows.indexOf(e);
    if (t > -1) {
      var i = e.getElement();
      i.parentNode && i.parentNode.removeChild(i), this.rows.splice(t, 1);
    }
  }
  styleRows(e) {
    this.rows.forEach((t, i) => {
      this.table.rowManager.styleRow(t, i);
    });
  }
}
x(Wi, "moduleName", "frozenRows");
class Un {
  constructor(e) {
    return this._group = e, this.type = "GroupComponent", new Proxy(this, {
      get: function(t, i, s) {
        return typeof t[i] < "u" ? t[i] : t._group.groupManager.table.componentFunctionBinder.handle("group", t._group, i);
      }
    });
  }
  getKey() {
    return this._group.key;
  }
  getField() {
    return this._group.field;
  }
  getElement() {
    return this._group.element;
  }
  getRows() {
    return this._group.getRows(!0);
  }
  getSubGroups() {
    return this._group.getSubGroups(!0);
  }
  getParentGroup() {
    return this._group.parent ? this._group.parent.getComponent() : !1;
  }
  isVisible() {
    return this._group.visible;
  }
  show() {
    this._group.show();
  }
  hide() {
    this._group.hide();
  }
  toggle() {
    this._group.toggleVisibility();
  }
  scrollTo(e, t) {
    return this._group.groupManager.table.rowManager.scrollToRow(this._group, e, t);
  }
  _getSelf() {
    return this._group;
  }
  getTable() {
    return this._group.groupManager.table;
  }
}
class nt {
  constructor(e, t, i, s, n, o, r) {
    this.groupManager = e, this.parent = t, this.key = s, this.level = i, this.field = n, this.hasSubGroups = i < e.groupIDLookups.length - 1, this.addRow = this.hasSubGroups ? this._addRowToGroup : this._addRow, this.type = "group", this.old = r, this.rows = [], this.groups = [], this.groupList = [], this.generator = o, this.element = !1, this.elementContents = !1, this.height = 0, this.outerHeight = 0, this.initialized = !1, this.calcs = {}, this.initialized = !1, this.modules = {}, this.arrowElement = !1, this.visible = r ? r.visible : typeof e.startOpen[i] < "u" ? e.startOpen[i] : e.startOpen[0], this.component = null, this.createElements(), this.addBindings(), this.createValueGroups();
  }
  wipe(e) {
    e || (this.groupList.length ? this.groupList.forEach(function(t) {
      t.wipe();
    }) : this.rows.forEach((t) => {
      t.modules && delete t.modules.group;
    })), this.element = !1, this.arrowElement = !1, this.elementContents = !1;
  }
  createElements() {
    var e = document.createElement("div");
    e.classList.add("tabulator-arrow"), this.element = document.createElement("div"), this.element.classList.add("tabulator-row"), this.element.classList.add("tabulator-group"), this.element.classList.add("tabulator-group-level-" + this.level), this.element.setAttribute("role", "rowgroup"), this.arrowElement = document.createElement("div"), this.arrowElement.classList.add("tabulator-group-toggle"), this.arrowElement.appendChild(e), this.groupManager.table.options.movableRows !== !1 && this.groupManager.table.modExists("moveRow") && this.groupManager.table.modules.moveRow.initializeGroupHeader(this);
  }
  createValueGroups() {
    var e = this.level + 1;
    this.groupManager.allowedValues && this.groupManager.allowedValues[e] && this.groupManager.allowedValues[e].forEach((t) => {
      this._createGroup(t, e);
    });
  }
  addBindings() {
    var e;
    this.groupManager.table.options.groupToggleElement && (e = this.groupManager.table.options.groupToggleElement == "arrow" ? this.arrowElement : this.element, e.addEventListener("click", (t) => {
      this.groupManager.table.options.groupToggleElement === "arrow" && (t.stopPropagation(), t.stopImmediatePropagation()), setTimeout(() => {
        this.toggleVisibility();
      });
    }));
  }
  _createGroup(e, t) {
    var i = t + "_" + e, s = new nt(this.groupManager, this, t, e, this.groupManager.groupIDLookups[t].field, this.groupManager.headerGenerator[t] || this.groupManager.headerGenerator[0], this.old ? this.old.groups[i] : !1);
    this.groups[i] = s, this.groupList.push(s);
  }
  _addRowToGroup(e) {
    var t = this.level + 1;
    if (this.hasSubGroups) {
      var i = this.groupManager.groupIDLookups[t].func(e.getData()), s = t + "_" + i;
      this.groupManager.allowedValues && this.groupManager.allowedValues[t] ? this.groups[s] && this.groups[s].addRow(e) : (this.groups[s] || this._createGroup(i, t), this.groups[s].addRow(e));
    }
  }
  _addRow(e) {
    this.rows.push(e), e.modules.group = this;
  }
  insertRow(e, t, i) {
    var s = this.conformRowData({});
    e.updateData(s);
    var n = this.rows.indexOf(t);
    n > -1 ? i ? this.rows.splice(n + 1, 0, e) : this.rows.splice(n, 0, e) : i ? this.rows.push(e) : this.rows.unshift(e), e.modules.group = this, this.groupManager.table.modExists("columnCalcs") && this.groupManager.table.options.columnCalcs != "table" && this.groupManager.table.modules.columnCalcs.recalcGroup(this), this.groupManager.updateGroupRows(!0);
  }
  scrollHeader(e) {
    this.arrowElement && (this.arrowElement.style.marginLeft = e, this.groupList.forEach(function(t) {
      t.scrollHeader(e);
    }));
  }
  getRowIndex(e) {
  }
  //update row data to match grouping constraints
  conformRowData(e) {
    return this.field ? e[this.field] = this.key : console.warn("Data Conforming Error - Cannot conform row data to match new group as groupBy is a function"), this.parent && (e = this.parent.conformRowData(e)), e;
  }
  removeRow(e) {
    var t = this.rows.indexOf(e), i = e.getElement();
    t > -1 && this.rows.splice(t, 1), !this.groupManager.table.options.groupValues && !this.rows.length ? (this.parent ? this.parent.removeGroup(this) : this.groupManager.removeGroup(this), this.groupManager.updateGroupRows(!0)) : (i.parentNode && i.parentNode.removeChild(i), this.groupManager.blockRedraw || (this.generateGroupHeaderContents(), this.groupManager.table.modExists("columnCalcs") && this.groupManager.table.options.columnCalcs != "table" && this.groupManager.table.modules.columnCalcs.recalcGroup(this)));
  }
  removeGroup(e) {
    var t = e.level + "_" + e.key, i;
    this.groups[t] && (delete this.groups[t], i = this.groupList.indexOf(e), i > -1 && this.groupList.splice(i, 1), this.groupList.length || (this.parent ? this.parent.removeGroup(this) : this.groupManager.removeGroup(this)));
  }
  getHeadersAndRows() {
    var e = [];
    return e.push(this), this._visSet(), this.calcs.top && (this.calcs.top.detachElement(), this.calcs.top.deleteCells()), this.calcs.bottom && (this.calcs.bottom.detachElement(), this.calcs.bottom.deleteCells()), this.visible ? this.groupList.length ? this.groupList.forEach(function(t) {
      e = e.concat(t.getHeadersAndRows());
    }) : (this.groupManager.table.options.columnCalcs != "table" && this.groupManager.table.modExists("columnCalcs") && this.groupManager.table.modules.columnCalcs.hasTopCalcs() && (this.calcs.top = this.groupManager.table.modules.columnCalcs.generateTopRow(this.rows), e.push(this.calcs.top)), e = e.concat(this.rows), this.groupManager.table.options.columnCalcs != "table" && this.groupManager.table.modExists("columnCalcs") && this.groupManager.table.modules.columnCalcs.hasBottomCalcs() && (this.calcs.bottom = this.groupManager.table.modules.columnCalcs.generateBottomRow(this.rows), e.push(this.calcs.bottom))) : !this.groupList.length && this.groupManager.table.options.columnCalcs != "table" && this.groupManager.table.modExists("columnCalcs") && (this.groupManager.table.modules.columnCalcs.hasTopCalcs() && this.groupManager.table.options.groupClosedShowCalcs && (this.calcs.top = this.groupManager.table.modules.columnCalcs.generateTopRow(this.rows), e.push(this.calcs.top)), this.groupManager.table.modules.columnCalcs.hasBottomCalcs() && this.groupManager.table.options.groupClosedShowCalcs && (this.calcs.bottom = this.groupManager.table.modules.columnCalcs.generateBottomRow(this.rows), e.push(this.calcs.bottom))), e;
  }
  getData(e, t) {
    var i = [];
    return this._visSet(), (!e || e && this.visible) && this.rows.forEach((s) => {
      i.push(s.getData(t || "data"));
    }), i;
  }
  getRowCount() {
    var e = 0;
    return this.groupList.length ? this.groupList.forEach((t) => {
      e += t.getRowCount();
    }) : e = this.rows.length, e;
  }
  toggleVisibility() {
    this.visible ? this.hide() : this.show();
  }
  hide() {
    this.visible = !1, this.groupManager.table.rowManager.getRenderMode() == "basic" && !this.groupManager.table.options.pagination ? (this.element.classList.remove("tabulator-group-visible"), this.groupList.length ? this.groupList.forEach((e) => {
      var t = e.getHeadersAndRows();
      t.forEach((i) => {
        i.detachElement();
      });
    }) : this.rows.forEach((e) => {
      var t = e.getElement();
      t.parentNode.removeChild(t);
    }), this.groupManager.updateGroupRows(!0)) : this.groupManager.updateGroupRows(!0), this.groupManager.table.externalEvents.dispatch("groupVisibilityChanged", this.getComponent(), !1);
  }
  show() {
    if (this.visible = !0, this.groupManager.table.rowManager.getRenderMode() == "basic" && !this.groupManager.table.options.pagination) {
      this.element.classList.add("tabulator-group-visible");
      var e = this.generateElement();
      this.groupList.length ? this.groupList.forEach((t) => {
        var i = t.getHeadersAndRows();
        i.forEach((s) => {
          var n = s.getElement();
          e.parentNode.insertBefore(n, e.nextSibling), s.initialize(), e = n;
        });
      }) : this.rows.forEach((t) => {
        var i = t.getElement();
        e.parentNode.insertBefore(i, e.nextSibling), t.initialize(), e = i;
      }), this.groupManager.updateGroupRows(!0);
    } else
      this.groupManager.updateGroupRows(!0);
    this.groupManager.table.externalEvents.dispatch("groupVisibilityChanged", this.getComponent(), !0);
  }
  _visSet() {
    var e = [];
    typeof this.visible == "function" && (this.rows.forEach(function(t) {
      e.push(t.getData());
    }), this.visible = this.visible(this.key, this.getRowCount(), e, this.getComponent()));
  }
  getRowGroup(e) {
    var t = !1;
    return this.groupList.length ? this.groupList.forEach(function(i) {
      var s = i.getRowGroup(e);
      s && (t = s);
    }) : this.rows.find(function(i) {
      return i === e;
    }) && (t = this), t;
  }
  getSubGroups(e) {
    var t = [];
    return this.groupList.forEach(function(i) {
      t.push(e ? i.getComponent() : i);
    }), t;
  }
  getRows(e, t) {
    var i = [];
    return t && this.groupList.length ? this.groupList.forEach((s) => {
      i = i.concat(s.getRows(e, t));
    }) : this.rows.forEach(function(s) {
      i.push(e ? s.getComponent() : s);
    }), i;
  }
  generateGroupHeaderContents() {
    var e = [], t = this.getRows(!1, !0);
    for (t.forEach(function(i) {
      e.push(i.getData());
    }), this.elementContents = this.generator(this.key, this.getRowCount(), e, this.getComponent()); this.element.firstChild; ) this.element.removeChild(this.element.firstChild);
    typeof this.elementContents == "string" ? this.element.innerHTML = this.elementContents : this.element.appendChild(this.elementContents), this.element.insertBefore(this.arrowElement, this.element.firstChild);
  }
  getPath(e = []) {
    return e.unshift(this.key), this.parent && this.parent.getPath(e), e;
  }
  ////////////// Standard Row Functions //////////////
  getElement() {
    return this.elementContents ? this.element : this.generateElement();
  }
  generateElement() {
    this.addBindings = !1, this._visSet(), this.visible ? this.element.classList.add("tabulator-group-visible") : this.element.classList.remove("tabulator-group-visible");
    for (var e = 0; e < this.element.childNodes.length; ++e)
      this.element.childNodes[e].parentNode.removeChild(this.element.childNodes[e]);
    return this.generateGroupHeaderContents(), this.element;
  }
  detachElement() {
    this.element && this.element.parentNode && this.element.parentNode.removeChild(this.element);
  }
  //normalize the height of elements in the row
  normalizeHeight() {
    this.setHeight(this.element.clientHeight);
  }
  initialize(e) {
    (!this.initialized || e) && (this.normalizeHeight(), this.initialized = !0);
  }
  reinitialize() {
    this.initialized = !1, this.height = 0, U.elVisible(this.element) && this.initialize(!0);
  }
  setHeight(e) {
    this.height != e && (this.height = e, this.outerHeight = this.element.offsetHeight);
  }
  //return rows outer height
  getHeight() {
    return this.outerHeight;
  }
  getGroup() {
    return this;
  }
  reinitializeHeight() {
  }
  calcHeight() {
  }
  setCellHeight() {
  }
  clearCellHeight() {
  }
  deinitializeHeight() {
  }
  rendered() {
  }
  //////////////// Object Generation /////////////////
  getComponent() {
    return this.component || (this.component = new Un(this)), this.component;
  }
}
class Gi extends O {
  constructor(e) {
    super(e), this.groupIDLookups = !1, this.startOpen = [function() {
      return !1;
    }], this.headerGenerator = [function() {
      return "";
    }], this.groupList = [], this.allowedValues = !1, this.groups = {}, this.displayHandler = this.getRows.bind(this), this.blockRedraw = !1, this.registerTableOption("groupBy", !1), this.registerTableOption("groupStartOpen", !0), this.registerTableOption("groupValues", !1), this.registerTableOption("groupUpdateOnCellEdit", !1), this.registerTableOption("groupHeader", !1), this.registerTableOption("groupHeaderPrint", null), this.registerTableOption("groupHeaderClipboard", null), this.registerTableOption("groupHeaderHtmlOutput", null), this.registerTableOption("groupHeaderDownload", null), this.registerTableOption("groupToggleElement", "arrow"), this.registerTableOption("groupClosedShowCalcs", !1), this.registerTableFunction("setGroupBy", this.setGroupBy.bind(this)), this.registerTableFunction("setGroupValues", this.setGroupValues.bind(this)), this.registerTableFunction("setGroupStartOpen", this.setGroupStartOpen.bind(this)), this.registerTableFunction("setGroupHeader", this.setGroupHeader.bind(this)), this.registerTableFunction("getGroups", this.userGetGroups.bind(this)), this.registerTableFunction("getGroupedData", this.userGetGroupedData.bind(this)), this.registerComponentFunction("row", "getGroup", this.rowGetGroup.bind(this));
  }
  //initialize group configuration
  initialize() {
    this.subscribe("table-destroy", this._blockRedrawing.bind(this)), this.subscribe("rows-wipe", this._blockRedrawing.bind(this)), this.subscribe("rows-wiped", this._restore_redrawing.bind(this)), this.table.options.groupBy && (this.table.options.groupUpdateOnCellEdit && (this.subscribe("cell-value-updated", this.cellUpdated.bind(this)), this.subscribe("row-data-changed", this.reassignRowToGroup.bind(this), 0)), this.subscribe("table-built", this.configureGroupSetup.bind(this)), this.subscribe("row-deleting", this.rowDeleting.bind(this)), this.subscribe("row-deleted", this.rowsUpdated.bind(this)), this.subscribe("scroll-horizontal", this.scrollHeaders.bind(this)), this.subscribe("rows-wipe", this.wipe.bind(this)), this.subscribe("rows-added", this.rowsUpdated.bind(this)), this.subscribe("row-moving", this.rowMoving.bind(this)), this.subscribe("row-adding-index", this.rowAddingIndex.bind(this)), this.subscribe("rows-sample", this.rowSample.bind(this)), this.subscribe("render-virtual-fill", this.virtualRenderFill.bind(this)), this.registerDisplayHandler(this.displayHandler, 20), this.initialized = !0);
  }
  _blockRedrawing() {
    this.blockRedraw = !0;
  }
  _restore_redrawing() {
    this.blockRedraw = !1;
  }
  configureGroupSetup() {
    if (this.table.options.groupBy) {
      var e = this.table.options.groupBy, t = this.table.options.groupStartOpen, i = this.table.options.groupHeader;
      if (this.allowedValues = this.table.options.groupValues, Array.isArray(e) && Array.isArray(i) && e.length > i.length && console.warn("Error creating group headers, groupHeader array is shorter than groupBy array"), this.headerGenerator = [function() {
        return "";
      }], this.startOpen = [function() {
        return !1;
      }], this.langBind("groups|item", (n, o) => {
        this.headerGenerator[0] = (r, a, h) => (typeof r > "u" ? "" : r) + "<span>(" + a + " " + (a === 1 ? n : o.groups.items) + ")</span>";
      }), this.groupIDLookups = [], e)
        this.table.modExists("columnCalcs") && this.table.options.columnCalcs != "table" && this.table.options.columnCalcs != "both" && this.table.modules.columnCalcs.removeCalcs();
      else if (this.table.modExists("columnCalcs") && this.table.options.columnCalcs != "group") {
        var s = this.table.columnManager.getRealColumns();
        s.forEach((n) => {
          n.definition.topCalc && this.table.modules.columnCalcs.initializeTopRow(), n.definition.bottomCalc && this.table.modules.columnCalcs.initializeBottomRow();
        });
      }
      Array.isArray(e) || (e = [e]), e.forEach((n, o) => {
        var r, a;
        typeof n == "function" ? r = n : (a = this.table.columnManager.getColumnByField(n), a ? r = function(h) {
          return a.getFieldValue(h);
        } : r = function(h) {
          return h[n];
        }), this.groupIDLookups.push({
          field: typeof n == "function" ? !1 : n,
          func: r,
          values: this.allowedValues ? this.allowedValues[o] : !1
        });
      }), t && (Array.isArray(t) || (t = [t]), t.forEach((n) => {
      }), this.startOpen = t), i && (this.headerGenerator = Array.isArray(i) ? i : [i]);
    } else
      this.groupList = [], this.groups = {};
  }
  rowSample(e, t) {
    if (this.table.options.groupBy) {
      var i = this.getGroups(!1)[0];
      t.push(i.getRows(!1)[0]);
    }
    return t;
  }
  virtualRenderFill() {
    var e = this.table.rowManager.tableElement, t = this.table.rowManager.getVisibleRows();
    if (this.table.options.groupBy)
      t = t.filter((i) => i.type !== "group"), e.style.minWidth = t.length ? "" : this.table.columnManager.getWidth() + "px";
    else
      return t;
  }
  rowAddingIndex(e, t, i) {
    if (this.table.options.groupBy) {
      this.assignRowToGroup(e);
      var s = e.modules.group.rows;
      return s.length > 1 && (!t || t && s.indexOf(t) == -1 ? i ? s[0] !== e && (t = s[0], this.table.rowManager.moveRowInArray(e.modules.group.rows, e, t, !i)) : s[s.length - 1] !== e && (t = s[s.length - 1], this.table.rowManager.moveRowInArray(e.modules.group.rows, e, t, !i)) : this.table.rowManager.moveRowInArray(e.modules.group.rows, e, t, !i)), t;
    }
  }
  trackChanges() {
    this.dispatch("group-changed");
  }
  ///////////////////////////////////
  ///////// Table Functions /////////
  ///////////////////////////////////
  setGroupBy(e) {
    this.table.options.groupBy = e, this.initialized || this.initialize(), this.configureGroupSetup(), !e && this.table.modExists("columnCalcs") && this.table.options.columnCalcs === !0 && this.table.modules.columnCalcs.reinitializeCalcs(), this.refreshData(), this.trackChanges();
  }
  setGroupValues(e) {
    this.table.options.groupValues = e, this.configureGroupSetup(), this.refreshData(), this.trackChanges();
  }
  setGroupStartOpen(e) {
    this.table.options.groupStartOpen = e, this.configureGroupSetup(), this.table.options.groupBy ? (this.refreshData(), this.trackChanges()) : console.warn("Grouping Update - cant refresh view, no groups have been set");
  }
  setGroupHeader(e) {
    this.table.options.groupHeader = e, this.configureGroupSetup(), this.table.options.groupBy ? (this.refreshData(), this.trackChanges()) : console.warn("Grouping Update - cant refresh view, no groups have been set");
  }
  userGetGroups(e) {
    return this.getGroups(!0);
  }
  // get grouped table data in the same format as getData()
  userGetGroupedData() {
    return this.table.options.groupBy ? this.getGroupedData() : this.getData();
  }
  ///////////////////////////////////////
  ///////// Component Functions /////////
  ///////////////////////////////////////
  rowGetGroup(e) {
    return e.modules.group ? e.modules.group.getComponent() : !1;
  }
  ///////////////////////////////////
  ///////// Internal Logic //////////
  ///////////////////////////////////
  rowMoving(e, t, i) {
    if (this.table.options.groupBy) {
      !i && t instanceof nt && (t = this.table.rowManager.prevDisplayRow(e) || t);
      var s = t instanceof nt ? t : t.modules.group, n = e instanceof nt ? e : e.modules.group;
      s === n ? this.table.rowManager.moveRowInArray(s.rows, e, t, i) : (n && n.removeRow(e), s.insertRow(e, t, i));
    }
  }
  rowDeleting(e) {
    this.table.options.groupBy && e.modules.group && e.modules.group.removeRow(e);
  }
  rowsUpdated(e) {
    this.table.options.groupBy && this.updateGroupRows(!0);
  }
  cellUpdated(e) {
    this.table.options.groupBy && this.reassignRowToGroup(e.row);
  }
  //return appropriate rows with group headers
  getRows(e) {
    return this.table.options.groupBy && this.groupIDLookups.length ? (this.dispatchExternal("dataGrouping"), this.generateGroups(e), this.subscribedExternal("dataGrouped") && this.dispatchExternal("dataGrouped", this.getGroups(!0)), this.updateGroupRows()) : e.slice(0);
  }
  getGroups(e) {
    var t = [];
    return this.groupList.forEach(function(i) {
      t.push(e ? i.getComponent() : i);
    }), t;
  }
  getChildGroups(e) {
    var t = [];
    return e || (e = this), e.groupList.forEach((i) => {
      i.groupList.length ? t = t.concat(this.getChildGroups(i)) : t.push(i);
    }), t;
  }
  wipe() {
    this.table.options.groupBy && (this.groupList.forEach(function(e) {
      e.wipe();
    }), this.groupList = [], this.groups = {});
  }
  pullGroupListData(e) {
    var t = [];
    return e.forEach((i) => {
      var s = {};
      s.level = 0, s.rowCount = 0, s.headerContent = "";
      var n = [];
      i.hasSubGroups ? (n = this.pullGroupListData(i.groupList), s.level = i.level, s.rowCount = n.length - i.groupList.length, s.headerContent = i.generator(i.key, s.rowCount, i.rows, i), t.push(s), t = t.concat(n)) : (s.level = i.level, s.headerContent = i.generator(i.key, i.rows.length, i.rows, i), s.rowCount = i.getRows().length, t.push(s), i.getRows().forEach((o) => {
        t.push(o.getData("data"));
      }));
    }), t;
  }
  getGroupedData() {
    return this.pullGroupListData(this.groupList);
  }
  getRowGroup(e) {
    var t = !1;
    return this.options("dataTree") && (e = this.table.modules.dataTree.getTreeParentRoot(e)), this.groupList.forEach((i) => {
      var s = i.getRowGroup(e);
      s && (t = s);
    }), t;
  }
  countGroups() {
    return this.groupList.length;
  }
  generateGroups(e) {
    var t = this.groups;
    this.groups = {}, this.groupList = [], this.allowedValues && this.allowedValues[0] ? (this.allowedValues[0].forEach((i) => {
      this.createGroup(i, 0, t);
    }), e.forEach((i) => {
      this.assignRowToExistingGroup(i, t);
    })) : e.forEach((i) => {
      this.assignRowToGroup(i, t);
    }), Object.values(t).forEach((i) => {
      i.wipe(!0);
    });
  }
  createGroup(e, t, i) {
    var s = t + "_" + e, n;
    i = i || [], n = new nt(this, !1, t, e, this.groupIDLookups[0].field, this.headerGenerator[0], i[s]), this.groups[s] = n, this.groupList.push(n);
  }
  assignRowToExistingGroup(e, t) {
    var i = this.groupIDLookups[0].func(e.getData()), s = "0_" + i;
    this.groups[s] && this.groups[s].addRow(e);
  }
  assignRowToGroup(e, t) {
    var i = this.groupIDLookups[0].func(e.getData()), s = !this.groups["0_" + i];
    return s && this.createGroup(i, 0, t), this.groups["0_" + i].addRow(e), !s;
  }
  reassignRowToGroup(e) {
    if (e.type === "row") {
      var t = e.modules.group, i = t.getPath(), s = this.getExpectedPath(e), n;
      n = i.length == s.length && i.every((o, r) => o === s[r]), n || (t.removeRow(e), this.assignRowToGroup(e, this.groups), this.refreshData(!0));
    }
  }
  getExpectedPath(e) {
    var t = [], i = e.getData();
    return this.groupIDLookups.forEach((s) => {
      t.push(s.func(i));
    }), t;
  }
  updateGroupRows(e) {
    var t = [];
    return this.blockRedraw || (this.groupList.forEach((i) => {
      t = t.concat(i.getHeadersAndRows());
    }), e && this.refreshData(!0)), t;
  }
  scrollHeaders(e) {
    this.table.options.groupBy && (this.table.options.renderHorizontal === "virtual" && (e -= this.table.columnManager.renderer.vDomPadLeft), e = e + "px", this.groupList.forEach((t) => {
      t.scrollHeader(e);
    }));
  }
  removeGroup(e) {
    var t = e.level + "_" + e.key, i;
    this.groups[t] && (delete this.groups[t], i = this.groupList.indexOf(e), i > -1 && this.groupList.splice(i, 1));
  }
  checkBasicModeGroupHeaderWidth() {
    var e = this.table.rowManager.tableElement, t = !0;
    this.table.rowManager.getDisplayRows().forEach((i, s) => {
      this.table.rowManager.styleRow(i, s), e.appendChild(i.getElement()), i.initialize(!0), i.type !== "group" && (t = !1);
    }), t ? e.style.minWidth = this.table.columnManager.getWidth() + "px" : e.style.minWidth = "";
  }
}
x(Gi, "moduleName", "groupRows");
var qn = {
  cellEdit: function(l) {
    l.component.setValueProcessData(l.data.oldValue), l.component.cellRendered();
  },
  rowAdd: function(l) {
    l.component.deleteActual(), this.table.rowManager.checkPlaceholder();
  },
  rowDelete: function(l) {
    var e = this.table.rowManager.addRowActual(l.data.data, l.data.pos, l.data.index);
    this.table.options.groupBy && this.table.modExists("groupRows") && this.table.modules.groupRows.updateGroupRows(!0), this._rebindRow(l.component, e), this.table.rowManager.checkPlaceholder();
  },
  rowMove: function(l) {
    var e = l.data.posFrom - l.data.posTo > 0;
    this.table.rowManager.moveRowActual(l.component, this.table.rowManager.getRowFromPosition(l.data.posFrom), e), this.table.rowManager.regenerateRowPositions(), this.table.rowManager.reRenderInPosition();
  }
}, Kn = {
  cellEdit: function(l) {
    l.component.setValueProcessData(l.data.newValue), l.component.cellRendered();
  },
  rowAdd: function(l) {
    var e = this.table.rowManager.addRowActual(l.data.data, l.data.pos, l.data.index);
    this.table.options.groupBy && this.table.modExists("groupRows") && this.table.modules.groupRows.updateGroupRows(!0), this._rebindRow(l.component, e), this.table.rowManager.checkPlaceholder();
  },
  rowDelete: function(l) {
    l.component.deleteActual(), this.table.rowManager.checkPlaceholder();
  },
  rowMove: function(l) {
    this.table.rowManager.moveRowActual(l.component, this.table.rowManager.getRowFromPosition(l.data.posTo), l.data.after), this.table.rowManager.regenerateRowPositions(), this.table.rowManager.reRenderInPosition();
  }
}, Xn = {
  undo: ["ctrl + 90", "meta + 90"],
  redo: ["ctrl + 89", "meta + 89"]
}, Jn = {
  undo: function(l) {
    var e = !1;
    this.table.options.history && this.table.modExists("history") && this.table.modExists("edit") && (e = this.table.modules.edit.currentCell, e || (l.preventDefault(), this.table.modules.history.undo()));
  },
  redo: function(l) {
    var e = !1;
    this.table.options.history && this.table.modExists("history") && this.table.modExists("edit") && (e = this.table.modules.edit.currentCell, e || (l.preventDefault(), this.table.modules.history.redo()));
  }
}, Yn = {
  keybindings: {
    bindings: Xn,
    actions: Jn
  }
};
const Ge = class Ge extends O {
  constructor(e) {
    super(e), this.history = [], this.index = -1, this.registerTableOption("history", !1);
  }
  initialize() {
    this.table.options.history && (this.subscribe("cell-value-updated", this.cellUpdated.bind(this)), this.subscribe("cell-delete", this.clearComponentHistory.bind(this)), this.subscribe("row-delete", this.rowDeleted.bind(this)), this.subscribe("rows-wipe", this.clear.bind(this)), this.subscribe("row-added", this.rowAdded.bind(this)), this.subscribe("row-move", this.rowMoved.bind(this))), this.registerTableFunction("undo", this.undo.bind(this)), this.registerTableFunction("redo", this.redo.bind(this)), this.registerTableFunction("getHistoryUndoSize", this.getHistoryUndoSize.bind(this)), this.registerTableFunction("getHistoryRedoSize", this.getHistoryRedoSize.bind(this)), this.registerTableFunction("clearHistory", this.clear.bind(this));
  }
  rowMoved(e, t, i) {
    this.action("rowMove", e, { posFrom: e.getPosition(), posTo: t.getPosition(), to: t, after: i });
  }
  rowAdded(e, t, i, s) {
    this.action("rowAdd", e, { data: t, pos: i, index: s });
  }
  rowDeleted(e) {
    var t, i;
    this.table.options.groupBy ? (i = e.getComponent().getGroup()._getSelf().rows, t = i.indexOf(e), t && (t = i[t - 1])) : (t = e.table.rowManager.getRowIndex(e), t && (t = e.table.rowManager.rows[t - 1])), this.action("rowDelete", e, { data: e.getData(), pos: !t, index: t });
  }
  cellUpdated(e) {
    this.action("cellEdit", e, { oldValue: e.oldValue, newValue: e.value });
  }
  clear() {
    this.history = [], this.index = -1;
  }
  action(e, t, i) {
    this.history = this.history.slice(0, this.index + 1), this.history.push({
      type: e,
      component: t,
      data: i
    }), this.index++;
  }
  getHistoryUndoSize() {
    return this.index + 1;
  }
  getHistoryRedoSize() {
    return this.history.length - (this.index + 1);
  }
  clearComponentHistory(e) {
    var t = this.history.findIndex(function(i) {
      return i.component === e;
    });
    t > -1 && (this.history.splice(t, 1), t <= this.index && this.index--, this.clearComponentHistory(e));
  }
  undo() {
    if (this.index > -1) {
      let e = this.history[this.index];
      return Ge.undoers[e.type].call(this, e), this.index--, this.dispatchExternal("historyUndo", e.type, e.component.getComponent(), e.data), !0;
    } else
      return console.warn(this.options("history") ? "History Undo Error - No more history to undo" : "History module not enabled"), !1;
  }
  redo() {
    if (this.history.length - 1 > this.index) {
      this.index++;
      let e = this.history[this.index];
      return Ge.redoers[e.type].call(this, e), this.dispatchExternal("historyRedo", e.type, e.component.getComponent(), e.data), !0;
    } else
      return console.warn(this.options("history") ? "History Redo Error - No more history to redo" : "History module not enabled"), !1;
  }
  //rebind rows to new element after deletion
  _rebindRow(e, t) {
    this.history.forEach(function(i) {
      if (i.component instanceof re)
        i.component === e && (i.component = t);
      else if (i.component instanceof kt && i.component.row === e) {
        var s = i.component.column.getField();
        s && (i.component = t.getCell(s));
      }
    });
  }
};
x(Ge, "moduleName", "history"), x(Ge, "moduleExtensions", Yn), //load defaults
x(Ge, "undoers", qn), x(Ge, "redoers", Kn);
let ei = Ge;
class $i extends O {
  constructor(e) {
    super(e), this.fieldIndex = [], this.hasIndex = !1;
  }
  initialize() {
    this.tableElementCheck();
  }
  tableElementCheck() {
    this.table.originalElement && this.table.originalElement.tagName === "TABLE" && (this.table.originalElement.childNodes.length ? this.parseTable() : console.warn("Unable to parse data from empty table tag, Tabulator should be initialized on a div tag unless importing data from a table element."));
  }
  parseTable() {
    var e = this.table.originalElement, t = this.table.options, i = e.getElementsByTagName("th"), s = e.getElementsByTagName("tbody")[0], n = [];
    this.hasIndex = !1, this.dispatchExternal("htmlImporting"), s = s ? s.getElementsByTagName("tr") : [], this._extractOptions(e, t), i.length ? this._extractHeaders(i, s) : this._generateBlankHeaders(i, s);
    for (var o = 0; o < s.length; o++) {
      var r = s[o], a = r.getElementsByTagName("td"), h = {};
      this.hasIndex || (h[t.index] = o);
      for (var d = 0; d < a.length; d++) {
        var u = a[d];
        typeof this.fieldIndex[d] < "u" && (h[this.fieldIndex[d]] = u.innerHTML);
      }
      n.push(h);
    }
    t.data = n, this.dispatchExternal("htmlImported");
  }
  //extract tabulator attribute options
  _extractOptions(e, t, i) {
    var s = e.attributes, n = Object.keys(i || t), o = {};
    n.forEach((d) => {
      o[d.toLowerCase()] = d;
    });
    for (var r in s) {
      var a = s[r], h;
      a && typeof a == "object" && a.name && a.name.indexOf("tabulator-") === 0 && (h = a.name.replace("tabulator-", ""), typeof o[h] < "u" && (t[o[h]] = this._attribValue(a.value)));
    }
  }
  //get value of attribute
  _attribValue(e) {
    return e === "true" ? !0 : e === "false" ? !1 : e;
  }
  //find column if it has already been defined
  _findCol(e) {
    var t = this.table.options.columns.find((i) => i.title === e);
    return t || !1;
  }
  //extract column from headers
  _extractHeaders(e, t) {
    for (var i = 0; i < e.length; i++) {
      var s = e[i], n = !1, o = this._findCol(s.textContent), r;
      o ? n = !0 : o = { title: s.textContent.trim() }, o.field || (o.field = s.textContent.trim().toLowerCase().replaceAll(" ", "_")), r = s.getAttribute("width"), r && !o.width && (o.width = r), this._extractOptions(s, o, this.table.columnManager.optionsList.registeredDefaults), this.fieldIndex[i] = o.field, o.field == this.table.options.index && (this.hasIndex = !0), n || this.table.options.columns.push(o);
    }
  }
  //generate blank headers
  _generateBlankHeaders(e, t) {
    for (var i = 0; i < e.length; i++) {
      var s = e[i], n = { title: "", field: "col" + i };
      this.fieldIndex[i] = n.field;
      var o = s.getAttribute("width");
      o && (n.width = o), this.table.options.columns.push(n);
    }
  }
}
x($i, "moduleName", "htmlTableImport");
function Qn(l) {
  var e = [], t = 0, i = 0, s = !1;
  for (let n = 0; n < l.length; n++) {
    let o = l[n], r = l[n + 1];
    if (e[t] || (e[t] = []), e[t][i] || (e[t][i] = ""), o == '"' && s && r == '"') {
      e[t][i] += o, n++;
      continue;
    }
    if (o == '"') {
      s = !s;
      continue;
    }
    if (o == "," && !s) {
      i++;
      continue;
    }
    if (o == "\r" && r == `
` && !s) {
      i = 0, t++, n++;
      continue;
    }
    if ((o == "\r" || o == `
`) && !s) {
      i = 0, t++;
      continue;
    }
    e[t][i] += o;
  }
  return e;
}
function Zn(l) {
  try {
    return JSON.parse(l);
  } catch (e) {
    return console.warn("JSON Import Error - File contents is invalid JSON", e), Promise.reject();
  }
}
function eo(l) {
  return l;
}
function to(l) {
  var e = this.dependencyRegistry.lookup("XLSX"), t = e.read(l), i = t.Sheets[t.SheetNames[0]];
  return e.utils.sheet_to_json(i, { header: 1 });
}
var io = {
  csv: Qn,
  json: Zn,
  array: eo,
  xlsx: to
};
const yt = class yt extends O {
  constructor(e) {
    super(e), this.registerTableOption("importFormat"), this.registerTableOption("importReader", "text"), this.registerTableOption("importHeaderTransform"), this.registerTableOption("importValueTransform"), this.registerTableOption("importDataValidator"), this.registerTableOption("importFileValidator");
  }
  initialize() {
    this.registerTableFunction("import", this.importFromFile.bind(this)), this.table.options.importFormat && (this.subscribe("data-loading", this.loadDataCheck.bind(this), 10), this.subscribe("data-load", this.loadData.bind(this), 10));
  }
  loadDataCheck(e) {
    return this.table.options.importFormat && (typeof e == "string" || Array.isArray(e) && e.length && Array.isArray(e));
  }
  loadData(e, t, i, s, n) {
    return this.importData(this.lookupImporter(), e).then(this.structureData.bind(this)).catch((o) => (console.error("Import Error:", o || "Unable to import data"), Promise.reject(o)));
  }
  lookupImporter(e) {
    var t;
    return e || (e = this.table.options.importFormat), typeof e == "string" ? t = yt.importers[e] : t = e, t || console.error("Import Error - Importer not found:", e), t;
  }
  importFromFile(e, t, i) {
    var s = this.lookupImporter(e);
    if (s)
      return this.pickFile(t, i).then(this.importData.bind(this, s)).then(this.structureData.bind(this)).then(this.mutateData.bind(this)).then(this.validateData.bind(this)).then(this.setData.bind(this)).catch((n) => (this.dispatch("import-error", n), this.dispatchExternal("importError", n), console.error("Import Error:", n || "Unable to import file"), this.table.dataLoader.alertError(), setTimeout(() => {
        this.table.dataLoader.clearAlert();
      }, 3e3), Promise.reject(n)));
  }
  pickFile(e, t) {
    return new Promise((i, s) => {
      var n = document.createElement("input");
      n.type = "file", n.accept = e, n.addEventListener("change", (o) => {
        var r = n.files[0], a = new FileReader(), h = this.validateFile(r);
        if (h === !0) {
          switch (this.dispatch("import-importing", n.files), this.dispatchExternal("importImporting", n.files), t || this.table.options.importReader) {
            case "buffer":
              a.readAsArrayBuffer(r);
              break;
            case "binary":
              a.readAsBinaryString(r);
              break;
            case "url":
              a.readAsDataURL(r);
              break;
            case "text":
            default:
              a.readAsText(r);
          }
          a.onload = (d) => {
            i(a.result);
          }, a.onerror = (d) => {
            console.warn("File Load Error - Unable to read file"), s(d);
          };
        } else
          s(h);
      }), this.dispatch("import-choose"), this.dispatchExternal("importChoose"), n.click();
    });
  }
  importData(e, t) {
    var i;
    return this.table.dataLoader.alertLoader(), new Promise((s, n) => {
      setTimeout(() => {
        i = e.call(this.table, t), i instanceof Promise || i ? s(i) : n();
      }, 10);
    });
  }
  structureData(e) {
    var t = [];
    return Array.isArray(e) && e.length && Array.isArray(e[0]) ? (this.table.options.autoColumns ? t = this.structureArrayToObject(e) : t = this.structureArrayToColumns(e), t) : e;
  }
  mutateData(e) {
    var t = [];
    return Array.isArray(e) ? e.forEach((i) => {
      t.push(this.table.modules.mutator.transformRow(i, "import"));
    }) : t = e, t;
  }
  transformHeader(e) {
    var t = [];
    if (this.table.options.importHeaderTransform)
      e.forEach((i) => {
        t.push(this.table.options.importHeaderTransform.call(this.table, i, e));
      });
    else
      return e;
    return t;
  }
  transformData(e) {
    var t = [];
    if (this.table.options.importValueTransform)
      e.forEach((i) => {
        t.push(this.table.options.importValueTransform.call(this.table, i, e));
      });
    else
      return e;
    return t;
  }
  structureArrayToObject(e) {
    var t = this.transformHeader(e.shift()), i = e.map((s) => {
      var n = {};
      return s = this.transformData(s), t.forEach((o, r) => {
        n[o] = s[r];
      }), n;
    });
    return i;
  }
  structureArrayToColumns(e) {
    var t = [], i = this.transformHeader(e[0]), s = this.table.getColumns();
    return s[0] && i[0] && s[0].getDefinition().title === i[0] && e.shift(), e.forEach((n) => {
      var o = {};
      n = this.transformData(n), n.forEach((r, a) => {
        var h = s[a];
        h && (o[h.getField()] = r);
      }), t.push(o);
    }), t;
  }
  validateFile(e) {
    return this.table.options.importFileValidator ? this.table.options.importFileValidator.call(this.table, e) : !0;
  }
  validateData(e) {
    var t;
    return this.table.options.importDataValidator ? (t = this.table.options.importDataValidator.call(this.table, e), t === !0 ? e : Promise.reject(t)) : e;
  }
  setData(e) {
    return this.dispatch("import-imported", e), this.dispatchExternal("importImported", e), this.table.dataLoader.clearAlert(), this.table.setData(e);
  }
};
x(yt, "moduleName", "import"), //load defaults
x(yt, "importers", io);
let ti = yt;
class ji extends O {
  constructor(e) {
    super(e), this.eventMap = {
      //row events
      rowClick: "row-click",
      rowDblClick: "row-dblclick",
      rowContext: "row-contextmenu",
      rowMouseEnter: "row-mouseenter",
      rowMouseLeave: "row-mouseleave",
      rowMouseOver: "row-mouseover",
      rowMouseOut: "row-mouseout",
      rowMouseMove: "row-mousemove",
      rowMouseDown: "row-mousedown",
      rowMouseUp: "row-mouseup",
      rowTap: "row",
      rowDblTap: "row",
      rowTapHold: "row",
      //cell events
      cellClick: "cell-click",
      cellDblClick: "cell-dblclick",
      cellContext: "cell-contextmenu",
      cellMouseEnter: "cell-mouseenter",
      cellMouseLeave: "cell-mouseleave",
      cellMouseOver: "cell-mouseover",
      cellMouseOut: "cell-mouseout",
      cellMouseMove: "cell-mousemove",
      cellMouseDown: "cell-mousedown",
      cellMouseUp: "cell-mouseup",
      cellTap: "cell",
      cellDblTap: "cell",
      cellTapHold: "cell",
      //column header events
      headerClick: "column-click",
      headerDblClick: "column-dblclick",
      headerContext: "column-contextmenu",
      headerMouseEnter: "column-mouseenter",
      headerMouseLeave: "column-mouseleave",
      headerMouseOver: "column-mouseover",
      headerMouseOut: "column-mouseout",
      headerMouseMove: "column-mousemove",
      headerMouseDown: "column-mousedown",
      headerMouseUp: "column-mouseup",
      headerTap: "column",
      headerDblTap: "column",
      headerTapHold: "column",
      //group header
      groupClick: "group-click",
      groupDblClick: "group-dblclick",
      groupContext: "group-contextmenu",
      groupMouseEnter: "group-mouseenter",
      groupMouseLeave: "group-mouseleave",
      groupMouseOver: "group-mouseover",
      groupMouseOut: "group-mouseout",
      groupMouseMove: "group-mousemove",
      groupMouseDown: "group-mousedown",
      groupMouseUp: "group-mouseup",
      groupTap: "group",
      groupDblTap: "group",
      groupTapHold: "group"
    }, this.subscribers = {}, this.touchSubscribers = {}, this.columnSubscribers = {}, this.touchWatchers = {
      row: {
        tap: null,
        tapDbl: null,
        tapHold: null
      },
      cell: {
        tap: null,
        tapDbl: null,
        tapHold: null
      },
      column: {
        tap: null,
        tapDbl: null,
        tapHold: null
      },
      group: {
        tap: null,
        tapDbl: null,
        tapHold: null
      }
    }, this.registerColumnOption("headerClick"), this.registerColumnOption("headerDblClick"), this.registerColumnOption("headerContext"), this.registerColumnOption("headerMouseEnter"), this.registerColumnOption("headerMouseLeave"), this.registerColumnOption("headerMouseOver"), this.registerColumnOption("headerMouseOut"), this.registerColumnOption("headerMouseMove"), this.registerColumnOption("headerMouseDown"), this.registerColumnOption("headerMouseUp"), this.registerColumnOption("headerTap"), this.registerColumnOption("headerDblTap"), this.registerColumnOption("headerTapHold"), this.registerColumnOption("cellClick"), this.registerColumnOption("cellDblClick"), this.registerColumnOption("cellContext"), this.registerColumnOption("cellMouseEnter"), this.registerColumnOption("cellMouseLeave"), this.registerColumnOption("cellMouseOver"), this.registerColumnOption("cellMouseOut"), this.registerColumnOption("cellMouseMove"), this.registerColumnOption("cellMouseDown"), this.registerColumnOption("cellMouseUp"), this.registerColumnOption("cellTap"), this.registerColumnOption("cellDblTap"), this.registerColumnOption("cellTapHold");
  }
  initialize() {
    this.initializeExternalEvents(), this.subscribe("column-init", this.initializeColumn.bind(this)), this.subscribe("cell-dblclick", this.cellContentsSelectionFixer.bind(this)), this.subscribe("scroll-horizontal", this.clearTouchWatchers.bind(this)), this.subscribe("scroll-vertical", this.clearTouchWatchers.bind(this));
  }
  clearTouchWatchers() {
    var e = Object.values(this.touchWatchers);
    e.forEach((t) => {
      for (let i in t)
        t[i] = null;
    });
  }
  cellContentsSelectionFixer(e, t) {
    var i;
    if (!(this.table.modExists("edit") && this.table.modules.edit.currentCell === t)) {
      e.preventDefault();
      try {
        document.selection ? (i = document.body.createTextRange(), i.moveToElementText(t.getElement()), i.select()) : window.getSelection && (i = document.createRange(), i.selectNode(t.getElement()), window.getSelection().removeAllRanges(), window.getSelection().addRange(i));
      } catch {
      }
    }
  }
  initializeExternalEvents() {
    for (let e in this.eventMap)
      this.subscriptionChangeExternal(e, this.subscriptionChanged.bind(this, e));
  }
  subscriptionChanged(e, t) {
    t ? this.subscribers[e] || (this.eventMap[e].includes("-") ? (this.subscribers[e] = this.handle.bind(this, e), this.subscribe(this.eventMap[e], this.subscribers[e])) : this.subscribeTouchEvents(e)) : this.eventMap[e].includes("-") ? this.subscribers[e] && !this.columnSubscribers[e] && !this.subscribedExternal(e) && (this.unsubscribe(this.eventMap[e], this.subscribers[e]), delete this.subscribers[e]) : this.unsubscribeTouchEvents(e);
  }
  subscribeTouchEvents(e) {
    var t = this.eventMap[e];
    this.touchSubscribers[t + "-touchstart"] || (this.touchSubscribers[t + "-touchstart"] = this.handleTouch.bind(this, t, "start"), this.touchSubscribers[t + "-touchend"] = this.handleTouch.bind(this, t, "end"), this.subscribe(t + "-touchstart", this.touchSubscribers[t + "-touchstart"]), this.subscribe(t + "-touchend", this.touchSubscribers[t + "-touchend"])), this.subscribers[e] = !0;
  }
  unsubscribeTouchEvents(e) {
    var t = !0, i = this.eventMap[e];
    if (this.subscribers[e] && !this.subscribedExternal(e)) {
      delete this.subscribers[e];
      for (let s in this.eventMap)
        this.eventMap[s] === i && this.subscribers[s] && (t = !1);
      t && (this.unsubscribe(i + "-touchstart", this.touchSubscribers[i + "-touchstart"]), this.unsubscribe(i + "-touchend", this.touchSubscribers[i + "-touchend"]), delete this.touchSubscribers[i + "-touchstart"], delete this.touchSubscribers[i + "-touchend"]);
    }
  }
  initializeColumn(e) {
    var t = e.definition;
    for (let i in this.eventMap)
      t[i] && (this.subscriptionChanged(i, !0), this.columnSubscribers[i] || (this.columnSubscribers[i] = []), this.columnSubscribers[i].push(e));
  }
  handle(e, t, i) {
    this.dispatchEvent(e, t, i);
  }
  handleTouch(e, t, i, s) {
    var n = this.touchWatchers[e];
    switch (e === "column" && (e = "header"), t) {
      case "start":
        n.tap = !0, clearTimeout(n.tapHold), n.tapHold = setTimeout(() => {
          clearTimeout(n.tapHold), n.tapHold = null, n.tap = null, clearTimeout(n.tapDbl), n.tapDbl = null, this.dispatchEvent(e + "TapHold", i, s);
        }, 1e3);
        break;
      case "end":
        n.tap && (n.tap = null, this.dispatchEvent(e + "Tap", i, s)), n.tapDbl ? (clearTimeout(n.tapDbl), n.tapDbl = null, this.dispatchEvent(e + "DblTap", i, s)) : n.tapDbl = setTimeout(() => {
          clearTimeout(n.tapDbl), n.tapDbl = null;
        }, 300), clearTimeout(n.tapHold), n.tapHold = null;
        break;
    }
  }
  dispatchEvent(e, t, i) {
    var s = i.getComponent(), n;
    this.columnSubscribers[e] && (i instanceof kt ? n = i.column.definition[e] : i instanceof Ze && (n = i.definition[e]), n && n(t, s)), this.dispatchExternal(e, t, s);
  }
}
x(ji, "moduleName", "interaction");
var so = {
  navPrev: "shift + 9",
  navNext: 9,
  navUp: 38,
  navDown: 40,
  navLeft: 37,
  navRight: 39,
  scrollPageUp: 33,
  scrollPageDown: 34,
  scrollToStart: 36,
  scrollToEnd: 35
}, no = {
  keyBlock: function(l) {
    l.stopPropagation(), l.preventDefault();
  },
  scrollPageUp: function(l) {
    var e = this.table.rowManager, t = e.scrollTop - e.element.clientHeight;
    l.preventDefault(), e.displayRowsCount && (t >= 0 ? e.element.scrollTop = t : e.scrollToRow(e.getDisplayRows()[0])), this.table.element.focus();
  },
  scrollPageDown: function(l) {
    var e = this.table.rowManager, t = e.scrollTop + e.element.clientHeight, i = e.element.scrollHeight;
    l.preventDefault(), e.displayRowsCount && (t <= i ? e.element.scrollTop = t : e.scrollToRow(e.getDisplayRows()[e.displayRowsCount - 1])), this.table.element.focus();
  },
  scrollToStart: function(l) {
    var e = this.table.rowManager;
    l.preventDefault(), e.displayRowsCount && e.scrollToRow(e.getDisplayRows()[0]), this.table.element.focus();
  },
  scrollToEnd: function(l) {
    var e = this.table.rowManager;
    l.preventDefault(), e.displayRowsCount && e.scrollToRow(e.getDisplayRows()[e.displayRowsCount - 1]), this.table.element.focus();
  },
  navPrev: function(l) {
    this.dispatch("keybinding-nav-prev", l);
  },
  navNext: function(l) {
    this.dispatch("keybinding-nav-next", l);
  },
  navLeft: function(l) {
    this.dispatch("keybinding-nav-left", l);
  },
  navRight: function(l) {
    this.dispatch("keybinding-nav-right", l);
  },
  navUp: function(l) {
    this.dispatch("keybinding-nav-up", l);
  },
  navDown: function(l) {
    this.dispatch("keybinding-nav-down", l);
  }
};
const $e = class $e extends O {
  constructor(e) {
    super(e), this.watchKeys = null, this.pressedKeys = null, this.keyupBinding = !1, this.keydownBinding = !1, this.registerTableOption("keybindings", {}), this.registerTableOption("tabEndNewRow", !1);
  }
  initialize() {
    var e = this.table.options.keybindings, t = {};
    this.watchKeys = {}, this.pressedKeys = [], e !== !1 && (Object.assign(t, $e.bindings), Object.assign(t, e), this.mapBindings(t), this.bindEvents()), this.subscribe("table-destroy", this.clearBindings.bind(this));
  }
  mapBindings(e) {
    for (let t in e)
      $e.actions[t] ? e[t] && (typeof e[t] != "object" && (e[t] = [e[t]]), e[t].forEach((i) => {
        var s = Array.isArray(i) ? i : [i];
        s.forEach((n) => {
          this.mapBinding(t, n);
        });
      })) : console.warn("Key Binding Error - no such action:", t);
  }
  mapBinding(e, t) {
    var i = {
      action: $e.actions[e],
      keys: [],
      ctrl: !1,
      shift: !1,
      meta: !1
    }, s = t.toString().toLowerCase().split(" ").join("").split("+");
    s.forEach((n) => {
      switch (n) {
        case "ctrl":
          i.ctrl = !0;
          break;
        case "shift":
          i.shift = !0;
          break;
        case "meta":
          i.meta = !0;
          break;
        default:
          n = isNaN(n) ? n.toUpperCase().charCodeAt(0) : parseInt(n), i.keys.push(n), this.watchKeys[n] || (this.watchKeys[n] = []), this.watchKeys[n].push(i);
      }
    });
  }
  bindEvents() {
    var e = this;
    this.keyupBinding = function(t) {
      var i = t.keyCode, s = e.watchKeys[i];
      s && (e.pressedKeys.push(i), s.forEach(function(n) {
        e.checkBinding(t, n);
      }));
    }, this.keydownBinding = function(t) {
      var i = t.keyCode, s = e.watchKeys[i];
      if (s) {
        var n = e.pressedKeys.indexOf(i);
        n > -1 && e.pressedKeys.splice(n, 1);
      }
    }, this.table.element.addEventListener("keydown", this.keyupBinding), this.table.element.addEventListener("keyup", this.keydownBinding);
  }
  clearBindings() {
    this.keyupBinding && this.table.element.removeEventListener("keydown", this.keyupBinding), this.keydownBinding && this.table.element.removeEventListener("keyup", this.keydownBinding);
  }
  checkBinding(e, t) {
    var i = !0;
    return e.ctrlKey == t.ctrl && e.shiftKey == t.shift && e.metaKey == t.meta ? (t.keys.forEach((s) => {
      var n = this.pressedKeys.indexOf(s);
      n == -1 && (i = !1);
    }), i && t.action.call(this, e), !0) : !1;
  }
};
x($e, "moduleName", "keybindings"), //load defaults
x($e, "bindings", so), x($e, "actions", no);
let ii = $e;
class Ui extends O {
  constructor(e) {
    super(e), this.menuContainer = null, this.nestedMenuBlock = !1, this.currentComponent = null, this.rootPopup = null, this.columnSubscribers = {}, this.registerTableOption("rowContextMenu", !1), this.registerTableOption("rowClickMenu", !1), this.registerTableOption("rowDblClickMenu", !1), this.registerTableOption("groupContextMenu", !1), this.registerTableOption("groupClickMenu", !1), this.registerTableOption("groupDblClickMenu", !1), this.registerColumnOption("headerContextMenu"), this.registerColumnOption("headerClickMenu"), this.registerColumnOption("headerDblClickMenu"), this.registerColumnOption("headerMenu"), this.registerColumnOption("headerMenuIcon"), this.registerColumnOption("contextMenu"), this.registerColumnOption("clickMenu"), this.registerColumnOption("dblClickMenu");
  }
  initialize() {
    this.deprecatedOptionsCheck(), this.initializeRowWatchers(), this.initializeGroupWatchers(), this.subscribe("column-init", this.initializeColumn.bind(this));
  }
  deprecatedOptionsCheck() {
  }
  initializeRowWatchers() {
    this.table.options.rowContextMenu && (this.subscribe("row-contextmenu", this.loadMenuEvent.bind(this, this.table.options.rowContextMenu)), this.table.on("rowTapHold", this.loadMenuEvent.bind(this, this.table.options.rowContextMenu))), this.table.options.rowClickMenu && this.subscribe("row-click", this.loadMenuEvent.bind(this, this.table.options.rowClickMenu)), this.table.options.rowDblClickMenu && this.subscribe("row-dblclick", this.loadMenuEvent.bind(this, this.table.options.rowDblClickMenu));
  }
  initializeGroupWatchers() {
    this.table.options.groupContextMenu && (this.subscribe("group-contextmenu", this.loadMenuEvent.bind(this, this.table.options.groupContextMenu)), this.table.on("groupTapHold", this.loadMenuEvent.bind(this, this.table.options.groupContextMenu))), this.table.options.groupClickMenu && this.subscribe("group-click", this.loadMenuEvent.bind(this, this.table.options.groupClickMenu)), this.table.options.groupDblClickMenu && this.subscribe("group-dblclick", this.loadMenuEvent.bind(this, this.table.options.groupDblClickMenu));
  }
  initializeColumn(e) {
    var t = e.definition;
    t.headerContextMenu && !this.columnSubscribers.headerContextMenu && (this.columnSubscribers.headerContextMenu = this.loadMenuTableColumnEvent.bind(this, "headerContextMenu"), this.subscribe("column-contextmenu", this.columnSubscribers.headerContextMenu), this.table.on("headerTapHold", this.loadMenuTableColumnEvent.bind(this, "headerContextMenu"))), t.headerClickMenu && !this.columnSubscribers.headerClickMenu && (this.columnSubscribers.headerClickMenu = this.loadMenuTableColumnEvent.bind(this, "headerClickMenu"), this.subscribe("column-click", this.columnSubscribers.headerClickMenu)), t.headerDblClickMenu && !this.columnSubscribers.headerDblClickMenu && (this.columnSubscribers.headerDblClickMenu = this.loadMenuTableColumnEvent.bind(this, "headerDblClickMenu"), this.subscribe("column-dblclick", this.columnSubscribers.headerDblClickMenu)), t.headerMenu && this.initializeColumnHeaderMenu(e), t.contextMenu && !this.columnSubscribers.contextMenu && (this.columnSubscribers.contextMenu = this.loadMenuTableCellEvent.bind(this, "contextMenu"), this.subscribe("cell-contextmenu", this.columnSubscribers.contextMenu), this.table.on("cellTapHold", this.loadMenuTableCellEvent.bind(this, "contextMenu"))), t.clickMenu && !this.columnSubscribers.clickMenu && (this.columnSubscribers.clickMenu = this.loadMenuTableCellEvent.bind(this, "clickMenu"), this.subscribe("cell-click", this.columnSubscribers.clickMenu)), t.dblClickMenu && !this.columnSubscribers.dblClickMenu && (this.columnSubscribers.dblClickMenu = this.loadMenuTableCellEvent.bind(this, "dblClickMenu"), this.subscribe("cell-dblclick", this.columnSubscribers.dblClickMenu));
  }
  initializeColumnHeaderMenu(e) {
    var t = e.definition.headerMenuIcon, i;
    i = document.createElement("span"), i.classList.add("tabulator-header-popup-button"), t ? (typeof t == "function" && (t = t(e.getComponent())), t instanceof HTMLElement ? i.appendChild(t) : i.innerHTML = t) : i.innerHTML = "&vellip;", i.addEventListener("click", (s) => {
      s.stopPropagation(), s.preventDefault(), this.loadMenuEvent(e.definition.headerMenu, s, e);
    }), e.titleElement.insertBefore(i, e.titleElement.firstChild);
  }
  loadMenuTableCellEvent(e, t, i) {
    i._cell && (i = i._cell), i.column.definition[e] && this.loadMenuEvent(i.column.definition[e], t, i);
  }
  loadMenuTableColumnEvent(e, t, i) {
    i._column && (i = i._column), i.definition[e] && this.loadMenuEvent(i.definition[e], t, i);
  }
  loadMenuEvent(e, t, i) {
    i._group ? i = i._group : i._row && (i = i._row), e = typeof e == "function" ? e.call(this.table, t, i.getComponent()) : e, this.loadMenu(t, i, e);
  }
  loadMenu(e, t, i, s, n) {
    var o = !(e instanceof MouseEvent), r = document.createElement("div"), a;
    if (r.classList.add("tabulator-menu"), o || e.preventDefault(), !(!i || !i.length)) {
      if (s)
        a = n.child(r);
      else {
        if (this.nestedMenuBlock) {
          if (this.rootPopup)
            return;
        } else
          this.nestedMenuBlock = setTimeout(() => {
            this.nestedMenuBlock = !1;
          }, 100);
        this.rootPopup && this.rootPopup.hide(), this.rootPopup = a = this.popup(r);
      }
      i.forEach((h) => {
        var d = document.createElement("div"), u = h.label, c = h.disabled;
        h.separator ? d.classList.add("tabulator-menu-separator") : (d.classList.add("tabulator-menu-item"), typeof u == "function" && (u = u.call(this.table, t.getComponent())), u instanceof Node ? d.appendChild(u) : d.innerHTML = u, typeof c == "function" && (c = c.call(this.table, t.getComponent())), c ? (d.classList.add("tabulator-menu-item-disabled"), d.addEventListener("click", (g) => {
          g.stopPropagation();
        })) : h.menu && h.menu.length ? d.addEventListener("click", (g) => {
          g.stopPropagation(), this.loadMenu(g, t, h.menu, d, a);
        }) : h.action && d.addEventListener("click", (g) => {
          h.action(g, t.getComponent());
        }), h.menu && h.menu.length && d.classList.add("tabulator-menu-item-submenu")), r.appendChild(d);
      }), r.addEventListener("click", (h) => {
        this.rootPopup && this.rootPopup.hide();
      }), a.show(s || e), a === this.rootPopup && (this.rootPopup.hideOnBlur(() => {
        this.rootPopup = null, this.currentComponent && (this.dispatch("menu-closed", i, a), this.dispatchExternal("menuClosed", this.currentComponent.getComponent()), this.currentComponent = null);
      }), this.currentComponent = t, this.dispatch("menu-opened", i, a), this.dispatchExternal("menuOpened", t.getComponent()));
    }
  }
}
x(Ui, "moduleName", "menu");
class qi extends O {
  constructor(e) {
    super(e), this.placeholderElement = this.createPlaceholderElement(), this.hoverElement = !1, this.checkTimeout = !1, this.checkPeriod = 250, this.moving = !1, this.toCol = !1, this.toColAfter = !1, this.startX = 0, this.autoScrollMargin = 40, this.autoScrollStep = 5, this.autoScrollTimeout = !1, this.touchMove = !1, this.moveHover = this.moveHover.bind(this), this.endMove = this.endMove.bind(this), this.registerTableOption("movableColumns", !1);
  }
  createPlaceholderElement() {
    var e = document.createElement("div");
    return e.classList.add("tabulator-col"), e.classList.add("tabulator-col-placeholder"), e;
  }
  initialize() {
    this.table.options.movableColumns && (this.subscribe("column-init", this.initializeColumn.bind(this)), this.subscribe("alert-show", this.abortMove.bind(this)));
  }
  abortMove() {
    clearTimeout(this.checkTimeout);
  }
  initializeColumn(e) {
    var t = this, i = {}, s;
    !e.modules.frozen && !e.isGroup && !e.isRowHeader && (s = e.getElement(), i.mousemove = (function(n) {
      e.parent === t.moving.parent && ((t.touchMove ? n.touches[0].pageX : n.pageX) - U.elOffset(s).left + t.table.columnManager.contentsElement.scrollLeft > e.getWidth() / 2 ? (t.toCol !== e || !t.toColAfter) && (s.parentNode.insertBefore(t.placeholderElement, s.nextSibling), t.moveColumn(e, !0)) : (t.toCol !== e || t.toColAfter) && (s.parentNode.insertBefore(t.placeholderElement, s), t.moveColumn(e, !1)));
    }).bind(t), s.addEventListener("mousedown", function(n) {
      t.touchMove = !1, n.which === 1 && (t.checkTimeout = setTimeout(function() {
        t.startMove(n, e);
      }, t.checkPeriod));
    }), s.addEventListener("mouseup", function(n) {
      n.which === 1 && t.checkTimeout && clearTimeout(t.checkTimeout);
    }), t.bindTouchEvents(e)), e.modules.moveColumn = i;
  }
  bindTouchEvents(e) {
    var t = e.getElement(), i = !1, s, n, o, r, a, h;
    t.addEventListener("touchstart", (d) => {
      this.checkTimeout = setTimeout(() => {
        this.touchMove = !0, s = e.nextColumn(), o = s ? s.getWidth() / 2 : 0, n = e.prevColumn(), r = n ? n.getWidth() / 2 : 0, a = 0, h = 0, i = !1, this.startMove(d, e);
      }, this.checkPeriod);
    }, { passive: !0 }), t.addEventListener("touchmove", (d) => {
      var u, c;
      this.moving && (this.moveHover(d), i || (i = d.touches[0].pageX), u = d.touches[0].pageX - i, u > 0 ? s && u - a > o && (c = s, c !== e && (i = d.touches[0].pageX, c.getElement().parentNode.insertBefore(this.placeholderElement, c.getElement().nextSibling), this.moveColumn(c, !0))) : n && -u - h > r && (c = n, c !== e && (i = d.touches[0].pageX, c.getElement().parentNode.insertBefore(this.placeholderElement, c.getElement()), this.moveColumn(c, !1))), c && (s = c.nextColumn(), a = o, o = s ? s.getWidth() / 2 : 0, n = c.prevColumn(), h = r, r = n ? n.getWidth() / 2 : 0));
    }, { passive: !0 }), t.addEventListener("touchend", (d) => {
      this.checkTimeout && clearTimeout(this.checkTimeout), this.moving && this.endMove(d);
    });
  }
  startMove(e, t) {
    var i = t.getElement(), s = this.table.columnManager.getContentsElement(), n = this.table.columnManager.getHeadersElement();
    this.table.modules.selectRange && this.table.modules.selectRange.columnSelection && this.table.modules.selectRange.mousedown && this.table.modules.selectRange.selecting === "column" || (this.moving = t, this.startX = (this.touchMove ? e.touches[0].pageX : e.pageX) - U.elOffset(i).left, this.table.element.classList.add("tabulator-block-select"), this.placeholderElement.style.width = t.getWidth() + "px", this.placeholderElement.style.height = t.getHeight() + "px", i.parentNode.insertBefore(this.placeholderElement, i), i.parentNode.removeChild(i), this.hoverElement = i.cloneNode(!0), this.hoverElement.classList.add("tabulator-moving"), s.appendChild(this.hoverElement), this.hoverElement.style.left = "0", this.hoverElement.style.bottom = s.clientHeight - n.offsetHeight + "px", this.touchMove || (this._bindMouseMove(), document.body.addEventListener("mousemove", this.moveHover), document.body.addEventListener("mouseup", this.endMove)), this.moveHover(e), this.dispatch("column-moving", e, this.moving));
  }
  _bindMouseMove() {
    this.table.columnManager.columnsByIndex.forEach(function(e) {
      e.modules.moveColumn.mousemove && e.getElement().addEventListener("mousemove", e.modules.moveColumn.mousemove);
    });
  }
  _unbindMouseMove() {
    this.table.columnManager.columnsByIndex.forEach(function(e) {
      e.modules.moveColumn.mousemove && e.getElement().removeEventListener("mousemove", e.modules.moveColumn.mousemove);
    });
  }
  moveColumn(e, t) {
    var i = this.moving.getCells();
    this.toCol = e, this.toColAfter = t, t ? e.getCells().forEach(function(s, n) {
      var o = s.getElement(!0);
      o.parentNode && i[n] && o.parentNode.insertBefore(i[n].getElement(), o.nextSibling);
    }) : e.getCells().forEach(function(s, n) {
      var o = s.getElement(!0);
      o.parentNode && i[n] && o.parentNode.insertBefore(i[n].getElement(), o);
    });
  }
  endMove(e) {
    (e.which === 1 || this.touchMove) && (this._unbindMouseMove(), this.placeholderElement.parentNode.insertBefore(this.moving.getElement(), this.placeholderElement.nextSibling), this.placeholderElement.parentNode.removeChild(this.placeholderElement), this.hoverElement.parentNode.removeChild(this.hoverElement), this.table.element.classList.remove("tabulator-block-select"), this.toCol && this.table.columnManager.moveColumnActual(this.moving, this.toCol, this.toColAfter), this.moving = !1, this.toCol = !1, this.toColAfter = !1, this.touchMove || (document.body.removeEventListener("mousemove", this.moveHover), document.body.removeEventListener("mouseup", this.endMove)));
  }
  moveHover(e) {
    var t = this.table.columnManager.getContentsElement(), i = t.scrollLeft, s = (this.touchMove ? e.touches[0].pageX : e.pageX) - U.elOffset(t).left + i, n;
    this.hoverElement.style.left = s - this.startX + "px", s - i < this.autoScrollMargin && (this.autoScrollTimeout || (this.autoScrollTimeout = setTimeout(() => {
      n = Math.max(0, i - 5), this.table.rowManager.getElement().scrollLeft = n, this.autoScrollTimeout = !1;
    }, 1))), i + t.clientWidth - s < this.autoScrollMargin && (this.autoScrollTimeout || (this.autoScrollTimeout = setTimeout(() => {
      n = Math.min(t.clientWidth, i + 5), this.table.rowManager.getElement().scrollLeft = n, this.autoScrollTimeout = !1;
    }, 1)));
  }
}
x(qi, "moduleName", "moveColumn");
var oo = {
  delete: function(l, e, t) {
    l.delete();
  }
}, ro = {
  insert: function(l, e, t) {
    return this.table.addRow(l.getData(), void 0, e), !0;
  },
  add: function(l, e, t) {
    return this.table.addRow(l.getData()), !0;
  },
  update: function(l, e, t) {
    return e ? (e.update(l.getData()), !0) : !1;
  },
  replace: function(l, e, t) {
    return e ? (this.table.addRow(l.getData(), void 0, e), e.delete(), !0) : !1;
  }
};
const Ye = class Ye extends O {
  constructor(e) {
    super(e), this.placeholderElement = this.createPlaceholderElement(), this.hoverElement = !1, this.checkTimeout = !1, this.checkPeriod = 150, this.moving = !1, this.toRow = !1, this.toRowAfter = !1, this.hasHandle = !1, this.startY = 0, this.startX = 0, this.moveHover = this.moveHover.bind(this), this.endMove = this.endMove.bind(this), this.tableRowDropEvent = !1, this.touchMove = !1, this.connection = !1, this.connectionSelectorsTables = !1, this.connectionSelectorsElements = !1, this.connectionElements = [], this.connections = [], this.connectedTable = !1, this.connectedRow = !1, this.registerTableOption("movableRows", !1), this.registerTableOption("movableRowsConnectedTables", !1), this.registerTableOption("movableRowsConnectedElements", !1), this.registerTableOption("movableRowsSender", !1), this.registerTableOption("movableRowsReceiver", "insert"), this.registerColumnOption("rowHandle");
  }
  createPlaceholderElement() {
    var e = document.createElement("div");
    return e.classList.add("tabulator-row"), e.classList.add("tabulator-row-placeholder"), e;
  }
  initialize() {
    this.table.options.movableRows && (this.connectionSelectorsTables = this.table.options.movableRowsConnectedTables, this.connectionSelectorsElements = this.table.options.movableRowsConnectedElements, this.connection = this.connectionSelectorsTables || this.connectionSelectorsElements, this.subscribe("cell-init", this.initializeCell.bind(this)), this.subscribe("column-init", this.initializeColumn.bind(this)), this.subscribe("row-init", this.initializeRow.bind(this)));
  }
  initializeGroupHeader(e) {
    var t = this, i = {};
    i.mouseup = (function(s) {
      t.tableRowDrop(s, e);
    }).bind(t), i.mousemove = (function(s) {
      var n;
      s.pageY - U.elOffset(e.element).top + t.table.rowManager.element.scrollTop > e.getHeight() / 2 ? (t.toRow !== e || !t.toRowAfter) && (n = e.getElement(), n.parentNode.insertBefore(t.placeholderElement, n.nextSibling), t.moveRow(e, !0)) : (t.toRow !== e || t.toRowAfter) && (n = e.getElement(), n.previousSibling && (n.parentNode.insertBefore(t.placeholderElement, n), t.moveRow(e, !1)));
    }).bind(t), e.modules.moveRow = i;
  }
  initializeRow(e) {
    var t = this, i = {}, s;
    i.mouseup = (function(n) {
      t.tableRowDrop(n, e);
    }).bind(t), i.mousemove = (function(n) {
      var o = e.getElement();
      n.pageY - U.elOffset(o).top + t.table.rowManager.element.scrollTop > e.getHeight() / 2 ? (t.toRow !== e || !t.toRowAfter) && (o.parentNode.insertBefore(t.placeholderElement, o.nextSibling), t.moveRow(e, !0)) : (t.toRow !== e || t.toRowAfter) && (o.parentNode.insertBefore(t.placeholderElement, o), t.moveRow(e, !1));
    }).bind(t), this.hasHandle || (s = e.getElement(), s.addEventListener("mousedown", function(n) {
      n.which === 1 && (t.checkTimeout = setTimeout(function() {
        t.startMove(n, e);
      }, t.checkPeriod));
    }), s.addEventListener("mouseup", function(n) {
      n.which === 1 && t.checkTimeout && clearTimeout(t.checkTimeout);
    }), this.bindTouchEvents(e, e.getElement())), e.modules.moveRow = i;
  }
  initializeColumn(e) {
    e.definition.rowHandle && this.table.options.movableRows !== !1 && (this.hasHandle = !0);
  }
  initializeCell(e) {
    if (e.column.definition.rowHandle && this.table.options.movableRows !== !1) {
      var t = this, i = e.getElement(!0);
      i.addEventListener("mousedown", function(s) {
        s.which === 1 && (t.checkTimeout = setTimeout(function() {
          t.startMove(s, e.row);
        }, t.checkPeriod));
      }), i.addEventListener("mouseup", function(s) {
        s.which === 1 && t.checkTimeout && clearTimeout(t.checkTimeout);
      }), this.bindTouchEvents(e.row, i);
    }
  }
  bindTouchEvents(e, t) {
    var i = !1, s, n, o, r, a, h;
    t.addEventListener("touchstart", (d) => {
      this.checkTimeout = setTimeout(() => {
        this.touchMove = !0, s = e.nextRow(), o = s ? s.getHeight() / 2 : 0, n = e.prevRow(), r = n ? n.getHeight() / 2 : 0, a = 0, h = 0, i = !1, this.startMove(d, e);
      }, this.checkPeriod);
    }, { passive: !0 }), this.moving, this.toRow, this.toRowAfter, t.addEventListener("touchmove", (d) => {
      var u, c;
      this.moving && (d.preventDefault(), this.moveHover(d), i || (i = d.touches[0].pageY), u = d.touches[0].pageY - i, u > 0 ? s && u - a > o && (c = s, c !== e && (i = d.touches[0].pageY, c.getElement().parentNode.insertBefore(this.placeholderElement, c.getElement().nextSibling), this.moveRow(c, !0))) : n && -u - h > r && (c = n, c !== e && (i = d.touches[0].pageY, c.getElement().parentNode.insertBefore(this.placeholderElement, c.getElement()), this.moveRow(c, !1))), c && (s = c.nextRow(), a = o, o = s ? s.getHeight() / 2 : 0, n = c.prevRow(), h = r, r = n ? n.getHeight() / 2 : 0));
    }), t.addEventListener("touchend", (d) => {
      this.checkTimeout && clearTimeout(this.checkTimeout), this.moving && (this.endMove(d), this.touchMove = !1);
    });
  }
  _bindMouseMove() {
    this.table.rowManager.getDisplayRows().forEach((e) => {
      (e.type === "row" || e.type === "group") && e.modules.moveRow && e.modules.moveRow.mousemove && e.getElement().addEventListener("mousemove", e.modules.moveRow.mousemove);
    });
  }
  _unbindMouseMove() {
    this.table.rowManager.getDisplayRows().forEach((e) => {
      (e.type === "row" || e.type === "group") && e.modules.moveRow && e.modules.moveRow.mousemove && e.getElement().removeEventListener("mousemove", e.modules.moveRow.mousemove);
    });
  }
  startMove(e, t) {
    var i = t.getElement();
    this.setStartPosition(e, t), this.moving = t, this.table.element.classList.add("tabulator-block-select"), this.placeholderElement.style.width = t.getWidth() + "px", this.placeholderElement.style.height = t.getHeight() + "px", this.connection ? (this.table.element.classList.add("tabulator-movingrow-sending"), this.connectToTables(t)) : (i.parentNode.insertBefore(this.placeholderElement, i), i.parentNode.removeChild(i)), this.hoverElement = i.cloneNode(!0), this.hoverElement.classList.add("tabulator-moving"), this.connection ? (document.body.appendChild(this.hoverElement), this.hoverElement.style.left = "0", this.hoverElement.style.top = "0", this.hoverElement.style.width = this.table.element.clientWidth + "px", this.hoverElement.style.whiteSpace = "nowrap", this.hoverElement.style.overflow = "hidden", this.hoverElement.style.pointerEvents = "none") : (this.table.rowManager.getTableElement().appendChild(this.hoverElement), this.hoverElement.style.left = "0", this.hoverElement.style.top = "0", this._bindMouseMove()), document.body.addEventListener("mousemove", this.moveHover), document.body.addEventListener("mouseup", this.endMove), this.dispatchExternal("rowMoving", t.getComponent()), this.moveHover(e);
  }
  setStartPosition(e, t) {
    var i = this.touchMove ? e.touches[0].pageX : e.pageX, s = this.touchMove ? e.touches[0].pageY : e.pageY, n, o;
    n = t.getElement(), this.connection ? (o = n.getBoundingClientRect(), this.startX = o.left - i + window.pageXOffset, this.startY = o.top - s + window.pageYOffset) : this.startY = s - n.getBoundingClientRect().top;
  }
  endMove(e) {
    (!e || e.which === 1 || this.touchMove) && (this._unbindMouseMove(), this.connection || (this.placeholderElement.parentNode.insertBefore(this.moving.getElement(), this.placeholderElement.nextSibling), this.placeholderElement.parentNode.removeChild(this.placeholderElement)), this.hoverElement.parentNode.removeChild(this.hoverElement), this.table.element.classList.remove("tabulator-block-select"), this.toRow ? this.table.rowManager.moveRow(this.moving, this.toRow, this.toRowAfter) : this.dispatchExternal("rowMoveCancelled", this.moving.getComponent()), this.moving = !1, this.toRow = !1, this.toRowAfter = !1, document.body.removeEventListener("mousemove", this.moveHover), document.body.removeEventListener("mouseup", this.endMove), this.connection && (this.table.element.classList.remove("tabulator-movingrow-sending"), this.disconnectFromTables()));
  }
  moveRow(e, t) {
    this.toRow = e, this.toRowAfter = t;
  }
  moveHover(e) {
    this.connection ? this.moveHoverConnections.call(this, e) : this.moveHoverTable.call(this, e);
  }
  moveHoverTable(e) {
    var t = this.table.rowManager.getElement(), i = t.scrollTop, s = (this.touchMove ? e.touches[0].pageY : e.pageY) - t.getBoundingClientRect().top + i;
    this.hoverElement.style.top = Math.min(s - this.startY, this.table.rowManager.element.scrollHeight - this.hoverElement.offsetHeight) + "px";
  }
  moveHoverConnections(e) {
    this.hoverElement.style.left = this.startX + (this.touchMove ? e.touches[0].pageX : e.pageX) + "px", this.hoverElement.style.top = this.startY + (this.touchMove ? e.touches[0].pageY : e.pageY) + "px";
  }
  elementRowDrop(e, t, i) {
    this.dispatchExternal("movableRowsElementDrop", e, t, i ? i.getComponent() : !1);
  }
  //establish connection with other tables
  connectToTables(e) {
    var t;
    this.connectionSelectorsTables && (t = this.commsConnections(this.connectionSelectorsTables), this.dispatchExternal("movableRowsSendingStart", t), this.commsSend(this.connectionSelectorsTables, "moveRow", "connect", {
      row: e
    })), this.connectionSelectorsElements && (this.connectionElements = [], Array.isArray(this.connectionSelectorsElements) || (this.connectionSelectorsElements = [this.connectionSelectorsElements]), this.connectionSelectorsElements.forEach((i) => {
      typeof i == "string" ? this.connectionElements = this.connectionElements.concat(Array.prototype.slice.call(document.querySelectorAll(i))) : this.connectionElements.push(i);
    }), this.connectionElements.forEach((i) => {
      var s = (n) => {
        this.elementRowDrop(n, i, this.moving);
      };
      i.addEventListener("mouseup", s), i.tabulatorElementDropEvent = s, i.classList.add("tabulator-movingrow-receiving");
    }));
  }
  //disconnect from other tables
  disconnectFromTables() {
    var e;
    this.connectionSelectorsTables && (e = this.commsConnections(this.connectionSelectorsTables), this.dispatchExternal("movableRowsSendingStop", e), this.commsSend(this.connectionSelectorsTables, "moveRow", "disconnect")), this.connectionElements.forEach((t) => {
      t.classList.remove("tabulator-movingrow-receiving"), t.removeEventListener("mouseup", t.tabulatorElementDropEvent), delete t.tabulatorElementDropEvent;
    });
  }
  //accept incomming connection
  connect(e, t) {
    return this.connectedTable ? (console.warn("Move Row Error - Table cannot accept connection, already connected to table:", this.connectedTable), !1) : (this.connectedTable = e, this.connectedRow = t, this.table.element.classList.add("tabulator-movingrow-receiving"), this.table.rowManager.getDisplayRows().forEach((i) => {
      i.type === "row" && i.modules.moveRow && i.modules.moveRow.mouseup && i.getElement().addEventListener("mouseup", i.modules.moveRow.mouseup);
    }), this.tableRowDropEvent = this.tableRowDrop.bind(this), this.table.element.addEventListener("mouseup", this.tableRowDropEvent), this.dispatchExternal("movableRowsReceivingStart", t, e), !0);
  }
  //close incoming connection
  disconnect(e) {
    e === this.connectedTable ? (this.connectedTable = !1, this.connectedRow = !1, this.table.element.classList.remove("tabulator-movingrow-receiving"), this.table.rowManager.getDisplayRows().forEach((t) => {
      t.type === "row" && t.modules.moveRow && t.modules.moveRow.mouseup && t.getElement().removeEventListener("mouseup", t.modules.moveRow.mouseup);
    }), this.table.element.removeEventListener("mouseup", this.tableRowDropEvent), this.dispatchExternal("movableRowsReceivingStop", e)) : console.warn("Move Row Error - trying to disconnect from non connected table");
  }
  dropComplete(e, t, i) {
    var s = !1;
    if (i) {
      switch (typeof this.table.options.movableRowsSender) {
        case "string":
          s = Ye.senders[this.table.options.movableRowsSender];
          break;
        case "function":
          s = this.table.options.movableRowsSender;
          break;
      }
      s ? s.call(this, this.moving ? this.moving.getComponent() : void 0, t ? t.getComponent() : void 0, e) : this.table.options.movableRowsSender && console.warn("Mover Row Error - no matching sender found:", this.table.options.movableRowsSender), this.dispatchExternal("movableRowsSent", this.moving.getComponent(), t ? t.getComponent() : void 0, e);
    } else
      this.dispatchExternal("movableRowsSentFailed", this.moving.getComponent(), t ? t.getComponent() : void 0, e);
    this.endMove();
  }
  tableRowDrop(e, t) {
    var i = !1, s = !1;
    switch (e.stopImmediatePropagation(), typeof this.table.options.movableRowsReceiver) {
      case "string":
        i = Ye.receivers[this.table.options.movableRowsReceiver];
        break;
      case "function":
        i = this.table.options.movableRowsReceiver;
        break;
    }
    i ? s = i.call(this, this.connectedRow.getComponent(), t ? t.getComponent() : void 0, this.connectedTable) : console.warn("Mover Row Error - no matching receiver found:", this.table.options.movableRowsReceiver), s ? this.dispatchExternal("movableRowsReceived", this.connectedRow.getComponent(), t ? t.getComponent() : void 0, this.connectedTable) : this.dispatchExternal("movableRowsReceivedFailed", this.connectedRow.getComponent(), t ? t.getComponent() : void 0, this.connectedTable), this.commsSend(this.connectedTable, "moveRow", "dropcomplete", {
      row: t,
      success: s
    });
  }
  commsReceived(e, t, i) {
    switch (t) {
      case "connect":
        return this.connect(e, i.row);
      case "disconnect":
        return this.disconnect(e);
      case "dropcomplete":
        return this.dropComplete(e, i.row, i.success);
    }
  }
};
x(Ye, "moduleName", "moveRow"), //load defaults
x(Ye, "senders", oo), x(Ye, "receivers", ro);
let si = Ye;
var ao = {};
const at = class at extends O {
  constructor(e) {
    super(e), this.allowedTypes = ["", "data", "edit", "clipboard", "import"], this.enabled = !0, this.registerColumnOption("mutator"), this.registerColumnOption("mutatorParams"), this.registerColumnOption("mutatorData"), this.registerColumnOption("mutatorDataParams"), this.registerColumnOption("mutatorEdit"), this.registerColumnOption("mutatorEditParams"), this.registerColumnOption("mutatorClipboard"), this.registerColumnOption("mutatorClipboardParams"), this.registerColumnOption("mutatorImport"), this.registerColumnOption("mutatorImportParams"), this.registerColumnOption("mutateLink");
  }
  initialize() {
    this.subscribe("cell-value-changing", this.transformCell.bind(this)), this.subscribe("cell-value-changed", this.mutateLink.bind(this)), this.subscribe("column-layout", this.initializeColumn.bind(this)), this.subscribe("row-data-init-before", this.rowDataChanged.bind(this)), this.subscribe("row-data-changing", this.rowDataChanged.bind(this));
  }
  rowDataChanged(e, t, i) {
    return this.transformRow(t, "data", i);
  }
  //initialize column mutator
  initializeColumn(e) {
    var t = !1, i = {};
    this.allowedTypes.forEach((s) => {
      var n = "mutator" + (s.charAt(0).toUpperCase() + s.slice(1)), o;
      e.definition[n] && (o = this.lookupMutator(e.definition[n]), o && (t = !0, i[n] = {
        mutator: o,
        params: e.definition[n + "Params"] || {}
      }));
    }), t && (e.modules.mutate = i);
  }
  lookupMutator(e) {
    var t = !1;
    switch (typeof e) {
      case "string":
        at.mutators[e] ? t = at.mutators[e] : console.warn("Mutator Error - No such mutator found, ignoring: ", e);
        break;
      case "function":
        t = e;
        break;
    }
    return t;
  }
  //apply mutator to row
  transformRow(e, t, i) {
    var s = "mutator" + (t.charAt(0).toUpperCase() + t.slice(1)), n;
    return this.enabled && this.table.columnManager.traverse((o) => {
      var r, a, h;
      o.modules.mutate && (r = o.modules.mutate[s] || o.modules.mutate.mutator || !1, r && (n = o.getFieldValue(typeof i < "u" ? i : e), (t == "data" && !i || typeof n < "u") && (h = o.getComponent(), a = typeof r.params == "function" ? r.params(n, e, t, h) : r.params, o.setFieldValue(e, r.mutator(n, e, t, a, h)))));
    }), e;
  }
  //apply mutator to new cell value
  transformCell(e, t) {
    if (e.column.modules.mutate) {
      var i = e.column.modules.mutate.mutatorEdit || e.column.modules.mutate.mutator || !1, s = {};
      if (i)
        return s = Object.assign(s, e.row.getData()), e.column.setFieldValue(s, t), i.mutator(t, s, "edit", i.params, e.getComponent());
    }
    return t;
  }
  mutateLink(e) {
    var t = e.column.definition.mutateLink;
    t && (Array.isArray(t) || (t = [t]), t.forEach((i) => {
      var s = e.row.getCell(i);
      s && s.setValue(s.getValue(), !0, !0);
    }));
  }
  enable() {
    this.enabled = !0;
  }
  disable() {
    this.enabled = !1;
  }
};
x(at, "moduleName", "mutator"), //load defaults
x(at, "mutators", ao);
let ni = at;
function lo(l, e, t, i, s) {
  var n = document.createElement("span"), o = document.createElement("span"), r = document.createElement("span"), a = document.createElement("span"), h = document.createElement("span"), d = document.createElement("span");
  return this.table.modules.localize.langBind("pagination|counter|showing", (u) => {
    o.innerHTML = u;
  }), this.table.modules.localize.langBind("pagination|counter|of", (u) => {
    a.innerHTML = u;
  }), this.table.modules.localize.langBind("pagination|counter|rows", (u) => {
    d.innerHTML = u;
  }), i ? (r.innerHTML = " " + e + "-" + Math.min(e + l - 1, i) + " ", h.innerHTML = " " + i + " ", n.appendChild(o), n.appendChild(r), n.appendChild(a), n.appendChild(h), n.appendChild(d)) : (r.innerHTML = " 0 ", n.appendChild(o), n.appendChild(r), n.appendChild(d)), n;
}
function ho(l, e, t, i, s) {
  var n = document.createElement("span"), o = document.createElement("span"), r = document.createElement("span"), a = document.createElement("span"), h = document.createElement("span"), d = document.createElement("span");
  return this.table.modules.localize.langBind("pagination|counter|showing", (u) => {
    o.innerHTML = u;
  }), r.innerHTML = " " + t + " ", this.table.modules.localize.langBind("pagination|counter|of", (u) => {
    a.innerHTML = u;
  }), h.innerHTML = " " + s + " ", this.table.modules.localize.langBind("pagination|counter|pages", (u) => {
    d.innerHTML = u;
  }), n.appendChild(o), n.appendChild(r), n.appendChild(a), n.appendChild(h), n.appendChild(d), n;
}
var uo = {
  rows: lo,
  pages: ho
};
const Et = class Et extends O {
  constructor(e) {
    super(e), this.mode = "local", this.progressiveLoad = !1, this.element = null, this.pageCounterElement = null, this.pageCounter = null, this.size = 0, this.page = 1, this.count = 5, this.max = 1, this.remoteRowCountEstimate = null, this.initialLoad = !0, this.dataChanging = !1, this.pageSizes = [], this.registerTableOption("pagination", !1), this.registerTableOption("paginationMode", "local"), this.registerTableOption("paginationSize", !1), this.registerTableOption("paginationInitialPage", 1), this.registerTableOption("paginationCounter", !1), this.registerTableOption("paginationCounterElement", !1), this.registerTableOption("paginationButtonCount", 5), this.registerTableOption("paginationSizeSelector", !1), this.registerTableOption("paginationElement", !1), this.registerTableOption("paginationAddRow", "page"), this.registerTableOption("paginationOutOfRange", !1), this.registerTableOption("progressiveLoad", !1), this.registerTableOption("progressiveLoadDelay", 0), this.registerTableOption("progressiveLoadScrollMargin", 0), this.registerTableFunction("setMaxPage", this.setMaxPage.bind(this)), this.registerTableFunction("setPage", this.setPage.bind(this)), this.registerTableFunction("setPageToRow", this.userSetPageToRow.bind(this)), this.registerTableFunction("setPageSize", this.userSetPageSize.bind(this)), this.registerTableFunction("getPageSize", this.getPageSize.bind(this)), this.registerTableFunction("previousPage", this.previousPage.bind(this)), this.registerTableFunction("nextPage", this.nextPage.bind(this)), this.registerTableFunction("getPage", this.getPage.bind(this)), this.registerTableFunction("getPageMax", this.getPageMax.bind(this)), this.registerComponentFunction("row", "pageTo", this.setPageToRow.bind(this));
  }
  initialize() {
    this.table.options.pagination ? (this.subscribe("row-deleted", this.rowsUpdated.bind(this)), this.subscribe("row-added", this.rowsUpdated.bind(this)), this.subscribe("data-processed", this.initialLoadComplete.bind(this)), this.subscribe("table-built", this.calculatePageSizes.bind(this)), this.subscribe("footer-redraw", this.footerRedraw.bind(this)), this.table.options.paginationAddRow == "page" && this.subscribe("row-adding-position", this.rowAddingPosition.bind(this)), this.table.options.paginationMode === "remote" && (this.subscribe("data-params", this.remotePageParams.bind(this)), this.subscribe("data-loaded", this._parseRemoteData.bind(this))), this.table.options.progressiveLoad && console.error("Progressive Load Error - Pagination and progressive load cannot be used at the same time"), this.registerDisplayHandler(this.restOnRenderBefore.bind(this), 40), this.registerDisplayHandler(this.getRows.bind(this), 50), this.createElements(), this.initializePageCounter(), this.initializePaginator()) : this.table.options.progressiveLoad && (this.subscribe("data-params", this.remotePageParams.bind(this)), this.subscribe("data-loaded", this._parseRemoteData.bind(this)), this.subscribe("table-built", this.calculatePageSizes.bind(this)), this.subscribe("data-processed", this.initialLoadComplete.bind(this)), this.initializeProgressive(this.table.options.progressiveLoad), this.table.options.progressiveLoad === "scroll" && this.subscribe("scroll-vertical", this.scrollVertical.bind(this)));
  }
  rowAddingPosition(e, t) {
    var i = this.table.rowManager, s = i.getDisplayRows(), n;
    return t ? s.length ? n = s[0] : i.activeRows.length && (n = i.activeRows[i.activeRows.length - 1], t = !1) : s.length && (n = s[s.length - 1], t = !(s.length < this.size)), { index: n, top: t };
  }
  calculatePageSizes() {
    var e, t;
    this.table.options.paginationSize ? this.size = this.table.options.paginationSize : (e = document.createElement("div"), e.classList.add("tabulator-row"), e.style.visibility = "hidden", t = document.createElement("div"), t.classList.add("tabulator-cell"), t.innerHTML = "Page Row Test", e.appendChild(t), this.table.rowManager.getTableElement().appendChild(e), this.size = Math.floor(this.table.rowManager.getElement().clientHeight / e.offsetHeight), this.table.rowManager.getTableElement().removeChild(e)), this.dispatchExternal("pageSizeChanged", this.size), this.generatePageSizeSelectList();
  }
  initialLoadComplete() {
    this.initialLoad = !1;
  }
  remotePageParams(e, t, i, s) {
    return this.initialLoad || (this.progressiveLoad && !i || !this.progressiveLoad && !this.dataChanging) && this.reset(!0), s.page = this.page, this.size && (s.size = this.size), s;
  }
  ///////////////////////////////////
  ///////// Table Functions /////////
  ///////////////////////////////////
  userSetPageToRow(e) {
    return this.table.options.pagination && (e = this.table.rowManager.findRow(e), e) ? this.setPageToRow(e) : Promise.reject();
  }
  userSetPageSize(e) {
    return this.table.options.pagination ? (this.setPageSize(e), this.setPage(1)) : !1;
  }
  ///////////////////////////////////
  ///////// Internal Logic //////////
  ///////////////////////////////////
  scrollVertical(e, t) {
    var i, s, n;
    !t && !this.table.dataLoader.loading && (i = this.table.rowManager.getElement(), s = i.scrollHeight - i.clientHeight - e, n = this.table.options.progressiveLoadScrollMargin || i.clientHeight * 2, s < n && this.nextPage().catch(() => {
    }));
  }
  restOnRenderBefore(e, t) {
    return t || this.mode === "local" && this.reset(), e;
  }
  rowsUpdated() {
    this.refreshData(!0, "all");
  }
  createElements() {
    var e;
    this.element = document.createElement("span"), this.element.classList.add("tabulator-paginator"), this.pagesElement = document.createElement("span"), this.pagesElement.classList.add("tabulator-pages"), e = document.createElement("button"), e.classList.add("tabulator-page"), e.setAttribute("type", "button"), e.setAttribute("role", "button"), e.setAttribute("aria-label", ""), e.setAttribute("title", ""), this.firstBut = e.cloneNode(!0), this.firstBut.setAttribute("data-page", "first"), this.prevBut = e.cloneNode(!0), this.prevBut.setAttribute("data-page", "prev"), this.nextBut = e.cloneNode(!0), this.nextBut.setAttribute("data-page", "next"), this.lastBut = e.cloneNode(!0), this.lastBut.setAttribute("data-page", "last"), this.table.options.paginationSizeSelector && (this.pageSizeSelect = document.createElement("select"), this.pageSizeSelect.classList.add("tabulator-page-size"));
  }
  generatePageSizeSelectList() {
    var e = [];
    if (this.pageSizeSelect) {
      if (Array.isArray(this.table.options.paginationSizeSelector))
        e = this.table.options.paginationSizeSelector, this.pageSizes = e, this.pageSizes.indexOf(this.size) == -1 && e.unshift(this.size);
      else if (this.pageSizes.indexOf(this.size) == -1) {
        e = [];
        for (let t = 1; t < 5; t++)
          e.push(this.size * t);
        this.pageSizes = e;
      } else
        e = this.pageSizes;
      for (; this.pageSizeSelect.firstChild; ) this.pageSizeSelect.removeChild(this.pageSizeSelect.firstChild);
      e.forEach((t) => {
        var i = document.createElement("option");
        i.value = t, t === !0 ? this.langBind("pagination|all", function(s) {
          i.innerHTML = s;
        }) : i.innerHTML = t, this.pageSizeSelect.appendChild(i);
      }), this.pageSizeSelect.value = this.size;
    }
  }
  initializePageCounter() {
    var e = this.table.options.paginationCounter, t = null;
    e && (typeof e == "function" ? t = e : t = Et.pageCounters[e], t ? (this.pageCounter = t, this.pageCounterElement = document.createElement("span"), this.pageCounterElement.classList.add("tabulator-page-counter")) : console.warn("Pagination Error - No such page counter found: ", e));
  }
  //setup pagination
  initializePaginator(e) {
    var t, i;
    e || (this.langBind("pagination|first", (s) => {
      this.firstBut.innerHTML = s;
    }), this.langBind("pagination|first_title", (s) => {
      this.firstBut.setAttribute("aria-label", s), this.firstBut.setAttribute("title", s);
    }), this.langBind("pagination|prev", (s) => {
      this.prevBut.innerHTML = s;
    }), this.langBind("pagination|prev_title", (s) => {
      this.prevBut.setAttribute("aria-label", s), this.prevBut.setAttribute("title", s);
    }), this.langBind("pagination|next", (s) => {
      this.nextBut.innerHTML = s;
    }), this.langBind("pagination|next_title", (s) => {
      this.nextBut.setAttribute("aria-label", s), this.nextBut.setAttribute("title", s);
    }), this.langBind("pagination|last", (s) => {
      this.lastBut.innerHTML = s;
    }), this.langBind("pagination|last_title", (s) => {
      this.lastBut.setAttribute("aria-label", s), this.lastBut.setAttribute("title", s);
    }), this.firstBut.addEventListener("click", () => {
      this.setPage(1);
    }), this.prevBut.addEventListener("click", () => {
      this.previousPage();
    }), this.nextBut.addEventListener("click", () => {
      this.nextPage();
    }), this.lastBut.addEventListener("click", () => {
      this.setPage(this.max);
    }), this.table.options.paginationElement && (this.element = this.table.options.paginationElement), this.pageSizeSelect && (t = document.createElement("label"), this.langBind("pagination|page_size", (s) => {
      this.pageSizeSelect.setAttribute("aria-label", s), this.pageSizeSelect.setAttribute("title", s), t.innerHTML = s;
    }), this.element.appendChild(t), this.element.appendChild(this.pageSizeSelect), this.pageSizeSelect.addEventListener("change", (s) => {
      this.setPageSize(this.pageSizeSelect.value == "true" ? !0 : this.pageSizeSelect.value), this.setPage(1);
    })), this.element.appendChild(this.firstBut), this.element.appendChild(this.prevBut), this.element.appendChild(this.pagesElement), this.element.appendChild(this.nextBut), this.element.appendChild(this.lastBut), this.table.options.paginationElement || (this.table.options.paginationCounter && (this.table.options.paginationCounterElement ? this.table.options.paginationCounterElement instanceof HTMLElement ? this.table.options.paginationCounterElement.appendChild(this.pageCounterElement) : typeof this.table.options.paginationCounterElement == "string" && (i = document.querySelector(this.table.options.paginationCounterElement), i ? i.appendChild(this.pageCounterElement) : console.warn("Pagination Error - Unable to find element matching paginationCounterElement selector:", this.table.options.paginationCounterElement)) : this.footerAppend(this.pageCounterElement)), this.footerAppend(this.element)), this.page = this.table.options.paginationInitialPage, this.count = this.table.options.paginationButtonCount), this.mode = this.table.options.paginationMode;
  }
  initializeProgressive(e) {
    this.initializePaginator(!0), this.mode = "progressive_" + e, this.progressiveLoad = !0;
  }
  trackChanges() {
    this.dispatch("page-changed");
  }
  //calculate maximum page from number of rows
  setMaxRows(e) {
    e ? this.max = this.size === !0 ? 1 : Math.ceil(e / this.size) : this.max = 1, this.page > this.max && (this.page = this.max);
  }
  //reset to first page without triggering action
  reset(e) {
    this.initialLoad || (this.mode == "local" || e) && (this.page = 1, this.trackChanges());
  }
  //set the maximum page
  setMaxPage(e) {
    e = parseInt(e), this.max = e || 1, this.page > this.max && (this.page = this.max, this.trigger());
  }
  //set current page number
  setPage(e) {
    switch (e) {
      case "first":
        return this.setPage(1);
      case "prev":
        return this.previousPage();
      case "next":
        return this.nextPage();
      case "last":
        return this.setPage(this.max);
    }
    return e = parseInt(e), e > 0 && e <= this.max || this.mode !== "local" ? (this.page = e, this.trackChanges(), this.trigger()) : (console.warn("Pagination Error - Requested page is out of range of 1 - " + this.max + ":", e), Promise.reject());
  }
  setPageToRow(e) {
    var t = this.displayRows(-1), i = t.indexOf(e);
    if (i > -1) {
      var s = this.size === !0 ? 1 : Math.ceil((i + 1) / this.size);
      return this.setPage(s);
    } else
      return console.warn("Pagination Error - Requested row is not visible"), Promise.reject();
  }
  setPageSize(e) {
    e !== !0 && (e = parseInt(e)), e > 0 && (this.size = e, this.dispatchExternal("pageSizeChanged", e)), this.pageSizeSelect && this.generatePageSizeSelectList(), this.trackChanges();
  }
  _setPageCounter(e, t, i) {
    var s;
    if (this.pageCounter)
      switch (this.mode === "remote" && (t = this.size, i = (this.page - 1) * this.size + 1, e = this.remoteRowCountEstimate), s = this.pageCounter.call(this, t, i, this.page, e, this.max), typeof s) {
        case "object":
          if (s instanceof Node) {
            for (; this.pageCounterElement.firstChild; ) this.pageCounterElement.removeChild(this.pageCounterElement.firstChild);
            this.pageCounterElement.appendChild(s);
          } else
            this.pageCounterElement.innerHTML = "", s != null && console.warn("Page Counter Error - Page Counter has returned a type of object, the only valid page counter object return is an instance of Node, the page counter returned:", s);
          break;
        case "undefined":
          this.pageCounterElement.innerHTML = "";
          break;
        default:
          this.pageCounterElement.innerHTML = s;
      }
  }
  //setup the pagination buttons
  _setPageButtons() {
    let e = Math.floor((this.count - 1) / 2), t = Math.ceil((this.count - 1) / 2), i = this.max - this.page + e + 1 < this.count ? this.max - this.count + 1 : Math.max(this.page - e, 1), s = this.page <= t ? Math.min(this.count, this.max) : Math.min(this.page + t, this.max);
    for (; this.pagesElement.firstChild; ) this.pagesElement.removeChild(this.pagesElement.firstChild);
    this.page == 1 ? (this.firstBut.disabled = !0, this.prevBut.disabled = !0) : (this.firstBut.disabled = !1, this.prevBut.disabled = !1), this.page == this.max ? (this.lastBut.disabled = !0, this.nextBut.disabled = !0) : (this.lastBut.disabled = !1, this.nextBut.disabled = !1);
    for (let n = i; n <= s; n++)
      n > 0 && n <= this.max && this.pagesElement.appendChild(this._generatePageButton(n));
    this.footerRedraw();
  }
  _generatePageButton(e) {
    var t = document.createElement("button");
    return t.classList.add("tabulator-page"), e == this.page && t.classList.add("active"), t.setAttribute("type", "button"), t.setAttribute("role", "button"), this.langBind("pagination|page_title", (i) => {
      t.setAttribute("aria-label", i + " " + e), t.setAttribute("title", i + " " + e);
    }), t.setAttribute("data-page", e), t.textContent = e, t.addEventListener("click", (i) => {
      this.setPage(e);
    }), t;
  }
  //previous page
  previousPage() {
    return this.page > 1 ? (this.page--, this.trackChanges(), this.trigger()) : (console.warn("Pagination Error - Previous page would be less than page 1:", 0), Promise.reject());
  }
  //next page
  nextPage() {
    return this.page < this.max ? (this.page++, this.trackChanges(), this.trigger()) : (this.progressiveLoad || console.warn("Pagination Error - Next page would be greater than maximum page of " + this.max + ":", this.max + 1), Promise.reject());
  }
  //return current page number
  getPage() {
    return this.page;
  }
  //return max page number
  getPageMax() {
    return this.max;
  }
  getPageSize(e) {
    return this.size;
  }
  getMode() {
    return this.mode;
  }
  //return appropriate rows for current page
  getRows(e) {
    var t = 0, i, s, n, o, r = e.filter((a) => a.type === "row");
    if (this.mode == "local") {
      i = [], this.setMaxRows(e.length), this.size === !0 ? (s = 0, n = e.length) : (s = this.size * (this.page - 1), n = s + parseInt(this.size)), this._setPageButtons();
      for (let a = s; a < n; a++) {
        let h = e[a];
        h && (i.push(h), h.type === "row" && (o || (o = h), t++));
      }
      return this._setPageCounter(r.length, t, o ? r.indexOf(o) + 1 : 0), i;
    } else
      return this._setPageButtons(), this._setPageCounter(r.length), e.slice(0);
  }
  trigger() {
    var e;
    switch (this.mode) {
      case "local":
        return e = this.table.rowManager.scrollLeft, this.refreshData(), this.table.rowManager.scrollHorizontal(e), this.dispatchExternal("pageLoaded", this.getPage()), Promise.resolve();
      case "remote":
        return this.dataChanging = !0, this.reloadData(null).finally(() => {
          this.dataChanging = !1;
        });
      case "progressive_load":
      case "progressive_scroll":
        return this.reloadData(null, !0);
      default:
        return console.warn("Pagination Error - no such pagination mode:", this.mode), Promise.reject();
    }
  }
  _parseRemoteData(e) {
    var t, i;
    if (typeof e.last_page > "u" && console.warn("Remote Pagination Error - Server response missing '" + (this.options("dataReceiveParams").last_page || "last_page") + "' property"), e.data)
      if (this.max = parseInt(e.last_page) || 1, this.remoteRowCountEstimate = typeof e.last_row < "u" ? e.last_row : e.last_page * this.size - (this.page == e.last_page ? this.size - e.data.length : 0), this.progressiveLoad) {
        switch (this.mode) {
          case "progressive_load":
            this.page == 1 ? this.table.rowManager.setData(e.data, !1, this.page == 1) : this.table.rowManager.addRows(e.data), this.page < this.max && setTimeout(() => {
              this.nextPage();
            }, this.table.options.progressiveLoadDelay);
            break;
          case "progressive_scroll":
            e = this.page === 1 ? e.data : this.table.rowManager.getData().concat(e.data), this.table.rowManager.setData(e, this.page !== 1, this.page == 1), t = this.table.options.progressiveLoadScrollMargin || this.table.rowManager.element.clientHeight * 2, this.table.rowManager.element.scrollHeight <= this.table.rowManager.element.clientHeight + t && this.page < this.max && setTimeout(() => {
              this.nextPage();
            });
            break;
        }
        return !1;
      } else {
        if (this.page > this.max && (console.warn("Remote Pagination Error - Server returned last page value lower than the current page"), i = this.options("paginationOutOfRange"), i))
          return this.setPage(typeof i == "function" ? i.call(this, this.page, this.max) : i);
        this.dispatchExternal("pageLoaded", this.getPage());
      }
    else
      console.warn("Remote Pagination Error - Server response missing '" + (this.options("dataReceiveParams").data || "data") + "' property");
    return e.data;
  }
  //handle the footer element being redrawn
  footerRedraw() {
    var e = this.table.footerManager.containerElement;
    Math.ceil(e.clientWidth) - e.scrollWidth < 0 ? this.pagesElement.style.display = "none" : (this.pagesElement.style.display = "", Math.ceil(e.clientWidth) - e.scrollWidth < 0 && (this.pagesElement.style.display = "none"));
  }
};
x(Et, "moduleName", "page"), //load defaults
x(Et, "pageCounters", uo);
let oi = Et;
var co = {
  local: function(l, e) {
    var t = localStorage.getItem(l + "-" + e);
    return t ? JSON.parse(t) : !1;
  },
  cookie: function(l, e) {
    var t = document.cookie, i = l + "-" + e, s = t.indexOf(i + "="), n, o;
    return s > -1 && (t = t.slice(s), n = t.indexOf(";"), n > -1 && (t = t.slice(0, n)), o = t.replace(i + "=", "")), o ? JSON.parse(o) : !1;
  }
}, fo = {
  local: function(l, e, t) {
    localStorage.setItem(l + "-" + e, JSON.stringify(t));
  },
  cookie: function(l, e, t) {
    var i = /* @__PURE__ */ new Date();
    i.setDate(i.getDate() + 1e4), document.cookie = l + "-" + e + "=" + JSON.stringify(t) + "; expires=" + i.toUTCString();
  }
};
const ue = class ue extends O {
  constructor(e) {
    super(e), this.mode = "", this.id = "", this.defWatcherBlock = !1, this.config = {}, this.readFunc = !1, this.writeFunc = !1, this.registerTableOption("persistence", !1), this.registerTableOption("persistenceID", ""), this.registerTableOption("persistenceMode", !0), this.registerTableOption("persistenceReaderFunc", !1), this.registerTableOption("persistenceWriterFunc", !1);
  }
  // Test for whether localStorage is available for use.
  localStorageTest() {
    var e = "_tabulator_test";
    try {
      return window.localStorage.setItem(e, e), window.localStorage.removeItem(e), !0;
    } catch {
      return !1;
    }
  }
  //setup parameters
  initialize() {
    if (this.table.options.persistence) {
      var e = this.table.options.persistenceMode, t = this.table.options.persistenceID, i;
      this.mode = e !== !0 ? e : this.localStorageTest() ? "local" : "cookie", this.table.options.persistenceReaderFunc ? typeof this.table.options.persistenceReaderFunc == "function" ? this.readFunc = this.table.options.persistenceReaderFunc : ue.readers[this.table.options.persistenceReaderFunc] ? this.readFunc = ue.readers[this.table.options.persistenceReaderFunc] : console.warn("Persistence Read Error - invalid reader set", this.table.options.persistenceReaderFunc) : ue.readers[this.mode] ? this.readFunc = ue.readers[this.mode] : console.warn("Persistence Read Error - invalid reader set", this.mode), this.table.options.persistenceWriterFunc ? typeof this.table.options.persistenceWriterFunc == "function" ? this.writeFunc = this.table.options.persistenceWriterFunc : ue.writers[this.table.options.persistenceWriterFunc] ? this.writeFunc = ue.writers[this.table.options.persistenceWriterFunc] : console.warn("Persistence Write Error - invalid reader set", this.table.options.persistenceWriterFunc) : ue.writers[this.mode] ? this.writeFunc = ue.writers[this.mode] : console.warn("Persistence Write Error - invalid writer set", this.mode), this.id = "tabulator-" + (t || this.table.element.getAttribute("id") || ""), this.config = {
        sort: this.table.options.persistence === !0 || this.table.options.persistence.sort,
        filter: this.table.options.persistence === !0 || this.table.options.persistence.filter,
        headerFilter: this.table.options.persistence === !0 || this.table.options.persistence.headerFilter,
        group: this.table.options.persistence === !0 || this.table.options.persistence.group,
        page: this.table.options.persistence === !0 || this.table.options.persistence.page,
        columns: this.table.options.persistence === !0 ? ["title", "width", "visible"] : this.table.options.persistence.columns
      }, this.config.page && (i = this.retrieveData("page"), i && (typeof i.paginationSize < "u" && (this.config.page === !0 || this.config.page.size) && (this.table.options.paginationSize = i.paginationSize), typeof i.paginationInitialPage < "u" && (this.config.page === !0 || this.config.page.page) && (this.table.options.paginationInitialPage = i.paginationInitialPage))), this.config.group && (i = this.retrieveData("group"), i && (typeof i.groupBy < "u" && (this.config.group === !0 || this.config.group.groupBy) && (this.table.options.groupBy = i.groupBy), typeof i.groupStartOpen < "u" && (this.config.group === !0 || this.config.group.groupStartOpen) && (this.table.options.groupStartOpen = i.groupStartOpen), typeof i.groupHeader < "u" && (this.config.group === !0 || this.config.group.groupHeader) && (this.table.options.groupHeader = i.groupHeader))), this.config.columns && (this.table.options.columns = this.load("columns", this.table.options.columns), this.subscribe("column-init", this.initializeColumn.bind(this)), this.subscribe("column-show", this.save.bind(this, "columns")), this.subscribe("column-hide", this.save.bind(this, "columns")), this.subscribe("column-moved", this.save.bind(this, "columns"))), this.subscribe("table-built", this.tableBuilt.bind(this), 0), this.subscribe("table-redraw", this.tableRedraw.bind(this)), this.subscribe("filter-changed", this.eventSave.bind(this, "filter")), this.subscribe("filter-changed", this.eventSave.bind(this, "headerFilter")), this.subscribe("sort-changed", this.eventSave.bind(this, "sort")), this.subscribe("group-changed", this.eventSave.bind(this, "group")), this.subscribe("page-changed", this.eventSave.bind(this, "page")), this.subscribe("column-resized", this.eventSave.bind(this, "columns")), this.subscribe("column-width", this.eventSave.bind(this, "columns")), this.subscribe("layout-refreshed", this.eventSave.bind(this, "columns"));
    }
    this.registerTableFunction("getColumnLayout", this.getColumnLayout.bind(this)), this.registerTableFunction("setColumnLayout", this.setColumnLayout.bind(this));
  }
  eventSave(e) {
    this.config[e] && this.save(e);
  }
  tableBuilt() {
    var e, t, i;
    this.config.sort && (e = this.load("sort"), e && (this.table.options.initialSort = e)), this.config.filter && (t = this.load("filter"), t && (this.table.options.initialFilter = t)), this.config.headerFilter && (i = this.load("headerFilter"), i && (this.table.options.initialHeaderFilter = i));
  }
  tableRedraw(e) {
    e && this.config.columns && this.save("columns");
  }
  ///////////////////////////////////
  ///////// Table Functions /////////
  ///////////////////////////////////
  getColumnLayout() {
    return this.parseColumns(this.table.columnManager.getColumns());
  }
  setColumnLayout(e) {
    return this.table.columnManager.setColumns(this.mergeDefinition(this.table.options.columns, e, !0)), !0;
  }
  ///////////////////////////////////
  ///////// Internal Logic //////////
  ///////////////////////////////////
  initializeColumn(e) {
    var t, i;
    this.config.columns && (this.defWatcherBlock = !0, t = e.getDefinition(), i = this.config.columns === !0 ? Object.keys(t) : this.config.columns, i.forEach((s) => {
      var n = Object.getOwnPropertyDescriptor(t, s), o = t[s];
      n && Object.defineProperty(t, s, {
        set: (r) => {
          o = r, this.defWatcherBlock || this.save("columns"), n.set && n.set(r);
        },
        get: () => (n.get && n.get(), o)
      });
    }), this.defWatcherBlock = !1);
  }
  //load saved definitions
  load(e, t) {
    var i = this.retrieveData(e);
    return t && (i = i ? this.mergeDefinition(t, i) : t), i;
  }
  //retrieve data from memory
  retrieveData(e) {
    return this.readFunc ? this.readFunc(this.id, e) : !1;
  }
  //merge old and new column definitions
  mergeDefinition(e, t, i) {
    var s = [];
    return t = t || [], t.forEach((n, o) => {
      var r = this._findColumn(e, n), a;
      r && (i ? a = Object.keys(n) : this.config.columns === !0 || this.config.columns == null ? (a = Object.keys(r), a.push("width")) : a = this.config.columns, a.forEach((h) => {
        h !== "columns" && typeof n[h] < "u" && (r[h] = n[h]);
      }), r.columns && (r.columns = this.mergeDefinition(r.columns, n.columns)), s.push(r));
    }), e.forEach((n, o) => {
      var r = this._findColumn(t, n);
      r || (s.length > o ? s.splice(o, 0, n) : s.push(n));
    }), s;
  }
  //find matching columns
  _findColumn(e, t) {
    var i = t.columns ? "group" : t.field ? "field" : "object";
    return e.find(function(s) {
      switch (i) {
        case "group":
          return s.title === t.title && s.columns.length === t.columns.length;
        case "field":
          return s.field === t.field;
        case "object":
          return s === t;
      }
    });
  }
  //save data
  save(e) {
    var t = {};
    switch (e) {
      case "columns":
        t = this.parseColumns(this.table.columnManager.getColumns());
        break;
      case "filter":
        t = this.table.modules.filter.getFilters();
        break;
      case "headerFilter":
        t = this.table.modules.filter.getHeaderFilters();
        break;
      case "sort":
        t = this.validateSorters(this.table.modules.sort.getSort());
        break;
      case "group":
        t = this.getGroupConfig();
        break;
      case "page":
        t = this.getPageConfig();
        break;
    }
    this.writeFunc && this.writeFunc(this.id, e, t);
  }
  //ensure sorters contain no function data
  validateSorters(e) {
    return e.forEach(function(t) {
      t.column = t.field, delete t.field;
    }), e;
  }
  getGroupConfig() {
    var e = {};
    return this.config.group && ((this.config.group === !0 || this.config.group.groupBy) && (e.groupBy = this.table.options.groupBy), (this.config.group === !0 || this.config.group.groupStartOpen) && (e.groupStartOpen = this.table.options.groupStartOpen), (this.config.group === !0 || this.config.group.groupHeader) && (e.groupHeader = this.table.options.groupHeader)), e;
  }
  getPageConfig() {
    var e = {};
    return this.config.page && ((this.config.page === !0 || this.config.page.size) && (e.paginationSize = this.table.modules.page.getPageSize()), (this.config.page === !0 || this.config.page.page) && (e.paginationInitialPage = this.table.modules.page.getPage())), e;
  }
  //parse columns for data to store
  parseColumns(e) {
    var t = [], i = ["headerContextMenu", "headerMenu", "contextMenu", "clickMenu"];
    return e.forEach((s) => {
      var n = {}, o = s.getDefinition(), r;
      s.isGroup ? (n.title = o.title, n.columns = this.parseColumns(s.getColumns())) : (n.field = s.getField(), this.config.columns === !0 || this.config.columns == null ? (r = Object.keys(o), r.push("width"), r.push("visible")) : r = this.config.columns, r.forEach((a) => {
        switch (a) {
          case "width":
            n.width = s.getWidth();
            break;
          case "visible":
            n.visible = s.visible;
            break;
          default:
            typeof o[a] != "function" && i.indexOf(a) === -1 && (n[a] = o[a]);
        }
      })), t.push(n);
    }), t;
  }
};
x(ue, "moduleName", "persistence"), x(ue, "moduleInitOrder", -10), //load defaults
x(ue, "readers", co), x(ue, "writers", fo);
let ri = ue;
class Ki extends O {
  constructor(e) {
    super(e), this.columnSubscribers = {}, this.registerTableOption("rowContextPopup", !1), this.registerTableOption("rowClickPopup", !1), this.registerTableOption("rowDblClickPopup", !1), this.registerTableOption("groupContextPopup", !1), this.registerTableOption("groupClickPopup", !1), this.registerTableOption("groupDblClickPopup", !1), this.registerColumnOption("headerContextPopup"), this.registerColumnOption("headerClickPopup"), this.registerColumnOption("headerDblClickPopup"), this.registerColumnOption("headerPopup"), this.registerColumnOption("headerPopupIcon"), this.registerColumnOption("contextPopup"), this.registerColumnOption("clickPopup"), this.registerColumnOption("dblClickPopup"), this.registerComponentFunction("cell", "popup", this._componentPopupCall.bind(this)), this.registerComponentFunction("column", "popup", this._componentPopupCall.bind(this)), this.registerComponentFunction("row", "popup", this._componentPopupCall.bind(this)), this.registerComponentFunction("group", "popup", this._componentPopupCall.bind(this));
  }
  initialize() {
    this.initializeRowWatchers(), this.initializeGroupWatchers(), this.subscribe("column-init", this.initializeColumn.bind(this));
  }
  _componentPopupCall(e, t, i) {
    this.loadPopupEvent(t, null, e, i);
  }
  initializeRowWatchers() {
    this.table.options.rowContextPopup && (this.subscribe("row-contextmenu", this.loadPopupEvent.bind(this, this.table.options.rowContextPopup)), this.table.on("rowTapHold", this.loadPopupEvent.bind(this, this.table.options.rowContextPopup))), this.table.options.rowClickPopup && this.subscribe("row-click", this.loadPopupEvent.bind(this, this.table.options.rowClickPopup)), this.table.options.rowDblClickPopup && this.subscribe("row-dblclick", this.loadPopupEvent.bind(this, this.table.options.rowDblClickPopup));
  }
  initializeGroupWatchers() {
    this.table.options.groupContextPopup && (this.subscribe("group-contextmenu", this.loadPopupEvent.bind(this, this.table.options.groupContextPopup)), this.table.on("groupTapHold", this.loadPopupEvent.bind(this, this.table.options.groupContextPopup))), this.table.options.groupClickPopup && this.subscribe("group-click", this.loadPopupEvent.bind(this, this.table.options.groupClickPopup)), this.table.options.groupDblClickPopup && this.subscribe("group-dblclick", this.loadPopupEvent.bind(this, this.table.options.groupDblClickPopup));
  }
  initializeColumn(e) {
    var t = e.definition;
    t.headerContextPopup && !this.columnSubscribers.headerContextPopup && (this.columnSubscribers.headerContextPopup = this.loadPopupTableColumnEvent.bind(this, "headerContextPopup"), this.subscribe("column-contextmenu", this.columnSubscribers.headerContextPopup), this.table.on("headerTapHold", this.loadPopupTableColumnEvent.bind(this, "headerContextPopup"))), t.headerClickPopup && !this.columnSubscribers.headerClickPopup && (this.columnSubscribers.headerClickPopup = this.loadPopupTableColumnEvent.bind(this, "headerClickPopup"), this.subscribe("column-click", this.columnSubscribers.headerClickPopup)), t.headerDblClickPopup && !this.columnSubscribers.headerDblClickPopup && (this.columnSubscribers.headerDblClickPopup = this.loadPopupTableColumnEvent.bind(this, "headerDblClickPopup"), this.subscribe("column-dblclick", this.columnSubscribers.headerDblClickPopup)), t.headerPopup && this.initializeColumnHeaderPopup(e), t.contextPopup && !this.columnSubscribers.contextPopup && (this.columnSubscribers.contextPopup = this.loadPopupTableCellEvent.bind(this, "contextPopup"), this.subscribe("cell-contextmenu", this.columnSubscribers.contextPopup), this.table.on("cellTapHold", this.loadPopupTableCellEvent.bind(this, "contextPopup"))), t.clickPopup && !this.columnSubscribers.clickPopup && (this.columnSubscribers.clickPopup = this.loadPopupTableCellEvent.bind(this, "clickPopup"), this.subscribe("cell-click", this.columnSubscribers.clickPopup)), t.dblClickPopup && !this.columnSubscribers.dblClickPopup && (this.columnSubscribers.dblClickPopup = this.loadPopupTableCellEvent.bind(this, "dblClickPopup"), this.subscribe("cell-click", this.columnSubscribers.dblClickPopup));
  }
  initializeColumnHeaderPopup(e) {
    var t = e.definition.headerPopupIcon, i;
    i = document.createElement("span"), i.classList.add("tabulator-header-popup-button"), t ? (typeof t == "function" && (t = t(e.getComponent())), t instanceof HTMLElement ? i.appendChild(t) : i.innerHTML = t) : i.innerHTML = "&vellip;", i.addEventListener("click", (s) => {
      s.stopPropagation(), s.preventDefault(), this.loadPopupEvent(e.definition.headerPopup, s, e);
    }), e.titleElement.insertBefore(i, e.titleElement.firstChild);
  }
  loadPopupTableCellEvent(e, t, i) {
    i._cell && (i = i._cell), i.column.definition[e] && this.loadPopupEvent(i.column.definition[e], t, i);
  }
  loadPopupTableColumnEvent(e, t, i) {
    i._column && (i = i._column), i.definition[e] && this.loadPopupEvent(i.definition[e], t, i);
  }
  loadPopupEvent(e, t, i, s) {
    var n;
    function o(r) {
      n = r;
    }
    i._group ? i = i._group : i._row && (i = i._row), e = typeof e == "function" ? e.call(this.table, t, i.getComponent(), o) : e, this.loadPopup(t, i, e, n, s);
  }
  loadPopup(e, t, i, s, n) {
    var o = !(e instanceof MouseEvent), r, a;
    i instanceof HTMLElement ? r = i : (r = document.createElement("div"), r.innerHTML = i), r.classList.add("tabulator-popup"), r.addEventListener("click", (h) => {
      h.stopPropagation();
    }), o || e.preventDefault(), a = this.popup(r), typeof s == "function" && a.renderCallback(s), e ? a.show(e) : a.show(t.getElement(), n || "center"), a.hideOnBlur(() => {
      this.dispatchExternal("popupClosed", t.getComponent());
    }), this.dispatchExternal("popupOpened", t.getComponent());
  }
}
x(Ki, "moduleName", "popup");
class Xi extends O {
  constructor(e) {
    super(e), this.element = !1, this.manualBlock = !1, this.beforeprintEventHandler = null, this.afterprintEventHandler = null, this.registerTableOption("printAsHtml", !1), this.registerTableOption("printFormatter", !1), this.registerTableOption("printHeader", !1), this.registerTableOption("printFooter", !1), this.registerTableOption("printStyled", !0), this.registerTableOption("printRowRange", "visible"), this.registerTableOption("printConfig", {}), this.registerColumnOption("print"), this.registerColumnOption("titlePrint");
  }
  initialize() {
    this.table.options.printAsHtml && (this.beforeprintEventHandler = this.replaceTable.bind(this), this.afterprintEventHandler = this.cleanup.bind(this), window.addEventListener("beforeprint", this.beforeprintEventHandler), window.addEventListener("afterprint", this.afterprintEventHandler), this.subscribe("table-destroy", this.destroy.bind(this))), this.registerTableFunction("print", this.printFullscreen.bind(this));
  }
  destroy() {
    this.table.options.printAsHtml && (window.removeEventListener("beforeprint", this.beforeprintEventHandler), window.removeEventListener("afterprint", this.afterprintEventHandler));
  }
  ///////////////////////////////////
  ///////// Table Functions /////////
  ///////////////////////////////////
  ///////////////////////////////////
  ///////// Internal Logic //////////
  ///////////////////////////////////
  replaceTable() {
    this.manualBlock || (this.element = document.createElement("div"), this.element.classList.add("tabulator-print-table"), this.element.appendChild(this.table.modules.export.generateTable(this.table.options.printConfig, this.table.options.printStyled, this.table.options.printRowRange, "print")), this.table.element.style.display = "none", this.table.element.parentNode.insertBefore(this.element, this.table.element));
  }
  cleanup() {
    document.body.classList.remove("tabulator-print-fullscreen-hide"), this.element && this.element.parentNode && (this.element.parentNode.removeChild(this.element), this.table.element.style.display = "");
  }
  printFullscreen(e, t, i) {
    var s = window.scrollX, n = window.scrollY, o = document.createElement("div"), r = document.createElement("div"), a = this.table.modules.export.generateTable(typeof i < "u" ? i : this.table.options.printConfig, typeof t < "u" ? t : this.table.options.printStyled, e || this.table.options.printRowRange, "print"), h, d;
    this.manualBlock = !0, this.element = document.createElement("div"), this.element.classList.add("tabulator-print-fullscreen"), this.table.options.printHeader && (o.classList.add("tabulator-print-header"), h = typeof this.table.options.printHeader == "function" ? this.table.options.printHeader.call(this.table) : this.table.options.printHeader, typeof h == "string" ? o.innerHTML = h : o.appendChild(h), this.element.appendChild(o)), this.element.appendChild(a), this.table.options.printFooter && (r.classList.add("tabulator-print-footer"), d = typeof this.table.options.printFooter == "function" ? this.table.options.printFooter.call(this.table) : this.table.options.printFooter, typeof d == "string" ? r.innerHTML = d : r.appendChild(d), this.element.appendChild(r)), document.body.classList.add("tabulator-print-fullscreen-hide"), document.body.appendChild(this.element), this.table.options.printFormatter && this.table.options.printFormatter(this.element, a), window.print(), this.cleanup(), window.scrollTo(s, n), this.manualBlock = !1;
  }
}
x(Xi, "moduleName", "print");
class Ji extends O {
  constructor(e) {
    super(e), this.data = !1, this.blocked = !1, this.origFuncs = {}, this.currentVersion = 0, this.registerTableOption("reactiveData", !1);
  }
  initialize() {
    this.table.options.reactiveData && (this.subscribe("cell-value-save-before", this.block.bind(this, "cellsave")), this.subscribe("cell-value-save-after", this.unblock.bind(this, "cellsave")), this.subscribe("row-data-save-before", this.block.bind(this, "rowsave")), this.subscribe("row-data-save-after", this.unblock.bind(this, "rowsave")), this.subscribe("row-data-init-after", this.watchRow.bind(this)), this.subscribe("data-processing", this.watchData.bind(this)), this.subscribe("table-destroy", this.unwatchData.bind(this)));
  }
  watchData(e) {
    var t = this, i;
    this.currentVersion++, i = this.currentVersion, this.unwatchData(), this.data = e, this.origFuncs.push = e.push, Object.defineProperty(this.data, "push", {
      enumerable: !1,
      configurable: !0,
      value: function() {
        var s = Array.from(arguments), n;
        return !t.blocked && i === t.currentVersion && (t.block("data-push"), s.forEach((o) => {
          t.table.rowManager.addRowActual(o, !1);
        }), n = t.origFuncs.push.apply(e, arguments), t.unblock("data-push")), n;
      }
    }), this.origFuncs.unshift = e.unshift, Object.defineProperty(this.data, "unshift", {
      enumerable: !1,
      configurable: !0,
      value: function() {
        var s = Array.from(arguments), n;
        return !t.blocked && i === t.currentVersion && (t.block("data-unshift"), s.forEach((o) => {
          t.table.rowManager.addRowActual(o, !0);
        }), n = t.origFuncs.unshift.apply(e, arguments), t.unblock("data-unshift")), n;
      }
    }), this.origFuncs.shift = e.shift, Object.defineProperty(this.data, "shift", {
      enumerable: !1,
      configurable: !0,
      value: function() {
        var s, n;
        return !t.blocked && i === t.currentVersion && (t.block("data-shift"), t.data.length && (s = t.table.rowManager.getRowFromDataObject(t.data[0]), s && s.deleteActual()), n = t.origFuncs.shift.call(e), t.unblock("data-shift")), n;
      }
    }), this.origFuncs.pop = e.pop, Object.defineProperty(this.data, "pop", {
      enumerable: !1,
      configurable: !0,
      value: function() {
        var s, n;
        return !t.blocked && i === t.currentVersion && (t.block("data-pop"), t.data.length && (s = t.table.rowManager.getRowFromDataObject(t.data[t.data.length - 1]), s && s.deleteActual()), n = t.origFuncs.pop.call(e), t.unblock("data-pop")), n;
      }
    }), this.origFuncs.splice = e.splice, Object.defineProperty(this.data, "splice", {
      enumerable: !1,
      configurable: !0,
      value: function() {
        var s = Array.from(arguments), n = s[0] < 0 ? e.length + s[0] : s[0], o = s[1], r = s[2] ? s.slice(2) : !1, a, h;
        if (!t.blocked && i === t.currentVersion) {
          if (t.block("data-splice"), r && (a = e[n] ? t.table.rowManager.getRowFromDataObject(e[n]) : !1, a ? r.forEach((u) => {
            t.table.rowManager.addRowActual(u, !0, a, !0);
          }) : (r = r.slice().reverse(), r.forEach((u) => {
            t.table.rowManager.addRowActual(u, !0, !1, !0);
          }))), o !== 0) {
            var d = e.slice(n, typeof s[1] > "u" ? s[1] : n + o);
            d.forEach((u, c) => {
              var g = t.table.rowManager.getRowFromDataObject(u);
              g && g.deleteActual(c !== d.length - 1);
            });
          }
          (r || o !== 0) && t.table.rowManager.reRenderInPosition(), h = t.origFuncs.splice.apply(e, arguments), t.unblock("data-splice");
        }
        return h;
      }
    });
  }
  unwatchData() {
    if (this.data !== !1)
      for (var e in this.origFuncs)
        Object.defineProperty(this.data, e, {
          enumerable: !0,
          configurable: !0,
          writable: !0,
          value: this.origFuncs.key
        });
  }
  watchRow(e) {
    var t = e.getData();
    for (var i in t)
      this.watchKey(e, t, i);
    this.table.options.dataTree && this.watchTreeChildren(e);
  }
  watchTreeChildren(e) {
    var t = this, i = e.getData()[this.table.options.dataTreeChildField], s = {};
    i && (s.push = i.push, Object.defineProperty(i, "push", {
      enumerable: !1,
      configurable: !0,
      value: () => {
        if (!t.blocked) {
          t.block("tree-push");
          var n = s.push.apply(i, arguments);
          this.rebuildTree(e), t.unblock("tree-push");
        }
        return n;
      }
    }), s.unshift = i.unshift, Object.defineProperty(i, "unshift", {
      enumerable: !1,
      configurable: !0,
      value: () => {
        if (!t.blocked) {
          t.block("tree-unshift");
          var n = s.unshift.apply(i, arguments);
          this.rebuildTree(e), t.unblock("tree-unshift");
        }
        return n;
      }
    }), s.shift = i.shift, Object.defineProperty(i, "shift", {
      enumerable: !1,
      configurable: !0,
      value: () => {
        if (!t.blocked) {
          t.block("tree-shift");
          var n = s.shift.call(i);
          this.rebuildTree(e), t.unblock("tree-shift");
        }
        return n;
      }
    }), s.pop = i.pop, Object.defineProperty(i, "pop", {
      enumerable: !1,
      configurable: !0,
      value: () => {
        if (!t.blocked) {
          t.block("tree-pop");
          var n = s.pop.call(i);
          this.rebuildTree(e), t.unblock("tree-pop");
        }
        return n;
      }
    }), s.splice = i.splice, Object.defineProperty(i, "splice", {
      enumerable: !1,
      configurable: !0,
      value: () => {
        if (!t.blocked) {
          t.block("tree-splice");
          var n = s.splice.apply(i, arguments);
          this.rebuildTree(e), t.unblock("tree-splice");
        }
        return n;
      }
    }));
  }
  rebuildTree(e) {
    this.table.modules.dataTree.initializeRow(e), this.table.modules.dataTree.layoutRow(e), this.table.rowManager.refreshActiveData("tree", !1, !0);
  }
  watchKey(e, t, i) {
    var s = this, n = Object.getOwnPropertyDescriptor(t, i), o = t[i], r = this.currentVersion;
    Object.defineProperty(t, i, {
      set: (a) => {
        if (o = a, !s.blocked && r === s.currentVersion) {
          s.block("key");
          var h = {};
          h[i] = a, e.updateData(h), s.unblock("key");
        }
        n.set && n.set(a);
      },
      get: () => (n.get && n.get(), o)
    });
  }
  unwatchRow(e) {
    var t = e.getData();
    for (var i in t)
      Object.defineProperty(t, i, {
        value: t[i]
      });
  }
  block(e) {
    this.blocked || (this.blocked = e);
  }
  unblock(e) {
    this.blocked === e && (this.blocked = !1);
  }
}
x(Ji, "moduleName", "reactiveData");
class Yi extends O {
  constructor(e) {
    super(e), this.startColumn = !1, this.startX = !1, this.startWidth = !1, this.latestX = !1, this.handle = null, this.initialNextColumn = null, this.nextColumn = null, this.initialized = !1, this.registerColumnOption("resizable", !0), this.registerTableOption("resizableColumnFit", !1), this.registerTableOption("resizableColumnGuide", !1);
  }
  initialize() {
    this.subscribe("column-rendered", this.layoutColumnHeader.bind(this));
  }
  initializeEventWatchers() {
    this.initialized || (this.subscribe("cell-rendered", this.layoutCellHandles.bind(this)), this.subscribe("cell-delete", this.deInitializeComponent.bind(this)), this.subscribe("cell-height", this.resizeHandle.bind(this)), this.subscribe("column-moved", this.columnLayoutUpdated.bind(this)), this.subscribe("column-hide", this.deInitializeColumn.bind(this)), this.subscribe("column-show", this.columnLayoutUpdated.bind(this)), this.subscribe("column-width", this.columnWidthUpdated.bind(this)), this.subscribe("column-delete", this.deInitializeComponent.bind(this)), this.subscribe("column-height", this.resizeHandle.bind(this)), this.initialized = !0);
  }
  layoutCellHandles(e) {
    e.row.type === "row" && (this.deInitializeComponent(e), this.initializeColumn("cell", e, e.column, e.element));
  }
  layoutColumnHeader(e) {
    e.definition.resizable && (this.initializeEventWatchers(), this.deInitializeComponent(e), this.initializeColumn("header", e, e, e.element));
  }
  columnLayoutUpdated(e) {
    var t = e.prevColumn();
    this.reinitializeColumn(e), t && this.reinitializeColumn(t);
  }
  columnWidthUpdated(e) {
    e.modules.frozen && (this.table.modules.frozenColumns.leftColumns.includes(e) ? this.table.modules.frozenColumns.leftColumns.forEach((t) => {
      this.reinitializeColumn(t);
    }) : this.table.modules.frozenColumns.rightColumns.includes(e) && this.table.modules.frozenColumns.rightColumns.forEach((t) => {
      this.reinitializeColumn(t);
    }));
  }
  frozenColumnOffset(e) {
    var t = !1;
    return e.modules.frozen && (t = e.modules.frozen.marginValue, e.modules.frozen.position === "left" ? t += e.getWidth() - 3 : t && (t -= 3)), t !== !1 ? t + "px" : !1;
  }
  reinitializeColumn(e) {
    var t = this.frozenColumnOffset(e);
    e.cells.forEach((i) => {
      i.modules.resize && i.modules.resize.handleEl && (t && (i.modules.resize.handleEl.style[e.modules.frozen.position] = t, i.modules.resize.handleEl.style["z-index"] = 11), i.element.after(i.modules.resize.handleEl));
    }), e.modules.resize && e.modules.resize.handleEl && (t && (e.modules.resize.handleEl.style[e.modules.frozen.position] = t), e.element.after(e.modules.resize.handleEl));
  }
  initializeColumn(e, t, i, s) {
    var n = this, o = !1, r = i.definition.resizable, a = {}, h = i.getLastColumn();
    if (e === "header" && (o = i.definition.formatter == "textarea" || i.definition.variableHeight, a = { variableHeight: o }), (r === !0 || r == e) && this._checkResizability(h)) {
      var d = document.createElement("span");
      d.className = "tabulator-col-resize-handle", d.addEventListener("click", function(c) {
        c.stopPropagation();
      });
      var u = function(c) {
        n.startColumn = i, n.initialNextColumn = n.nextColumn = h.nextColumn(), n._mouseDown(c, h, d);
      };
      d.addEventListener("mousedown", u), d.addEventListener("touchstart", u, { passive: !0 }), d.addEventListener("dblclick", (c) => {
        var g = h.getWidth();
        c.stopPropagation(), h.reinitializeWidth(!0), g !== h.getWidth() && (n.dispatch("column-resized", h), n.dispatchExternal("columnResized", h.getComponent()));
      }), i.modules.frozen && (d.style.position = "sticky", d.style[i.modules.frozen.position] = this.frozenColumnOffset(i)), a.handleEl = d, s.parentNode && i.visible && s.after(d);
    }
    t.modules.resize = a;
  }
  deInitializeColumn(e) {
    this.deInitializeComponent(e), e.cells.forEach((t) => {
      this.deInitializeComponent(t);
    });
  }
  deInitializeComponent(e) {
    var t;
    e.modules.resize && (t = e.modules.resize.handleEl, t && t.parentElement && t.parentElement.removeChild(t));
  }
  resizeHandle(e, t) {
    e.modules.resize && e.modules.resize.handleEl && (e.modules.resize.handleEl.style.height = t);
  }
  resize(e, t) {
    var i = typeof e.clientX > "u" ? e.touches[0].clientX : e.clientX, s = i - this.startX, n = i - this.latestX, o, r;
    if (this.latestX = i, this.table.rtl && (s = -s, n = -n), o = t.width == t.minWidth || t.width == t.maxWidth, t.setWidth(this.startWidth + s), r = t.width == t.minWidth || t.width == t.maxWidth, n < 0 && (this.nextColumn = this.initialNextColumn), this.table.options.resizableColumnFit && this.nextColumn && !(o && r)) {
      let a = this.nextColumn.getWidth();
      n > 0 && a <= this.nextColumn.minWidth && (this.nextColumn = this.nextColumn.nextColumn()), this.nextColumn && this.nextColumn.setWidth(this.nextColumn.getWidth() - n);
    }
    this.table.columnManager.rerenderColumns(!0), !this.table.browserSlow && t.modules.resize && t.modules.resize.variableHeight && t.checkCellHeights();
  }
  calcGuidePosition(e, t, i) {
    var s = typeof e.clientX > "u" ? e.touches[0].clientX : e.clientX, n = i.getBoundingClientRect().x - this.table.element.getBoundingClientRect().x, o = this.table.element.getBoundingClientRect().x, r = t.element.getBoundingClientRect().left - o, a = s - this.startX, h = Math.max(n + a, r + t.minWidth);
    return t.maxWidth && (h = Math.min(h, r + t.maxWidth)), h;
  }
  _checkResizability(e) {
    return e.definition.resizable;
  }
  _mouseDown(e, t, i) {
    var s = this, n;
    this.dispatchExternal("columnResizing", t.getComponent()), s.table.options.resizableColumnGuide && (n = document.createElement("span"), n.classList.add("tabulator-col-resize-guide"), s.table.element.appendChild(n), setTimeout(() => {
      n.style.left = s.calcGuidePosition(e, t, i) + "px";
    })), s.table.element.classList.add("tabulator-block-select");
    function o(a) {
      s.table.options.resizableColumnGuide ? n.style.left = s.calcGuidePosition(a, t, i) + "px" : s.resize(a, t);
    }
    function r(a) {
      s.table.options.resizableColumnGuide && (s.resize(a, t), n.remove()), s.startColumn.modules.edit && (s.startColumn.modules.edit.blocked = !1), s.table.browserSlow && t.modules.resize && t.modules.resize.variableHeight && t.checkCellHeights(), document.body.removeEventListener("mouseup", r), document.body.removeEventListener("mousemove", o), i.removeEventListener("touchmove", o), i.removeEventListener("touchend", r), s.table.element.classList.remove("tabulator-block-select"), s.startWidth !== t.getWidth() && (s.table.columnManager.verticalAlignHeaders(), s.dispatch("column-resized", t), s.dispatchExternal("columnResized", t.getComponent()));
    }
    e.stopPropagation(), s.startColumn.modules.edit && (s.startColumn.modules.edit.blocked = !0), s.startX = typeof e.clientX > "u" ? e.touches[0].clientX : e.clientX, s.latestX = s.startX, s.startWidth = t.getWidth(), document.body.addEventListener("mousemove", o), document.body.addEventListener("mouseup", r), i.addEventListener("touchmove", o, { passive: !0 }), i.addEventListener("touchend", r);
  }
}
x(Yi, "moduleName", "resizeColumns");
class Qi extends O {
  constructor(e) {
    super(e), this.startColumn = !1, this.startY = !1, this.startHeight = !1, this.handle = null, this.prevHandle = null, this.registerTableOption("resizableRows", !1), this.registerTableOption("resizableRowGuide", !1);
  }
  initialize() {
    this.table.options.resizableRows && this.subscribe("row-layout-after", this.initializeRow.bind(this));
  }
  initializeRow(e) {
    var t = this, i = e.getElement(), s = document.createElement("div");
    s.className = "tabulator-row-resize-handle";
    var n = document.createElement("div");
    n.className = "tabulator-row-resize-handle prev", s.addEventListener("click", function(a) {
      a.stopPropagation();
    });
    var o = function(a) {
      t.startRow = e, t._mouseDown(a, e, s);
    };
    s.addEventListener("mousedown", o), s.addEventListener("touchstart", o, { passive: !0 }), n.addEventListener("click", function(a) {
      a.stopPropagation();
    });
    var r = function(a) {
      var h = t.table.rowManager.prevDisplayRow(e);
      h && (t.startRow = h, t._mouseDown(a, h, n));
    };
    n.addEventListener("mousedown", r), n.addEventListener("touchstart", r, { passive: !0 }), i.appendChild(s), i.appendChild(n);
  }
  resize(e, t) {
    t.setHeight(this.startHeight + ((typeof e.screenY > "u" ? e.touches[0].screenY : e.screenY) - this.startY));
  }
  calcGuidePosition(e, t, i) {
    var s = typeof e.screenY > "u" ? e.touches[0].screenY : e.screenY, n = i.getBoundingClientRect().y - this.table.element.getBoundingClientRect().y, o = this.table.element.getBoundingClientRect().y, r = t.element.getBoundingClientRect().top - o, a = s - this.startY;
    return Math.max(n + a, r);
  }
  _mouseDown(e, t, i) {
    var s = this, n;
    s.dispatchExternal("rowResizing", t.getComponent()), s.table.options.resizableRowGuide && (n = document.createElement("span"), n.classList.add("tabulator-row-resize-guide"), s.table.element.appendChild(n), setTimeout(() => {
      n.style.top = s.calcGuidePosition(e, t, i) + "px";
    })), s.table.element.classList.add("tabulator-block-select");
    function o(a) {
      s.table.options.resizableRowGuide ? n.style.top = s.calcGuidePosition(a, t, i) + "px" : s.resize(a, t);
    }
    function r(a) {
      s.table.options.resizableRowGuide && (s.resize(a, t), n.remove()), document.body.removeEventListener("mouseup", o), document.body.removeEventListener("mousemove", o), i.removeEventListener("touchmove", o), i.removeEventListener("touchend", r), s.table.element.classList.remove("tabulator-block-select"), s.dispatchExternal("rowResized", t.getComponent());
    }
    e.stopPropagation(), s.startY = typeof e.screenY > "u" ? e.touches[0].screenY : e.screenY, s.startHeight = t.getHeight(), document.body.addEventListener("mousemove", o), document.body.addEventListener("mouseup", r), i.addEventListener("touchmove", o, { passive: !0 }), i.addEventListener("touchend", r);
  }
}
x(Qi, "moduleName", "resizeRows");
class Zi extends O {
  constructor(e) {
    super(e), this.binding = !1, this.visibilityObserver = !1, this.resizeObserver = !1, this.containerObserver = !1, this.tableHeight = 0, this.tableWidth = 0, this.containerHeight = 0, this.containerWidth = 0, this.autoResize = !1, this.visible = !1, this.initialized = !1, this.initialRedraw = !1, this.registerTableOption("autoResize", !0);
  }
  initialize() {
    if (this.table.options.autoResize) {
      var e = this.table, t;
      this.tableHeight = e.element.clientHeight, this.tableWidth = e.element.clientWidth, e.element.parentNode && (this.containerHeight = e.element.parentNode.clientHeight, this.containerWidth = e.element.parentNode.clientWidth), typeof IntersectionObserver < "u" && typeof ResizeObserver < "u" && e.rowManager.getRenderMode() === "virtual" ? (this.initializeVisibilityObserver(), this.autoResize = !0, this.resizeObserver = new ResizeObserver((i) => {
        if (!e.browserMobile || e.browserMobile && (!e.modules.edit || e.modules.edit && !e.modules.edit.currentCell)) {
          var s = Math.floor(i[0].contentRect.height), n = Math.floor(i[0].contentRect.width);
          (this.tableHeight != s || this.tableWidth != n) && (this.tableHeight = s, this.tableWidth = n, e.element.parentNode && (this.containerHeight = e.element.parentNode.clientHeight, this.containerWidth = e.element.parentNode.clientWidth), this.redrawTable());
        }
      }), this.resizeObserver.observe(e.element), t = window.getComputedStyle(e.element), this.table.element.parentNode && !this.table.rowManager.fixedHeight && (t.getPropertyValue("max-height") || t.getPropertyValue("min-height")) && (this.containerObserver = new ResizeObserver((i) => {
        if (!e.browserMobile || e.browserMobile && (!e.modules.edit || e.modules.edit && !e.modules.edit.currentCell)) {
          var s = Math.floor(i[0].contentRect.height), n = Math.floor(i[0].contentRect.width);
          (this.containerHeight != s || this.containerWidth != n) && (this.containerHeight = s, this.containerWidth = n, this.tableHeight = e.element.clientHeight, this.tableWidth = e.element.clientWidth), this.redrawTable();
        }
      }), this.containerObserver.observe(this.table.element.parentNode)), this.subscribe("table-resize", this.tableResized.bind(this))) : (this.binding = function() {
        (!e.browserMobile || e.browserMobile && (!e.modules.edit || e.modules.edit && !e.modules.edit.currentCell)) && (e.columnManager.rerenderColumns(!0), e.redraw());
      }, window.addEventListener("resize", this.binding)), this.subscribe("table-destroy", this.clearBindings.bind(this));
    }
  }
  initializeVisibilityObserver() {
    this.visibilityObserver = new IntersectionObserver((e) => {
      this.visible = e[0].isIntersecting, this.initialized ? this.visible && (this.redrawTable(this.initialRedraw), this.initialRedraw = !1) : (this.initialized = !0, this.initialRedraw = !this.visible);
    }), this.visibilityObserver.observe(this.table.element);
  }
  redrawTable(e) {
    this.initialized && this.visible && (this.table.columnManager.rerenderColumns(!0), this.table.redraw(e));
  }
  tableResized() {
    this.table.rowManager.redraw();
  }
  clearBindings() {
    this.binding && window.removeEventListener("resize", this.binding), this.resizeObserver && this.resizeObserver.unobserve(this.table.element), this.visibilityObserver && this.visibilityObserver.unobserve(this.table.element), this.containerObserver && this.containerObserver.unobserve(this.table.element.parentNode);
  }
}
x(Zi, "moduleName", "resizeTable");
function po(l, e, t) {
  var i = document.createElement("div"), s = l.getRow()._row.modules.responsiveLayout;
  i.classList.add("tabulator-responsive-collapse-toggle"), i.innerHTML = `<svg class='tabulator-responsive-collapse-toggle-open' viewbox="0 0 24 24">
  <line x1="7" y1="12" x2="17" y2="12" fill="none" stroke-width="3" stroke-linecap="round" />
  <line y1="7" x1="12" y2="17" x2="12" fill="none" stroke-width="3" stroke-linecap="round" />
</svg>

<svg class='tabulator-responsive-collapse-toggle-close' viewbox="0 0 24 24">
  <line x1="7" y1="12" x2="17" y2="12"  fill="none" stroke-width="3" stroke-linecap="round" />
</svg>`, l.getElement().classList.add("tabulator-row-handle");
  function n(o) {
    var r = s.element;
    s.open = o, r && (s.open ? (i.classList.add("open"), r.style.display = "") : (i.classList.remove("open"), r.style.display = "none"));
  }
  return i.addEventListener("click", function(o) {
    o.stopImmediatePropagation(), n(!s.open), l.getTable().rowManager.adjustTableSize();
  }), n(s.open), i;
}
var mo = {
  format: {
    formatters: {
      responsiveCollapse: po
    }
  }
};
class ai extends O {
  constructor(e) {
    super(e), this.columns = [], this.hiddenColumns = [], this.mode = "", this.index = 0, this.collapseFormatter = [], this.collapseStartOpen = !0, this.collapseHandleColumn = !1, this.registerTableOption("responsiveLayout", !1), this.registerTableOption("responsiveLayoutCollapseStartOpen", !0), this.registerTableOption("responsiveLayoutCollapseUseFormatters", !0), this.registerTableOption("responsiveLayoutCollapseFormatter", !1), this.registerColumnOption("responsive");
  }
  //generate responsive columns list
  initialize() {
    this.table.options.responsiveLayout && (this.subscribe("column-layout", this.initializeColumn.bind(this)), this.subscribe("column-show", this.updateColumnVisibility.bind(this)), this.subscribe("column-hide", this.updateColumnVisibility.bind(this)), this.subscribe("columns-loaded", this.initializeResponsivity.bind(this)), this.subscribe("column-moved", this.initializeResponsivity.bind(this)), this.subscribe("column-add", this.initializeResponsivity.bind(this)), this.subscribe("column-delete", this.initializeResponsivity.bind(this)), this.subscribe("table-redrawing", this.tableRedraw.bind(this)), this.table.options.responsiveLayout === "collapse" && (this.subscribe("row-data-changed", this.generateCollapsedRowContent.bind(this)), this.subscribe("row-init", this.initializeRow.bind(this)), this.subscribe("row-layout", this.layoutRow.bind(this))));
  }
  tableRedraw(e) {
    ["fitColumns", "fitDataStretch"].indexOf(this.layoutMode()) === -1 && (e || this.update());
  }
  initializeResponsivity() {
    var e = [];
    this.mode = this.table.options.responsiveLayout, this.collapseFormatter = this.table.options.responsiveLayoutCollapseFormatter || this.formatCollapsedData, this.collapseStartOpen = this.table.options.responsiveLayoutCollapseStartOpen, this.hiddenColumns = [], this.collapseFormatter && (this.collapseFormatter = this.collapseFormatter.bind(this.table)), this.table.columnManager.columnsByIndex.forEach((t, i) => {
      t.modules.responsive && t.modules.responsive.order && t.modules.responsive.visible && (t.modules.responsive.index = i, e.push(t), !t.visible && this.mode === "collapse" && this.hiddenColumns.push(t));
    }), e = e.reverse(), e = e.sort((t, i) => {
      var s = i.modules.responsive.order - t.modules.responsive.order;
      return s || i.modules.responsive.index - t.modules.responsive.index;
    }), this.columns = e, this.mode === "collapse" && this.generateCollapsedContent();
    for (let t of this.table.columnManager.columnsByIndex)
      if (t.definition.formatter == "responsiveCollapse") {
        this.collapseHandleColumn = t;
        break;
      }
    this.collapseHandleColumn && (this.hiddenColumns.length ? this.collapseHandleColumn.show() : this.collapseHandleColumn.hide());
  }
  //define layout information
  initializeColumn(e) {
    var t = e.getDefinition();
    e.modules.responsive = { order: typeof t.responsive > "u" ? 1 : t.responsive, visible: t.visible !== !1 };
  }
  initializeRow(e) {
    var t;
    e.type !== "calc" && (t = document.createElement("div"), t.classList.add("tabulator-responsive-collapse"), e.modules.responsiveLayout = {
      element: t,
      open: this.collapseStartOpen
    }, this.collapseStartOpen || (t.style.display = "none"));
  }
  layoutRow(e) {
    var t = e.getElement();
    e.modules.responsiveLayout && (t.appendChild(e.modules.responsiveLayout.element), this.generateCollapsedRowContent(e));
  }
  //update column visibility
  updateColumnVisibility(e, t) {
    !t && e.modules.responsive && (e.modules.responsive.visible = e.visible, this.initializeResponsivity());
  }
  hideColumn(e) {
    var t = this.hiddenColumns.length;
    e.hide(!1, !0), this.mode === "collapse" && (this.hiddenColumns.unshift(e), this.generateCollapsedContent(), this.collapseHandleColumn && !t && this.collapseHandleColumn.show());
  }
  showColumn(e) {
    var t;
    e.show(!1, !0), e.setWidth(e.getWidth()), this.mode === "collapse" && (t = this.hiddenColumns.indexOf(e), t > -1 && this.hiddenColumns.splice(t, 1), this.generateCollapsedContent(), this.collapseHandleColumn && !this.hiddenColumns.length && this.collapseHandleColumn.hide());
  }
  //redraw columns to fit space
  update() {
    for (var e = !0; e; ) {
      let t = this.table.modules.layout.getMode() == "fitColumns" ? this.table.columnManager.getFlexBaseWidth() : this.table.columnManager.getWidth(), i = (this.table.options.headerVisible ? this.table.columnManager.element.clientWidth : this.table.element.clientWidth) - t;
      if (i < 0) {
        let s = this.columns[this.index];
        s ? (this.hideColumn(s), this.index++) : e = !1;
      } else {
        let s = this.columns[this.index - 1];
        s && i > 0 && i >= s.getWidth() ? (this.showColumn(s), this.index--) : e = !1;
      }
      this.table.rowManager.activeRowsCount || this.table.rowManager.renderEmptyScroll();
    }
  }
  generateCollapsedContent() {
    var e = this.table.rowManager.getDisplayRows();
    e.forEach((t) => {
      this.generateCollapsedRowContent(t);
    });
  }
  generateCollapsedRowContent(e) {
    var t, i;
    if (e.modules.responsiveLayout) {
      for (t = e.modules.responsiveLayout.element; t.firstChild; ) t.removeChild(t.firstChild);
      i = this.collapseFormatter(this.generateCollapsedRowData(e)), i && t.appendChild(i), e.calcHeight(!0);
    }
  }
  generateCollapsedRowData(e) {
    var t = e.getData(), i = [], s;
    return this.hiddenColumns.forEach((n) => {
      var o = n.getFieldValue(t);
      if (n.definition.title && n.field)
        if (n.modules.format && this.table.options.responsiveLayoutCollapseUseFormatters) {
          let r = function(a) {
            a();
          };
          s = {
            value: !1,
            data: {},
            getValue: function() {
              return o;
            },
            getData: function() {
              return t;
            },
            getType: function() {
              return "cell";
            },
            getElement: function() {
              return document.createElement("div");
            },
            getRow: function() {
              return e.getComponent();
            },
            getColumn: function() {
              return n.getComponent();
            },
            getTable: () => this.table
          }, i.push({
            field: n.field,
            title: n.definition.title,
            value: n.modules.format.formatter.call(this.table.modules.format, s, n.modules.format.params, r)
          });
        } else
          i.push({
            field: n.field,
            title: n.definition.title,
            value: o
          });
    }), i;
  }
  formatCollapsedData(e) {
    var t = document.createElement("table");
    return e.forEach((i) => {
      var s = document.createElement("tr"), n = document.createElement("td"), o = document.createElement("td"), r, a = document.createElement("strong");
      n.appendChild(a), this.modules.localize.bind("columns|" + i.field, function(h) {
        a.innerHTML = h || i.title;
      }), i.value instanceof Node ? (r = document.createElement("div"), r.appendChild(i.value), o.appendChild(r)) : o.innerHTML = i.value, s.appendChild(n), s.appendChild(o), t.appendChild(s);
    }), Object.keys(e).length ? t : "";
  }
}
x(ai, "moduleName", "responsiveLayout"), x(ai, "moduleExtensions", mo);
function go(l, e, t) {
  var i = document.createElement("input"), s = !1;
  if (i.type = "checkbox", i.setAttribute("aria-label", "Select Row"), this.table.modExists("selectRow", !0))
    if (i.addEventListener("click", (o) => {
      o.stopPropagation();
    }), typeof l.getRow == "function") {
      var n = l.getRow();
      n instanceof Pt ? (i.addEventListener("change", (o) => {
        this.table.options.selectableRowsRangeMode === "click" && s ? s = !1 : n.toggleSelect();
      }), this.table.options.selectableRowsRangeMode === "click" && i.addEventListener("click", (o) => {
        s = !0, this.table.modules.selectRow.handleComplexRowClick(n._row, o);
      }), i.checked = n.isSelected && n.isSelected(), this.table.modules.selectRow.registerRowSelectCheckbox(n, i)) : i = "";
    } else
      i.addEventListener("change", (o) => {
        this.table.modules.selectRow.selectedRows.length ? this.table.deselectRow() : this.table.selectRow(e.rowRange);
      }), this.table.modules.selectRow.registerHeaderSelectCheckbox(i);
  return i;
}
var bo = {
  format: {
    formatters: {
      rowSelection: go
    }
  }
};
class li extends O {
  constructor(e) {
    super(e), this.selecting = !1, this.lastClickedRow = !1, this.selectPrev = [], this.selectedRows = [], this.headerCheckboxElement = null, this.registerTableOption("selectableRows", "highlight"), this.registerTableOption("selectableRowsRangeMode", "drag"), this.registerTableOption("selectableRowsRollingSelection", !0), this.registerTableOption("selectableRowsPersistence", !0), this.registerTableOption("selectableRowsCheck", function(t, i) {
      return !0;
    }), this.registerTableFunction("selectRow", this.selectRows.bind(this)), this.registerTableFunction("deselectRow", this.deselectRows.bind(this)), this.registerTableFunction("toggleSelectRow", this.toggleRow.bind(this)), this.registerTableFunction("getSelectedRows", this.getSelectedRows.bind(this)), this.registerTableFunction("getSelectedData", this.getSelectedData.bind(this)), this.registerComponentFunction("row", "select", this.selectRows.bind(this)), this.registerComponentFunction("row", "deselect", this.deselectRows.bind(this)), this.registerComponentFunction("row", "toggleSelect", this.toggleRow.bind(this)), this.registerComponentFunction("row", "isSelected", this.isRowSelected.bind(this));
  }
  initialize() {
    this.deprecatedOptionsCheck(), this.table.options.selectableRows === "highlight" && this.table.options.selectableRange && (this.table.options.selectableRows = !1), this.table.options.selectableRows !== !1 && (this.subscribe("row-init", this.initializeRow.bind(this)), this.subscribe("row-deleting", this.rowDeleted.bind(this)), this.subscribe("rows-wipe", this.clearSelectionData.bind(this)), this.subscribe("rows-retrieve", this.rowRetrieve.bind(this)), this.table.options.selectableRows && !this.table.options.selectableRowsPersistence && this.subscribe("data-refreshing", this.deselectRows.bind(this)));
  }
  deprecatedOptionsCheck() {
  }
  rowRetrieve(e, t) {
    return e === "selected" ? this.selectedRows : t;
  }
  rowDeleted(e) {
    this._deselectRow(e, !0);
  }
  clearSelectionData(e) {
    var t = this.selectedRows.length;
    this.selecting = !1, this.lastClickedRow = !1, this.selectPrev = [], this.selectedRows = [], t && e !== !0 && this._rowSelectionChanged();
  }
  initializeRow(e) {
    var t = this, i = t.checkRowSelectability(e), s = e.getElement(), n = function() {
      setTimeout(function() {
        t.selecting = !1;
      }, 50), document.body.removeEventListener("mouseup", n);
    };
    e.modules.select = { selected: !1 }, s.classList.toggle("tabulator-selectable", i), s.classList.toggle("tabulator-unselectable", !i), t.checkRowSelectability(e) && t.table.options.selectableRows && t.table.options.selectableRows != "highlight" && (t.table.options.selectableRowsRangeMode === "click" ? s.addEventListener("click", this.handleComplexRowClick.bind(this, e)) : (s.addEventListener("click", function(o) {
      (!t.table.modExists("edit") || !t.table.modules.edit.getCurrentCell()) && t.table._clearSelection(), t.selecting || t.toggleRow(e);
    }), s.addEventListener("mousedown", function(o) {
      if (o.shiftKey)
        return t.table._clearSelection(), t.selecting = !0, t.selectPrev = [], document.body.addEventListener("mouseup", n), document.body.addEventListener("keyup", n), t.toggleRow(e), !1;
    }), s.addEventListener("mouseenter", function(o) {
      t.selecting && (t.table._clearSelection(), t.toggleRow(e), t.selectPrev[1] == e && t.toggleRow(t.selectPrev[0]));
    }), s.addEventListener("mouseout", function(o) {
      t.selecting && (t.table._clearSelection(), t.selectPrev.unshift(e));
    })));
  }
  handleComplexRowClick(e, t) {
    if (t.shiftKey) {
      this.table._clearSelection(), this.lastClickedRow = this.lastClickedRow || e;
      var i = this.table.rowManager.getDisplayRowIndex(this.lastClickedRow), s = this.table.rowManager.getDisplayRowIndex(e), n = i <= s ? i : s, o = i >= s ? i : s, r = this.table.rowManager.getDisplayRows().slice(0), a = r.splice(n, o - n + 1);
      t.ctrlKey || t.metaKey ? (a.forEach((h) => {
        h !== this.lastClickedRow && (this.table.options.selectableRows !== !0 && !this.isRowSelected(e) ? this.selectedRows.length < this.table.options.selectableRows && this.toggleRow(h) : this.toggleRow(h));
      }), this.lastClickedRow = e) : (this.deselectRows(void 0, !0), this.table.options.selectableRows !== !0 && a.length > this.table.options.selectableRows && (a = a.slice(0, this.table.options.selectableRows)), this.selectRows(a)), this.table._clearSelection();
    } else t.ctrlKey || t.metaKey ? (this.toggleRow(e), this.lastClickedRow = e) : (this.deselectRows(void 0, !0), this.selectRows(e), this.lastClickedRow = e);
  }
  checkRowSelectability(e) {
    return e && e.type === "row" ? this.table.options.selectableRowsCheck.call(this.table, e.getComponent()) : !1;
  }
  //toggle row selection
  toggleRow(e) {
    this.checkRowSelectability(e) && (e.modules.select && e.modules.select.selected ? this._deselectRow(e) : this._selectRow(e));
  }
  //select a number of rows
  selectRows(e) {
    var t = [], i, s;
    switch (typeof e) {
      case "undefined":
        i = this.table.rowManager.rows;
        break;
      case "number":
        i = this.table.rowManager.findRow(e);
        break;
      case "string":
        i = this.table.rowManager.findRow(e), i || (i = this.table.rowManager.getRows(e));
        break;
      default:
        i = e;
        break;
    }
    Array.isArray(i) ? i.length && (i.forEach((n) => {
      s = this._selectRow(n, !0, !0), s && t.push(s);
    }), this._rowSelectionChanged(!1, t)) : i && this._selectRow(i, !1, !0);
  }
  //select an individual row
  _selectRow(e, t, i) {
    if (!isNaN(this.table.options.selectableRows) && this.table.options.selectableRows !== !0 && !i && this.selectedRows.length >= this.table.options.selectableRows)
      if (this.table.options.selectableRowsRollingSelection)
        this._deselectRow(this.selectedRows[0]);
      else
        return !1;
    var s = this.table.rowManager.findRow(e);
    if (s) {
      if (this.selectedRows.indexOf(s) == -1)
        return s.getElement().classList.add("tabulator-selected"), s.modules.select || (s.modules.select = {}), s.modules.select.selected = !0, s.modules.select.checkboxEl && (s.modules.select.checkboxEl.checked = !0), this.selectedRows.push(s), this.table.options.dataTreeSelectPropagate && this.childRowSelection(s, !0), this.dispatchExternal("rowSelected", s.getComponent()), this._rowSelectionChanged(t, s), s;
    } else
      t || console.warn("Selection Error - No such row found, ignoring selection:" + e);
  }
  isRowSelected(e) {
    return this.selectedRows.indexOf(e) !== -1;
  }
  //deselect a number of rows
  deselectRows(e, t) {
    var i = [], s, n;
    switch (typeof e) {
      case "undefined":
        s = Object.assign([], this.selectedRows);
        break;
      case "number":
        s = this.table.rowManager.findRow(e);
        break;
      case "string":
        s = this.table.rowManager.findRow(e), s || (s = this.table.rowManager.getRows(e));
        break;
      default:
        s = e;
        break;
    }
    Array.isArray(s) ? s.length && (s.forEach((o) => {
      n = this._deselectRow(o, !0, !0), n && i.push(n);
    }), this._rowSelectionChanged(t, [], i)) : s && this._deselectRow(s, t, !0);
  }
  //deselect an individual row
  _deselectRow(e, t) {
    var i = this, s = i.table.rowManager.findRow(e), n, o;
    if (s) {
      if (n = i.selectedRows.findIndex(function(r) {
        return r == s;
      }), n > -1)
        return o = s.getElement(), o && o.classList.remove("tabulator-selected"), s.modules.select || (s.modules.select = {}), s.modules.select.selected = !1, s.modules.select.checkboxEl && (s.modules.select.checkboxEl.checked = !1), i.selectedRows.splice(n, 1), this.table.options.dataTreeSelectPropagate && this.childRowSelection(s, !1), this.dispatchExternal("rowDeselected", s.getComponent()), i._rowSelectionChanged(t, void 0, s), s;
    } else
      t || console.warn("Deselection Error - No such row found, ignoring selection:" + e);
  }
  getSelectedData() {
    var e = [];
    return this.selectedRows.forEach(function(t) {
      e.push(t.getData());
    }), e;
  }
  getSelectedRows() {
    var e = [];
    return this.selectedRows.forEach(function(t) {
      e.push(t.getComponent());
    }), e;
  }
  _rowSelectionChanged(e, t = [], i = []) {
    this.headerCheckboxElement && (this.selectedRows.length === 0 ? (this.headerCheckboxElement.checked = !1, this.headerCheckboxElement.indeterminate = !1) : this.table.rowManager.rows.length === this.selectedRows.length ? (this.headerCheckboxElement.checked = !0, this.headerCheckboxElement.indeterminate = !1) : (this.headerCheckboxElement.indeterminate = !0, this.headerCheckboxElement.checked = !1)), e || (Array.isArray(t) || (t = [t]), t = t.map((s) => s.getComponent()), Array.isArray(i) || (i = [i]), i = i.map((s) => s.getComponent()), this.dispatchExternal("rowSelectionChanged", this.getSelectedData(), this.getSelectedRows(), t, i));
  }
  registerRowSelectCheckbox(e, t) {
    e._row.modules.select || (e._row.modules.select = {}), e._row.modules.select.checkboxEl = t;
  }
  registerHeaderSelectCheckbox(e) {
    this.headerCheckboxElement = e;
  }
  childRowSelection(e, t) {
    var i = this.table.modules.dataTree.getChildren(e, !0, !0);
    if (t)
      for (let s of i)
        this._selectRow(s, !0);
    else
      for (let s of i)
        this._deselectRow(s, !0);
  }
}
x(li, "moduleName", "selectRow"), x(li, "moduleExtensions", bo);
class vo {
  constructor(e) {
    return this._range = e, new Proxy(this, {
      get: function(t, i, s) {
        return typeof t[i] < "u" ? t[i] : t._range.table.componentFunctionBinder.handle("range", t._range, i);
      }
    });
  }
  getElement() {
    return this._range.element;
  }
  getData() {
    return this._range.getData();
  }
  getCells() {
    return this._range.getCells(!0, !0);
  }
  getStructuredCells() {
    return this._range.getStructuredCells();
  }
  getRows() {
    return this._range.getRows().map((e) => e.getComponent());
  }
  getColumns() {
    return this._range.getColumns().map((e) => e.getComponent());
  }
  getBounds() {
    return this._range.getBounds();
  }
  getTopEdge() {
    return this._range.top;
  }
  getBottomEdge() {
    return this._range.bottom;
  }
  getLeftEdge() {
    return this._range.left;
  }
  getRightEdge() {
    return this._range.right;
  }
  setBounds(e, t) {
    this._range.destroyedGuard("setBounds") && this._range.setBounds(e && e._cell, t && t._cell);
  }
  setStartBound(e) {
    this._range.destroyedGuard("setStartBound") && (this._range.setEndBound(e && e._cell), this._range.rangeManager.layoutElement());
  }
  setEndBound(e) {
    this._range.destroyedGuard("setEndBound") && (this._range.setEndBound(e && e._cell), this._range.rangeManager.layoutElement());
  }
  clearValues() {
    this._range.destroyedGuard("clearValues") && this._range.clearValues();
  }
  remove() {
    this._range.destroyedGuard("remove") && this._range.destroy(!0);
  }
}
class wo extends ne {
  constructor(e, t, i, s) {
    super(e), this.rangeManager = t, this.element = null, this.initialized = !1, this.initializing = {
      start: !1,
      end: !1
    }, this.destroyed = !1, this.top = 0, this.bottom = 0, this.left = 0, this.right = 0, this.table = e, this.start = { row: 0, col: 0 }, this.end = { row: 0, col: 0 }, this.rangeManager.rowHeader && (this.left = 1, this.right = 1, this.start.col = 1, this.end.col = 1), this.initElement(), setTimeout(() => {
      this.initBounds(i, s);
    });
  }
  initElement() {
    this.element = document.createElement("div"), this.element.classList.add("tabulator-range");
  }
  initBounds(e, t) {
    this._updateMinMax(), e && this.setBounds(e, t || e);
  }
  ///////////////////////////////////
  ///////   Boundary Setup    ///////
  ///////////////////////////////////
  setStart(e, t) {
    (this.start.row !== e || this.start.col !== t) && (this.start.row = e, this.start.col = t, this.initializing.start = !0, this._updateMinMax());
  }
  setEnd(e, t) {
    (this.end.row !== e || this.end.col !== t) && (this.end.row = e, this.end.col = t, this.initializing.end = !0, this._updateMinMax());
  }
  setBounds(e, t, i) {
    e && this.setStartBound(e), this.setEndBound(t || e), this.rangeManager.layoutElement(i);
  }
  setStartBound(e) {
    var t, i;
    e.type === "column" ? this.rangeManager.columnSelection && this.setStart(0, e.getPosition() - 1) : (t = e.row.position - 1, i = e.column.getPosition() - 1, e.column === this.rangeManager.rowHeader ? this.setStart(t, 1) : this.setStart(t, i));
  }
  setEndBound(e) {
    var t = this._getTableRows().length, i, s, n;
    e.type === "column" ? this.rangeManager.columnSelection && (this.rangeManager.selecting === "column" ? this.setEnd(t - 1, e.getPosition() - 1) : this.rangeManager.selecting === "cell" && this.setEnd(0, e.getPosition() - 1)) : (i = e.row.position - 1, s = e.column.getPosition() - 1, n = e.column === this.rangeManager.rowHeader, this.rangeManager.selecting === "row" ? this.setEnd(i, this._getTableColumns().length - 1) : this.rangeManager.selecting !== "row" && n ? this.setEnd(i, 0) : this.rangeManager.selecting === "column" ? this.setEnd(t - 1, s) : this.setEnd(i, s));
  }
  _updateMinMax() {
    this.top = Math.min(this.start.row, this.end.row), this.bottom = Math.max(this.start.row, this.end.row), this.left = Math.min(this.start.col, this.end.col), this.right = Math.max(this.start.col, this.end.col), this.initialized ? this.dispatchExternal("rangeChanged", this.getComponent()) : this.initializing.start && this.initializing.end && (this.initialized = !0, this.dispatchExternal("rangeAdded", this.getComponent()));
  }
  _getTableColumns() {
    return this.table.columnManager.getVisibleColumnsByIndex();
  }
  _getTableRows() {
    return this.table.rowManager.getDisplayRows().filter((e) => e.type === "row");
  }
  ///////////////////////////////////
  ///////      Rendering      ///////
  ///////////////////////////////////
  layout() {
    var e = this.table.rowManager.renderer.vDomTop, t = this.table.rowManager.renderer.vDomBottom, i = this.table.columnManager.renderer.leftCol, s = this.table.columnManager.renderer.rightCol, n, o, r, a, h, d, u, c, g, m;
    this.table.options.renderHorizontal === "virtual" && this.rangeManager.rowHeader && (s += 1), e == null && (e = 0), t == null && (t = 1 / 0), i == null && (i = 0), s == null && (s = 1 / 0), this.overlaps(i, e, s, t) && (n = Math.max(this.top, e), o = Math.min(this.bottom, t), r = Math.max(this.left, i), a = Math.min(this.right, s), h = this.rangeManager.getCell(n, r), d = this.rangeManager.getCell(o, a), u = h.getElement(), c = d.getElement(), g = h.row.getElement(), m = d.row.getElement(), this.element.classList.add("tabulator-range-active"), this.table.rtl ? (this.element.style.right = g.offsetWidth - u.offsetLeft - u.offsetWidth + "px", this.element.style.width = u.offsetLeft + u.offsetWidth - c.offsetLeft + "px") : (this.element.style.left = g.offsetLeft + u.offsetLeft + "px", this.element.style.width = c.offsetLeft + c.offsetWidth - u.offsetLeft + "px"), this.element.style.top = g.offsetTop + "px", this.element.style.height = m.offsetTop + m.offsetHeight - g.offsetTop + "px");
  }
  atTopLeft(e) {
    return e.row.position - 1 === this.top && e.column.getPosition() - 1 === this.left;
  }
  atBottomRight(e) {
    return e.row.position - 1 === this.bottom && e.column.getPosition() - 1 === this.right;
  }
  occupies(e) {
    return this.occupiesRow(e.row) && this.occupiesColumn(e.column);
  }
  occupiesRow(e) {
    return this.top <= e.position - 1 && e.position - 1 <= this.bottom;
  }
  occupiesColumn(e) {
    return this.left <= e.getPosition() - 1 && e.getPosition() - 1 <= this.right;
  }
  overlaps(e, t, i, s) {
    return !(this.left > i || e > this.right || this.top > s || t > this.bottom);
  }
  getData() {
    var e = [], t = this.getRows(), i = this.getColumns();
    return t.forEach((s) => {
      var n = s.getData(), o = {};
      i.forEach((r) => {
        o[r.field] = n[r.field];
      }), e.push(o);
    }), e;
  }
  getCells(e, t) {
    var i = [], s = this.getRows(), n = this.getColumns();
    return e ? i = s.map((o) => {
      var r = [];
      return o.getCells().forEach((a) => {
        n.includes(a.column) && r.push(t ? a.getComponent() : a);
      }), r;
    }) : s.forEach((o) => {
      o.getCells().forEach((r) => {
        n.includes(r.column) && i.push(t ? r.getComponent() : r);
      });
    }), i;
  }
  getStructuredCells() {
    return this.getCells(!0, !0);
  }
  getRows() {
    return this._getTableRows().slice(this.top, this.bottom + 1);
  }
  getColumns() {
    return this._getTableColumns().slice(this.left, this.right + 1);
  }
  clearValues() {
    var e = this.getCells(), t = this.table.options.selectableRangeClearCellsValue;
    this.table.blockRedraw(), e.forEach((i) => {
      i.setValue(t);
    }), this.table.restoreRedraw();
  }
  getBounds(e) {
    var t = this.getCells(!1, e), i = {
      start: null,
      end: null
    };
    return t.length ? (i.start = t[0], i.end = t[t.length - 1]) : console.warn("No bounds defined on range"), i;
  }
  getComponent() {
    return this.component || (this.component = new vo(this)), this.component;
  }
  destroy(e) {
    this.destroyed = !0, this.element.remove(), e && this.rangeManager.rangeRemoved(this), this.initialized && this.dispatchExternal("rangeRemoved", this.getComponent());
  }
  destroyedGuard(e) {
    return this.destroyed && console.warn("You cannot call the " + e + " function on a destroyed range"), !this.destroyed;
  }
}
var Co = {
  rangeJumpUp: ["ctrl + 38", "meta + 38"],
  rangeJumpDown: ["ctrl + 40", "meta + 40"],
  rangeJumpLeft: ["ctrl + 37", "meta + 37"],
  rangeJumpRight: ["ctrl + 39", "meta + 39"],
  rangeExpandUp: "shift + 38",
  rangeExpandDown: "shift + 40",
  rangeExpandLeft: "shift + 37",
  rangeExpandRight: "shift + 39",
  rangeExpandJumpUp: ["ctrl + shift + 38", "meta + shift + 38"],
  rangeExpandJumpDown: ["ctrl + shift + 40", "meta + shift + 40"],
  rangeExpandJumpLeft: ["ctrl + shift + 37", "meta + shift + 37"],
  rangeExpandJumpRight: ["ctrl + shift + 39", "meta + shift + 39"]
}, yo = {
  rangeJumpLeft: function(l) {
    this.dispatch("keybinding-nav-range", l, "left", !0, !1);
  },
  rangeJumpRight: function(l) {
    this.dispatch("keybinding-nav-range", l, "right", !0, !1);
  },
  rangeJumpUp: function(l) {
    this.dispatch("keybinding-nav-range", l, "up", !0, !1);
  },
  rangeJumpDown: function(l) {
    this.dispatch("keybinding-nav-range", l, "down", !0, !1);
  },
  rangeExpandLeft: function(l) {
    this.dispatch("keybinding-nav-range", l, "left", !1, !0);
  },
  rangeExpandRight: function(l) {
    this.dispatch("keybinding-nav-range", l, "right", !1, !0);
  },
  rangeExpandUp: function(l) {
    this.dispatch("keybinding-nav-range", l, "up", !1, !0);
  },
  rangeExpandDown: function(l) {
    this.dispatch("keybinding-nav-range", l, "down", !1, !0);
  },
  rangeExpandJumpLeft: function(l) {
    this.dispatch("keybinding-nav-range", l, "left", !0, !0);
  },
  rangeExpandJumpRight: function(l) {
    this.dispatch("keybinding-nav-range", l, "right", !0, !0);
  },
  rangeExpandJumpUp: function(l) {
    this.dispatch("keybinding-nav-range", l, "up", !0, !0);
  },
  rangeExpandJumpDown: function(l) {
    this.dispatch("keybinding-nav-range", l, "down", !0, !0);
  }
}, Eo = {
  range: function(l) {
    var e = [], t = this.table.modules.selectRange.activeRange, i = !1, s, n, o, r, a;
    return a = l.length, t && (s = t.getBounds(), n = s.start, s.start === s.end && (i = !0), n && (e = this.table.rowManager.activeRows.slice(), o = e.indexOf(n.row), i ? r = l.length : r = e.indexOf(s.end.row) - o + 1, o > -1 && (this.table.blockRedraw(), e = e.slice(o, o + r), e.forEach((h, d) => {
      h.updateData(l[d % a]);
    }), this.table.restoreRedraw()))), e;
  }
}, Ro = {
  range: function(l) {
    var e = [], t = [], i = this.table.modules.selectRange.activeRange, s = !1, n, o, r, a, h;
    return i && (n = i.getBounds(), o = n.start, n.start === n.end && (s = !0), o && (l = l.split(`
`), l.forEach(function(d) {
      e.push(d.split("	"));
    }), e.length && (a = this.table.columnManager.getVisibleColumnsByIndex(), h = a.indexOf(o.column), h > -1))) ? (s ? r = e[0].length : r = a.indexOf(n.end.column) - h + 1, a = a.slice(h, h + r), e.forEach((d) => {
      var u = {}, c = d.length;
      a.forEach(function(g, m) {
        u[g.field] = d[m % c];
      }), t.push(u);
    }), t) : !1;
  }
}, xo = {
  range: function() {
    var l = this.modules.selectRange.selectedColumns();
    return this.columnManager.rowHeader && l.unshift(this.columnManager.rowHeader), l;
  }
}, To = {
  range: function() {
    return this.modules.selectRange.selectedRows();
  }
}, ko = {
  keybindings: {
    bindings: Co,
    actions: yo
  },
  clipboard: {
    pasteActions: Eo,
    pasteParsers: Ro
  },
  export: {
    columnLookups: xo,
    rowLookups: To
  }
};
class Ft extends O {
  constructor(e) {
    super(e), this.selecting = "cell", this.mousedown = !1, this.ranges = [], this.overlay = null, this.rowHeader = null, this.layoutChangeTimeout = null, this.columnSelection = !1, this.rowSelection = !1, this.maxRanges = 0, this.activeRange = !1, this.blockKeydown = !1, this.keyDownEvent = this._handleKeyDown.bind(this), this.mouseUpEvent = this._handleMouseUp.bind(this), this.registerTableOption("selectableRange", !1), this.registerTableOption("selectableRangeColumns", !1), this.registerTableOption("selectableRangeRows", !1), this.registerTableOption("selectableRangeClearCells", !1), this.registerTableOption("selectableRangeClearCellsValue", void 0), this.registerTableOption("selectableRangeAutoFocus", !0), this.registerTableFunction("getRangesData", this.getRangesData.bind(this)), this.registerTableFunction("getRanges", this.getRanges.bind(this)), this.registerTableFunction("addRange", this.addRangeFromComponent.bind(this)), this.registerComponentFunction("cell", "getRanges", this.cellGetRanges.bind(this)), this.registerComponentFunction("row", "getRanges", this.rowGetRanges.bind(this)), this.registerComponentFunction("column", "getRanges", this.colGetRanges.bind(this));
  }
  ///////////////////////////////////
  ///////    Initialization   ///////
  ///////////////////////////////////
  initialize() {
    this.options("selectableRange") && (this.options("selectableRows") ? console.warn("SelectRange functionality cannot be used in conjunction with row selection") : (this.maxRanges = this.options("selectableRange"), this.initializeTable(), this.initializeWatchers()), this.options("columns").findIndex((e) => e.frozen) > 0 && console.warn("Having frozen column in arbitrary position with selectRange option may result in unpredictable behavior."), this.options("columns").filter((e) => e.frozen) > 1 && console.warn("Having multiple frozen columns with selectRange option may result in unpredictable behavior."));
  }
  initializeTable() {
    this.overlay = document.createElement("div"), this.overlay.classList.add("tabulator-range-overlay"), this.rangeContainer = document.createElement("div"), this.rangeContainer.classList.add("tabulator-range-container"), this.activeRangeCellElement = document.createElement("div"), this.activeRangeCellElement.classList.add("tabulator-range-cell-active"), this.overlay.appendChild(this.rangeContainer), this.overlay.appendChild(this.activeRangeCellElement), this.table.rowManager.element.addEventListener("keydown", this.keyDownEvent), this.resetRanges(), this.table.rowManager.element.appendChild(this.overlay), this.table.columnManager.element.setAttribute("tabindex", 0), this.table.element.classList.add("tabulator-ranges");
  }
  initializeWatchers() {
    this.columnSelection = this.options("selectableRangeColumns"), this.rowSelection = this.options("selectableRangeRows"), this.subscribe("column-init", this.initializeColumn.bind(this)), this.subscribe("column-mousedown", this.handleColumnMouseDown.bind(this)), this.subscribe("column-mousemove", this.handleColumnMouseMove.bind(this)), this.subscribe("column-resized", this.handleColumnResized.bind(this)), this.subscribe("column-moving", this.handleColumnMoving.bind(this)), this.subscribe("column-moved", this.handleColumnMoved.bind(this)), this.subscribe("column-width", this.layoutChange.bind(this)), this.subscribe("column-height", this.layoutChange.bind(this)), this.subscribe("column-resized", this.layoutChange.bind(this)), this.subscribe("columns-loaded", this.updateHeaderColumn.bind(this)), this.subscribe("cell-height", this.layoutChange.bind(this)), this.subscribe("cell-rendered", this.renderCell.bind(this)), this.subscribe("cell-mousedown", this.handleCellMouseDown.bind(this)), this.subscribe("cell-mousemove", this.handleCellMouseMove.bind(this)), this.subscribe("cell-click", this.handleCellClick.bind(this)), this.subscribe("cell-editing", this.handleEditingCell.bind(this)), this.subscribe("page-changed", this.redraw.bind(this)), this.subscribe("scroll-vertical", this.layoutChange.bind(this)), this.subscribe("scroll-horizontal", this.layoutChange.bind(this)), this.subscribe("data-destroy", this.tableDestroyed.bind(this)), this.subscribe("data-processed", this.resetRanges.bind(this)), this.subscribe("table-layout", this.layoutElement.bind(this)), this.subscribe("table-redraw", this.redraw.bind(this)), this.subscribe("table-destroy", this.tableDestroyed.bind(this)), this.subscribe("edit-editor-clear", this.finishEditingCell.bind(this)), this.subscribe("edit-blur", this.restoreFocus.bind(this)), this.subscribe("keybinding-nav-prev", this.keyNavigate.bind(this, "left")), this.subscribe("keybinding-nav-next", this.keyNavigate.bind(this, "right")), this.subscribe("keybinding-nav-left", this.keyNavigate.bind(this, "left")), this.subscribe("keybinding-nav-right", this.keyNavigate.bind(this, "right")), this.subscribe("keybinding-nav-up", this.keyNavigate.bind(this, "up")), this.subscribe("keybinding-nav-down", this.keyNavigate.bind(this, "down")), this.subscribe("keybinding-nav-range", this.keyNavigateRange.bind(this));
  }
  initializeColumn(e) {
    this.columnSelection && e.definition.headerSort && this.options("headerSortClickElement") !== "icon" && console.warn("Using column headerSort with selectableRangeColumns option may result in unpredictable behavior. Consider using headerSortClickElement: 'icon'."), e.modules.edit;
  }
  updateHeaderColumn() {
    var e;
    this.rowSelection && (this.rowHeader = this.table.columnManager.getVisibleColumnsByIndex()[0], this.rowHeader && (this.rowHeader.definition.cssClass = this.rowHeader.definition.cssClass + " tabulator-range-row-header", this.rowHeader.definition.headerSort && console.warn("Using column headerSort with selectableRangeRows option may result in unpredictable behavior"), this.rowHeader.definition.editor && console.warn("Using column editor with selectableRangeRows option may result in unpredictable behavior"))), this.table.modules.frozenColumns && this.table.modules.frozenColumns.active && (e = this.table.modules.frozenColumns.getFrozenColumns(), (e.length > 1 || e.length === 1 && e[0] !== this.rowHeader) && console.warn("Using frozen columns that are not the range header in combination with the selectRange option may result in unpredictable behavior"));
  }
  ///////////////////////////////////
  ///////   Table Functions   ///////
  ///////////////////////////////////
  getRanges() {
    return this.ranges.map((e) => e.getComponent());
  }
  getRangesData() {
    return this.ranges.map((e) => e.getData());
  }
  addRangeFromComponent(e, t) {
    return e = e ? e._cell : null, t = t ? t._cell : null, this.addRange(e, t);
  }
  ///////////////////////////////////
  /////// Component Functions ///////
  ///////////////////////////////////
  cellGetRanges(e) {
    var t = [];
    return e.column === this.rowHeader ? t = this.ranges.filter((i) => i.occupiesRow(e.row)) : t = this.ranges.filter((i) => i.occupies(e)), t.map((i) => i.getComponent());
  }
  rowGetRanges(e) {
    var t = this.ranges.filter((i) => i.occupiesRow(e));
    return t.map((i) => i.getComponent());
  }
  colGetRanges(e) {
    var t = this.ranges.filter((i) => i.occupiesColumn(e));
    return t.map((i) => i.getComponent());
  }
  ///////////////////////////////////
  ////////// Event Handlers /////////
  ///////////////////////////////////
  _handleMouseUp(e) {
    this.mousedown = !1, document.removeEventListener("mouseup", this.mouseUpEvent);
  }
  _handleKeyDown(e) {
    if (!this.blockKeydown && (!this.table.modules.edit || this.table.modules.edit && !this.table.modules.edit.currentCell)) {
      if (e.key === "Enter") {
        if (this.table.modules.edit && this.table.modules.edit.currentCell)
          return;
        this.table.modules.edit.editCell(this.getActiveCell()), e.preventDefault();
      }
      (e.key === "Backspace" || e.key === "Delete") && this.options("selectableRangeClearCells") && this.activeRange && this.activeRange.clearValues();
    }
  }
  initializeFocus(e) {
    var t;
    this.restoreFocus();
    try {
      document.selection ? (t = document.body.createTextRange(), t.moveToElementText(e.getElement()), t.select()) : window.getSelection && (t = document.createRange(), t.selectNode(e.getElement()), window.getSelection().removeAllRanges(), window.getSelection().addRange(t));
    } catch {
    }
  }
  restoreFocus(e) {
    return this.table.rowManager.element.focus(), !0;
  }
  ///////////////////////////////////
  ////// Column Functionality ///////
  ///////////////////////////////////
  handleColumnResized(e) {
    var t;
    this.selecting !== "column" && this.selecting !== "all" || (t = this.ranges.some((i) => i.occupiesColumn(e)), t && this.ranges.forEach((i) => {
      var s = i.getColumns(!0);
      s.forEach((n) => {
        n !== e && n.setWidth(e.width);
      });
    }));
  }
  handleColumnMoving(e, t) {
    this.resetRanges().setBounds(t), this.overlay.style.visibility = "hidden";
  }
  handleColumnMoved(e, t, i) {
    this.activeRange.setBounds(e), this.layoutElement();
  }
  handleColumnMouseDown(e, t) {
    e.button === 2 && (this.selecting === "column" || this.selecting === "all") && this.activeRange.occupiesColumn(t) || this.table.options.movableColumns && this.selecting === "column" && this.activeRange.occupiesColumn(t) || (this.mousedown = !0, document.addEventListener("mouseup", this.mouseUpEvent), this.newSelection(e, t));
  }
  handleColumnMouseMove(e, t) {
    t === this.rowHeader || !this.mousedown || this.selecting === "all" || this.activeRange.setBounds(!1, t, !0);
  }
  ///////////////////////////////////
  //////// Cell Functionality ///////
  ///////////////////////////////////
  renderCell(e) {
    var t = e.getElement(), i = this.ranges.findIndex((s) => s.occupies(e));
    t.classList.toggle("tabulator-range-selected", i !== -1), t.classList.toggle("tabulator-range-only-cell-selected", this.ranges.length === 1 && this.ranges[0].atTopLeft(e) && this.ranges[0].atBottomRight(e)), t.dataset.range = i;
  }
  handleCellMouseDown(e, t) {
    e.button === 2 && (this.activeRange.occupies(t) || (this.selecting === "row" || this.selecting === "all") && this.activeRange.occupiesRow(t.row)) || (this.mousedown = !0, document.addEventListener("mouseup", this.mouseUpEvent), this.newSelection(e, t));
  }
  handleCellMouseMove(e, t) {
    !this.mousedown || this.selecting === "all" || this.activeRange.setBounds(!1, t, !0);
  }
  handleCellClick(e, t) {
    this.initializeFocus(t);
  }
  handleEditingCell(e) {
    this.activeRange && this.activeRange.setBounds(e);
  }
  finishEditingCell() {
    this.blockKeydown = !0, this.table.rowManager.element.focus(), setTimeout(() => {
      this.blockKeydown = !1;
    }, 10);
  }
  ///////////////////////////////////
  ///////     Navigation      ///////
  ///////////////////////////////////
  keyNavigate(e, t) {
    this.navigate(!1, !1, e), t.preventDefault();
  }
  keyNavigateRange(e, t, i, s) {
    this.navigate(i, s, t), e.preventDefault();
  }
  navigate(e, t, i) {
    var s = !1, n, o, r, a, h, d, u, c, g, m, E;
    if (this.table.modules.edit && this.table.modules.edit.currentCell)
      return !1;
    if (this.ranges.length > 1 && (this.ranges = this.ranges.filter((w) => w === this.activeRange ? (w.setEnd(w.start.row, w.start.col), !0) : (w.destroy(), !1))), n = this.activeRange, r = {
      top: n.top,
      bottom: n.bottom,
      left: n.left,
      right: n.right
    }, o = t ? n.end : n.start, a = o.row, h = o.col, e)
      switch (i) {
        case "left":
          h = this.findJumpCellLeft(n.start.row, o.col);
          break;
        case "right":
          h = this.findJumpCellRight(n.start.row, o.col);
          break;
        case "up":
          a = this.findJumpCellUp(o.row, n.start.col);
          break;
        case "down":
          a = this.findJumpCellDown(o.row, n.start.col);
          break;
      }
    else {
      if (t && (this.selecting === "row" && (i === "left" || i === "right") || this.selecting === "column" && (i === "up" || i === "down")))
        return;
      switch (i) {
        case "left":
          h = Math.max(h - 1, 0);
          break;
        case "right":
          h = Math.min(h + 1, this.getTableColumns().length - 1);
          break;
        case "up":
          a = Math.max(a - 1, 0);
          break;
        case "down":
          a = Math.min(a + 1, this.getTableRows().length - 1);
          break;
      }
    }
    if (this.rowHeader && h === 0 && (h = 1), t || n.setStart(a, h), n.setEnd(a, h), t || (this.selecting = "cell"), s = r.top !== n.top || r.bottom !== n.bottom || r.left !== n.left || r.right !== n.right, s)
      return d = this.getRowByRangePos(n.end.row), u = this.getColumnByRangePos(n.end.col), c = d.getElement().getBoundingClientRect(), m = u.getElement().getBoundingClientRect(), g = this.table.rowManager.getElement().getBoundingClientRect(), E = this.table.columnManager.getElement().getBoundingClientRect(), c.top >= g.top && c.bottom <= g.bottom || (d.getElement().parentNode && u.getElement().parentNode ? this.autoScroll(n, d.getElement(), u.getElement()) : d.getComponent().scrollTo(void 0, !1)), m.left >= E.left + this.getRowHeaderWidth() && m.right <= E.right || (d.getElement().parentNode && u.getElement().parentNode ? this.autoScroll(n, d.getElement(), u.getElement()) : u.getComponent().scrollTo(void 0, !1)), this.layoutElement(), !0;
  }
  rangeRemoved(e) {
    this.ranges = this.ranges.filter((t) => t !== e), this.activeRange === e && (this.ranges.length ? this.activeRange = this.ranges[this.ranges.length - 1] : this.addRange()), this.layoutElement();
  }
  findJumpRow(e, t, i, s, n) {
    return i && (t = t.reverse()), this.findJumpItem(s, n, t, function(o) {
      return o.getData()[e.getField()];
    });
  }
  findJumpCol(e, t, i, s, n) {
    return i && (t = t.reverse()), this.findJumpItem(s, n, t, function(o) {
      return e.getData()[o.getField()];
    });
  }
  findJumpItem(e, t, i, s) {
    var n;
    for (let o of i) {
      let r = s(o);
      if (e) {
        if (n = o, r)
          break;
      } else if (t) {
        if (n = o, r)
          break;
      } else if (r)
        n = o;
      else
        break;
    }
    return n;
  }
  findJumpCellLeft(e, t) {
    var i = this.getRowByRangePos(e), s = this.getTableColumns(), n = this.isEmpty(i.getData()[s[t].getField()]), o = s[t - 1] ? this.isEmpty(i.getData()[s[t - 1].getField()]) : !1, r = this.rowHeader ? s.slice(1, t) : s.slice(0, t), a = this.findJumpCol(i, r, !0, n, o);
    return a ? a.getPosition() - 1 : t;
  }
  findJumpCellRight(e, t) {
    var i = this.getRowByRangePos(e), s = this.getTableColumns(), n = this.isEmpty(i.getData()[s[t].getField()]), o = s[t + 1] ? this.isEmpty(i.getData()[s[t + 1].getField()]) : !1, r = this.findJumpCol(i, s.slice(t + 1, s.length), !1, n, o);
    return r ? r.getPosition() - 1 : t;
  }
  findJumpCellUp(e, t) {
    var i = this.getColumnByRangePos(t), s = this.getTableRows(), n = this.isEmpty(s[e].getData()[i.getField()]), o = s[e - 1] ? this.isEmpty(s[e - 1].getData()[i.getField()]) : !1, r = this.findJumpRow(i, s.slice(0, e), !0, n, o);
    return r ? r.position - 1 : e;
  }
  findJumpCellDown(e, t) {
    var i = this.getColumnByRangePos(t), s = this.getTableRows(), n = this.isEmpty(s[e].getData()[i.getField()]), o = s[e + 1] ? this.isEmpty(s[e + 1].getData()[i.getField()]) : !1, r = this.findJumpRow(i, s.slice(e + 1, s.length), !1, n, o);
    return r ? r.position - 1 : e;
  }
  ///////////////////////////////////
  ///////      Selection      ///////
  ///////////////////////////////////
  newSelection(e, t) {
    var i;
    if (t.type === "column") {
      if (!this.columnSelection)
        return;
      if (t === this.rowHeader) {
        i = this.resetRanges(), this.selecting = "all";
        var s, n = this.getCell(-1, -1);
        this.rowHeader ? s = this.getCell(0, 1) : s = this.getCell(0, 0), i.setBounds(s, n);
        return;
      } else
        this.selecting = "column";
    } else t.column === this.rowHeader ? this.selecting = "row" : this.selecting = "cell";
    e.shiftKey ? this.activeRange.setBounds(!1, t) : e.ctrlKey ? this.addRange().setBounds(t) : this.resetRanges().setBounds(t);
  }
  autoScroll(e, t, i) {
    var s = this.table.rowManager.element, n, o, r, a;
    typeof t > "u" && (t = this.getRowByRangePos(e.end.row).getElement()), typeof i > "u" && (i = this.getColumnByRangePos(e.end.col).getElement()), n = {
      left: i.offsetLeft,
      right: i.offsetLeft + i.offsetWidth,
      top: t.offsetTop,
      bottom: t.offsetTop + t.offsetHeight
    }, o = {
      left: s.scrollLeft + this.getRowHeaderWidth(),
      right: Math.ceil(s.scrollLeft + s.clientWidth),
      top: s.scrollTop,
      bottom: s.scrollTop + s.offsetHeight - this.table.rowManager.scrollbarWidth
    }, r = o.left < n.left && n.left < o.right && o.left < n.right && n.right < o.right, a = o.top < n.top && n.top < o.bottom && o.top < n.bottom && n.bottom < o.bottom, r || (n.left < o.left ? s.scrollLeft = n.left - this.getRowHeaderWidth() : n.right > o.right && (s.scrollLeft = Math.min(n.right - s.clientWidth, n.left - this.getRowHeaderWidth()))), a || (n.top < o.top ? s.scrollTop = n.top : n.bottom > o.bottom && (s.scrollTop = n.bottom - s.clientHeight));
  }
  ///////////////////////////////////
  ///////       Layout        ///////
  ///////////////////////////////////
  layoutChange() {
    this.overlay.style.visibility = "hidden", clearTimeout(this.layoutChangeTimeout), this.layoutChangeTimeout = setTimeout(this.layoutRanges.bind(this), 200);
  }
  redraw(e) {
    e && (this.selecting = "cell", this.resetRanges(), this.layoutElement());
  }
  layoutElement(e) {
    var t;
    e ? t = this.table.rowManager.getVisibleRows(!0) : t = this.table.rowManager.getRows(), t.forEach((i) => {
      i.type === "row" && (this.layoutRow(i), i.cells.forEach((s) => this.renderCell(s)));
    }), this.getTableColumns().forEach((i) => {
      this.layoutColumn(i);
    }), this.layoutRanges();
  }
  layoutRow(e) {
    var t = e.getElement(), i = !1, s = this.ranges.some((n) => n.occupiesRow(e));
    this.selecting === "row" ? i = s : this.selecting === "all" && (i = !0), t.classList.toggle("tabulator-range-selected", i), t.classList.toggle("tabulator-range-highlight", s);
  }
  layoutColumn(e) {
    var t = e.getElement(), i = !1, s = this.ranges.some((n) => n.occupiesColumn(e));
    this.selecting === "column" ? i = s : this.selecting === "all" && (i = !0), t.classList.toggle("tabulator-range-selected", i), t.classList.toggle("tabulator-range-highlight", s);
  }
  layoutRanges() {
    var e, t, i;
    this.table.initialized && (e = this.getActiveCell(), e && (t = e.getElement(), i = e.row.getElement(), this.table.rtl ? this.activeRangeCellElement.style.right = i.offsetWidth - t.offsetLeft - t.offsetWidth + "px" : this.activeRangeCellElement.style.left = i.offsetLeft + t.offsetLeft + "px", this.activeRangeCellElement.style.top = i.offsetTop + "px", this.activeRangeCellElement.style.width = t.offsetWidth + "px", this.activeRangeCellElement.style.height = i.offsetHeight + "px", this.ranges.forEach((s) => s.layout()), this.overlay.style.visibility = "visible"));
  }
  ///////////////////////////////////
  ///////  Helper Functions   ///////
  ///////////////////////////////////	
  getCell(e, t) {
    var i;
    return t < 0 && (t = this.getTableColumns().length + t, t < 0) ? null : (e < 0 && (e = this.getTableRows().length + e), i = this.table.rowManager.getRowFromPosition(e + 1), i ? i.getCells(!1, !0).filter((s) => s.column.visible)[t] : null);
  }
  getActiveCell() {
    return this.getCell(this.activeRange.start.row, this.activeRange.start.col);
  }
  getRowByRangePos(e) {
    return this.getTableRows()[e];
  }
  getColumnByRangePos(e) {
    return this.getTableColumns()[e];
  }
  getTableRows() {
    return this.table.rowManager.getDisplayRows().filter((e) => e.type === "row");
  }
  getTableColumns() {
    return this.table.columnManager.getVisibleColumnsByIndex();
  }
  addRange(e, t) {
    var i;
    return this.maxRanges !== !0 && this.ranges.length >= this.maxRanges && this.ranges.shift().destroy(), i = new wo(this.table, this, e, t), this.activeRange = i, this.ranges.push(i), this.rangeContainer.appendChild(i.element), i;
  }
  resetRanges() {
    var e, t, i;
    return this.ranges.forEach((s) => s.destroy()), this.ranges = [], e = this.addRange(), this.table.rowManager.activeRows.length && (i = this.table.rowManager.activeRows[0].cells.filter((s) => s.column.visible), t = i[this.rowHeader ? 1 : 0], t && (e.setBounds(t), this.options("selectableRangeAutoFocus") && this.initializeFocus(t))), e;
  }
  tableDestroyed() {
    document.removeEventListener("mouseup", this.mouseUpEvent), this.table.rowManager.element.removeEventListener("keydown", this.keyDownEvent);
  }
  selectedRows(e) {
    return e ? this.activeRange.getRows().map((t) => t.getComponent()) : this.activeRange.getRows();
  }
  selectedColumns(e) {
    return e ? this.activeRange.getColumns().map((t) => t.getComponent()) : this.activeRange.getColumns();
  }
  getRowHeaderWidth() {
    return this.rowHeader ? this.rowHeader.getElement().offsetWidth : 0;
  }
  isEmpty(e) {
    return e == null || e === "";
  }
}
x(Ft, "moduleName", "selectRange"), x(Ft, "moduleInitOrder", 1), x(Ft, "moduleExtensions", ko);
function Mo(l, e, t, i, s, n, o) {
  var r = o.alignEmptyValues, a = o.decimalSeparator, h = o.thousandSeparator, d = 0;
  if (l = String(l), e = String(e), h && (l = l.split(h).join(""), e = e.split(h).join("")), a && (l = l.split(a).join("."), e = e.split(a).join(".")), l = parseFloat(l), e = parseFloat(e), isNaN(l))
    d = isNaN(e) ? 0 : -1;
  else if (isNaN(e))
    d = 1;
  else
    return l - e;
  return (r === "top" && n === "desc" || r === "bottom" && n === "asc") && (d *= -1), d;
}
function Lo(l, e, t, i, s, n, o) {
  var r = o.alignEmptyValues, a = 0, h;
  if (!l)
    a = e ? -1 : 0;
  else if (!e)
    a = 1;
  else {
    switch (typeof o.locale) {
      case "boolean":
        o.locale && (h = this.langLocale());
        break;
      case "string":
        h = o.locale;
        break;
    }
    return String(l).toLowerCase().localeCompare(String(e).toLowerCase(), h);
  }
  return (r === "top" && n === "desc" || r === "bottom" && n === "asc") && (a *= -1), a;
}
function yi(l, e, t, i, s, n, o) {
  var r = this.table.dependencyRegistry.lookup(["luxon", "DateTime"], "DateTime"), a = o.format || "dd/MM/yyyy HH:mm:ss", h = o.alignEmptyValues, d = 0;
  if (typeof r < "u") {
    if (r.isDateTime(l) || (a === "iso" ? l = r.fromISO(String(l)) : l = r.fromFormat(String(l), a)), r.isDateTime(e) || (a === "iso" ? e = r.fromISO(String(e)) : e = r.fromFormat(String(e), a)), !l.isValid)
      d = e.isValid ? -1 : 0;
    else if (!e.isValid)
      d = 1;
    else
      return l - e;
    return (h === "top" && n === "desc" || h === "bottom" && n === "asc") && (d *= -1), d;
  } else
    console.error("Sort Error - 'datetime' sorter is dependant on luxon.js");
}
function So(l, e, t, i, s, n, o) {
  return o.format || (o.format = "dd/MM/yyyy"), yi.call(this, l, e, t, i, s, n, o);
}
function Do(l, e, t, i, s, n, o) {
  return o.format || (o.format = "HH:mm"), yi.call(this, l, e, t, i, s, n, o);
}
function _o(l, e, t, i, s, n, o) {
  var r = l === !0 || l === "true" || l === "True" || l === 1 ? 1 : 0, a = e === !0 || e === "true" || e === "True" || e === 1 ? 1 : 0;
  return r - a;
}
function Fo(l, e, t, i, s, n, o) {
  var r = o.type || "length", a = o.alignEmptyValues, h = 0, d = this.table, u;
  o.valueMap && (typeof o.valueMap == "string" ? u = function(g) {
    return g.map((m) => U.retrieveNestedData(d.options.nestedFieldSeparator, o.valueMap, m));
  } : u = o.valueMap);
  function c(g) {
    var m;
    switch (u && (g = u(g)), r) {
      case "length":
        m = g.length;
        break;
      case "sum":
        m = g.reduce(function(E, w) {
          return E + w;
        });
        break;
      case "max":
        m = Math.max.apply(null, g);
        break;
      case "min":
        m = Math.min.apply(null, g);
        break;
      case "avg":
        m = g.reduce(function(E, w) {
          return E + w;
        }) / g.length;
        break;
      case "string":
        m = g.join("");
        break;
    }
    return m;
  }
  if (!Array.isArray(l))
    h = Array.isArray(e) ? -1 : 0;
  else if (!Array.isArray(e))
    h = 1;
  else
    return r === "string" ? String(c(l)).toLowerCase().localeCompare(String(c(e)).toLowerCase()) : c(e) - c(l);
  return (a === "top" && n === "desc" || a === "bottom" && n === "asc") && (h *= -1), h;
}
function zo(l, e, t, i, s, n, o) {
  var r = typeof l > "u" ? 0 : 1, a = typeof e > "u" ? 0 : 1;
  return r - a;
}
function Po(l, e, t, i, s, n, o) {
  var r, a, h, d, u = 0, c, g = /(\d+)|(\D+)/g, m = /\d/, E = o.alignEmptyValues, w = 0;
  if (!l && l !== 0)
    w = !e && e !== 0 ? 0 : -1;
  else if (!e && e !== 0)
    w = 1;
  else {
    if (isFinite(l) && isFinite(e)) return l - e;
    if (r = String(l).toLowerCase(), a = String(e).toLowerCase(), r === a) return 0;
    if (!(m.test(r) && m.test(a))) return r > a ? 1 : -1;
    for (r = r.match(g), a = a.match(g), c = r.length > a.length ? a.length : r.length; u < c; )
      if (h = r[u], d = a[u++], h !== d)
        return isFinite(h) && isFinite(d) ? (h.charAt(0) === "0" && (h = "." + h), d.charAt(0) === "0" && (d = "." + d), h - d) : h > d ? 1 : -1;
    return r.length > a.length;
  }
  return (E === "top" && n === "desc" || E === "bottom" && n === "asc") && (w *= -1), w;
}
var Ho = {
  number: Mo,
  string: Lo,
  date: So,
  time: Do,
  datetime: yi,
  boolean: _o,
  array: Fo,
  exists: zo,
  alphanum: Po
};
const Qe = class Qe extends O {
  constructor(e) {
    super(e), this.sortList = [], this.changed = !1, this.registerTableOption("sortMode", "local"), this.registerTableOption("initialSort", !1), this.registerTableOption("columnHeaderSortMulti", !0), this.registerTableOption("sortOrderReverse", !1), this.registerTableOption("headerSortElement", "<div class='tabulator-arrow'></div>"), this.registerTableOption("headerSortClickElement", "header"), this.registerColumnOption("sorter"), this.registerColumnOption("sorterParams"), this.registerColumnOption("headerSort", !0), this.registerColumnOption("headerSortStartingDir"), this.registerColumnOption("headerSortTristate");
  }
  initialize() {
    this.subscribe("column-layout", this.initializeColumn.bind(this)), this.subscribe("table-built", this.tableBuilt.bind(this)), this.registerDataHandler(this.sort.bind(this), 20), this.registerTableFunction("setSort", this.userSetSort.bind(this)), this.registerTableFunction("getSorters", this.getSort.bind(this)), this.registerTableFunction("clearSort", this.clearSort.bind(this)), this.table.options.sortMode === "remote" && this.subscribe("data-params", this.remoteSortParams.bind(this));
  }
  tableBuilt() {
    this.table.options.initialSort && this.setSort(this.table.options.initialSort);
  }
  remoteSortParams(e, t, i, s) {
    var n = this.getSort();
    return n.forEach((o) => {
      delete o.column;
    }), s.sort = n, s;
  }
  ///////////////////////////////////
  ///////// Table Functions /////////
  ///////////////////////////////////
  userSetSort(e, t) {
    this.setSort(e, t), this.refreshSort();
  }
  clearSort() {
    this.clear(), this.refreshSort();
  }
  ///////////////////////////////////
  ///////// Internal Logic //////////
  ///////////////////////////////////
  //initialize column header for sorting
  initializeColumn(e) {
    var t = !1, i, s;
    switch (typeof e.definition.sorter) {
      case "string":
        Qe.sorters[e.definition.sorter] ? t = Qe.sorters[e.definition.sorter] : console.warn("Sort Error - No such sorter found: ", e.definition.sorter);
        break;
      case "function":
        t = e.definition.sorter;
        break;
    }
    if (e.modules.sort = {
      sorter: t,
      dir: "none",
      params: e.definition.sorterParams || {},
      startingDir: e.definition.headerSortStartingDir || "asc",
      tristate: e.definition.headerSortTristate
    }, e.definition.headerSort !== !1) {
      switch (i = e.getElement(), i.classList.add("tabulator-sortable"), s = document.createElement("div"), s.classList.add("tabulator-col-sorter"), this.table.options.headerSortClickElement) {
        case "icon":
          s.classList.add("tabulator-col-sorter-element");
          break;
        case "header":
          i.classList.add("tabulator-col-sorter-element");
          break;
        default:
          i.classList.add("tabulator-col-sorter-element");
          break;
      }
      switch (this.table.options.headerSortElement) {
        case "function":
          break;
        case "object":
          s.appendChild(this.table.options.headerSortElement);
          break;
        default:
          s.innerHTML = this.table.options.headerSortElement;
      }
      e.titleHolderElement.appendChild(s), e.modules.sort.element = s, this.setColumnHeaderSortIcon(e, "none"), this.table.options.headerSortClickElement === "icon" && s.addEventListener("mousedown", (n) => {
        n.stopPropagation();
      }), (this.table.options.headerSortClickElement === "icon" ? s : i).addEventListener("click", (n) => {
        var o = "", r = [], a = !1;
        if (e.modules.sort) {
          if (e.modules.sort.tristate)
            e.modules.sort.dir == "none" ? o = e.modules.sort.startingDir : e.modules.sort.dir == e.modules.sort.startingDir ? o = e.modules.sort.dir == "asc" ? "desc" : "asc" : o = "none";
          else
            switch (e.modules.sort.dir) {
              case "asc":
                o = "desc";
                break;
              case "desc":
                o = "asc";
                break;
              default:
                o = e.modules.sort.startingDir;
            }
          this.table.options.columnHeaderSortMulti && (n.shiftKey || n.ctrlKey) ? (r = this.getSort(), a = r.findIndex((h) => h.field === e.getField()), a > -1 ? (r[a].dir = o, a = r.splice(a, 1)[0], o != "none" && r.push(a)) : o != "none" && r.push({ column: e, dir: o }), this.setSort(r)) : o == "none" ? this.clear() : this.setSort(e, o), this.refreshSort();
        }
      });
    }
  }
  refreshSort() {
    this.table.options.sortMode === "remote" ? this.reloadData(null, !1, !1) : this.refreshData(!0);
  }
  //check if the sorters have changed since last use
  hasChanged() {
    var e = this.changed;
    return this.changed = !1, e;
  }
  //return current sorters
  getSort() {
    var e = this, t = [];
    return e.sortList.forEach(function(i) {
      i.column && t.push({ column: i.column.getComponent(), field: i.column.getField(), dir: i.dir });
    }), t;
  }
  //change sort list and trigger sort
  setSort(e, t) {
    var i = this, s = [];
    Array.isArray(e) || (e = [{ column: e, dir: t }]), e.forEach(function(n) {
      var o;
      o = i.table.columnManager.findColumn(n.column), o ? (n.column = o, s.push(n), i.changed = !0) : console.warn("Sort Warning - Sort field does not exist and is being ignored: ", n.column);
    }), i.sortList = s, this.dispatch("sort-changed");
  }
  //clear sorters
  clear() {
    this.setSort([]);
  }
  //find appropriate sorter for column
  findSorter(e) {
    var t = this.table.rowManager.activeRows[0], i = "string", s, n;
    if (t && (t = t.getData(), s = e.getField(), s))
      switch (n = e.getFieldValue(t), typeof n) {
        case "undefined":
          i = "string";
          break;
        case "boolean":
          i = "boolean";
          break;
        default:
          !isNaN(n) && n !== "" ? i = "number" : n.match(/((^[0-9]+[a-z]+)|(^[a-z]+[0-9]+))+$/i) && (i = "alphanum");
          break;
      }
    return Qe.sorters[i];
  }
  //work through sort list sorting data
  sort(e, t) {
    var i = this, s = this.table.options.sortOrderReverse ? i.sortList.slice().reverse() : i.sortList, n = [], o = [];
    return this.subscribedExternal("dataSorting") && this.dispatchExternal("dataSorting", i.getSort()), t || i.clearColumnHeaders(), this.table.options.sortMode !== "remote" ? (s.forEach(function(r, a) {
      var h;
      r.column && (h = r.column.modules.sort, h && (h.sorter || (h.sorter = i.findSorter(r.column)), r.params = typeof h.params == "function" ? h.params(r.column.getComponent(), r.dir) : h.params, n.push(r)), t || i.setColumnHeader(r.column, r.dir));
    }), n.length && i._sortItems(e, n)) : t || s.forEach(function(r, a) {
      i.setColumnHeader(r.column, r.dir);
    }), this.subscribedExternal("dataSorted") && (e.forEach((r) => {
      o.push(r.getComponent());
    }), this.dispatchExternal("dataSorted", i.getSort(), o)), e;
  }
  //clear sort arrows on columns
  clearColumnHeaders() {
    this.table.columnManager.getRealColumns().forEach((e) => {
      e.modules.sort && (e.modules.sort.dir = "none", e.getElement().setAttribute("aria-sort", "none"), this.setColumnHeaderSortIcon(e, "none"));
    });
  }
  //set the column header sort direction
  setColumnHeader(e, t) {
    e.modules.sort.dir = t, e.getElement().setAttribute("aria-sort", t === "asc" ? "ascending" : "descending"), this.setColumnHeaderSortIcon(e, t);
  }
  setColumnHeaderSortIcon(e, t) {
    var i = e.modules.sort.element, s;
    if (e.definition.headerSort && typeof this.table.options.headerSortElement == "function") {
      for (; i.firstChild; ) i.removeChild(i.firstChild);
      s = this.table.options.headerSortElement.call(this.table, e.getComponent(), t), typeof s == "object" ? i.appendChild(s) : i.innerHTML = s;
    }
  }
  //sort each item in sort list
  _sortItems(e, t) {
    var i = t.length - 1;
    e.sort((s, n) => {
      for (var o, r = i; r >= 0; r--) {
        let a = t[r];
        if (o = this._sortRow(s, n, a.column, a.dir, a.params), o !== 0)
          break;
      }
      return o;
    });
  }
  //process individual rows for a sort function on active data
  _sortRow(e, t, i, s, n) {
    var o, r, a = s == "asc" ? e : t, h = s == "asc" ? t : e;
    return e = i.getFieldValue(a.getData()), t = i.getFieldValue(h.getData()), e = typeof e < "u" ? e : "", t = typeof t < "u" ? t : "", o = a.getComponent(), r = h.getComponent(), i.modules.sort.sorter.call(this, e, t, o, r, i.getComponent(), s, n);
  }
};
x(Qe, "moduleName", "sort"), //load defaults
x(Qe, "sorters", Ho);
let hi = Qe;
class Ao {
  constructor(e, t) {
    this.columnCount = e, this.rowCount = t, this.columnString = [], this.columns = [], this.rows = [];
  }
  genColumns(e) {
    var t = Math.max(this.columnCount, Math.max(...e.map((i) => i.length)));
    this.columnString = [], this.columns = [];
    for (let i = 1; i <= t; i++)
      this.incrementChar(this.columnString.length - 1), this.columns.push(this.columnString.join(""));
    return this.columns;
  }
  genRows(e) {
    var t = Math.max(this.rowCount, e.length);
    this.rows = [];
    for (let i = 1; i <= t; i++)
      this.rows.push(i);
    return this.rows;
  }
  incrementChar(e) {
    let t = this.columnString[e];
    t ? t !== "Z" ? this.columnString[e] = String.fromCharCode(this.columnString[e].charCodeAt(0) + 1) : (this.columnString[e] = "A", e ? this.incrementChar(e - 1) : this.columnString.push("A")) : this.columnString.push("A");
  }
  setRowCount(e) {
    this.rowCount = e;
  }
  setColumnCount(e) {
    this.columnCount = e;
  }
}
class es {
  constructor(e) {
    return this._sheet = e, new Proxy(this, {
      get: function(t, i, s) {
        return typeof t[i] < "u" ? t[i] : t._sheet.table.componentFunctionBinder.handle("sheet", t._sheet, i);
      }
    });
  }
  getTitle() {
    return this._sheet.title;
  }
  getKey() {
    return this._sheet.key;
  }
  getDefinition() {
    return this._sheet.getDefinition();
  }
  getData() {
    return this._sheet.getData();
  }
  setData(e) {
    return this._sheet.setData(e);
  }
  clear() {
    return this._sheet.clear();
  }
  remove() {
    return this._sheet.remove();
  }
  active() {
    return this._sheet.active();
  }
  setTitle(e) {
    return this._sheet.setTitle(e);
  }
  setRows(e) {
    return this._sheet.setRows(e);
  }
  setColumns(e) {
    return this._sheet.setColumns(e);
  }
}
class _i extends ne {
  constructor(e, t) {
    super(e.table), this.spreadsheetManager = e, this.definition = t, this.title = this.definition.title || "", this.key = this.definition.key || this.definition.title, this.rowCount = this.definition.rows, this.columnCount = this.definition.columns, this.data = this.definition.data || [], this.element = null, this.isActive = !1, this.grid = new Ao(this.columnCount, this.rowCount), this.defaultColumnDefinition = { width: 100, headerHozAlign: "center", headerSort: !1 }, this.columnDefinition = Object.assign(this.defaultColumnDefinition, this.options("spreadsheetColumnDefinition")), this.columnDefs = [], this.rowDefs = [], this.columnFields = [], this.columns = [], this.rows = [], this.scrollTop = null, this.scrollLeft = null, this.initialize(), this.dispatchExternal("sheetAdded", this.getComponent());
  }
  ///////////////////////////////////
  ///////// Initialization //////////
  ///////////////////////////////////
  initialize() {
    this.initializeElement(), this.initializeColumns(), this.initializeRows();
  }
  reinitialize() {
    this.initializeColumns(), this.initializeRows();
  }
  initializeElement() {
    this.element = document.createElement("div"), this.element.classList.add("tabulator-spreadsheet-tab"), this.element.innerText = this.title, this.element.addEventListener("click", () => {
      this.spreadsheetManager.loadSheet(this);
    });
  }
  initializeColumns() {
    this.grid.setColumnCount(this.columnCount), this.columnFields = this.grid.genColumns(this.data), this.columnDefs = [], this.columnFields.forEach((e) => {
      var t = Object.assign({}, this.columnDefinition);
      t.field = e, t.title = e, this.columnDefs.push(t);
    });
  }
  initializeRows() {
    var e;
    this.grid.setRowCount(this.rowCount), e = this.grid.genRows(this.data), this.rowDefs = [], e.forEach((t, i) => {
      var s = { _id: t }, n = this.data[i];
      n && n.forEach((o, r) => {
        var a = this.columnFields[r];
        a && (s[a] = o);
      }), this.rowDefs.push(s);
    });
  }
  unload() {
    this.isActive = !1, this.scrollTop = this.table.rowManager.scrollTop, this.scrollLeft = this.table.rowManager.scrollLeft, this.data = this.getData(!0), this.element.classList.remove("tabulator-spreadsheet-tab-active");
  }
  load() {
    var e = !this.isActive;
    this.isActive = !0, this.table.blockRedraw(), this.table.setData([]), this.table.setColumns(this.columnDefs), this.table.setData(this.rowDefs), this.table.restoreRedraw(), e && this.scrollTop !== null && (this.table.rowManager.element.scrollLeft = this.scrollLeft, this.table.rowManager.element.scrollTop = this.scrollTop), this.element.classList.add("tabulator-spreadsheet-tab-active"), this.dispatchExternal("sheetLoaded", this.getComponent());
  }
  ///////////////////////////////////
  //////// Helper Functions /////////
  ///////////////////////////////////
  getComponent() {
    return new es(this);
  }
  getDefinition() {
    return {
      title: this.title,
      key: this.key,
      rows: this.rowCount,
      columns: this.columnCount,
      data: this.getData()
    };
  }
  getData(e) {
    var t = [], i, s, n;
    return this.rowDefs.forEach((o) => {
      var r = [];
      this.columnFields.forEach((a) => {
        r.push(o[a]);
      }), t.push(r);
    }), !e && !this.options("spreadsheetOutputFull") && (i = t.map((o) => o.findLastIndex((r) => typeof r < "u") + 1), s = Math.max(...i), n = i.findLastIndex((o) => o > 0) + 1, t = t.slice(0, n), t = t.map((o) => o.slice(0, s))), t;
  }
  setData(e) {
    this.data = e, this.reinitialize(), this.dispatchExternal("sheetUpdated", this.getComponent()), this.isActive && this.load();
  }
  clear() {
    this.setData([]);
  }
  setTitle(e) {
    this.title = e, this.element.innerText = e, this.dispatchExternal("sheetUpdated", this.getComponent());
  }
  setRows(e) {
    this.rowCount = e, this.initializeRows(), this.dispatchExternal("sheetUpdated", this.getComponent()), this.isActive && this.load();
  }
  setColumns(e) {
    this.columnCount = e, this.reinitialize(), this.dispatchExternal("sheetUpdated", this.getComponent()), this.isActive && this.load();
  }
  remove() {
    this.spreadsheetManager.removeSheet(this);
  }
  destroy() {
    this.element.parentNode && this.element.parentNode.removeChild(this.element), this.dispatchExternal("sheetRemoved", this.getComponent());
  }
  active() {
    this.spreadsheetManager.loadSheet(this);
  }
}
class ts extends O {
  constructor(e) {
    super(e), this.sheets = [], this.element = null, this.registerTableOption("spreadsheet", !1), this.registerTableOption("spreadsheetRows", 50), this.registerTableOption("spreadsheetColumns", 50), this.registerTableOption("spreadsheetColumnDefinition", {}), this.registerTableOption("spreadsheetOutputFull", !1), this.registerTableOption("spreadsheetData", !1), this.registerTableOption("spreadsheetSheets", !1), this.registerTableOption("spreadsheetSheetTabs", !1), this.registerTableOption("spreadsheetSheetTabsElement", !1), this.registerTableFunction("setSheets", this.setSheets.bind(this)), this.registerTableFunction("addSheet", this.addSheet.bind(this)), this.registerTableFunction("getSheets", this.getSheets.bind(this)), this.registerTableFunction("getSheetDefinitions", this.getSheetDefinitions.bind(this)), this.registerTableFunction("setSheetData", this.setSheetData.bind(this)), this.registerTableFunction("getSheet", this.getSheet.bind(this)), this.registerTableFunction("getSheetData", this.getSheetData.bind(this)), this.registerTableFunction("clearSheet", this.clearSheet.bind(this)), this.registerTableFunction("removeSheet", this.removeSheetFunc.bind(this)), this.registerTableFunction("activeSheet", this.activeSheetFunc.bind(this));
  }
  ///////////////////////////////////
  ////// Module Initialization //////
  ///////////////////////////////////
  initialize() {
    this.options("spreadsheet") && (this.subscribe("table-initialized", this.tableInitialized.bind(this)), this.subscribe("data-loaded", this.loadRemoteData.bind(this)), this.table.options.index = "_id", this.options("spreadsheetData") && this.options("spreadsheetSheets") && (console.warn("You cannot use spreadsheetData and spreadsheetSheets at the same time, ignoring spreadsheetData"), this.table.options.spreadsheetData = !1), this.compatibilityCheck(), this.options("spreadsheetSheetTabs") && this.initializeTabset());
  }
  compatibilityCheck() {
    this.options("data") && console.warn("Do not use the data option when working with spreadsheets, use either spreadsheetData or spreadsheetSheets to pass data into the table"), this.options("pagination") && console.warn("The spreadsheet module is not compatible with the pagination module"), this.options("groupBy") && console.warn("The spreadsheet module is not compatible with the row grouping module"), this.options("responsiveCollapse") && console.warn("The spreadsheet module is not compatible with the responsive collapse module");
  }
  initializeTabset() {
    this.element = document.createElement("div"), this.element.classList.add("tabulator-spreadsheet-tabs");
    var e = this.options("spreadsheetSheetTabsElement");
    e && !(e instanceof HTMLElement) && (e = document.querySelector(e), e || console.warn("Unable to find element matching spreadsheetSheetTabsElement selector:", this.options("spreadsheetSheetTabsElement"))), e ? e.appendChild(this.element) : this.footerAppend(this.element);
  }
  tableInitialized() {
    this.sheets.length ? this.loadSheet(this.sheets[0]) : this.options("spreadsheetSheets") ? this.loadSheets(this.options("spreadsheetSheets")) : this.options("spreadsheetData") && this.loadData(this.options("spreadsheetData"));
  }
  ///////////////////////////////////
  /////////// Ajax Parsing //////////
  ///////////////////////////////////
  loadRemoteData(e, t, i) {
    return console.log("data", e, t, i), Array.isArray(e) ? (this.table.dataLoader.clearAlert(), this.dispatchExternal("dataLoaded", e), !e.length || Array.isArray(e[0]) ? this.loadData(e) : this.loadSheets(e)) : console.error(`Spreadsheet Loading Error - Unable to process remote data due to invalid data type 
Expecting: array 
Received: `, typeof e, `
Data:     `, e), !1;
  }
  ///////////////////////////////////
  ///////// Sheet Management ////////
  ///////////////////////////////////
  loadData(e) {
    var t = {
      data: e
    };
    this.loadSheet(this.newSheet(t));
  }
  destroySheets() {
    this.sheets.forEach((e) => {
      e.destroy();
    }), this.sheets = [], this.activeSheet = null;
  }
  loadSheets(e) {
    Array.isArray(e) || (e = []), this.destroySheets(), e.forEach((t) => {
      this.newSheet(t);
    }), this.loadSheet(this.sheets[0]);
  }
  loadSheet(e) {
    this.activeSheet !== e && (this.activeSheet && this.activeSheet.unload(), this.activeSheet = e, e.load());
  }
  newSheet(e = {}) {
    var t;
    return e.rows || (e.rows = this.options("spreadsheetRows")), e.columns || (e.columns = this.options("spreadsheetColumns")), t = new _i(this, e), this.sheets.push(t), this.element && this.element.appendChild(t.element), t;
  }
  removeSheet(e) {
    var t = this.sheets.indexOf(e), i;
    this.sheets.length > 1 ? t > -1 && (this.sheets.splice(t, 1), e.destroy(), this.activeSheet === e && (i = this.sheets[t - 1] || this.sheets[0], i ? this.loadSheet(i) : this.activeSheet = null)) : console.warn("Unable to remove sheet, at least one sheet must be active");
  }
  lookupSheet(e) {
    return e ? e instanceof _i ? e : e instanceof es ? e._sheet : this.sheets.find((t) => t.key === e) || !1 : this.activeSheet;
  }
  ///////////////////////////////////
  //////// Public Functions /////////
  ///////////////////////////////////
  setSheets(e) {
    return this.loadSheets(e), this.getSheets();
  }
  addSheet(e) {
    return this.newSheet(e).getComponent();
  }
  getSheetDefinitions() {
    return this.sheets.map((e) => e.getDefinition());
  }
  getSheets() {
    return this.sheets.map((e) => e.getComponent());
  }
  getSheet(e) {
    var t = this.lookupSheet(e);
    return t ? t.getComponent() : !1;
  }
  setSheetData(e, t) {
    e && !t && (t = e, e = !1);
    var i = this.lookupSheet(e);
    return i ? i.setData(t) : !1;
  }
  getSheetData(e) {
    var t = this.lookupSheet(e);
    return t ? t.getData() : !1;
  }
  clearSheet(e) {
    var t = this.lookupSheet(e);
    return t ? t.clear() : !1;
  }
  removeSheetFunc(e) {
    var t = this.lookupSheet(e);
    t && this.removeSheet(t);
  }
  activeSheetFunc(e) {
    var t = this.lookupSheet(e);
    return t ? this.loadSheet(t) : !1;
  }
}
x(ts, "moduleName", "spreadsheet");
class is extends O {
  constructor(e) {
    super(e), this.tooltipSubscriber = null, this.headerSubscriber = null, this.timeout = null, this.popupInstance = null, this.registerTableOption("tooltipDelay", 300), this.registerColumnOption("tooltip"), this.registerColumnOption("headerTooltip");
  }
  initialize() {
    this.deprecatedOptionsCheck(), this.subscribe("column-init", this.initializeColumn.bind(this));
  }
  deprecatedOptionsCheck() {
  }
  initializeColumn(e) {
    e.definition.headerTooltip && !this.headerSubscriber && (this.headerSubscriber = !0, this.subscribe("column-mousemove", this.mousemoveCheck.bind(this, "headerTooltip")), this.subscribe("column-mouseout", this.mouseoutCheck.bind(this, "headerTooltip"))), e.definition.tooltip && !this.tooltipSubscriber && (this.tooltipSubscriber = !0, this.subscribe("cell-mousemove", this.mousemoveCheck.bind(this, "tooltip")), this.subscribe("cell-mouseout", this.mouseoutCheck.bind(this, "tooltip")));
  }
  mousemoveCheck(e, t, i) {
    var s = e === "tooltip" ? i.column.definition.tooltip : i.definition.headerTooltip;
    s && (this.clearPopup(), this.timeout = setTimeout(this.loadTooltip.bind(this, t, i, s), this.table.options.tooltipDelay));
  }
  mouseoutCheck(e, t, i) {
    this.popupInstance || this.clearPopup();
  }
  clearPopup(e, t, i) {
    clearTimeout(this.timeout), this.timeout = null, this.popupInstance && this.popupInstance.hide();
  }
  loadTooltip(e, t, i) {
    var s, n, o;
    function r(a) {
      n = a;
    }
    typeof i == "function" && (i = i(e, t.getComponent(), r)), i instanceof HTMLElement ? s = i : (s = document.createElement("div"), i === !0 && (t instanceof kt ? i = t.value : t.definition.field ? this.langBind("columns|" + t.definition.field, (a) => {
      s.innerHTML = i = a || t.definition.title;
    }) : i = t.definition.title), s.innerHTML = i), (i || i === 0 || i === !1) && (s.classList.add("tabulator-tooltip"), s.addEventListener("mousemove", (a) => a.preventDefault()), this.popupInstance = this.popup(s), typeof n == "function" && this.popupInstance.renderCallback(n), o = this.popupInstance.containerEventCoords(e), this.popupInstance.show(o.x + 15, o.y + 15).hideOnBlur(() => {
      this.dispatchExternal("TooltipClosed", t.getComponent()), this.popupInstance = null;
    }), this.dispatchExternal("TooltipOpened", t.getComponent()));
  }
}
x(is, "moduleName", "tooltip");
var Oo = {
  //is integer
  integer: function(l, e, t) {
    return e === "" || e === null || typeof e > "u" ? !0 : (e = Number(e), !isNaN(e) && isFinite(e) && Math.floor(e) === e);
  },
  //is float
  float: function(l, e, t) {
    return e === "" || e === null || typeof e > "u" ? !0 : (e = Number(e), !isNaN(e) && isFinite(e) && e % 1 !== 0);
  },
  //must be a number
  numeric: function(l, e, t) {
    return e === "" || e === null || typeof e > "u" ? !0 : !isNaN(e);
  },
  //must be a string
  string: function(l, e, t) {
    return e === "" || e === null || typeof e > "u" ? !0 : isNaN(e);
  },
  //must be alphanumeric
  alphanumeric: function(l, e, t) {
    if (e === "" || e === null || typeof e > "u")
      return !0;
    var i = new RegExp(/^[a-z0-9]+$/i);
    return i.test(e);
  },
  //maximum value
  max: function(l, e, t) {
    return e === "" || e === null || typeof e > "u" ? !0 : parseFloat(e) <= t;
  },
  //minimum value
  min: function(l, e, t) {
    return e === "" || e === null || typeof e > "u" ? !0 : parseFloat(e) >= t;
  },
  //starts with  value
  starts: function(l, e, t) {
    return e === "" || e === null || typeof e > "u" ? !0 : String(e).toLowerCase().startsWith(String(t).toLowerCase());
  },
  //ends with  value
  ends: function(l, e, t) {
    return e === "" || e === null || typeof e > "u" ? !0 : String(e).toLowerCase().endsWith(String(t).toLowerCase());
  },
  //minimum string length
  minLength: function(l, e, t) {
    return e === "" || e === null || typeof e > "u" ? !0 : String(e).length >= t;
  },
  //maximum string length
  maxLength: function(l, e, t) {
    return e === "" || e === null || typeof e > "u" ? !0 : String(e).length <= t;
  },
  //in provided value list
  in: function(l, e, t) {
    return e === "" || e === null || typeof e > "u" ? !0 : (typeof t == "string" && (t = t.split("|")), t.indexOf(e) > -1);
  },
  //must match provided regex
  regex: function(l, e, t) {
    if (e === "" || e === null || typeof e > "u")
      return !0;
    var i = new RegExp(t);
    return i.test(e);
  },
  //value must be unique in this column
  unique: function(l, e, t) {
    if (e === "" || e === null || typeof e > "u")
      return !0;
    var i = !0, s = l.getData(), n = l.getColumn()._getSelf();
    return this.table.rowManager.rows.forEach(function(o) {
      var r = o.getData();
      r !== s && e == n.getFieldValue(r) && (i = !1);
    }), i;
  },
  //must have a value
  required: function(l, e, t) {
    return e !== "" && e !== null && typeof e < "u";
  }
};
const Rt = class Rt extends O {
  constructor(e) {
    super(e), this.invalidCells = [], this.registerTableOption("validationMode", "blocking"), this.registerColumnOption("validator"), this.registerTableFunction("getInvalidCells", this.getInvalidCells.bind(this)), this.registerTableFunction("clearCellValidation", this.userClearCellValidation.bind(this)), this.registerTableFunction("validate", this.userValidate.bind(this)), this.registerComponentFunction("cell", "isValid", this.cellIsValid.bind(this)), this.registerComponentFunction("cell", "clearValidation", this.clearValidation.bind(this)), this.registerComponentFunction("cell", "validate", this.cellValidate.bind(this)), this.registerComponentFunction("column", "validate", this.columnValidate.bind(this)), this.registerComponentFunction("row", "validate", this.rowValidate.bind(this));
  }
  initialize() {
    this.subscribe("cell-delete", this.clearValidation.bind(this)), this.subscribe("column-layout", this.initializeColumnCheck.bind(this)), this.subscribe("edit-success", this.editValidate.bind(this)), this.subscribe("edit-editor-clear", this.editorClear.bind(this)), this.subscribe("edit-edited-clear", this.editedClear.bind(this));
  }
  ///////////////////////////////////
  ///////// Event Handling //////////
  ///////////////////////////////////
  editValidate(e, t, i) {
    var s = this.table.options.validationMode !== "manual" ? this.validate(e.column.modules.validate, e, t) : !0;
    return s !== !0 && setTimeout(() => {
      e.getElement().classList.add("tabulator-validation-fail"), this.dispatchExternal("validationFailed", e.getComponent(), t, s);
    }), s;
  }
  editorClear(e, t) {
    t && e.column.modules.validate && this.cellValidate(e), e.getElement().classList.remove("tabulator-validation-fail");
  }
  editedClear(e) {
    e.modules.validate && (e.modules.validate.invalid = !1);
  }
  ///////////////////////////////////
  ////////// Cell Functions /////////
  ///////////////////////////////////
  cellIsValid(e) {
    return e.modules.validate && e.modules.validate.invalid || !0;
  }
  cellValidate(e) {
    return this.validate(e.column.modules.validate, e, e.getValue());
  }
  ///////////////////////////////////
  ///////// Column Functions ////////
  ///////////////////////////////////
  columnValidate(e) {
    var t = [];
    return e.cells.forEach((i) => {
      this.cellValidate(i) !== !0 && t.push(i.getComponent());
    }), t.length ? t : !0;
  }
  ///////////////////////////////////
  ////////// Row Functions //////////
  ///////////////////////////////////
  rowValidate(e) {
    var t = [];
    return e.cells.forEach((i) => {
      this.cellValidate(i) !== !0 && t.push(i.getComponent());
    }), t.length ? t : !0;
  }
  ///////////////////////////////////
  ///////// Table Functions /////////
  ///////////////////////////////////
  userClearCellValidation(e) {
    e || (e = this.getInvalidCells()), Array.isArray(e) || (e = [e]), e.forEach((t) => {
      this.clearValidation(t._getSelf());
    });
  }
  userValidate(e) {
    var t = [];
    return this.table.rowManager.rows.forEach((i) => {
      i = i.getComponent();
      var s = i.validate();
      s !== !0 && (t = t.concat(s));
    }), t.length ? t : !0;
  }
  ///////////////////////////////////
  ///////// Internal Logic //////////
  ///////////////////////////////////
  initializeColumnCheck(e) {
    typeof e.definition.validator < "u" && this.initializeColumn(e);
  }
  //validate
  initializeColumn(e) {
    var t = this, i = [], s;
    e.definition.validator && (Array.isArray(e.definition.validator) ? e.definition.validator.forEach((n) => {
      s = t._extractValidator(n), s && i.push(s);
    }) : (s = this._extractValidator(e.definition.validator), s && i.push(s)), e.modules.validate = i.length ? i : !1);
  }
  _extractValidator(e) {
    var t, i, s;
    switch (typeof e) {
      case "string":
        return s = e.indexOf(":"), s > -1 ? (t = e.substring(0, s), i = e.substring(s + 1)) : t = e, this._buildValidator(t, i);
      case "function":
        return this._buildValidator(e);
      case "object":
        return this._buildValidator(e.type, e.parameters);
    }
  }
  _buildValidator(e, t) {
    var i = typeof e == "function" ? e : Rt.validators[e];
    return i ? {
      type: typeof e == "function" ? "function" : e,
      func: i,
      params: t
    } : (console.warn("Validator Setup Error - No matching validator found:", e), !1);
  }
  validate(e, t, i) {
    var s = this, n = [], o = this.invalidCells.indexOf(t);
    return e && e.forEach((r) => {
      r.func.call(s, t.getComponent(), i, r.params) || n.push({
        type: r.type,
        parameters: r.params
      });
    }), t.modules.validate || (t.modules.validate = {}), n.length ? (t.modules.validate.invalid = n, this.table.options.validationMode !== "manual" && t.getElement().classList.add("tabulator-validation-fail"), o == -1 && this.invalidCells.push(t)) : (t.modules.validate.invalid = !1, t.getElement().classList.remove("tabulator-validation-fail"), o > -1 && this.invalidCells.splice(o, 1)), n.length ? n : !0;
  }
  getInvalidCells() {
    var e = [];
    return this.invalidCells.forEach((t) => {
      e.push(t.getComponent());
    }), e;
  }
  clearValidation(e) {
    var t;
    e.modules.validate && e.modules.validate.invalid && (e.getElement().classList.remove("tabulator-validation-fail"), e.modules.validate.invalid = !1, t = this.invalidCells.indexOf(e), t > -1 && this.invalidCells.splice(t, 1));
  }
};
x(Rt, "moduleName", "validate"), //load defaults
x(Rt, "validators", Oo);
let di = Rt;
var Wt = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  AccessorModule: Gt,
  AjaxModule: Ut,
  ClipboardModule: qt,
  ColumnCalcsModule: Kt,
  DataTreeModule: Vi,
  DownloadModule: Xt,
  EditModule: Jt,
  ExportModule: Yt,
  FilterModule: Qt,
  FormatModule: Zt,
  FrozenColumnsModule: Ii,
  FrozenRowsModule: Wi,
  GroupRowsModule: Gi,
  HistoryModule: ei,
  HtmlTableImportModule: $i,
  ImportModule: ti,
  InteractionModule: ji,
  KeybindingsModule: ii,
  MenuModule: Ui,
  MoveColumnsModule: qi,
  MoveRowsModule: si,
  MutatorModule: ni,
  PageModule: oi,
  PersistenceModule: ri,
  PopupModule: Ki,
  PrintModule: Xi,
  ReactiveDataModule: Ji,
  ResizeColumnsModule: Yi,
  ResizeRowsModule: Qi,
  ResizeTableModule: Zi,
  ResponsiveLayoutModule: ai,
  SelectRangeModule: Ft,
  SelectRowModule: li,
  SortModule: hi,
  SpreadsheetModule: ts,
  TooltipModule: is,
  ValidateModule: di
}), Bo = {
  debugEventsExternal: !1,
  //flag to console log events
  debugEventsInternal: !1,
  //flag to console log events
  debugInvalidOptions: !0,
  //allow toggling of invalid option warnings
  debugInvalidComponentFuncs: !0,
  //allow toggling of invalid component warnings
  debugInitialization: !0,
  //allow toggling of pre initialization function call warnings
  debugDeprecation: !0,
  //allow toggling of deprecation warnings
  height: !1,
  //height of tabulator
  minHeight: !1,
  //minimum height of tabulator
  maxHeight: !1,
  //maximum height of tabulator
  columnHeaderVertAlign: "top",
  //vertical alignment of column headers
  popupContainer: !1,
  columns: [],
  //store for colum header info
  columnDefaults: {},
  //store column default props
  rowHeader: !1,
  data: !1,
  //default starting data
  autoColumns: !1,
  //build columns from data row structure
  autoColumnsDefinitions: !1,
  nestedFieldSeparator: ".",
  //separator for nested data
  footerElement: !1,
  //hold footer element
  index: "id",
  //filed for row index
  textDirection: "auto",
  addRowPos: "bottom",
  //position to insert blank rows, top|bottom
  headerVisible: !0,
  //hide header
  renderVertical: "virtual",
  renderHorizontal: "basic",
  renderVerticalBuffer: 0,
  // set virtual DOM buffer size
  scrollToRowPosition: "top",
  scrollToRowIfVisible: !0,
  scrollToColumnPosition: "left",
  scrollToColumnIfVisible: !0,
  rowFormatter: !1,
  rowFormatterPrint: null,
  rowFormatterClipboard: null,
  rowFormatterHtmlOutput: null,
  rowHeight: null,
  placeholder: !1,
  dataLoader: !0,
  dataLoaderLoading: !1,
  dataLoaderError: !1,
  dataLoaderErrorTimeout: 3e3,
  dataSendParams: {},
  dataReceiveParams: {},
  dependencies: {}
};
class ss {
  constructor(e, t, i = {}) {
    this.table = e, this.msgType = t, this.registeredDefaults = Object.assign({}, i);
  }
  register(e, t) {
    this.registeredDefaults[e] = t;
  }
  generate(e, t = {}) {
    var i = Object.assign({}, this.registeredDefaults), s = this.table.options.debugInvalidOptions || t.debugInvalidOptions === !0;
    Object.assign(i, e);
    for (let n in t)
      i.hasOwnProperty(n) || (s && console.warn("Invalid " + this.msgType + " option:", n), i[n] = t.key);
    for (let n in i)
      n in t ? i[n] = t[n] : Array.isArray(i[n]) ? i[n] = Object.assign([], i[n]) : typeof i[n] == "object" && i[n] !== null ? i[n] = Object.assign({}, i[n]) : typeof i[n] > "u" && delete i[n];
    return i;
  }
}
class At extends ne {
  constructor(e) {
    super(e), this.elementVertical = e.rowManager.element, this.elementHorizontal = e.columnManager.element, this.tableElement = e.rowManager.tableElement, this.verticalFillMode = "fit";
  }
  ///////////////////////////////////
  /////// Internal Bindings /////////
  ///////////////////////////////////
  initialize() {
  }
  clearRows() {
  }
  clearColumns() {
  }
  reinitializeColumnWidths(e) {
  }
  renderRows() {
  }
  renderColumns() {
  }
  rerenderRows(e) {
    e && e();
  }
  rerenderColumns(e, t) {
  }
  renderRowCells(e) {
  }
  rerenderRowCells(e, t) {
  }
  scrollColumns(e, t) {
  }
  scrollRows(e, t) {
  }
  resize() {
  }
  scrollToRow(e) {
  }
  scrollToRowNearestTop(e) {
  }
  visibleRows(e) {
    return [];
  }
  ///////////////////////////////////
  //////// Helper Functions /////////
  ///////////////////////////////////
  rows() {
    return this.table.rowManager.getDisplayRows();
  }
  styleRow(e, t) {
    var i = e.getElement();
    t % 2 ? (i.classList.add("tabulator-row-even"), i.classList.remove("tabulator-row-odd")) : (i.classList.add("tabulator-row-odd"), i.classList.remove("tabulator-row-even"));
  }
  ///////////////////////////////////
  /////// External Triggers /////////
  /////// (DO NOT OVERRIDE) /////////
  ///////////////////////////////////
  clear() {
    this.clearRows(), this.clearColumns();
  }
  render() {
    this.renderRows(), this.renderColumns();
  }
  rerender(e) {
    this.rerenderRows(), this.rerenderColumns();
  }
  scrollToRowPosition(e, t, i) {
    var s = this.rows().indexOf(e), n = e.getElement(), o = 0;
    return new Promise((r, a) => {
      if (s > -1) {
        if (typeof i > "u" && (i = this.table.options.scrollToRowIfVisible), !i && U.elVisible(n) && (o = U.elOffset(n).top - U.elOffset(this.elementVertical).top, o > 0 && o < this.elementVertical.clientHeight - n.offsetHeight))
          return r(), !1;
        switch (typeof t > "u" && (t = this.table.options.scrollToRowPosition), t === "nearest" && (t = this.scrollToRowNearestTop(e) ? "top" : "bottom"), this.scrollToRow(e), t) {
          case "middle":
          case "center":
            this.elementVertical.scrollHeight - this.elementVertical.scrollTop == this.elementVertical.clientHeight ? this.elementVertical.scrollTop = this.elementVertical.scrollTop + (n.offsetTop - this.elementVertical.scrollTop) - (this.elementVertical.scrollHeight - n.offsetTop) / 2 : this.elementVertical.scrollTop = this.elementVertical.scrollTop - this.elementVertical.clientHeight / 2;
            break;
          case "bottom":
            this.elementVertical.scrollHeight - this.elementVertical.scrollTop == this.elementVertical.clientHeight ? this.elementVertical.scrollTop = this.elementVertical.scrollTop - (this.elementVertical.scrollHeight - n.offsetTop) + n.offsetHeight : this.elementVertical.scrollTop = this.elementVertical.scrollTop - this.elementVertical.clientHeight + n.offsetHeight;
            break;
          case "top":
            this.elementVertical.scrollTop = n.offsetTop;
            break;
        }
        r();
      } else
        console.warn("Scroll Error - Row not visible"), a("Scroll Error - Row not visible");
    });
  }
}
class No extends At {
  constructor(e) {
    super(e);
  }
  renderRowCells(e, t) {
    const i = document.createDocumentFragment();
    e.cells.forEach((s) => {
      i.appendChild(s.getElement());
    }), e.element.appendChild(i), t || e.cells.forEach((s) => {
      s.cellRendered();
    });
  }
  reinitializeColumnWidths(e) {
    e.forEach(function(t) {
      t.reinitializeWidth();
    });
  }
}
class Vo extends At {
  constructor(e) {
    super(e), this.leftCol = 0, this.rightCol = 0, this.scrollLeft = 0, this.vDomScrollPosLeft = 0, this.vDomScrollPosRight = 0, this.vDomPadLeft = 0, this.vDomPadRight = 0, this.fitDataColAvg = 0, this.windowBuffer = 200, this.visibleRows = null, this.initialized = !1, this.isFitData = !1, this.columns = [];
  }
  initialize() {
    this.compatibilityCheck(), this.layoutCheck(), this.vertScrollListen();
  }
  compatibilityCheck() {
    this.options("layout") == "fitDataTable" && console.warn("Horizontal Virtual DOM is not compatible with fitDataTable layout mode"), this.options("responsiveLayout") && console.warn("Horizontal Virtual DOM is not compatible with responsive columns"), this.options("rtl") && console.warn("Horizontal Virtual DOM is not currently compatible with RTL text direction");
  }
  layoutCheck() {
    this.isFitData = this.options("layout").startsWith("fitData");
  }
  vertScrollListen() {
    this.subscribe("scroll-vertical", this.clearVisRowCache.bind(this)), this.subscribe("data-refreshed", this.clearVisRowCache.bind(this));
  }
  clearVisRowCache() {
    this.visibleRows = null;
  }
  //////////////////////////////////////
  ///////// Public Functions ///////////
  //////////////////////////////////////
  renderColumns(e, t) {
    this.dataChange();
  }
  scrollColumns(e, t) {
    this.scrollLeft != e && (this.scrollLeft = e, this.scroll(e - (this.vDomScrollPosLeft + this.windowBuffer)));
  }
  calcWindowBuffer() {
    var e = this.elementVertical.clientWidth;
    this.table.columnManager.columnsByIndex.forEach((t) => {
      if (t.visible) {
        var i = t.getWidth();
        i > e && (e = i);
      }
    }), this.windowBuffer = e * 2;
  }
  rerenderColumns(e, t) {
    var i = {
      cols: this.columns,
      leftCol: this.leftCol,
      rightCol: this.rightCol
    }, s = 0;
    e && !this.initialized || (this.clear(), this.calcWindowBuffer(), this.scrollLeft = this.elementVertical.scrollLeft, this.vDomScrollPosLeft = this.scrollLeft - this.windowBuffer, this.vDomScrollPosRight = this.scrollLeft + this.elementVertical.clientWidth + this.windowBuffer, this.table.columnManager.columnsByIndex.forEach((n) => {
      var o = {}, r;
      n.visible && (n.modules.frozen || (r = n.getWidth(), o.leftPos = s, o.rightPos = s + r, o.width = r, this.isFitData && (o.fitDataCheck = n.modules.vdomHoz ? n.modules.vdomHoz.fitDataCheck : !0), s + r > this.vDomScrollPosLeft && s < this.vDomScrollPosRight ? (this.leftCol == -1 && (this.leftCol = this.columns.length, this.vDomPadLeft = s), this.rightCol = this.columns.length) : this.leftCol !== -1 && (this.vDomPadRight += r), this.columns.push(n), n.modules.vdomHoz = o, s += r));
    }), this.tableElement.style.paddingLeft = this.vDomPadLeft + "px", this.tableElement.style.paddingRight = this.vDomPadRight + "px", this.initialized = !0, t || (!e || this.reinitChanged(i)) && this.reinitializeRows(), this.elementVertical.scrollLeft = this.scrollLeft);
  }
  renderRowCells(e) {
    if (this.initialized)
      this.initializeRow(e);
    else {
      const t = document.createDocumentFragment();
      e.cells.forEach((i) => {
        t.appendChild(i.getElement());
      }), e.element.appendChild(t), e.cells.forEach((i) => {
        i.cellRendered();
      });
    }
  }
  rerenderRowCells(e, t) {
    this.reinitializeRow(e, t);
  }
  reinitializeColumnWidths(e) {
    for (let t = this.leftCol; t <= this.rightCol; t++) {
      let i = this.columns[t];
      i && i.reinitializeWidth();
    }
  }
  //////////////////////////////////////
  //////// Internal Rendering //////////
  //////////////////////////////////////
  deinitialize() {
    this.initialized = !1;
  }
  clear() {
    this.columns = [], this.leftCol = -1, this.rightCol = 0, this.vDomScrollPosLeft = 0, this.vDomScrollPosRight = 0, this.vDomPadLeft = 0, this.vDomPadRight = 0;
  }
  dataChange() {
    var e = !1, t, i;
    if (this.isFitData) {
      if (this.table.columnManager.columnsByIndex.forEach((s) => {
        !s.definition.width && s.visible && (e = !0);
      }), e && this.table.rowManager.getDisplayRows().length && (this.vDomScrollPosRight = this.scrollLeft + this.elementVertical.clientWidth + this.windowBuffer, t = this.chain("rows-sample", [1], [], () => this.table.rowManager.getDisplayRows())[0], t)) {
        i = t.getElement(), t.generateCells(), this.tableElement.appendChild(i);
        for (let s = 0; s < t.cells.length; s++) {
          let n = t.cells[s];
          i.appendChild(n.getElement()), n.column.reinitializeWidth();
        }
        i.parentNode.removeChild(i), this.rerenderColumns(!1, !0);
      }
    } else
      this.options("layout") === "fitColumns" && (this.layoutRefresh(), this.rerenderColumns(!1, !0));
  }
  reinitChanged(e) {
    var t = !0;
    return e.cols.length !== this.columns.length || e.leftCol !== this.leftCol || e.rightCol !== this.rightCol ? !0 : (e.cols.forEach((i, s) => {
      i !== this.columns[s] && (t = !1);
    }), !t);
  }
  reinitializeRows() {
    var e = this.getVisibleRows(), t = this.table.rowManager.getRows().filter((i) => !e.includes(i));
    e.forEach((i) => {
      this.reinitializeRow(i, !0);
    }), t.forEach((i) => {
      i.deinitialize();
    });
  }
  getVisibleRows() {
    return this.visibleRows || (this.visibleRows = this.table.rowManager.getVisibleRows()), this.visibleRows;
  }
  scroll(e) {
    this.vDomScrollPosLeft += e, this.vDomScrollPosRight += e, Math.abs(e) > this.windowBuffer / 2 ? this.rerenderColumns() : e > 0 ? (this.addColRight(), this.removeColLeft()) : (this.addColLeft(), this.removeColRight());
  }
  colPositionAdjust(e, t, i) {
    for (let s = e; s < t; s++) {
      let n = this.columns[s];
      n.modules.vdomHoz.leftPos += i, n.modules.vdomHoz.rightPos += i;
    }
  }
  addColRight() {
    for (var e = !1, t = !0; t; ) {
      let i = this.columns[this.rightCol + 1];
      i && i.modules.vdomHoz.leftPos <= this.vDomScrollPosRight ? (e = !0, this.getVisibleRows().forEach((s) => {
        if (s.type !== "group") {
          var n = s.getCell(i);
          s.getElement().insertBefore(n.getElement(), s.getCell(this.columns[this.rightCol]).getElement().nextSibling), n.cellRendered();
        }
      }), this.fitDataColActualWidthCheck(i), this.rightCol++, this.getVisibleRows().forEach((s) => {
        s.type !== "group" && (s.modules.vdomHoz.rightCol = this.rightCol);
      }), this.rightCol >= this.columns.length - 1 ? this.vDomPadRight = 0 : this.vDomPadRight -= i.getWidth()) : t = !1;
    }
    e && (this.tableElement.style.paddingRight = this.vDomPadRight + "px");
  }
  addColLeft() {
    for (var e = !1, t = !0; t; ) {
      let i = this.columns[this.leftCol - 1];
      if (i)
        if (i.modules.vdomHoz.rightPos >= this.vDomScrollPosLeft) {
          e = !0, this.getVisibleRows().forEach((n) => {
            if (n.type !== "group") {
              var o = n.getCell(i);
              n.getElement().insertBefore(o.getElement(), n.getCell(this.columns[this.leftCol]).getElement()), o.cellRendered();
            }
          }), this.leftCol--, this.getVisibleRows().forEach((n) => {
            n.type !== "group" && (n.modules.vdomHoz.leftCol = this.leftCol);
          }), this.leftCol <= 0 ? this.vDomPadLeft = 0 : this.vDomPadLeft -= i.getWidth();
          let s = this.fitDataColActualWidthCheck(i);
          s && (this.scrollLeft = this.elementVertical.scrollLeft = this.elementVertical.scrollLeft + s, this.vDomPadRight -= s);
        } else
          t = !1;
      else
        t = !1;
    }
    e && (this.tableElement.style.paddingLeft = this.vDomPadLeft + "px");
  }
  removeColRight() {
    for (var e = !1, t = !0; t; ) {
      let i = this.columns[this.rightCol];
      i && i.modules.vdomHoz.leftPos > this.vDomScrollPosRight ? (e = !0, this.getVisibleRows().forEach((s) => {
        if (s.type !== "group") {
          var n = s.getCell(i);
          try {
            s.getElement().removeChild(n.getElement());
          } catch (o) {
            console.warn("Could not removeColRight", o.message);
          }
        }
      }), this.vDomPadRight += i.getWidth(), this.rightCol--, this.getVisibleRows().forEach((s) => {
        s.type !== "group" && (s.modules.vdomHoz.rightCol = this.rightCol);
      })) : t = !1;
    }
    e && (this.tableElement.style.paddingRight = this.vDomPadRight + "px");
  }
  removeColLeft() {
    for (var e = !1, t = !0; t; ) {
      let i = this.columns[this.leftCol];
      i && i.modules.vdomHoz.rightPos < this.vDomScrollPosLeft ? (e = !0, this.getVisibleRows().forEach((s) => {
        if (s.type !== "group") {
          var n = s.getCell(i);
          try {
            s.getElement().removeChild(n.getElement());
          } catch (o) {
            console.warn("Could not removeColLeft", o.message);
          }
        }
      }), this.vDomPadLeft += i.getWidth(), this.leftCol++, this.getVisibleRows().forEach((s) => {
        s.type !== "group" && (s.modules.vdomHoz.leftCol = this.leftCol);
      })) : t = !1;
    }
    e && (this.tableElement.style.paddingLeft = this.vDomPadLeft + "px");
  }
  fitDataColActualWidthCheck(e) {
    var t, i;
    return e.modules.vdomHoz.fitDataCheck && (e.reinitializeWidth(), t = e.getWidth(), i = t - e.modules.vdomHoz.width, i && (e.modules.vdomHoz.rightPos += i, e.modules.vdomHoz.width = t, this.colPositionAdjust(this.columns.indexOf(e) + 1, this.columns.length, i)), e.modules.vdomHoz.fitDataCheck = !1), i;
  }
  initializeRow(e) {
    if (e.type !== "group") {
      e.modules.vdomHoz = {
        leftCol: this.leftCol,
        rightCol: this.rightCol
      }, this.table.modules.frozenColumns && this.table.modules.frozenColumns.leftColumns.forEach((t) => {
        this.appendCell(e, t);
      });
      for (let t = this.leftCol; t <= this.rightCol; t++)
        this.appendCell(e, this.columns[t]);
      this.table.modules.frozenColumns && this.table.modules.frozenColumns.rightColumns.forEach((t) => {
        this.appendCell(e, t);
      });
    }
  }
  appendCell(e, t) {
    if (t && t.visible) {
      let i = e.getCell(t);
      e.getElement().appendChild(i.getElement()), i.cellRendered();
    }
  }
  reinitializeRow(e, t) {
    if (e.type !== "group" && (t || !e.modules.vdomHoz || e.modules.vdomHoz.leftCol !== this.leftCol || e.modules.vdomHoz.rightCol !== this.rightCol)) {
      for (var i = e.getElement(); i.firstChild; ) i.removeChild(i.firstChild);
      this.initializeRow(e);
    }
  }
}
class Io extends ne {
  constructor(e) {
    super(e), this.blockHozScrollEvent = !1, this.headersElement = null, this.contentsElement = null, this.rowHeader = null, this.element = null, this.columns = [], this.columnsByIndex = [], this.columnsByField = {}, this.scrollLeft = 0, this.optionsList = new ss(this.table, "column definition", Ni), this.redrawBlock = !1, this.redrawBlockUpdate = null, this.renderer = null;
  }
  ////////////// Setup Functions /////////////////
  initialize() {
    this.initializeRenderer(), this.headersElement = this.createHeadersElement(), this.contentsElement = this.createHeaderContentsElement(), this.element = this.createHeaderElement(), this.contentsElement.insertBefore(this.headersElement, this.contentsElement.firstChild), this.element.insertBefore(this.contentsElement, this.element.firstChild), this.initializeScrollWheelWatcher(), this.subscribe("scroll-horizontal", this.scrollHorizontal.bind(this)), this.subscribe("scrollbar-vertical", this.padVerticalScrollbar.bind(this));
  }
  padVerticalScrollbar(e) {
    this.table.rtl ? this.headersElement.style.marginLeft = e + "px" : this.headersElement.style.marginRight = e + "px";
  }
  initializeRenderer() {
    var e, t = {
      virtual: Vo,
      basic: No
    };
    typeof this.table.options.renderHorizontal == "string" ? e = t[this.table.options.renderHorizontal] : e = this.table.options.renderHorizontal, e ? (this.renderer = new e(this.table, this.element, this.tableElement), this.renderer.initialize()) : console.error("Unable to find matching renderer:", this.table.options.renderHorizontal);
  }
  createHeadersElement() {
    var e = document.createElement("div");
    return e.classList.add("tabulator-headers"), e.setAttribute("role", "row"), e;
  }
  createHeaderContentsElement() {
    var e = document.createElement("div");
    return e.classList.add("tabulator-header-contents"), e.setAttribute("role", "rowgroup"), e;
  }
  createHeaderElement() {
    var e = document.createElement("div");
    return e.classList.add("tabulator-header"), e.setAttribute("role", "rowgroup"), this.table.options.headerVisible || e.classList.add("tabulator-header-hidden"), e;
  }
  //return containing element
  getElement() {
    return this.element;
  }
  //return containing contents element
  getContentsElement() {
    return this.contentsElement;
  }
  //return header containing element
  getHeadersElement() {
    return this.headersElement;
  }
  //scroll horizontally to match table body
  scrollHorizontal(e) {
    this.contentsElement.scrollLeft = e, this.scrollLeft = e, this.renderer.scrollColumns(e);
  }
  initializeScrollWheelWatcher() {
    this.contentsElement.addEventListener("wheel", (e) => {
      var t;
      e.deltaX && (t = this.contentsElement.scrollLeft + e.deltaX, this.table.rowManager.scrollHorizontal(t), this.table.columnManager.scrollHorizontal(t));
    });
  }
  ///////////// Column Setup Functions /////////////
  generateColumnsFromRowData(e) {
    var t = [], i = {}, s = this.table.options.autoColumns === "full" ? e : [e[0]], n = this.table.options.autoColumnsDefinitions;
    if (e && e.length) {
      if (s.forEach((o) => {
        Object.keys(o).forEach((r, a) => {
          let h = o[r], d;
          i[r] ? i[r] !== !0 && typeof h < "u" && (i[r].sorter = this.calculateSorterFromValue(h), i[r] = !0) : (d = {
            field: r,
            title: r,
            sorter: this.calculateSorterFromValue(h)
          }, t.splice(a, 0, d), i[r] = typeof h > "u" ? d : !0);
        });
      }), n)
        switch (typeof n) {
          case "function":
            this.table.options.columns = n.call(this.table, t);
            break;
          case "object":
            Array.isArray(n) ? t.forEach((o) => {
              var r = n.find((a) => a.field === o.field);
              r && Object.assign(o, r);
            }) : t.forEach((o) => {
              n[o.field] && Object.assign(o, n[o.field]);
            }), this.table.options.columns = t;
            break;
        }
      else
        this.table.options.columns = t;
      this.setColumns(this.table.options.columns);
    }
  }
  calculateSorterFromValue(e) {
    var t;
    switch (typeof e) {
      case "undefined":
        t = "string";
        break;
      case "boolean":
        t = "boolean";
        break;
      case "number":
        t = "number";
        break;
      case "object":
        Array.isArray(e) ? t = "array" : t = "string";
        break;
      default:
        !isNaN(e) && e !== "" ? t = "number" : e.match(/((^[0-9]+[a-z]+)|(^[a-z]+[0-9]+))+$/i) ? t = "alphanum" : t = "string";
        break;
    }
    return t;
  }
  setColumns(e, t) {
    for (; this.headersElement.firstChild; ) this.headersElement.removeChild(this.headersElement.firstChild);
    this.columns = [], this.columnsByIndex = [], this.columnsByField = {}, this.dispatch("columns-loading"), this.dispatchExternal("columnsLoading"), this.table.options.rowHeader && (this.rowHeader = new Ze(this.table.options.rowHeader === !0 ? {} : this.table.options.rowHeader, this, !0), this.columns.push(this.rowHeader), this.headersElement.appendChild(this.rowHeader.getElement()), this.rowHeader.columnRendered()), e.forEach((i, s) => {
      this._addColumn(i);
    }), this._reIndexColumns(), this.dispatch("columns-loaded"), this.subscribedExternal("columnsLoaded") && this.dispatchExternal("columnsLoaded", this.getComponents()), this.rerenderColumns(!1, !0), this.redraw(!0);
  }
  _addColumn(e, t, i) {
    var s = new Ze(e, this), n = s.getElement(), o = i && this.findColumnIndex(i);
    if (t && this.rowHeader && (!i || i === this.rowHeader) && (t = !1, i = this.rowHeader, o = 0), i && o > -1) {
      var r = i.getTopColumn(), a = this.columns.indexOf(r), h = r.getElement();
      t ? (this.columns.splice(a, 0, s), h.parentNode.insertBefore(n, h)) : (this.columns.splice(a + 1, 0, s), h.parentNode.insertBefore(n, h.nextSibling));
    } else
      t ? (this.columns.unshift(s), this.headersElement.insertBefore(s.getElement(), this.headersElement.firstChild)) : (this.columns.push(s), this.headersElement.appendChild(s.getElement()));
    return s.columnRendered(), s;
  }
  registerColumnField(e) {
    e.definition.field && (this.columnsByField[e.definition.field] = e);
  }
  registerColumnPosition(e) {
    this.columnsByIndex.push(e);
  }
  _reIndexColumns() {
    this.columnsByIndex = [], this.columns.forEach(function(e) {
      e.reRegisterPosition();
    });
  }
  //ensure column headers take up the correct amount of space in column groups
  verticalAlignHeaders() {
    var e = 0;
    this.redrawBlock || (this.headersElement.style.height = "", this.columns.forEach((t) => {
      t.clearVerticalAlign();
    }), this.columns.forEach((t) => {
      var i = t.getHeight();
      i > e && (e = i);
    }), this.headersElement.style.height = e + "px", this.columns.forEach((t) => {
      t.verticalAlign(this.table.options.columnHeaderVertAlign, e);
    }), this.table.rowManager.adjustTableSize());
  }
  //////////////// Column Details /////////////////
  findColumn(e) {
    var t;
    if (typeof e == "object") {
      if (e instanceof Ze)
        return e;
      if (e instanceof Bi)
        return e._getSelf() || !1;
      if (typeof HTMLElement < "u" && e instanceof HTMLElement)
        return t = [], this.columns.forEach((s) => {
          t.push(s), t = t.concat(s.getColumns(!0));
        }), t.find((s) => s.element === e) || !1;
    } else
      return this.columnsByField[e] || !1;
    return !1;
  }
  getColumnByField(e) {
    return this.columnsByField[e];
  }
  getColumnsByFieldRoot(e) {
    var t = [];
    return Object.keys(this.columnsByField).forEach((i) => {
      var s = this.table.options.nestedFieldSeparator ? i.split(this.table.options.nestedFieldSeparator)[0] : i;
      s === e && t.push(this.columnsByField[i]);
    }), t;
  }
  getColumnByIndex(e) {
    return this.columnsByIndex[e];
  }
  getFirstVisibleColumn() {
    var e = this.columnsByIndex.findIndex((t) => t.visible);
    return e > -1 ? this.columnsByIndex[e] : !1;
  }
  getVisibleColumnsByIndex() {
    return this.columnsByIndex.filter((e) => e.visible);
  }
  getColumns() {
    return this.columns;
  }
  findColumnIndex(e) {
    return this.columnsByIndex.findIndex((t) => e === t);
  }
  //return all columns that are not groups
  getRealColumns() {
    return this.columnsByIndex;
  }
  //traverse across columns and call action
  traverse(e) {
    this.columnsByIndex.forEach((t, i) => {
      e(t, i);
    });
  }
  //get definitions of actual columns
  getDefinitions(e) {
    var t = [];
    return this.columnsByIndex.forEach((i) => {
      (!e || e && i.visible) && t.push(i.getDefinition());
    }), t;
  }
  //get full nested definition tree
  getDefinitionTree() {
    var e = [];
    return this.columns.forEach((t) => {
      e.push(t.getDefinition(!0));
    }), e;
  }
  getComponents(e) {
    var t = [], i = e ? this.columns : this.columnsByIndex;
    return i.forEach((s) => {
      t.push(s.getComponent());
    }), t;
  }
  getWidth() {
    var e = 0;
    return this.columnsByIndex.forEach((t) => {
      t.visible && (e += t.getWidth());
    }), e;
  }
  moveColumn(e, t, i) {
    t.element.parentNode.insertBefore(e.element, t.element), i && t.element.parentNode.insertBefore(t.element, e.element), this.moveColumnActual(e, t, i), this.verticalAlignHeaders(), this.table.rowManager.reinitialize();
  }
  moveColumnActual(e, t, i) {
    e.parent.isGroup ? this._moveColumnInArray(e.parent.columns, e, t, i) : this._moveColumnInArray(this.columns, e, t, i), this._moveColumnInArray(this.columnsByIndex, e, t, i, !0), this.rerenderColumns(!0), this.dispatch("column-moved", e, t, i), this.subscribedExternal("columnMoved") && this.dispatchExternal("columnMoved", e.getComponent(), this.table.columnManager.getComponents());
  }
  _moveColumnInArray(e, t, i, s, n) {
    var o = e.indexOf(t), r, a = [];
    o > -1 && (e.splice(o, 1), r = e.indexOf(i), r > -1 ? s && (r = r + 1) : r = o, e.splice(r, 0, t), n && (a = this.chain("column-moving-rows", [t, i, s], null, []) || [], a = a.concat(this.table.rowManager.rows), a.forEach(function(h) {
      if (h.cells.length) {
        var d = h.cells.splice(o, 1)[0];
        h.cells.splice(r, 0, d);
      }
    })));
  }
  scrollToColumn(e, t, i) {
    var s = 0, n = e.getLeftOffset(), o = 0, r = e.getElement();
    return new Promise((a, h) => {
      if (typeof t > "u" && (t = this.table.options.scrollToColumnPosition), typeof i > "u" && (i = this.table.options.scrollToColumnIfVisible), e.visible) {
        switch (t) {
          case "middle":
          case "center":
            o = -this.element.clientWidth / 2;
            break;
          case "right":
            o = r.clientWidth - this.headersElement.clientWidth;
            break;
        }
        if (!i && n > 0 && n + r.offsetWidth < this.element.clientWidth)
          return !1;
        s = n + o, s = Math.max(Math.min(s, this.table.rowManager.element.scrollWidth - this.table.rowManager.element.clientWidth), 0), this.table.rowManager.scrollHorizontal(s), this.scrollHorizontal(s), a();
      } else
        console.warn("Scroll Error - Column not visible"), h("Scroll Error - Column not visible");
    });
  }
  //////////////// Cell Management /////////////////
  generateCells(e) {
    var t = [];
    return this.columnsByIndex.forEach((i) => {
      t.push(i.generateCell(e));
    }), t;
  }
  //////////////// Column Management /////////////////
  getFlexBaseWidth() {
    var e = this.table.element.clientWidth, t = 0;
    return this.table.rowManager.element.scrollHeight > this.table.rowManager.element.clientHeight && (e -= this.table.rowManager.element.offsetWidth - this.table.rowManager.element.clientWidth), this.columnsByIndex.forEach(function(i) {
      var s, n, o;
      i.visible && (s = i.definition.width || 0, n = parseInt(i.minWidth), typeof s == "string" ? s.indexOf("%") > -1 ? o = e / 100 * parseInt(s) : o = parseInt(s) : o = s, t += o > n ? o : n);
    }), t;
  }
  addColumn(e, t, i) {
    return new Promise((s, n) => {
      var o = this._addColumn(e, t, i);
      this._reIndexColumns(), this.dispatch("column-add", e, t, i), this.layoutMode() != "fitColumns" && o.reinitializeWidth(), this.redraw(!0), this.table.rowManager.reinitialize(), this.rerenderColumns(), s(o);
    });
  }
  //remove column from system
  deregisterColumn(e) {
    var t = e.getField(), i;
    t && delete this.columnsByField[t], i = this.columnsByIndex.indexOf(e), i > -1 && this.columnsByIndex.splice(i, 1), i = this.columns.indexOf(e), i > -1 && this.columns.splice(i, 1), this.verticalAlignHeaders(), this.redraw();
  }
  rerenderColumns(e, t) {
    this.redrawBlock ? (e === !1 || e === !0 && this.redrawBlockUpdate === null) && (this.redrawBlockUpdate = e) : this.renderer.rerenderColumns(e, t);
  }
  blockRedraw() {
    this.redrawBlock = !0, this.redrawBlockUpdate = null;
  }
  restoreRedraw() {
    this.redrawBlock = !1, this.verticalAlignHeaders(), this.renderer.rerenderColumns(this.redrawBlockUpdate);
  }
  //redraw columns
  redraw(e) {
    U.elVisible(this.element) && this.verticalAlignHeaders(), e && (this.table.rowManager.resetScroll(), this.table.rowManager.reinitialize()), this.confirm("table-redrawing", e) || this.layoutRefresh(e), this.dispatch("table-redraw", e), this.table.footerManager.redraw();
  }
}
class Wo extends At {
  constructor(e) {
    super(e), this.verticalFillMode = "fill", this.scrollTop = 0, this.scrollLeft = 0, this.scrollTop = 0, this.scrollLeft = 0;
  }
  clearRows() {
    for (var e = this.tableElement; e.firstChild; ) e.removeChild(e.firstChild);
    e.scrollTop = 0, e.scrollLeft = 0, e.style.minWidth = "", e.style.minHeight = "", e.style.display = "", e.style.visibility = "";
  }
  renderRows() {
    var e = this.tableElement, t = !0, i = document.createDocumentFragment(), s = this.rows();
    s.forEach((n, o) => {
      this.styleRow(n, o), n.initialize(!1, !0), n.type !== "group" && (t = !1), i.appendChild(n.getElement());
    }), e.appendChild(i), s.forEach((n) => {
      n.rendered(), n.heightInitialized || n.calcHeight(!0);
    }), s.forEach((n) => {
      n.heightInitialized || n.setCellHeight();
    }), t ? e.style.minWidth = this.table.columnManager.getWidth() + "px" : e.style.minWidth = "";
  }
  rerenderRows(e) {
    this.clearRows(), e && e(), this.renderRows(), this.rows().length || this.table.rowManager.tableEmpty();
  }
  scrollToRowNearestTop(e) {
    var t = U.elOffset(e.getElement()).top;
    return !(Math.abs(this.elementVertical.scrollTop - t) > Math.abs(this.elementVertical.scrollTop + this.elementVertical.clientHeight - t));
  }
  scrollToRow(e) {
    var t = e.getElement();
    this.elementVertical.scrollTop = U.elOffset(t).top - U.elOffset(this.elementVertical).top + this.elementVertical.scrollTop;
  }
  visibleRows(e) {
    return this.rows();
  }
}
class Go extends At {
  constructor(e) {
    super(e), this.verticalFillMode = "fill", this.scrollTop = 0, this.scrollLeft = 0, this.vDomRowHeight = 20, this.vDomTop = 0, this.vDomBottom = 0, this.vDomScrollPosTop = 0, this.vDomScrollPosBottom = 0, this.vDomTopPad = 0, this.vDomBottomPad = 0, this.vDomMaxRenderChain = 90, this.vDomWindowBuffer = 0, this.vDomWindowMinTotalRows = 20, this.vDomWindowMinMarginRows = 5, this.vDomTopNewRows = [], this.vDomBottomNewRows = [];
  }
  //////////////////////////////////////
  ///////// Public Functions ///////////
  //////////////////////////////////////
  clearRows() {
    for (var e = this.tableElement; e.firstChild; ) e.removeChild(e.firstChild);
    e.style.paddingTop = "", e.style.paddingBottom = "", e.style.minHeight = "", e.style.display = "", e.style.visibility = "", this.elementVertical.scrollTop = 0, this.elementVertical.scrollLeft = 0, this.scrollTop = 0, this.scrollLeft = 0, this.vDomTop = 0, this.vDomBottom = 0, this.vDomTopPad = 0, this.vDomBottomPad = 0, this.vDomScrollPosTop = 0, this.vDomScrollPosBottom = 0;
  }
  renderRows() {
    this._virtualRenderFill();
  }
  rerenderRows(e) {
    for (var t = this.elementVertical.scrollTop, i = !1, s = !1, n = this.table.rowManager.scrollLeft, o = this.rows(), r = this.vDomTop; r <= this.vDomBottom; r++)
      if (o[r]) {
        var a = t - o[r].getElement().offsetTop;
        if (s === !1 || Math.abs(a) < s)
          s = a, i = r;
        else
          break;
      }
    o.forEach((h) => {
      h.deinitializeHeight();
    }), e && e(), this.rows().length ? this._virtualRenderFill(i === !1 ? this.rows.length - 1 : i, !0, s || 0) : (this.clear(), this.table.rowManager.tableEmpty()), this.scrollColumns(n);
  }
  scrollColumns(e) {
    this.table.rowManager.scrollHorizontal(e);
  }
  scrollRows(e, t) {
    var i = e - this.vDomScrollPosTop, s = e - this.vDomScrollPosBottom, n = this.vDomWindowBuffer * 2, o = this.rows();
    if (this.scrollTop = e, -i > n || s > n) {
      var r = this.table.rowManager.scrollLeft;
      this._virtualRenderFill(Math.floor(this.elementVertical.scrollTop / this.elementVertical.scrollHeight * o.length)), this.scrollColumns(r);
    } else
      t ? (i < 0 && this._addTopRow(o, -i), s < 0 && (this.vDomScrollHeight - this.scrollTop > this.vDomWindowBuffer ? this._removeBottomRow(o, -s) : this.vDomScrollPosBottom = this.scrollTop)) : (s >= 0 && this._addBottomRow(o, s), i >= 0 && (this.scrollTop > this.vDomWindowBuffer ? this._removeTopRow(o, i) : this.vDomScrollPosTop = this.scrollTop));
  }
  resize() {
    this.vDomWindowBuffer = this.table.options.renderVerticalBuffer || this.elementVertical.clientHeight;
  }
  scrollToRowNearestTop(e) {
    var t = this.rows().indexOf(e);
    return !(Math.abs(this.vDomTop - t) > Math.abs(this.vDomBottom - t));
  }
  scrollToRow(e) {
    var t = this.rows().indexOf(e);
    t > -1 && this._virtualRenderFill(t, !0);
  }
  visibleRows(e) {
    var t = this.elementVertical.scrollTop, i = this.elementVertical.clientHeight + t, s = !1, n = 0, o = 0, r = this.rows();
    if (e)
      n = this.vDomTop, o = this.vDomBottom;
    else
      for (var a = this.vDomTop; a <= this.vDomBottom; a++)
        if (r[a])
          if (s)
            if (i - r[a].getElement().offsetTop >= 0)
              o = a;
            else
              break;
          else if (t - r[a].getElement().offsetTop >= 0)
            n = a;
          else if (s = !0, i - r[a].getElement().offsetTop >= 0)
            o = a;
          else
            break;
    return r.slice(n, o + 1);
  }
  //////////////////////////////////////
  //////// Internal Rendering //////////
  //////////////////////////////////////
  //full virtual render
  _virtualRenderFill(e, t, i) {
    var s = this.tableElement, n = this.elementVertical, o = 0, r = 0, a = 0, h = 0, d = 0, u = 0, c = this.rows(), g = c.length, m = 0, E, w, v = [], M = 0, z = 0, P = this.table.rowManager.fixedHeight, D = this.elementVertical.clientHeight, V = this.table.options.rowHeight, oe = !0;
    if (e = e || 0, i = i || 0, !e)
      this.clear();
    else {
      for (; s.firstChild; ) s.removeChild(s.firstChild);
      h = (g - e + 1) * this.vDomRowHeight, h < D && (e -= Math.ceil((D - h) / this.vDomRowHeight), e < 0 && (e = 0)), o = Math.min(Math.max(Math.floor(this.vDomWindowBuffer / this.vDomRowHeight), this.vDomWindowMinMarginRows), e), e -= o;
    }
    if (g && U.elVisible(this.elementVertical)) {
      for (this.vDomTop = e, this.vDomBottom = e - 1, P || this.table.options.maxHeight ? (V && (z = D / V + this.vDomWindowBuffer / V), z = Math.max(this.vDomWindowMinTotalRows, Math.ceil(z))) : z = g; (z == g || r <= D + this.vDomWindowBuffer || M < this.vDomWindowMinTotalRows) && this.vDomBottom < g - 1; ) {
        for (v = [], w = document.createDocumentFragment(), u = 0; u < z && this.vDomBottom < g - 1; )
          m = this.vDomBottom + 1, E = c[m], this.styleRow(E, m), E.initialize(!1, !0), !E.heightInitialized && !this.table.options.rowHeight && E.clearCellHeight(), w.appendChild(E.getElement()), v.push(E), this.vDomBottom++, u++;
        if (!v.length)
          break;
        s.appendChild(w), v.forEach((q) => {
          q.rendered(), q.heightInitialized || q.calcHeight(!0);
        }), v.forEach((q) => {
          q.heightInitialized || q.setCellHeight();
        }), v.forEach((q) => {
          a = q.getHeight(), M < o ? d += a : r += a, a > this.vDomWindowBuffer && (this.vDomWindowBuffer = a * 2), M++;
        }), oe = this.table.rowManager.adjustTableSize(), D = this.elementVertical.clientHeight, oe && (P || this.table.options.maxHeight) && (V = r / M, z = Math.max(this.vDomWindowMinTotalRows, Math.ceil(D / V + this.vDomWindowBuffer / V)));
      }
      e ? (this.vDomTopPad = t ? this.vDomRowHeight * this.vDomTop + i : this.scrollTop - d, this.vDomBottomPad = this.vDomBottom == g - 1 ? 0 : Math.max(this.vDomScrollHeight - this.vDomTopPad - r - d, 0)) : (this.vDomTopPad = 0, this.vDomRowHeight = Math.floor((r + d) / M), this.vDomBottomPad = this.vDomRowHeight * (g - this.vDomBottom - 1), this.vDomScrollHeight = d + r + this.vDomBottomPad - D), s.style.paddingTop = this.vDomTopPad + "px", s.style.paddingBottom = this.vDomBottomPad + "px", t && (this.scrollTop = this.vDomTopPad + d + i - (this.elementVertical.scrollWidth > this.elementVertical.clientWidth ? this.elementVertical.offsetHeight - D : 0)), this.scrollTop = Math.min(this.scrollTop, this.elementVertical.scrollHeight - D), this.elementVertical.scrollWidth > this.elementVertical.clientWidth && t && (this.scrollTop += this.elementVertical.offsetHeight - D), this.vDomScrollPosTop = this.scrollTop, this.vDomScrollPosBottom = this.scrollTop, n.scrollTop = this.scrollTop, this.dispatch("render-virtual-fill");
    }
  }
  _addTopRow(e, t) {
    for (var i = this.tableElement, s = [], n = 0, o = this.vDomTop - 1, r = 0, a = !0; a; )
      if (this.vDomTop) {
        let h = e[o], d, u;
        h && r < this.vDomMaxRenderChain ? (d = h.getHeight() || this.vDomRowHeight, u = h.initialized, t >= d ? (this.styleRow(h, o), i.insertBefore(h.getElement(), i.firstChild), (!h.initialized || !h.heightInitialized) && s.push(h), h.initialize(), u || (d = h.getElement().offsetHeight, d > this.vDomWindowBuffer && (this.vDomWindowBuffer = d * 2)), t -= d, n += d, this.vDomTop--, o--, r++) : a = !1) : a = !1;
      } else
        a = !1;
    for (let h of s)
      h.clearCellHeight();
    this._quickNormalizeRowHeight(s), n && (this.vDomTopPad -= n, this.vDomTopPad < 0 && (this.vDomTopPad = o * this.vDomRowHeight), o < 1 && (this.vDomTopPad = 0), i.style.paddingTop = this.vDomTopPad + "px", this.vDomScrollPosTop -= n);
  }
  _removeTopRow(e, t) {
    for (var i = [], s = 0, n = 0, o = !0; o; ) {
      let r = e[this.vDomTop], a;
      r && n < this.vDomMaxRenderChain ? (a = r.getHeight() || this.vDomRowHeight, t >= a ? (this.vDomTop++, t -= a, s += a, i.push(r), n++) : o = !1) : o = !1;
    }
    for (let r of i) {
      let a = r.getElement();
      a.parentNode && a.parentNode.removeChild(a);
    }
    s && (this.vDomTopPad += s, this.tableElement.style.paddingTop = this.vDomTopPad + "px", this.vDomScrollPosTop += this.vDomTop ? s : s + this.vDomWindowBuffer);
  }
  _addBottomRow(e, t) {
    for (var i = this.tableElement, s = [], n = 0, o = this.vDomBottom + 1, r = 0, a = !0; a; ) {
      let h = e[o], d, u;
      h && r < this.vDomMaxRenderChain ? (d = h.getHeight() || this.vDomRowHeight, u = h.initialized, t >= d ? (this.styleRow(h, o), i.appendChild(h.getElement()), (!h.initialized || !h.heightInitialized) && s.push(h), h.initialize(), u || (d = h.getElement().offsetHeight, d > this.vDomWindowBuffer && (this.vDomWindowBuffer = d * 2)), t -= d, n += d, this.vDomBottom++, o++, r++) : a = !1) : a = !1;
    }
    for (let h of s)
      h.clearCellHeight();
    this._quickNormalizeRowHeight(s), n && (this.vDomBottomPad -= n, (this.vDomBottomPad < 0 || o == e.length - 1) && (this.vDomBottomPad = 0), i.style.paddingBottom = this.vDomBottomPad + "px", this.vDomScrollPosBottom += n);
  }
  _removeBottomRow(e, t) {
    for (var i = [], s = 0, n = 0, o = !0; o; ) {
      let r = e[this.vDomBottom], a;
      r && n < this.vDomMaxRenderChain ? (a = r.getHeight() || this.vDomRowHeight, t >= a ? (this.vDomBottom--, t -= a, s += a, i.push(r), n++) : o = !1) : o = !1;
    }
    for (let r of i) {
      let a = r.getElement();
      a.parentNode && a.parentNode.removeChild(a);
    }
    s && (this.vDomBottomPad += s, this.vDomBottomPad < 0 && (this.vDomBottomPad = 0), this.tableElement.style.paddingBottom = this.vDomBottomPad + "px", this.vDomScrollPosBottom -= s);
  }
  _quickNormalizeRowHeight(e) {
    for (let t of e)
      t.calcHeight();
    for (let t of e)
      t.setCellHeight();
  }
}
class $o extends ne {
  constructor(e) {
    super(e), this.element = this.createHolderElement(), this.tableElement = this.createTableElement(), this.heightFixer = this.createTableElement(), this.placeholder = null, this.placeholderContents = null, this.firstRender = !1, this.renderMode = "virtual", this.fixedHeight = !1, this.rows = [], this.activeRowsPipeline = [], this.activeRows = [], this.activeRowsCount = 0, this.displayRows = [], this.displayRowsCount = 0, this.scrollTop = 0, this.scrollLeft = 0, this.redrawBlock = !1, this.redrawBlockRestoreConfig = !1, this.redrawBlockRenderInPosition = !1, this.dataPipeline = [], this.displayPipeline = [], this.scrollbarWidth = 0, this.renderer = null;
  }
  //////////////// Setup Functions /////////////////
  createHolderElement() {
    var e = document.createElement("div");
    return e.classList.add("tabulator-tableholder"), e.setAttribute("tabindex", 0), e;
  }
  createTableElement() {
    var e = document.createElement("div");
    return e.classList.add("tabulator-table"), e.setAttribute("role", "rowgroup"), e;
  }
  initializePlaceholder() {
    var e = this.table.options.placeholder;
    if (typeof e == "function" && (e = e.call(this.table)), e = this.chain("placeholder", [e], e, e) || e, e) {
      let t = document.createElement("div");
      if (t.classList.add("tabulator-placeholder"), typeof e == "string") {
        let i = document.createElement("div");
        i.classList.add("tabulator-placeholder-contents"), i.innerHTML = e, t.appendChild(i), this.placeholderContents = i;
      } else typeof HTMLElement < "u" && e instanceof HTMLElement ? (t.appendChild(e), this.placeholderContents = e) : (console.warn("Invalid placeholder provided, must be string or HTML Element", e), this.el = null);
      this.placeholder = t;
    }
  }
  //return containing element
  getElement() {
    return this.element;
  }
  //return table element
  getTableElement() {
    return this.tableElement;
  }
  initialize() {
    this.initializePlaceholder(), this.initializeRenderer(), this.element.appendChild(this.tableElement), this.firstRender = !0, this.element.addEventListener("scroll", () => {
      var e = this.element.scrollLeft, t = this.scrollLeft > e, i = this.element.scrollTop, s = this.scrollTop > i;
      this.scrollLeft != e && (this.scrollLeft = e, this.dispatch("scroll-horizontal", e, t), this.dispatchExternal("scrollHorizontal", e, t), this._positionPlaceholder()), this.scrollTop != i && (this.scrollTop = i, this.renderer.scrollRows(i, s), this.dispatch("scroll-vertical", i, s), this.dispatchExternal("scrollVertical", i, s));
    });
  }
  ////////////////// Row Manipulation //////////////////
  findRow(e) {
    if (typeof e == "object") {
      if (e instanceof re)
        return e;
      if (e instanceof Pt)
        return e._getSelf() || !1;
      if (typeof HTMLElement < "u" && e instanceof HTMLElement)
        return this.rows.find((i) => i.getElement() === e) || !1;
      if (e === null)
        return !1;
    } else return typeof e > "u" ? !1 : this.rows.find((i) => i.data[this.table.options.index] == e) || !1;
    return !1;
  }
  getRowFromDataObject(e) {
    var t = this.rows.find((i) => i.data === e);
    return t || !1;
  }
  getRowFromPosition(e) {
    return this.getDisplayRows().find((t) => t.type === "row" && t.getPosition() === e && t.isDisplayed());
  }
  scrollToRow(e, t, i) {
    return this.renderer.scrollToRowPosition(e, t, i);
  }
  ////////////////// Data Handling //////////////////
  setData(e, t, i) {
    return new Promise((s, n) => {
      t && this.getDisplayRows().length ? this.table.options.pagination ? this._setDataActual(e, !0) : this.reRenderInPosition(() => {
        this._setDataActual(e);
      }) : (this.table.options.autoColumns && i && this.table.initialized && this.table.columnManager.generateColumnsFromRowData(e), this.resetScroll(), this._setDataActual(e)), s();
    });
  }
  _setDataActual(e, t) {
    this.dispatchExternal("dataProcessing", e), this._wipeElements(), Array.isArray(e) ? (this.dispatch("data-processing", e), e.forEach((i, s) => {
      if (i && typeof i == "object") {
        var n = new re(i, this);
        this.rows.push(n);
      } else
        console.warn("Data Loading Warning - Invalid row data detected and ignored, expecting object but received:", i);
    }), this.refreshActiveData(!1, !1, t), this.dispatch("data-processed", e), this.dispatchExternal("dataProcessed", e)) : console.error(`Data Loading Error - Unable to process data due to invalid data type 
Expecting: array 
Received: `, typeof e, `
Data:     `, e);
  }
  _wipeElements() {
    this.dispatch("rows-wipe"), this.destroy(), this.adjustTableSize(), this.dispatch("rows-wiped");
  }
  destroy() {
    this.rows.forEach((e) => {
      e.wipe();
    }), this.rows = [], this.activeRows = [], this.activeRowsPipeline = [], this.activeRowsCount = 0, this.displayRows = [], this.displayRowsCount = 0;
  }
  deleteRow(e, t) {
    var i = this.rows.indexOf(e), s = this.activeRows.indexOf(e);
    s > -1 && this.activeRows.splice(s, 1), i > -1 && this.rows.splice(i, 1), this.setActiveRows(this.activeRows), this.displayRowIterator((n) => {
      var o = n.indexOf(e);
      o > -1 && n.splice(o, 1);
    }), t || this.reRenderInPosition(), this.regenerateRowPositions(), this.dispatchExternal("rowDeleted", e.getComponent()), this.displayRowsCount || this.tableEmpty(), this.subscribedExternal("dataChanged") && this.dispatchExternal("dataChanged", this.getData());
  }
  addRow(e, t, i, s) {
    var n = this.addRowActual(e, t, i, s);
    return n;
  }
  //add multiple rows
  addRows(e, t, i, s) {
    var n = [];
    return new Promise((o, r) => {
      t = this.findAddRowPos(t), Array.isArray(e) || (e = [e]), (typeof i > "u" && t || typeof i < "u" && !t) && e.reverse(), e.forEach((a, h) => {
        var d = this.addRow(a, t, i, !0);
        n.push(d), this.dispatch("row-added", d, a, t, i);
      }), this.refreshActiveData(s ? "displayPipeline" : !1, !1, !0), this.regenerateRowPositions(), this.displayRowsCount && this._clearPlaceholder(), o(n);
    });
  }
  findAddRowPos(e) {
    return typeof e > "u" && (e = this.table.options.addRowPos), e === "pos" && (e = !0), e === "bottom" && (e = !1), e;
  }
  addRowActual(e, t, i, s) {
    var n = e instanceof re ? e : new re(e || {}, this), o = this.findAddRowPos(t), r = -1, a, h;
    return i || (h = this.chain("row-adding-position", [n, o], null, { index: i, top: o }), i = h.index, o = h.top), typeof i < "u" && (i = this.findRow(i)), i = this.chain("row-adding-index", [n, i, o], null, i), i && (r = this.rows.indexOf(i)), i && r > -1 ? (a = this.activeRows.indexOf(i), this.displayRowIterator(function(d) {
      var u = d.indexOf(i);
      u > -1 && d.splice(o ? u : u + 1, 0, n);
    }), a > -1 && this.activeRows.splice(o ? a : a + 1, 0, n), this.rows.splice(o ? r : r + 1, 0, n)) : o ? (this.displayRowIterator(function(d) {
      d.unshift(n);
    }), this.activeRows.unshift(n), this.rows.unshift(n)) : (this.displayRowIterator(function(d) {
      d.push(n);
    }), this.activeRows.push(n), this.rows.push(n)), this.setActiveRows(this.activeRows), this.dispatchExternal("rowAdded", n.getComponent()), this.subscribedExternal("dataChanged") && this.dispatchExternal("dataChanged", this.table.rowManager.getData()), s || this.reRenderInPosition(), n;
  }
  moveRow(e, t, i) {
    this.dispatch("row-move", e, t, i), this.moveRowActual(e, t, i), this.regenerateRowPositions(), this.dispatch("row-moved", e, t, i), this.dispatchExternal("rowMoved", e.getComponent());
  }
  moveRowActual(e, t, i) {
    this.moveRowInArray(this.rows, e, t, i), this.moveRowInArray(this.activeRows, e, t, i), this.displayRowIterator((s) => {
      this.moveRowInArray(s, e, t, i);
    }), this.dispatch("row-moving", e, t, i);
  }
  moveRowInArray(e, t, i, s) {
    var n, o, r, a;
    if (t !== i && (n = e.indexOf(t), n > -1 && (e.splice(n, 1), o = e.indexOf(i), o > -1 ? s ? e.splice(o + 1, 0, t) : e.splice(o, 0, t) : e.splice(n, 0, t)), e === this.getDisplayRows())) {
      r = n < o ? n : o, a = o > n ? o : n + 1;
      for (let h = r; h <= a; h++)
        e[h] && this.styleRow(e[h], h);
    }
  }
  clearData() {
    this.setData([]);
  }
  getRowIndex(e) {
    return this.findRowIndex(e, this.rows);
  }
  getDisplayRowIndex(e) {
    var t = this.getDisplayRows().indexOf(e);
    return t > -1 ? t : !1;
  }
  nextDisplayRow(e, t) {
    var i = this.getDisplayRowIndex(e), s = !1;
    return i !== !1 && i < this.displayRowsCount - 1 && (s = this.getDisplayRows()[i + 1]), s && (!(s instanceof re) || s.type != "row") ? this.nextDisplayRow(s, t) : s;
  }
  prevDisplayRow(e, t) {
    var i = this.getDisplayRowIndex(e), s = !1;
    return i && (s = this.getDisplayRows()[i - 1]), t && s && (!(s instanceof re) || s.type != "row") ? this.prevDisplayRow(s, t) : s;
  }
  findRowIndex(e, t) {
    var i;
    return e = this.findRow(e), e && (i = t.indexOf(e), i > -1) ? i : !1;
  }
  getData(e, t) {
    var i = [], s = this.getRows(e);
    return s.forEach(function(n) {
      n.type == "row" && i.push(n.getData(t || "data"));
    }), i;
  }
  getComponents(e) {
    var t = [], i = this.getRows(e);
    return i.forEach(function(s) {
      t.push(s.getComponent());
    }), t;
  }
  getDataCount(e) {
    var t = this.getRows(e);
    return t.length;
  }
  scrollHorizontal(e) {
    this.scrollLeft = e, this.element.scrollLeft = e, this.dispatch("scroll-horizontal", e);
  }
  registerDataPipelineHandler(e, t) {
    typeof t < "u" ? (this.dataPipeline.push({ handler: e, priority: t }), this.dataPipeline.sort((i, s) => i.priority - s.priority)) : console.error("Data pipeline handlers must have a priority in order to be registered");
  }
  registerDisplayPipelineHandler(e, t) {
    typeof t < "u" ? (this.displayPipeline.push({ handler: e, priority: t }), this.displayPipeline.sort((i, s) => i.priority - s.priority)) : console.error("Display pipeline handlers must have a priority in order to be registered");
  }
  //set active data set
  refreshActiveData(e, t, i) {
    var s = this.table, n = "", o = 0, r = ["all", "dataPipeline", "display", "displayPipeline", "end"];
    if (!this.table.destroyed) {
      if (typeof e == "function")
        if (o = this.dataPipeline.findIndex((a) => a.handler === e), o > -1)
          n = "dataPipeline", t && (o == this.dataPipeline.length - 1 ? n = "display" : o++);
        else if (o = this.displayPipeline.findIndex((a) => a.handler === e), o > -1)
          n = "displayPipeline", t && (o == this.displayPipeline.length - 1 ? n = "end" : o++);
        else {
          console.error("Unable to refresh data, invalid handler provided", e);
          return;
        }
      else
        n = e || "all", o = 0;
      if (this.redrawBlock) {
        (!this.redrawBlockRestoreConfig || this.redrawBlockRestoreConfig && (this.redrawBlockRestoreConfig.stage === n && o < this.redrawBlockRestoreConfig.index || r.indexOf(n) < r.indexOf(this.redrawBlockRestoreConfig.stage))) && (this.redrawBlockRestoreConfig = {
          handler: e,
          skipStage: t,
          renderInPosition: i,
          stage: n,
          index: o
        });
        return;
      } else
        U.elVisible(this.element) ? i ? this.reRenderInPosition(this.refreshPipelines.bind(this, e, n, o, i)) : (this.refreshPipelines(e, n, o, i), e || this.table.columnManager.renderer.renderColumns(), this.renderTable(), s.options.layoutColumnsOnNewData && this.table.columnManager.redraw(!0)) : this.refreshPipelines(e, n, o, i), this.dispatch("data-refreshed");
    }
  }
  refreshPipelines(e, t, i, s) {
    switch (this.dispatch("data-refreshing"), (!e || !this.activeRowsPipeline[0]) && (this.activeRowsPipeline[0] = this.rows.slice(0)), t) {
      case "all":
      case "dataPipeline":
        for (let n = i; n < this.dataPipeline.length; n++) {
          let o = this.dataPipeline[n].handler(this.activeRowsPipeline[n].slice(0));
          this.activeRowsPipeline[n + 1] = o || this.activeRowsPipeline[n].slice(0);
        }
        this.setActiveRows(this.activeRowsPipeline[this.dataPipeline.length]);
      case "display":
        i = 0, this.resetDisplayRows();
      case "displayPipeline":
        for (let n = i; n < this.displayPipeline.length; n++) {
          let o = this.displayPipeline[n].handler((n ? this.getDisplayRows(n - 1) : this.activeRows).slice(0), s);
          this.setDisplayRows(o || this.getDisplayRows(n - 1).slice(0), n);
        }
      case "end":
        this.regenerateRowPositions();
    }
    this.getDisplayRows().length && this._clearPlaceholder();
  }
  //regenerate row positions
  regenerateRowPositions() {
    var e = this.getDisplayRows(), t = 1;
    e.forEach((i) => {
      i.type === "row" && (i.setPosition(t), t++);
    });
  }
  setActiveRows(e) {
    this.activeRows = this.activeRows = Object.assign([], e), this.activeRowsCount = this.activeRows.length;
  }
  //reset display rows array
  resetDisplayRows() {
    this.displayRows = [], this.displayRows.push(this.activeRows.slice(0)), this.displayRowsCount = this.displayRows[0].length;
  }
  //set display row pipeline data
  setDisplayRows(e, t) {
    this.displayRows[t] = e, t == this.displayRows.length - 1 && (this.displayRowsCount = this.displayRows[this.displayRows.length - 1].length);
  }
  getDisplayRows(e) {
    return typeof e > "u" ? this.displayRows.length ? this.displayRows[this.displayRows.length - 1] : [] : this.displayRows[e] || [];
  }
  getVisibleRows(e, t) {
    var i = Object.assign([], this.renderer.visibleRows(!t));
    return e && (i = this.chain("rows-visible", [t], i, i)), i;
  }
  //repeat action across display rows
  displayRowIterator(e) {
    this.activeRowsPipeline.forEach(e), this.displayRows.forEach(e), this.displayRowsCount = this.displayRows[this.displayRows.length - 1].length;
  }
  //return only actual rows (not group headers etc)
  getRows(e) {
    var t = [];
    switch (e) {
      case "active":
        t = this.activeRows;
        break;
      case "display":
        t = this.table.rowManager.getDisplayRows();
        break;
      case "visible":
        t = this.getVisibleRows(!1, !0);
        break;
      default:
        t = this.chain("rows-retrieve", e, null, this.rows) || this.rows;
    }
    return t;
  }
  ///////////////// Table Rendering /////////////////
  //trigger rerender of table in current position
  reRenderInPosition(e) {
    this.redrawBlock ? e ? e() : this.redrawBlockRenderInPosition = !0 : (this.dispatchExternal("renderStarted"), this.renderer.rerenderRows(e), this.fixedHeight || this.adjustTableSize(), this.scrollBarCheck(), this.dispatchExternal("renderComplete"));
  }
  scrollBarCheck() {
    var e = 0;
    this.element.scrollHeight > this.element.clientHeight && (e = this.element.offsetWidth - this.element.clientWidth), e !== this.scrollbarWidth && (this.scrollbarWidth = e, this.dispatch("scrollbar-vertical", e));
  }
  initializeRenderer() {
    var e, t = {
      virtual: Go,
      basic: Wo
    };
    typeof this.table.options.renderVertical == "string" ? e = t[this.table.options.renderVertical] : e = this.table.options.renderVertical, e ? (this.renderMode = this.table.options.renderVertical, this.renderer = new e(this.table, this.element, this.tableElement), this.renderer.initialize(), (this.table.element.clientHeight || this.table.options.height) && !(this.table.options.minHeight && this.table.options.maxHeight) ? this.fixedHeight = !0 : this.fixedHeight = !1) : console.error("Unable to find matching renderer:", this.table.options.renderVertical);
  }
  getRenderMode() {
    return this.renderMode;
  }
  renderTable() {
    this.dispatchExternal("renderStarted"), this.element.scrollTop = 0, this._clearTable(), this.displayRowsCount ? (this.renderer.renderRows(), this.firstRender && (this.firstRender = !1, this.fixedHeight || this.adjustTableSize(), this.layoutRefresh(!0))) : this.renderEmptyScroll(), this.fixedHeight || this.adjustTableSize(), this.dispatch("table-layout"), this.displayRowsCount || this._showPlaceholder(), this.scrollBarCheck(), this.dispatchExternal("renderComplete");
  }
  //show scrollbars on empty table div
  renderEmptyScroll() {
    this.placeholder ? this.tableElement.style.display = "none" : this.tableElement.style.minWidth = this.table.columnManager.getWidth() + "px";
  }
  _clearTable() {
    this._clearPlaceholder(), this.scrollTop = 0, this.scrollLeft = 0, this.renderer.clearRows();
  }
  tableEmpty() {
    this.renderEmptyScroll(), this._showPlaceholder();
  }
  checkPlaceholder() {
    this.displayRowsCount ? this._clearPlaceholder() : this.tableEmpty();
  }
  _showPlaceholder() {
    this.placeholder && (this.placeholder && this.placeholder.parentNode && this.placeholder.parentNode.removeChild(this.placeholder), this.initializePlaceholder(), this.placeholder.setAttribute("tabulator-render-mode", this.renderMode), this.getElement().appendChild(this.placeholder), this._positionPlaceholder(), this.adjustTableSize());
  }
  _clearPlaceholder() {
    this.placeholder && this.placeholder.parentNode && this.placeholder.parentNode.removeChild(this.placeholder), this.tableElement.style.minWidth = "", this.tableElement.style.display = "";
  }
  _positionPlaceholder() {
    this.placeholder && this.placeholder.parentNode && (this.placeholder.style.width = this.table.columnManager.getWidth() + "px", this.placeholderContents.style.width = this.table.rowManager.element.clientWidth + "px", this.placeholderContents.style.marginLeft = this.scrollLeft + "px");
  }
  styleRow(e, t) {
    var i = e.getElement();
    t % 2 ? (i.classList.add("tabulator-row-even"), i.classList.remove("tabulator-row-odd")) : (i.classList.add("tabulator-row-odd"), i.classList.remove("tabulator-row-even"));
  }
  //normalize height of active rows
  normalizeHeight(e) {
    this.activeRows.forEach(function(t) {
      t.normalizeHeight(e);
    });
  }
  //adjust the height of the table holder to fit in the Tabulator element
  adjustTableSize() {
    let e = this.element.clientHeight, t, i = !1;
    if (this.renderer.verticalFillMode === "fill") {
      let s = Math.floor(this.table.columnManager.getElement().getBoundingClientRect().height + (this.table.footerManager && this.table.footerManager.active && !this.table.footerManager.external ? this.table.footerManager.getElement().getBoundingClientRect().height : 0));
      if (this.fixedHeight) {
        t = isNaN(this.table.options.minHeight) ? this.table.options.minHeight : this.table.options.minHeight + "px";
        const n = "calc(100% - " + s + "px)";
        this.element.style.minHeight = t || "calc(100% - " + s + "px)", this.element.style.height = n, this.element.style.maxHeight = n;
      } else
        this.element.style.height = "", this.element.style.height = this.table.element.clientHeight - s + "px", this.element.scrollTop = this.scrollTop;
      this.renderer.resize(), !this.fixedHeight && e != this.element.clientHeight && (i = !0, this.subscribed("table-resize") ? this.dispatch("table-resize") : this.redraw()), this.scrollBarCheck();
    }
    return this._positionPlaceholder(), i;
  }
  //reinitialize all rows
  reinitialize() {
    this.rows.forEach(function(e) {
      e.reinitialize(!0);
    });
  }
  //prevent table from being redrawn
  blockRedraw() {
    this.redrawBlock = !0, this.redrawBlockRestoreConfig = !1;
  }
  //restore table redrawing
  restoreRedraw() {
    this.redrawBlock = !1, this.redrawBlockRestoreConfig ? (this.refreshActiveData(this.redrawBlockRestoreConfig.handler, this.redrawBlockRestoreConfig.skipStage, this.redrawBlockRestoreConfig.renderInPosition), this.redrawBlockRestoreConfig = !1) : this.redrawBlockRenderInPosition && this.reRenderInPosition(), this.redrawBlockRenderInPosition = !1;
  }
  //redraw table
  redraw(e) {
    this.adjustTableSize(), this.table.tableWidth = this.table.element.clientWidth, e ? this.renderTable() : (this.reRenderInPosition(), this.scrollHorizontal(this.scrollLeft));
  }
  resetScroll() {
    if (this.element.scrollLeft = 0, this.element.scrollTop = 0, this.table.browser === "ie") {
      var e = document.createEvent("Event");
      e.initEvent("scroll", !1, !0), this.element.dispatchEvent(e);
    } else
      this.element.dispatchEvent(new Event("scroll"));
  }
}
class jo extends ne {
  constructor(e) {
    super(e), this.active = !1, this.element = this.createElement(), this.containerElement = this.createContainerElement(), this.external = !1;
  }
  initialize() {
    this.initializeElement();
  }
  createElement() {
    var e = document.createElement("div");
    return e.classList.add("tabulator-footer"), e;
  }
  createContainerElement() {
    var e = document.createElement("div");
    return e.classList.add("tabulator-footer-contents"), this.element.appendChild(e), e;
  }
  initializeElement() {
    if (this.table.options.footerElement)
      switch (typeof this.table.options.footerElement) {
        case "string":
          this.table.options.footerElement[0] === "<" ? this.containerElement.innerHTML = this.table.options.footerElement : (this.external = !0, this.containerElement = document.querySelector(this.table.options.footerElement));
          break;
        default:
          this.element = this.table.options.footerElement;
          break;
      }
  }
  getElement() {
    return this.element;
  }
  append(e) {
    this.activate(), this.containerElement.appendChild(e), this.table.rowManager.adjustTableSize();
  }
  prepend(e) {
    this.activate(), this.element.insertBefore(e, this.element.firstChild), this.table.rowManager.adjustTableSize();
  }
  remove(e) {
    e.parentNode.removeChild(e), this.deactivate();
  }
  deactivate(e) {
    (!this.element.firstChild || e) && (this.external || this.element.parentNode.removeChild(this.element), this.active = !1);
  }
  activate() {
    this.active || (this.active = !0, this.external || (this.table.element.appendChild(this.getElement()), this.table.element.style.display = ""));
  }
  redraw() {
    this.dispatch("footer-redraw");
  }
}
class Uo extends ne {
  constructor(e) {
    super(e), this.el = null, this.abortClasses = ["tabulator-headers", "tabulator-table"], this.previousTargets = {}, this.listeners = [
      "click",
      "dblclick",
      "contextmenu",
      "mouseenter",
      "mouseleave",
      "mouseover",
      "mouseout",
      "mousemove",
      "mouseup",
      "mousedown",
      "touchstart",
      "touchend"
    ], this.componentMap = {
      "tabulator-cell": "cell",
      "tabulator-row": "row",
      "tabulator-group": "group",
      "tabulator-col": "column"
    }, this.pseudoTrackers = {
      row: {
        subscriber: null,
        target: null
      },
      cell: {
        subscriber: null,
        target: null
      },
      group: {
        subscriber: null,
        target: null
      },
      column: {
        subscriber: null,
        target: null
      }
    }, this.pseudoTracking = !1;
  }
  initialize() {
    this.el = this.table.element, this.buildListenerMap(), this.bindSubscriptionWatchers();
  }
  buildListenerMap() {
    var e = {};
    this.listeners.forEach((t) => {
      e[t] = {
        handler: null,
        components: []
      };
    }), this.listeners = e;
  }
  bindPseudoEvents() {
    Object.keys(this.pseudoTrackers).forEach((e) => {
      this.pseudoTrackers[e].subscriber = this.pseudoMouseEnter.bind(this, e), this.subscribe(e + "-mouseover", this.pseudoTrackers[e].subscriber);
    }), this.pseudoTracking = !0;
  }
  pseudoMouseEnter(e, t, i) {
    this.pseudoTrackers[e].target !== i && (this.pseudoTrackers[e].target && this.dispatch(e + "-mouseleave", t, this.pseudoTrackers[e].target), this.pseudoMouseLeave(e, t), this.pseudoTrackers[e].target = i, this.dispatch(e + "-mouseenter", t, i));
  }
  pseudoMouseLeave(e, t) {
    var i = Object.keys(this.pseudoTrackers), s = {
      row: ["cell"],
      cell: ["row"]
    };
    i = i.filter((n) => {
      var o = s[e];
      return n !== e && (!o || o && !o.includes(n));
    }), i.forEach((n) => {
      var o = this.pseudoTrackers[n].target;
      this.pseudoTrackers[n].target && (this.dispatch(n + "-mouseleave", t, o), this.pseudoTrackers[n].target = null);
    });
  }
  bindSubscriptionWatchers() {
    var e = Object.keys(this.listeners), t = Object.values(this.componentMap);
    for (let i of t)
      for (let s of e) {
        let n = i + "-" + s;
        this.subscriptionChange(n, this.subscriptionChanged.bind(this, i, s));
      }
    this.subscribe("table-destroy", this.clearWatchers.bind(this));
  }
  subscriptionChanged(e, t, i) {
    var s = this.listeners[t].components, n = s.indexOf(e), o = !1;
    i ? n === -1 && (s.push(e), o = !0) : this.subscribed(e + "-" + t) || n > -1 && (s.splice(n, 1), o = !0), (t === "mouseenter" || t === "mouseleave") && !this.pseudoTracking && this.bindPseudoEvents(), o && this.updateEventListeners();
  }
  updateEventListeners() {
    for (let e in this.listeners) {
      let t = this.listeners[e];
      t.components.length ? t.handler || (t.handler = this.track.bind(this, e), this.el.addEventListener(e, t.handler)) : t.handler && (this.el.removeEventListener(e, t.handler), t.handler = null);
    }
  }
  track(e, t) {
    var i = t.composedPath && t.composedPath() || t.path, s = this.findTargets(i);
    s = this.bindComponents(e, s), this.triggerEvents(e, t, s), this.pseudoTracking && (e == "mouseover" || e == "mouseleave") && !Object.keys(s).length && this.pseudoMouseLeave("none", t);
  }
  findTargets(e) {
    var t = {};
    let i = Object.keys(this.componentMap);
    for (let s of e) {
      let n = s.classList ? [...s.classList] : [];
      if (n.filter((a) => this.abortClasses.includes(a)).length)
        break;
      let r = n.filter((a) => i.includes(a));
      for (let a of r)
        t[this.componentMap[a]] || (t[this.componentMap[a]] = s);
    }
    return t.group && t.group === t.row && delete t.row, t;
  }
  bindComponents(e, t) {
    var i = Object.keys(t).reverse(), s = this.listeners[e], n = {}, o = {}, r = {};
    for (let a of i) {
      let h, d = t[a], u = this.previousTargets[a];
      if (u && u.target === d)
        h = u.component;
      else
        switch (a) {
          case "row":
          case "group":
            (s.components.includes("row") || s.components.includes("cell") || s.components.includes("group")) && (h = this.table.rowManager.getVisibleRows(!0).find((g) => g.getElement() === d), t.row && t.row.parentNode && t.row.parentNode.closest(".tabulator-row") && (t[a] = !1));
            break;
          case "column":
            s.components.includes("column") && (h = this.table.columnManager.findColumn(d));
            break;
          case "cell":
            s.components.includes("cell") && (n.row instanceof re ? h = n.row.findCell(d) : t.row && console.warn("Event Target Lookup Error - The row this cell is attached to cannot be found, has the table been reinitialized without being destroyed first?"));
            break;
        }
      h && (n[a] = h, r[a] = {
        target: d,
        component: h
      });
    }
    return this.previousTargets = r, Object.keys(t).forEach((a) => {
      let h = n[a];
      o[a] = h;
    }), o;
  }
  triggerEvents(e, t, i) {
    var s = this.listeners[e];
    for (let n in i)
      i[n] && s.components.includes(n) && this.dispatch(n + "-" + e, t, i[n]);
  }
  clearWatchers() {
    for (let e in this.listeners) {
      let t = this.listeners[e];
      t.handler && (this.el.removeEventListener(e, t.handler), t.handler = null);
    }
  }
}
class qo {
  constructor(e) {
    this.table = e, this.bindings = {};
  }
  bind(e, t, i) {
    this.bindings[e] || (this.bindings[e] = {}), this.bindings[e][t] ? console.warn("Unable to bind component handler, a matching function name is already bound", e, t, i) : this.bindings[e][t] = i;
  }
  handle(e, t, i) {
    if (this.bindings[e] && this.bindings[e][i] && typeof this.bindings[e][i].bind == "function")
      return this.bindings[e][i].bind(null, t);
    i !== "then" && typeof i == "string" && !i.startsWith("_") && this.table.options.debugInvalidComponentFuncs && console.error("The " + e + " component does not have a " + i + " function, have you checked that you have the correct Tabulator module installed?");
  }
}
class Ko extends ne {
  constructor(e) {
    super(e), this.requestOrder = 0, this.loading = !1;
  }
  initialize() {
  }
  load(e, t, i, s, n, o) {
    var r = ++this.requestOrder;
    if (this.table.destroyed)
      return Promise.resolve();
    if (this.dispatchExternal("dataLoading", e), e && (e.indexOf("{") == 0 || e.indexOf("[") == 0) && (e = JSON.parse(e)), this.confirm("data-loading", [e, t, i, n])) {
      this.loading = !0, n || this.alertLoader(), t = this.chain("data-params", [e, i, n], t || {}, t || {}), t = this.mapParams(t, this.table.options.dataSendParams);
      var a = this.chain("data-load", [e, t, i, n], !1, Promise.resolve([]));
      return a.then((h) => {
        if (this.table.destroyed)
          console.warn("Data Load Response Blocked - Table has been destroyed");
        else {
          !Array.isArray(h) && typeof h == "object" && (h = this.mapParams(h, this.objectInvert(this.table.options.dataReceiveParams)));
          var d = this.chain("data-loaded", [h], null, h);
          r == this.requestOrder ? (this.clearAlert(), d !== !1 && (this.dispatchExternal("dataLoaded", d), this.table.rowManager.setData(d, s, typeof o > "u" ? !s : o))) : console.warn("Data Load Response Blocked - An active data load request was blocked by an attempt to change table data while the request was being made");
        }
      }).catch((h) => {
        console.error("Data Load Error: ", h), this.dispatchExternal("dataLoadError", h), n || this.alertError(), setTimeout(() => {
          this.clearAlert();
        }, this.table.options.dataLoaderErrorTimeout);
      }).finally(() => {
        this.loading = !1;
      });
    } else
      return this.dispatchExternal("dataLoaded", e), e || (e = []), this.table.rowManager.setData(e, s, typeof o > "u" ? !s : o), Promise.resolve();
  }
  mapParams(e, t) {
    var i = {};
    for (let s in e)
      i[t.hasOwnProperty(s) ? t[s] : s] = e[s];
    return i;
  }
  objectInvert(e) {
    var t = {};
    for (let i in e)
      t[e[i]] = i;
    return t;
  }
  blockActiveLoad() {
    this.requestOrder++;
  }
  alertLoader() {
    var e = typeof this.table.options.dataLoader == "function" ? this.table.options.dataLoader() : this.table.options.dataLoader;
    e && this.table.alertManager.alert(this.table.options.dataLoaderLoading || this.langText("data|loading"));
  }
  alertError() {
    this.table.alertManager.alert(this.table.options.dataLoaderError || this.langText("data|error"), "error");
  }
  clearAlert() {
    this.table.alertManager.clear();
  }
}
class Xo {
  constructor(e, t, i) {
    this.table = e, this.events = {}, this.optionsList = t || {}, this.subscriptionNotifiers = {}, this.dispatch = i ? this._debugDispatch.bind(this) : this._dispatch.bind(this), this.debug = i;
  }
  subscriptionChange(e, t) {
    this.subscriptionNotifiers[e] || (this.subscriptionNotifiers[e] = []), this.subscriptionNotifiers[e].push(t), this.subscribed(e) && this._notifySubscriptionChange(e, !0);
  }
  subscribe(e, t) {
    this.events[e] || (this.events[e] = []), this.events[e].push(t), this._notifySubscriptionChange(e, !0);
  }
  unsubscribe(e, t) {
    var i;
    if (this.events[e])
      if (t)
        if (i = this.events[e].findIndex((s) => s === t), i > -1)
          this.events[e].splice(i, 1);
        else {
          console.warn("Cannot remove event, no matching event found:", e, t);
          return;
        }
      else
        delete this.events[e];
    else {
      console.warn("Cannot remove event, no events set on:", e);
      return;
    }
    this._notifySubscriptionChange(e, !1);
  }
  subscribed(e) {
    return this.events[e] && this.events[e].length;
  }
  _notifySubscriptionChange(e, t) {
    var i = this.subscriptionNotifiers[e];
    i && i.forEach((s) => {
      s(t);
    });
  }
  _dispatch() {
    var e = Array.from(arguments), t = e.shift(), i;
    return this.events[t] && this.events[t].forEach((s, n) => {
      let o = s.apply(this.table, e);
      n || (i = o);
    }), i;
  }
  _debugDispatch() {
    var e = Array.from(arguments), t = e[0];
    return e[0] = "ExternalEvent:" + e[0], (this.debug === !0 || this.debug.includes(t)) && console.log(...e), this._dispatch(...arguments);
  }
}
class Jo {
  constructor(e) {
    this.events = {}, this.subscriptionNotifiers = {}, this.dispatch = e ? this._debugDispatch.bind(this) : this._dispatch.bind(this), this.chain = e ? this._debugChain.bind(this) : this._chain.bind(this), this.confirm = e ? this._debugConfirm.bind(this) : this._confirm.bind(this), this.debug = e;
  }
  subscriptionChange(e, t) {
    this.subscriptionNotifiers[e] || (this.subscriptionNotifiers[e] = []), this.subscriptionNotifiers[e].push(t), this.subscribed(e) && this._notifySubscriptionChange(e, !0);
  }
  subscribe(e, t, i = 1e4) {
    this.events[e] || (this.events[e] = []), this.events[e].push({ callback: t, priority: i }), this.events[e].sort((s, n) => s.priority - n.priority), this._notifySubscriptionChange(e, !0);
  }
  unsubscribe(e, t) {
    var i;
    if (this.events[e]) {
      if (t)
        if (i = this.events[e].findIndex((s) => s.callback === t), i > -1)
          this.events[e].splice(i, 1);
        else {
          console.warn("Cannot remove event, no matching event found:", e, t);
          return;
        }
    } else {
      console.warn("Cannot remove event, no events set on:", e);
      return;
    }
    this._notifySubscriptionChange(e, !1);
  }
  subscribed(e) {
    return this.events[e] && this.events[e].length;
  }
  _chain(e, t, i, s) {
    var n = i;
    return Array.isArray(t) || (t = [t]), this.subscribed(e) ? (this.events[e].forEach((o, r) => {
      n = o.callback.apply(this, t.concat([n]));
    }), n) : typeof s == "function" ? s() : s;
  }
  _confirm(e, t) {
    var i = !1;
    return Array.isArray(t) || (t = [t]), this.subscribed(e) && this.events[e].forEach((s, n) => {
      s.callback.apply(this, t) && (i = !0);
    }), i;
  }
  _notifySubscriptionChange(e, t) {
    var i = this.subscriptionNotifiers[e];
    i && i.forEach((s) => {
      s(t);
    });
  }
  _dispatch() {
    var e = Array.from(arguments), t = e.shift();
    this.events[t] && this.events[t].forEach((i) => {
      i.callback.apply(this, e);
    });
  }
  _debugDispatch() {
    var e = Array.from(arguments), t = e[0];
    return e[0] = "InternalEvent:" + t, (this.debug === !0 || this.debug.includes(t)) && console.log(...e), this._dispatch(...arguments);
  }
  _debugChain() {
    var e = Array.from(arguments), t = e[0];
    return e[0] = "InternalEvent:" + t, (this.debug === !0 || this.debug.includes(t)) && console.log(...e), this._chain(...arguments);
  }
  _debugConfirm() {
    var e = Array.from(arguments), t = e[0];
    return e[0] = "InternalEvent:" + t, (this.debug === !0 || this.debug.includes(t)) && console.log(...e), this._confirm(...arguments);
  }
}
class Yo extends ne {
  constructor(e) {
    super(e);
  }
  _warnUser() {
    this.options("debugDeprecation") && console.warn(...arguments);
  }
  check(e, t, i) {
    var s = "";
    return typeof this.options(e) < "u" ? (s = "Deprecated Setup Option - Use of the %c" + e + "%c option is now deprecated", t ? (s = s + ", Please use the %c" + t + "%c option instead", this._warnUser(s, "font-weight: bold;", "font-weight: normal;", "font-weight: bold;", "font-weight: normal;"), i && (this.table.options[t] = this.table.options[e])) : this._warnUser(s, "font-weight: bold;", "font-weight: normal;"), !1) : !0;
  }
  checkMsg(e, t) {
    return typeof this.options(e) < "u" ? (this._warnUser("%cDeprecated Setup Option - Use of the %c" + e + " %c option is now deprecated, " + t, "font-weight: normal;", "font-weight: bold;", "font-weight: normal;"), !1) : !0;
  }
  msg(e) {
    this._warnUser(e);
  }
}
class Qo extends ne {
  constructor(e) {
    super(e), this.deps = {}, this.props = {};
  }
  initialize() {
    this.deps = Object.assign({}, this.options("dependencies"));
  }
  lookup(e, t, i) {
    if (Array.isArray(e)) {
      for (const n of e) {
        var s = this.lookup(n, t, !0);
        if (s)
          break;
      }
      if (s)
        return s;
      this.error(e);
    } else
      return t ? this.lookupProp(e, t, i) : this.lookupKey(e, i);
  }
  lookupProp(e, t, i) {
    var s;
    if (this.props[e] && this.props[e][t])
      return this.props[e][t];
    if (s = this.lookupKey(e, i), s)
      return this.props[e] || (this.props[e] = {}), this.props[e][t] = s[t] || s, this.props[e][t];
  }
  lookupKey(e, t) {
    var i;
    return this.deps[e] ? i = this.deps[e] : window[e] ? (this.deps[e] = window[e], i = this.deps[e]) : t || this.error(e), i;
  }
  error(e) {
    console.error("Unable to find dependency", e, "Please check documentation and ensure you have imported the required library into your project");
  }
}
function Zo(l, e) {
  e && this.table.columnManager.renderer.reinitializeColumnWidths(l), this.table.options.responsiveLayout && this.table.modExists("responsiveLayout", !0) && this.table.modules.responsiveLayout.update();
}
function Fi(l, e) {
  l.forEach(function(t) {
    t.reinitializeWidth();
  }), this.table.options.responsiveLayout && this.table.modExists("responsiveLayout", !0) && this.table.modules.responsiveLayout.update();
}
function er(l, e) {
  var t = 0, i = this.table.rowManager.element.clientWidth, s = 0, n = !1;
  l.forEach((o, r) => {
    o.widthFixed || o.reinitializeWidth(), (this.table.options.responsiveLayout ? o.modules.responsive.visible : o.visible) && (n = o), o.visible && (t += o.getWidth());
  }), n ? (s = i - t + n.getWidth(), this.table.options.responsiveLayout && this.table.modExists("responsiveLayout", !0) && (n.setWidth(0), this.table.modules.responsiveLayout.update()), s > 0 ? n.setWidth(s) : n.reinitializeWidth()) : this.table.options.responsiveLayout && this.table.modExists("responsiveLayout", !0) && this.table.modules.responsiveLayout.update();
}
function tr(l, e) {
  var t = this.table.rowManager.element.getBoundingClientRect().width, i = 0, s = 0, n = 0, o = 0, r = [], a = [], h = 0, d = 0, u = 0;
  function c(m) {
    var E;
    return typeof m == "string" ? m.indexOf("%") > -1 ? E = t / 100 * parseInt(m) : E = parseInt(m) : E = m, E;
  }
  function g(m, E, w, v) {
    var M = [], z = 0, P = 0, D = 0, V = n, oe = 0, q = 0, $ = [];
    function te(B) {
      return w * (B.column.definition.widthGrow || 1);
    }
    function ce(B) {
      return c(B.width) - w * (B.column.definition.widthShrink || 0);
    }
    return m.forEach(function(B, A) {
      var K = v ? ce(B) : te(B);
      B.column.minWidth >= K ? M.push(B) : B.column.maxWidth && B.column.maxWidth < K ? (B.width = B.column.maxWidth, E -= B.column.maxWidth, V -= v ? B.column.definition.widthShrink || 1 : B.column.definition.widthGrow || 1, V && (w = Math.floor(E / V))) : ($.push(B), q += v ? B.column.definition.widthShrink || 1 : B.column.definition.widthGrow || 1);
    }), M.length ? (M.forEach(function(B) {
      z += v ? B.width - B.column.minWidth : B.column.minWidth, B.width = B.column.minWidth;
    }), P = E - z, D = q ? Math.floor(P / q) : P, oe = g($, P, D, v)) : (oe = q ? E - Math.floor(E / q) * q : E, $.forEach(function(B) {
      B.width = v ? ce(B) : te(B);
    })), oe;
  }
  this.table.options.responsiveLayout && this.table.modExists("responsiveLayout", !0) && this.table.modules.responsiveLayout.update(), this.table.rowManager.element.scrollHeight > this.table.rowManager.element.clientHeight && (t -= this.table.rowManager.element.offsetWidth - this.table.rowManager.element.clientWidth), l.forEach(function(m) {
    var E, w, v;
    m.visible && (E = m.definition.width, w = parseInt(m.minWidth), E ? (v = c(E), i += v > w ? v : w, m.definition.widthShrink && (a.push({
      column: m,
      width: v > w ? v : w
    }), h += m.definition.widthShrink)) : (r.push({
      column: m,
      width: 0
    }), n += m.definition.widthGrow || 1));
  }), s = t - i, o = Math.floor(s / n), u = g(r, s, o, !1), r.length && u > 0 && (r[r.length - 1].width += u), r.forEach(function(m) {
    s -= m.width;
  }), d = Math.abs(u) + s, d > 0 && h && (u = g(a, d, Math.floor(d / h), !0)), u && a.length && (a[a.length - 1].width -= u), r.forEach(function(m) {
    m.column.setWidth(m.width);
  }), a.forEach(function(m) {
    m.column.setWidth(m.width);
  });
}
var ir = {
  fitData: Zo,
  fitDataFill: Fi,
  fitDataTable: Fi,
  fitDataStretch: er,
  fitColumns: tr
};
const lt = class lt extends O {
  constructor(e) {
    super(e, "layout"), this.mode = null, this.registerTableOption("layout", "fitData"), this.registerTableOption("layoutColumnsOnNewData", !1), this.registerColumnOption("widthGrow"), this.registerColumnOption("widthShrink");
  }
  //initialize layout system
  initialize() {
    var e = this.table.options.layout;
    lt.modes[e] ? this.mode = e : (console.warn("Layout Error - invalid mode set, defaulting to 'fitData' : " + e), this.mode = "fitData"), this.table.element.setAttribute("tabulator-layout", this.mode), this.subscribe("column-init", this.initializeColumn.bind(this));
  }
  initializeColumn(e) {
    e.definition.widthGrow && (e.definition.widthGrow = Number(e.definition.widthGrow)), e.definition.widthShrink && (e.definition.widthShrink = Number(e.definition.widthShrink));
  }
  getMode() {
    return this.mode;
  }
  //trigger table layout
  layout(e) {
    var t = this.table.columnManager.columnsByIndex.find((i) => i.definition.variableHeight || i.definition.formatter === "textarea");
    this.dispatch("layout-refreshing"), lt.modes[this.mode].call(this, this.table.columnManager.columnsByIndex, e), t && this.table.rowManager.normalizeHeight(!0), this.dispatch("layout-refreshed");
  }
};
x(lt, "moduleName", "layout"), //load defaults
x(lt, "modes", ir);
let ui = lt;
var sr = {
  default: {
    //hold default locale text
    groups: {
      item: "item",
      items: "items"
    },
    columns: {},
    data: {
      loading: "Loading",
      error: "Error"
    },
    pagination: {
      page_size: "Page Size",
      page_title: "Show Page",
      first: "First",
      first_title: "First Page",
      last: "Last",
      last_title: "Last Page",
      prev: "Prev",
      prev_title: "Prev Page",
      next: "Next",
      next_title: "Next Page",
      all: "All",
      counter: {
        showing: "Showing",
        of: "of",
        rows: "rows",
        pages: "pages"
      }
    },
    headerFilters: {
      default: "filter column...",
      columns: {}
    }
  }
};
const xt = class xt extends O {
  constructor(e) {
    super(e), this.locale = "default", this.lang = !1, this.bindings = {}, this.langList = {}, this.registerTableOption("locale", !1), this.registerTableOption("langs", {});
  }
  initialize() {
    this.langList = U.deepClone(xt.langs), this.table.options.columnDefaults.headerFilterPlaceholder !== !1 && this.setHeaderFilterPlaceholder(this.table.options.columnDefaults.headerFilterPlaceholder);
    for (let e in this.table.options.langs)
      this.installLang(e, this.table.options.langs[e]);
    this.setLocale(this.table.options.locale), this.registerTableFunction("setLocale", this.setLocale.bind(this)), this.registerTableFunction("getLocale", this.getLocale.bind(this)), this.registerTableFunction("getLang", this.getLang.bind(this));
  }
  //set header placeholder
  setHeaderFilterPlaceholder(e) {
    this.langList.default.headerFilters.default = e;
  }
  //setup a lang description object
  installLang(e, t) {
    this.langList[e] ? this._setLangProp(this.langList[e], t) : this.langList[e] = t;
  }
  _setLangProp(e, t) {
    for (let i in t)
      e[i] && typeof e[i] == "object" ? this._setLangProp(e[i], t[i]) : e[i] = t[i];
  }
  //set current locale
  setLocale(e) {
    e = e || "default";
    function t(i, s) {
      for (var n in i)
        typeof i[n] == "object" ? (s[n] || (s[n] = {}), t(i[n], s[n])) : s[n] = i[n];
    }
    if (e === !0 && navigator.language && (e = navigator.language.toLowerCase()), e && !this.langList[e]) {
      let i = e.split("-")[0];
      this.langList[i] ? (console.warn("Localization Error - Exact matching locale not found, using closest match: ", e, i), e = i) : (console.warn("Localization Error - Matching locale not found, using default: ", e), e = "default");
    }
    this.locale = e, this.lang = U.deepClone(this.langList.default || {}), e != "default" && t(this.langList[e], this.lang), this.dispatchExternal("localized", this.locale, this.lang), this._executeBindings();
  }
  //get current locale
  getLocale(e) {
    return this.locale;
  }
  //get lang object for given local or current if none provided
  getLang(e) {
    return e ? this.langList[e] : this.lang;
  }
  //get text for current locale
  getText(e, t) {
    var i = t ? e + "|" + t : e, s = i.split("|"), n = this._getLangElement(s, this.locale);
    return n || "";
  }
  //traverse langs object and find localized copy
  _getLangElement(e, t) {
    var i = this.lang;
    return e.forEach(function(s) {
      var n;
      i && (n = i[s], typeof n < "u" ? i = n : i = !1);
    }), i;
  }
  //set update binding
  bind(e, t) {
    this.bindings[e] || (this.bindings[e] = []), this.bindings[e].push(t), t(this.getText(e), this.lang);
  }
  //iterate through bindings and trigger updates
  _executeBindings() {
    for (let e in this.bindings)
      this.bindings[e].forEach((t) => {
        t(this.getText(e), this.lang);
      });
  }
};
x(xt, "moduleName", "localize"), //load defaults
x(xt, "langs", sr);
let ci = xt;
class ns extends O {
  constructor(e) {
    super(e);
  }
  initialize() {
    this.registerTableFunction("tableComms", this.receive.bind(this));
  }
  getConnections(e) {
    var t = [], i;
    return i = this.table.constructor.registry.lookupTable(e), i.forEach((s) => {
      this.table !== s && t.push(s);
    }), t;
  }
  send(e, t, i, s) {
    var n = this.getConnections(e);
    n.forEach((o) => {
      o.tableComms(this.table.element, t, i, s);
    }), !n.length && e && console.warn("Table Connection Error - No tables matching selector found", e);
  }
  receive(e, t, i, s) {
    if (this.table.modExists(t))
      return this.table.modules[t].commsReceived(e, i, s);
    console.warn("Inter-table Comms Error - no such module:", t);
  }
}
x(ns, "moduleName", "comms");
var nr = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  CommsModule: ns,
  LayoutModule: ui,
  LocalizeModule: ci
});
const me = class me {
  static findTable(e) {
    var t = me.registry.lookupTable(e, !0);
    return Array.isArray(t) && !t.length ? !1 : t;
  }
};
x(me, "registry", {
  tables: [],
  register(e) {
    me.registry.tables.push(e);
  },
  deregister(e) {
    var t = me.registry.tables.indexOf(e);
    t > -1 && me.registry.tables.splice(t, 1);
  },
  lookupTable(e, t) {
    var i = [], s, n;
    if (typeof e == "string") {
      if (s = document.querySelectorAll(e), s.length)
        for (var o = 0; o < s.length; o++)
          n = me.registry.matchElement(s[o]), n && i.push(n);
    } else typeof HTMLElement < "u" && e instanceof HTMLElement || e instanceof me ? (n = me.registry.matchElement(e), n && i.push(n)) : Array.isArray(e) ? e.forEach(function(r) {
      i = i.concat(me.registry.lookupTable(r));
    }) : t || console.warn("Table Connection Error - Invalid Selector", e);
    return i;
  },
  matchElement(e) {
    return me.registry.tables.find(function(t) {
      return e instanceof me ? t === e : t.element === e;
    });
  }
});
let fi = me;
const j = class j extends fi {
  constructor() {
    super();
  }
  static initializeModuleBinder(e) {
    j.modulesRegistered || (j.modulesRegistered = !0, j._registerModules(nr, !0), e && j._registerModules(e));
  }
  static _extendModule(e, t, i) {
    if (j.moduleBindings[e]) {
      var s = j.moduleBindings[e][t];
      if (s)
        if (typeof i == "object")
          for (let n in i)
            s[n] = i[n];
        else
          console.warn("Module Error - Invalid value type, it must be an object");
      else
        console.warn("Module Error - property does not exist:", t);
    } else
      console.warn("Module Error - module does not exist:", e);
  }
  static _registerModules(e, t) {
    var i = Object.values(e);
    t && i.forEach((s) => {
      s.prototype.moduleCore = !0;
    }), j._registerModule(i);
  }
  static _registerModule(e) {
    Array.isArray(e) || (e = [e]), e.forEach((t) => {
      j._registerModuleBinding(t), j._registerModuleExtensions(t);
    });
  }
  static _registerModuleBinding(e) {
    e.moduleName ? j.moduleBindings[e.moduleName] = e : console.error("Unable to bind module, no moduleName defined", e.moduleName);
  }
  static _registerModuleExtensions(e) {
    var t = e.moduleExtensions;
    if (e.moduleExtensions)
      for (let i in t) {
        let s = t[i];
        if (j.moduleBindings[i])
          for (let n in s)
            j._extendModule(i, n, s[n]);
        else {
          j.moduleExtensions[i] || (j.moduleExtensions[i] = {});
          for (let n in s)
            j.moduleExtensions[i][n] || (j.moduleExtensions[i][n] = {}), Object.assign(j.moduleExtensions[i][n], s[n]);
        }
      }
    j._extendModuleFromQueue(e);
  }
  static _extendModuleFromQueue(e) {
    var t = j.moduleExtensions[e.moduleName];
    if (t)
      for (let i in t)
        j._extendModule(e.moduleName, i, t[i]);
  }
  //ensure that module are bound to instantiated function
  _bindModules() {
    var e = [], t = [], i = [];
    this.modules = {};
    for (var s in j.moduleBindings) {
      let n = j.moduleBindings[s], o = new n(this);
      this.modules[s] = o, n.prototype.moduleCore ? this.modulesCore.push(o) : n.moduleInitOrder ? n.moduleInitOrder < 0 ? e.push(o) : t.push(o) : i.push(o);
    }
    e.sort((n, o) => n.moduleInitOrder > o.moduleInitOrder ? 1 : -1), t.sort((n, o) => n.moduleInitOrder > o.moduleInitOrder ? 1 : -1), this.modulesRegular = e.concat(i.concat(t));
  }
};
x(j, "moduleBindings", {}), x(j, "moduleExtensions", {}), x(j, "modulesRegistered", !1), x(j, "defaultModules", !1);
let pi = j;
class or extends ne {
  constructor(e) {
    super(e), this.element = this._createAlertElement(), this.msgElement = this._createMsgElement(), this.type = null, this.element.appendChild(this.msgElement);
  }
  _createAlertElement() {
    var e = document.createElement("div");
    return e.classList.add("tabulator-alert"), e;
  }
  _createMsgElement() {
    var e = document.createElement("div");
    return e.classList.add("tabulator-alert-msg"), e.setAttribute("role", "alert"), e;
  }
  _typeClass() {
    return "tabulator-alert-state-" + this.type;
  }
  alert(e, t = "msg") {
    if (e) {
      for (this.clear(), this.dispatch("alert-show", t), this.type = t; this.msgElement.firstChild; ) this.msgElement.removeChild(this.msgElement.firstChild);
      this.msgElement.classList.add(this._typeClass()), typeof e == "function" && (e = e()), e instanceof HTMLElement ? this.msgElement.appendChild(e) : this.msgElement.innerHTML = e, this.table.element.appendChild(this.element);
    }
  }
  clear() {
    this.dispatch("alert-hide", this.type), this.element.parentNode && this.element.parentNode.removeChild(this.element), this.msgElement.classList.remove(this._typeClass());
  }
}
const Pe = class Pe extends pi {
  static extendModule() {
    Pe.initializeModuleBinder(), Pe._extendModule(...arguments);
  }
  static registerModule() {
    Pe.initializeModuleBinder(), Pe._registerModule(...arguments);
  }
  constructor(e, t, i) {
    super(), Pe.initializeModuleBinder(i), this.options = {}, this.columnManager = null, this.rowManager = null, this.footerManager = null, this.alertManager = null, this.vdomHoz = null, this.externalEvents = null, this.eventBus = null, this.interactionMonitor = !1, this.browser = "", this.browserSlow = !1, this.browserMobile = !1, this.rtl = !1, this.originalElement = null, this.componentFunctionBinder = new qo(this), this.dataLoader = !1, this.modules = {}, this.modulesCore = [], this.modulesRegular = [], this.deprecationAdvisor = new Yo(this), this.optionsList = new ss(this, "table constructor"), this.dependencyRegistry = new Qo(this), this.initialized = !1, this.destroyed = !1, this.initializeElement(e) && (this.initializeCoreSystems(t), setTimeout(() => {
      this._create();
    })), this.constructor.registry.register(this);
  }
  initializeElement(e) {
    return typeof HTMLElement < "u" && e instanceof HTMLElement ? (this.element = e, !0) : typeof e == "string" ? (this.element = document.querySelector(e), this.element ? !0 : (console.error("Tabulator Creation Error - no element found matching selector: ", e), !1)) : (console.error("Tabulator Creation Error - Invalid element provided:", e), !1);
  }
  initializeCoreSystems(e) {
    this.columnManager = new Io(this), this.rowManager = new $o(this), this.footerManager = new jo(this), this.dataLoader = new Ko(this), this.alertManager = new or(this), this._bindModules(), this.options = this.optionsList.generate(Pe.defaultOptions, e), this._clearObjectPointers(), this._mapDeprecatedFunctionality(), this.externalEvents = new Xo(this, this.options, this.options.debugEventsExternal), this.eventBus = new Jo(this.options.debugEventsInternal), this.interactionMonitor = new Uo(this), this.dataLoader.initialize(), this.footerManager.initialize(), this.dependencyRegistry.initialize();
  }
  //convert deprecated functionality to new functions
  _mapDeprecatedFunctionality() {
  }
  _clearSelection() {
    this.element.classList.add("tabulator-block-select"), window.getSelection ? window.getSelection().empty ? window.getSelection().empty() : window.getSelection().removeAllRanges && window.getSelection().removeAllRanges() : document.selection && document.selection.empty(), this.element.classList.remove("tabulator-block-select");
  }
  //create table
  _create() {
    this.externalEvents.dispatch("tableBuilding"), this.eventBus.dispatch("table-building"), this._rtlCheck(), this._buildElement(), this._initializeTable(), this.initialized = !0, this._loadInitialData().finally(() => {
      this.eventBus.dispatch("table-initialized"), this.externalEvents.dispatch("tableBuilt");
    });
  }
  _rtlCheck() {
    var e = window.getComputedStyle(this.element);
    switch (this.options.textDirection) {
      case "auto":
        if (e.direction !== "rtl")
          break;
      case "rtl":
        this.element.classList.add("tabulator-rtl"), this.rtl = !0;
        break;
      case "ltr":
        this.element.classList.add("tabulator-ltr");
      default:
        this.rtl = !1;
    }
  }
  //clear pointers to objects in default config object
  _clearObjectPointers() {
    this.options.columns = this.options.columns.slice(0), Array.isArray(this.options.data) && !this.options.reactiveData && (this.options.data = this.options.data.slice(0));
  }
  //build tabulator element
  _buildElement() {
    var e = this.element, t = this.options, i;
    if (e.tagName === "TABLE") {
      this.originalElement = this.element, i = document.createElement("div");
      var s = e.attributes;
      for (var n in s)
        typeof s[n] == "object" && i.setAttribute(s[n].name, s[n].value);
      e.parentNode.replaceChild(i, e), this.element = e = i;
    }
    for (e.classList.add("tabulator"), e.setAttribute("role", "grid"); e.firstChild; ) e.removeChild(e.firstChild);
    t.height && (t.height = isNaN(t.height) ? t.height : t.height + "px", e.style.height = t.height), t.minHeight !== !1 && (t.minHeight = isNaN(t.minHeight) ? t.minHeight : t.minHeight + "px", e.style.minHeight = t.minHeight), t.maxHeight !== !1 && (t.maxHeight = isNaN(t.maxHeight) ? t.maxHeight : t.maxHeight + "px", e.style.maxHeight = t.maxHeight);
  }
  //initialize core systems and modules
  _initializeTable() {
    var e = this.element, t = this.options;
    this.interactionMonitor.initialize(), this.columnManager.initialize(), this.rowManager.initialize(), this._detectBrowser(), this.modulesCore.forEach((i) => {
      i.initialize();
    }), e.appendChild(this.columnManager.getElement()), e.appendChild(this.rowManager.getElement()), t.footerElement && this.footerManager.activate(), t.autoColumns && t.data && this.columnManager.generateColumnsFromRowData(this.options.data), this.modulesRegular.forEach((i) => {
      i.initialize();
    }), this.columnManager.setColumns(t.columns), this.eventBus.dispatch("table-built");
  }
  _loadInitialData() {
    return this.dataLoader.load(this.options.data).finally(() => {
      this.columnManager.verticalAlignHeaders();
    });
  }
  //deconstructor
  destroy() {
    var e = this.element;
    for (this.destroyed = !0, this.constructor.registry.deregister(this), this.eventBus.dispatch("table-destroy"), this.rowManager.destroy(); e.firstChild; ) e.removeChild(e.firstChild);
    e.classList.remove("tabulator"), this.externalEvents.dispatch("tableDestroyed");
  }
  _detectBrowser() {
    var e = navigator.userAgent || navigator.vendor || window.opera;
    e.indexOf("Trident") > -1 ? (this.browser = "ie", this.browserSlow = !0) : e.indexOf("Edge") > -1 ? (this.browser = "edge", this.browserSlow = !0) : e.indexOf("Firefox") > -1 ? (this.browser = "firefox", this.browserSlow = !1) : e.indexOf("Mac OS") > -1 ? (this.browser = "safari", this.browserSlow = !1) : (this.browser = "other", this.browserSlow = !1), this.browserMobile = /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(e) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw-(n|u)|c55\/|capi|ccwa|cdm-|cell|chtm|cldc|cmd-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc-s|devi|dica|dmob|do(c|p)o|ds(12|-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(-|_)|g1 u|g560|gene|gf-5|g-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd-(m|p|t)|hei-|hi(pt|ta)|hp( i|ip)|hs-c|ht(c(-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i-(20|go|ma)|i230|iac( |-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|-[a-w])|libw|lynx|m1-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|-([1-8]|c))|phil|pire|pl(ay|uc)|pn-2|po(ck|rt|se)|prox|psio|pt-g|qa-a|qc(07|12|21|32|60|-[2-7]|i-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h-|oo|p-)|sdk\/|se(c(-|0|1)|47|mc|nd|ri)|sgh-|shar|sie(-|m)|sk-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h-|v-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl-|tdg-|tel(i|m)|tim-|t-mo|to(pl|sh)|ts(70|m-|m3|m5)|tx-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas-|your|zeto|zte-/i.test(e.slice(0, 4));
  }
  initGuard(e, t) {
    var i, s;
    return this.options.debugInitialization && !this.initialized && (e || (i = new Error().stack.split(`
`), s = i[0] == "Error" ? i[2] : i[1], s[0] == " " ? e = s.trim().split(" ")[1].split(".")[1] : e = s.trim().split("@")[0]), console.warn("Table Not Initialized - Calling the " + e + " function before the table is initialized may result in inconsistent behavior, Please wait for the `tableBuilt` event before calling this function." + (t ? " " + t : ""))), this.initialized;
  }
  ////////////////// Data Handling //////////////////
  //block table redrawing
  blockRedraw() {
    this.initGuard(), this.eventBus.dispatch("redraw-blocking"), this.rowManager.blockRedraw(), this.columnManager.blockRedraw(), this.eventBus.dispatch("redraw-blocked");
  }
  //restore table redrawing
  restoreRedraw() {
    this.initGuard(), this.eventBus.dispatch("redraw-restoring"), this.rowManager.restoreRedraw(), this.columnManager.restoreRedraw(), this.eventBus.dispatch("redraw-restored");
  }
  //load data
  setData(e, t, i) {
    return this.initGuard(!1, "To set initial data please use the 'data' property in the table constructor."), this.dataLoader.load(e, t, i, !1);
  }
  //clear data
  clearData() {
    this.initGuard(), this.dataLoader.blockActiveLoad(), this.rowManager.clearData();
  }
  //get table data array
  getData(e) {
    return this.rowManager.getData(e);
  }
  //get table data array count
  getDataCount(e) {
    return this.rowManager.getDataCount(e);
  }
  //replace data, keeping table in position with same sort
  replaceData(e, t, i) {
    return this.initGuard(), this.dataLoader.load(e, t, i, !0, !0);
  }
  //update table data
  updateData(e) {
    var t = 0;
    return this.initGuard(), new Promise((i, s) => {
      this.dataLoader.blockActiveLoad(), typeof e == "string" && (e = JSON.parse(e)), e && e.length > 0 ? e.forEach((n) => {
        var o = this.rowManager.findRow(n[this.options.index]);
        o ? (t++, o.updateData(n).then(() => {
          t--, t || i();
        }).catch((r) => {
          s("Update Error - Unable to update row", n, r);
        })) : s("Update Error - Unable to find row", n);
      }) : (console.warn("Update Error - No data provided"), s("Update Error - No data provided"));
    });
  }
  addData(e, t, i) {
    return this.initGuard(), new Promise((s, n) => {
      this.dataLoader.blockActiveLoad(), typeof e == "string" && (e = JSON.parse(e)), e ? this.rowManager.addRows(e, t, i).then((o) => {
        var r = [];
        o.forEach(function(a) {
          r.push(a.getComponent());
        }), s(r);
      }) : (console.warn("Update Error - No data provided"), n("Update Error - No data provided"));
    });
  }
  //update table data
  updateOrAddData(e) {
    var t = [], i = 0;
    return this.initGuard(), new Promise((s, n) => {
      this.dataLoader.blockActiveLoad(), typeof e == "string" && (e = JSON.parse(e)), e && e.length > 0 ? e.forEach((o) => {
        var r = this.rowManager.findRow(o[this.options.index]);
        i++, r ? r.updateData(o).then(() => {
          i--, t.push(r.getComponent()), i || s(t);
        }) : this.rowManager.addRows(o).then((a) => {
          i--, t.push(a[0].getComponent()), i || s(t);
        });
      }) : (console.warn("Update Error - No data provided"), n("Update Error - No data provided"));
    });
  }
  //get row object
  getRow(e) {
    var t = this.rowManager.findRow(e);
    return t ? t.getComponent() : (console.warn("Find Error - No matching row found:", e), !1);
  }
  //get row object
  getRowFromPosition(e) {
    var t = this.rowManager.getRowFromPosition(e);
    return t ? t.getComponent() : (console.warn("Find Error - No matching row found:", e), !1);
  }
  //delete row from table
  deleteRow(e) {
    var t = [];
    this.initGuard(), Array.isArray(e) || (e = [e]);
    for (let i of e) {
      let s = this.rowManager.findRow(i, !0);
      if (s)
        t.push(s);
      else
        return console.error("Delete Error - No matching row found:", i), Promise.reject("Delete Error - No matching row found");
    }
    return t.sort((i, s) => this.rowManager.rows.indexOf(i) > this.rowManager.rows.indexOf(s) ? 1 : -1), t.forEach((i) => {
      i.delete();
    }), this.rowManager.reRenderInPosition(), Promise.resolve();
  }
  //add row to table
  addRow(e, t, i) {
    return this.initGuard(), typeof e == "string" && (e = JSON.parse(e)), this.rowManager.addRows(e, t, i, !0).then((s) => s[0].getComponent());
  }
  //update a row if it exists otherwise create it
  updateOrAddRow(e, t) {
    var i = this.rowManager.findRow(e);
    return this.initGuard(), typeof t == "string" && (t = JSON.parse(t)), i ? i.updateData(t).then(() => i.getComponent()) : this.rowManager.addRows(t).then((s) => s[0].getComponent());
  }
  //update row data
  updateRow(e, t) {
    var i = this.rowManager.findRow(e);
    return this.initGuard(), typeof t == "string" && (t = JSON.parse(t)), i ? i.updateData(t).then(() => Promise.resolve(i.getComponent())) : (console.warn("Update Error - No matching row found:", e), Promise.reject("Update Error - No matching row found"));
  }
  //scroll to row in DOM
  scrollToRow(e, t, i) {
    var s = this.rowManager.findRow(e);
    return s ? this.rowManager.scrollToRow(s, t, i) : (console.warn("Scroll Error - No matching row found:", e), Promise.reject("Scroll Error - No matching row found"));
  }
  moveRow(e, t, i) {
    var s = this.rowManager.findRow(e);
    this.initGuard(), s ? s.moveToRow(t, i) : console.warn("Move Error - No matching row found:", e);
  }
  getRows(e) {
    return this.rowManager.getComponents(e);
  }
  //get position of row in table
  getRowPosition(e) {
    var t = this.rowManager.findRow(e);
    return t ? t.getPosition() : (console.warn("Position Error - No matching row found:", e), !1);
  }
  /////////////// Column Functions  ///////////////
  setColumns(e) {
    this.initGuard(!1, "To set initial columns please use the 'columns' property in the table constructor"), this.columnManager.setColumns(e);
  }
  getColumns(e) {
    return this.columnManager.getComponents(e);
  }
  getColumn(e) {
    var t = this.columnManager.findColumn(e);
    return t ? t.getComponent() : (console.warn("Find Error - No matching column found:", e), !1);
  }
  getColumnDefinitions() {
    return this.columnManager.getDefinitionTree();
  }
  showColumn(e) {
    var t = this.columnManager.findColumn(e);
    if (this.initGuard(), t)
      t.show();
    else
      return console.warn("Column Show Error - No matching column found:", e), !1;
  }
  hideColumn(e) {
    var t = this.columnManager.findColumn(e);
    if (this.initGuard(), t)
      t.hide();
    else
      return console.warn("Column Hide Error - No matching column found:", e), !1;
  }
  toggleColumn(e) {
    var t = this.columnManager.findColumn(e);
    if (this.initGuard(), t)
      t.visible ? t.hide() : t.show();
    else
      return console.warn("Column Visibility Toggle Error - No matching column found:", e), !1;
  }
  addColumn(e, t, i) {
    var s = this.columnManager.findColumn(i);
    return this.initGuard(), this.columnManager.addColumn(e, t, s).then((n) => n.getComponent());
  }
  deleteColumn(e) {
    var t = this.columnManager.findColumn(e);
    return this.initGuard(), t ? t.delete() : (console.warn("Column Delete Error - No matching column found:", e), Promise.reject());
  }
  updateColumnDefinition(e, t) {
    var i = this.columnManager.findColumn(e);
    return this.initGuard(), i ? i.updateDefinition(t) : (console.warn("Column Update Error - No matching column found:", e), Promise.reject());
  }
  moveColumn(e, t, i) {
    var s = this.columnManager.findColumn(e), n = this.columnManager.findColumn(t);
    this.initGuard(), s ? n ? this.columnManager.moveColumn(s, n, i) : console.warn("Move Error - No matching column found:", n) : console.warn("Move Error - No matching column found:", e);
  }
  //scroll to column in DOM
  scrollToColumn(e, t, i) {
    return new Promise((s, n) => {
      var o = this.columnManager.findColumn(e);
      return o ? this.columnManager.scrollToColumn(o, t, i) : (console.warn("Scroll Error - No matching column found:", e), Promise.reject("Scroll Error - No matching column found"));
    });
  }
  //////////// General Public Functions ////////////
  //redraw list without updating data
  redraw(e) {
    this.initGuard(), this.columnManager.redraw(e), this.rowManager.redraw(e);
  }
  setHeight(e) {
    this.options.height = isNaN(e) ? e : e + "px", this.element.style.height = this.options.height, this.rowManager.initializeRenderer(), this.rowManager.redraw(!0);
  }
  //////////////////// Event Bus ///////////////////
  on(e, t) {
    this.externalEvents.subscribe(e, t);
  }
  off(e, t) {
    this.externalEvents.unsubscribe(e, t);
  }
  dispatchEvent() {
    var e = Array.from(arguments);
    e.shift(), this.externalEvents.dispatch(...arguments);
  }
  //////////////////// Alerts ///////////////////
  alert(e, t) {
    this.initGuard(), this.alertManager.alert(e, t);
  }
  clearAlert() {
    this.initGuard(), this.alertManager.clear();
  }
  ////////////// Extension Management //////////////
  modExists(e, t) {
    return this.modules[e] ? !0 : (t && console.error("Tabulator Module Not Installed: " + e), !1);
  }
  module(e) {
    var t = this.modules[e];
    return t || console.error("Tabulator module not installed: " + e), t;
  }
};
//default setup options
x(Pe, "defaultOptions", Bo);
let mi = Pe;
var wt = mi;
class rr extends wt {
  static extendModule() {
    wt.initializeModuleBinder(Wt), wt._extendModule(...arguments);
  }
  static registerModule() {
    wt.initializeModuleBinder(Wt), wt._registerModule(...arguments);
  }
  constructor(e, t, i) {
    super(e, t, Wt);
  }
}
var gi = rr;
function ar(l) {
  const e = F(null), t = F(null), i = F(!1), s = F(!1);
  function n() {
    if (!e.value || !l.data.value) {
      console.log("⚠️ Cannot initialize: tableDiv or data missing");
      return;
    }
    if (e.value.offsetParent === null) {
      console.log("⚠️ Table div is not visible, skipping initialization");
      return;
    }
    if (t.value) {
      try {
        t.value.destroy(), console.log("🗑️ Destroyed existing tabulator");
      } catch (o) {
        console.warn("Error destroying tabulator:", o);
      }
      t.value = null;
    }
    i.value = !1, console.log("🚀 Initializing Tabulator with", l.data.value.length, "rows");
    try {
      const o = {
        data: l.data.value,
        layout: l.layout || "fitColumns",
        // Remove fixed height - let it auto-size based on content
        resizableColumns: !0,
        placeholder: l.placeholder || "No data available",
        headerSortElement: "<span></span>",
        columns: l.columns,
        reactiveData: !0,
        // Add these for better auto-sizing
        layoutColumnsOnNewData: !0,
        autoResize: !0
      };
      l.rowFormatter && (o.rowFormatter = l.rowFormatter), t.value = new gi(e.value, o), i.value = !0, s.value = !0, console.log("✅ Tabulator initialized successfully");
    } catch (o) {
      console.error("❌ Error creating Tabulator:", o);
    }
  }
  return He([() => l.isSuccess.value, e], async ([o, r]) => {
    var a;
    console.log("👀 Watch triggered - isSuccess:", o, "divRef:", !!r, "isTableInitialized:", s.value), o && r && !s.value && (await zt(), r.offsetParent !== null ? (console.log("🎯 Conditions met, initializing table with", (a = l.data.value) == null ? void 0 : a.length, "rows"), n()) : (console.log("⏸️ Element not visible yet, will retry"), setTimeout(() => {
      r.offsetParent !== null && !s.value && (console.log("🚀 Initializing after visibility check"), n());
    }, 100)));
  }, { immediate: !0 }), He(() => l.data.value, async (o) => {
    if (!(!t.value || !o)) {
      console.log("🔄 Data changed, updating table with", o.length, "rows");
      try {
        await zt(), t.value.setData(o);
      } catch (r) {
        console.warn("Error updating table data:", r), n();
      }
    }
  }, { deep: !0 }), zi(() => {
    console.log("👋 Cleaning up tabulator"), t.value && t.value.destroy();
  }), {
    tableDiv: e,
    tabulator: t,
    isTabulatorReady: i,
    isTableInitialized: s,
    initializeTabulator: n
  };
}
function lr(l, e) {
  const t = Tt(), i = F(null), s = F(!1), n = F(null), o = async (a) => {
    s.value = !0, n.value = null;
    try {
      let h = t.schema("hf").from("market_price").select("symbol, conid, market_price, week_52_high, week_52_low, pe_ratio, eps, market_cap, computed_peg_ratio, last_fetched_at");
      if (a && a > 0)
        console.log(`🔍 Fetching market price for conid: ${a}`), h = h.eq("conid", a);
      else if (e)
        console.log(`🔍 Fetching market price for symbol: ${e}`), h = h.eq("symbol", e);
      else {
        console.log("⚠️ No conid or symbolRoot available"), i.value = null, n.value = "No conid or symbol provided";
        return;
      }
      const { data: d, error: u } = await h.order("id", { ascending: !1 }).limit(1).single();
      if (u)
        throw new Error(`Database error: ${u.message}`);
      if (d)
        i.value = d, console.log(`✅ Market price fetched: $${d.market_price} for ${d.symbol}`);
      else {
        i.value = null;
        const c = a ? `conid: ${a}` : `symbol: ${e}`;
        console.log(`⚠️ No market price found for ${c}`);
      }
    } catch (h) {
      n.value = h instanceof Error ? h.message : "Failed to fetch market price", console.error("❌ Error fetching market price:", h), i.value = null;
    } finally {
      s.value = !1;
    }
  };
  return He(
    l,
    (a) => {
      a && a > 0 ? (console.log(`🎯 Conid changed to: ${a}, fetching price...`), o(a)) : e ? (console.log(`🎯 No conid available, using symbolRoot: ${e}`), o(null)) : (console.log("⚠️ No valid conid or symbolRoot available"), i.value = null, n.value = null);
    },
    { immediate: !0 }
  ), {
    marketData: i,
    isLoading: s,
    error: n,
    refetch: () => {
      l.value && l.value > 0 ? o(l.value) : e && o(null);
    }
  };
}
function hr(l, e) {
  const t = Tt(), i = F(null), s = F(!1), n = F(null), o = async (a) => {
    s.value = !0, n.value = null;
    try {
      let h = t.schema("hf").from("financial_data").select("symbol, conid, week_52_high, week_52_low, pe_ratio, eps, market_cap, computed_peg_ratio, last_updated_at");
      if (a && a > 0)
        h = h.eq("conid", a);
      else if (e)
        console.log(`🔍 Fetching financial data for symbol: ${e}`), h = h.eq("symbol", e);
      else {
        console.log("⚠️ No conid or symbolRoot available"), i.value = null, n.value = "No conid or symbol provided";
        return;
      }
      const { data: d, error: u } = await h.order("id", { ascending: !1 }).limit(1).single();
      if (u)
        throw new Error(`Database error: ${u.message}`);
      if (d)
        i.value = d, console.log(`✅ Financial data fetched for ${d.symbol}`);
      else {
        i.value = null;
        const c = a ? `conid: ${a}` : `symbol: ${e}`;
        console.log(`⚠️ No financial data found for ${c}`);
      }
    } catch (h) {
      n.value = h instanceof Error ? h.message : "Failed to fetch financial data", console.error("❌ Error fetching financial data:", h), i.value = null;
    } finally {
      s.value = !1;
    }
  };
  return He(
    l,
    (a) => {
      a && a > 0 ? (console.log(`🎯 Conid changed to: ${a}, fetching price...`), o(a)) : e ? (console.log(`🎯 No conid available, using symbolRoot: ${e}`), o(null)) : (console.log("⚠️ No valid conid or symbolRoot available"), i.value = null, n.value = null);
    },
    { immediate: !0 }
  ), {
    financialData: i,
    isLoading: s,
    error: n,
    refetch: () => {
      l.value && l.value > 0 ? o(l.value) : e && o(null);
    }
  };
}
function dr(l, e) {
  const t = Tt(), i = F(null), s = F(0), n = F(0), o = F(0), r = F(0), a = F([]), h = F([]), d = F(!1), u = F(null), c = F([]), g = Y(() => {
    if (h.value.length === 0) return null;
    const E = h.value.reduce((v, M) => v + M.netCostExcludingPuts, 0), w = h.value.reduce((v, M) => v + M.mainPosition.quantity, 0);
    return console.log(`🔢 Calculating overall adjusted average: Total Net Cost = $${E}, Total Main Qty = ${w}`), w > 0 ? E / w : null;
  }), m = async () => {
    if (!l.value || l.value.length === 0 || !e) {
      i.value = null;
      return;
    }
    d.value = !0, u.value = null;
    try {
      console.log("📊 Calculating average cost price for positions:", l.value.length);
      const E = l.value.map(
        (A) => _t({
          internal_account_id: A.internal_account_id,
          symbol: A.symbol,
          contract_quantity: A.contract_quantity ?? A.qty,
          asset_class: A.asset_class,
          conid: A.conid
        })
      );
      console.log("🔑 Generated mapping keys:", E);
      const { data: w, error: v } = await t.schema("hf").from("position_position_mappings").select("mapping_key, attached_position_key").eq("user_id", e).in("mapping_key", E);
      if (v)
        throw new Error(`Failed to fetch position mappings: ${v.message}`);
      c.value = w || [], console.log("🔗 Found mappings:", c.value.length);
      const M = c.value.map((A) => A.attached_position_key), z = /* @__PURE__ */ new Map();
      c.value.forEach((A) => {
        z.has(A.mapping_key) || z.set(A.mapping_key, []), z.get(A.mapping_key).push(A.attached_position_key);
      });
      let P = [];
      if (M.length > 0) {
        const K = M.map((J) => {
          const [se, ie, ke, Ae, Oe] = J.split("|");
          return { internal_account_id: se, symbol: ie, contract_quantity: parseFloat(ke), asset_class: Ae, conid: Oe };
        }).map(async (J) => {
          const { data: se, error: ie } = await t.schema("hf").from("positions").select("*").eq("internal_account_id", J.internal_account_id).eq("symbol", J.symbol).eq("asset_class", J.asset_class).eq("conid", J.conid).order("fetched_at", { ascending: !1 }).limit(1).single();
          return ie ? (console.warn(`⚠️ Failed to fetch attached position for ${J.symbol}:`, ie.message), null) : se;
        });
        P = (await Promise.all(K)).filter((J) => J !== null), console.log("📦 Fetched attached positions:", P.length);
      }
      let D = 0, V = 0;
      const oe = [], q = [], $ = /* @__PURE__ */ new Map();
      c.value.forEach((A) => {
        const K = P.find((Z) => _t({
          internal_account_id: Z.internal_account_id,
          symbol: Z.symbol,
          contract_quantity: Z.contract_quantity ?? Z.qty,
          asset_class: Z.asset_class,
          conid: Z.conid
        }) === A.attached_position_key);
        K && ($.has(A.mapping_key) || $.set(A.mapping_key, []), $.get(A.mapping_key).push(K));
      }), o.value = l.value.length, l.value.forEach((A) => {
        const K = A.accounting_quantity ?? A.qty, Z = A.avgPrice ?? 0, J = Z * K, se = _t({
          internal_account_id: A.internal_account_id,
          symbol: A.symbol,
          contract_quantity: A.contract_quantity ?? A.qty,
          asset_class: A.asset_class,
          conid: A.conid
        });
        D += J, V += K;
        const ie = {
          symbol: A.symbol,
          avgPrice: Z,
          quantity: K,
          totalCost: J,
          isAttached: !1,
          mappingKey: se,
          account: A.legal_entity || A.internal_account_id
        };
        oe.push(ie), console.log(`📍 Main position: ${A.symbol} @ ${Z} × ${K} = ${J}`);
        const ke = $.get(se) || [], Ae = [], Oe = [], et = [];
        let ge = J, Mt = K, je = 0;
        ke.forEach((ae) => {
          const le = ae.accounting_quantity ?? ae.qty, ye = ae.avgPrice ?? 0, be = ye * le;
          D += be, V += le, ge += be, Mt += le;
          const Ue = {
            symbol: ae.symbol,
            avgPrice: ye,
            quantity: le,
            totalCost: be,
            isAttached: !0,
            account: ae.legal_entity || ae.internal_account_id
          };
          Ae.push(Ue), oe.push(Ue);
          const Me = ae.symbol.toUpperCase(), dt = Me.includes(" C ") || Me.includes("C00") || /\sC\b/.test(Me), fe = Me.includes(" P ") || Me.includes("P00") || /\sP\b/.test(Me);
          dt ? (Oe.push(Ue), je += be, console.log(`📞 Call position: ${ae.symbol} @ ${ye} × ${le} = ${be}`)) : fe ? (et.push(Ue), console.log(`� Put position: ${ae.symbol} @ ${ye} × ${le} = ${be}`)) : console.log(`�🔗 Attached position: ${ae.symbol} @ ${ye} × ${le} = ${be}`);
        });
        const ht = J - Math.abs(je), tt = K > 0 ? ht / K : 0;
        console.log(`📊 Client: ${ie.account}`), console.log(`   Main Cost: $${J.toFixed(2)}`), console.log(`   Call Costs: $${je.toFixed(2)} (absolute: $${Math.abs(je).toFixed(2)})`), console.log(`   Net Cost (excl. puts): $${ht.toFixed(2)}`), console.log(`   Adjusted Avg Price: $${tt.toFixed(2)} per share`), q.push({
          mainPosition: ie,
          attachedPositions: Ae,
          callPositions: Oe,
          putPositions: et,
          groupTotalCost: ge,
          groupTotalQuantity: Mt,
          callPositionsTotalCost: je,
          netCostExcludingPuts: ht,
          adjustedAvgPricePerShare: tt
        });
      }), a.value = oe, h.value = q, r.value = P.length, s.value = D, n.value = V, V > 0 ? (i.value = D / V, console.log(`✅ Standard Average Cost Price: $${i.value.toFixed(2)} (Total: $${D} / Qty: ${V})`)) : (i.value = null, console.log("⚠️ Total quantity is 0, cannot calculate average"));
      const te = q.reduce((A, K) => A + K.netCostExcludingPuts, 0), ce = q.reduce((A, K) => A + K.mainPosition.quantity, 0), B = ce > 0 ? te / ce : null;
      B !== null && console.log(`🎯 Overall Adjusted Average: $${B.toFixed(2)} per share (Net: $${te.toFixed(2)} / Main Qty: ${ce})`);
    } catch (E) {
      u.value = E instanceof Error ? E.message : "Failed to calculate average cost price", console.error("❌ Error calculating average cost price:", E), i.value = null;
    } finally {
      d.value = !1;
    }
  };
  return He(
    () => l.value,
    () => {
      l.value && l.value.length > 0 && e ? m() : i.value = null;
    },
    { immediate: !0, deep: !0 }
  ), {
    averageCostPrice: i,
    overallAdjustedAvgPrice: g,
    totalCost: s,
    totalQuantity: n,
    mainPositionsCount: o,
    attachedPositionsCount: r,
    positionBreakdown: a,
    positionGroups: h,
    isLoading: d,
    error: u,
    refetch: m
  };
}
function ur(l, e, t, i = F(void 0), s = F(void 0)) {
  const n = F(null), o = F(null), r = F(null), a = F(null), h = F(!1), d = F(!1), u = F(null), c = () => {
    const m = [
      ...i.value || [],
      ...s.value || []
    ];
    if (m.length === 0)
      return console.log("⚠️ No options positions available for P&L calculation"), null;
    console.log("📊 Calculating options P&L for positions:", m.length);
    let E = 0, w = 0, v = 0, M = 0;
    const z = [], P = /* @__PURE__ */ new Set(), D = /* @__PURE__ */ new Set();
    m.forEach(($) => {
      const te = $.accounting_quantity ?? $.qty, ce = $.legal_entity || $.internal_account_id;
      let B = null, A = null, K = "UNKNOWN";
      const Z = $.symbol.match(/(\d{4}-\d{2}-\d{2})\s+(\d+(?:\.\d+)?)\s+([CP])/);
      if (Z)
        A = Z[1], B = parseFloat(Z[2]), K = Z[3] === "C" ? "CALL" : "PUT";
      else {
        const ke = $.symbol.match(/([CP])(\d{8})/);
        if (ke) {
          K = ke[1] === "C" ? "CALL" : "PUT";
          const Ae = ke[2];
          B = parseFloat(Ae) / 1e3;
        }
      }
      P.add(K), D.add(te < 0 ? "SHORT" : "LONG");
      const J = Math.abs($.computed_cash_flow_on_entry || 0), se = Math.abs($.market_value || 0), ie = $.unrealized_pnl || 0;
      E += Math.abs(te), w += J, v += se, M += ie, z.push({
        account: ce,
        strike: B,
        expiry: A,
        quantity: te,
        premiumReceived: J,
        currentValue: se,
        positionPnL: ie,
        symbol: $.symbol
      }), console.log(`📍 Position: ${$.symbol} (${ce})`), console.log(`   Quantity: ${te}`), console.log(`   Premium Received: $${J.toFixed(2)}`), console.log(`   Current Value: $${se.toFixed(2)}`), console.log(`   P&L: $${ie.toFixed(2)}`);
    });
    const V = P.size === 1 ? Array.from(P)[0] : "MIXED", oe = D.size === 1 ? Array.from(D)[0] : "MIXED", q = w > 0 ? M / w * 100 : 0;
    return console.log("💰 Options P&L Summary:"), console.log(`   Total Contracts: ${E}`), console.log(`   Total Premium Received: $${w.toFixed(2)}`), console.log(`   Current Market Liability: $${v.toFixed(2)}`), console.log(`   Unrealized P&L: $${M.toFixed(2)}`), console.log(`   P&L Percentage: ${q.toFixed(2)}%`), {
      totalContracts: E,
      optionType: V,
      positionType: oe,
      totalPremiumReceived: w,
      currentMarketLiability: v,
      unrealizedPnL: M,
      pnlPercentage: q,
      positions: z
    };
  }, g = Y(() => {
    if (e.value > 0 && l.value !== null && t.value !== null) {
      console.log("📈 Calculating STOCK P&L");
      const m = e.value, E = l.value, w = t.value, v = m * E, M = m * w, z = M - v, P = v !== 0 ? z / v * 100 : 0;
      return {
        totalShares: m,
        avgCostPerShare: E,
        totalCostBasis: v,
        currentPricePerShare: w,
        currentMarketValue: M,
        unrealizedPnL: z,
        pnlPercentage: P
      };
    } else
      return console.log("📊 No stock positions, calculating OPTIONS P&L"), c();
  });
  return He(
    g,
    (m) => {
      m ? "totalShares" in m ? (n.value = m.totalCostBasis, o.value = m.currentMarketValue, r.value = m.unrealizedPnL, a.value = m.pnlPercentage, h.value = m.unrealizedPnL >= 0, console.log("💰 STOCK P&L Calculation:"), console.log(`   Total Shares: ${m.totalShares.toLocaleString()}`), console.log(`   Avg Cost per Share: $${m.avgCostPerShare.toFixed(2)}`), console.log(`   Total Cost Basis: $${m.totalCostBasis.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`), console.log(`   Current Price per Share: $${m.currentPricePerShare.toFixed(2)}`), console.log(`   Current Market Value: $${m.currentMarketValue.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`), console.log(`   Unrealized P&L: ${m.unrealizedPnL >= 0 ? "+" : ""}$${m.unrealizedPnL.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`), console.log(`   P&L Percentage: ${m.pnlPercentage.toFixed(2)}%`)) : (n.value = m.totalPremiumReceived, o.value = m.currentMarketLiability, r.value = m.unrealizedPnL, a.value = m.pnlPercentage, h.value = m.unrealizedPnL >= 0, console.log("💰 OPTIONS P&L Updated:"), console.log(`   Total Contracts: ${m.totalContracts}`), console.log(`   ${m.positionType} ${m.optionType}`), console.log(`   Premium Received: $${m.totalPremiumReceived.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`), console.log(`   Current Liability: $${m.currentMarketLiability.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`), console.log(`   Unrealized P&L: ${m.unrealizedPnL >= 0 ? "+" : ""}$${m.unrealizedPnL.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`), console.log(`   P&L Percentage: ${m.pnlPercentage.toFixed(2)}%`)) : (n.value = null, o.value = null, r.value = null, a.value = null, h.value = !1, console.log("⚠️ P&L Calculation: Missing required data"));
    },
    { immediate: !0 }
  ), {
    totalCostBasis: n,
    currentMarketValue: o,
    unrealizedPnL: r,
    pnlPercentage: a,
    isProfitable: h,
    calculationBreakdown: g,
    isLoading: d,
    error: u
  };
}
function cr(l, e, t, i, s, n) {
  console.log("🏦 useCapitalUsed initialized");
  const o = Y(() => !1), r = Y(() => null), a = Y(() => {
    const d = l.value;
    if (console.log("🏦 Calculating capital breakdown for asset type:", d), d === "STK") {
      const u = e.value, c = t.value;
      if (c === null || u === 0)
        return console.log("⚠️ Cannot calculate stock capital: missing price or quantity"), null;
      const g = u * c;
      return console.log("📊 Stock capital breakdown:", {
        totalShares: u,
        pricePerShare: c,
        totalCapital: g
      }), {
        assetType: "STK",
        totalShares: u,
        pricePerShare: c,
        totalCapital: g
      };
    }
    return d === "OPT" ? (console.log("⚠️ Options capital calculation not implemented yet"), null) : (console.log("⚠️ Unknown or null asset type, cannot calculate capital"), null);
  }), h = Y(() => {
    const d = a.value;
    return d && d.assetType === "STK" ? d.totalCapital : null;
  });
  return console.log("🏦 useCapitalUsed ready"), {
    totalCapitalUsed: h,
    calculationBreakdown: a,
    isLoading: o,
    error: r
  };
}
function fr(l) {
  const e = Tt(), t = Ls(l), i = Ss(l), s = Y(() => {
    const m = t.data.value;
    return m || /* @__PURE__ */ new Map();
  }), n = Y(() => {
    const m = i.data.value;
    return m || /* @__PURE__ */ new Map();
  }), o = F(/* @__PURE__ */ new Map()), r = F(/* @__PURE__ */ new Map());
  function a(m) {
    return _t({
      internal_account_id: m.internal_account_id,
      symbol: m.symbol,
      contract_quantity: m.contract_quantity,
      asset_class: m.asset_class || "OPT",
      conid: m.conid || ""
    });
  }
  function h(m) {
    if (!m) return null;
    const E = m.match(/^([A-Z]+)\b/);
    return (E == null ? void 0 : E[1]) || null;
  }
  async function d(m, E) {
    if (!l) return [];
    if (r.value.has(m))
      return r.value.get(m) || [];
    try {
      console.log("🔍 Fetching trades for symbol root:", m);
      const { data: w, error: v } = await e.schema("hf").from("trades").select("*").ilike("symbol", `${m}%`);
      if (v)
        throw console.error("❌ Error fetching trades:", v), v;
      const M = (w || []).sort((P, D) => {
        const V = ($) => {
          if (!$) return 0;
          const te = $.split("/");
          return te.length !== 3 ? 0 : new Date(parseInt(te[2]), parseInt(te[1]) - 1, parseInt(te[0])).getTime();
        }, oe = V(P.tradeDate);
        return V(D.tradeDate) - oe;
      });
      console.log(`✅ Fetched ${(M == null ? void 0 : M.length) || 0} trades for ${m}`);
      const z = M || [];
      return r.value.set(m, z), z;
    } catch (w) {
      return console.error("❌ Error fetching trades:", w), [];
    }
  }
  async function u(m) {
    const E = a(m), w = s.value.get(E);
    if (console.log("🔍 Getting attached trades for key:", E), console.log("🔍 Trade IDs from map:", w ? Array.from(w) : "none"), !w || w.size === 0)
      return [];
    const v = h(m.symbol);
    if (!v) return [];
    const M = await d(v, m.internal_account_id);
    console.log(`📊 Total trades fetched: ${M.length}`), console.log("📊 Sample trade IDs:", M.slice(0, 3).map((P) => P.tradeID));
    const z = M.filter((P) => {
      const D = P.tradeID;
      return D && w.has(String(D));
    });
    return console.log(`✅ Found ${z.length} attached trades`), z;
  }
  async function c(m, E) {
    try {
      const w = a(m);
      if (o.value.has(w))
        return o.value.get(w) || [];
      const v = h(m.symbol), M = m.internal_account_id || m.legal_entity;
      if (!v || !M || !l) return [];
      const P = (await Pi(
        e,
        v,
        l,
        M
      )).filter((D) => {
        const V = a(D);
        return E.has(V);
      });
      return P.length > 0 && o.value.set(w, P), P;
    } catch (w) {
      return console.error("❌ Error fetching attached positions:", w), [];
    }
  }
  const g = Y(() => t.isSuccess.value && i.isSuccess.value);
  return {
    positionTradesMap: s,
    positionPositionsMap: n,
    getPositionKey: a,
    getAttachedTrades: u,
    fetchAttachedPositionsForDisplay: c,
    positionTradeMappingsQuery: t,
    positionPositionMappingsQuery: i,
    isReady: g,
    refetchMappings: async () => {
      await t.refetch(), await i.refetch();
    },
    fetchTradesForSymbol: d
  };
}
function pr() {
  const l = F(/* @__PURE__ */ new Set()), e = F(/* @__PURE__ */ new Set());
  function t(i, s) {
    e.value.delete(i), l.value.has(i) ? l.value.delete(i) : l.value.add(i);
    const n = (s == null ? void 0 : s.value) || s;
    if (n && typeof n.getRows == "function") {
      const o = n.getRows();
      for (const r of o) {
        const a = r.getData();
        if (a && `${a.internal_account_id || a.legal_entity}|${a.symbol}|${a.accounting_quantity || a.contract_quantity}|${a.asset_class || "OPT"}|${a.conid || ""}` === i) {
          r.reformat();
          break;
        }
      }
    }
  }
  return {
    expandedPositions: l,
    processingPositions: e,
    togglePositionExpansion: t
  };
}
const mr = { class: "current-positions-for-single-instrument-view" }, gr = { class: "positions-table-container" }, br = { class: "header-section" }, vr = {
  key: 0,
  class: "loading-state"
}, wr = {
  key: 1,
  class: "error-state"
}, Cr = {
  key: 2,
  class: "summary-section"
}, yr = { class: "summary-cards" }, Er = { class: "summary-card card-cyan" }, Rr = {
  key: 0,
  class: "summary-value"
}, xr = {
  key: 1,
  class: "summary-value error"
}, Tr = {
  key: 2,
  class: "summary-value-container-vertical"
}, kr = { key: 0 }, Mr = { key: 1 }, Lr = { class: "toggle-icon" }, Sr = { class: "summary-card card-blue" }, Dr = {
  key: 0,
  class: "summary-value"
}, _r = {
  key: 1,
  class: "summary-value error"
}, Fr = {
  key: 2,
  class: "summary-value-container-vertical"
}, zr = { key: 0 }, Pr = { class: "pnl-percentage" }, Hr = { key: 1 }, Ar = { class: "toggle-icon" }, Or = { class: "summary-card highlight-1 card-green" }, Br = { class: "summary-value-container" }, Nr = { class: "summary-value" }, Vr = { class: "accounts-count" }, Ir = { class: "toggle-icon" }, Wr = { class: "summary-card card-purple" }, Gr = {
  key: 0,
  class: "summary-value"
}, $r = {
  key: 1,
  class: "summary-value error"
}, jr = {
  key: 2,
  class: "summary-value-container-vertical"
}, Ur = { class: "summary-value" }, qr = {
  key: 0,
  class: "52-week-range"
}, Kr = { class: "blue_color" }, Xr = { class: "blue_color" }, Jr = {
  key: 1,
  class: "52-week-range"
}, Yr = {
  key: 2,
  class: "timestamp-info"
}, Qr = {
  key: 3,
  class: "summary-value"
}, Zr = { class: "summary-card card-orange" }, ea = {
  key: 0,
  class: "summary-value"
}, ta = {
  key: 1,
  class: "summary-value error"
}, ia = { class: "summary-value-container-vertical" }, sa = { key: 0 }, na = { key: 1 }, oa = { class: "toggle-icon" }, ra = { class: "summary-card card-teal" }, aa = {
  key: 0,
  class: "summary-value"
}, la = {
  key: 1,
  class: "summary-value error"
}, ha = {
  key: 2,
  class: "summary-value-container-vertical"
}, da = {
  key: 0,
  class: "subtitle-info",
  style: { "font-size": "0.85rem", color: "#6c757d", "margin-top": "0.25rem" }
}, ua = { class: "blue_color" }, ca = {
  key: 1,
  class: "subtitle-info",
  style: { "font-size": "0.85rem", color: "#6c757d", "margin-top": "0.25rem" }
}, fa = { class: "blue_color" }, pa = {
  key: 2,
  class: "subtitle-info",
  style: { "font-size": "0.85rem", color: "#6c757d", "margin-top": "0.25rem" }
}, ma = { class: "blue_color" }, ga = { class: "table-wrapper" }, ba = { class: "calculation-details" }, va = { class: "calculation-tabs" }, wa = { key: 0 }, Ca = ["onClick"], ya = { class: "toggle-icon" }, Ea = { class: "group-content" }, Ra = { class: "position-line main-position" }, xa = { class: "position-symbol" }, Ta = { class: "position-calc" }, ka = {
  key: 0,
  class: "call-positions-wrapper"
}, Ma = { class: "position-symbol" }, La = { class: "position-calc" }, Sa = { class: "call-subtotal" }, Da = {
  key: 1,
  class: "put-positions-wrapper"
}, _a = { class: "position-symbol" }, Fa = { class: "position-calc" }, za = { class: "group-calculation" }, Pa = { class: "calc-line indent" }, Ha = { class: "calc-line indent" }, Aa = {
  key: 0,
  class: "overall-adjusted-section"
}, Oa = { class: "overall-adjusted-header" }, Ba = { class: "overall-calculation-breakdown" }, Na = { class: "breakdown-line" }, Va = { class: "breakdown-line" }, Ia = { class: "breakdown-line" }, Wa = {
  key: 1,
  class: "coming-soon-content"
}, Ga = { class: "pnl-details" }, $a = {
  key: 0,
  class: "pnl-breakdown"
}, ja = { class: "pnl-section" }, Ua = { class: "calc-line" }, qa = { class: "calc-line" }, Ka = { class: "calc-line calculation-result" }, Xa = { class: "pnl-section" }, Ja = { class: "calc-line" }, Ya = { class: "calc-line calculation-result" }, Qa = { class: "pnl-section highlight-section" }, Za = { class: "calc-line" }, el = { class: "calc-line" }, tl = {
  key: 1,
  class: "pnl-breakdown"
}, il = { class: "pnl-section" }, sl = { class: "pnl-section-title" }, nl = { class: "calc-line" }, ol = { class: "calc-line" }, rl = { class: "pnl-section-title" }, al = { class: "calc-line" }, ll = { class: "calc-line" }, hl = { class: "calc-line" }, dl = { class: "calc-line calculation-result" }, ul = { class: "pnl-section highlight-section" }, cl = { class: "calc-line" }, fl = { class: "calc-line calculation-result" }, pl = {
  class: "calc-line",
  style: { "margin-top": "1rem" }
}, ml = { class: "calc-line calculation-result" }, gl = {
  class: "calc-line",
  style: { "margin-top": "1rem" }
}, bl = { class: "calc-line" }, vl = {
  key: 0,
  class: "calc-line",
  style: { "margin-top": "1rem", color: "#dc3545", "font-weight": "bold" }
}, wl = { class: "capital-details" }, Cl = {
  key: 0,
  class: "no-data-message"
}, yl = {
  key: 1,
  class: "capital-breakdown"
}, El = { class: "capital-section" }, Rl = { class: "calc-line" }, xl = { class: "calc-line" }, Tl = { class: "calc-line calculation-result" }, kl = {
  key: 2,
  class: "capital-breakdown"
}, Ml = { class: "capital-section-title" }, Ll = { class: "calc-line" }, Sl = { class: "calc-line" }, Dl = { class: "calc-line" }, _l = { class: "calc-line calculation-result" }, Fl = { class: "capital-section highlight-section" }, zl = { class: "calc-line" }, Pl = { class: "calc-line calculation-result" }, Hl = { class: "modal-header" }, Al = { class: "modal-body" }, Ol = {
  key: 0,
  class: "position-info"
}, Bl = { class: "attachment-tabs" }, Nl = { key: 1 }, Vl = { class: "trade-search" }, Il = {
  key: 0,
  style: { padding: "1rem", "text-align": "center", color: "#6c757d" }
}, Wl = {
  key: 1,
  class: "trades-list"
}, Gl = ["onClick"], $l = ["checked", "onClick"], jl = { class: "trade-details" }, Ul = { class: "trade-primary" }, ql = { style: { color: "#6c757d" } }, Kl = { style: { color: "#6c757d" } }, Xl = { class: "trade-secondary" }, Jl = { key: 0 }, Yl = { key: 1 }, Ql = { style: { color: "#6c757d", "margin-left": "6px" } }, Zl = {
  key: 0,
  style: { padding: "1.5rem", "text-align": "center", color: "#6c757d" }
}, eh = { key: 2 }, th = { class: "trade-search" }, ih = {
  key: 0,
  style: { padding: "1rem", "text-align": "center", color: "#6c757d" }
}, sh = {
  key: 1,
  class: "trades-list"
}, nh = ["onClick"], oh = ["checked", "onClick"], rh = { class: "trade-details" }, ah = { class: "trade-primary" }, lh = { style: { color: "#6c757d" } }, hh = { style: { color: "#6c757d" } }, dh = {
  key: 0,
  class: "expired-badge"
}, uh = { class: "trade-secondary" }, ch = { key: 0 }, fh = {
  key: 0,
  style: { padding: "1.5rem", "text-align": "center", color: "#6c757d" }
}, ph = { class: "modal-footer" }, mh = ["disabled"], gh = /* @__PURE__ */ ks({
  __name: "CurrentPositions",
  props: {
    symbolRoot: { default: "SBET" },
    userId: { default: "4fbec15d-2316-4805-b2a4-5cd2115a5ac8" }
  },
  setup(l) {
    const e = l, t = F(!1), i = F(!1), s = F(!1), n = F(!1), o = F("positions"), r = Tt(), a = F(/* @__PURE__ */ new Set());
    function h(C) {
      a.value.has(C) ? a.value.delete(C) : a.value.add(C), a.value = new Set(a.value);
    }
    const { data: d, isLoading: u, isError: c, error: g, isSuccess: m, _cleanup: E } = Ps(
      e.userId,
      e.symbolRoot
    ), { data: w } = As(e.symbolRoot, e.userId), { data: v } = Bs(e.symbolRoot, e.userId), M = Y(() => {
      var f, L;
      const C = (L = (f = d.value) == null ? void 0 : f[0]) == null ? void 0 : L.conid;
      return C ? parseInt(C, 10) : null;
    }), { marketData: z, isLoading: P, error: D } = lr(M, e.symbolRoot), { financialData: V, isLoading: oe, error: q } = hr(M, e.symbolRoot), $ = Y(() => {
      var C;
      return ((C = z.value) == null ? void 0 : C.market_price) ?? null;
    }), te = Y(() => {
      var C;
      return ((C = V.value) == null ? void 0 : C.week_52_high) ?? null;
    }), ce = Y(() => {
      var C;
      return ((C = V.value) == null ? void 0 : C.week_52_low) ?? null;
    }), B = Y(() => {
      var C;
      return ((C = V.value) == null ? void 0 : C.pe_ratio) ?? null;
    }), A = Y(() => {
      var C;
      return ((C = V.value) == null ? void 0 : C.market_cap) ?? null;
    }), K = Y(() => {
      var C;
      return ((C = V.value) == null ? void 0 : C.computed_peg_ratio) ?? null;
    }), Z = Y(() => {
      var C;
      return ((C = z.value) == null ? void 0 : C.last_fetched_at) ?? null;
    }), J = Y(() => {
      if (!Z.value) return null;
      const C = new Date(Z.value), L = {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: !0,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timeZoneName: "short"
      };
      let S = C.toLocaleString("en-US", L).replace(/,(\s+\d)/, " $1");
      return S = S.replace("GMT+5:30", "IST"), S = S.replace("GMT+530", "IST"), S;
    }), {
      overallAdjustedAvgPrice: se,
      positionGroups: ie,
      isLoading: ke,
      error: Ae
    } = dr(
      d,
      e.userId
    ), {
      positionTradesMap: Oe,
      positionPositionsMap: et,
      getPositionKey: ge,
      getAttachedTrades: Mt,
      fetchAttachedPositionsForDisplay: je,
      fetchTradesForSymbol: ht,
      isReady: tt,
      refetchMappings: ae
    } = fr(e.userId), {
      expandedPositions: le,
      processingPositions: ye
    } = pr(), be = Y(() => {
      var L, _, S, b, H;
      if (d.value && d.value.length > 0) {
        const G = (L = d.value[0]) == null ? void 0 : L.asset_class;
        return console.log("👀 Asset type from positions:", G), G || null;
      }
      const C = w.value && w.value.length > 0, f = v.value && v.value.length > 0;
      if (C || f) {
        const G = ((S = (_ = w.value) == null ? void 0 : _[0]) == null ? void 0 : S.asset_class) || ((H = (b = v.value) == null ? void 0 : b[0]) == null ? void 0 : H.asset_class);
        return console.log("👀 Asset type from options:", G), G || "OPT";
      }
      return console.log("👀 Asset type: null (no positions)"), null;
    });
    console.log("👀 Asset type detected:", be.value);
    const Ue = Y(() => !d.value || d.value.length === 0 ? 0 : d.value.reduce((C, f) => C + (f.contract_quantity || 0), 0));
    Y(() => {
      var f, L;
      if (be.value === "OPT") {
        const _ = ((f = w.value) == null ? void 0 : f.reduce((b, H) => b + (H.unrealized_pnl || 0), 0)) || 0, S = ((L = v.value) == null ? void 0 : L.reduce((b, H) => b + (H.unrealized_pnl || 0), 0)) || 0;
        return console.log("📊 Options Unrealized P&L - PUT:", _, "CALL:", S, "Total:", _ + S), _ + S;
      }
      if (!d.value || d.value.length === 0) return 0;
      const C = d.value.reduce((_, S) => _ + (S.unrealized_pnl || 0), 0);
      return console.log("📊 Stock Unrealized P&L:", C), C;
    });
    const Me = Y(() => ie.value.reduce((C, f) => C + f.netCostExcludingPuts, 0)), dt = Y(() => ie.value.reduce((C, f) => C + f.mainPosition.quantity, 0)), {
      unrealizedPnL: fe,
      pnlPercentage: os,
      isProfitable: Ee,
      calculationBreakdown: I,
      isLoading: rs,
      error: as
    } = ur(
      se,
      dt,
      $,
      w,
      v
    ), {
      totalCapitalUsed: Ei,
      calculationBreakdown: ve,
      isLoading: ls,
      error: hs
    } = cr(
      be,
      Y(() => Ue.value),
      $
    );
    function it(C) {
      if (!C) return [];
      const f = String(C), L = f.match(/^([A-Z]+)\b/), _ = (L == null ? void 0 : L[1]) ?? "", S = f.match(/\s([CP])\b/), b = (S == null ? void 0 : S[1]) ?? "", H = f.match(/\s(\d+(?:\.\d+)?)\s+[CP]\b/), G = (H == null ? void 0 : H[1]) ?? "", X = f.match(/\b(\d{6})[CP]/), he = X ? xi(X[1]) : "";
      return [_, he, G, b].filter(Boolean);
    }
    function Ri(C) {
      var he;
      if (!C) return [];
      const f = String(C).trim(), L = f.match(/^([A-Z]+)\s*/), _ = (L == null ? void 0 : L[1]) ?? "", S = f.slice(((he = L == null ? void 0 : L[0]) == null ? void 0 : he.length) || 0), b = S.match(/(\d{6})([CP])/);
      let H = "", G = "", X = "";
      if (b) {
        H = xi(b[1]), G = b[2] === "C" ? "Call" : "Put";
        const Fe = S.slice(b[0].length).match(/(\d+)/);
        Fe && (X = (parseInt(Fe[1], 10) / 1e3).toString());
      }
      return [_, H, X, G].filter(Boolean);
    }
    function xi(C) {
      if (!C || C.length !== 6) return "";
      const f = C.substring(0, 2), L = C.substring(2, 4), _ = C.substring(4, 6);
      return `20${f}-${L}-${_}`;
    }
    function qe(C) {
      if (!C) return "";
      const f = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(String(C).trim());
      let L;
      if (f) {
        const H = parseInt(f[1]), G = parseInt(f[2]) - 1;
        let X = parseInt(f[3]);
        X < 100 && (X = 2e3 + X), L = new Date(X, G, H);
      } else if (L = new Date(C), isNaN(L.getTime())) return String(C);
      const _ = L.getFullYear(), S = (L.getMonth() + 1).toString().padStart(2, "0"), b = L.getDate().toString().padStart(2, "0");
      return `${_}-${S}-${b}`;
    }
    function Ke(C) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(C);
    }
    function ds(C) {
      return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }).format(C);
    }
    function us(C) {
      if (console.log("🔄 Toggle expansion for key:", C), console.log("📊 Before toggle - expanded positions:", Array.from(le.value)), le.value.has(C) ? (le.value.delete(C), console.log("➖ Removed from expanded")) : (le.value.add(C), console.log("➕ Added to expanded")), console.log("📊 After toggle - expanded positions:", Array.from(le.value)), console.log("🎯 Tabulator exists?", !!Le.value), Le.value) {
        const f = Le.value.getRows();
        console.log("📋 Total rows:", f.length);
        for (const L of f) {
          const _ = L.getData();
          if (_) {
            const S = Ot(_);
            if (console.log("🔍 Checking row key:", S, "matches?", S === C), S === C) {
              console.log("✅ Found matching row, reformatting..."), L.reformat();
              break;
            }
          }
        }
      }
    }
    function Ot(C) {
      return ge(C);
    }
    const cs = [
      {
        title: "Account",
        field: "legal_entity",
        minWidth: 150,
        headerHozAlign: "left",
        formatter: (C) => {
          const f = C.getRow().getData(), L = C.getValue() || f.internal_account_id;
          if (!tt.value)
            return console.log("⏳ Formatter called but mappings not ready yet"), `<div style="display: flex; align-items: center; gap: 6px;">
          <span class="expand-arrow">&nbsp;</span>
          <span>${L}</span>
        </div>`;
          const _ = Ot(f), S = Oe.value.get(_), b = et.value.get(_);
          console.log("🎨 Formatter for", _, {
            attachedTradeIds: (S == null ? void 0 : S.size) || 0,
            attachedPositionKeys: (b == null ? void 0 : b.size) || 0,
            isReady: tt.value
          });
          const H = S && S.size > 0 || b && b.size > 0, G = le.value.has(_), X = H ? `<span class="expand-arrow ${G ? "expanded" : ""}" data-position-key="${_}" title="${G ? "Collapse" : "Expand"} attachments">
            ${G ? "▼" : "▶"}
          </span>` : '<span class="expand-arrow">&nbsp;</span>', he = ((S == null ? void 0 : S.size) || 0) + ((b == null ? void 0 : b.size) || 0), we = he > 0 ? `<span class="trade-count">(${he})</span>` : "";
          return `
        <div style="display: flex; align-items: center; gap: 6px;">
          ${X} 
          <button class="attach-trades-btn" title="Attach trades or positions" style="border:none;background:transparent;cursor:pointer;padding:0;margin-right:4px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button> 
          <span>${L}</span>
          ${we}
        </div>
      `;
        },
        cellClick: (C, f) => {
          const L = C.target, _ = L.closest(".expand-arrow");
          if (_) {
            C.stopPropagation();
            const b = _.getAttribute("data-position-key");
            b && us(b);
            return;
          }
          if (L.closest(".attach-trades-btn")) {
            C.stopPropagation();
            const b = f.getRow().getData();
            b && ps(b, "trades");
            return;
          }
        }
      },
      {
        title: "Accounting Qty",
        field: "accounting_quantity",
        minWidth: 100,
        hozAlign: "right",
        headerHozAlign: "right",
        formatter: "money",
        formatterParams: {
          decimal: ".",
          thousand: ",",
          precision: 0
        },
        bottomCalc: "sum",
        bottomCalcFormatter: "money",
        bottomCalcFormatterParams: {
          decimal: ".",
          thousand: ",",
          precision: 0
        }
      },
      {
        title: "Avg Price",
        field: "avgPrice",
        minWidth: 100,
        hozAlign: "right",
        headerHozAlign: "right",
        formatter: (C) => {
          const f = C.getValue();
          return f != null ? "$" + Number(f).toFixed(2) : "";
        }
      },
      {
        title: "Market Price",
        field: "price",
        minWidth: 100,
        hozAlign: "right",
        headerHozAlign: "right",
        formatter: (C) => {
          const f = C.getValue();
          return f != null ? "$" + Number(f).toFixed(2) : "";
        }
      },
      {
        title: "Market Value",
        field: "market_value",
        minWidth: 150,
        hozAlign: "right",
        headerHozAlign: "right",
        formatter: (C) => {
          const f = C.getValue();
          return f == null ? "" : `<span style="color:${f < 0 ? "#dc3545" : f > 0 ? "#28a745" : "#000"}">$${Number(f).toLocaleString(void 0, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>`;
        },
        bottomCalc: "sum",
        bottomCalcFormatter: (C) => {
          const f = C.getValue();
          return `<span style="color:${f < 0 ? "#dc3545" : f > 0 ? "#28a745" : "#000"}">$${Number(f).toLocaleString(void 0, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>`;
        }
      },
      {
        title: "Unrealized P&L",
        field: "unrealized_pnl",
        minWidth: 150,
        hozAlign: "right",
        headerHozAlign: "right",
        formatter: (C) => {
          const f = C.getValue();
          return f == null ? "" : `<span style="color:${f < 0 ? "#dc3545" : f > 0 ? "#28a745" : "#000"}">$${Number(f).toLocaleString(void 0, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>`;
        },
        bottomCalc: "sum",
        bottomCalcFormatter: (C) => {
          const f = C.getValue();
          return `<span style="color:${f < 0 ? "#dc3545" : f > 0 ? "#28a745" : "#000"}">$${Number(f).toLocaleString(void 0, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>`;
        }
      },
      {
        title: "Entry Cash Flow",
        field: "computed_cash_flow_on_entry",
        minWidth: 100,
        hozAlign: "right",
        headerHozAlign: "right",
        formatter: (C) => {
          const f = C.getValue();
          return f == null ? "" : `<span style="color:${f < 0 ? "#dc3545" : f > 0 ? "#28a745" : "#000"}">$${Number(f).toLocaleString(void 0, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>`;
        },
        bottomCalc: "sum",
        bottomCalcFormatter: (C) => {
          const f = C.getValue();
          return `<span style="color:${f < 0 ? "#dc3545" : f > 0 ? "#28a745" : "#000"}">$${Number(f).toLocaleString(void 0, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>`;
        }
      }
    ], { tableDiv: fs, initializeTabulator: Ti, isTableInitialized: Bt, tabulator: Le } = ar({
      data: d,
      columns: cs,
      isSuccess: m,
      placeholder: "No positions found for this symbol",
      rowFormatter: async (C) => {
        try {
          const f = C.getData(), L = C.getElement();
          if (!f) return;
          const _ = Ot(f), S = Oe.value.get(_), b = et.value.get(_), H = le.value.has(_);
          console.log("🎨 Row formatter running for:", _, {
            isExpanded: H,
            attachedTradeIds: (S == null ? void 0 : S.size) || 0,
            attachedPositionKeys: (b == null ? void 0 : b.size) || 0,
            processing: ye.value.has(_)
          });
          const G = L.querySelector(".nested-tables-container");
          if (G && (console.log("🗑️ Removing existing nested container"), G.remove()), ye.value.has(_)) {
            console.log("⏸️ Position is being processed, skipping");
            return;
          }
          if (H && (S && S.size > 0 || b && b.size > 0)) {
            console.log("📦 Creating nested tables for:", _), ye.value.add(_);
            try {
              const X = document.createElement("div");
              if (X.className = "nested-tables-container", X.style.cssText = "padding: 1rem; background: #f8f9fa; border-top: 1px solid #dee2e6;", S && S.size > 0) {
                console.log("📊 Adding trades section");
                const he = document.createElement("h4");
                he.textContent = `Attached Trades (${S.size})`, he.style.cssText = "margin: 0 0 0.5rem 0; font-size: 0.9rem; color: #495057;", X.appendChild(he);
                const we = document.createElement("div");
                we.className = "nested-trades-table", we.style.cssText = "margin-bottom: 1rem;", X.appendChild(we);
                const Fe = await Mt(f);
                console.log("✅ Got trades data:", Fe.length), new gi(we, {
                  data: Fe,
                  layout: "fitColumns",
                  columns: [
                    {
                      title: "Financial instruments",
                      field: "symbol",
                      widthGrow: 1.8,
                      formatter: (W) => Ri(W.getValue()).map((de) => `<span class="fi-tag">${de}</span>`).join(" ")
                    },
                    {
                      title: "Side",
                      field: "buySell",
                      widthGrow: 1,
                      formatter: (W) => {
                        const N = W.getValue();
                        return `<span class="trade-side-badge ${N === "BUY" ? "trade-buy" : "trade-sell"}">${N}</span>`;
                      }
                    },
                    {
                      title: "Open/Close",
                      field: "openCloseIndicator",
                      widthGrow: 1,
                      formatter: (W) => {
                        const N = W.getValue();
                        return N === "O" ? '<span style="color: #17a2b8; font-weight: bold;">OPEN</span>' : N === "C" ? '<span style="color: #6f42c1; font-weight: bold;">CLOSE</span>' : N;
                      }
                    },
                    {
                      title: "Trade Date",
                      field: "tradeDate",
                      widthGrow: 1,
                      formatter: (W) => qe(W.getValue()),
                      sorter: (W, N) => {
                        const de = new Date(qe(W)), pt = new Date(qe(N));
                        return de.getTime() - pt.getTime();
                      }
                    },
                    {
                      title: "Settlement Date",
                      field: "settleDateTarget",
                      widthGrow: 1,
                      formatter: (W) => qe(W.getValue()),
                      sorter: (W, N) => {
                        const de = new Date(qe(W)), pt = new Date(qe(N));
                        return de.getTime() - pt.getTime();
                      }
                    },
                    {
                      title: "Quantity",
                      field: "quantity",
                      widthGrow: 1,
                      hozAlign: "right",
                      formatter: (W) => {
                        const N = W.getRow().getData(), de = parseFloat((N == null ? void 0 : N.quantity) || 0) || 0, pt = parseFloat((N == null ? void 0 : N.multiplier) || 1) || 1, Es = de * pt;
                        return ds(Es);
                      }
                    },
                    {
                      title: "Price",
                      field: "tradePrice",
                      widthGrow: 1,
                      hozAlign: "right",
                      formatter: (W) => Ke(parseFloat(W.getValue()) || 0)
                    },
                    {
                      title: "Total Premium",
                      field: "tradeMoney",
                      widthGrow: 1,
                      hozAlign: "right",
                      formatter: (W) => Ke(parseFloat(W.getValue()) || 0)
                    },
                    {
                      title: "Net Cash",
                      field: "netCash",
                      widthGrow: 1,
                      hozAlign: "right",
                      formatter: (W) => Ke(parseFloat(W.getValue()) || 0)
                    },
                    {
                      title: "MTM PnL",
                      field: "mtmPnl",
                      widthGrow: 1,
                      hozAlign: "right",
                      formatter: (W) => Ke(parseFloat(W.getValue()) || 0)
                    },
                    {
                      title: "Close Price",
                      field: "closePrice",
                      widthGrow: 1,
                      hozAlign: "right",
                      formatter: (W) => Ke(parseFloat(W.getValue()) || 0)
                    }
                  ]
                });
              }
              if (b && b.size > 0) {
                console.log("📊 Adding positions section");
                const he = document.createElement("h4");
                he.textContent = `Attached Positions (${b.size})`, he.style.cssText = "margin: 1rem 0 0.5rem 0; font-size: 0.9rem; color: #495057;", X.appendChild(he);
                const we = document.createElement("div");
                we.className = "nested-positions-table", X.appendChild(we);
                const Fe = await je(f, b);
                console.log("✅ Got positions data:", Fe.length), new gi(we, {
                  data: Fe,
                  layout: "fitColumns",
                  columns: [
                    {
                      title: "Financial instruments",
                      field: "symbol",
                      widthGrow: 1.8,
                      formatter: (W) => it(W.getValue()).map((de) => `<span class="fi-tag">${de}</span>`).join(" ")
                    },
                    {
                      title: "Accounting Qty",
                      field: "accounting_quantity",
                      widthGrow: 1,
                      hozAlign: "right",
                      formatter: "money",
                      formatterParams: {
                        decimal: ".",
                        thousand: ",",
                        precision: 0
                      }
                    },
                    {
                      title: "Avg Price",
                      field: "avgPrice",
                      widthGrow: 1,
                      hozAlign: "right",
                      formatter: (W) => {
                        const N = W.getValue();
                        return N == null ? "" : `<span style="color:${N < 0 ? "#dc3545" : N > 0 ? "#28a745" : "#000"}">$${Number(N).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>`;
                      }
                    },
                    {
                      title: "Market Value",
                      field: "market_value",
                      widthGrow: 1.5,
                      hozAlign: "right",
                      formatter: (W) => {
                        const N = W.getValue();
                        return N == null ? "" : `<span style="color:${N < 0 ? "#dc3545" : N > 0 ? "#28a745" : "#000"}">$${Number(N).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>`;
                      }
                    },
                    {
                      title: "Unrealized P&L",
                      field: "unrealized_pnl",
                      widthGrow: 1.5,
                      hozAlign: "right",
                      formatter: (W) => {
                        const N = W.getValue();
                        return N == null ? "" : `<span style="color:${N < 0 ? "#dc3545" : N > 0 ? "#28a745" : "#000"}">$${Number(N).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>`;
                      }
                    },
                    {
                      title: "Entry Cash Flow",
                      field: "computed_cash_flow_on_entry",
                      widthGrow: 1,
                      hozAlign: "right",
                      formatter: (W) => {
                        const N = W.getValue();
                        return N == null ? "" : `<span style="color:${N < 0 ? "#dc3545" : N > 0 ? "#28a745" : "#000"}">$${Number(N).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>`;
                      }
                    }
                  ]
                });
              }
              console.log("✅ Appending nested container to row"), L.appendChild(X);
            } catch (X) {
              console.error("❌ Error creating nested tables:", X);
            } finally {
              setTimeout(() => {
                ye.value.delete(_), console.log("✅ Removed from processing");
              }, 100);
            }
          } else
            console.log("ℹ️ Row not expanded or no attachments");
        } catch (f) {
          console.error("❌ Row formatter error:", f);
        }
      }
    }), Be = F(!1), Re = F("trades"), ut = F(null), Se = F(null), Lt = F(""), St = F(""), De = F(/* @__PURE__ */ new Set()), _e = F(/* @__PURE__ */ new Set()), st = F(!1), ct = F([]), ft = F([]);
    function ki(C) {
      De.value.has(C) ? De.value.delete(C) : De.value.add(C);
    }
    function Mi(C) {
      _e.value.has(C) ? _e.value.delete(C) : _e.value.add(C);
    }
    async function Nt(C) {
      st.value = !0, ct.value = [];
      try {
        const f = it(C.symbol)[0] || "";
        if (!f) return;
        const L = await ht(f, C.internal_account_id), _ = Lt.value.trim().toLowerCase();
        ct.value = _ ? L.filter((S) => (S.symbol || "").toLowerCase().includes(_) || String(S.tradeID || "").toLowerCase().includes(_)) : L;
      } catch (f) {
        console.error("❌ loadAttachableTradesForPosition error:", f), ct.value = [];
      } finally {
        st.value = !1;
      }
    }
    async function Vt(C) {
      st.value = !0, ft.value = [];
      try {
        const f = it(C.symbol)[0] || "";
        if (!f) return;
        const L = C.internal_account_id || C.legal_entity, _ = await Pi(r, f, e.userId, L), S = St.value.trim().toLowerCase();
        ft.value = S ? _.filter((b) => (b.symbol || "").toLowerCase().includes(S)) : _;
      } catch (f) {
        console.error("❌ loadAttachablePositionsForPosition error:", f), ft.value = [];
      } finally {
        st.value = !1;
      }
    }
    async function ps(C, f = "trades") {
      ut.value = C, Se.value = C, Re.value = f, Lt.value = "", St.value = "";
      const L = ge(C);
      De.value = new Set(Oe.value.get(L) || []), _e.value = new Set(et.value.get(L) || []), Be.value = !0, f === "trades" ? await Nt(C) : await Vt(C);
    }
    async function ms() {
      if (!ut.value || !e.userId) return;
      const C = ge(ut.value);
      try {
        await Ds(r, e.userId, C, De.value), ae && await ae(), Be.value = !1, Le.value && Le.value.redraw(!0), console.log("✅ Trades attached");
      } catch (f) {
        console.error("❌ Error saving attached trades:", f);
      }
    }
    async function gs() {
      if (!Se.value || !e.userId) return;
      const C = ge(Se.value);
      try {
        await _s(r, e.userId, C, _e.value), ae && await ae(), Be.value = !1, Le.value && Le.value.redraw(!0), console.log("✅ Positions attached");
      } catch (f) {
        console.error("❌ Error saving attached positions:", f);
      }
    }
    function Li(C) {
      if (C.asset_class !== "OPT") return !1;
      const L = it(C.symbol)[1];
      if (!L) return !1;
      const _ = new Date(L), S = /* @__PURE__ */ new Date();
      return S.setHours(0, 0, 0, 0), _ < S;
    }
    He(Be, (C) => {
      try {
        C ? document.body.classList.add("modal-open") : document.body.classList.remove("modal-open");
      } catch {
      }
    });
    function bs() {
      t.value = !t.value, t.value && !Bt.value && d.value && d.value.length > 0 && (console.log("📊 Details shown, initializing table..."), zt(() => {
        Ti();
      }));
    }
    function vs() {
      i.value = !i.value;
    }
    function ws() {
      s.value = !s.value;
    }
    function Cs() {
      n.value = !n.value;
    }
    function ys(C) {
      if (!C) return "";
      const f = new Date(C);
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: "America/Los_Angeles",
        timeZoneName: "short"
      }).format(f);
    }
    return He(tt, async (C) => {
      console.log("👀 Mappings ready state changed:", C), C && Le.value && Bt.value && (console.log("🔄 Redrawing table with mappings"), Le.value.redraw(!0));
    }, { immediate: !0 }), He(t, async (C) => {
      C && !Bt.value && d.value && d.value.length > 0 && (console.log("📊 Details shown via watch, initializing table..."), await zt(), Ti());
    }), Ms(() => {
      console.log("📊 CurrentPositions component mounted");
    }), zi(() => {
      console.log("🧹 Cleaning up CurrentPositions component"), E();
    }), (C, f) => {
      var L, _, S;
      return k(), T("div", mr, [
        p("div", gr, [
          p("div", br, [
            p("h2", null, "Current Positions for " + y(e.symbolRoot) + " Across All Accounts", 1),
            R(u) ? (k(), T("div", vr, [
              f[13] || (f[13] = p("div", { class: "spinner" }, null, -1)),
              p("p", null, "Loading positions for " + y(e.symbolRoot) + "...", 1)
            ])) : R(c) ? (k(), T("div", wr, [
              p("p", null, "❌ Error loading positions: " + y((L = R(g)) == null ? void 0 : L.message), 1)
            ])) : (k(), T("div", Cr, [
              p("div", yr, [
                p("div", Er, [
                  f[16] || (f[16] = p("div", { class: "summary-label" }, "Capital/margin used", -1)),
                  R(ls) ? (k(), T("div", Rr, [...f[14] || (f[14] = [
                    p("span", { class: "loading-spinner" }, "⏳", -1),
                    ee(" Loading... ", -1)
                  ])])) : R(hs) ? (k(), T("div", xr, " ❌ Error ")) : (k(), T("div", Tr, [
                    p("div", {
                      class: "summary-value clickable-price",
                      onClick: Cs
                    }, [
                      R(Ei) !== null ? (k(), T("span", kr, " $" + y(R(Ei).toLocaleString(void 0, { minimumFractionDigits: 0, maximumFractionDigits: 0 })), 1)) : (k(), T("span", Mr, "N/A")),
                      p("span", Lr, y(n.value ? "▼" : "▶"), 1)
                    ]),
                    f[15] || (f[15] = p("div", {
                      class: "capital-subtitle",
                      style: { "font-size": "0.85rem", color: "#6c757d", "margin-top": "0.25rem" }
                    }, " Margin: Coming soon... ", -1))
                  ]))
                ]),
                p("div", Sr, [
                  f[18] || (f[18] = p("div", { class: "summary-label" }, "Profit and Loss", -1)),
                  R(rs) ? (k(), T("div", Dr, [...f[17] || (f[17] = [
                    p("span", { class: "loading-spinner" }, "⏳", -1),
                    ee(" Loading... ", -1)
                  ])])) : R(as) ? (k(), T("div", _r, " ❌ Error ")) : (k(), T("div", Fr, [
                    p("div", {
                      class: pe(["summary-value clickable-price pnl-value", { profit: R(Ee), loss: !R(Ee) }]),
                      onClick: ws
                    }, [
                      R(fe) !== null ? (k(), T("span", zr, [
                        ee(y(R(fe) >= 0 ? "+" : "") + "$" + y(R(fe).toLocaleString(void 0, { minimumFractionDigits: 0, maximumFractionDigits: 0 })) + " ", 1),
                        p("span", Pr, "(" + y((_ = R(os)) == null ? void 0 : _.toFixed(2)) + "%)", 1)
                      ])) : (k(), T("span", Hr, "N/A")),
                      p("span", Ar, y(s.value ? "▼" : "▶"), 1)
                    ], 2)
                  ]))
                ]),
                p("div", Or, [
                  f[19] || (f[19] = p("div", { class: "summary-label" }, "Total Contract Quantity", -1)),
                  p("div", Br, [
                    p("div", Nr, y(Ue.value.toLocaleString()), 1),
                    p("div", Vr, [
                      p("span", {
                        class: "clickable-accounts",
                        title: "Show positions table for all accounts",
                        onClick: Dt(bs, ["stop"]),
                        style: { cursor: "pointer", color: "#0d6efd" }
                      }, [
                        ee(" (" + y(((S = R(d)) == null ? void 0 : S.length) || 0) + ") ", 1),
                        p("span", Ir, y(t.value ? "▼" : "▶"), 1)
                      ])
                    ])
                  ])
                ]),
                p("div", Wr, [
                  f[23] || (f[23] = p("div", { class: "summary-label" }, "Current market price", -1)),
                  R(P) ? (k(), T("div", Gr, [...f[20] || (f[20] = [
                    p("span", { class: "loading-spinner" }, "⏳", -1),
                    ee(" Loading... ", -1)
                  ])])) : R(D) ? (k(), T("div", $r, " ❌ Error ")) : $.value !== null ? (k(), T("div", jr, [
                    p("div", Ur, " $" + y($.value.toFixed(2)), 1),
                    ce.value !== null && te.value !== null ? (k(), T("div", qr, [
                      f[21] || (f[21] = ee(" 52W Range: ", -1)),
                      p("span", Kr, "$" + y(ce.value.toFixed(2)), 1),
                      f[22] || (f[22] = ee(" - ", -1)),
                      p("span", Xr, "$" + y(te.value.toFixed(2)), 1)
                    ])) : (k(), T("div", Jr, " 52W Range: N/A ")),
                    J.value ? (k(), T("div", Yr, " Updated: " + y(J.value), 1)) : Q("", !0)
                  ])) : (k(), T("div", Qr, " N/A "))
                ]),
                p("div", Zr, [
                  f[25] || (f[25] = p("div", { class: "summary-label" }, "Average cost per share", -1)),
                  R(ke) ? (k(), T("div", ea, [...f[24] || (f[24] = [
                    p("span", { class: "loading-spinner" }, "⏳", -1),
                    ee(" Loading... ", -1)
                  ])])) : R(Ae) ? (k(), T("div", ta, " ❌ Error ")) : Q("", !0),
                  p("div", ia, [
                    p("div", {
                      class: "summary-value average-cost-price clickable-price",
                      onClick: vs
                    }, [
                      R(se) !== null ? (k(), T("span", sa, " $" + y(R(se).toFixed(2)), 1)) : (k(), T("span", na, "N/A")),
                      p("span", oa, y(i.value ? "▼" : "▶"), 1)
                    ])
                  ])
                ]),
                p("div", ra, [
                  R(oe) ? (k(), T("div", aa, [...f[26] || (f[26] = [
                    p("span", { class: "loading-spinner" }, "⏳", -1),
                    ee(" Loading... ", -1)
                  ])])) : R(q) ? (k(), T("div", la, " ❌ Error ")) : (k(), T("div", ha, [
                    B.value !== null ? (k(), T("div", da, [
                      f[27] || (f[27] = ee(" P/E Ratio: ", -1)),
                      p("span", ua, y(B.value.toFixed(2)), 1)
                    ])) : Q("", !0),
                    K.value !== null ? (k(), T("div", ca, [
                      f[28] || (f[28] = ee(" PEG Ratio: ", -1)),
                      p("span", fa, y(K.value.toFixed(2)), 1)
                    ])) : Q("", !0),
                    f[30] || (f[30] = p("div", {
                      class: "subtitle-info",
                      style: { "font-size": "0.85rem", color: "#6c757d", "margin-top": "0.25rem" }
                    }, [
                      ee(" Debt to equity ratio: "),
                      p("span", { class: "" }, "Coming soon...")
                    ], -1)),
                    A.value !== null ? (k(), T("div", pa, [
                      f[29] || (f[29] = ee(" Market Cap: ", -1)),
                      p("span", ma, "$" + y((A.value / 1e9).toFixed(2)) + "B", 1)
                    ])) : Q("", !0),
                    f[31] || (f[31] = p("div", {
                      class: "subtitle-info",
                      style: { "font-size": "0.85rem", color: "#6c757d", "margin-top": "0.25rem" }
                    }, [
                      ee(" Price to FCF: "),
                      p("span", { class: "" }, "Coming soon...")
                    ], -1))
                  ]))
                ])
              ]),
              mt(gt, { name: "slide-fade" }, {
                default: bt(() => [
                  Xe(p("div", ga, [
                    p("div", {
                      ref_key: "tableDiv",
                      ref: fs
                    }, null, 512)
                  ], 512), [
                    [vt, t.value]
                  ])
                ]),
                _: 1
              }),
              mt(gt, { name: "slide-fade" }, {
                default: bt(() => [
                  Xe(p("div", ba, [
                    f[38] || (f[38] = p("h2", null, "Average Price calculation details :", -1)),
                    p("div", va, [
                      p("button", {
                        class: pe(["tab-button", { active: o.value === "positions" }]),
                        onClick: f[0] || (f[0] = (b) => o.value = "positions")
                      }, " Calculation from Positions ", 2),
                      p("button", {
                        class: pe(["tab-button", { active: o.value === "orders" }]),
                        onClick: f[1] || (f[1] = (b) => o.value = "orders")
                      }, " Calculation from Orders ", 2)
                    ]),
                    o.value === "positions" ? (k(), T("div", wa, [
                      (k(!0), T(xe, null, Te(R(ie), (b, H) => (k(), T("div", {
                        key: `group-${H}`,
                        class: "position-group"
                      }, [
                        p("div", {
                          class: "group-header clickable",
                          onClick: (G) => h(H)
                        }, [
                          p("span", ya, y(a.value.has(H) ? "▼" : "▶"), 1),
                          ee(" Client " + y(H + 1) + ": " + y(b.mainPosition.account), 1)
                        ], 8, Ca),
                        mt(gt, { name: "slide-fade" }, {
                          default: bt(() => [
                            Xe(p("div", Ea, [
                              p("div", Ra, [
                                f[32] || (f[32] = p("span", { class: "position-icon" }, "📍", -1)),
                                p("span", xa, y(b.mainPosition.symbol), 1),
                                p("span", Ta, "@ $" + y(b.mainPosition.avgPrice.toFixed(2)) + " × " + y(b.mainPosition.quantity.toLocaleString()) + " = $" + y(b.mainPosition.totalCost.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)
                              ]),
                              b.callPositions.length > 0 ? (k(), T("div", ka, [
                                f[34] || (f[34] = p("div", { class: "call-header" }, "📞 Call Positions (subtract from cost)", -1)),
                                (k(!0), T(xe, null, Te(b.callPositions, (G, X) => (k(), T("div", {
                                  key: `call-${H}-${X}`,
                                  class: "position-line call-position"
                                }, [
                                  f[33] || (f[33] = p("span", { class: "position-icon" }, null, -1)),
                                  p("span", Ma, y(G.symbol), 1),
                                  p("span", La, "@ $" + y(G.avgPrice.toFixed(2)) + " × " + y(G.quantity.toLocaleString()) + " = $" + y(G.totalCost.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)
                                ]))), 128)),
                                p("div", Sa, " Subtotal Calls: $" + y(Math.abs(b.callPositionsTotalCost).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)
                              ])) : Q("", !0),
                              b.putPositions.length > 0 ? (k(), T("div", Da, [
                                f[36] || (f[36] = p("div", { class: "put-header" }, "📉 Put Positions (display only, not in calculation)", -1)),
                                (k(!0), T(xe, null, Te(b.putPositions, (G, X) => (k(), T("div", {
                                  key: `put-${H}-${X}`,
                                  class: "position-line put-position"
                                }, [
                                  f[35] || (f[35] = p("span", { class: "position-icon" }, "📉", -1)),
                                  p("span", _a, y(G.symbol), 1),
                                  p("span", Fa, "@ $" + y(G.avgPrice.toFixed(2)) + " × " + y(G.quantity.toLocaleString()) + " = $" + y(G.totalCost.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)
                                ]))), 128))
                              ])) : Q("", !0),
                              p("div", za, [
                                f[37] || (f[37] = p("div", { class: "calc-line" }, [
                                  ee("📊 "),
                                  p("strong", null, "Calculation:")
                                ], -1)),
                                p("div", Pa, "Net Cost = $" + y(b.mainPosition.totalCost.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })) + " - $" + y(Math.abs(b.callPositionsTotalCost).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })) + " = $" + y(b.netCostExcludingPuts.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1),
                                p("div", Ha, [
                                  p("strong", null, "Adjusted Avg Price = $" + y(b.netCostExcludingPuts.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })) + " ÷ " + y(b.mainPosition.quantity.toLocaleString()) + " = $" + y(b.adjustedAvgPricePerShare.toFixed(2)) + " per share", 1)
                                ])
                              ])
                            ], 512), [
                              [vt, a.value.has(H)]
                            ])
                          ]),
                          _: 2
                        }, 1024)
                      ]))), 128)),
                      R(se) !== null ? (k(), T("div", Aa, [
                        p("div", Oa, " 🎯 Overall Adjusted Average: $" + y(R(se).toFixed(2)) + " per share ", 1),
                        p("div", Ba, [
                          p("div", Na, "Total Net Cost = " + y(R(ie).map((b, H) => `$${b.netCostExcludingPuts.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).join(" + ")) + " = $" + y(Me.value.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1),
                          p("div", Va, "Total Main Qty = " + y(R(ie).map((b) => b.mainPosition.quantity.toLocaleString()).join(" + ")) + " = " + y(dt.value.toLocaleString()), 1),
                          p("div", Ia, [
                            p("strong", null, "Overall Adjusted Average = $" + y(Me.value.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })) + " ÷ " + y(dt.value.toLocaleString()) + " = $" + y(R(se).toFixed(2)), 1)
                          ])
                        ])
                      ])) : Q("", !0)
                    ])) : o.value === "orders" ? (k(), T("div", Wa, " coming soon... ")) : Q("", !0)
                  ], 512), [
                    [vt, i.value]
                  ])
                ]),
                _: 1
              }),
              mt(gt, { name: "slide-fade" }, {
                default: bt(() => [
                  Xe(p("div", Ga, [
                    f[43] || (f[43] = p("h2", null, "Profit & Loss Calculation Details:", -1)),
                    R(I) && "totalShares" in R(I) && R(I).totalShares != null ? (k(), T("div", $a, [
                      p("div", ja, [
                        f[39] || (f[39] = p("div", { class: "pnl-section-title" }, "📊 Total Cost Basis", -1)),
                        p("div", Ua, " Total Shares = " + y(R(I).totalShares.toLocaleString()), 1),
                        p("div", qa, " Average Cost per Share = $" + y(R(I).avgCostPerShare.toFixed(2)), 1),
                        p("div", Ka, [
                          p("strong", null, "Total Cost Basis = " + y(R(I).totalShares.toLocaleString()) + " × $" + y(R(I).avgCostPerShare.toFixed(2)) + " = $" + y(R(I).totalCostBasis.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)
                        ])
                      ]),
                      p("div", Xa, [
                        f[40] || (f[40] = p("div", { class: "pnl-section-title" }, "💰 Current Market Value", -1)),
                        p("div", Ja, " Current Price per Share = $" + y(R(I).currentPricePerShare.toFixed(2)), 1),
                        p("div", Ya, [
                          p("strong", null, "Current Market Value = " + y(R(I).totalShares.toLocaleString()) + " × $" + y(R(I).currentPricePerShare.toFixed(2)) + " = $" + y(R(I).currentMarketValue.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)
                        ])
                      ]),
                      p("div", Qa, [
                        f[41] || (f[41] = p("div", { class: "pnl-section-title" }, "🎯 Unrealized Profit & Loss", -1)),
                        p("div", Za, [
                          p("strong", {
                            class: pe({ "profit-text": R(Ee), "loss-text": !R(Ee) })
                          }, " Unrealized P&L = $" + y(R(I).currentMarketValue.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })) + " - $" + y(R(I).totalCostBasis.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })) + " = " + y(R(fe) && R(fe) >= 0 ? "+" : "") + "$" + y(R(I).unrealizedPnL.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 3)
                        ]),
                        p("div", el, [
                          p("strong", {
                            class: pe({ "profit-text": R(Ee), "loss-text": !R(Ee) })
                          }, " P&L Percentage = (" + y(R(fe) && R(fe) >= 0 ? "+" : "") + "$" + y(R(I).unrealizedPnL.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })) + " ÷ $" + y(R(I).totalCostBasis.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })) + ") × 100 = " + y(R(I).pnlPercentage.toFixed(2)) + "% ", 3)
                        ])
                      ])
                    ])) : Q("", !0),
                    R(I) && "optionType" in R(I) && R(I).optionType != null ? (k(), T("div", tl, [
                      p("div", il, [
                        p("div", sl, "📊 SHORT " + y(R(I).optionType) + " OPTIONS SUMMARY", 1),
                        p("div", nl, " Total Contracts: " + y(R(I).totalContracts.toLocaleString()), 1),
                        p("div", ol, " Position Type: " + y(R(I).positionType), 1)
                      ]),
                      (k(!0), T(xe, null, Te(R(I).positions, (b, H) => (k(), T("div", {
                        key: `pos-${H}`,
                        class: "pnl-section"
                      }, [
                        p("div", rl, "Position " + y(H + 1) + ": " + y(b.account) + " - $" + y(b.strike) + " Strike (" + y(b.expiry) + ")", 1),
                        p("div", al, " Contracts Sold: " + y(Math.abs(b.quantity).toLocaleString()), 1),
                        p("div", ll, " Premium Received: $" + y(b.premiumReceived.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1),
                        p("div", hl, " Current Market Value: $" + y(b.currentValue.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1),
                        p("div", dl, [
                          p("strong", {
                            class: pe({ "profit-text": b.positionPnL >= 0, "loss-text": b.positionPnL < 0 })
                          }, " P&L: " + y(b.positionPnL >= 0 ? "+" : "") + "$" + y(b.positionPnL.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 3)
                        ])
                      ]))), 128)),
                      p("div", ul, [
                        f[42] || (f[42] = p("div", { class: "pnl-section-title" }, "💰 TOTAL CALCULATION", -1)),
                        p("div", cl, " Total Premium Received = " + y(R(I).positions.map((b) => `$${b.premiumReceived.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).join(" + ")), 1),
                        p("div", fl, [
                          p("strong", null, "= $" + y(R(I).totalPremiumReceived.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)
                        ]),
                        p("div", pl, " Current Market Liability = " + y(R(I).positions.map((b) => `$${b.currentValue.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).join(" + ")), 1),
                        p("div", ml, [
                          p("strong", null, "= $" + y(R(I).currentMarketLiability.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)
                        ]),
                        p("div", gl, [
                          p("strong", {
                            class: pe({ "profit-text": R(Ee), "loss-text": !R(Ee) })
                          }, " Unrealized P&L = $" + y(R(I).totalPremiumReceived.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })) + " - $" + y(R(I).currentMarketLiability.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })) + " = " + y(R(fe) && R(fe) >= 0 ? "+" : "") + "$" + y(R(I).unrealizedPnL.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 3)
                        ]),
                        p("div", bl, [
                          p("strong", {
                            class: pe({ "profit-text": R(Ee), "loss-text": !R(Ee) })
                          }, " P&L % = (" + y(R(fe) && R(fe) >= 0 ? "+" : "") + "$" + y(R(I).unrealizedPnL.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })) + " ÷ $" + y(R(I).totalPremiumReceived.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })) + ") × 100 = " + y(R(I).pnlPercentage.toFixed(2)) + "% ", 3)
                        ]),
                        R(I).pnlPercentage < -50 ? (k(), T("div", vl, " ⚠️ WARNING: Loss exceeds 50% of premium received! ")) : Q("", !0)
                      ])
                    ])) : Q("", !0)
                  ], 512), [
                    [vt, s.value]
                  ])
                ]),
                _: 1
              }),
              mt(gt, { name: "slide-fade" }, {
                default: bt(() => [
                  Xe(p("div", wl, [
                    f[48] || (f[48] = p("h2", null, "Capital Used Calculation Details:", -1)),
                    R(ve) ? R(ve).assetType === "STK" ? (k(), T("div", yl, [
                      p("div", El, [
                        f[45] || (f[45] = p("div", { class: "capital-section-title" }, "📊 STOCK CAPITAL CALCULATION", -1)),
                        p("div", Rl, " Total Shares = " + y(R(ve).totalShares.toLocaleString()), 1),
                        p("div", xl, " Current Price per Share = $" + y(R(ve).pricePerShare.toFixed(2)), 1),
                        p("div", Tl, [
                          p("strong", null, " Total Capital Used = " + y(R(ve).totalShares.toLocaleString()) + " × $" + y(R(ve).pricePerShare.toFixed(2)) + " = $" + y(R(ve).totalCapital.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)
                        ])
                      ])
                    ])) : R(ve).assetType === "OPT" ? (k(), T("div", kl, [
                      f[47] || (f[47] = p("div", { class: "capital-section" }, [
                        p("div", { class: "capital-section-title" }, "📊 OPTIONS CAPITAL CALCULATION"),
                        p("div", { class: "calc-line" }, " Capital = Sum of |Market Value| for all option positions ")
                      ], -1)),
                      (k(!0), T(xe, null, Te(R(ve).positions, (b, H) => (k(), T("div", {
                        key: `cap-${H}`,
                        class: "capital-section"
                      }, [
                        p("div", Ml, " Position " + y(H + 1) + ": " + y(b.account) + " - " + y(b.optionType), 1),
                        p("div", Ll, " Symbol: " + y(b.symbol), 1),
                        p("div", Sl, " Quantity: " + y(Math.abs(b.quantity).toLocaleString()) + " contracts ", 1),
                        p("div", Dl, " Market Price: $" + y(b.marketPrice.toFixed(2)) + " per contract ", 1),
                        p("div", _l, [
                          p("strong", null, " Market Value = " + y(Math.abs(b.quantity).toLocaleString()) + " × $" + y(b.marketPrice.toFixed(2)) + " = $" + y(Math.abs(b.marketValue).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)
                        ])
                      ]))), 128)),
                      p("div", Fl, [
                        f[46] || (f[46] = p("div", { class: "capital-section-title" }, "💰 TOTAL CAPITAL USED", -1)),
                        p("div", zl, " Total = " + y(R(ve).positions.map((b) => `$${Math.abs(b.marketValue).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).join(" + ")), 1),
                        p("div", Pl, [
                          p("strong", null, " = $" + y(R(ve).totalOptionsCapital.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)
                        ])
                      ])
                    ])) : Q("", !0) : (k(), T("div", Cl, [...f[44] || (f[44] = [
                      p("p", null, "No capital data available", -1)
                    ])]))
                  ], 512), [
                    [vt, n.value]
                  ])
                ]),
                _: 1
              })
            ]))
          ])
        ]),
        Be.value ? (k(), T("div", {
          key: 0,
          class: "modal-overlay",
          onClick: f[12] || (f[12] = (b) => Be.value = !1)
        }, [
          p("div", {
            class: "modal-content trade-attach-modal",
            onClick: f[11] || (f[11] = Dt(() => {
            }, ["stop"]))
          }, [
            p("div", Hl, [
              f[49] || (f[49] = p("h3", null, "Attach to Position", -1)),
              p("button", {
                class: "modal-close",
                onClick: f[2] || (f[2] = (b) => Be.value = !1)
              }, "×")
            ]),
            p("div", Al, [
              Se.value ? (k(), T("div", Ol, [
                f[50] || (f[50] = p("strong", null, "Position:", -1)),
                (k(!0), T(xe, null, Te(it(Se.value.symbol), (b) => (k(), T("span", {
                  key: b,
                  class: "fi-tag position-tag"
                }, y(b), 1))), 128)),
                ee(" • (Contract Qty: " + y(Se.value.contract_quantity) + " · Avg price: $" + y(Se.value.avgPrice) + ") ", 1)
              ])) : Q("", !0),
              p("div", Bl, [
                p("button", {
                  class: pe(["tab-button", { active: Re.value === "trades" }]),
                  onClick: f[3] || (f[3] = (b) => {
                    Re.value = "trades", Nt(ut.value);
                  })
                }, "Trades", 2),
                p("button", {
                  class: pe(["tab-button", { active: Re.value === "positions" }]),
                  onClick: f[4] || (f[4] = (b) => {
                    Re.value = "positions", Vt(Se.value);
                  })
                }, "Positions", 2)
              ]),
              Re.value === "trades" ? (k(), T("div", Nl, [
                p("div", Vl, [
                  Xe(p("input", {
                    "onUpdate:modelValue": f[5] || (f[5] = (b) => Lt.value = b),
                    type: "text",
                    class: "search-input",
                    placeholder: "Search trades (e.g., 'Put' or 'Call, 250')...",
                    onInput: f[6] || (f[6] = (b) => Nt(ut.value))
                  }, null, 544), [
                    [Si, Lt.value]
                  ]),
                  f[51] || (f[51] = p("div", { class: "search-hint" }, [
                    ee("💡 "),
                    p("em", null, "Use commas to search multiple terms (AND logic)")
                  ], -1))
                ]),
                st.value ? (k(), T("div", Il, "Loading trades...")) : (k(), T("div", Wl, [
                  (k(!0), T(xe, null, Te(ct.value, (b) => (k(), T("div", {
                    key: b.tradeID,
                    class: pe(["trade-item", { selected: De.value.has(String(b.tradeID)) }]),
                    onClick: (H) => ki(String(b.tradeID))
                  }, [
                    p("input", {
                      type: "checkbox",
                      checked: De.value.has(String(b.tradeID)),
                      onClick: Dt((H) => ki(String(b.tradeID)), ["stop"])
                    }, null, 8, $l),
                    p("div", jl, [
                      p("div", Ul, [
                        p("span", {
                          class: pe(["trade-side", (b.buySell || "").toLowerCase()])
                        }, y(b.buySell), 3),
                        p("strong", null, [
                          (k(!0), T(xe, null, Te(Ri(b.symbol), (H) => (k(), T("span", {
                            key: H,
                            class: "fi-tag position-tag"
                          }, y(H), 1))), 128))
                        ]),
                        p("span", ql, "Qty: " + y(b.quantity), 1),
                        p("span", Kl, "· Price: " + y(b.tradePrice), 1)
                      ]),
                      p("div", Xl, [
                        p("span", null, "Trade date: " + y(qe(b.tradeDate)), 1),
                        b.assetCategory ? (k(), T("span", Jl, "• " + y(b.assetCategory), 1)) : Q("", !0),
                        b.description ? (k(), T("span", Yl, "• " + y(b.description), 1)) : Q("", !0),
                        p("span", Ql, "• ID: " + y(b.tradeID), 1)
                      ])
                    ])
                  ], 10, Gl))), 128)),
                  ct.value.length === 0 ? (k(), T("div", Zl, " No trades found ")) : Q("", !0)
                ]))
              ])) : (k(), T("div", eh, [
                p("div", th, [
                  Xe(p("input", {
                    "onUpdate:modelValue": f[7] || (f[7] = (b) => St.value = b),
                    type: "text",
                    class: "search-input",
                    placeholder: "Search positions (e.g., 'Put' or 'Call, 250')...",
                    onInput: f[8] || (f[8] = (b) => Vt(Se.value))
                  }, null, 544), [
                    [Si, St.value]
                  ]),
                  f[52] || (f[52] = p("div", { class: "search-hint" }, [
                    ee("💡 "),
                    p("em", null, "Showing positions with same underlying symbol. Use commas to search multiple terms.")
                  ], -1))
                ]),
                st.value ? (k(), T("div", ih, "Loading positions...")) : (k(), T("div", sh, [
                  (k(!0), T(xe, null, Te(ft.value, (b) => (k(), T("div", {
                    key: R(ge)(b),
                    class: pe(["trade-item", { selected: _e.value.has(R(ge)(b)), expired: b.asset_class === "OPT" && Li(b) }]),
                    onClick: (H) => Mi(R(ge)(b))
                  }, [
                    p("input", {
                      type: "checkbox",
                      checked: _e.value.has(R(ge)(b)),
                      onClick: Dt((H) => Mi(R(ge)(b)), ["stop"])
                    }, null, 8, oh),
                    p("div", rh, [
                      p("div", ah, [
                        p("strong", null, [
                          (k(!0), T(xe, null, Te(it(b.symbol), (H) => (k(), T("span", {
                            key: H,
                            class: "fi-tag position-tag"
                          }, y(H), 1))), 128))
                        ]),
                        p("span", lh, "Qty: " + y(b.contract_quantity), 1),
                        p("span", hh, "· Avg price: " + y(Ke(b.avgPrice)), 1),
                        Li(b) ? (k(), T("span", dh, "EXPIRED")) : Q("", !0)
                      ]),
                      p("div", uh, [
                        p("span", null, y(b.asset_class), 1),
                        f[53] || (f[53] = p("span", null, "•", -1)),
                        p("span", null, y(b.internal_account_id || b.legal_entity), 1),
                        b.market_value ? (k(), T("span", ch, "• MV: " + y(Ke(b.market_value)), 1)) : Q("", !0),
                        f[54] || (f[54] = p("span", null, " • ", -1)),
                        p("span", null, "Fetched at: " + y(ys(b.fetched_at)), 1)
                      ])
                    ])
                  ], 10, nh))), 128)),
                  ft.value.length === 0 ? (k(), T("div", fh, " No positions found ")) : Q("", !0)
                ]))
              ]))
            ]),
            p("div", ph, [
              p("button", {
                class: "btn btn-secondary",
                onClick: f[9] || (f[9] = (b) => Be.value = !1)
              }, "Cancel"),
              p("button", {
                class: "btn btn-primary",
                disabled: Re.value === "trades" ? De.value.size === 0 : _e.value.size === 0,
                onClick: f[10] || (f[10] = (b) => Re.value === "trades" ? ms() : gs())
              }, " Attach " + y(Re.value === "trades" ? De.value.size : _e.value.size) + " " + y(Re.value === "trades" ? "Trade(s)" : "Position(s)"), 9, mh)
            ])
          ])
        ])) : Q("", !0)
      ]);
    };
  }
}), bh = (l, e) => {
  const t = l.__vccOpts || l;
  for (const [i, s] of e)
    t[i] = s;
  return t;
}, Rh = /* @__PURE__ */ bh(gh, [["__scopeId", "data-v-e85d42b4"]]);
export {
  Rh as currentPositions,
  Rh as default
};
