var Zs = Object.defineProperty;
var eo = (h, e, t) => e in h ? Zs(h, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : h[e] = t;
var O = (h, e, t) => eo(h, typeof e != "symbol" ? e + "" : e, t);
import { inject as to, ref as B, watch as Fe, nextTick as Zt, onBeforeUnmount as ss, computed as se, defineComponent as os, createElementBlock as C, openBlock as E, Fragment as oe, createVNode as Ie, Transition as st, withCtx as ot, createCommentVNode as U, toDisplayString as m, withDirectives as He, createElementVNode as l, normalizeClass as de, createTextVNode as Y, renderList as ae, vShow as mt, onMounted as io, unref as F, withModifiers as At, vModelText as di } from "vue";
import { useQueryClient as Ni, useQuery as Vi } from "@tanstack/vue-query";
import { useSupabase as Et, generatePositionMappingKey as It, usePositionTradeMappingsQuery as so, usePositionPositionMappingsQuery as oo, usePositionOrderMappingsQuery as no, savePositionOrderMappings as ao, fetchPositionsBySymbolRoot as ns, savePositionTradeMappings as ro, savePositionPositionMappings as lo } from "@y2kfund/core";
const ho = Symbol.for("y2kfund.supabase");
function Ii() {
  const h = to(ho, null);
  if (!h) throw new Error("[@y2kfund/core] Supabase client not found. Did you install createCore()?");
  return h;
}
async function Wi(h, e) {
  if (!e)
    return console.log("⚠️ No userId provided, showing all positions"), [];
  try {
    console.log("👤 Fetching accessible accounts for user:", e);
    const { data: t, error: i } = await h.schema("hf").from("user_account_access").select("internal_account_id").eq("user_id", e).eq("is_active", !0);
    if (i)
      return console.error("❌ Error fetching user account access:", i), [];
    if (!t || t.length === 0)
      return console.log("⚠️ No account access found for user, showing all positions"), [];
    const s = t.map((o) => o.internal_account_id);
    return console.log("✅ User has access to accounts:", s), s;
  } catch (t) {
    return console.error("❌ Exception fetching account access:", t), [];
  }
}
const co = {
  details: (h, e) => ["currentPosition", h, e]
};
function uo(h, e) {
  const t = Ii(), i = Ni(), s = co.details(h, e), o = Vi({
    queryKey: s,
    queryFn: async () => {
      const a = e == null ? void 0 : e.trim();
      if (!a)
        return console.log("⚠️ No symbol provided, returning empty array"), [];
      console.log("🔍 [CurrentPosition] Querying with:", {
        userId: h || "none (all accounts)",
        symbolName: a
      });
      const r = await Wi(t, h);
      h && r.length === 0 ? console.log("⚠️ User has no account access restrictions - showing all accounts") : r.length > 0 && console.log("🔒 User has access to accounts:", r);
      const { data: d, error: c } = await t.schema("hf").from("positions").select("fetched_at").order("fetched_at", { ascending: !1 }).limit(1).single();
      if (c)
        throw console.error("❌ Error fetching latest fetched_at:", c), c;
      if (!d || !d.fetched_at)
        return console.log("⚠️ No positions found in database"), [];
      const u = d.fetched_at;
      console.log("📅 Latest fetched_at:", u);
      let p = t.schema("hf").from("positions").select("*").eq("fetched_at", u).eq("asset_class", "STK").eq("symbol", `${a}`).order("symbol", { ascending: !0 });
      r.length > 0 && (p = p.in("internal_account_id", r));
      const { data: v, error: y } = await p;
      if (y)
        throw console.error("❌ Error fetching positions:", y), y;
      if (!v || v.length === 0)
        return console.log("📊 No positions found matching criteria"), [];
      console.log(`✅ Found ${v.length} position(s) matching symbol "${a}"`);
      const L = Array.from(
        new Set(v.map((P) => P.internal_account_id))
      ), [_, x] = await Promise.all([
        t.schema("hf").from("user_accounts_master").select("internal_account_id, legal_entity").in("internal_account_id", L),
        h ? t.schema("hf").from("user_account_alias").select("internal_account_id, alias").eq("user_id", h).in("internal_account_id", L) : { data: [], error: null }
      ]);
      _.error && console.warn("⚠️ Error fetching account names:", _.error), x.error && console.warn("⚠️ Error fetching account aliases:", x.error);
      const g = new Map(
        (_.data || []).map((P) => [P.internal_account_id, P.legal_entity])
      ), f = new Map(
        (x.data || []).map((P) => [P.internal_account_id, P.alias])
      ), D = v.map((P) => {
        let S = g.get(P.internal_account_id);
        return f.has(P.internal_account_id) && (S = f.get(P.internal_account_id)), {
          ...P,
          legal_entity: S
        };
      });
      return console.log("✅ Successfully enriched positions with account info"), D;
    },
    enabled: !!e && e.trim().length > 0,
    // Only run if symbol provided
    staleTime: 6e4,
    // 1 minute cache
    retry: 2
    // Retry failed queries up to 2 times
  }), n = t.channel(`instrument-details:${e}`).on(
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
    ...o,
    _cleanup: () => {
      var a;
      console.log("🧹 Cleaning up instrument details subscription"), (a = n == null ? void 0 : n.unsubscribe) == null || a.call(n);
    }
  };
}
async function fo(h, e, t) {
  var i;
  const s = await Wi(h, t);
  console.log("🔍 Querying put positions with:", {
    symbolRoot: e,
    userId: t || "none",
    accessibleAccountIds: s.length > 0 ? s : "all"
  });
  const { data: o, error: n } = await h.schema("hf").from("positions").select("fetched_at").order("fetched_at", { ascending: !1 }).limit(1).single();
  if (n)
    throw console.error("❌ Error fetching latest fetched_at:", n), n;
  const a = o.fetched_at;
  console.log("📅 Latest fetched_at:", a);
  let r = h.schema("hf").from("positions").select("*").eq("fetched_at", a).ilike("symbol", `%${e}% P %`);
  s.length > 0 && (r = r.in("internal_account_id", s));
  const { data: d, error: c } = await r;
  if (c)
    throw console.error("❌ Error fetching put positions:", c), c;
  const [u, p] = await Promise.all([
    h.schema("hf").from("user_accounts_master").select("internal_account_id, legal_entity"),
    t ? h.schema("hf").from("user_account_alias").select("internal_account_id, alias").eq("user_id", t) : { data: [], error: null }
  ]);
  if (u.error)
    throw console.error("❌ Accounts query error:", u.error), u.error;
  console.log("✅ Put positions query success:", {
    positionsCount: (d == null ? void 0 : d.length) || 0,
    accountsCount: (i = u.data) == null ? void 0 : i.length,
    filtered: s.length > 0
  });
  const v = new Map(
    (p.data || []).map((_) => [_.internal_account_id, _.alias])
  ), y = new Map(
    (u.data || []).map((_) => [_.internal_account_id, _.legal_entity])
  ), L = (d || []).map((_) => {
    let x = y.get(_.internal_account_id) || void 0;
    return v.has(_.internal_account_id) && (x = v.get(_.internal_account_id)), {
      ..._,
      legal_entity: x
    };
  });
  return console.log("✅ Enriched put positions with accounts", L.length), L;
}
function mo(h, e) {
  const t = Ii(), i = Ni(), s = ["putPositions", h, e], o = Vi({
    queryKey: s,
    queryFn: async () => h ? await fo(t, h, e) : [],
    enabled: !!h,
    staleTime: 6e4
    // 1 minute
  }), n = t.channel(`put-positions:${h}:${e}`).on(
    "postgres_changes",
    {
      event: "*",
      schema: "hf",
      table: "positions",
      filter: `symbol=ilike.%${h}%P%`
    },
    () => {
      console.log("🔄 Put positions changed, invalidating query..."), i.invalidateQueries({ queryKey: s });
    }
  ).subscribe();
  return { ...o, _cleanup: () => {
    n.unsubscribe();
  } };
}
async function po(h, e, t) {
  var i;
  const s = await Wi(h, t);
  console.log("🔍 Querying call positions with:", {
    symbolRoot: e,
    userId: t || "none",
    accessibleAccountIds: s.length > 0 ? s : "all"
  });
  const { data: o, error: n } = await h.schema("hf").from("positions").select("fetched_at").order("fetched_at", { ascending: !1 }).limit(1).single();
  if (n)
    throw console.error("❌ Error fetching latest fetched_at:", n), n;
  const a = o.fetched_at;
  console.log("📅 Latest fetched_at:", a);
  let r = h.schema("hf").from("positions").select("*").eq("fetched_at", a).ilike("symbol", `%${e}% C %`);
  s.length > 0 && (r = r.in("internal_account_id", s));
  const { data: d, error: c } = await r;
  if (c)
    throw console.error("❌ Error fetching call positions:", c), c;
  const [u, p] = await Promise.all([
    h.schema("hf").from("user_accounts_master").select("internal_account_id, legal_entity"),
    t ? h.schema("hf").from("user_account_alias").select("internal_account_id, alias").eq("user_id", t) : { data: [], error: null }
  ]);
  if (u.error)
    throw console.error("❌ Accounts query error:", u.error), u.error;
  console.log("✅ Call positions query success:", {
    positionsCount: (d == null ? void 0 : d.length) || 0,
    accountsCount: (i = u.data) == null ? void 0 : i.length,
    filtered: s.length > 0
  });
  const v = new Map(
    (p.data || []).map((_) => [_.internal_account_id, _.alias])
  ), y = new Map(
    (u.data || []).map((_) => [_.internal_account_id, _.legal_entity])
  ), L = (d || []).map((_) => {
    let x = y.get(_.internal_account_id) || void 0;
    return v.has(_.internal_account_id) && (x = v.get(_.internal_account_id)), {
      ..._,
      legal_entity: x
    };
  });
  return console.log("✅ Enriched call positions with accounts", L.length), L;
}
function go(h, e) {
  const t = Ii(), i = Ni(), s = ["callPositions", h, e], o = Vi({
    queryKey: s,
    queryFn: async () => h ? await po(t, h, e) : [],
    enabled: !!h,
    staleTime: 6e4
    // 1 minute
  }), n = t.channel(`call-positions:${h}:${e}`).on(
    "postgres_changes",
    {
      event: "*",
      schema: "hf",
      table: "positions",
      filter: `symbol=ilike.%${h}%P%`
    },
    () => {
      console.log("🔄 Call positions changed, invalidating query..."), i.invalidateQueries({ queryKey: s });
    }
  ).subscribe();
  return { ...o, _cleanup: () => {
    n.unsubscribe();
  } };
}
class pe {
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
class ne {
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
    var s = e ? t.split(e) : [t], o = s.length, n;
    for (let a = 0; a < o && (i = i[s[a]], n = i, !!i); a++)
      ;
    return n;
  }
  static deepClone(e, t, i = []) {
    var s = {}.__proto__, o = [].__proto__;
    t || (t = Object.assign(Array.isArray(e) ? [] : {}, e));
    for (var n in e) {
      let a = e[n], r, d;
      a != null && typeof a == "object" && (a.__proto__ === s || a.__proto__ === o) && (r = i.findIndex((c) => c.subject === a), r > -1 ? t[n] = i[r].copy : (d = Object.assign(Array.isArray(a) ? [] : {}, a), i.unshift({ subject: a, copy: d }), t[n] = this.deepClone(a, d, i)));
    }
    return t;
  }
}
let bo = class as extends pe {
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
      let o = ne.elOffset(this.container);
      i -= o.left, s -= o.top;
    }
    return { x: i, y: s };
  }
  elementPositionCoords(e, t = "right") {
    var i = ne.elOffset(e), s, o, n;
    switch (this.container !== document.body && (s = ne.elOffset(this.container), i.left -= s.left, i.top -= s.top), t) {
      case "right":
        o = i.left + e.offsetWidth, n = i.top - 1;
        break;
      case "bottom":
        o = i.left, n = i.top + e.offsetHeight;
        break;
      case "left":
        o = i.left, n = i.top - 1;
        break;
      case "top":
        o = i.left, n = i.top;
        break;
      case "center":
        o = i.left + e.offsetWidth / 2, n = i.top + e.offsetHeight / 2;
        break;
    }
    return { x: o, y: n, offset: i };
  }
  show(e, t) {
    var i, s, o, n, a;
    return this.destroyed || this.table.destroyed ? this : (e instanceof HTMLElement ? (o = e, a = this.elementPositionCoords(e, t), n = a.offset, i = a.x, s = a.y) : typeof e == "number" ? (n = { top: 0, left: 0 }, i = e, s = t) : (a = this.containerEventCoords(e), i = a.x, s = a.y, this.reversedX = !1), this.element.style.top = s + "px", this.element.style.left = i + "px", this.container.appendChild(this.element), typeof this.renderedCallback == "function" && this.renderedCallback(), this._fitToScreen(i, s, o, n, t), this.visible = !0, this.subscribe("table-destroy", this.destroyBinding), this.element.addEventListener("mousedown", (r) => {
      r.stopPropagation();
    }), this);
  }
  _fitToScreen(e, t, i, s, o) {
    var n = this.container === document.body ? document.documentElement.scrollTop : this.container.scrollTop;
    (e + this.element.offsetWidth >= this.container.offsetWidth || this.reversedX) && (this.element.style.left = "", i ? this.element.style.right = this.container.offsetWidth - s.left + "px" : this.element.style.right = this.container.offsetWidth - e + "px", this.reversedX = !0);
    let a = Math.max(this.container.offsetHeight, n ? this.container.scrollHeight : 0);
    if (t + this.element.offsetHeight > a)
      if (i)
        switch (o) {
          case "bottom":
            this.element.style.top = parseInt(this.element.style.top) - this.element.offsetHeight - i.offsetHeight - 1 + "px";
            break;
          default:
            this.element.style.top = parseInt(this.element.style.top) - this.element.offsetHeight + i.offsetHeight + 1 + "px";
        }
      else
        this.element.style.height = a + "px";
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
    return this.childPopup && this.childPopup.hide(), this.childPopup = new as(this.table, e, this), this.childPopup;
  }
};
class q extends pe {
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
    return new bo(this.table, e, t);
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
var vo = {
  rownum: function(h, e, t, i, s, o) {
    return o.getPosition();
  }
};
const kt = class kt extends q {
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
      var o = "accessor" + (s.charAt(0).toUpperCase() + s.slice(1)), n;
      e.definition[o] && (n = this.lookupAccessor(e.definition[o]), n && (t = !0, i[o] = {
        accessor: n,
        params: e.definition[o + "Params"] || {}
      }));
    }), t && (e.modules.accessor = i);
  }
  lookupAccessor(e) {
    var t = !1;
    switch (typeof e) {
      case "string":
        kt.accessors[e] ? t = kt.accessors[e] : console.warn("Accessor Error - No such accessor found, ignoring: ", e);
        break;
      case "function":
        t = e;
        break;
    }
    return t;
  }
  //apply accessor to row
  transformRow(e, t) {
    var i = "accessor" + (t.charAt(0).toUpperCase() + t.slice(1)), s = e.getComponent(), o = ne.deepClone(e.data || {});
    return this.table.columnManager.traverse(function(n) {
      var a, r, d, c;
      n.modules.accessor && (r = n.modules.accessor[i] || n.modules.accessor.accessor || !1, r && (a = n.getFieldValue(o), a != "undefined" && (c = n.getComponent(), d = typeof r.params == "function" ? r.params(a, o, t, c, s) : r.params, n.setFieldValue(o, r.accessor(a, o, t, d, c, s)))));
    }), o;
  }
};
O(kt, "moduleName", "accessor"), //load defaults
O(kt, "accessors", vo);
let fi = kt;
var yo = {
  method: "GET"
};
function mi(h, e) {
  var t = [];
  if (e = e || "", Array.isArray(h))
    h.forEach((s, o) => {
      t = t.concat(mi(s, e ? e + "[" + o + "]" : o));
    });
  else if (typeof h == "object")
    for (var i in h)
      t = t.concat(mi(h[i], e ? e + "[" + i + "]" : i));
  else
    t.push({ key: e, value: h });
  return t;
}
function wo(h) {
  var e = mi(h), t = [];
  return e.forEach(function(i) {
    t.push(encodeURIComponent(i.key) + "=" + encodeURIComponent(i.value));
  }), t.join("&");
}
function rs(h, e, t) {
  return h && t && Object.keys(t).length && (!e.method || e.method.toLowerCase() == "get") && (e.method = "get", h += (h.includes("?") ? "&" : "?") + wo(t)), h;
}
function Co(h, e, t) {
  var i;
  return new Promise((s, o) => {
    if (h = this.urlGenerator.call(this.table, h, e, t), e.method.toUpperCase() != "GET")
      if (i = typeof this.table.options.ajaxContentType == "object" ? this.table.options.ajaxContentType : this.contentTypeFormatters[this.table.options.ajaxContentType], i) {
        for (var n in i.headers)
          e.headers || (e.headers = {}), typeof e.headers[n] > "u" && (e.headers[n] = i.headers[n]);
        e.body = i.body.call(this, h, e, t);
      } else
        console.warn("Ajax Error - Invalid ajaxContentType value:", this.table.options.ajaxContentType);
    h ? (typeof e.headers > "u" && (e.headers = {}), typeof e.headers.Accept > "u" && (e.headers.Accept = "application/json"), typeof e.headers["X-Requested-With"] > "u" && (e.headers["X-Requested-With"] = "XMLHttpRequest"), typeof e.mode > "u" && (e.mode = "cors"), e.mode == "cors" ? (typeof e.headers.Origin > "u" && (e.headers.Origin = window.location.origin), typeof e.credentials > "u" && (e.credentials = "same-origin")) : typeof e.credentials > "u" && (e.credentials = "include"), fetch(h, e).then((a) => {
      a.ok ? a.json().then((r) => {
        s(r);
      }).catch((r) => {
        o(r), console.warn("Ajax Load Error - Invalid JSON returned", r);
      }) : (console.error("Ajax Load Error - Connection Error: " + a.status, a.statusText), o(a));
    }).catch((a) => {
      console.error("Ajax Load Error - Connection Error: ", a), o(a);
    })) : (console.warn("Ajax Load Error - No URL Set"), s([]));
  });
}
function pi(h, e) {
  var t = [];
  if (e = e || "", Array.isArray(h))
    h.forEach((s, o) => {
      t = t.concat(pi(s, e ? e + "[" + o + "]" : o));
    });
  else if (typeof h == "object")
    for (var i in h)
      t = t.concat(pi(h[i], e ? e + "[" + i + "]" : i));
  else
    t.push({ key: e, value: h });
  return t;
}
var Eo = {
  json: {
    headers: {
      "Content-Type": "application/json"
    },
    body: function(h, e, t) {
      return JSON.stringify(t);
    }
  },
  form: {
    headers: {},
    body: function(h, e, t) {
      var i = pi(t), s = new FormData();
      return i.forEach(function(o) {
        s.append(o.key, o.value);
      }), s;
    }
  }
};
const Oe = class Oe extends q {
  constructor(e) {
    super(e), this.config = {}, this.url = "", this.urlGenerator = !1, this.params = !1, this.loaderPromise = !1, this.registerTableOption("ajaxURL", !1), this.registerTableOption("ajaxURLGenerator", !1), this.registerTableOption("ajaxParams", {}), this.registerTableOption("ajaxConfig", "get"), this.registerTableOption("ajaxContentType", "form"), this.registerTableOption("ajaxRequestFunc", !1), this.registerTableOption("ajaxRequesting", function() {
    }), this.registerTableOption("ajaxResponse", !1), this.contentTypeFormatters = Oe.contentTypeFormatters;
  }
  //initialize setup options
  initialize() {
    this.loaderPromise = this.table.options.ajaxRequestFunc || Oe.defaultLoaderPromise, this.urlGenerator = this.table.options.ajaxURLGenerator || Oe.defaultURLGenerator, this.table.options.ajaxURL && this.setUrl(this.table.options.ajaxURL), this.setDefaultConfig(this.table.options.ajaxConfig), this.registerTableFunction("getAjaxUrl", this.getUrl.bind(this)), this.subscribe("data-loading", this.requestDataCheck.bind(this)), this.subscribe("data-params", this.requestParams.bind(this)), this.subscribe("data-load", this.requestData.bind(this));
  }
  requestParams(e, t, i, s) {
    var o = this.table.options.ajaxParams;
    return o && (typeof o == "function" && (o = o.call(this.table)), s = Object.assign(Object.assign({}, o), s)), s;
  }
  requestDataCheck(e, t, i, s) {
    return !!(!e && this.url || typeof e == "string");
  }
  requestData(e, t, i, s, o) {
    var n;
    return !o && this.requestDataCheck(e) ? (e && this.setUrl(e), n = this.generateConfig(i), this.sendRequest(this.url, t, n)) : o;
  }
  setDefaultConfig(e = {}) {
    this.config = Object.assign({}, Oe.defaultConfig), typeof e == "string" ? this.config.method = e : Object.assign(this.config, e);
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
O(Oe, "moduleName", "ajax"), //load defaults
O(Oe, "defaultConfig", yo), O(Oe, "defaultURLGenerator", rs), O(Oe, "defaultLoaderPromise", Co), O(Oe, "contentTypeFormatters", Eo);
let gi = Oe;
var xo = {
  replace: function(h) {
    return this.table.setData(h);
  },
  update: function(h) {
    return this.table.updateOrAddData(h);
  },
  insert: function(h) {
    return this.table.addData(h);
  }
}, ko = {
  table: function(h) {
    var e = [], t = !0, i = this.table.columnManager.columns, s = [], o = [];
    return h = h.split(`
`), h.forEach(function(n) {
      e.push(n.split("	"));
    }), e.length && !(e.length === 1 && e[0].length < 2) ? (e[0].forEach(function(n) {
      var a = i.find(function(r) {
        return n && r.definition.title && n.trim() && r.definition.title.trim() === n.trim();
      });
      a ? s.push(a) : t = !1;
    }), t || (t = !0, s = [], e[0].forEach(function(n) {
      var a = i.find(function(r) {
        return n && r.field && n.trim() && r.field.trim() === n.trim();
      });
      a ? s.push(a) : t = !1;
    }), t || (s = this.table.columnManager.columnsByIndex)), t && e.shift(), e.forEach(function(n) {
      var a = {};
      n.forEach(function(r, d) {
        s[d] && (a[s[d].field] = r);
      }), o.push(a);
    }), o) : !1;
  }
}, Ro = {
  copyToClipboard: ["ctrl + 67", "meta + 67"]
}, To = {
  copyToClipboard: function(h) {
    this.table.modules.edit.currentCell || this.table.modExists("clipboard", !0) && this.table.modules.clipboard.copy(!1, !0);
  }
}, So = {
  keybindings: {
    bindings: Ro,
    actions: To
  }
};
const lt = class lt extends q {
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
      i.columns.forEach((o) => {
        var n = "";
        if (o)
          if (i.type === "group" && (o.value = o.component.getKey()), o.value === null)
            n = "";
          else
            switch (typeof o.value) {
              case "object":
                n = JSON.stringify(o.value);
                break;
              case "undefined":
                n = "";
                break;
              default:
                n = o.value;
            }
        s.push(n);
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
        this.pasteAction = lt.pasteActions[e], this.pasteAction || console.warn("Clipboard Error - No such paste action found:", e);
        break;
      case "function":
        this.pasteAction = e;
        break;
    }
  }
  setPasteParser(e) {
    switch (typeof e) {
      case "string":
        this.pasteParser = lt.pasteParsers[e], this.pasteParser || console.warn("Clipboard Error - No such paste parser found:", e);
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
O(lt, "moduleName", "clipboard"), O(lt, "moduleExtensions", So), //load defaults
O(lt, "pasteActions", xo), O(lt, "pasteParsers", ko);
let bi = lt;
class _o {
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
class ls {
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
class Wt extends pe {
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
      var o = this.column.definition.cssClass.split(" ");
      o.forEach((n) => {
        e.classList.add(n);
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
    return this.component || (this.component = new ls(this)), this.component;
  }
}
class hs {
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
var ds = {
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
const vt = class vt extends pe {
  constructor(e, t, i) {
    super(t.table), this.definition = e, this.parent = t, this.type = "column", this.columns = [], this.cells = [], this.isGroup = !1, this.isRowHeader = i, this.element = this.createElement(), this.contentElement = !1, this.titleHolderElement = !1, this.titleElement = !1, this.groupElement = this.createGroupElement(), this.hozAlign = "", this.vertAlign = "", this.field = "", this.fieldStructure = "", this.getFieldValue = "", this.setFieldValue = "", this.titleDownload = null, this.titleFormatterRendered = !1, this.mapDefinitions(), this.setField(this.definition.field), this.modules = {}, this.width = null, this.widthStyled = "", this.maxWidth = null, this.maxWidthStyled = "", this.maxInitialWidth = null, this.minWidth = null, this.minWidthStyled = "", this.widthFixed = !1, this.visible = !0, this.component = null, this.definition.columns ? (this.isGroup = !0, this.definition.columns.forEach((s, o) => {
      var n = new vt(s, this);
      this.attachColumn(n);
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
    this.definition = this.table.columnManager.optionsList.generate(vt.defaultOptionList, this.definition);
  }
  checkDefinition() {
    Object.keys(this.definition).forEach((e) => {
      vt.defaultOptionList.indexOf(e) === -1 && console.warn("Invalid column definition option in '" + (this.field || this.definition.title) + "' column:", e);
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
    var t = e, i = this.fieldStructure, s = i.length, o;
    for (let n = 0; n < s && (t = t[i[n]], o = t, !!t); n++)
      ;
    return o;
  }
  //flat field set
  _setFlatData(e, t) {
    this.field && (e[this.field] = t);
  }
  //nested field set
  _setNestedData(e, t) {
    var i = e, s = this.fieldStructure, o = s.length;
    for (let n = 0; n < o; n++)
      if (n == o - 1)
        i[s[n]] = t;
      else {
        if (!i[s[n]])
          if (typeof t < "u")
            i[s[n]] = {};
          else
            break;
        i = i[s[n]];
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
    var t = new Wt(this, e);
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
        var o = s.getWidth();
        o > t && (t = o);
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
    return this.component || (this.component = new hs(this)), this.component;
  }
  getPosition() {
    return this.table.columnManager.getVisibleColumnsByIndex().indexOf(this) + 1;
  }
  getParentComponent() {
    return this.parent instanceof vt ? this.parent.getComponent() : !1;
  }
};
O(vt, "defaultOptionList", ds);
let Ct = vt;
class ei {
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
class ye extends pe {
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
    var t = this.element && ne.elVisible(this.element), i = {}, s;
    return new Promise((o, n) => {
      typeof e == "string" && (e = JSON.parse(e)), this.dispatch("row-data-save-before", this), this.subscribed("row-data-changing") && (i = Object.assign(i, this.data), i = Object.assign(i, e)), s = this.chain("row-data-changing", [this, i, e], null, e);
      for (let a in s)
        this.data[a] = s[a];
      this.dispatch("row-data-save-after", this);
      for (let a in e)
        this.table.columnManager.getColumnsByFieldRoot(a).forEach((d) => {
          let c = this.getCell(d.getField());
          if (c) {
            let u = d.getFieldValue(s);
            c.getValue() !== u && (c.setValueProcessData(u), t && c.cellRendered());
          }
        });
      t ? (this.normalizeHeight(!0), this.table.options.rowFormatter && this.table.options.rowFormatter(this.getComponent())) : (this.initialized = !1, this.height = 0, this.heightStyled = ""), this.dispatch("row-data-changed", this, t, e), this.dispatchExternal("rowUpdated", this.getComponent()), this.subscribedExternal("dataChanged") && this.dispatchExternal("dataChanged", this.table.rowManager.getData()), o();
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
    return this.component || (this.component = new ei(this)), this.component;
  }
}
var Lo = {
  avg: function(h, e, t) {
    var i = 0, s = typeof t.precision < "u" ? t.precision : 2;
    return h.length && (i = h.reduce(function(o, n) {
      return Number(o) + Number(n);
    }), i = i / h.length, i = s !== !1 ? i.toFixed(s) : i), parseFloat(i).toString();
  },
  max: function(h, e, t) {
    var i = null, s = typeof t.precision < "u" ? t.precision : !1;
    return h.forEach(function(o) {
      o = Number(o), (o > i || i === null) && (i = o);
    }), i !== null ? s !== !1 ? i.toFixed(s) : i : "";
  },
  min: function(h, e, t) {
    var i = null, s = typeof t.precision < "u" ? t.precision : !1;
    return h.forEach(function(o) {
      o = Number(o), (o < i || i === null) && (i = o);
    }), i !== null ? s !== !1 ? i.toFixed(s) : i : "";
  },
  sum: function(h, e, t) {
    var i = 0, s = typeof t.precision < "u" ? t.precision : !1;
    return h.length && h.forEach(function(o) {
      o = Number(o), i += isNaN(o) ? 0 : Number(o);
    }), s !== !1 ? i.toFixed(s) : i;
  },
  concat: function(h, e, t) {
    var i = 0;
    return h.length && (i = h.reduce(function(s, o) {
      return String(s) + String(o);
    })), i;
  },
  count: function(h, e, t) {
    var i = 0;
    return h.length && h.forEach(function(s) {
      s && i++;
    }), i;
  },
  unique: function(h, e, t) {
    var i = h.filter((s, o) => (h || s === 0) && h.indexOf(s) === o);
    return i.length;
  }
};
const ht = class ht extends q {
  constructor(e) {
    super(e), this.topCalcs = [], this.botCalcs = [], this.genColumn = !1, this.topElement = this.createElement(), this.botElement = this.createElement(), this.topRow = !1, this.botRow = !1, this.topInitialized = !1, this.botInitialized = !1, this.blocked = !1, this.recalcAfterBlock = !1, this.registerTableOption("columnCalcs", !0), this.registerColumnOption("topCalc"), this.registerColumnOption("topCalcParams"), this.registerColumnOption("topCalcFormatter"), this.registerColumnOption("topCalcFormatterParams"), this.registerColumnOption("bottomCalc"), this.registerColumnOption("bottomCalcParams"), this.registerColumnOption("bottomCalcFormatter"), this.registerColumnOption("bottomCalcFormatterParams");
  }
  createElement() {
    var e = document.createElement("div");
    return e.classList.add("tabulator-calcs-holder"), e;
  }
  initialize() {
    this.genColumn = new Ct({ field: "value" }, this), this.subscribe("cell-value-changed", this.cellValueChanged.bind(this)), this.subscribe("column-init", this.initializeColumnCheck.bind(this)), this.subscribe("row-deleted", this.rowsUpdated.bind(this)), this.subscribe("scroll-horizontal", this.scrollHorizontal.bind(this)), this.subscribe("row-added", this.rowsUpdated.bind(this)), this.subscribe("column-moved", this.recalcActiveRows.bind(this)), this.subscribe("column-add", this.recalcActiveRows.bind(this)), this.subscribe("data-refreshed", this.recalcActiveRowsRefresh.bind(this)), this.subscribe("table-redraw", this.tableRedraw.bind(this)), this.subscribe("rows-visible", this.visibleRows.bind(this)), this.subscribe("scrollbar-vertical", this.adjustForScrollbar.bind(this)), this.subscribe("redraw-blocked", this.blockRedraw.bind(this)), this.subscribe("redraw-restored", this.restoreRedraw.bind(this)), this.subscribe("table-redrawing", this.resizeHolderWidth.bind(this)), this.subscribe("column-resized", this.resizeHolderWidth.bind(this)), this.subscribe("column-show", this.resizeHolderWidth.bind(this)), this.subscribe("column-hide", this.resizeHolderWidth.bind(this)), this.registerTableFunction("getCalcResults", this.getResults.bind(this)), this.registerTableFunction("recalc", this.userRecalc.bind(this)), this.resizeHolderWidth();
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
          ht.calculations[t.topCalc] ? i.topCalc = ht.calculations[t.topCalc] : console.warn("Column Calc Error - No such calculation found, ignoring: ", t.topCalc);
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
          ht.calculations[t.bottomCalc] ? i.botCalc = ht.calculations[t.bottomCalc] : console.warn("Column Calc Error - No such calculation found, ignoring: ", t.bottomCalc);
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
    return e.forEach((o) => {
      var n;
      t.push(o.getData()), i && ((n = o.modules.dataTree) != null && n.open) && this.rowsToData(s.getFilteredTreeChildren(o)).forEach((a) => {
        t.push(o);
      });
    }), t;
  }
  //generate stats row
  generateRow(e, t) {
    var i = this.generateRowData(e, t), s;
    return this.table.modExists("mutator") && this.table.modules.mutator.disable(), s = new ye(i, this, "calc"), this.table.modExists("mutator") && this.table.modules.mutator.enable(), s.getElement().classList.add("tabulator-calcs", "tabulator-calcs-" + e), s.component = !1, s.getComponent = () => (s.component || (s.component = new _o(s)), s.component), s.generateCells = () => {
      var o = [];
      this.table.columnManager.columnsByIndex.forEach((n) => {
        this.genColumn.setField(n.getField()), this.genColumn.hozAlign = n.hozAlign, n.definition[e + "CalcFormatter"] && this.table.modExists("format") ? this.genColumn.modules.format = {
          formatter: this.table.modules.format.lookupFormatter(n.definition[e + "CalcFormatter"]),
          params: n.definition[e + "CalcFormatterParams"] || {}
        } : this.genColumn.modules.format = {
          formatter: this.table.modules.format.lookupFormatter("plaintext"),
          params: {}
        }, this.genColumn.definition.cssClass = n.definition.cssClass;
        var a = new Wt(this.genColumn, s);
        a.getElement(), a.column = n, a.setWidth(), n.cells.push(a), o.push(a), n.visible || a.hide();
      }), s.cells = o;
    }, s;
  }
  //generate stats row
  generateRowData(e, t) {
    var i = {}, s = e == "top" ? this.topCalcs : this.botCalcs, o = e == "top" ? "topCalc" : "botCalc", n, a;
    return s.forEach(function(r) {
      var d = [];
      r.modules.columnCalcs && r.modules.columnCalcs[o] && (t.forEach(function(c) {
        d.push(r.getFieldValue(c));
      }), a = o + "Params", n = typeof r.modules.columnCalcs[a] == "function" ? r.modules.columnCalcs[a](d, t) : r.modules.columnCalcs[a], r.setFieldValue(i, r.modules.columnCalcs[o](d, t, n)));
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
    var t = e._getSelf(), i = e.getSubGroups(), s = {}, o = {};
    return i.forEach((n) => {
      s[n.getKey()] = this.getGroupResults(n);
    }), o = {
      top: t.calcs.top ? t.calcs.top.getData() : {},
      bottom: t.calcs.bottom ? t.calcs.bottom.getData() : {},
      groups: s
    }, o;
  }
  adjustForScrollbar(e) {
    this.botRow && (this.table.rtl ? this.botElement.style.paddingLeft = e + "px" : this.botElement.style.paddingRight = e + "px");
  }
};
O(ht, "moduleName", "columnCalcs"), //load defaults
O(ht, "calculations", Lo);
let vi = ht;
class cs extends q {
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
    t = t || e.getCells()[0].getElement(), i.children !== !1 && (i.open ? (i.controlEl = this.collapseEl.cloneNode(!0), i.controlEl.addEventListener("click", (o) => {
      o.stopPropagation(), this.collapseRow(e);
    })) : (i.controlEl = this.expandEl.cloneNode(!0), i.controlEl.addEventListener("click", (o) => {
      o.stopPropagation(), this.expandRow(e);
    })), i.controlEl.addEventListener("mousedown", (o) => {
      o.stopPropagation();
    }), s && s.parentNode === t ? s.parentNode.replaceChild(i.controlEl, s) : t.insertBefore(i.controlEl, t.firstChild));
  }
  getRows(e) {
    var t = [];
    return e.forEach((i, s) => {
      var o, n;
      t.push(i), i instanceof ye && (i.create(), o = i.modules.dataTree, !o.index && o.children !== !1 && (n = this.getChildren(i, !1, !0), n.forEach((a) => {
        a.create(), t.push(a);
      })));
    }), t;
  }
  getChildren(e, t, i) {
    var s = e.modules.dataTree, o = [], n = [];
    return s.children !== !1 && (s.open || t) && (Array.isArray(s.children) || (s.children = this.generateChildren(e)), this.table.modExists("filter") && this.table.options.dataTreeFilter ? o = this.table.modules.filter.filter(s.children) : o = s.children, this.table.modExists("sort") && this.table.options.dataTreeSort && this.table.modules.sort.sort(o, i), o.forEach((a) => {
      n.push(a);
      var r = this.getChildren(a, !1, !0);
      r.forEach((d) => {
        n.push(d);
      });
    })), n;
  }
  generateChildren(e) {
    var t = [], i = e.getData()[this.field];
    return Array.isArray(i) || (i = [i]), i.forEach((s) => {
      var o = new ye(s || {}, this.table.rowManager);
      o.create(), o.modules.dataTree.index = e.modules.dataTree.index + 1, o.modules.dataTree.parent = e, o.modules.dataTree.children && (o.modules.dataTree.open = this.startOpen(o.getComponent(), o.modules.dataTree.index)), t.push(o);
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
    return t.children && (Array.isArray(t.children) || (t.children = this.generateChildren(e)), this.table.modExists("filter") && this.table.options.dataTreeFilter ? s = this.table.modules.filter.filter(t.children) : s = t.children, s.forEach((o) => {
      o instanceof ye && i.push(o);
    })), i;
  }
  rowDeleting(e) {
    var t = e.modules.dataTree;
    t && t.children && Array.isArray(t.children) && t.children.forEach((i) => {
      i instanceof ye && i.wipe();
    });
  }
  rowDelete(e) {
    var t = e.modules.dataTree.parent, i;
    t && (i = this.findChildIndex(e, t), i !== !1 && t.data[this.field].splice(i, 1), t.data[this.field].length || delete t.data[this.field], this.initializeRow(t), this.layoutRow(t)), this.refreshData(!0);
  }
  addTreeChildRow(e, t, i, s) {
    var o = !1;
    typeof t == "string" && (t = JSON.parse(t)), Array.isArray(e.data[this.field]) || (e.data[this.field] = [], e.modules.dataTree.open = this.startOpen(e.getComponent(), e.modules.dataTree.index)), typeof s < "u" && (o = this.findChildIndex(s, e), o !== !1 && e.data[this.field].splice(i ? o : o + 1, 0, t)), o === !1 && (i ? e.data[this.field].unshift(t) : e.data[this.field].push(t)), this.initializeRow(e), this.layoutRow(e), this.refreshData(!0);
  }
  findChildIndex(e, t) {
    var i = !1;
    return typeof e == "object" ? e instanceof ye ? i = e.data : e instanceof ei ? i = e._getSelf().data : typeof HTMLElement < "u" && e instanceof HTMLElement ? t.modules.dataTree && (i = t.modules.dataTree.children.find((s) => s instanceof ye ? s.element === e : !1), i && (i = i.data)) : e === null && (i = !1) : typeof e > "u" ? i = !1 : i = t.data[this.field].find((s) => s.data[this.table.options.index] == e), i && (Array.isArray(t.data[this.field]) && (i = t.data[this.field].indexOf(i)), i == -1 && (i = !1)), i;
  }
  getTreeChildren(e, t, i) {
    var s = e.modules.dataTree, o = [];
    return s && s.children && (Array.isArray(s.children) || (s.children = this.generateChildren(e)), s.children.forEach((n) => {
      n instanceof ye && (o.push(t ? n.getComponent() : n), i && this.getTreeChildren(n, t, i).forEach((a) => {
        o.push(a);
      }));
    })), o;
  }
  getChildField() {
    return this.field;
  }
  redrawNeeded(e) {
    return (this.field ? typeof e[this.field] < "u" : !1) || (this.elementField ? typeof e[this.elementField] < "u" : !1);
  }
}
O(cs, "moduleName", "dataTree");
function Do(h, e = {}, t) {
  var i = e.delimiter ? e.delimiter : ",", s = [], o = [];
  h.forEach((n) => {
    var a = [];
    switch (n.type) {
      case "group":
        console.warn("Download Warning - CSV downloader cannot process row groups");
        break;
      case "calc":
        console.warn("Download Warning - CSV downloader cannot process column calculations");
        break;
      case "header":
        n.columns.forEach((r, d) => {
          r && r.depth === 1 && (o[d] = typeof r.value > "u" || r.value === null ? "" : '"' + String(r.value).split('"').join('""') + '"');
        });
        break;
      case "row":
        n.columns.forEach((r) => {
          if (r) {
            switch (typeof r.value) {
              case "object":
                r.value = r.value !== null ? JSON.stringify(r.value) : "";
                break;
              case "undefined":
                r.value = "";
                break;
            }
            a.push('"' + String(r.value).split('"').join('""') + '"');
          }
        }), s.push(a.join(i));
        break;
    }
  }), o.length && s.unshift(o.join(i)), s = s.join(`
`), e.bom && (s = "\uFEFF" + s), t(s, "text/csv");
}
function Fo(h, e, t) {
  var i = [];
  h.forEach((s) => {
    var o = {};
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
        s.columns.forEach((n) => {
          n && (o[n.component.getTitleDownload() || n.component.getField()] = n.value);
        }), i.push(o);
        break;
    }
  }), i = JSON.stringify(i, null, "	"), t(i, "application/json");
}
function Mo(h, e = {}, t) {
  var i = [], s = [], o = {}, n = e.rowGroupStyles || {
    fontStyle: "bold",
    fontSize: 12,
    cellPadding: 6,
    fillColor: 220
  }, a = e.rowCalcStyles || {
    fontStyle: "bold",
    fontSize: 10,
    cellPadding: 4,
    fillColor: 232
  }, r = e.jsPDF || {}, d = e.title ? e.title : "", c, u;
  r.orientation || (r.orientation = e.orientation || "landscape"), r.unit || (r.unit = "pt"), h.forEach((v) => {
    switch (v.type) {
      case "header":
        i.push(p(v));
        break;
      case "group":
        s.push(p(v, n));
        break;
      case "calc":
        s.push(p(v, a));
        break;
      case "row":
        s.push(p(v));
        break;
    }
  });
  function p(v, y) {
    var L = [];
    return v.columns.forEach((_) => {
      var x;
      if (_) {
        switch (typeof _.value) {
          case "object":
            _.value = _.value !== null ? JSON.stringify(_.value) : "";
            break;
          case "undefined":
            _.value = "";
            break;
        }
        x = {
          content: _.value,
          colSpan: _.width,
          rowSpan: _.height
        }, y && (x.styles = y), L.push(x);
      }
    }), L;
  }
  c = this.dependencyRegistry.lookup("jspdf", "jsPDF"), u = new c(r), e.autoTable && (typeof e.autoTable == "function" ? o = e.autoTable(u) || {} : o = e.autoTable), d && (o.didDrawPage = function(v) {
    u.text(d, 40, 30);
  }), o.head = i, o.body = s, u.autoTable(o), e.documentProcessing && e.documentProcessing(u), t(u.output("arraybuffer"), "application/pdf");
}
function Po(h, e, t) {
  var i = this, s = e.sheetName || "Sheet1", o = this.dependencyRegistry.lookup("XLSX"), n = o.utils.book_new(), a = new pe(this), r = "compress" in e ? e.compress : !0, d = e.writeOptions || { bookType: "xlsx", bookSST: !0, compression: r }, c;
  d.type = "binary", n.SheetNames = [], n.Sheets = {};
  function u() {
    var y = [], L = [], _ = {}, x = { s: { c: 0, r: 0 }, e: { c: h[0] ? h[0].columns.reduce((g, f) => g + (f && f.width ? f.width : 1), 0) : 0, r: h.length } };
    return h.forEach((g, f) => {
      var D = [];
      g.columns.forEach(function(P, S) {
        P ? (D.push(!(P.value instanceof Date) && typeof P.value == "object" ? JSON.stringify(P.value) : P.value), (P.width > 1 || P.height > -1) && (P.height > 1 || P.width > 1) && L.push({ s: { r: f, c: S }, e: { r: f + P.height - 1, c: S + P.width - 1 } })) : D.push("");
      }), y.push(D);
    }), o.utils.sheet_add_aoa(_, y), _["!ref"] = o.utils.encode_range(x), L.length && (_["!merges"] = L), _;
  }
  if (e.sheetOnly) {
    t(u());
    return;
  }
  if (e.sheets)
    for (var p in e.sheets)
      e.sheets[p] === !0 ? (n.SheetNames.push(p), n.Sheets[p] = u()) : (n.SheetNames.push(p), a.commsSend(e.sheets[p], "download", "intercept", {
        type: "xlsx",
        options: { sheetOnly: !0 },
        active: i.active,
        intercept: function(y) {
          n.Sheets[p] = y;
        }
      }));
  else
    n.SheetNames.push(s), n.Sheets[s] = u();
  e.documentProcessing && (n = e.documentProcessing(n));
  function v(y) {
    for (var L = new ArrayBuffer(y.length), _ = new Uint8Array(L), x = 0; x != y.length; ++x) _[x] = y.charCodeAt(x) & 255;
    return L;
  }
  c = o.write(n, d), t(v(c), "application/octet-stream");
}
function zo(h, e, t) {
  this.modExists("export", !0) && t(this.modules.export.generateHTMLTable(h), "text/html");
}
function Ao(h, e, t) {
  const i = [];
  h.forEach((s) => {
    const o = {};
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
        s.columns.forEach((n) => {
          n && (o[n.component.getTitleDownload() || n.component.getField()] = n.value);
        }), i.push(JSON.stringify(o));
        break;
    }
  }), t(i.join(`
`), "application/x-ndjson");
}
var Oo = {
  csv: Do,
  json: Fo,
  jsonLines: Ao,
  pdf: Mo,
  xlsx: Po,
  html: zo
};
const Rt = class Rt extends q {
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
  download(e, t, i, s, o) {
    var n = !1;
    function a(d, c) {
      o ? o === !0 ? this.triggerDownload(d, c, e, t, !0) : o(d) : this.triggerDownload(d, c, e, t);
    }
    if (typeof e == "function" ? n = e : Rt.downloaders[e] ? n = Rt.downloaders[e] : console.warn("Download Error - No such download type found: ", e), n) {
      var r = this.generateExportList(s);
      n.call(this.table, r, i || {}, a.bind(this));
    }
  }
  generateExportList(e) {
    var t = this.table.modules.export.generateExportList(this.table.options.downloadConfig, !1, e || this.table.options.downloadRowRange, "download"), i = this.table.options.groupHeaderDownload;
    return i && !Array.isArray(i) && (i = [i]), t.forEach((s) => {
      var o;
      s.type === "group" && (o = s.columns[0], i && i[s.indent] && (o.value = i[s.indent](o.value, s.component._group.getRowCount(), s.component._group.getData(), s.component)));
    }), t;
  }
  triggerDownload(e, t, i, s, o) {
    var n = document.createElement("a"), a = this.table.options.downloadEncoder(e, t);
    a && (o ? window.open(window.URL.createObjectURL(a)) : (s = s || "Tabulator." + (typeof i == "function" ? "txt" : i), navigator.msSaveOrOpenBlob ? navigator.msSaveOrOpenBlob(a, s) : (n.setAttribute("href", window.URL.createObjectURL(a)), n.setAttribute("download", s), n.style.display = "none", document.body.appendChild(n), n.click(), document.body.removeChild(n))), this.dispatchExternal("downloadComplete"));
  }
  commsReceived(e, t, i) {
    switch (t) {
      case "intercept":
        this.download(i.type, "", i.options, i.active, i.intercept);
        break;
    }
  }
};
O(Rt, "moduleName", "download"), //load defaults
O(Rt, "downloaders", Oo);
let yi = Rt;
function ti(h, e) {
  var t = e.mask, i = typeof e.maskLetterChar < "u" ? e.maskLetterChar : "A", s = typeof e.maskNumberChar < "u" ? e.maskNumberChar : "9", o = typeof e.maskWildcardChar < "u" ? e.maskWildcardChar : "*";
  function n(a) {
    var r = t[a];
    typeof r < "u" && r !== o && r !== i && r !== s && (h.value = h.value + "" + r, n(a + 1));
  }
  h.addEventListener("keydown", (a) => {
    var r = h.value.length, d = a.key;
    if (a.keyCode > 46 && !a.ctrlKey && !a.metaKey) {
      if (r >= t.length)
        return a.preventDefault(), a.stopPropagation(), !1;
      switch (t[r]) {
        case i:
          if (d.toUpperCase() == d.toLowerCase())
            return a.preventDefault(), a.stopPropagation(), !1;
          break;
        case s:
          if (isNaN(d))
            return a.preventDefault(), a.stopPropagation(), !1;
          break;
        case o:
          break;
        default:
          if (d !== t[r])
            return a.preventDefault(), a.stopPropagation(), !1;
      }
    }
  }), h.addEventListener("keyup", (a) => {
    a.keyCode > 46 && e.maskAutoFill && n(h.value.length);
  }), h.placeholder || (h.placeholder = t), e.maskAutoFill && n(h.value.length);
}
function Ho(h, e, t, i, s) {
  var o = h.getValue(), n = document.createElement("input");
  if (n.setAttribute("type", s.search ? "search" : "text"), n.style.padding = "4px", n.style.width = "100%", n.style.boxSizing = "border-box", s.elementAttributes && typeof s.elementAttributes == "object")
    for (let r in s.elementAttributes)
      r.charAt(0) == "+" ? (r = r.slice(1), n.setAttribute(r, n.getAttribute(r) + s.elementAttributes["+" + r])) : n.setAttribute(r, s.elementAttributes[r]);
  n.value = typeof o < "u" ? o : "", e(function() {
    h.getType() === "cell" && (n.focus({ preventScroll: !0 }), n.style.height = "100%", s.selectContents && n.select());
  });
  function a(r) {
    (o === null || typeof o > "u") && n.value !== "" || n.value !== o ? t(n.value) && (o = n.value) : i();
  }
  return n.addEventListener("change", a), n.addEventListener("blur", a), n.addEventListener("keydown", function(r) {
    switch (r.keyCode) {
      case 13:
        a();
        break;
      case 27:
        i();
        break;
      case 35:
      case 36:
        r.stopPropagation();
        break;
    }
  }), s.mask && ti(n, s), n;
}
function $o(h, e, t, i, s) {
  var o = h.getValue(), n = s.verticalNavigation || "hybrid", a = String(o !== null && typeof o < "u" ? o : ""), r = document.createElement("textarea"), d = 0;
  if (r.style.display = "block", r.style.padding = "2px", r.style.height = "100%", r.style.width = "100%", r.style.boxSizing = "border-box", r.style.whiteSpace = "pre-wrap", r.style.resize = "none", s.elementAttributes && typeof s.elementAttributes == "object")
    for (let u in s.elementAttributes)
      u.charAt(0) == "+" ? (u = u.slice(1), r.setAttribute(u, r.getAttribute(u) + s.elementAttributes["+" + u])) : r.setAttribute(u, s.elementAttributes[u]);
  r.value = a, e(function() {
    h.getType() === "cell" && (r.focus({ preventScroll: !0 }), r.style.height = "100%", r.scrollHeight, r.style.height = r.scrollHeight + "px", h.getRow().normalizeHeight(), s.selectContents && r.select());
  });
  function c(u) {
    (o === null || typeof o > "u") && r.value !== "" || r.value !== o ? (t(r.value) && (o = r.value), setTimeout(function() {
      h.getRow().normalizeHeight();
    }, 300)) : i();
  }
  return r.addEventListener("change", c), r.addEventListener("blur", c), r.addEventListener("keyup", function() {
    r.style.height = "";
    var u = r.scrollHeight;
    r.style.height = u + "px", u != d && (d = u, h.getRow().normalizeHeight());
  }), r.addEventListener("keydown", function(u) {
    switch (u.keyCode) {
      case 13:
        u.shiftKey && s.shiftEnterSubmit && c();
        break;
      case 27:
        i();
        break;
      case 38:
        (n == "editor" || n == "hybrid" && r.selectionStart) && (u.stopImmediatePropagation(), u.stopPropagation());
        break;
      case 40:
        (n == "editor" || n == "hybrid" && r.selectionStart !== r.value.length) && (u.stopImmediatePropagation(), u.stopPropagation());
        break;
      case 35:
      case 36:
        u.stopPropagation();
        break;
    }
  }), s.mask && ti(r, s), r;
}
function Bo(h, e, t, i, s) {
  var o = h.getValue(), n = s.verticalNavigation || "editor", a = document.createElement("input");
  if (a.setAttribute("type", "number"), typeof s.max < "u" && a.setAttribute("max", s.max), typeof s.min < "u" && a.setAttribute("min", s.min), typeof s.step < "u" && a.setAttribute("step", s.step), a.style.padding = "4px", a.style.width = "100%", a.style.boxSizing = "border-box", s.elementAttributes && typeof s.elementAttributes == "object")
    for (let c in s.elementAttributes)
      c.charAt(0) == "+" ? (c = c.slice(1), a.setAttribute(c, a.getAttribute(c) + s.elementAttributes["+" + c])) : a.setAttribute(c, s.elementAttributes[c]);
  a.value = o;
  var r = function(c) {
    d();
  };
  e(function() {
    h.getType() === "cell" && (a.removeEventListener("blur", r), a.focus({ preventScroll: !0 }), a.style.height = "100%", a.addEventListener("blur", r), s.selectContents && a.select());
  });
  function d() {
    var c = a.value;
    !isNaN(c) && c !== "" && (c = Number(c)), c !== o ? t(c) && (o = c) : i();
  }
  return a.addEventListener("keydown", function(c) {
    switch (c.keyCode) {
      case 13:
        d();
        break;
      case 27:
        i();
        break;
      case 38:
      case 40:
        n == "editor" && (c.stopImmediatePropagation(), c.stopPropagation());
        break;
      case 35:
      case 36:
        c.stopPropagation();
        break;
    }
  }), s.mask && ti(a, s), a;
}
function No(h, e, t, i, s) {
  var o = h.getValue(), n = document.createElement("input");
  if (n.setAttribute("type", "range"), typeof s.max < "u" && n.setAttribute("max", s.max), typeof s.min < "u" && n.setAttribute("min", s.min), typeof s.step < "u" && n.setAttribute("step", s.step), n.style.padding = "4px", n.style.width = "100%", n.style.boxSizing = "border-box", s.elementAttributes && typeof s.elementAttributes == "object")
    for (let r in s.elementAttributes)
      r.charAt(0) == "+" ? (r = r.slice(1), n.setAttribute(r, n.getAttribute(r) + s.elementAttributes["+" + r])) : n.setAttribute(r, s.elementAttributes[r]);
  n.value = o, e(function() {
    h.getType() === "cell" && (n.focus({ preventScroll: !0 }), n.style.height = "100%");
  });
  function a() {
    var r = n.value;
    !isNaN(r) && r !== "" && (r = Number(r)), r != o ? t(r) && (o = r) : i();
  }
  return n.addEventListener("blur", function(r) {
    a();
  }), n.addEventListener("keydown", function(r) {
    switch (r.keyCode) {
      case 13:
        a();
        break;
      case 27:
        i();
        break;
    }
  }), n;
}
function Vo(h, e, t, i, s) {
  var o = s.format, n = s.verticalNavigation || "editor", a = o ? window.DateTime || luxon.DateTime : null, r = h.getValue(), d = document.createElement("input");
  function c(p) {
    var v;
    return a.isDateTime(p) ? v = p : o === "iso" ? v = a.fromISO(String(p)) : v = a.fromFormat(String(p), o), v.toFormat("yyyy-MM-dd");
  }
  if (d.type = "date", d.style.padding = "4px", d.style.width = "100%", d.style.boxSizing = "border-box", s.max && d.setAttribute("max", o ? c(s.max) : s.max), s.min && d.setAttribute("min", o ? c(s.min) : s.min), s.elementAttributes && typeof s.elementAttributes == "object")
    for (let p in s.elementAttributes)
      p.charAt(0) == "+" ? (p = p.slice(1), d.setAttribute(p, d.getAttribute(p) + s.elementAttributes["+" + p])) : d.setAttribute(p, s.elementAttributes[p]);
  r = typeof r < "u" ? r : "", o && (a ? r = c(r) : console.error("Editor Error - 'date' editor 'format' param is dependant on luxon.js")), d.value = r, e(function() {
    h.getType() === "cell" && (d.focus({ preventScroll: !0 }), d.style.height = "100%", s.selectContents && d.select());
  });
  function u() {
    var p = d.value, v;
    if ((r === null || typeof r > "u") && p !== "" || p !== r) {
      if (p && o)
        switch (v = a.fromFormat(String(p), "yyyy-MM-dd"), o) {
          case !0:
            p = v;
            break;
          case "iso":
            p = v.toISO();
            break;
          default:
            p = v.toFormat(o);
        }
      t(p) && (r = d.value);
    } else
      i();
  }
  return d.addEventListener("blur", function(p) {
    (p.relatedTarget || p.rangeParent || p.explicitOriginalTarget !== d) && u();
  }), d.addEventListener("keydown", function(p) {
    switch (p.keyCode) {
      case 13:
        u();
        break;
      case 27:
        i();
        break;
      case 35:
      case 36:
        p.stopPropagation();
        break;
      case 38:
      case 40:
        n == "editor" && (p.stopImmediatePropagation(), p.stopPropagation());
        break;
    }
  }), d;
}
function Io(h, e, t, i, s) {
  var o = s.format, n = s.verticalNavigation || "editor", a = o ? window.DateTime || luxon.DateTime : null, r, d = h.getValue(), c = document.createElement("input");
  if (c.type = "time", c.style.padding = "4px", c.style.width = "100%", c.style.boxSizing = "border-box", s.elementAttributes && typeof s.elementAttributes == "object")
    for (let p in s.elementAttributes)
      p.charAt(0) == "+" ? (p = p.slice(1), c.setAttribute(p, c.getAttribute(p) + s.elementAttributes["+" + p])) : c.setAttribute(p, s.elementAttributes[p]);
  d = typeof d < "u" ? d : "", o && (a ? (a.isDateTime(d) ? r = d : o === "iso" ? r = a.fromISO(String(d)) : r = a.fromFormat(String(d), o), d = r.toFormat("HH:mm")) : console.error("Editor Error - 'date' editor 'format' param is dependant on luxon.js")), c.value = d, e(function() {
    h.getType() == "cell" && (c.focus({ preventScroll: !0 }), c.style.height = "100%", s.selectContents && c.select());
  });
  function u() {
    var p = c.value, v;
    if ((d === null || typeof d > "u") && p !== "" || p !== d) {
      if (p && o)
        switch (v = a.fromFormat(String(p), "hh:mm"), o) {
          case !0:
            p = v;
            break;
          case "iso":
            p = v.toISO();
            break;
          default:
            p = v.toFormat(o);
        }
      t(p) && (d = c.value);
    } else
      i();
  }
  return c.addEventListener("blur", function(p) {
    (p.relatedTarget || p.rangeParent || p.explicitOriginalTarget !== c) && u();
  }), c.addEventListener("keydown", function(p) {
    switch (p.keyCode) {
      case 13:
        u();
        break;
      case 27:
        i();
        break;
      case 35:
      case 36:
        p.stopPropagation();
        break;
      case 38:
      case 40:
        n == "editor" && (p.stopImmediatePropagation(), p.stopPropagation());
        break;
    }
  }), c;
}
function Wo(h, e, t, i, s) {
  var o = s.format, n = s.verticalNavigation || "editor", a = o ? this.table.dependencyRegistry.lookup(["luxon", "DateTime"], "DateTime") : null, r, d = h.getValue(), c = document.createElement("input");
  if (c.type = "datetime-local", c.style.padding = "4px", c.style.width = "100%", c.style.boxSizing = "border-box", s.elementAttributes && typeof s.elementAttributes == "object")
    for (let p in s.elementAttributes)
      p.charAt(0) == "+" ? (p = p.slice(1), c.setAttribute(p, c.getAttribute(p) + s.elementAttributes["+" + p])) : c.setAttribute(p, s.elementAttributes[p]);
  d = typeof d < "u" ? d : "", o && (a ? (a.isDateTime(d) ? r = d : o === "iso" ? r = a.fromISO(String(d)) : r = a.fromFormat(String(d), o), d = r.toFormat("yyyy-MM-dd") + "T" + r.toFormat("HH:mm")) : console.error("Editor Error - 'date' editor 'format' param is dependant on luxon.js")), c.value = d, e(function() {
    h.getType() === "cell" && (c.focus({ preventScroll: !0 }), c.style.height = "100%", s.selectContents && c.select());
  });
  function u() {
    var p = c.value, v;
    if ((d === null || typeof d > "u") && p !== "" || p !== d) {
      if (p && o)
        switch (v = a.fromISO(String(p)), o) {
          case !0:
            p = v;
            break;
          case "iso":
            p = v.toISO();
            break;
          default:
            p = v.toFormat(o);
        }
      t(p) && (d = c.value);
    } else
      i();
  }
  return c.addEventListener("blur", function(p) {
    (p.relatedTarget || p.rangeParent || p.explicitOriginalTarget !== c) && u();
  }), c.addEventListener("keydown", function(p) {
    switch (p.keyCode) {
      case 13:
        u();
        break;
      case 27:
        i();
        break;
      case 35:
      case 36:
        p.stopPropagation();
        break;
      case 38:
      case 40:
        n == "editor" && (p.stopImmediatePropagation(), p.stopPropagation());
        break;
    }
  }), c;
}
let Go = class {
  constructor(e, t, i, s, o, n) {
    this.edit = e, this.table = e.table, this.cell = t, this.params = this._initializeParams(n), this.data = [], this.displayItems = [], this.currentItems = [], this.focusedItem = null, this.input = this._createInputElement(), this.listEl = this._createListElement(), this.initialValues = null, this.isFilter = t.getType() === "header", this.filterTimeout = null, this.filtered = !1, this.typing = !1, this.values = [], this.popup = null, this.listIteration = 0, this.lastAction = "", this.filterTerm = "", this.blurable = !0, this.actions = {
      success: s,
      cancel: o
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
    return this.params.mask && ti(t, this.params), this._bindInputEvents(t), t;
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
    return e = rs(e, {}, i), fetch(e).then((s) => s.ok ? s.json().catch((o) => (console.warn("List Ajax Load Error - Invalid JSON returned", o), Promise.reject(o))) : (console.error("List Ajax Load Error - Connection Error: " + s.status, s.statusText), Promise.reject(s))).catch((s) => (console.error("List Ajax Load Error - Connection Error: ", s), Promise.reject(s)));
  }
  _uniqueColumnValues(e) {
    var t = {}, i = this.table.getData(this.params.valuesLookup), s;
    return e ? s = this.table.columnManager.getColumnByField(e) : s = this.cell.getColumn()._getSelf(), s ? i.forEach((o) => {
      var n = s.getFieldValue(o);
      this._emptyValueCheck(n) || (this.params.multiselect && Array.isArray(n) ? n.forEach((a) => {
        this._emptyValueCheck(a) || (t[a] = !0);
      }) : t[n] = !0);
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
    var i, s, o, n, a = 0, r, d = /(\d+)|(\D+)/g, c = /\d/, u = 0;
    if (this.params.sort === "desc" && ([e, t] = [t, e]), !e && e !== 0)
      u = !t && t !== 0 ? 0 : -1;
    else if (!t && t !== 0)
      u = 1;
    else {
      if (isFinite(e) && isFinite(t)) return e - t;
      if (i = String(e).toLowerCase(), s = String(t).toLowerCase(), i === s) return 0;
      if (!(c.test(i) && c.test(s))) return i > s ? 1 : -1;
      for (i = i.match(d), s = s.match(d), r = i.length > s.length ? s.length : i.length; a < r; )
        if (o = i[a], n = s[a++], o !== n)
          return isFinite(o) && isFinite(n) ? (o.charAt(0) === "0" && (o = "." + o), n.charAt(0) === "0" && (n = "." + n), o - n) : o > n ? 1 : -1;
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
    return i.group ? (i.options.forEach((o) => {
      this._filterItem(e, t, o) && (s = !0);
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
function jo(h, e, t, i, s) {
  var o = new Go(this, h, e, t, i, s);
  return o.input;
}
function Uo(h, e, t, i, s) {
  var o = this, n = h.getElement(), a = h.getValue(), r = n.getElementsByTagName("svg").length || 5, d = n.getElementsByTagName("svg")[0] ? n.getElementsByTagName("svg")[0].getAttribute("width") : 14, c = [], u = document.createElement("div"), p = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  function v(x) {
    c.forEach(function(g, f) {
      f < x ? (o.table.browser == "ie" ? g.setAttribute("class", "tabulator-star-active") : g.classList.replace("tabulator-star-inactive", "tabulator-star-active"), g.innerHTML = '<polygon fill="#488CE9" stroke="#014AAE" stroke-width="37.6152" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" points="259.216,29.942 330.27,173.919 489.16,197.007 374.185,309.08 401.33,467.31 259.216,392.612 117.104,467.31 144.25,309.08 29.274,197.007 188.165,173.919 "/>') : (o.table.browser == "ie" ? g.setAttribute("class", "tabulator-star-inactive") : g.classList.replace("tabulator-star-active", "tabulator-star-inactive"), g.innerHTML = '<polygon fill="#010155" stroke="#686868" stroke-width="37.6152" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" points="259.216,29.942 330.27,173.919 489.16,197.007 374.185,309.08 401.33,467.31 259.216,392.612 117.104,467.31 144.25,309.08 29.274,197.007 188.165,173.919 "/>');
    });
  }
  function y(x) {
    var g = document.createElement("span"), f = p.cloneNode(!0);
    c.push(f), g.addEventListener("mouseenter", function(D) {
      D.stopPropagation(), D.stopImmediatePropagation(), v(x);
    }), g.addEventListener("mousemove", function(D) {
      D.stopPropagation(), D.stopImmediatePropagation();
    }), g.addEventListener("click", function(D) {
      D.stopPropagation(), D.stopImmediatePropagation(), t(x), n.blur();
    }), g.appendChild(f), u.appendChild(g);
  }
  function L(x) {
    a = x, v(x);
  }
  if (n.style.whiteSpace = "nowrap", n.style.overflow = "hidden", n.style.textOverflow = "ellipsis", u.style.verticalAlign = "middle", u.style.display = "inline-block", u.style.padding = "4px", p.setAttribute("width", d), p.setAttribute("height", d), p.setAttribute("viewBox", "0 0 512 512"), p.setAttribute("xml:space", "preserve"), p.style.padding = "0 1px", s.elementAttributes && typeof s.elementAttributes == "object")
    for (let x in s.elementAttributes)
      x.charAt(0) == "+" ? (x = x.slice(1), u.setAttribute(x, u.getAttribute(x) + s.elementAttributes["+" + x])) : u.setAttribute(x, s.elementAttributes[x]);
  for (var _ = 1; _ <= r; _++)
    y(_);
  return a = Math.min(parseInt(a), r), v(a), u.addEventListener("mousemove", function(x) {
    v(0);
  }), u.addEventListener("click", function(x) {
    t(0);
  }), n.addEventListener("blur", function(x) {
    i();
  }), n.addEventListener("keydown", function(x) {
    switch (x.keyCode) {
      case 39:
        L(a + 1);
        break;
      case 37:
        L(a - 1);
        break;
      case 13:
        t(a);
        break;
      case 27:
        i();
        break;
    }
  }), u;
}
function qo(h, e, t, i, s) {
  var o = h.getElement(), n = typeof s.max > "u" ? o.getElementsByTagName("div")[0] && o.getElementsByTagName("div")[0].getAttribute("max") || 100 : s.max, a = typeof s.min > "u" ? o.getElementsByTagName("div")[0] && o.getElementsByTagName("div")[0].getAttribute("min") || 0 : s.min, r = (n - a) / 100, d = h.getValue() || 0, c = document.createElement("div"), u = document.createElement("div"), p, v;
  function y() {
    var L = window.getComputedStyle(o, null), _ = r * Math.round(u.offsetWidth / ((o.clientWidth - parseInt(L.getPropertyValue("padding-left")) - parseInt(L.getPropertyValue("padding-right"))) / 100)) + a;
    t(_), o.setAttribute("aria-valuenow", _), o.setAttribute("aria-label", d);
  }
  if (c.style.position = "absolute", c.style.right = "0", c.style.top = "0", c.style.bottom = "0", c.style.width = "5px", c.classList.add("tabulator-progress-handle"), u.style.display = "inline-block", u.style.position = "relative", u.style.height = "100%", u.style.backgroundColor = "#488CE9", u.style.maxWidth = "100%", u.style.minWidth = "0%", s.elementAttributes && typeof s.elementAttributes == "object")
    for (let L in s.elementAttributes)
      L.charAt(0) == "+" ? (L = L.slice(1), u.setAttribute(L, u.getAttribute(L) + s.elementAttributes["+" + L])) : u.setAttribute(L, s.elementAttributes[L]);
  return o.style.padding = "4px 4px", d = Math.min(parseFloat(d), n), d = Math.max(parseFloat(d), a), d = Math.round((d - a) / r), u.style.width = d + "%", o.setAttribute("aria-valuemin", a), o.setAttribute("aria-valuemax", n), u.appendChild(c), c.addEventListener("mousedown", function(L) {
    p = L.screenX, v = u.offsetWidth;
  }), c.addEventListener("mouseover", function() {
    c.style.cursor = "ew-resize";
  }), o.addEventListener("mousemove", function(L) {
    p && (u.style.width = v + L.screenX - p + "px");
  }), o.addEventListener("mouseup", function(L) {
    p && (L.stopPropagation(), L.stopImmediatePropagation(), p = !1, v = !1, y());
  }), o.addEventListener("keydown", function(L) {
    switch (L.keyCode) {
      case 39:
        L.preventDefault(), u.style.width = u.clientWidth + o.clientWidth / 100 + "px";
        break;
      case 37:
        L.preventDefault(), u.style.width = u.clientWidth - o.clientWidth / 100 + "px";
        break;
      case 9:
      case 13:
        y();
        break;
      case 27:
        i();
        break;
    }
  }), o.addEventListener("blur", function() {
    i();
  }), u;
}
function Ko(h, e, t, i, s) {
  var o = h.getValue(), n = document.createElement("input"), a = s.tristate, r = typeof s.indeterminateValue > "u" ? null : s.indeterminateValue, d = !1, c = Object.keys(s).includes("trueValue"), u = Object.keys(s).includes("falseValue");
  if (n.setAttribute("type", "checkbox"), n.style.marginTop = "5px", n.style.boxSizing = "border-box", s.elementAttributes && typeof s.elementAttributes == "object")
    for (let v in s.elementAttributes)
      v.charAt(0) == "+" ? (v = v.slice(1), n.setAttribute(v, n.getAttribute(v) + s.elementAttributes["+" + v])) : n.setAttribute(v, s.elementAttributes[v]);
  n.value = o, a && (typeof o > "u" || o === r || o === "") && (d = !0, n.indeterminate = !0), this.table.browser != "firefox" && this.table.browser != "safari" && e(function() {
    h.getType() === "cell" && n.focus({ preventScroll: !0 });
  }), n.checked = c ? o === s.trueValue : o === !0 || o === "true" || o === "True" || o === 1;
  function p(v) {
    var y = n.checked;
    return c && y ? y = s.trueValue : u && !y && (y = s.falseValue), a ? v ? d ? r : y : n.checked && !d ? (n.checked = !1, n.indeterminate = !0, d = !0, r) : (d = !1, y) : y;
  }
  return n.addEventListener("change", function(v) {
    t(p());
  }), n.addEventListener("blur", function(v) {
    t(p(!0));
  }), n.addEventListener("keydown", function(v) {
    v.keyCode == 13 && t(p()), v.keyCode == 27 && i();
  }), n;
}
function Qo(h, e, t, i, s) {
  var o = h._getSelf().column, n, a, r;
  function d(c) {
    var u = c.getValue(), p = "input";
    switch (typeof u) {
      case "number":
        p = "number";
        break;
      case "boolean":
        p = "tickCross";
        break;
      case "string":
        u.includes(`
`) && (p = "textarea");
        break;
    }
    return p;
  }
  return n = s.editorLookup ? s.editorLookup(h) : d(h), s.paramsLookup && (r = typeof s.paramsLookup == "function" ? s.paramsLookup(n, h) : s.paramsLookup[n]), a = this.table.modules.edit.lookupEditor(n, o), a.call(this, h, e, t, i, r || {});
}
var Xo = {
  input: Ho,
  textarea: $o,
  number: Bo,
  range: No,
  date: Vo,
  time: Io,
  datetime: Wo,
  list: jo,
  star: Uo,
  progress: qo,
  tickCross: Ko,
  adaptable: Qo
};
const Ht = class Ht extends q {
  constructor(e) {
    super(e), this.currentCell = !1, this.mouseClick = !1, this.recursionBlock = !1, this.invalidEdit = !1, this.editedCells = [], this.convertEmptyValues = !1, this.editors = Ht.editors, this.registerTableOption("editTriggerEvent", "focus"), this.registerTableOption("editorEmptyValue"), this.registerTableOption("editorEmptyValueFunc", this.emptyValueCheck.bind(this)), this.registerColumnOption("editable"), this.registerColumnOption("editor"), this.registerColumnOption("editorParams"), this.registerColumnOption("editorEmptyValue"), this.registerColumnOption("editorEmptyValueFunc"), this.registerColumnOption("cellEditing"), this.registerColumnOption("cellEdited"), this.registerColumnOption("cellEditCancelled"), this.registerTableFunction("getEditedCells", this.getEditedCells.bind(this)), this.registerTableFunction("clearCellEdited", this.clearCellEdited.bind(this)), this.registerTableFunction("navigatePrev", this.navigatePrev.bind(this)), this.registerTableFunction("navigateNext", this.navigateNext.bind(this)), this.registerTableFunction("navigateLeft", this.navigateLeft.bind(this)), this.registerTableFunction("navigateRight", this.navigateRight.bind(this)), this.registerTableFunction("navigateUp", this.navigateUp.bind(this)), this.registerTableFunction("navigateDown", this.navigateDown.bind(this)), this.registerComponentFunction("cell", "isEdited", this.cellIsEdited.bind(this)), this.registerComponentFunction("cell", "clearEdited", this.clearEdited.bind(this)), this.registerComponentFunction("cell", "edit", this.editCell.bind(this)), this.registerComponentFunction("cell", "cancelEdit", this.cellCancelEdit.bind(this)), this.registerComponentFunction("cell", "navigatePrev", this.navigatePrev.bind(this)), this.registerComponentFunction("cell", "navigateNext", this.navigateNext.bind(this)), this.registerComponentFunction("cell", "navigateLeft", this.navigateLeft.bind(this)), this.registerComponentFunction("cell", "navigateRight", this.navigateRight.bind(this)), this.registerComponentFunction("cell", "navigateUp", this.navigateUp.bind(this)), this.registerComponentFunction("cell", "navigateDown", this.navigateDown.bind(this));
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
        let o = e.cells[s];
        if (o.column.modules.edit && ne.elVisible(o.getElement()) && this.allowEdit(o)) {
          i = o;
          break;
        }
      }
    return i;
  }
  findPrevEditableCell(e, t) {
    var i = !1;
    if (t > 0)
      for (var s = t - 1; s >= 0; s--) {
        let o = e.cells[s];
        if (o.column.modules.edit && ne.elVisible(o.getElement()) && this.allowEdit(o)) {
          i = o;
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
      var o = this.table.rowManager.element.scrollLeft, n = this.table.rowManager.element.clientWidth + this.table.rowManager.element.scrollLeft, a = e.getElement();
      this.table.modExists("frozenColumns") && (o += parseInt(this.table.modules.frozenColumns.leftMargin || 0), n -= parseInt(this.table.modules.frozenColumns.rightMargin || 0)), this.table.options.renderHorizontal === "virtual" && (o -= parseInt(this.table.columnManager.renderer.vDomPadLeft), n -= parseInt(this.table.columnManager.renderer.vDomPadLeft)), a.offsetLeft < o ? this.table.rowManager.element.scrollLeft -= o - a.offsetLeft : a.offsetLeft + a.offsetWidth > n && (this.table.rowManager.element.scrollLeft += a.offsetLeft + a.offsetWidth - n);
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
    var s = this, o = !0, n = function() {
    }, a = e.getElement(), r = !1, d, c, u;
    if (this.currentCell) {
      !this.invalidEdit && this.currentCell !== e && this.cancelEdit();
      return;
    }
    function p(x) {
      if (s.currentCell === e && !r) {
        var g = s.chain("edit-success", [e, x], !0, !0);
        return g === !0 || s.table.options.validationMode === "highlight" ? (r = !0, s.clearEditor(), e.modules.edit || (e.modules.edit = {}), e.modules.edit.edited = !0, s.editedCells.indexOf(e) == -1 && s.editedCells.push(e), x = s.transformEmptyValues(x, e), e.setValue(x, !0), g === !0) : (r = !0, s.invalidEdit = !0, s.focusCellNoEvent(e, !0), n(), setTimeout(() => {
          r = !1;
        }, 10), !1);
      }
    }
    function v() {
      s.currentCell === e && !r && s.cancelEdit();
    }
    function y(x) {
      n = x;
    }
    if (e.column.modules.edit.blocked)
      return this.mouseClick = !1, this.blur(a), !1;
    if (t && t.stopPropagation(), o = this.allowEdit(e), o || i) {
      if (s.cancelEdit(), s.currentCell = e, this.focusScrollAdjust(e), c = e.getComponent(), this.mouseClick && (this.mouseClick = !1, e.column.definition.cellClick && e.column.definition.cellClick.call(this.table, t, c)), e.column.definition.cellEditing && e.column.definition.cellEditing.call(this.table, c), this.dispatch("cell-editing", e), this.dispatchExternal("cellEditing", c), u = typeof e.column.modules.edit.params == "function" ? e.column.modules.edit.params(c) : e.column.modules.edit.params, d = e.column.modules.edit.editor.call(s, c, y, p, v, u), this.currentCell && d !== !1)
        if (d instanceof Node) {
          for (a.classList.add("tabulator-editing"), e.row.getElement().classList.add("tabulator-editing"), e.table.element.classList.add("tabulator-editing"); a.firstChild; ) a.removeChild(a.firstChild);
          a.appendChild(d), n();
          for (var L = a.children, _ = 0; _ < L.length; _++)
            L[_].addEventListener("click", function(x) {
              x.stopPropagation();
            });
        } else
          return console.warn("Edit Error - Editor should return an instance of Node, the editor returned:", d), this.blur(a), !1;
      else
        return this.blur(a), !1;
      return !0;
    } else
      return this.mouseClick = !1, this.blur(a), !1;
  }
  emptyValueCheck(e) {
    return e === "" || e === null || typeof e > "u";
  }
  transformEmptyValues(e, t) {
    var i = t.column.modules.edit, s = i.convertEmptyValues || this.convertEmptyValues, o;
    return s && (o = i.editorEmptyValueFunc || this.options("editorEmptyValueFunc"), o && o(e) && (e = i.convertEmptyValues ? i.editorEmptyValue : this.options("editorEmptyValue"))), e;
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
O(Ht, "moduleName", "edit"), //load defaults
O(Ht, "editors", Xo);
let wi = Ht;
class es {
  constructor(e, t, i, s) {
    this.type = e, this.columns = t, this.component = i || !1, this.indent = s || 0;
  }
}
class ci {
  constructor(e, t, i, s, o) {
    this.value = e, this.component = t || !1, this.width = i, this.height = s, this.depth = o;
  }
}
var Jo = {}, Yo = {
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
const dt = class dt extends q {
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
    var o, n, a, r;
    return this.cloneTableStyle = t, this.config = e || {}, this.colVisProp = s, this.colVisPropAttach = this.colVisProp.charAt(0).toUpperCase() + this.colVisProp.slice(1), r = dt.columnLookups[i], r && (a = r.call(this.table), a = a.filter((d) => this.columnVisCheck(d))), o = this.config.columnHeaders !== !1 ? this.headersToExportRows(this.generateColumnGroupHeaders(a)) : [], a && (a = a.map((d) => d.getComponent())), n = this.bodyToExportRows(this.rowLookup(i), a), o.concat(n);
  }
  generateTable(e, t, i, s) {
    var o = this.generateExportList(e, t, i, s);
    return this.generateTableElement(o);
  }
  rowLookup(e) {
    var t = [], i;
    return typeof e == "function" ? e.call(this.table).forEach((s) => {
      s = this.table.rowManager.findRow(s), s && t.push(s);
    }) : (i = dt.rowLookups[e] || dt.rowLookups.active, t = i.call(this.table)), Object.assign([], t);
  }
  generateColumnGroupHeaders(e) {
    var t = [];
    return e || (e = this.config.columnGroups !== !1 ? this.table.columnManager.columns : this.table.columnManager.columnsByIndex), e.forEach((i) => {
      var s = this.processColumnGroup(i);
      s && t.push(s);
    }), t;
  }
  processColumnGroup(e) {
    var t = e.columns, i = 0, s = e.definition["title" + this.colVisPropAttach] || e.definition.title, o = {
      title: s,
      column: e,
      depth: 1
    };
    if (t.length) {
      if (o.subGroups = [], o.width = 0, t.forEach((n) => {
        var a = this.processColumnGroup(n);
        a && (o.width += a.width, o.subGroups.push(a), a.depth > i && (i = a.depth));
      }), o.depth += i, !o.width)
        return !1;
    } else if (this.columnVisCheck(e))
      o.width = 1;
    else
      return !1;
    return o;
  }
  columnVisCheck(e) {
    var t = e.definition[this.colVisProp];
    return this.config.rowHeaders === !1 && e.isRowHeader ? !1 : (typeof t == "function" && (t = t.call(this.table, e.getComponent())), t === !1 || t === !0 ? t : e.visible && e.field);
  }
  headersToExportRows(e) {
    var t = [], i = 0, s = [];
    function o(n, a) {
      var r = i - a;
      if (typeof t[a] > "u" && (t[a] = []), n.height = n.subGroups ? 1 : r - n.depth + 1, t[a].push(n), n.height > 1)
        for (let d = 1; d < n.height; d++)
          typeof t[a + d] > "u" && (t[a + d] = []), t[a + d].push(!1);
      if (n.width > 1)
        for (let d = 1; d < n.width; d++)
          t[a].push(!1);
      n.subGroups && n.subGroups.forEach(function(d) {
        o(d, a + 1);
      });
    }
    return e.forEach(function(n) {
      n.depth > i && (i = n.depth);
    }), e.forEach(function(n) {
      o(n, 0);
    }), t.forEach((n) => {
      var a = [];
      n.forEach((r) => {
        if (r) {
          let d = typeof r.title > "u" ? "" : r.title;
          a.push(new ci(d, r.column.getComponent(), r.width, r.height, r.depth));
        } else
          a.push(null);
      }), s.push(new es("header", a));
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
    }), e.forEach((s, o) => {
      var n = s.getData(this.colVisProp), a = [], r = 0;
      switch (s.type) {
        case "group":
          r = s.level, a.push(new ci(s.key, s.getComponent(), t.length, 1));
          break;
        case "calc":
        case "row":
          t.forEach((d) => {
            a.push(new ci(d._column.getFieldValue(n), d, 1, 1));
          }), this.table.options.dataTree && this.config.dataTree !== !1 && (r = s.modules.dataTree.index);
          break;
      }
      i.push(new es(s.type, a, s.getComponent(), r));
    }), i;
  }
  generateTableElement(e) {
    var t = document.createElement("table"), i = document.createElement("thead"), s = document.createElement("tbody"), o = this.lookupTableStyles(), n = this.table.options["rowFormatter" + this.colVisPropAttach], a = {};
    return a.rowFormatter = n !== null ? n : this.table.options.rowFormatter, this.table.options.dataTree && this.config.dataTree !== !1 && this.table.modExists("columnCalcs") && (a.treeElementField = this.table.modules.dataTree.elementField), a.groupHeader = this.table.options["groupHeader" + this.colVisPropAttach], a.groupHeader && !Array.isArray(a.groupHeader) && (a.groupHeader = [a.groupHeader]), t.classList.add("tabulator-print-table"), this.mapElementStyles(this.table.columnManager.getHeadersElement(), i, ["border-top", "border-left", "border-right", "border-bottom", "background-color", "color", "font-weight", "font-family", "font-size"]), e.length > 1e3 && console.warn("It may take a long time to render an HTML table with more than 1000 rows"), e.forEach((r, d) => {
      let c;
      switch (r.type) {
        case "header":
          i.appendChild(this.generateHeaderElement(r, a, o));
          break;
        case "group":
          s.appendChild(this.generateGroupElement(r, a, o));
          break;
        case "calc":
          s.appendChild(this.generateCalcElement(r, a, o));
          break;
        case "row":
          c = this.generateRowElement(r, a, o), this.mapElementStyles(d % 2 && o.evenRow ? o.evenRow : o.oddRow, c, ["border-top", "border-left", "border-right", "border-bottom", "color", "font-weight", "font-family", "font-size", "background-color"]), s.appendChild(c);
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
    return e.columns.forEach((o) => {
      if (o) {
        var n = document.createElement("th"), a = o.component._column.definition.cssClass ? o.component._column.definition.cssClass.split(" ") : [];
        n.colSpan = o.width, n.rowSpan = o.height, n.innerHTML = o.value, this.cloneTableStyle && (n.style.boxSizing = "border-box"), a.forEach(function(r) {
          n.classList.add(r);
        }), this.mapElementStyles(o.component.getElement(), n, ["text-align", "border-left", "border-right", "background-color", "color", "font-weight", "font-family", "font-size"]), this.mapElementStyles(o.component._column.contentElement, n, ["padding-top", "padding-left", "padding-right", "padding-bottom"]), o.component._column.visible ? this.mapElementStyles(o.component.getElement(), n, ["width"]) : o.component._column.definition.width && (n.style.width = o.component._column.definition.width + "px"), o.component._column.parent && o.component._column.parent.isGroup ? this.mapElementStyles(o.component._column.parent.groupElement, n, ["border-top"]) : this.mapElementStyles(o.component.getElement(), n, ["border-top"]), o.component._column.isGroup ? this.mapElementStyles(o.component.getElement(), n, ["border-bottom"]) : this.mapElementStyles(this.table.columnManager.getElement(), n, ["border-bottom"]), s.appendChild(n);
      }
    }), s;
  }
  generateGroupElement(e, t, i) {
    var s = document.createElement("tr"), o = document.createElement("td"), n = e.columns[0];
    return s.classList.add("tabulator-print-table-row"), t.groupHeader && t.groupHeader[e.indent] ? n.value = t.groupHeader[e.indent](n.value, e.component._group.getRowCount(), e.component._group.getData(), e.component) : t.groupHeader !== !1 && (n.value = e.component._group.generator(n.value, e.component._group.getRowCount(), e.component._group.getData(), e.component)), o.colSpan = n.width, o.innerHTML = n.value, s.classList.add("tabulator-print-table-group"), s.classList.add("tabulator-group-level-" + e.indent), n.component.isVisible() && s.classList.add("tabulator-group-visible"), this.mapElementStyles(i.firstGroup, s, ["border-top", "border-left", "border-right", "border-bottom", "color", "font-weight", "font-family", "font-size", "background-color"]), this.mapElementStyles(i.firstGroup, o, ["padding-top", "padding-left", "padding-right", "padding-bottom"]), s.appendChild(o), s;
  }
  generateCalcElement(e, t, i) {
    var s = this.generateRowElement(e, t, i);
    return s.classList.add("tabulator-print-table-calcs"), this.mapElementStyles(i.calcRow, s, ["border-top", "border-left", "border-right", "border-bottom", "color", "font-weight", "font-family", "font-size", "background-color"]), s;
  }
  generateRowElement(e, t, i) {
    var s = document.createElement("tr");
    if (s.classList.add("tabulator-print-table-row"), e.columns.forEach((o, n) => {
      if (o) {
        var a = document.createElement("td"), r = o.component._column, d = this.table, c = d.columnManager.findColumnIndex(r), u = o.value, p, v, y = {
          modules: {},
          getValue: function() {
            return u;
          },
          getField: function() {
            return r.definition.field;
          },
          getElement: function() {
            return a;
          },
          getType: function() {
            return "cell";
          },
          getColumn: function() {
            return r.getComponent();
          },
          getData: function() {
            return e.component.getData();
          },
          getRow: function() {
            return e.component;
          },
          getTable: function() {
            return d;
          },
          getComponent: function() {
            return y;
          },
          column: r
        }, L = r.definition.cssClass ? r.definition.cssClass.split(" ") : [];
        if (L.forEach(function(_) {
          a.classList.add(_);
        }), this.table.modExists("format") && this.config.formatCells !== !1)
          u = this.table.modules.format.formatExportValue(y, this.colVisProp);
        else
          switch (typeof u) {
            case "object":
              u = u !== null ? JSON.stringify(u) : "";
              break;
            case "undefined":
              u = "";
              break;
          }
        u instanceof Node ? a.appendChild(u) : a.innerHTML = u, v = ["padding-top", "padding-left", "padding-right", "padding-bottom", "border-top", "border-left", "border-right", "border-bottom", "color", "font-weight", "font-family", "font-size", "text-align"], r.isRowHeader ? (p = i.styleRowHeader, v.push("background-color")) : p = i.styleCells && i.styleCells[c] ? i.styleCells[c] : i.firstCell, p && (this.mapElementStyles(p, a, v), r.definition.align && (a.style.textAlign = r.definition.align)), this.table.options.dataTree && this.config.dataTree !== !1 && (t.treeElementField && t.treeElementField == r.field || !t.treeElementField && n == 0) && (e.component._row.modules.dataTree.controlEl && a.insertBefore(e.component._row.modules.dataTree.controlEl.cloneNode(!0), a.firstChild), e.component._row.modules.dataTree.branchEl && a.insertBefore(e.component._row.modules.dataTree.branchEl.cloneNode(!0), a.firstChild)), s.appendChild(a), y.modules.format && y.modules.format.renderedCallback && y.modules.format.renderedCallback();
      }
    }), t.rowFormatter && e.type === "row" && this.config.formatCells !== !1) {
      let o = Object.assign(e.component);
      o.getElement = function() {
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
    var o = this.generateExportList(i || this.table.options.htmlOutputConfig, t, e, s || "htmlOutput");
    return this.generateHTMLTable(o);
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
        var o = window.getComputedStyle(e);
        i.forEach(function(n) {
          t.style[s[n]] || (t.style[s[n]] = o.getPropertyValue(n));
        });
      }
    }
  }
};
O(dt, "moduleName", "export"), O(dt, "columnLookups", Jo), O(dt, "rowLookups", Yo);
let Ci = dt;
var Zo = {
  //equal to
  "=": function(h, e, t, i) {
    return e == h;
  },
  //less than
  "<": function(h, e, t, i) {
    return e < h;
  },
  //less than or equal to
  "<=": function(h, e, t, i) {
    return e <= h;
  },
  //greater than
  ">": function(h, e, t, i) {
    return e > h;
  },
  //greater than or equal to
  ">=": function(h, e, t, i) {
    return e >= h;
  },
  //not equal to
  "!=": function(h, e, t, i) {
    return e != h;
  },
  regex: function(h, e, t, i) {
    return typeof h == "string" && (h = new RegExp(h)), h.test(e);
  },
  //contains the string
  like: function(h, e, t, i) {
    return h === null || typeof h > "u" ? e === h : typeof e < "u" && e !== null ? String(e).toLowerCase().indexOf(h.toLowerCase()) > -1 : !1;
  },
  //contains the keywords
  keywords: function(h, e, t, i) {
    var s = h.toLowerCase().split(typeof i.separator > "u" ? " " : i.separator), o = String(e === null || typeof e > "u" ? "" : e).toLowerCase(), n = [];
    return s.forEach((a) => {
      o.includes(a) && n.push(!0);
    }), i.matchAll ? n.length === s.length : !!n.length;
  },
  //starts with the string
  starts: function(h, e, t, i) {
    return h === null || typeof h > "u" ? e === h : typeof e < "u" && e !== null ? String(e).toLowerCase().startsWith(h.toLowerCase()) : !1;
  },
  //ends with the string
  ends: function(h, e, t, i) {
    return h === null || typeof h > "u" ? e === h : typeof e < "u" && e !== null ? String(e).toLowerCase().endsWith(h.toLowerCase()) : !1;
  },
  //in array
  in: function(h, e, t, i) {
    return Array.isArray(h) ? h.length ? h.indexOf(e) > -1 : !0 : (console.warn("Filter Error - filter value is not an array:", h), !1);
  }
};
const tt = class tt extends q {
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
    function o(n) {
      var a = e.modules.filter.tagType == "input" && e.modules.filter.attrType == "text" || e.modules.filter.tagType == "textarea" ? "partial" : "match", r = "", d = "", c;
      if (typeof e.modules.filter.prevSuccess > "u" || e.modules.filter.prevSuccess !== n) {
        if (e.modules.filter.prevSuccess = n, e.modules.filter.emptyFunc(n))
          delete i.headerFilters[s];
        else {
          switch (e.modules.filter.value = n, typeof e.definition.headerFilterFunc) {
            case "string":
              tt.filters[e.definition.headerFilterFunc] ? (r = e.definition.headerFilterFunc, c = function(u) {
                var p = e.definition.headerFilterFuncParams || {}, v = e.getFieldValue(u);
                return p = typeof p == "function" ? p(n, v, u) : p, tt.filters[e.definition.headerFilterFunc](n, v, u, p);
              }) : console.warn("Header Filter Error - Matching filter function not found: ", e.definition.headerFilterFunc);
              break;
            case "function":
              c = function(u) {
                var p = e.definition.headerFilterFuncParams || {}, v = e.getFieldValue(u);
                return p = typeof p == "function" ? p(n, v, u) : p, e.definition.headerFilterFunc(n, v, u, p);
              }, r = c;
              break;
          }
          if (!c)
            switch (a) {
              case "partial":
                c = function(u) {
                  var p = e.getFieldValue(u);
                  return typeof p < "u" && p !== null ? String(p).toLowerCase().indexOf(String(n).toLowerCase()) > -1 : !1;
                }, r = "like";
                break;
              default:
                c = function(u) {
                  return e.getFieldValue(u) == n;
                }, r = "=";
            }
          i.headerFilters[s] = { value: n, func: c, type: r };
        }
        e.modules.filter.value = n, d = JSON.stringify(i.headerFilters), i.prevHeaderFilterChangeCheck !== d && (i.prevHeaderFilterChangeCheck = d, i.trackChanges(), i.refreshFilter());
      }
      return !0;
    }
    e.modules.filter = {
      success: o,
      attrType: !1,
      tagType: !1,
      emptyFunc: !1
    }, this.generateHeaderFilterElement(e);
  }
  generateHeaderFilterElement(e, t, i) {
    var s = this, o = e.modules.filter.success, n = e.getField(), a, r, d, c, u, p, v, y;
    e.modules.filter.value = t;
    function L() {
    }
    function _(x) {
      y = x;
    }
    if (e.modules.filter.headerElement && e.modules.filter.headerElement.parentNode && e.contentElement.removeChild(e.modules.filter.headerElement.parentNode), n) {
      switch (e.modules.filter.emptyFunc = e.definition.headerFilterEmptyCheck || function(x) {
        return !x && x !== 0;
      }, a = document.createElement("div"), a.classList.add("tabulator-header-filter"), typeof e.definition.headerFilter) {
        case "string":
          s.table.modules.edit.editors[e.definition.headerFilter] ? (r = s.table.modules.edit.editors[e.definition.headerFilter], (e.definition.headerFilter === "tick" || e.definition.headerFilter === "tickCross") && !e.definition.headerFilterEmptyCheck && (e.modules.filter.emptyFunc = function(x) {
            return x !== !0 && x !== !1;
          })) : console.warn("Filter Error - Cannot build header filter, No such editor found: ", e.definition.editor);
          break;
        case "function":
          r = e.definition.headerFilter;
          break;
        case "boolean":
          e.modules.edit && e.modules.edit.editor ? r = e.modules.edit.editor : e.definition.formatter && s.table.modules.edit.editors[e.definition.formatter] ? (r = s.table.modules.edit.editors[e.definition.formatter], (e.definition.formatter === "tick" || e.definition.formatter === "tickCross") && !e.definition.headerFilterEmptyCheck && (e.modules.filter.emptyFunc = function(x) {
            return x !== !0 && x !== !1;
          })) : r = s.table.modules.edit.editors.input;
          break;
      }
      if (r) {
        if (c = {
          getValue: function() {
            return typeof t < "u" ? t : "";
          },
          getField: function() {
            return e.definition.field;
          },
          getElement: function() {
            return a;
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
        }, v = e.definition.headerFilterParams || {}, v = typeof v == "function" ? v.call(s.table, c) : v, d = r.call(this.table.modules.edit, c, _, o, L, v), !d) {
          console.warn("Filter Error - Cannot add filter to " + n + " column, editor returned a value of false");
          return;
        }
        if (!(d instanceof Node)) {
          console.warn("Filter Error - Cannot add filter to " + n + " column, editor should return an instance of Node, the editor returned:", d);
          return;
        }
        s.langBind("headerFilters|columns|" + e.definition.field, function(x) {
          d.setAttribute("placeholder", typeof x < "u" && x ? x : e.definition.headerFilterPlaceholder || s.langText("headerFilters|default"));
        }), d.addEventListener("click", function(x) {
          x.stopPropagation(), d.focus();
        }), d.addEventListener("focus", (x) => {
          var g = this.table.columnManager.contentsElement.scrollLeft, f = this.table.rowManager.element.scrollLeft;
          g !== f && (this.table.rowManager.scrollHorizontal(g), this.table.columnManager.scrollHorizontal(g));
        }), u = !1, p = function(x) {
          u && clearTimeout(u), u = setTimeout(function() {
            o(d.value);
          }, s.table.options.headerFilterLiveFilterDelay);
        }, e.modules.filter.headerElement = d, e.modules.filter.attrType = d.hasAttribute("type") ? d.getAttribute("type").toLowerCase() : "", e.modules.filter.tagType = d.tagName.toLowerCase(), e.definition.headerFilterLiveFilter !== !1 && (e.definition.headerFilter === "autocomplete" || e.definition.headerFilter === "tickCross" || (e.definition.editor === "autocomplete" || e.definition.editor === "tickCross") && e.definition.headerFilter === !0 || (d.addEventListener("keyup", p), d.addEventListener("search", p), e.modules.filter.attrType == "number" && d.addEventListener("change", function(x) {
          o(d.value);
        }), e.modules.filter.attrType == "text" && this.table.browser !== "ie" && d.setAttribute("type", "search")), (e.modules.filter.tagType == "input" || e.modules.filter.tagType == "select" || e.modules.filter.tagType == "textarea") && d.addEventListener("mousedown", function(x) {
          x.stopPropagation();
        })), a.appendChild(d), e.contentElement.appendChild(a), i || s.headerFilterColumns.push(e), y && y();
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
    var o = !1;
    Array.isArray(e) || (e = [{ field: e, type: t, value: i, params: s }]), e.forEach((n) => {
      n = this.findFilter(n), n && (this.filterList.push(n), o = !0);
    }), o && this.trackChanges();
  }
  findFilter(e) {
    var t;
    if (Array.isArray(e))
      return this.findSubFilters(e);
    var i = !1;
    return typeof e.field == "function" ? i = function(s) {
      return e.field(s, e.type || {});
    } : tt.filters[e.type] ? (t = this.table.columnManager.getColumnByField(e.field), t ? i = function(s) {
      return tt.filters[e.type](e.value, t.getFieldValue(s), s, e.params || {});
    } : i = function(s) {
      return tt.filters[e.type](e.value, s[e.field], s, e.params || {});
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
      var o;
      Array.isArray(s) ? i.push(this.filtersToArray(s, t)) : (o = { field: s.field, type: s.type, value: s.value }, t && typeof o.type == "function" && (o.type = "function"), i.push(o));
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
      var o = -1;
      typeof s.field == "object" ? o = this.filterList.findIndex((n) => s === n) : o = this.filterList.findIndex((n) => s.field === n.field && s.type === n.type && s.value === n.value), o > -1 ? this.filterList.splice(o, 1) : console.warn("Filter Error - No matching filter type found, ignoring: ", s.type);
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
    var o = [], n = [];
    return Array.isArray(t) || (t = [{ field: t, type: i, value: s }]), t.forEach((a) => {
      a = this.findFilter(a), a && n.push(a);
    }), this.table.rowManager.rows.forEach((a) => {
      var r = !0;
      n.forEach((d) => {
        this.filterRecurse(d, a.getData()) || (r = !1);
      }), r && o.push(e === "data" ? a.getData("data") : a.getComponent());
    }), o;
  }
  //filter row array
  filter(e, t) {
    var i = [], s = [];
    return this.subscribedExternal("dataFiltering") && this.dispatchExternal("dataFiltering", this.getFilters(!0)), this.table.options.filterMode !== "remote" && (this.filterList.length || Object.keys(this.headerFilters).length) ? e.forEach((o) => {
      this.filterRow(o) && i.push(o);
    }) : i = e.slice(0), this.subscribedExternal("dataFiltered") && (i.forEach((o) => {
      s.push(o.getComponent());
    }), this.dispatchExternal("dataFiltered", this.getFilters(!0), s)), i;
  }
  //filter individual row
  filterRow(e, t) {
    var i = !0, s = e.getData();
    this.filterList.forEach((n) => {
      this.filterRecurse(n, s) || (i = !1);
    });
    for (var o in this.headerFilters)
      this.headerFilters[o].func(s) || (i = !1);
    return i;
  }
  filterRecurse(e, t) {
    var i = !1;
    return Array.isArray(e) ? e.forEach((s) => {
      this.filterRecurse(s, t) && (i = !0);
    }) : i = e.func(t), i;
  }
};
O(tt, "moduleName", "filter"), //load defaults
O(tt, "filters", Zo);
let Ei = tt;
function en(h, e, t) {
  return this.emptyToSpace(this.sanitizeHTML(h.getValue()));
}
function tn(h, e, t) {
  return h.getValue();
}
function sn(h, e, t) {
  return h.getElement().style.whiteSpace = "pre-wrap", this.emptyToSpace(this.sanitizeHTML(h.getValue()));
}
function on(h, e, t) {
  var i = parseFloat(h.getValue()), s = "", o, n, a, r, d, c = e.decimal || ".", u = e.thousand || ",", p = e.negativeSign || "-", v = e.symbol || "", y = !!e.symbolAfter, L = typeof e.precision < "u" ? e.precision : 2;
  if (isNaN(i))
    return this.emptyToSpace(this.sanitizeHTML(h.getValue()));
  if (i < 0 && (i = Math.abs(i), s = p), o = L !== !1 ? i.toFixed(L) : i, o = String(o).split("."), n = o[0], a = o.length > 1 ? c + o[1] : "", e.thousand !== !1)
    for (r = /(\d+)(\d{3})/; r.test(n); )
      n = n.replace(r, "$1" + u + "$2");
  return d = n + a, s === !0 ? (d = "(" + d + ")", y ? d + v : v + d) : y ? s + d + v : s + v + d;
}
function nn(h, e, t) {
  var i = h.getValue(), s = e.urlPrefix || "", o = e.download, n = i, a = document.createElement("a"), r;
  function d(c, u) {
    var p = c.shift(), v = u[p];
    return c.length && typeof v == "object" ? d(c, v) : v;
  }
  if (e.labelField && (r = h.getData(), n = d(e.labelField.split(this.table.options.nestedFieldSeparator), r)), e.label)
    switch (typeof e.label) {
      case "string":
        n = e.label;
        break;
      case "function":
        n = e.label(h);
        break;
    }
  if (n) {
    if (e.urlField && (r = h.getData(), i = ne.retrieveNestedData(this.table.options.nestedFieldSeparator, e.urlField, r)), e.url)
      switch (typeof e.url) {
        case "string":
          i = e.url;
          break;
        case "function":
          i = e.url(h);
          break;
      }
    return a.setAttribute("href", s + i), e.target && a.setAttribute("target", e.target), e.download && (typeof o == "function" ? o = o(h) : o = o === !0 ? "" : o, a.setAttribute("download", o)), a.innerHTML = this.emptyToSpace(this.sanitizeHTML(n)), a;
  } else
    return "&nbsp;";
}
function an(h, e, t) {
  var i = document.createElement("img"), s = h.getValue();
  switch (e.urlPrefix && (s = e.urlPrefix + h.getValue()), e.urlSuffix && (s = s + e.urlSuffix), i.setAttribute("src", s), typeof e.height) {
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
    h.getRow().normalizeHeight();
  }), i;
}
function rn(h, e, t) {
  var i = h.getValue(), s = h.getElement(), o = e.allowEmpty, n = e.allowTruthy, a = Object.keys(e).includes("trueValue"), r = typeof e.tickElement < "u" ? e.tickElement : '<svg enable-background="new 0 0 24 24" height="14" width="14" viewBox="0 0 24 24" xml:space="preserve" ><path fill="#2DC214" clip-rule="evenodd" d="M21.652,3.211c-0.293-0.295-0.77-0.295-1.061,0L9.41,14.34  c-0.293,0.297-0.771,0.297-1.062,0L3.449,9.351C3.304,9.203,3.114,9.13,2.923,9.129C2.73,9.128,2.534,9.201,2.387,9.351  l-2.165,1.946C0.078,11.445,0,11.63,0,11.823c0,0.194,0.078,0.397,0.223,0.544l4.94,5.184c0.292,0.296,0.771,0.776,1.062,1.07  l2.124,2.141c0.292,0.293,0.769,0.293,1.062,0l14.366-14.34c0.293-0.294,0.293-0.777,0-1.071L21.652,3.211z" fill-rule="evenodd"/></svg>', d = typeof e.crossElement < "u" ? e.crossElement : '<svg enable-background="new 0 0 24 24" height="14" width="14"  viewBox="0 0 24 24" xml:space="preserve" ><path fill="#CE1515" d="M22.245,4.015c0.313,0.313,0.313,0.826,0,1.139l-6.276,6.27c-0.313,0.312-0.313,0.826,0,1.14l6.273,6.272  c0.313,0.313,0.313,0.826,0,1.14l-2.285,2.277c-0.314,0.312-0.828,0.312-1.142,0l-6.271-6.271c-0.313-0.313-0.828-0.313-1.141,0  l-6.276,6.267c-0.313,0.313-0.828,0.313-1.141,0l-2.282-2.28c-0.313-0.313-0.313-0.826,0-1.14l6.278-6.269  c0.313-0.312,0.313-0.826,0-1.14L1.709,5.147c-0.314-0.313-0.314-0.827,0-1.14l2.284-2.278C4.308,1.417,4.821,1.417,5.135,1.73  L11.405,8c0.314,0.314,0.828,0.314,1.141,0.001l6.276-6.267c0.312-0.312,0.826-0.312,1.141,0L22.245,4.015z"/></svg>';
  return a && i === e.trueValue || !a && (n && i || i === !0 || i === "true" || i === "True" || i === 1 || i === "1") ? (s.setAttribute("aria-checked", !0), r || "") : o && (i === "null" || i === "" || i === null || typeof i > "u") ? (s.setAttribute("aria-checked", "mixed"), "") : (s.setAttribute("aria-checked", !1), d || "");
}
function ln(h, e, t) {
  var i = this.table.dependencyRegistry.lookup(["luxon", "DateTime"], "DateTime"), s = e.inputFormat || "yyyy-MM-dd HH:mm:ss", o = e.outputFormat || "dd/MM/yyyy HH:mm:ss", n = typeof e.invalidPlaceholder < "u" ? e.invalidPlaceholder : "", a = h.getValue();
  if (typeof i < "u") {
    var r;
    return i.isDateTime(a) ? r = a : s === "iso" ? r = i.fromISO(String(a)) : r = i.fromFormat(String(a), s), r.isValid ? (e.timezone && (r = r.setZone(e.timezone)), r.toFormat(o)) : n === !0 || !a ? a : typeof n == "function" ? n(a) : n;
  } else
    console.error("Format Error - 'datetime' formatter is dependant on luxon.js");
}
function hn(h, e, t) {
  var i = this.table.dependencyRegistry.lookup(["luxon", "DateTime"], "DateTime"), s = e.inputFormat || "yyyy-MM-dd HH:mm:ss", o = typeof e.invalidPlaceholder < "u" ? e.invalidPlaceholder : "", n = typeof e.suffix < "u" ? e.suffix : !1, a = typeof e.unit < "u" ? e.unit : "days", r = typeof e.humanize < "u" ? e.humanize : !1, d = typeof e.date < "u" ? e.date : i.now(), c = h.getValue();
  if (typeof i < "u") {
    var u;
    return i.isDateTime(c) ? u = c : s === "iso" ? u = i.fromISO(String(c)) : u = i.fromFormat(String(c), s), u.isValid ? r ? u.diff(d, a).toHuman() + (n ? " " + n : "") : parseInt(u.diff(d, a)[a]) + (n ? " " + n : "") : o === !0 ? c : typeof o == "function" ? o(c) : o;
  } else
    console.error("Format Error - 'datetimediff' formatter is dependant on luxon.js");
}
function dn(h, e, t) {
  var i = h.getValue();
  return typeof e[i] > "u" ? (console.warn("Missing display value for " + i), i) : e[i];
}
function cn(h, e, t) {
  var i = h.getValue(), s = h.getElement(), o = e && e.stars ? e.stars : 5, n = document.createElement("span"), a = document.createElementNS("http://www.w3.org/2000/svg", "svg"), r = '<polygon fill="#FFEA00" stroke="#C1AB60" stroke-width="37.6152" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" points="259.216,29.942 330.27,173.919 489.16,197.007 374.185,309.08 401.33,467.31 259.216,392.612 117.104,467.31 144.25,309.08 29.274,197.007 188.165,173.919 "/>', d = '<polygon fill="#D2D2D2" stroke="#686868" stroke-width="37.6152" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" points="259.216,29.942 330.27,173.919 489.16,197.007 374.185,309.08 401.33,467.31 259.216,392.612 117.104,467.31 144.25,309.08 29.274,197.007 188.165,173.919 "/>';
  n.style.verticalAlign = "middle", a.setAttribute("width", "14"), a.setAttribute("height", "14"), a.setAttribute("viewBox", "0 0 512 512"), a.setAttribute("xml:space", "preserve"), a.style.padding = "0 1px", i = i && !isNaN(i) ? parseInt(i) : 0, i = Math.max(0, Math.min(i, o));
  for (var c = 1; c <= o; c++) {
    var u = a.cloneNode(!0);
    u.innerHTML = c <= i ? r : d, n.appendChild(u);
  }
  return s.style.whiteSpace = "nowrap", s.style.overflow = "hidden", s.style.textOverflow = "ellipsis", s.setAttribute("aria-label", i), n;
}
function un(h, e, t) {
  var i = this.sanitizeHTML(h.getValue()) || 0, s = document.createElement("span"), o = e && e.max ? e.max : 100, n = e && e.min ? e.min : 0, a = e && typeof e.color < "u" ? e.color : ["red", "orange", "green"], r = "#666666", d, c;
  if (!(isNaN(i) || typeof h.getValue() > "u")) {
    switch (s.classList.add("tabulator-traffic-light"), c = parseFloat(i) <= o ? parseFloat(i) : o, c = parseFloat(c) >= n ? parseFloat(c) : n, d = (o - n) / 100, c = Math.round((c - n) / d), typeof a) {
      case "string":
        r = a;
        break;
      case "function":
        r = a(i);
        break;
      case "object":
        if (Array.isArray(a)) {
          var u = 100 / a.length, p = Math.floor(c / u);
          p = Math.min(p, a.length - 1), p = Math.max(p, 0), r = a[p];
          break;
        }
    }
    return s.style.backgroundColor = r, s;
  }
}
function fn(h, e = {}, t) {
  var i = this.sanitizeHTML(h.getValue()) || 0, s = h.getElement(), o = e.max ? e.max : 100, n = e.min ? e.min : 0, a = e.legendAlign ? e.legendAlign : "center", r, d, c, u, p;
  switch (d = parseFloat(i) <= o ? parseFloat(i) : o, d = parseFloat(d) >= n ? parseFloat(d) : n, r = (o - n) / 100, d = Math.round((d - n) / r), typeof e.color) {
    case "string":
      c = e.color;
      break;
    case "function":
      c = e.color(i);
      break;
    case "object":
      if (Array.isArray(e.color)) {
        let _ = 100 / e.color.length, x = Math.floor(d / _);
        x = Math.min(x, e.color.length - 1), x = Math.max(x, 0), c = e.color[x];
        break;
      }
    default:
      c = "#2DC214";
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
      p = e.legendColor;
      break;
    case "function":
      p = e.legendColor(i);
      break;
    case "object":
      if (Array.isArray(e.legendColor)) {
        let _ = 100 / e.legendColor.length, x = Math.floor(d / _);
        x = Math.min(x, e.legendColor.length - 1), x = Math.max(x, 0), p = e.legendColor[x];
      }
      break;
    default:
      p = "#000";
  }
  s.style.minWidth = "30px", s.style.position = "relative", s.setAttribute("aria-label", d);
  var v = document.createElement("div");
  v.style.display = "inline-block", v.style.width = d + "%", v.style.backgroundColor = c, v.style.height = "100%", v.setAttribute("data-max", o), v.setAttribute("data-min", n);
  var y = document.createElement("div");
  if (y.style.position = "relative", y.style.width = "100%", y.style.height = "100%", u) {
    var L = document.createElement("div");
    L.style.position = "absolute", L.style.top = 0, L.style.left = 0, L.style.textAlign = a, L.style.width = "100%", L.style.color = p, L.innerHTML = u;
  }
  return t(function() {
    if (!(h instanceof ls)) {
      var _ = document.createElement("div");
      _.style.position = "absolute", _.style.top = "4px", _.style.bottom = "4px", _.style.left = "4px", _.style.right = "4px", s.appendChild(_), s = _;
    }
    s.appendChild(y), y.appendChild(v), u && y.appendChild(L);
  }), "";
}
function mn(h, e, t) {
  return h.getElement().style.backgroundColor = this.sanitizeHTML(h.getValue()), "";
}
function pn(h, e, t) {
  return '<svg enable-background="new 0 0 24 24" height="14" width="14" viewBox="0 0 24 24" xml:space="preserve" ><path fill="#2DC214" clip-rule="evenodd" d="M21.652,3.211c-0.293-0.295-0.77-0.295-1.061,0L9.41,14.34  c-0.293,0.297-0.771,0.297-1.062,0L3.449,9.351C3.304,9.203,3.114,9.13,2.923,9.129C2.73,9.128,2.534,9.201,2.387,9.351  l-2.165,1.946C0.078,11.445,0,11.63,0,11.823c0,0.194,0.078,0.397,0.223,0.544l4.94,5.184c0.292,0.296,0.771,0.776,1.062,1.07  l2.124,2.141c0.292,0.293,0.769,0.293,1.062,0l14.366-14.34c0.293-0.294,0.293-0.777,0-1.071L21.652,3.211z" fill-rule="evenodd"/></svg>';
}
function gn(h, e, t) {
  return '<svg enable-background="new 0 0 24 24" height="14" width="14" viewBox="0 0 24 24" xml:space="preserve" ><path fill="#CE1515" d="M22.245,4.015c0.313,0.313,0.313,0.826,0,1.139l-6.276,6.27c-0.313,0.312-0.313,0.826,0,1.14l6.273,6.272  c0.313,0.313,0.313,0.826,0,1.14l-2.285,2.277c-0.314,0.312-0.828,0.312-1.142,0l-6.271-6.271c-0.313-0.313-0.828-0.313-1.141,0  l-6.276,6.267c-0.313,0.313-0.828,0.313-1.141,0l-2.282-2.28c-0.313-0.313-0.313-0.826,0-1.14l6.278-6.269  c0.313-0.312,0.313-0.826,0-1.14L1.709,5.147c-0.314-0.313-0.314-0.827,0-1.14l2.284-2.278C4.308,1.417,4.821,1.417,5.135,1.73  L11.405,8c0.314,0.314,0.828,0.314,1.141,0.001l6.276-6.267c0.312-0.312,0.826-0.312,1.141,0L22.245,4.015z"/></svg>';
}
function bn(h, e, t) {
  var i = h.getValue(), s = e.size || 15, o = s + "px", n, a, r = e.hasOwnProperty("onValue") ? e.onValue : !0, d = e.hasOwnProperty("offValue") ? e.offValue : !1, c = e.onTruthy ? i : i === r;
  return n = document.createElement("div"), n.classList.add("tabulator-toggle"), c ? (n.classList.add("tabulator-toggle-on"), n.style.flexDirection = "row-reverse", e.onColor && (n.style.background = e.onColor)) : e.offColor && (n.style.background = e.offColor), n.style.width = 2.5 * s + "px", n.style.borderRadius = o, e.clickable && n.addEventListener("click", (u) => {
    h.setValue(c ? d : r);
  }), a = document.createElement("div"), a.classList.add("tabulator-toggle-switch"), a.style.height = o, a.style.width = o, a.style.borderRadius = o, n.appendChild(a), n;
}
function vn(h, e, t) {
  var i = document.createElement("span"), s = h.getRow(), o = h.getTable();
  return s.watchPosition((n) => {
    e.relativeToPage && (n += o.modules.page.getPageSize() * (o.modules.page.getPage() - 1)), i.innerText = n;
  }), i;
}
function yn(h, e, t) {
  return h.getElement().classList.add("tabulator-row-handle"), "<div class='tabulator-row-handle-box'><div class='tabulator-row-handle-bar'></div><div class='tabulator-row-handle-bar'></div><div class='tabulator-row-handle-bar'></div></div>";
}
function wn(h, e, t) {
  var i, s, o;
  function n(a) {
    var r = a.getValue(), d = "plaintext";
    switch (typeof r) {
      case "boolean":
        d = "tickCross";
        break;
      case "string":
        r.includes(`
`) && (d = "textarea");
        break;
    }
    return d;
  }
  return i = e.formatterLookup ? e.formatterLookup(h) : n(h), e.paramsLookup && (o = typeof e.paramsLookup == "function" ? e.paramsLookup(i, h) : e.paramsLookup[i]), s = this.table.modules.format.lookupFormatter(i), s.call(this, h, o || {}, t);
}
function Cn(h, e, t) {
  var i = e.delimiter || ",", s = h.getValue(), o = this.table, n;
  return e.valueMap && (typeof e.valueMap == "string" ? n = function(a) {
    return a.map((r) => ne.retrieveNestedData(o.options.nestedFieldSeparator, e.valueMap, r));
  } : n = e.valueMap), Array.isArray(s) ? (n && (s = n(s)), s.join(i)) : s;
}
function En(h, e, t) {
  var i = e.indent || "	", s = typeof e.multiline > "u" ? !0 : e.multiline, o = e.replacer || null, n = h.getValue();
  return s && (h.getElement().style.whiteSpace = "pre-wrap"), JSON.stringify(n, o, i);
}
var xn = {
  plaintext: en,
  html: tn,
  textarea: sn,
  money: on,
  link: nn,
  image: an,
  tickCross: rn,
  datetime: ln,
  datetimediff: hn,
  lookup: dn,
  star: cn,
  traffic: un,
  progress: fn,
  color: mn,
  buttonTick: pn,
  buttonCross: gn,
  toggle: bn,
  rownum: vn,
  handle: yn,
  adaptable: wn,
  array: Cn,
  json: En
};
const ct = class ct extends q {
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
        ct.formatters[e] ? t = ct.formatters[e] : (console.warn("Formatter Error - No such formatter found: ", e), t = ct.formatters.plaintext);
        break;
      case "function":
        t = e;
        break;
      default:
        t = ct.formatters.plaintext;
        break;
    }
    return t;
  }
  cellRendered(e) {
    e.modules.format && e.modules.format.renderedCallback && !e.modules.format.rendered && (e.modules.format.renderedCallback(), e.modules.format.rendered = !0);
  }
  //return a formatted value for a column header
  formatHeader(e, t, i) {
    var s, o, n, a;
    return e.definition.titleFormatter ? (s = this.lookupFormatter(e.definition.titleFormatter), n = (r) => {
      e.titleFormatterRendered = r;
    }, a = {
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
    }, o = e.definition.titleFormatterParams || {}, o = typeof o == "function" ? o() : o, s.call(this, a, o, n)) : t;
  }
  //return a formatted value for a cell
  formatValue(e) {
    var t = e.getComponent(), i = typeof e.column.modules.format.params == "function" ? e.column.modules.format.params(t) : e.column.modules.format.params;
    function s(o) {
      e.modules.format || (e.modules.format = {}), e.modules.format.renderedCallback = o, e.modules.format.rendered = !1;
    }
    return e.column.modules.format.formatter.call(this, t, i, s);
  }
  formatExportValue(e, t) {
    var i = e.column.modules.format[t], s;
    if (i) {
      let o = function(n) {
        e.modules.format || (e.modules.format = {}), e.modules.format.renderedCallback = n, e.modules.format.rendered = !1;
      };
      return s = typeof i.params == "function" ? i.params(e.getComponent()) : i.params, i.formatter.call(this, e.getComponent(), s, o);
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
O(ct, "moduleName", "format"), //load defaults
O(ct, "formatters", xn);
let xi = ct;
class us extends q {
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
    this.leftColumns.forEach((o, n) => {
      if (o.modules.frozen.marginValue = i, o.modules.frozen.margin = o.modules.frozen.marginValue + "px", o.visible && (i += o.getWidth()), n == this.leftColumns.length - 1 ? o.modules.frozen.edge = !0 : o.modules.frozen.edge = !1, o.parent.isGroup) {
        var a = this.getColGroupParentElement(o);
        t.includes(a) || (this.layoutElement(a, o), t.push(a)), a.classList.toggle("tabulator-frozen-left", o.modules.frozen.edge && o.modules.frozen.position === "left"), a.classList.toggle("tabulator-frozen-right", o.modules.frozen.edge && o.modules.frozen.position === "right");
      } else
        this.layoutElement(o.getElement(), o);
      e && o.cells.forEach((r) => {
        this.layoutElement(r.getElement(!0), o);
      });
    }), this.rightColumns.forEach((o, n) => {
      o.modules.frozen.marginValue = s, o.modules.frozen.margin = o.modules.frozen.marginValue + "px", o.visible && (s += o.getWidth()), n == this.rightColumns.length - 1 ? o.modules.frozen.edge = !0 : o.modules.frozen.edge = !1, o.parent.isGroup ? this.layoutElement(this.getColGroupParentElement(o), o) : this.layoutElement(o.getElement(), o), e && o.cells.forEach((a) => {
        this.layoutElement(a.getElement(!0), o);
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
O(us, "moduleName", "frozenColumns");
class fs extends q {
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
O(fs, "moduleName", "frozenRows");
class kn {
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
class xt {
  constructor(e, t, i, s, o, n, a) {
    this.groupManager = e, this.parent = t, this.key = s, this.level = i, this.field = o, this.hasSubGroups = i < e.groupIDLookups.length - 1, this.addRow = this.hasSubGroups ? this._addRowToGroup : this._addRow, this.type = "group", this.old = a, this.rows = [], this.groups = [], this.groupList = [], this.generator = n, this.element = !1, this.elementContents = !1, this.height = 0, this.outerHeight = 0, this.initialized = !1, this.calcs = {}, this.initialized = !1, this.modules = {}, this.arrowElement = !1, this.visible = a ? a.visible : typeof e.startOpen[i] < "u" ? e.startOpen[i] : e.startOpen[0], this.component = null, this.createElements(), this.addBindings(), this.createValueGroups();
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
    var i = t + "_" + e, s = new xt(this.groupManager, this, t, e, this.groupManager.groupIDLookups[t].field, this.groupManager.headerGenerator[t] || this.groupManager.headerGenerator[0], this.old ? this.old.groups[i] : !1);
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
    var o = this.rows.indexOf(t);
    o > -1 ? i ? this.rows.splice(o + 1, 0, e) : this.rows.splice(o, 0, e) : i ? this.rows.push(e) : this.rows.unshift(e), e.modules.group = this, this.groupManager.table.modExists("columnCalcs") && this.groupManager.table.options.columnCalcs != "table" && this.groupManager.table.modules.columnCalcs.recalcGroup(this), this.groupManager.updateGroupRows(!0);
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
          var o = s.getElement();
          e.parentNode.insertBefore(o, e.nextSibling), s.initialize(), e = o;
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
    this.initialized = !1, this.height = 0, ne.elVisible(this.element) && this.initialize(!0);
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
    return this.component || (this.component = new kn(this)), this.component;
  }
}
class ms extends q {
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
      }], this.langBind("groups|item", (o, n) => {
        this.headerGenerator[0] = (a, r, d) => (typeof a > "u" ? "" : a) + "<span>(" + r + " " + (r === 1 ? o : n.groups.items) + ")</span>";
      }), this.groupIDLookups = [], e)
        this.table.modExists("columnCalcs") && this.table.options.columnCalcs != "table" && this.table.options.columnCalcs != "both" && this.table.modules.columnCalcs.removeCalcs();
      else if (this.table.modExists("columnCalcs") && this.table.options.columnCalcs != "group") {
        var s = this.table.columnManager.getRealColumns();
        s.forEach((o) => {
          o.definition.topCalc && this.table.modules.columnCalcs.initializeTopRow(), o.definition.bottomCalc && this.table.modules.columnCalcs.initializeBottomRow();
        });
      }
      Array.isArray(e) || (e = [e]), e.forEach((o, n) => {
        var a, r;
        typeof o == "function" ? a = o : (r = this.table.columnManager.getColumnByField(o), r ? a = function(d) {
          return r.getFieldValue(d);
        } : a = function(d) {
          return d[o];
        }), this.groupIDLookups.push({
          field: typeof o == "function" ? !1 : o,
          func: a,
          values: this.allowedValues ? this.allowedValues[n] : !1
        });
      }), t && (Array.isArray(t) || (t = [t]), t.forEach((o) => {
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
      !i && t instanceof xt && (t = this.table.rowManager.prevDisplayRow(e) || t);
      var s = t instanceof xt ? t : t.modules.group, o = e instanceof xt ? e : e.modules.group;
      s === o ? this.table.rowManager.moveRowInArray(s.rows, e, t, i) : (o && o.removeRow(e), s.insertRow(e, t, i));
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
      var o = [];
      i.hasSubGroups ? (o = this.pullGroupListData(i.groupList), s.level = i.level, s.rowCount = o.length - i.groupList.length, s.headerContent = i.generator(i.key, s.rowCount, i.rows, i), t.push(s), t = t.concat(o)) : (s.level = i.level, s.headerContent = i.generator(i.key, i.rows.length, i.rows, i), s.rowCount = i.getRows().length, t.push(s), i.getRows().forEach((n) => {
        t.push(n.getData("data"));
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
    var s = t + "_" + e, o;
    i = i || [], o = new xt(this, !1, t, e, this.groupIDLookups[0].field, this.headerGenerator[0], i[s]), this.groups[s] = o, this.groupList.push(o);
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
      var t = e.modules.group, i = t.getPath(), s = this.getExpectedPath(e), o;
      o = i.length == s.length && i.every((n, a) => n === s[a]), o || (t.removeRow(e), this.assignRowToGroup(e, this.groups), this.refreshData(!0));
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
O(ms, "moduleName", "groupRows");
var Rn = {
  cellEdit: function(h) {
    h.component.setValueProcessData(h.data.oldValue), h.component.cellRendered();
  },
  rowAdd: function(h) {
    h.component.deleteActual(), this.table.rowManager.checkPlaceholder();
  },
  rowDelete: function(h) {
    var e = this.table.rowManager.addRowActual(h.data.data, h.data.pos, h.data.index);
    this.table.options.groupBy && this.table.modExists("groupRows") && this.table.modules.groupRows.updateGroupRows(!0), this._rebindRow(h.component, e), this.table.rowManager.checkPlaceholder();
  },
  rowMove: function(h) {
    var e = h.data.posFrom - h.data.posTo > 0;
    this.table.rowManager.moveRowActual(h.component, this.table.rowManager.getRowFromPosition(h.data.posFrom), e), this.table.rowManager.regenerateRowPositions(), this.table.rowManager.reRenderInPosition();
  }
}, Tn = {
  cellEdit: function(h) {
    h.component.setValueProcessData(h.data.newValue), h.component.cellRendered();
  },
  rowAdd: function(h) {
    var e = this.table.rowManager.addRowActual(h.data.data, h.data.pos, h.data.index);
    this.table.options.groupBy && this.table.modExists("groupRows") && this.table.modules.groupRows.updateGroupRows(!0), this._rebindRow(h.component, e), this.table.rowManager.checkPlaceholder();
  },
  rowDelete: function(h) {
    h.component.deleteActual(), this.table.rowManager.checkPlaceholder();
  },
  rowMove: function(h) {
    this.table.rowManager.moveRowActual(h.component, this.table.rowManager.getRowFromPosition(h.data.posTo), h.data.after), this.table.rowManager.regenerateRowPositions(), this.table.rowManager.reRenderInPosition();
  }
}, Sn = {
  undo: ["ctrl + 90", "meta + 90"],
  redo: ["ctrl + 89", "meta + 89"]
}, _n = {
  undo: function(h) {
    var e = !1;
    this.table.options.history && this.table.modExists("history") && this.table.modExists("edit") && (e = this.table.modules.edit.currentCell, e || (h.preventDefault(), this.table.modules.history.undo()));
  },
  redo: function(h) {
    var e = !1;
    this.table.options.history && this.table.modExists("history") && this.table.modExists("edit") && (e = this.table.modules.edit.currentCell, e || (h.preventDefault(), this.table.modules.history.redo()));
  }
}, Ln = {
  keybindings: {
    bindings: Sn,
    actions: _n
  }
};
const ut = class ut extends q {
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
      return ut.undoers[e.type].call(this, e), this.index--, this.dispatchExternal("historyUndo", e.type, e.component.getComponent(), e.data), !0;
    } else
      return console.warn(this.options("history") ? "History Undo Error - No more history to undo" : "History module not enabled"), !1;
  }
  redo() {
    if (this.history.length - 1 > this.index) {
      this.index++;
      let e = this.history[this.index];
      return ut.redoers[e.type].call(this, e), this.dispatchExternal("historyRedo", e.type, e.component.getComponent(), e.data), !0;
    } else
      return console.warn(this.options("history") ? "History Redo Error - No more history to redo" : "History module not enabled"), !1;
  }
  //rebind rows to new element after deletion
  _rebindRow(e, t) {
    this.history.forEach(function(i) {
      if (i.component instanceof ye)
        i.component === e && (i.component = t);
      else if (i.component instanceof Wt && i.component.row === e) {
        var s = i.component.column.getField();
        s && (i.component = t.getCell(s));
      }
    });
  }
};
O(ut, "moduleName", "history"), O(ut, "moduleExtensions", Ln), //load defaults
O(ut, "undoers", Rn), O(ut, "redoers", Tn);
let ki = ut;
class ps extends q {
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
    var e = this.table.originalElement, t = this.table.options, i = e.getElementsByTagName("th"), s = e.getElementsByTagName("tbody")[0], o = [];
    this.hasIndex = !1, this.dispatchExternal("htmlImporting"), s = s ? s.getElementsByTagName("tr") : [], this._extractOptions(e, t), i.length ? this._extractHeaders(i, s) : this._generateBlankHeaders(i, s);
    for (var n = 0; n < s.length; n++) {
      var a = s[n], r = a.getElementsByTagName("td"), d = {};
      this.hasIndex || (d[t.index] = n);
      for (var c = 0; c < r.length; c++) {
        var u = r[c];
        typeof this.fieldIndex[c] < "u" && (d[this.fieldIndex[c]] = u.innerHTML);
      }
      o.push(d);
    }
    t.data = o, this.dispatchExternal("htmlImported");
  }
  //extract tabulator attribute options
  _extractOptions(e, t, i) {
    var s = e.attributes, o = Object.keys(i || t), n = {};
    o.forEach((c) => {
      n[c.toLowerCase()] = c;
    });
    for (var a in s) {
      var r = s[a], d;
      r && typeof r == "object" && r.name && r.name.indexOf("tabulator-") === 0 && (d = r.name.replace("tabulator-", ""), typeof n[d] < "u" && (t[n[d]] = this._attribValue(r.value)));
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
      var s = e[i], o = !1, n = this._findCol(s.textContent), a;
      n ? o = !0 : n = { title: s.textContent.trim() }, n.field || (n.field = s.textContent.trim().toLowerCase().replaceAll(" ", "_")), a = s.getAttribute("width"), a && !n.width && (n.width = a), this._extractOptions(s, n, this.table.columnManager.optionsList.registeredDefaults), this.fieldIndex[i] = n.field, n.field == this.table.options.index && (this.hasIndex = !0), o || this.table.options.columns.push(n);
    }
  }
  //generate blank headers
  _generateBlankHeaders(e, t) {
    for (var i = 0; i < e.length; i++) {
      var s = e[i], o = { title: "", field: "col" + i };
      this.fieldIndex[i] = o.field;
      var n = s.getAttribute("width");
      n && (o.width = n), this.table.options.columns.push(o);
    }
  }
}
O(ps, "moduleName", "htmlTableImport");
function Dn(h) {
  var e = [], t = 0, i = 0, s = !1;
  for (let o = 0; o < h.length; o++) {
    let n = h[o], a = h[o + 1];
    if (e[t] || (e[t] = []), e[t][i] || (e[t][i] = ""), n == '"' && s && a == '"') {
      e[t][i] += n, o++;
      continue;
    }
    if (n == '"') {
      s = !s;
      continue;
    }
    if (n == "," && !s) {
      i++;
      continue;
    }
    if (n == "\r" && a == `
` && !s) {
      i = 0, t++, o++;
      continue;
    }
    if ((n == "\r" || n == `
`) && !s) {
      i = 0, t++;
      continue;
    }
    e[t][i] += n;
  }
  return e;
}
function Fn(h) {
  try {
    return JSON.parse(h);
  } catch (e) {
    return console.warn("JSON Import Error - File contents is invalid JSON", e), Promise.reject();
  }
}
function Mn(h) {
  return h;
}
function Pn(h) {
  var e = this.dependencyRegistry.lookup("XLSX"), t = e.read(h), i = t.Sheets[t.SheetNames[0]];
  return e.utils.sheet_to_json(i, { header: 1 });
}
var zn = {
  csv: Dn,
  json: Fn,
  array: Mn,
  xlsx: Pn
};
const $t = class $t extends q {
  constructor(e) {
    super(e), this.registerTableOption("importFormat"), this.registerTableOption("importReader", "text"), this.registerTableOption("importHeaderTransform"), this.registerTableOption("importValueTransform"), this.registerTableOption("importDataValidator"), this.registerTableOption("importFileValidator");
  }
  initialize() {
    this.registerTableFunction("import", this.importFromFile.bind(this)), this.table.options.importFormat && (this.subscribe("data-loading", this.loadDataCheck.bind(this), 10), this.subscribe("data-load", this.loadData.bind(this), 10));
  }
  loadDataCheck(e) {
    return this.table.options.importFormat && (typeof e == "string" || Array.isArray(e) && e.length && Array.isArray(e));
  }
  loadData(e, t, i, s, o) {
    return this.importData(this.lookupImporter(), e).then(this.structureData.bind(this)).catch((n) => (console.error("Import Error:", n || "Unable to import data"), Promise.reject(n)));
  }
  lookupImporter(e) {
    var t;
    return e || (e = this.table.options.importFormat), typeof e == "string" ? t = $t.importers[e] : t = e, t || console.error("Import Error - Importer not found:", e), t;
  }
  importFromFile(e, t, i) {
    var s = this.lookupImporter(e);
    if (s)
      return this.pickFile(t, i).then(this.importData.bind(this, s)).then(this.structureData.bind(this)).then(this.mutateData.bind(this)).then(this.validateData.bind(this)).then(this.setData.bind(this)).catch((o) => (this.dispatch("import-error", o), this.dispatchExternal("importError", o), console.error("Import Error:", o || "Unable to import file"), this.table.dataLoader.alertError(), setTimeout(() => {
        this.table.dataLoader.clearAlert();
      }, 3e3), Promise.reject(o)));
  }
  pickFile(e, t) {
    return new Promise((i, s) => {
      var o = document.createElement("input");
      o.type = "file", o.accept = e, o.addEventListener("change", (n) => {
        var a = o.files[0], r = new FileReader(), d = this.validateFile(a);
        if (d === !0) {
          switch (this.dispatch("import-importing", o.files), this.dispatchExternal("importImporting", o.files), t || this.table.options.importReader) {
            case "buffer":
              r.readAsArrayBuffer(a);
              break;
            case "binary":
              r.readAsBinaryString(a);
              break;
            case "url":
              r.readAsDataURL(a);
              break;
            case "text":
            default:
              r.readAsText(a);
          }
          r.onload = (c) => {
            i(r.result);
          }, r.onerror = (c) => {
            console.warn("File Load Error - Unable to read file"), s(c);
          };
        } else
          s(d);
      }), this.dispatch("import-choose"), this.dispatchExternal("importChoose"), o.click();
    });
  }
  importData(e, t) {
    var i;
    return this.table.dataLoader.alertLoader(), new Promise((s, o) => {
      setTimeout(() => {
        i = e.call(this.table, t), i instanceof Promise || i ? s(i) : o();
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
      var o = {};
      return s = this.transformData(s), t.forEach((n, a) => {
        o[n] = s[a];
      }), o;
    });
    return i;
  }
  structureArrayToColumns(e) {
    var t = [], i = this.transformHeader(e[0]), s = this.table.getColumns();
    return s[0] && i[0] && s[0].getDefinition().title === i[0] && e.shift(), e.forEach((o) => {
      var n = {};
      o = this.transformData(o), o.forEach((a, r) => {
        var d = s[r];
        d && (n[d.getField()] = a);
      }), t.push(n);
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
O($t, "moduleName", "import"), //load defaults
O($t, "importers", zn);
let Ri = $t;
class gs extends q {
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
    var o = this.touchWatchers[e];
    switch (e === "column" && (e = "header"), t) {
      case "start":
        o.tap = !0, clearTimeout(o.tapHold), o.tapHold = setTimeout(() => {
          clearTimeout(o.tapHold), o.tapHold = null, o.tap = null, clearTimeout(o.tapDbl), o.tapDbl = null, this.dispatchEvent(e + "TapHold", i, s);
        }, 1e3);
        break;
      case "end":
        o.tap && (o.tap = null, this.dispatchEvent(e + "Tap", i, s)), o.tapDbl ? (clearTimeout(o.tapDbl), o.tapDbl = null, this.dispatchEvent(e + "DblTap", i, s)) : o.tapDbl = setTimeout(() => {
          clearTimeout(o.tapDbl), o.tapDbl = null;
        }, 300), clearTimeout(o.tapHold), o.tapHold = null;
        break;
    }
  }
  dispatchEvent(e, t, i) {
    var s = i.getComponent(), o;
    this.columnSubscribers[e] && (i instanceof Wt ? o = i.column.definition[e] : i instanceof Ct && (o = i.definition[e]), o && o(t, s)), this.dispatchExternal(e, t, s);
  }
}
O(gs, "moduleName", "interaction");
var An = {
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
}, On = {
  keyBlock: function(h) {
    h.stopPropagation(), h.preventDefault();
  },
  scrollPageUp: function(h) {
    var e = this.table.rowManager, t = e.scrollTop - e.element.clientHeight;
    h.preventDefault(), e.displayRowsCount && (t >= 0 ? e.element.scrollTop = t : e.scrollToRow(e.getDisplayRows()[0])), this.table.element.focus();
  },
  scrollPageDown: function(h) {
    var e = this.table.rowManager, t = e.scrollTop + e.element.clientHeight, i = e.element.scrollHeight;
    h.preventDefault(), e.displayRowsCount && (t <= i ? e.element.scrollTop = t : e.scrollToRow(e.getDisplayRows()[e.displayRowsCount - 1])), this.table.element.focus();
  },
  scrollToStart: function(h) {
    var e = this.table.rowManager;
    h.preventDefault(), e.displayRowsCount && e.scrollToRow(e.getDisplayRows()[0]), this.table.element.focus();
  },
  scrollToEnd: function(h) {
    var e = this.table.rowManager;
    h.preventDefault(), e.displayRowsCount && e.scrollToRow(e.getDisplayRows()[e.displayRowsCount - 1]), this.table.element.focus();
  },
  navPrev: function(h) {
    this.dispatch("keybinding-nav-prev", h);
  },
  navNext: function(h) {
    this.dispatch("keybinding-nav-next", h);
  },
  navLeft: function(h) {
    this.dispatch("keybinding-nav-left", h);
  },
  navRight: function(h) {
    this.dispatch("keybinding-nav-right", h);
  },
  navUp: function(h) {
    this.dispatch("keybinding-nav-up", h);
  },
  navDown: function(h) {
    this.dispatch("keybinding-nav-down", h);
  }
};
const ft = class ft extends q {
  constructor(e) {
    super(e), this.watchKeys = null, this.pressedKeys = null, this.keyupBinding = !1, this.keydownBinding = !1, this.registerTableOption("keybindings", {}), this.registerTableOption("tabEndNewRow", !1);
  }
  initialize() {
    var e = this.table.options.keybindings, t = {};
    this.watchKeys = {}, this.pressedKeys = [], e !== !1 && (Object.assign(t, ft.bindings), Object.assign(t, e), this.mapBindings(t), this.bindEvents()), this.subscribe("table-destroy", this.clearBindings.bind(this));
  }
  mapBindings(e) {
    for (let t in e)
      ft.actions[t] ? e[t] && (typeof e[t] != "object" && (e[t] = [e[t]]), e[t].forEach((i) => {
        var s = Array.isArray(i) ? i : [i];
        s.forEach((o) => {
          this.mapBinding(t, o);
        });
      })) : console.warn("Key Binding Error - no such action:", t);
  }
  mapBinding(e, t) {
    var i = {
      action: ft.actions[e],
      keys: [],
      ctrl: !1,
      shift: !1,
      meta: !1
    }, s = t.toString().toLowerCase().split(" ").join("").split("+");
    s.forEach((o) => {
      switch (o) {
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
          o = isNaN(o) ? o.toUpperCase().charCodeAt(0) : parseInt(o), i.keys.push(o), this.watchKeys[o] || (this.watchKeys[o] = []), this.watchKeys[o].push(i);
      }
    });
  }
  bindEvents() {
    var e = this;
    this.keyupBinding = function(t) {
      var i = t.keyCode, s = e.watchKeys[i];
      s && (e.pressedKeys.push(i), s.forEach(function(o) {
        e.checkBinding(t, o);
      }));
    }, this.keydownBinding = function(t) {
      var i = t.keyCode, s = e.watchKeys[i];
      if (s) {
        var o = e.pressedKeys.indexOf(i);
        o > -1 && e.pressedKeys.splice(o, 1);
      }
    }, this.table.element.addEventListener("keydown", this.keyupBinding), this.table.element.addEventListener("keyup", this.keydownBinding);
  }
  clearBindings() {
    this.keyupBinding && this.table.element.removeEventListener("keydown", this.keyupBinding), this.keydownBinding && this.table.element.removeEventListener("keyup", this.keydownBinding);
  }
  checkBinding(e, t) {
    var i = !0;
    return e.ctrlKey == t.ctrl && e.shiftKey == t.shift && e.metaKey == t.meta ? (t.keys.forEach((s) => {
      var o = this.pressedKeys.indexOf(s);
      o == -1 && (i = !1);
    }), i && t.action.call(this, e), !0) : !1;
  }
};
O(ft, "moduleName", "keybindings"), //load defaults
O(ft, "bindings", An), O(ft, "actions", On);
let Ti = ft;
class bs extends q {
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
  loadMenu(e, t, i, s, o) {
    var n = !(e instanceof MouseEvent), a = document.createElement("div"), r;
    if (a.classList.add("tabulator-menu"), n || e.preventDefault(), !(!i || !i.length)) {
      if (s)
        r = o.child(a);
      else {
        if (this.nestedMenuBlock) {
          if (this.rootPopup)
            return;
        } else
          this.nestedMenuBlock = setTimeout(() => {
            this.nestedMenuBlock = !1;
          }, 100);
        this.rootPopup && this.rootPopup.hide(), this.rootPopup = r = this.popup(a);
      }
      i.forEach((d) => {
        var c = document.createElement("div"), u = d.label, p = d.disabled;
        d.separator ? c.classList.add("tabulator-menu-separator") : (c.classList.add("tabulator-menu-item"), typeof u == "function" && (u = u.call(this.table, t.getComponent())), u instanceof Node ? c.appendChild(u) : c.innerHTML = u, typeof p == "function" && (p = p.call(this.table, t.getComponent())), p ? (c.classList.add("tabulator-menu-item-disabled"), c.addEventListener("click", (v) => {
          v.stopPropagation();
        })) : d.menu && d.menu.length ? c.addEventListener("click", (v) => {
          v.stopPropagation(), this.loadMenu(v, t, d.menu, c, r);
        }) : d.action && c.addEventListener("click", (v) => {
          d.action(v, t.getComponent());
        }), d.menu && d.menu.length && c.classList.add("tabulator-menu-item-submenu")), a.appendChild(c);
      }), a.addEventListener("click", (d) => {
        this.rootPopup && this.rootPopup.hide();
      }), r.show(s || e), r === this.rootPopup && (this.rootPopup.hideOnBlur(() => {
        this.rootPopup = null, this.currentComponent && (this.dispatch("menu-closed", i, r), this.dispatchExternal("menuClosed", this.currentComponent.getComponent()), this.currentComponent = null);
      }), this.currentComponent = t, this.dispatch("menu-opened", i, r), this.dispatchExternal("menuOpened", t.getComponent()));
    }
  }
}
O(bs, "moduleName", "menu");
class vs extends q {
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
    !e.modules.frozen && !e.isGroup && !e.isRowHeader && (s = e.getElement(), i.mousemove = (function(o) {
      e.parent === t.moving.parent && ((t.touchMove ? o.touches[0].pageX : o.pageX) - ne.elOffset(s).left + t.table.columnManager.contentsElement.scrollLeft > e.getWidth() / 2 ? (t.toCol !== e || !t.toColAfter) && (s.parentNode.insertBefore(t.placeholderElement, s.nextSibling), t.moveColumn(e, !0)) : (t.toCol !== e || t.toColAfter) && (s.parentNode.insertBefore(t.placeholderElement, s), t.moveColumn(e, !1)));
    }).bind(t), s.addEventListener("mousedown", function(o) {
      t.touchMove = !1, o.which === 1 && (t.checkTimeout = setTimeout(function() {
        t.startMove(o, e);
      }, t.checkPeriod));
    }), s.addEventListener("mouseup", function(o) {
      o.which === 1 && t.checkTimeout && clearTimeout(t.checkTimeout);
    }), t.bindTouchEvents(e)), e.modules.moveColumn = i;
  }
  bindTouchEvents(e) {
    var t = e.getElement(), i = !1, s, o, n, a, r, d;
    t.addEventListener("touchstart", (c) => {
      this.checkTimeout = setTimeout(() => {
        this.touchMove = !0, s = e.nextColumn(), n = s ? s.getWidth() / 2 : 0, o = e.prevColumn(), a = o ? o.getWidth() / 2 : 0, r = 0, d = 0, i = !1, this.startMove(c, e);
      }, this.checkPeriod);
    }, { passive: !0 }), t.addEventListener("touchmove", (c) => {
      var u, p;
      this.moving && (this.moveHover(c), i || (i = c.touches[0].pageX), u = c.touches[0].pageX - i, u > 0 ? s && u - r > n && (p = s, p !== e && (i = c.touches[0].pageX, p.getElement().parentNode.insertBefore(this.placeholderElement, p.getElement().nextSibling), this.moveColumn(p, !0))) : o && -u - d > a && (p = o, p !== e && (i = c.touches[0].pageX, p.getElement().parentNode.insertBefore(this.placeholderElement, p.getElement()), this.moveColumn(p, !1))), p && (s = p.nextColumn(), r = n, n = s ? s.getWidth() / 2 : 0, o = p.prevColumn(), d = a, a = o ? o.getWidth() / 2 : 0));
    }, { passive: !0 }), t.addEventListener("touchend", (c) => {
      this.checkTimeout && clearTimeout(this.checkTimeout), this.moving && this.endMove(c);
    });
  }
  startMove(e, t) {
    var i = t.getElement(), s = this.table.columnManager.getContentsElement(), o = this.table.columnManager.getHeadersElement();
    this.table.modules.selectRange && this.table.modules.selectRange.columnSelection && this.table.modules.selectRange.mousedown && this.table.modules.selectRange.selecting === "column" || (this.moving = t, this.startX = (this.touchMove ? e.touches[0].pageX : e.pageX) - ne.elOffset(i).left, this.table.element.classList.add("tabulator-block-select"), this.placeholderElement.style.width = t.getWidth() + "px", this.placeholderElement.style.height = t.getHeight() + "px", i.parentNode.insertBefore(this.placeholderElement, i), i.parentNode.removeChild(i), this.hoverElement = i.cloneNode(!0), this.hoverElement.classList.add("tabulator-moving"), s.appendChild(this.hoverElement), this.hoverElement.style.left = "0", this.hoverElement.style.bottom = s.clientHeight - o.offsetHeight + "px", this.touchMove || (this._bindMouseMove(), document.body.addEventListener("mousemove", this.moveHover), document.body.addEventListener("mouseup", this.endMove)), this.moveHover(e), this.dispatch("column-moving", e, this.moving));
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
    this.toCol = e, this.toColAfter = t, t ? e.getCells().forEach(function(s, o) {
      var n = s.getElement(!0);
      n.parentNode && i[o] && n.parentNode.insertBefore(i[o].getElement(), n.nextSibling);
    }) : e.getCells().forEach(function(s, o) {
      var n = s.getElement(!0);
      n.parentNode && i[o] && n.parentNode.insertBefore(i[o].getElement(), n);
    });
  }
  endMove(e) {
    (e.which === 1 || this.touchMove) && (this._unbindMouseMove(), this.placeholderElement.parentNode.insertBefore(this.moving.getElement(), this.placeholderElement.nextSibling), this.placeholderElement.parentNode.removeChild(this.placeholderElement), this.hoverElement.parentNode.removeChild(this.hoverElement), this.table.element.classList.remove("tabulator-block-select"), this.toCol && this.table.columnManager.moveColumnActual(this.moving, this.toCol, this.toColAfter), this.moving = !1, this.toCol = !1, this.toColAfter = !1, this.touchMove || (document.body.removeEventListener("mousemove", this.moveHover), document.body.removeEventListener("mouseup", this.endMove)));
  }
  moveHover(e) {
    var t = this.table.columnManager.getContentsElement(), i = t.scrollLeft, s = (this.touchMove ? e.touches[0].pageX : e.pageX) - ne.elOffset(t).left + i, o;
    this.hoverElement.style.left = s - this.startX + "px", s - i < this.autoScrollMargin && (this.autoScrollTimeout || (this.autoScrollTimeout = setTimeout(() => {
      o = Math.max(0, i - 5), this.table.rowManager.getElement().scrollLeft = o, this.autoScrollTimeout = !1;
    }, 1))), i + t.clientWidth - s < this.autoScrollMargin && (this.autoScrollTimeout || (this.autoScrollTimeout = setTimeout(() => {
      o = Math.min(t.clientWidth, i + 5), this.table.rowManager.getElement().scrollLeft = o, this.autoScrollTimeout = !1;
    }, 1)));
  }
}
O(vs, "moduleName", "moveColumn");
var Hn = {
  delete: function(h, e, t) {
    h.delete();
  }
}, $n = {
  insert: function(h, e, t) {
    return this.table.addRow(h.getData(), void 0, e), !0;
  },
  add: function(h, e, t) {
    return this.table.addRow(h.getData()), !0;
  },
  update: function(h, e, t) {
    return e ? (e.update(h.getData()), !0) : !1;
  },
  replace: function(h, e, t) {
    return e ? (this.table.addRow(h.getData(), void 0, e), e.delete(), !0) : !1;
  }
};
const yt = class yt extends q {
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
      var o;
      s.pageY - ne.elOffset(e.element).top + t.table.rowManager.element.scrollTop > e.getHeight() / 2 ? (t.toRow !== e || !t.toRowAfter) && (o = e.getElement(), o.parentNode.insertBefore(t.placeholderElement, o.nextSibling), t.moveRow(e, !0)) : (t.toRow !== e || t.toRowAfter) && (o = e.getElement(), o.previousSibling && (o.parentNode.insertBefore(t.placeholderElement, o), t.moveRow(e, !1)));
    }).bind(t), e.modules.moveRow = i;
  }
  initializeRow(e) {
    var t = this, i = {}, s;
    i.mouseup = (function(o) {
      t.tableRowDrop(o, e);
    }).bind(t), i.mousemove = (function(o) {
      var n = e.getElement();
      o.pageY - ne.elOffset(n).top + t.table.rowManager.element.scrollTop > e.getHeight() / 2 ? (t.toRow !== e || !t.toRowAfter) && (n.parentNode.insertBefore(t.placeholderElement, n.nextSibling), t.moveRow(e, !0)) : (t.toRow !== e || t.toRowAfter) && (n.parentNode.insertBefore(t.placeholderElement, n), t.moveRow(e, !1));
    }).bind(t), this.hasHandle || (s = e.getElement(), s.addEventListener("mousedown", function(o) {
      o.which === 1 && (t.checkTimeout = setTimeout(function() {
        t.startMove(o, e);
      }, t.checkPeriod));
    }), s.addEventListener("mouseup", function(o) {
      o.which === 1 && t.checkTimeout && clearTimeout(t.checkTimeout);
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
    var i = !1, s, o, n, a, r, d;
    t.addEventListener("touchstart", (c) => {
      this.checkTimeout = setTimeout(() => {
        this.touchMove = !0, s = e.nextRow(), n = s ? s.getHeight() / 2 : 0, o = e.prevRow(), a = o ? o.getHeight() / 2 : 0, r = 0, d = 0, i = !1, this.startMove(c, e);
      }, this.checkPeriod);
    }, { passive: !0 }), this.moving, this.toRow, this.toRowAfter, t.addEventListener("touchmove", (c) => {
      var u, p;
      this.moving && (c.preventDefault(), this.moveHover(c), i || (i = c.touches[0].pageY), u = c.touches[0].pageY - i, u > 0 ? s && u - r > n && (p = s, p !== e && (i = c.touches[0].pageY, p.getElement().parentNode.insertBefore(this.placeholderElement, p.getElement().nextSibling), this.moveRow(p, !0))) : o && -u - d > a && (p = o, p !== e && (i = c.touches[0].pageY, p.getElement().parentNode.insertBefore(this.placeholderElement, p.getElement()), this.moveRow(p, !1))), p && (s = p.nextRow(), r = n, n = s ? s.getHeight() / 2 : 0, o = p.prevRow(), d = a, a = o ? o.getHeight() / 2 : 0));
    }), t.addEventListener("touchend", (c) => {
      this.checkTimeout && clearTimeout(this.checkTimeout), this.moving && (this.endMove(c), this.touchMove = !1);
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
    var i = this.touchMove ? e.touches[0].pageX : e.pageX, s = this.touchMove ? e.touches[0].pageY : e.pageY, o, n;
    o = t.getElement(), this.connection ? (n = o.getBoundingClientRect(), this.startX = n.left - i + window.pageXOffset, this.startY = n.top - s + window.pageYOffset) : this.startY = s - o.getBoundingClientRect().top;
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
      var s = (o) => {
        this.elementRowDrop(o, i, this.moving);
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
          s = yt.senders[this.table.options.movableRowsSender];
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
        i = yt.receivers[this.table.options.movableRowsReceiver];
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
O(yt, "moduleName", "moveRow"), //load defaults
O(yt, "senders", Hn), O(yt, "receivers", $n);
let Si = yt;
var Bn = {};
const Tt = class Tt extends q {
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
      var o = "mutator" + (s.charAt(0).toUpperCase() + s.slice(1)), n;
      e.definition[o] && (n = this.lookupMutator(e.definition[o]), n && (t = !0, i[o] = {
        mutator: n,
        params: e.definition[o + "Params"] || {}
      }));
    }), t && (e.modules.mutate = i);
  }
  lookupMutator(e) {
    var t = !1;
    switch (typeof e) {
      case "string":
        Tt.mutators[e] ? t = Tt.mutators[e] : console.warn("Mutator Error - No such mutator found, ignoring: ", e);
        break;
      case "function":
        t = e;
        break;
    }
    return t;
  }
  //apply mutator to row
  transformRow(e, t, i) {
    var s = "mutator" + (t.charAt(0).toUpperCase() + t.slice(1)), o;
    return this.enabled && this.table.columnManager.traverse((n) => {
      var a, r, d;
      n.modules.mutate && (a = n.modules.mutate[s] || n.modules.mutate.mutator || !1, a && (o = n.getFieldValue(typeof i < "u" ? i : e), (t == "data" && !i || typeof o < "u") && (d = n.getComponent(), r = typeof a.params == "function" ? a.params(o, e, t, d) : a.params, n.setFieldValue(e, a.mutator(o, e, t, r, d)))));
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
O(Tt, "moduleName", "mutator"), //load defaults
O(Tt, "mutators", Bn);
let _i = Tt;
function Nn(h, e, t, i, s) {
  var o = document.createElement("span"), n = document.createElement("span"), a = document.createElement("span"), r = document.createElement("span"), d = document.createElement("span"), c = document.createElement("span");
  return this.table.modules.localize.langBind("pagination|counter|showing", (u) => {
    n.innerHTML = u;
  }), this.table.modules.localize.langBind("pagination|counter|of", (u) => {
    r.innerHTML = u;
  }), this.table.modules.localize.langBind("pagination|counter|rows", (u) => {
    c.innerHTML = u;
  }), i ? (a.innerHTML = " " + e + "-" + Math.min(e + h - 1, i) + " ", d.innerHTML = " " + i + " ", o.appendChild(n), o.appendChild(a), o.appendChild(r), o.appendChild(d), o.appendChild(c)) : (a.innerHTML = " 0 ", o.appendChild(n), o.appendChild(a), o.appendChild(c)), o;
}
function Vn(h, e, t, i, s) {
  var o = document.createElement("span"), n = document.createElement("span"), a = document.createElement("span"), r = document.createElement("span"), d = document.createElement("span"), c = document.createElement("span");
  return this.table.modules.localize.langBind("pagination|counter|showing", (u) => {
    n.innerHTML = u;
  }), a.innerHTML = " " + t + " ", this.table.modules.localize.langBind("pagination|counter|of", (u) => {
    r.innerHTML = u;
  }), d.innerHTML = " " + s + " ", this.table.modules.localize.langBind("pagination|counter|pages", (u) => {
    c.innerHTML = u;
  }), o.appendChild(n), o.appendChild(a), o.appendChild(r), o.appendChild(d), o.appendChild(c), o;
}
var In = {
  rows: Nn,
  pages: Vn
};
const Bt = class Bt extends q {
  constructor(e) {
    super(e), this.mode = "local", this.progressiveLoad = !1, this.element = null, this.pageCounterElement = null, this.pageCounter = null, this.size = 0, this.page = 1, this.count = 5, this.max = 1, this.remoteRowCountEstimate = null, this.initialLoad = !0, this.dataChanging = !1, this.pageSizes = [], this.registerTableOption("pagination", !1), this.registerTableOption("paginationMode", "local"), this.registerTableOption("paginationSize", !1), this.registerTableOption("paginationInitialPage", 1), this.registerTableOption("paginationCounter", !1), this.registerTableOption("paginationCounterElement", !1), this.registerTableOption("paginationButtonCount", 5), this.registerTableOption("paginationSizeSelector", !1), this.registerTableOption("paginationElement", !1), this.registerTableOption("paginationAddRow", "page"), this.registerTableOption("paginationOutOfRange", !1), this.registerTableOption("progressiveLoad", !1), this.registerTableOption("progressiveLoadDelay", 0), this.registerTableOption("progressiveLoadScrollMargin", 0), this.registerTableFunction("setMaxPage", this.setMaxPage.bind(this)), this.registerTableFunction("setPage", this.setPage.bind(this)), this.registerTableFunction("setPageToRow", this.userSetPageToRow.bind(this)), this.registerTableFunction("setPageSize", this.userSetPageSize.bind(this)), this.registerTableFunction("getPageSize", this.getPageSize.bind(this)), this.registerTableFunction("previousPage", this.previousPage.bind(this)), this.registerTableFunction("nextPage", this.nextPage.bind(this)), this.registerTableFunction("getPage", this.getPage.bind(this)), this.registerTableFunction("getPageMax", this.getPageMax.bind(this)), this.registerComponentFunction("row", "pageTo", this.setPageToRow.bind(this));
  }
  initialize() {
    this.table.options.pagination ? (this.subscribe("row-deleted", this.rowsUpdated.bind(this)), this.subscribe("row-added", this.rowsUpdated.bind(this)), this.subscribe("data-processed", this.initialLoadComplete.bind(this)), this.subscribe("table-built", this.calculatePageSizes.bind(this)), this.subscribe("footer-redraw", this.footerRedraw.bind(this)), this.table.options.paginationAddRow == "page" && this.subscribe("row-adding-position", this.rowAddingPosition.bind(this)), this.table.options.paginationMode === "remote" && (this.subscribe("data-params", this.remotePageParams.bind(this)), this.subscribe("data-loaded", this._parseRemoteData.bind(this))), this.table.options.progressiveLoad && console.error("Progressive Load Error - Pagination and progressive load cannot be used at the same time"), this.registerDisplayHandler(this.restOnRenderBefore.bind(this), 40), this.registerDisplayHandler(this.getRows.bind(this), 50), this.createElements(), this.initializePageCounter(), this.initializePaginator()) : this.table.options.progressiveLoad && (this.subscribe("data-params", this.remotePageParams.bind(this)), this.subscribe("data-loaded", this._parseRemoteData.bind(this)), this.subscribe("table-built", this.calculatePageSizes.bind(this)), this.subscribe("data-processed", this.initialLoadComplete.bind(this)), this.initializeProgressive(this.table.options.progressiveLoad), this.table.options.progressiveLoad === "scroll" && this.subscribe("scroll-vertical", this.scrollVertical.bind(this)));
  }
  rowAddingPosition(e, t) {
    var i = this.table.rowManager, s = i.getDisplayRows(), o;
    return t ? s.length ? o = s[0] : i.activeRows.length && (o = i.activeRows[i.activeRows.length - 1], t = !1) : s.length && (o = s[s.length - 1], t = !(s.length < this.size)), { index: o, top: t };
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
    var i, s, o;
    !t && !this.table.dataLoader.loading && (i = this.table.rowManager.getElement(), s = i.scrollHeight - i.clientHeight - e, o = this.table.options.progressiveLoadScrollMargin || i.clientHeight * 2, s < o && this.nextPage().catch(() => {
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
    e && (typeof e == "function" ? t = e : t = Bt.pageCounters[e], t ? (this.pageCounter = t, this.pageCounterElement = document.createElement("span"), this.pageCounterElement.classList.add("tabulator-page-counter")) : console.warn("Pagination Error - No such page counter found: ", e));
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
    for (let o = i; o <= s; o++)
      o > 0 && o <= this.max && this.pagesElement.appendChild(this._generatePageButton(o));
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
    var t = 0, i, s, o, n, a = e.filter((r) => r.type === "row");
    if (this.mode == "local") {
      i = [], this.setMaxRows(e.length), this.size === !0 ? (s = 0, o = e.length) : (s = this.size * (this.page - 1), o = s + parseInt(this.size)), this._setPageButtons();
      for (let r = s; r < o; r++) {
        let d = e[r];
        d && (i.push(d), d.type === "row" && (n || (n = d), t++));
      }
      return this._setPageCounter(a.length, t, n ? a.indexOf(n) + 1 : 0), i;
    } else
      return this._setPageButtons(), this._setPageCounter(a.length), e.slice(0);
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
O(Bt, "moduleName", "page"), //load defaults
O(Bt, "pageCounters", In);
let Li = Bt;
var Wn = {
  local: function(h, e) {
    var t = localStorage.getItem(h + "-" + e);
    return t ? JSON.parse(t) : !1;
  },
  cookie: function(h, e) {
    var t = document.cookie, i = h + "-" + e, s = t.indexOf(i + "="), o, n;
    return s > -1 && (t = t.slice(s), o = t.indexOf(";"), o > -1 && (t = t.slice(0, o)), n = t.replace(i + "=", "")), n ? JSON.parse(n) : !1;
  }
}, Gn = {
  local: function(h, e, t) {
    localStorage.setItem(h + "-" + e, JSON.stringify(t));
  },
  cookie: function(h, e, t) {
    var i = /* @__PURE__ */ new Date();
    i.setDate(i.getDate() + 1e4), document.cookie = h + "-" + e + "=" + JSON.stringify(t) + "; expires=" + i.toUTCString();
  }
};
const ke = class ke extends q {
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
      this.mode = e !== !0 ? e : this.localStorageTest() ? "local" : "cookie", this.table.options.persistenceReaderFunc ? typeof this.table.options.persistenceReaderFunc == "function" ? this.readFunc = this.table.options.persistenceReaderFunc : ke.readers[this.table.options.persistenceReaderFunc] ? this.readFunc = ke.readers[this.table.options.persistenceReaderFunc] : console.warn("Persistence Read Error - invalid reader set", this.table.options.persistenceReaderFunc) : ke.readers[this.mode] ? this.readFunc = ke.readers[this.mode] : console.warn("Persistence Read Error - invalid reader set", this.mode), this.table.options.persistenceWriterFunc ? typeof this.table.options.persistenceWriterFunc == "function" ? this.writeFunc = this.table.options.persistenceWriterFunc : ke.writers[this.table.options.persistenceWriterFunc] ? this.writeFunc = ke.writers[this.table.options.persistenceWriterFunc] : console.warn("Persistence Write Error - invalid reader set", this.table.options.persistenceWriterFunc) : ke.writers[this.mode] ? this.writeFunc = ke.writers[this.mode] : console.warn("Persistence Write Error - invalid writer set", this.mode), this.id = "tabulator-" + (t || this.table.element.getAttribute("id") || ""), this.config = {
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
      var o = Object.getOwnPropertyDescriptor(t, s), n = t[s];
      o && Object.defineProperty(t, s, {
        set: (a) => {
          n = a, this.defWatcherBlock || this.save("columns"), o.set && o.set(a);
        },
        get: () => (o.get && o.get(), n)
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
    return t = t || [], t.forEach((o, n) => {
      var a = this._findColumn(e, o), r;
      a && (i ? r = Object.keys(o) : this.config.columns === !0 || this.config.columns == null ? (r = Object.keys(a), r.push("width")) : r = this.config.columns, r.forEach((d) => {
        d !== "columns" && typeof o[d] < "u" && (a[d] = o[d]);
      }), a.columns && (a.columns = this.mergeDefinition(a.columns, o.columns)), s.push(a));
    }), e.forEach((o, n) => {
      var a = this._findColumn(t, o);
      a || (s.length > n ? s.splice(n, 0, o) : s.push(o));
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
      var o = {}, n = s.getDefinition(), a;
      s.isGroup ? (o.title = n.title, o.columns = this.parseColumns(s.getColumns())) : (o.field = s.getField(), this.config.columns === !0 || this.config.columns == null ? (a = Object.keys(n), a.push("width"), a.push("visible")) : a = this.config.columns, a.forEach((r) => {
        switch (r) {
          case "width":
            o.width = s.getWidth();
            break;
          case "visible":
            o.visible = s.visible;
            break;
          default:
            typeof n[r] != "function" && i.indexOf(r) === -1 && (o[r] = n[r]);
        }
      })), t.push(o);
    }), t;
  }
};
O(ke, "moduleName", "persistence"), O(ke, "moduleInitOrder", -10), //load defaults
O(ke, "readers", Wn), O(ke, "writers", Gn);
let Di = ke;
class ys extends q {
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
    var o;
    function n(a) {
      o = a;
    }
    i._group ? i = i._group : i._row && (i = i._row), e = typeof e == "function" ? e.call(this.table, t, i.getComponent(), n) : e, this.loadPopup(t, i, e, o, s);
  }
  loadPopup(e, t, i, s, o) {
    var n = !(e instanceof MouseEvent), a, r;
    i instanceof HTMLElement ? a = i : (a = document.createElement("div"), a.innerHTML = i), a.classList.add("tabulator-popup"), a.addEventListener("click", (d) => {
      d.stopPropagation();
    }), n || e.preventDefault(), r = this.popup(a), typeof s == "function" && r.renderCallback(s), e ? r.show(e) : r.show(t.getElement(), o || "center"), r.hideOnBlur(() => {
      this.dispatchExternal("popupClosed", t.getComponent());
    }), this.dispatchExternal("popupOpened", t.getComponent());
  }
}
O(ys, "moduleName", "popup");
class ws extends q {
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
    var s = window.scrollX, o = window.scrollY, n = document.createElement("div"), a = document.createElement("div"), r = this.table.modules.export.generateTable(typeof i < "u" ? i : this.table.options.printConfig, typeof t < "u" ? t : this.table.options.printStyled, e || this.table.options.printRowRange, "print"), d, c;
    this.manualBlock = !0, this.element = document.createElement("div"), this.element.classList.add("tabulator-print-fullscreen"), this.table.options.printHeader && (n.classList.add("tabulator-print-header"), d = typeof this.table.options.printHeader == "function" ? this.table.options.printHeader.call(this.table) : this.table.options.printHeader, typeof d == "string" ? n.innerHTML = d : n.appendChild(d), this.element.appendChild(n)), this.element.appendChild(r), this.table.options.printFooter && (a.classList.add("tabulator-print-footer"), c = typeof this.table.options.printFooter == "function" ? this.table.options.printFooter.call(this.table) : this.table.options.printFooter, typeof c == "string" ? a.innerHTML = c : a.appendChild(c), this.element.appendChild(a)), document.body.classList.add("tabulator-print-fullscreen-hide"), document.body.appendChild(this.element), this.table.options.printFormatter && this.table.options.printFormatter(this.element, r), window.print(), this.cleanup(), window.scrollTo(s, o), this.manualBlock = !1;
  }
}
O(ws, "moduleName", "print");
class Cs extends q {
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
        var s = Array.from(arguments), o;
        return !t.blocked && i === t.currentVersion && (t.block("data-push"), s.forEach((n) => {
          t.table.rowManager.addRowActual(n, !1);
        }), o = t.origFuncs.push.apply(e, arguments), t.unblock("data-push")), o;
      }
    }), this.origFuncs.unshift = e.unshift, Object.defineProperty(this.data, "unshift", {
      enumerable: !1,
      configurable: !0,
      value: function() {
        var s = Array.from(arguments), o;
        return !t.blocked && i === t.currentVersion && (t.block("data-unshift"), s.forEach((n) => {
          t.table.rowManager.addRowActual(n, !0);
        }), o = t.origFuncs.unshift.apply(e, arguments), t.unblock("data-unshift")), o;
      }
    }), this.origFuncs.shift = e.shift, Object.defineProperty(this.data, "shift", {
      enumerable: !1,
      configurable: !0,
      value: function() {
        var s, o;
        return !t.blocked && i === t.currentVersion && (t.block("data-shift"), t.data.length && (s = t.table.rowManager.getRowFromDataObject(t.data[0]), s && s.deleteActual()), o = t.origFuncs.shift.call(e), t.unblock("data-shift")), o;
      }
    }), this.origFuncs.pop = e.pop, Object.defineProperty(this.data, "pop", {
      enumerable: !1,
      configurable: !0,
      value: function() {
        var s, o;
        return !t.blocked && i === t.currentVersion && (t.block("data-pop"), t.data.length && (s = t.table.rowManager.getRowFromDataObject(t.data[t.data.length - 1]), s && s.deleteActual()), o = t.origFuncs.pop.call(e), t.unblock("data-pop")), o;
      }
    }), this.origFuncs.splice = e.splice, Object.defineProperty(this.data, "splice", {
      enumerable: !1,
      configurable: !0,
      value: function() {
        var s = Array.from(arguments), o = s[0] < 0 ? e.length + s[0] : s[0], n = s[1], a = s[2] ? s.slice(2) : !1, r, d;
        if (!t.blocked && i === t.currentVersion) {
          if (t.block("data-splice"), a && (r = e[o] ? t.table.rowManager.getRowFromDataObject(e[o]) : !1, r ? a.forEach((u) => {
            t.table.rowManager.addRowActual(u, !0, r, !0);
          }) : (a = a.slice().reverse(), a.forEach((u) => {
            t.table.rowManager.addRowActual(u, !0, !1, !0);
          }))), n !== 0) {
            var c = e.slice(o, typeof s[1] > "u" ? s[1] : o + n);
            c.forEach((u, p) => {
              var v = t.table.rowManager.getRowFromDataObject(u);
              v && v.deleteActual(p !== c.length - 1);
            });
          }
          (a || n !== 0) && t.table.rowManager.reRenderInPosition(), d = t.origFuncs.splice.apply(e, arguments), t.unblock("data-splice");
        }
        return d;
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
          var o = s.push.apply(i, arguments);
          this.rebuildTree(e), t.unblock("tree-push");
        }
        return o;
      }
    }), s.unshift = i.unshift, Object.defineProperty(i, "unshift", {
      enumerable: !1,
      configurable: !0,
      value: () => {
        if (!t.blocked) {
          t.block("tree-unshift");
          var o = s.unshift.apply(i, arguments);
          this.rebuildTree(e), t.unblock("tree-unshift");
        }
        return o;
      }
    }), s.shift = i.shift, Object.defineProperty(i, "shift", {
      enumerable: !1,
      configurable: !0,
      value: () => {
        if (!t.blocked) {
          t.block("tree-shift");
          var o = s.shift.call(i);
          this.rebuildTree(e), t.unblock("tree-shift");
        }
        return o;
      }
    }), s.pop = i.pop, Object.defineProperty(i, "pop", {
      enumerable: !1,
      configurable: !0,
      value: () => {
        if (!t.blocked) {
          t.block("tree-pop");
          var o = s.pop.call(i);
          this.rebuildTree(e), t.unblock("tree-pop");
        }
        return o;
      }
    }), s.splice = i.splice, Object.defineProperty(i, "splice", {
      enumerable: !1,
      configurable: !0,
      value: () => {
        if (!t.blocked) {
          t.block("tree-splice");
          var o = s.splice.apply(i, arguments);
          this.rebuildTree(e), t.unblock("tree-splice");
        }
        return o;
      }
    }));
  }
  rebuildTree(e) {
    this.table.modules.dataTree.initializeRow(e), this.table.modules.dataTree.layoutRow(e), this.table.rowManager.refreshActiveData("tree", !1, !0);
  }
  watchKey(e, t, i) {
    var s = this, o = Object.getOwnPropertyDescriptor(t, i), n = t[i], a = this.currentVersion;
    Object.defineProperty(t, i, {
      set: (r) => {
        if (n = r, !s.blocked && a === s.currentVersion) {
          s.block("key");
          var d = {};
          d[i] = r, e.updateData(d), s.unblock("key");
        }
        o.set && o.set(r);
      },
      get: () => (o.get && o.get(), n)
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
O(Cs, "moduleName", "reactiveData");
class Es extends q {
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
    var o = this, n = !1, a = i.definition.resizable, r = {}, d = i.getLastColumn();
    if (e === "header" && (n = i.definition.formatter == "textarea" || i.definition.variableHeight, r = { variableHeight: n }), (a === !0 || a == e) && this._checkResizability(d)) {
      var c = document.createElement("span");
      c.className = "tabulator-col-resize-handle", c.addEventListener("click", function(p) {
        p.stopPropagation();
      });
      var u = function(p) {
        o.startColumn = i, o.initialNextColumn = o.nextColumn = d.nextColumn(), o._mouseDown(p, d, c);
      };
      c.addEventListener("mousedown", u), c.addEventListener("touchstart", u, { passive: !0 }), c.addEventListener("dblclick", (p) => {
        var v = d.getWidth();
        p.stopPropagation(), d.reinitializeWidth(!0), v !== d.getWidth() && (o.dispatch("column-resized", d), o.dispatchExternal("columnResized", d.getComponent()));
      }), i.modules.frozen && (c.style.position = "sticky", c.style[i.modules.frozen.position] = this.frozenColumnOffset(i)), r.handleEl = c, s.parentNode && i.visible && s.after(c);
    }
    t.modules.resize = r;
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
    var i = typeof e.clientX > "u" ? e.touches[0].clientX : e.clientX, s = i - this.startX, o = i - this.latestX, n, a;
    if (this.latestX = i, this.table.rtl && (s = -s, o = -o), n = t.width == t.minWidth || t.width == t.maxWidth, t.setWidth(this.startWidth + s), a = t.width == t.minWidth || t.width == t.maxWidth, o < 0 && (this.nextColumn = this.initialNextColumn), this.table.options.resizableColumnFit && this.nextColumn && !(n && a)) {
      let r = this.nextColumn.getWidth();
      o > 0 && r <= this.nextColumn.minWidth && (this.nextColumn = this.nextColumn.nextColumn()), this.nextColumn && this.nextColumn.setWidth(this.nextColumn.getWidth() - o);
    }
    this.table.columnManager.rerenderColumns(!0), !this.table.browserSlow && t.modules.resize && t.modules.resize.variableHeight && t.checkCellHeights();
  }
  calcGuidePosition(e, t, i) {
    var s = typeof e.clientX > "u" ? e.touches[0].clientX : e.clientX, o = i.getBoundingClientRect().x - this.table.element.getBoundingClientRect().x, n = this.table.element.getBoundingClientRect().x, a = t.element.getBoundingClientRect().left - n, r = s - this.startX, d = Math.max(o + r, a + t.minWidth);
    return t.maxWidth && (d = Math.min(d, a + t.maxWidth)), d;
  }
  _checkResizability(e) {
    return e.definition.resizable;
  }
  _mouseDown(e, t, i) {
    var s = this, o;
    this.dispatchExternal("columnResizing", t.getComponent()), s.table.options.resizableColumnGuide && (o = document.createElement("span"), o.classList.add("tabulator-col-resize-guide"), s.table.element.appendChild(o), setTimeout(() => {
      o.style.left = s.calcGuidePosition(e, t, i) + "px";
    })), s.table.element.classList.add("tabulator-block-select");
    function n(r) {
      s.table.options.resizableColumnGuide ? o.style.left = s.calcGuidePosition(r, t, i) + "px" : s.resize(r, t);
    }
    function a(r) {
      s.table.options.resizableColumnGuide && (s.resize(r, t), o.remove()), s.startColumn.modules.edit && (s.startColumn.modules.edit.blocked = !1), s.table.browserSlow && t.modules.resize && t.modules.resize.variableHeight && t.checkCellHeights(), document.body.removeEventListener("mouseup", a), document.body.removeEventListener("mousemove", n), i.removeEventListener("touchmove", n), i.removeEventListener("touchend", a), s.table.element.classList.remove("tabulator-block-select"), s.startWidth !== t.getWidth() && (s.table.columnManager.verticalAlignHeaders(), s.dispatch("column-resized", t), s.dispatchExternal("columnResized", t.getComponent()));
    }
    e.stopPropagation(), s.startColumn.modules.edit && (s.startColumn.modules.edit.blocked = !0), s.startX = typeof e.clientX > "u" ? e.touches[0].clientX : e.clientX, s.latestX = s.startX, s.startWidth = t.getWidth(), document.body.addEventListener("mousemove", n), document.body.addEventListener("mouseup", a), i.addEventListener("touchmove", n, { passive: !0 }), i.addEventListener("touchend", a);
  }
}
O(Es, "moduleName", "resizeColumns");
class xs extends q {
  constructor(e) {
    super(e), this.startColumn = !1, this.startY = !1, this.startHeight = !1, this.handle = null, this.prevHandle = null, this.registerTableOption("resizableRows", !1), this.registerTableOption("resizableRowGuide", !1);
  }
  initialize() {
    this.table.options.resizableRows && this.subscribe("row-layout-after", this.initializeRow.bind(this));
  }
  initializeRow(e) {
    var t = this, i = e.getElement(), s = document.createElement("div");
    s.className = "tabulator-row-resize-handle";
    var o = document.createElement("div");
    o.className = "tabulator-row-resize-handle prev", s.addEventListener("click", function(r) {
      r.stopPropagation();
    });
    var n = function(r) {
      t.startRow = e, t._mouseDown(r, e, s);
    };
    s.addEventListener("mousedown", n), s.addEventListener("touchstart", n, { passive: !0 }), o.addEventListener("click", function(r) {
      r.stopPropagation();
    });
    var a = function(r) {
      var d = t.table.rowManager.prevDisplayRow(e);
      d && (t.startRow = d, t._mouseDown(r, d, o));
    };
    o.addEventListener("mousedown", a), o.addEventListener("touchstart", a, { passive: !0 }), i.appendChild(s), i.appendChild(o);
  }
  resize(e, t) {
    t.setHeight(this.startHeight + ((typeof e.screenY > "u" ? e.touches[0].screenY : e.screenY) - this.startY));
  }
  calcGuidePosition(e, t, i) {
    var s = typeof e.screenY > "u" ? e.touches[0].screenY : e.screenY, o = i.getBoundingClientRect().y - this.table.element.getBoundingClientRect().y, n = this.table.element.getBoundingClientRect().y, a = t.element.getBoundingClientRect().top - n, r = s - this.startY;
    return Math.max(o + r, a);
  }
  _mouseDown(e, t, i) {
    var s = this, o;
    s.dispatchExternal("rowResizing", t.getComponent()), s.table.options.resizableRowGuide && (o = document.createElement("span"), o.classList.add("tabulator-row-resize-guide"), s.table.element.appendChild(o), setTimeout(() => {
      o.style.top = s.calcGuidePosition(e, t, i) + "px";
    })), s.table.element.classList.add("tabulator-block-select");
    function n(r) {
      s.table.options.resizableRowGuide ? o.style.top = s.calcGuidePosition(r, t, i) + "px" : s.resize(r, t);
    }
    function a(r) {
      s.table.options.resizableRowGuide && (s.resize(r, t), o.remove()), document.body.removeEventListener("mouseup", n), document.body.removeEventListener("mousemove", n), i.removeEventListener("touchmove", n), i.removeEventListener("touchend", a), s.table.element.classList.remove("tabulator-block-select"), s.dispatchExternal("rowResized", t.getComponent());
    }
    e.stopPropagation(), s.startY = typeof e.screenY > "u" ? e.touches[0].screenY : e.screenY, s.startHeight = t.getHeight(), document.body.addEventListener("mousemove", n), document.body.addEventListener("mouseup", a), i.addEventListener("touchmove", n, { passive: !0 }), i.addEventListener("touchend", a);
  }
}
O(xs, "moduleName", "resizeRows");
class ks extends q {
  constructor(e) {
    super(e), this.binding = !1, this.visibilityObserver = !1, this.resizeObserver = !1, this.containerObserver = !1, this.tableHeight = 0, this.tableWidth = 0, this.containerHeight = 0, this.containerWidth = 0, this.autoResize = !1, this.visible = !1, this.initialized = !1, this.initialRedraw = !1, this.registerTableOption("autoResize", !0);
  }
  initialize() {
    if (this.table.options.autoResize) {
      var e = this.table, t;
      this.tableHeight = e.element.clientHeight, this.tableWidth = e.element.clientWidth, e.element.parentNode && (this.containerHeight = e.element.parentNode.clientHeight, this.containerWidth = e.element.parentNode.clientWidth), typeof IntersectionObserver < "u" && typeof ResizeObserver < "u" && e.rowManager.getRenderMode() === "virtual" ? (this.initializeVisibilityObserver(), this.autoResize = !0, this.resizeObserver = new ResizeObserver((i) => {
        if (!e.browserMobile || e.browserMobile && (!e.modules.edit || e.modules.edit && !e.modules.edit.currentCell)) {
          var s = Math.floor(i[0].contentRect.height), o = Math.floor(i[0].contentRect.width);
          (this.tableHeight != s || this.tableWidth != o) && (this.tableHeight = s, this.tableWidth = o, e.element.parentNode && (this.containerHeight = e.element.parentNode.clientHeight, this.containerWidth = e.element.parentNode.clientWidth), this.redrawTable());
        }
      }), this.resizeObserver.observe(e.element), t = window.getComputedStyle(e.element), this.table.element.parentNode && !this.table.rowManager.fixedHeight && (t.getPropertyValue("max-height") || t.getPropertyValue("min-height")) && (this.containerObserver = new ResizeObserver((i) => {
        if (!e.browserMobile || e.browserMobile && (!e.modules.edit || e.modules.edit && !e.modules.edit.currentCell)) {
          var s = Math.floor(i[0].contentRect.height), o = Math.floor(i[0].contentRect.width);
          (this.containerHeight != s || this.containerWidth != o) && (this.containerHeight = s, this.containerWidth = o, this.tableHeight = e.element.clientHeight, this.tableWidth = e.element.clientWidth), this.redrawTable();
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
O(ks, "moduleName", "resizeTable");
function jn(h, e, t) {
  var i = document.createElement("div"), s = h.getRow()._row.modules.responsiveLayout;
  i.classList.add("tabulator-responsive-collapse-toggle"), i.innerHTML = `<svg class='tabulator-responsive-collapse-toggle-open' viewbox="0 0 24 24">
  <line x1="7" y1="12" x2="17" y2="12" fill="none" stroke-width="3" stroke-linecap="round" />
  <line y1="7" x1="12" y2="17" x2="12" fill="none" stroke-width="3" stroke-linecap="round" />
</svg>

<svg class='tabulator-responsive-collapse-toggle-close' viewbox="0 0 24 24">
  <line x1="7" y1="12" x2="17" y2="12"  fill="none" stroke-width="3" stroke-linecap="round" />
</svg>`, h.getElement().classList.add("tabulator-row-handle");
  function o(n) {
    var a = s.element;
    s.open = n, a && (s.open ? (i.classList.add("open"), a.style.display = "") : (i.classList.remove("open"), a.style.display = "none"));
  }
  return i.addEventListener("click", function(n) {
    n.stopImmediatePropagation(), o(!s.open), h.getTable().rowManager.adjustTableSize();
  }), o(s.open), i;
}
var Un = {
  format: {
    formatters: {
      responsiveCollapse: jn
    }
  }
};
class Fi extends q {
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
    return this.hiddenColumns.forEach((o) => {
      var n = o.getFieldValue(t);
      if (o.definition.title && o.field)
        if (o.modules.format && this.table.options.responsiveLayoutCollapseUseFormatters) {
          let a = function(r) {
            r();
          };
          s = {
            value: !1,
            data: {},
            getValue: function() {
              return n;
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
              return o.getComponent();
            },
            getTable: () => this.table
          }, i.push({
            field: o.field,
            title: o.definition.title,
            value: o.modules.format.formatter.call(this.table.modules.format, s, o.modules.format.params, a)
          });
        } else
          i.push({
            field: o.field,
            title: o.definition.title,
            value: n
          });
    }), i;
  }
  formatCollapsedData(e) {
    var t = document.createElement("table");
    return e.forEach((i) => {
      var s = document.createElement("tr"), o = document.createElement("td"), n = document.createElement("td"), a, r = document.createElement("strong");
      o.appendChild(r), this.modules.localize.bind("columns|" + i.field, function(d) {
        r.innerHTML = d || i.title;
      }), i.value instanceof Node ? (a = document.createElement("div"), a.appendChild(i.value), n.appendChild(a)) : n.innerHTML = i.value, s.appendChild(o), s.appendChild(n), t.appendChild(s);
    }), Object.keys(e).length ? t : "";
  }
}
O(Fi, "moduleName", "responsiveLayout"), O(Fi, "moduleExtensions", Un);
function qn(h, e, t) {
  var i = document.createElement("input"), s = !1;
  if (i.type = "checkbox", i.setAttribute("aria-label", "Select Row"), this.table.modExists("selectRow", !0))
    if (i.addEventListener("click", (n) => {
      n.stopPropagation();
    }), typeof h.getRow == "function") {
      var o = h.getRow();
      o instanceof ei ? (i.addEventListener("change", (n) => {
        this.table.options.selectableRowsRangeMode === "click" && s ? s = !1 : o.toggleSelect();
      }), this.table.options.selectableRowsRangeMode === "click" && i.addEventListener("click", (n) => {
        s = !0, this.table.modules.selectRow.handleComplexRowClick(o._row, n);
      }), i.checked = o.isSelected && o.isSelected(), this.table.modules.selectRow.registerRowSelectCheckbox(o, i)) : i = "";
    } else
      i.addEventListener("change", (n) => {
        this.table.modules.selectRow.selectedRows.length ? this.table.deselectRow() : this.table.selectRow(e.rowRange);
      }), this.table.modules.selectRow.registerHeaderSelectCheckbox(i);
  return i;
}
var Kn = {
  format: {
    formatters: {
      rowSelection: qn
    }
  }
};
class Mi extends q {
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
    var t = this, i = t.checkRowSelectability(e), s = e.getElement(), o = function() {
      setTimeout(function() {
        t.selecting = !1;
      }, 50), document.body.removeEventListener("mouseup", o);
    };
    e.modules.select = { selected: !1 }, s.classList.toggle("tabulator-selectable", i), s.classList.toggle("tabulator-unselectable", !i), t.checkRowSelectability(e) && t.table.options.selectableRows && t.table.options.selectableRows != "highlight" && (t.table.options.selectableRowsRangeMode === "click" ? s.addEventListener("click", this.handleComplexRowClick.bind(this, e)) : (s.addEventListener("click", function(n) {
      (!t.table.modExists("edit") || !t.table.modules.edit.getCurrentCell()) && t.table._clearSelection(), t.selecting || t.toggleRow(e);
    }), s.addEventListener("mousedown", function(n) {
      if (n.shiftKey)
        return t.table._clearSelection(), t.selecting = !0, t.selectPrev = [], document.body.addEventListener("mouseup", o), document.body.addEventListener("keyup", o), t.toggleRow(e), !1;
    }), s.addEventListener("mouseenter", function(n) {
      t.selecting && (t.table._clearSelection(), t.toggleRow(e), t.selectPrev[1] == e && t.toggleRow(t.selectPrev[0]));
    }), s.addEventListener("mouseout", function(n) {
      t.selecting && (t.table._clearSelection(), t.selectPrev.unshift(e));
    })));
  }
  handleComplexRowClick(e, t) {
    if (t.shiftKey) {
      this.table._clearSelection(), this.lastClickedRow = this.lastClickedRow || e;
      var i = this.table.rowManager.getDisplayRowIndex(this.lastClickedRow), s = this.table.rowManager.getDisplayRowIndex(e), o = i <= s ? i : s, n = i >= s ? i : s, a = this.table.rowManager.getDisplayRows().slice(0), r = a.splice(o, n - o + 1);
      t.ctrlKey || t.metaKey ? (r.forEach((d) => {
        d !== this.lastClickedRow && (this.table.options.selectableRows !== !0 && !this.isRowSelected(e) ? this.selectedRows.length < this.table.options.selectableRows && this.toggleRow(d) : this.toggleRow(d));
      }), this.lastClickedRow = e) : (this.deselectRows(void 0, !0), this.table.options.selectableRows !== !0 && r.length > this.table.options.selectableRows && (r = r.slice(0, this.table.options.selectableRows)), this.selectRows(r)), this.table._clearSelection();
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
    Array.isArray(i) ? i.length && (i.forEach((o) => {
      s = this._selectRow(o, !0, !0), s && t.push(s);
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
    var i = [], s, o;
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
    Array.isArray(s) ? s.length && (s.forEach((n) => {
      o = this._deselectRow(n, !0, !0), o && i.push(o);
    }), this._rowSelectionChanged(t, [], i)) : s && this._deselectRow(s, t, !0);
  }
  //deselect an individual row
  _deselectRow(e, t) {
    var i = this, s = i.table.rowManager.findRow(e), o, n;
    if (s) {
      if (o = i.selectedRows.findIndex(function(a) {
        return a == s;
      }), o > -1)
        return n = s.getElement(), n && n.classList.remove("tabulator-selected"), s.modules.select || (s.modules.select = {}), s.modules.select.selected = !1, s.modules.select.checkboxEl && (s.modules.select.checkboxEl.checked = !1), i.selectedRows.splice(o, 1), this.table.options.dataTreeSelectPropagate && this.childRowSelection(s, !1), this.dispatchExternal("rowDeselected", s.getComponent()), i._rowSelectionChanged(t, void 0, s), s;
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
O(Mi, "moduleName", "selectRow"), O(Mi, "moduleExtensions", Kn);
class Qn {
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
class Xn extends pe {
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
    var t = this._getTableRows().length, i, s, o;
    e.type === "column" ? this.rangeManager.columnSelection && (this.rangeManager.selecting === "column" ? this.setEnd(t - 1, e.getPosition() - 1) : this.rangeManager.selecting === "cell" && this.setEnd(0, e.getPosition() - 1)) : (i = e.row.position - 1, s = e.column.getPosition() - 1, o = e.column === this.rangeManager.rowHeader, this.rangeManager.selecting === "row" ? this.setEnd(i, this._getTableColumns().length - 1) : this.rangeManager.selecting !== "row" && o ? this.setEnd(i, 0) : this.rangeManager.selecting === "column" ? this.setEnd(t - 1, s) : this.setEnd(i, s));
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
    var e = this.table.rowManager.renderer.vDomTop, t = this.table.rowManager.renderer.vDomBottom, i = this.table.columnManager.renderer.leftCol, s = this.table.columnManager.renderer.rightCol, o, n, a, r, d, c, u, p, v, y;
    this.table.options.renderHorizontal === "virtual" && this.rangeManager.rowHeader && (s += 1), e == null && (e = 0), t == null && (t = 1 / 0), i == null && (i = 0), s == null && (s = 1 / 0), this.overlaps(i, e, s, t) && (o = Math.max(this.top, e), n = Math.min(this.bottom, t), a = Math.max(this.left, i), r = Math.min(this.right, s), d = this.rangeManager.getCell(o, a), c = this.rangeManager.getCell(n, r), u = d.getElement(), p = c.getElement(), v = d.row.getElement(), y = c.row.getElement(), this.element.classList.add("tabulator-range-active"), this.table.rtl ? (this.element.style.right = v.offsetWidth - u.offsetLeft - u.offsetWidth + "px", this.element.style.width = u.offsetLeft + u.offsetWidth - p.offsetLeft + "px") : (this.element.style.left = v.offsetLeft + u.offsetLeft + "px", this.element.style.width = p.offsetLeft + p.offsetWidth - u.offsetLeft + "px"), this.element.style.top = v.offsetTop + "px", this.element.style.height = y.offsetTop + y.offsetHeight - v.offsetTop + "px");
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
      var o = s.getData(), n = {};
      i.forEach((a) => {
        n[a.field] = o[a.field];
      }), e.push(n);
    }), e;
  }
  getCells(e, t) {
    var i = [], s = this.getRows(), o = this.getColumns();
    return e ? i = s.map((n) => {
      var a = [];
      return n.getCells().forEach((r) => {
        o.includes(r.column) && a.push(t ? r.getComponent() : r);
      }), a;
    }) : s.forEach((n) => {
      n.getCells().forEach((a) => {
        o.includes(a.column) && i.push(t ? a.getComponent() : a);
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
    return this.component || (this.component = new Qn(this)), this.component;
  }
  destroy(e) {
    this.destroyed = !0, this.element.remove(), e && this.rangeManager.rangeRemoved(this), this.initialized && this.dispatchExternal("rangeRemoved", this.getComponent());
  }
  destroyedGuard(e) {
    return this.destroyed && console.warn("You cannot call the " + e + " function on a destroyed range"), !this.destroyed;
  }
}
var Jn = {
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
}, Yn = {
  rangeJumpLeft: function(h) {
    this.dispatch("keybinding-nav-range", h, "left", !0, !1);
  },
  rangeJumpRight: function(h) {
    this.dispatch("keybinding-nav-range", h, "right", !0, !1);
  },
  rangeJumpUp: function(h) {
    this.dispatch("keybinding-nav-range", h, "up", !0, !1);
  },
  rangeJumpDown: function(h) {
    this.dispatch("keybinding-nav-range", h, "down", !0, !1);
  },
  rangeExpandLeft: function(h) {
    this.dispatch("keybinding-nav-range", h, "left", !1, !0);
  },
  rangeExpandRight: function(h) {
    this.dispatch("keybinding-nav-range", h, "right", !1, !0);
  },
  rangeExpandUp: function(h) {
    this.dispatch("keybinding-nav-range", h, "up", !1, !0);
  },
  rangeExpandDown: function(h) {
    this.dispatch("keybinding-nav-range", h, "down", !1, !0);
  },
  rangeExpandJumpLeft: function(h) {
    this.dispatch("keybinding-nav-range", h, "left", !0, !0);
  },
  rangeExpandJumpRight: function(h) {
    this.dispatch("keybinding-nav-range", h, "right", !0, !0);
  },
  rangeExpandJumpUp: function(h) {
    this.dispatch("keybinding-nav-range", h, "up", !0, !0);
  },
  rangeExpandJumpDown: function(h) {
    this.dispatch("keybinding-nav-range", h, "down", !0, !0);
  }
}, Zn = {
  range: function(h) {
    var e = [], t = this.table.modules.selectRange.activeRange, i = !1, s, o, n, a, r;
    return r = h.length, t && (s = t.getBounds(), o = s.start, s.start === s.end && (i = !0), o && (e = this.table.rowManager.activeRows.slice(), n = e.indexOf(o.row), i ? a = h.length : a = e.indexOf(s.end.row) - n + 1, n > -1 && (this.table.blockRedraw(), e = e.slice(n, n + a), e.forEach((d, c) => {
      d.updateData(h[c % r]);
    }), this.table.restoreRedraw()))), e;
  }
}, ea = {
  range: function(h) {
    var e = [], t = [], i = this.table.modules.selectRange.activeRange, s = !1, o, n, a, r, d;
    return i && (o = i.getBounds(), n = o.start, o.start === o.end && (s = !0), n && (h = h.split(`
`), h.forEach(function(c) {
      e.push(c.split("	"));
    }), e.length && (r = this.table.columnManager.getVisibleColumnsByIndex(), d = r.indexOf(n.column), d > -1))) ? (s ? a = e[0].length : a = r.indexOf(o.end.column) - d + 1, r = r.slice(d, d + a), e.forEach((c) => {
      var u = {}, p = c.length;
      r.forEach(function(v, y) {
        u[v.field] = c[y % p];
      }), t.push(u);
    }), t) : !1;
  }
}, ta = {
  range: function() {
    var h = this.modules.selectRange.selectedColumns();
    return this.columnManager.rowHeader && h.unshift(this.columnManager.rowHeader), h;
  }
}, ia = {
  range: function() {
    return this.modules.selectRange.selectedRows();
  }
}, sa = {
  keybindings: {
    bindings: Jn,
    actions: Yn
  },
  clipboard: {
    pasteActions: Zn,
    pasteParsers: ea
  },
  export: {
    columnLookups: ta,
    rowLookups: ia
  }
};
class Jt extends q {
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
      s.forEach((o) => {
        o !== e && o.setWidth(e.width);
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
    var s = !1, o, n, a, r, d, c, u, p, v, y, L;
    if (this.table.modules.edit && this.table.modules.edit.currentCell)
      return !1;
    if (this.ranges.length > 1 && (this.ranges = this.ranges.filter((_) => _ === this.activeRange ? (_.setEnd(_.start.row, _.start.col), !0) : (_.destroy(), !1))), o = this.activeRange, a = {
      top: o.top,
      bottom: o.bottom,
      left: o.left,
      right: o.right
    }, n = t ? o.end : o.start, r = n.row, d = n.col, e)
      switch (i) {
        case "left":
          d = this.findJumpCellLeft(o.start.row, n.col);
          break;
        case "right":
          d = this.findJumpCellRight(o.start.row, n.col);
          break;
        case "up":
          r = this.findJumpCellUp(n.row, o.start.col);
          break;
        case "down":
          r = this.findJumpCellDown(n.row, o.start.col);
          break;
      }
    else {
      if (t && (this.selecting === "row" && (i === "left" || i === "right") || this.selecting === "column" && (i === "up" || i === "down")))
        return;
      switch (i) {
        case "left":
          d = Math.max(d - 1, 0);
          break;
        case "right":
          d = Math.min(d + 1, this.getTableColumns().length - 1);
          break;
        case "up":
          r = Math.max(r - 1, 0);
          break;
        case "down":
          r = Math.min(r + 1, this.getTableRows().length - 1);
          break;
      }
    }
    if (this.rowHeader && d === 0 && (d = 1), t || o.setStart(r, d), o.setEnd(r, d), t || (this.selecting = "cell"), s = a.top !== o.top || a.bottom !== o.bottom || a.left !== o.left || a.right !== o.right, s)
      return c = this.getRowByRangePos(o.end.row), u = this.getColumnByRangePos(o.end.col), p = c.getElement().getBoundingClientRect(), y = u.getElement().getBoundingClientRect(), v = this.table.rowManager.getElement().getBoundingClientRect(), L = this.table.columnManager.getElement().getBoundingClientRect(), p.top >= v.top && p.bottom <= v.bottom || (c.getElement().parentNode && u.getElement().parentNode ? this.autoScroll(o, c.getElement(), u.getElement()) : c.getComponent().scrollTo(void 0, !1)), y.left >= L.left + this.getRowHeaderWidth() && y.right <= L.right || (c.getElement().parentNode && u.getElement().parentNode ? this.autoScroll(o, c.getElement(), u.getElement()) : u.getComponent().scrollTo(void 0, !1)), this.layoutElement(), !0;
  }
  rangeRemoved(e) {
    this.ranges = this.ranges.filter((t) => t !== e), this.activeRange === e && (this.ranges.length ? this.activeRange = this.ranges[this.ranges.length - 1] : this.addRange()), this.layoutElement();
  }
  findJumpRow(e, t, i, s, o) {
    return i && (t = t.reverse()), this.findJumpItem(s, o, t, function(n) {
      return n.getData()[e.getField()];
    });
  }
  findJumpCol(e, t, i, s, o) {
    return i && (t = t.reverse()), this.findJumpItem(s, o, t, function(n) {
      return e.getData()[n.getField()];
    });
  }
  findJumpItem(e, t, i, s) {
    var o;
    for (let n of i) {
      let a = s(n);
      if (e) {
        if (o = n, a)
          break;
      } else if (t) {
        if (o = n, a)
          break;
      } else if (a)
        o = n;
      else
        break;
    }
    return o;
  }
  findJumpCellLeft(e, t) {
    var i = this.getRowByRangePos(e), s = this.getTableColumns(), o = this.isEmpty(i.getData()[s[t].getField()]), n = s[t - 1] ? this.isEmpty(i.getData()[s[t - 1].getField()]) : !1, a = this.rowHeader ? s.slice(1, t) : s.slice(0, t), r = this.findJumpCol(i, a, !0, o, n);
    return r ? r.getPosition() - 1 : t;
  }
  findJumpCellRight(e, t) {
    var i = this.getRowByRangePos(e), s = this.getTableColumns(), o = this.isEmpty(i.getData()[s[t].getField()]), n = s[t + 1] ? this.isEmpty(i.getData()[s[t + 1].getField()]) : !1, a = this.findJumpCol(i, s.slice(t + 1, s.length), !1, o, n);
    return a ? a.getPosition() - 1 : t;
  }
  findJumpCellUp(e, t) {
    var i = this.getColumnByRangePos(t), s = this.getTableRows(), o = this.isEmpty(s[e].getData()[i.getField()]), n = s[e - 1] ? this.isEmpty(s[e - 1].getData()[i.getField()]) : !1, a = this.findJumpRow(i, s.slice(0, e), !0, o, n);
    return a ? a.position - 1 : e;
  }
  findJumpCellDown(e, t) {
    var i = this.getColumnByRangePos(t), s = this.getTableRows(), o = this.isEmpty(s[e].getData()[i.getField()]), n = s[e + 1] ? this.isEmpty(s[e + 1].getData()[i.getField()]) : !1, a = this.findJumpRow(i, s.slice(e + 1, s.length), !1, o, n);
    return a ? a.position - 1 : e;
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
        var s, o = this.getCell(-1, -1);
        this.rowHeader ? s = this.getCell(0, 1) : s = this.getCell(0, 0), i.setBounds(s, o);
        return;
      } else
        this.selecting = "column";
    } else t.column === this.rowHeader ? this.selecting = "row" : this.selecting = "cell";
    e.shiftKey ? this.activeRange.setBounds(!1, t) : e.ctrlKey ? this.addRange().setBounds(t) : this.resetRanges().setBounds(t);
  }
  autoScroll(e, t, i) {
    var s = this.table.rowManager.element, o, n, a, r;
    typeof t > "u" && (t = this.getRowByRangePos(e.end.row).getElement()), typeof i > "u" && (i = this.getColumnByRangePos(e.end.col).getElement()), o = {
      left: i.offsetLeft,
      right: i.offsetLeft + i.offsetWidth,
      top: t.offsetTop,
      bottom: t.offsetTop + t.offsetHeight
    }, n = {
      left: s.scrollLeft + this.getRowHeaderWidth(),
      right: Math.ceil(s.scrollLeft + s.clientWidth),
      top: s.scrollTop,
      bottom: s.scrollTop + s.offsetHeight - this.table.rowManager.scrollbarWidth
    }, a = n.left < o.left && o.left < n.right && n.left < o.right && o.right < n.right, r = n.top < o.top && o.top < n.bottom && n.top < o.bottom && o.bottom < n.bottom, a || (o.left < n.left ? s.scrollLeft = o.left - this.getRowHeaderWidth() : o.right > n.right && (s.scrollLeft = Math.min(o.right - s.clientWidth, o.left - this.getRowHeaderWidth()))), r || (o.top < n.top ? s.scrollTop = o.top : o.bottom > n.bottom && (s.scrollTop = o.bottom - s.clientHeight));
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
    var t = e.getElement(), i = !1, s = this.ranges.some((o) => o.occupiesRow(e));
    this.selecting === "row" ? i = s : this.selecting === "all" && (i = !0), t.classList.toggle("tabulator-range-selected", i), t.classList.toggle("tabulator-range-highlight", s);
  }
  layoutColumn(e) {
    var t = e.getElement(), i = !1, s = this.ranges.some((o) => o.occupiesColumn(e));
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
    return this.maxRanges !== !0 && this.ranges.length >= this.maxRanges && this.ranges.shift().destroy(), i = new Xn(this.table, this, e, t), this.activeRange = i, this.ranges.push(i), this.rangeContainer.appendChild(i.element), i;
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
O(Jt, "moduleName", "selectRange"), O(Jt, "moduleInitOrder", 1), O(Jt, "moduleExtensions", sa);
function oa(h, e, t, i, s, o, n) {
  var a = n.alignEmptyValues, r = n.decimalSeparator, d = n.thousandSeparator, c = 0;
  if (h = String(h), e = String(e), d && (h = h.split(d).join(""), e = e.split(d).join("")), r && (h = h.split(r).join("."), e = e.split(r).join(".")), h = parseFloat(h), e = parseFloat(e), isNaN(h))
    c = isNaN(e) ? 0 : -1;
  else if (isNaN(e))
    c = 1;
  else
    return h - e;
  return (a === "top" && o === "desc" || a === "bottom" && o === "asc") && (c *= -1), c;
}
function na(h, e, t, i, s, o, n) {
  var a = n.alignEmptyValues, r = 0, d;
  if (!h)
    r = e ? -1 : 0;
  else if (!e)
    r = 1;
  else {
    switch (typeof n.locale) {
      case "boolean":
        n.locale && (d = this.langLocale());
        break;
      case "string":
        d = n.locale;
        break;
    }
    return String(h).toLowerCase().localeCompare(String(e).toLowerCase(), d);
  }
  return (a === "top" && o === "desc" || a === "bottom" && o === "asc") && (r *= -1), r;
}
function Gi(h, e, t, i, s, o, n) {
  var a = this.table.dependencyRegistry.lookup(["luxon", "DateTime"], "DateTime"), r = n.format || "dd/MM/yyyy HH:mm:ss", d = n.alignEmptyValues, c = 0;
  if (typeof a < "u") {
    if (a.isDateTime(h) || (r === "iso" ? h = a.fromISO(String(h)) : h = a.fromFormat(String(h), r)), a.isDateTime(e) || (r === "iso" ? e = a.fromISO(String(e)) : e = a.fromFormat(String(e), r)), !h.isValid)
      c = e.isValid ? -1 : 0;
    else if (!e.isValid)
      c = 1;
    else
      return h - e;
    return (d === "top" && o === "desc" || d === "bottom" && o === "asc") && (c *= -1), c;
  } else
    console.error("Sort Error - 'datetime' sorter is dependant on luxon.js");
}
function aa(h, e, t, i, s, o, n) {
  return n.format || (n.format = "dd/MM/yyyy"), Gi.call(this, h, e, t, i, s, o, n);
}
function ra(h, e, t, i, s, o, n) {
  return n.format || (n.format = "HH:mm"), Gi.call(this, h, e, t, i, s, o, n);
}
function la(h, e, t, i, s, o, n) {
  var a = h === !0 || h === "true" || h === "True" || h === 1 ? 1 : 0, r = e === !0 || e === "true" || e === "True" || e === 1 ? 1 : 0;
  return a - r;
}
function ha(h, e, t, i, s, o, n) {
  var a = n.type || "length", r = n.alignEmptyValues, d = 0, c = this.table, u;
  n.valueMap && (typeof n.valueMap == "string" ? u = function(v) {
    return v.map((y) => ne.retrieveNestedData(c.options.nestedFieldSeparator, n.valueMap, y));
  } : u = n.valueMap);
  function p(v) {
    var y;
    switch (u && (v = u(v)), a) {
      case "length":
        y = v.length;
        break;
      case "sum":
        y = v.reduce(function(L, _) {
          return L + _;
        });
        break;
      case "max":
        y = Math.max.apply(null, v);
        break;
      case "min":
        y = Math.min.apply(null, v);
        break;
      case "avg":
        y = v.reduce(function(L, _) {
          return L + _;
        }) / v.length;
        break;
      case "string":
        y = v.join("");
        break;
    }
    return y;
  }
  if (!Array.isArray(h))
    d = Array.isArray(e) ? -1 : 0;
  else if (!Array.isArray(e))
    d = 1;
  else
    return a === "string" ? String(p(h)).toLowerCase().localeCompare(String(p(e)).toLowerCase()) : p(e) - p(h);
  return (r === "top" && o === "desc" || r === "bottom" && o === "asc") && (d *= -1), d;
}
function da(h, e, t, i, s, o, n) {
  var a = typeof h > "u" ? 0 : 1, r = typeof e > "u" ? 0 : 1;
  return a - r;
}
function ca(h, e, t, i, s, o, n) {
  var a, r, d, c, u = 0, p, v = /(\d+)|(\D+)/g, y = /\d/, L = n.alignEmptyValues, _ = 0;
  if (!h && h !== 0)
    _ = !e && e !== 0 ? 0 : -1;
  else if (!e && e !== 0)
    _ = 1;
  else {
    if (isFinite(h) && isFinite(e)) return h - e;
    if (a = String(h).toLowerCase(), r = String(e).toLowerCase(), a === r) return 0;
    if (!(y.test(a) && y.test(r))) return a > r ? 1 : -1;
    for (a = a.match(v), r = r.match(v), p = a.length > r.length ? r.length : a.length; u < p; )
      if (d = a[u], c = r[u++], d !== c)
        return isFinite(d) && isFinite(c) ? (d.charAt(0) === "0" && (d = "." + d), c.charAt(0) === "0" && (c = "." + c), d - c) : d > c ? 1 : -1;
    return a.length > r.length;
  }
  return (L === "top" && o === "desc" || L === "bottom" && o === "asc") && (_ *= -1), _;
}
var ua = {
  number: oa,
  string: na,
  date: aa,
  time: ra,
  datetime: Gi,
  boolean: la,
  array: ha,
  exists: da,
  alphanum: ca
};
const wt = class wt extends q {
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
    var o = this.getSort();
    return o.forEach((n) => {
      delete n.column;
    }), s.sort = o, s;
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
        wt.sorters[e.definition.sorter] ? t = wt.sorters[e.definition.sorter] : console.warn("Sort Error - No such sorter found: ", e.definition.sorter);
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
      e.titleHolderElement.appendChild(s), e.modules.sort.element = s, this.setColumnHeaderSortIcon(e, "none"), this.table.options.headerSortClickElement === "icon" && s.addEventListener("mousedown", (o) => {
        o.stopPropagation();
      }), (this.table.options.headerSortClickElement === "icon" ? s : i).addEventListener("click", (o) => {
        var n = "", a = [], r = !1;
        if (e.modules.sort) {
          if (e.modules.sort.tristate)
            e.modules.sort.dir == "none" ? n = e.modules.sort.startingDir : e.modules.sort.dir == e.modules.sort.startingDir ? n = e.modules.sort.dir == "asc" ? "desc" : "asc" : n = "none";
          else
            switch (e.modules.sort.dir) {
              case "asc":
                n = "desc";
                break;
              case "desc":
                n = "asc";
                break;
              default:
                n = e.modules.sort.startingDir;
            }
          this.table.options.columnHeaderSortMulti && (o.shiftKey || o.ctrlKey) ? (a = this.getSort(), r = a.findIndex((d) => d.field === e.getField()), r > -1 ? (a[r].dir = n, r = a.splice(r, 1)[0], n != "none" && a.push(r)) : n != "none" && a.push({ column: e, dir: n }), this.setSort(a)) : n == "none" ? this.clear() : this.setSort(e, n), this.refreshSort();
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
    Array.isArray(e) || (e = [{ column: e, dir: t }]), e.forEach(function(o) {
      var n;
      n = i.table.columnManager.findColumn(o.column), n ? (o.column = n, s.push(o), i.changed = !0) : console.warn("Sort Warning - Sort field does not exist and is being ignored: ", o.column);
    }), i.sortList = s, this.dispatch("sort-changed");
  }
  //clear sorters
  clear() {
    this.setSort([]);
  }
  //find appropriate sorter for column
  findSorter(e) {
    var t = this.table.rowManager.activeRows[0], i = "string", s, o;
    if (t && (t = t.getData(), s = e.getField(), s))
      switch (o = e.getFieldValue(t), typeof o) {
        case "undefined":
          i = "string";
          break;
        case "boolean":
          i = "boolean";
          break;
        default:
          !isNaN(o) && o !== "" ? i = "number" : o.match(/((^[0-9]+[a-z]+)|(^[a-z]+[0-9]+))+$/i) && (i = "alphanum");
          break;
      }
    return wt.sorters[i];
  }
  //work through sort list sorting data
  sort(e, t) {
    var i = this, s = this.table.options.sortOrderReverse ? i.sortList.slice().reverse() : i.sortList, o = [], n = [];
    return this.subscribedExternal("dataSorting") && this.dispatchExternal("dataSorting", i.getSort()), t || i.clearColumnHeaders(), this.table.options.sortMode !== "remote" ? (s.forEach(function(a, r) {
      var d;
      a.column && (d = a.column.modules.sort, d && (d.sorter || (d.sorter = i.findSorter(a.column)), a.params = typeof d.params == "function" ? d.params(a.column.getComponent(), a.dir) : d.params, o.push(a)), t || i.setColumnHeader(a.column, a.dir));
    }), o.length && i._sortItems(e, o)) : t || s.forEach(function(a, r) {
      i.setColumnHeader(a.column, a.dir);
    }), this.subscribedExternal("dataSorted") && (e.forEach((a) => {
      n.push(a.getComponent());
    }), this.dispatchExternal("dataSorted", i.getSort(), n)), e;
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
    e.sort((s, o) => {
      for (var n, a = i; a >= 0; a--) {
        let r = t[a];
        if (n = this._sortRow(s, o, r.column, r.dir, r.params), n !== 0)
          break;
      }
      return n;
    });
  }
  //process individual rows for a sort function on active data
  _sortRow(e, t, i, s, o) {
    var n, a, r = s == "asc" ? e : t, d = s == "asc" ? t : e;
    return e = i.getFieldValue(r.getData()), t = i.getFieldValue(d.getData()), e = typeof e < "u" ? e : "", t = typeof t < "u" ? t : "", n = r.getComponent(), a = d.getComponent(), i.modules.sort.sorter.call(this, e, t, n, a, i.getComponent(), s, o);
  }
};
O(wt, "moduleName", "sort"), //load defaults
O(wt, "sorters", ua);
let Pi = wt;
class fa {
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
class Rs {
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
class ts extends pe {
  constructor(e, t) {
    super(e.table), this.spreadsheetManager = e, this.definition = t, this.title = this.definition.title || "", this.key = this.definition.key || this.definition.title, this.rowCount = this.definition.rows, this.columnCount = this.definition.columns, this.data = this.definition.data || [], this.element = null, this.isActive = !1, this.grid = new fa(this.columnCount, this.rowCount), this.defaultColumnDefinition = { width: 100, headerHozAlign: "center", headerSort: !1 }, this.columnDefinition = Object.assign(this.defaultColumnDefinition, this.options("spreadsheetColumnDefinition")), this.columnDefs = [], this.rowDefs = [], this.columnFields = [], this.columns = [], this.rows = [], this.scrollTop = null, this.scrollLeft = null, this.initialize(), this.dispatchExternal("sheetAdded", this.getComponent());
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
      var s = { _id: t }, o = this.data[i];
      o && o.forEach((n, a) => {
        var r = this.columnFields[a];
        r && (s[r] = n);
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
    return new Rs(this);
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
    var t = [], i, s, o;
    return this.rowDefs.forEach((n) => {
      var a = [];
      this.columnFields.forEach((r) => {
        a.push(n[r]);
      }), t.push(a);
    }), !e && !this.options("spreadsheetOutputFull") && (i = t.map((n) => n.findLastIndex((a) => typeof a < "u") + 1), s = Math.max(...i), o = i.findLastIndex((n) => n > 0) + 1, t = t.slice(0, o), t = t.map((n) => n.slice(0, s))), t;
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
class Ts extends q {
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
    return e.rows || (e.rows = this.options("spreadsheetRows")), e.columns || (e.columns = this.options("spreadsheetColumns")), t = new ts(this, e), this.sheets.push(t), this.element && this.element.appendChild(t.element), t;
  }
  removeSheet(e) {
    var t = this.sheets.indexOf(e), i;
    this.sheets.length > 1 ? t > -1 && (this.sheets.splice(t, 1), e.destroy(), this.activeSheet === e && (i = this.sheets[t - 1] || this.sheets[0], i ? this.loadSheet(i) : this.activeSheet = null)) : console.warn("Unable to remove sheet, at least one sheet must be active");
  }
  lookupSheet(e) {
    return e ? e instanceof ts ? e : e instanceof Rs ? e._sheet : this.sheets.find((t) => t.key === e) || !1 : this.activeSheet;
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
O(Ts, "moduleName", "spreadsheet");
class Ss extends q {
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
    var s, o, n;
    function a(r) {
      o = r;
    }
    typeof i == "function" && (i = i(e, t.getComponent(), a)), i instanceof HTMLElement ? s = i : (s = document.createElement("div"), i === !0 && (t instanceof Wt ? i = t.value : t.definition.field ? this.langBind("columns|" + t.definition.field, (r) => {
      s.innerHTML = i = r || t.definition.title;
    }) : i = t.definition.title), s.innerHTML = i), (i || i === 0 || i === !1) && (s.classList.add("tabulator-tooltip"), s.addEventListener("mousemove", (r) => r.preventDefault()), this.popupInstance = this.popup(s), typeof o == "function" && this.popupInstance.renderCallback(o), n = this.popupInstance.containerEventCoords(e), this.popupInstance.show(n.x + 15, n.y + 15).hideOnBlur(() => {
      this.dispatchExternal("TooltipClosed", t.getComponent()), this.popupInstance = null;
    }), this.dispatchExternal("TooltipOpened", t.getComponent()));
  }
}
O(Ss, "moduleName", "tooltip");
var ma = {
  //is integer
  integer: function(h, e, t) {
    return e === "" || e === null || typeof e > "u" ? !0 : (e = Number(e), !isNaN(e) && isFinite(e) && Math.floor(e) === e);
  },
  //is float
  float: function(h, e, t) {
    return e === "" || e === null || typeof e > "u" ? !0 : (e = Number(e), !isNaN(e) && isFinite(e) && e % 1 !== 0);
  },
  //must be a number
  numeric: function(h, e, t) {
    return e === "" || e === null || typeof e > "u" ? !0 : !isNaN(e);
  },
  //must be a string
  string: function(h, e, t) {
    return e === "" || e === null || typeof e > "u" ? !0 : isNaN(e);
  },
  //must be alphanumeric
  alphanumeric: function(h, e, t) {
    if (e === "" || e === null || typeof e > "u")
      return !0;
    var i = new RegExp(/^[a-z0-9]+$/i);
    return i.test(e);
  },
  //maximum value
  max: function(h, e, t) {
    return e === "" || e === null || typeof e > "u" ? !0 : parseFloat(e) <= t;
  },
  //minimum value
  min: function(h, e, t) {
    return e === "" || e === null || typeof e > "u" ? !0 : parseFloat(e) >= t;
  },
  //starts with  value
  starts: function(h, e, t) {
    return e === "" || e === null || typeof e > "u" ? !0 : String(e).toLowerCase().startsWith(String(t).toLowerCase());
  },
  //ends with  value
  ends: function(h, e, t) {
    return e === "" || e === null || typeof e > "u" ? !0 : String(e).toLowerCase().endsWith(String(t).toLowerCase());
  },
  //minimum string length
  minLength: function(h, e, t) {
    return e === "" || e === null || typeof e > "u" ? !0 : String(e).length >= t;
  },
  //maximum string length
  maxLength: function(h, e, t) {
    return e === "" || e === null || typeof e > "u" ? !0 : String(e).length <= t;
  },
  //in provided value list
  in: function(h, e, t) {
    return e === "" || e === null || typeof e > "u" ? !0 : (typeof t == "string" && (t = t.split("|")), t.indexOf(e) > -1);
  },
  //must match provided regex
  regex: function(h, e, t) {
    if (e === "" || e === null || typeof e > "u")
      return !0;
    var i = new RegExp(t);
    return i.test(e);
  },
  //value must be unique in this column
  unique: function(h, e, t) {
    if (e === "" || e === null || typeof e > "u")
      return !0;
    var i = !0, s = h.getData(), o = h.getColumn()._getSelf();
    return this.table.rowManager.rows.forEach(function(n) {
      var a = n.getData();
      a !== s && e == o.getFieldValue(a) && (i = !1);
    }), i;
  },
  //must have a value
  required: function(h, e, t) {
    return e !== "" && e !== null && typeof e < "u";
  }
};
const Nt = class Nt extends q {
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
    e.definition.validator && (Array.isArray(e.definition.validator) ? e.definition.validator.forEach((o) => {
      s = t._extractValidator(o), s && i.push(s);
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
    var i = typeof e == "function" ? e : Nt.validators[e];
    return i ? {
      type: typeof e == "function" ? "function" : e,
      func: i,
      params: t
    } : (console.warn("Validator Setup Error - No matching validator found:", e), !1);
  }
  validate(e, t, i) {
    var s = this, o = [], n = this.invalidCells.indexOf(t);
    return e && e.forEach((a) => {
      a.func.call(s, t.getComponent(), i, a.params) || o.push({
        type: a.type,
        parameters: a.params
      });
    }), t.modules.validate || (t.modules.validate = {}), o.length ? (t.modules.validate.invalid = o, this.table.options.validationMode !== "manual" && t.getElement().classList.add("tabulator-validation-fail"), n == -1 && this.invalidCells.push(t)) : (t.modules.validate.invalid = !1, t.getElement().classList.remove("tabulator-validation-fail"), n > -1 && this.invalidCells.splice(n, 1)), o.length ? o : !0;
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
O(Nt, "moduleName", "validate"), //load defaults
O(Nt, "validators", ma);
let zi = Nt;
var ui = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  AccessorModule: fi,
  AjaxModule: gi,
  ClipboardModule: bi,
  ColumnCalcsModule: vi,
  DataTreeModule: cs,
  DownloadModule: yi,
  EditModule: wi,
  ExportModule: Ci,
  FilterModule: Ei,
  FormatModule: xi,
  FrozenColumnsModule: us,
  FrozenRowsModule: fs,
  GroupRowsModule: ms,
  HistoryModule: ki,
  HtmlTableImportModule: ps,
  ImportModule: Ri,
  InteractionModule: gs,
  KeybindingsModule: Ti,
  MenuModule: bs,
  MoveColumnsModule: vs,
  MoveRowsModule: Si,
  MutatorModule: _i,
  PageModule: Li,
  PersistenceModule: Di,
  PopupModule: ys,
  PrintModule: ws,
  ReactiveDataModule: Cs,
  ResizeColumnsModule: Es,
  ResizeRowsModule: xs,
  ResizeTableModule: ks,
  ResponsiveLayoutModule: Fi,
  SelectRangeModule: Jt,
  SelectRowModule: Mi,
  SortModule: Pi,
  SpreadsheetModule: Ts,
  TooltipModule: Ss,
  ValidateModule: zi
}), pa = {
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
class _s {
  constructor(e, t, i = {}) {
    this.table = e, this.msgType = t, this.registeredDefaults = Object.assign({}, i);
  }
  register(e, t) {
    this.registeredDefaults[e] = t;
  }
  generate(e, t = {}) {
    var i = Object.assign({}, this.registeredDefaults), s = this.table.options.debugInvalidOptions || t.debugInvalidOptions === !0;
    Object.assign(i, e);
    for (let o in t)
      i.hasOwnProperty(o) || (s && console.warn("Invalid " + this.msgType + " option:", o), i[o] = t.key);
    for (let o in i)
      o in t ? i[o] = t[o] : Array.isArray(i[o]) ? i[o] = Object.assign([], i[o]) : typeof i[o] == "object" && i[o] !== null ? i[o] = Object.assign({}, i[o]) : typeof i[o] > "u" && delete i[o];
    return i;
  }
}
class ii extends pe {
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
    var s = this.rows().indexOf(e), o = e.getElement(), n = 0;
    return new Promise((a, r) => {
      if (s > -1) {
        if (typeof i > "u" && (i = this.table.options.scrollToRowIfVisible), !i && ne.elVisible(o) && (n = ne.elOffset(o).top - ne.elOffset(this.elementVertical).top, n > 0 && n < this.elementVertical.clientHeight - o.offsetHeight))
          return a(), !1;
        switch (typeof t > "u" && (t = this.table.options.scrollToRowPosition), t === "nearest" && (t = this.scrollToRowNearestTop(e) ? "top" : "bottom"), this.scrollToRow(e), t) {
          case "middle":
          case "center":
            this.elementVertical.scrollHeight - this.elementVertical.scrollTop == this.elementVertical.clientHeight ? this.elementVertical.scrollTop = this.elementVertical.scrollTop + (o.offsetTop - this.elementVertical.scrollTop) - (this.elementVertical.scrollHeight - o.offsetTop) / 2 : this.elementVertical.scrollTop = this.elementVertical.scrollTop - this.elementVertical.clientHeight / 2;
            break;
          case "bottom":
            this.elementVertical.scrollHeight - this.elementVertical.scrollTop == this.elementVertical.clientHeight ? this.elementVertical.scrollTop = this.elementVertical.scrollTop - (this.elementVertical.scrollHeight - o.offsetTop) + o.offsetHeight : this.elementVertical.scrollTop = this.elementVertical.scrollTop - this.elementVertical.clientHeight + o.offsetHeight;
            break;
          case "top":
            this.elementVertical.scrollTop = o.offsetTop;
            break;
        }
        a();
      } else
        console.warn("Scroll Error - Row not visible"), r("Scroll Error - Row not visible");
    });
  }
}
class ga extends ii {
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
class ba extends ii {
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
    e && !this.initialized || (this.clear(), this.calcWindowBuffer(), this.scrollLeft = this.elementVertical.scrollLeft, this.vDomScrollPosLeft = this.scrollLeft - this.windowBuffer, this.vDomScrollPosRight = this.scrollLeft + this.elementVertical.clientWidth + this.windowBuffer, this.table.columnManager.columnsByIndex.forEach((o) => {
      var n = {}, a;
      o.visible && (o.modules.frozen || (a = o.getWidth(), n.leftPos = s, n.rightPos = s + a, n.width = a, this.isFitData && (n.fitDataCheck = o.modules.vdomHoz ? o.modules.vdomHoz.fitDataCheck : !0), s + a > this.vDomScrollPosLeft && s < this.vDomScrollPosRight ? (this.leftCol == -1 && (this.leftCol = this.columns.length, this.vDomPadLeft = s), this.rightCol = this.columns.length) : this.leftCol !== -1 && (this.vDomPadRight += a), this.columns.push(o), o.modules.vdomHoz = n, s += a));
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
          let o = t.cells[s];
          i.appendChild(o.getElement()), o.column.reinitializeWidth();
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
      let o = this.columns[s];
      o.modules.vdomHoz.leftPos += i, o.modules.vdomHoz.rightPos += i;
    }
  }
  addColRight() {
    for (var e = !1, t = !0; t; ) {
      let i = this.columns[this.rightCol + 1];
      i && i.modules.vdomHoz.leftPos <= this.vDomScrollPosRight ? (e = !0, this.getVisibleRows().forEach((s) => {
        if (s.type !== "group") {
          var o = s.getCell(i);
          s.getElement().insertBefore(o.getElement(), s.getCell(this.columns[this.rightCol]).getElement().nextSibling), o.cellRendered();
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
          e = !0, this.getVisibleRows().forEach((o) => {
            if (o.type !== "group") {
              var n = o.getCell(i);
              o.getElement().insertBefore(n.getElement(), o.getCell(this.columns[this.leftCol]).getElement()), n.cellRendered();
            }
          }), this.leftCol--, this.getVisibleRows().forEach((o) => {
            o.type !== "group" && (o.modules.vdomHoz.leftCol = this.leftCol);
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
          var o = s.getCell(i);
          try {
            s.getElement().removeChild(o.getElement());
          } catch (n) {
            console.warn("Could not removeColRight", n.message);
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
          var o = s.getCell(i);
          try {
            s.getElement().removeChild(o.getElement());
          } catch (n) {
            console.warn("Could not removeColLeft", n.message);
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
class va extends pe {
  constructor(e) {
    super(e), this.blockHozScrollEvent = !1, this.headersElement = null, this.contentsElement = null, this.rowHeader = null, this.element = null, this.columns = [], this.columnsByIndex = [], this.columnsByField = {}, this.scrollLeft = 0, this.optionsList = new _s(this.table, "column definition", ds), this.redrawBlock = !1, this.redrawBlockUpdate = null, this.renderer = null;
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
      virtual: ba,
      basic: ga
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
    var t = [], i = {}, s = this.table.options.autoColumns === "full" ? e : [e[0]], o = this.table.options.autoColumnsDefinitions;
    if (e && e.length) {
      if (s.forEach((n) => {
        Object.keys(n).forEach((a, r) => {
          let d = n[a], c;
          i[a] ? i[a] !== !0 && typeof d < "u" && (i[a].sorter = this.calculateSorterFromValue(d), i[a] = !0) : (c = {
            field: a,
            title: a,
            sorter: this.calculateSorterFromValue(d)
          }, t.splice(r, 0, c), i[a] = typeof d > "u" ? c : !0);
        });
      }), o)
        switch (typeof o) {
          case "function":
            this.table.options.columns = o.call(this.table, t);
            break;
          case "object":
            Array.isArray(o) ? t.forEach((n) => {
              var a = o.find((r) => r.field === n.field);
              a && Object.assign(n, a);
            }) : t.forEach((n) => {
              o[n.field] && Object.assign(n, o[n.field]);
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
    this.columns = [], this.columnsByIndex = [], this.columnsByField = {}, this.dispatch("columns-loading"), this.dispatchExternal("columnsLoading"), this.table.options.rowHeader && (this.rowHeader = new Ct(this.table.options.rowHeader === !0 ? {} : this.table.options.rowHeader, this, !0), this.columns.push(this.rowHeader), this.headersElement.appendChild(this.rowHeader.getElement()), this.rowHeader.columnRendered()), e.forEach((i, s) => {
      this._addColumn(i);
    }), this._reIndexColumns(), this.dispatch("columns-loaded"), this.subscribedExternal("columnsLoaded") && this.dispatchExternal("columnsLoaded", this.getComponents()), this.rerenderColumns(!1, !0), this.redraw(!0);
  }
  _addColumn(e, t, i) {
    var s = new Ct(e, this), o = s.getElement(), n = i && this.findColumnIndex(i);
    if (t && this.rowHeader && (!i || i === this.rowHeader) && (t = !1, i = this.rowHeader, n = 0), i && n > -1) {
      var a = i.getTopColumn(), r = this.columns.indexOf(a), d = a.getElement();
      t ? (this.columns.splice(r, 0, s), d.parentNode.insertBefore(o, d)) : (this.columns.splice(r + 1, 0, s), d.parentNode.insertBefore(o, d.nextSibling));
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
      if (e instanceof Ct)
        return e;
      if (e instanceof hs)
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
  _moveColumnInArray(e, t, i, s, o) {
    var n = e.indexOf(t), a, r = [];
    n > -1 && (e.splice(n, 1), a = e.indexOf(i), a > -1 ? s && (a = a + 1) : a = n, e.splice(a, 0, t), o && (r = this.chain("column-moving-rows", [t, i, s], null, []) || [], r = r.concat(this.table.rowManager.rows), r.forEach(function(d) {
      if (d.cells.length) {
        var c = d.cells.splice(n, 1)[0];
        d.cells.splice(a, 0, c);
      }
    })));
  }
  scrollToColumn(e, t, i) {
    var s = 0, o = e.getLeftOffset(), n = 0, a = e.getElement();
    return new Promise((r, d) => {
      if (typeof t > "u" && (t = this.table.options.scrollToColumnPosition), typeof i > "u" && (i = this.table.options.scrollToColumnIfVisible), e.visible) {
        switch (t) {
          case "middle":
          case "center":
            n = -this.element.clientWidth / 2;
            break;
          case "right":
            n = a.clientWidth - this.headersElement.clientWidth;
            break;
        }
        if (!i && o > 0 && o + a.offsetWidth < this.element.clientWidth)
          return !1;
        s = o + n, s = Math.max(Math.min(s, this.table.rowManager.element.scrollWidth - this.table.rowManager.element.clientWidth), 0), this.table.rowManager.scrollHorizontal(s), this.scrollHorizontal(s), r();
      } else
        console.warn("Scroll Error - Column not visible"), d("Scroll Error - Column not visible");
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
      var s, o, n;
      i.visible && (s = i.definition.width || 0, o = parseInt(i.minWidth), typeof s == "string" ? s.indexOf("%") > -1 ? n = e / 100 * parseInt(s) : n = parseInt(s) : n = s, t += n > o ? n : o);
    }), t;
  }
  addColumn(e, t, i) {
    return new Promise((s, o) => {
      var n = this._addColumn(e, t, i);
      this._reIndexColumns(), this.dispatch("column-add", e, t, i), this.layoutMode() != "fitColumns" && n.reinitializeWidth(), this.redraw(!0), this.table.rowManager.reinitialize(), this.rerenderColumns(), s(n);
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
    ne.elVisible(this.element) && this.verticalAlignHeaders(), e && (this.table.rowManager.resetScroll(), this.table.rowManager.reinitialize()), this.confirm("table-redrawing", e) || this.layoutRefresh(e), this.dispatch("table-redraw", e), this.table.footerManager.redraw();
  }
}
class ya extends ii {
  constructor(e) {
    super(e), this.verticalFillMode = "fill", this.scrollTop = 0, this.scrollLeft = 0, this.scrollTop = 0, this.scrollLeft = 0;
  }
  clearRows() {
    for (var e = this.tableElement; e.firstChild; ) e.removeChild(e.firstChild);
    e.scrollTop = 0, e.scrollLeft = 0, e.style.minWidth = "", e.style.minHeight = "", e.style.display = "", e.style.visibility = "";
  }
  renderRows() {
    var e = this.tableElement, t = !0, i = document.createDocumentFragment(), s = this.rows();
    s.forEach((o, n) => {
      this.styleRow(o, n), o.initialize(!1, !0), o.type !== "group" && (t = !1), i.appendChild(o.getElement());
    }), e.appendChild(i), s.forEach((o) => {
      o.rendered(), o.heightInitialized || o.calcHeight(!0);
    }), s.forEach((o) => {
      o.heightInitialized || o.setCellHeight();
    }), t ? e.style.minWidth = this.table.columnManager.getWidth() + "px" : e.style.minWidth = "";
  }
  rerenderRows(e) {
    this.clearRows(), e && e(), this.renderRows(), this.rows().length || this.table.rowManager.tableEmpty();
  }
  scrollToRowNearestTop(e) {
    var t = ne.elOffset(e.getElement()).top;
    return !(Math.abs(this.elementVertical.scrollTop - t) > Math.abs(this.elementVertical.scrollTop + this.elementVertical.clientHeight - t));
  }
  scrollToRow(e) {
    var t = e.getElement();
    this.elementVertical.scrollTop = ne.elOffset(t).top - ne.elOffset(this.elementVertical).top + this.elementVertical.scrollTop;
  }
  visibleRows(e) {
    return this.rows();
  }
}
class wa extends ii {
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
    for (var t = this.elementVertical.scrollTop, i = !1, s = !1, o = this.table.rowManager.scrollLeft, n = this.rows(), a = this.vDomTop; a <= this.vDomBottom; a++)
      if (n[a]) {
        var r = t - n[a].getElement().offsetTop;
        if (s === !1 || Math.abs(r) < s)
          s = r, i = a;
        else
          break;
      }
    n.forEach((d) => {
      d.deinitializeHeight();
    }), e && e(), this.rows().length ? this._virtualRenderFill(i === !1 ? this.rows.length - 1 : i, !0, s || 0) : (this.clear(), this.table.rowManager.tableEmpty()), this.scrollColumns(o);
  }
  scrollColumns(e) {
    this.table.rowManager.scrollHorizontal(e);
  }
  scrollRows(e, t) {
    var i = e - this.vDomScrollPosTop, s = e - this.vDomScrollPosBottom, o = this.vDomWindowBuffer * 2, n = this.rows();
    if (this.scrollTop = e, -i > o || s > o) {
      var a = this.table.rowManager.scrollLeft;
      this._virtualRenderFill(Math.floor(this.elementVertical.scrollTop / this.elementVertical.scrollHeight * n.length)), this.scrollColumns(a);
    } else
      t ? (i < 0 && this._addTopRow(n, -i), s < 0 && (this.vDomScrollHeight - this.scrollTop > this.vDomWindowBuffer ? this._removeBottomRow(n, -s) : this.vDomScrollPosBottom = this.scrollTop)) : (s >= 0 && this._addBottomRow(n, s), i >= 0 && (this.scrollTop > this.vDomWindowBuffer ? this._removeTopRow(n, i) : this.vDomScrollPosTop = this.scrollTop));
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
    var t = this.elementVertical.scrollTop, i = this.elementVertical.clientHeight + t, s = !1, o = 0, n = 0, a = this.rows();
    if (e)
      o = this.vDomTop, n = this.vDomBottom;
    else
      for (var r = this.vDomTop; r <= this.vDomBottom; r++)
        if (a[r])
          if (s)
            if (i - a[r].getElement().offsetTop >= 0)
              n = r;
            else
              break;
          else if (t - a[r].getElement().offsetTop >= 0)
            o = r;
          else if (s = !0, i - a[r].getElement().offsetTop >= 0)
            n = r;
          else
            break;
    return a.slice(o, n + 1);
  }
  //////////////////////////////////////
  //////// Internal Rendering //////////
  //////////////////////////////////////
  //full virtual render
  _virtualRenderFill(e, t, i) {
    var s = this.tableElement, o = this.elementVertical, n = 0, a = 0, r = 0, d = 0, c = 0, u = 0, p = this.rows(), v = p.length, y = 0, L, _, x = [], g = 0, f = 0, D = this.table.rowManager.fixedHeight, P = this.elementVertical.clientHeight, S = this.table.options.rowHeight, I = !0;
    if (e = e || 0, i = i || 0, !e)
      this.clear();
    else {
      for (; s.firstChild; ) s.removeChild(s.firstChild);
      d = (v - e + 1) * this.vDomRowHeight, d < P && (e -= Math.ceil((P - d) / this.vDomRowHeight), e < 0 && (e = 0)), n = Math.min(Math.max(Math.floor(this.vDomWindowBuffer / this.vDomRowHeight), this.vDomWindowMinMarginRows), e), e -= n;
    }
    if (v && ne.elVisible(this.elementVertical)) {
      for (this.vDomTop = e, this.vDomBottom = e - 1, D || this.table.options.maxHeight ? (S && (f = P / S + this.vDomWindowBuffer / S), f = Math.max(this.vDomWindowMinTotalRows, Math.ceil(f))) : f = v; (f == v || a <= P + this.vDomWindowBuffer || g < this.vDomWindowMinTotalRows) && this.vDomBottom < v - 1; ) {
        for (x = [], _ = document.createDocumentFragment(), u = 0; u < f && this.vDomBottom < v - 1; )
          y = this.vDomBottom + 1, L = p[y], this.styleRow(L, y), L.initialize(!1, !0), !L.heightInitialized && !this.table.options.rowHeight && L.clearCellHeight(), _.appendChild(L.getElement()), x.push(L), this.vDomBottom++, u++;
        if (!x.length)
          break;
        s.appendChild(_), x.forEach((z) => {
          z.rendered(), z.heightInitialized || z.calcHeight(!0);
        }), x.forEach((z) => {
          z.heightInitialized || z.setCellHeight();
        }), x.forEach((z) => {
          r = z.getHeight(), g < n ? c += r : a += r, r > this.vDomWindowBuffer && (this.vDomWindowBuffer = r * 2), g++;
        }), I = this.table.rowManager.adjustTableSize(), P = this.elementVertical.clientHeight, I && (D || this.table.options.maxHeight) && (S = a / g, f = Math.max(this.vDomWindowMinTotalRows, Math.ceil(P / S + this.vDomWindowBuffer / S)));
      }
      e ? (this.vDomTopPad = t ? this.vDomRowHeight * this.vDomTop + i : this.scrollTop - c, this.vDomBottomPad = this.vDomBottom == v - 1 ? 0 : Math.max(this.vDomScrollHeight - this.vDomTopPad - a - c, 0)) : (this.vDomTopPad = 0, this.vDomRowHeight = Math.floor((a + c) / g), this.vDomBottomPad = this.vDomRowHeight * (v - this.vDomBottom - 1), this.vDomScrollHeight = c + a + this.vDomBottomPad - P), s.style.paddingTop = this.vDomTopPad + "px", s.style.paddingBottom = this.vDomBottomPad + "px", t && (this.scrollTop = this.vDomTopPad + c + i - (this.elementVertical.scrollWidth > this.elementVertical.clientWidth ? this.elementVertical.offsetHeight - P : 0)), this.scrollTop = Math.min(this.scrollTop, this.elementVertical.scrollHeight - P), this.elementVertical.scrollWidth > this.elementVertical.clientWidth && t && (this.scrollTop += this.elementVertical.offsetHeight - P), this.vDomScrollPosTop = this.scrollTop, this.vDomScrollPosBottom = this.scrollTop, o.scrollTop = this.scrollTop, this.dispatch("render-virtual-fill");
    }
  }
  _addTopRow(e, t) {
    for (var i = this.tableElement, s = [], o = 0, n = this.vDomTop - 1, a = 0, r = !0; r; )
      if (this.vDomTop) {
        let d = e[n], c, u;
        d && a < this.vDomMaxRenderChain ? (c = d.getHeight() || this.vDomRowHeight, u = d.initialized, t >= c ? (this.styleRow(d, n), i.insertBefore(d.getElement(), i.firstChild), (!d.initialized || !d.heightInitialized) && s.push(d), d.initialize(), u || (c = d.getElement().offsetHeight, c > this.vDomWindowBuffer && (this.vDomWindowBuffer = c * 2)), t -= c, o += c, this.vDomTop--, n--, a++) : r = !1) : r = !1;
      } else
        r = !1;
    for (let d of s)
      d.clearCellHeight();
    this._quickNormalizeRowHeight(s), o && (this.vDomTopPad -= o, this.vDomTopPad < 0 && (this.vDomTopPad = n * this.vDomRowHeight), n < 1 && (this.vDomTopPad = 0), i.style.paddingTop = this.vDomTopPad + "px", this.vDomScrollPosTop -= o);
  }
  _removeTopRow(e, t) {
    for (var i = [], s = 0, o = 0, n = !0; n; ) {
      let a = e[this.vDomTop], r;
      a && o < this.vDomMaxRenderChain ? (r = a.getHeight() || this.vDomRowHeight, t >= r ? (this.vDomTop++, t -= r, s += r, i.push(a), o++) : n = !1) : n = !1;
    }
    for (let a of i) {
      let r = a.getElement();
      r.parentNode && r.parentNode.removeChild(r);
    }
    s && (this.vDomTopPad += s, this.tableElement.style.paddingTop = this.vDomTopPad + "px", this.vDomScrollPosTop += this.vDomTop ? s : s + this.vDomWindowBuffer);
  }
  _addBottomRow(e, t) {
    for (var i = this.tableElement, s = [], o = 0, n = this.vDomBottom + 1, a = 0, r = !0; r; ) {
      let d = e[n], c, u;
      d && a < this.vDomMaxRenderChain ? (c = d.getHeight() || this.vDomRowHeight, u = d.initialized, t >= c ? (this.styleRow(d, n), i.appendChild(d.getElement()), (!d.initialized || !d.heightInitialized) && s.push(d), d.initialize(), u || (c = d.getElement().offsetHeight, c > this.vDomWindowBuffer && (this.vDomWindowBuffer = c * 2)), t -= c, o += c, this.vDomBottom++, n++, a++) : r = !1) : r = !1;
    }
    for (let d of s)
      d.clearCellHeight();
    this._quickNormalizeRowHeight(s), o && (this.vDomBottomPad -= o, (this.vDomBottomPad < 0 || n == e.length - 1) && (this.vDomBottomPad = 0), i.style.paddingBottom = this.vDomBottomPad + "px", this.vDomScrollPosBottom += o);
  }
  _removeBottomRow(e, t) {
    for (var i = [], s = 0, o = 0, n = !0; n; ) {
      let a = e[this.vDomBottom], r;
      a && o < this.vDomMaxRenderChain ? (r = a.getHeight() || this.vDomRowHeight, t >= r ? (this.vDomBottom--, t -= r, s += r, i.push(a), o++) : n = !1) : n = !1;
    }
    for (let a of i) {
      let r = a.getElement();
      r.parentNode && r.parentNode.removeChild(r);
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
class Ca extends pe {
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
      if (e instanceof ye)
        return e;
      if (e instanceof ei)
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
    return new Promise((s, o) => {
      t && this.getDisplayRows().length ? this.table.options.pagination ? this._setDataActual(e, !0) : this.reRenderInPosition(() => {
        this._setDataActual(e);
      }) : (this.table.options.autoColumns && i && this.table.initialized && this.table.columnManager.generateColumnsFromRowData(e), this.resetScroll(), this._setDataActual(e)), s();
    });
  }
  _setDataActual(e, t) {
    this.dispatchExternal("dataProcessing", e), this._wipeElements(), Array.isArray(e) ? (this.dispatch("data-processing", e), e.forEach((i, s) => {
      if (i && typeof i == "object") {
        var o = new ye(i, this);
        this.rows.push(o);
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
    s > -1 && this.activeRows.splice(s, 1), i > -1 && this.rows.splice(i, 1), this.setActiveRows(this.activeRows), this.displayRowIterator((o) => {
      var n = o.indexOf(e);
      n > -1 && o.splice(n, 1);
    }), t || this.reRenderInPosition(), this.regenerateRowPositions(), this.dispatchExternal("rowDeleted", e.getComponent()), this.displayRowsCount || this.tableEmpty(), this.subscribedExternal("dataChanged") && this.dispatchExternal("dataChanged", this.getData());
  }
  addRow(e, t, i, s) {
    var o = this.addRowActual(e, t, i, s);
    return o;
  }
  //add multiple rows
  addRows(e, t, i, s) {
    var o = [];
    return new Promise((n, a) => {
      t = this.findAddRowPos(t), Array.isArray(e) || (e = [e]), (typeof i > "u" && t || typeof i < "u" && !t) && e.reverse(), e.forEach((r, d) => {
        var c = this.addRow(r, t, i, !0);
        o.push(c), this.dispatch("row-added", c, r, t, i);
      }), this.refreshActiveData(s ? "displayPipeline" : !1, !1, !0), this.regenerateRowPositions(), this.displayRowsCount && this._clearPlaceholder(), n(o);
    });
  }
  findAddRowPos(e) {
    return typeof e > "u" && (e = this.table.options.addRowPos), e === "pos" && (e = !0), e === "bottom" && (e = !1), e;
  }
  addRowActual(e, t, i, s) {
    var o = e instanceof ye ? e : new ye(e || {}, this), n = this.findAddRowPos(t), a = -1, r, d;
    return i || (d = this.chain("row-adding-position", [o, n], null, { index: i, top: n }), i = d.index, n = d.top), typeof i < "u" && (i = this.findRow(i)), i = this.chain("row-adding-index", [o, i, n], null, i), i && (a = this.rows.indexOf(i)), i && a > -1 ? (r = this.activeRows.indexOf(i), this.displayRowIterator(function(c) {
      var u = c.indexOf(i);
      u > -1 && c.splice(n ? u : u + 1, 0, o);
    }), r > -1 && this.activeRows.splice(n ? r : r + 1, 0, o), this.rows.splice(n ? a : a + 1, 0, o)) : n ? (this.displayRowIterator(function(c) {
      c.unshift(o);
    }), this.activeRows.unshift(o), this.rows.unshift(o)) : (this.displayRowIterator(function(c) {
      c.push(o);
    }), this.activeRows.push(o), this.rows.push(o)), this.setActiveRows(this.activeRows), this.dispatchExternal("rowAdded", o.getComponent()), this.subscribedExternal("dataChanged") && this.dispatchExternal("dataChanged", this.table.rowManager.getData()), s || this.reRenderInPosition(), o;
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
    var o, n, a, r;
    if (t !== i && (o = e.indexOf(t), o > -1 && (e.splice(o, 1), n = e.indexOf(i), n > -1 ? s ? e.splice(n + 1, 0, t) : e.splice(n, 0, t) : e.splice(o, 0, t)), e === this.getDisplayRows())) {
      a = o < n ? o : n, r = n > o ? n : o + 1;
      for (let d = a; d <= r; d++)
        e[d] && this.styleRow(e[d], d);
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
    return i !== !1 && i < this.displayRowsCount - 1 && (s = this.getDisplayRows()[i + 1]), s && (!(s instanceof ye) || s.type != "row") ? this.nextDisplayRow(s, t) : s;
  }
  prevDisplayRow(e, t) {
    var i = this.getDisplayRowIndex(e), s = !1;
    return i && (s = this.getDisplayRows()[i - 1]), t && s && (!(s instanceof ye) || s.type != "row") ? this.prevDisplayRow(s, t) : s;
  }
  findRowIndex(e, t) {
    var i;
    return e = this.findRow(e), e && (i = t.indexOf(e), i > -1) ? i : !1;
  }
  getData(e, t) {
    var i = [], s = this.getRows(e);
    return s.forEach(function(o) {
      o.type == "row" && i.push(o.getData(t || "data"));
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
    var s = this.table, o = "", n = 0, a = ["all", "dataPipeline", "display", "displayPipeline", "end"];
    if (!this.table.destroyed) {
      if (typeof e == "function")
        if (n = this.dataPipeline.findIndex((r) => r.handler === e), n > -1)
          o = "dataPipeline", t && (n == this.dataPipeline.length - 1 ? o = "display" : n++);
        else if (n = this.displayPipeline.findIndex((r) => r.handler === e), n > -1)
          o = "displayPipeline", t && (n == this.displayPipeline.length - 1 ? o = "end" : n++);
        else {
          console.error("Unable to refresh data, invalid handler provided", e);
          return;
        }
      else
        o = e || "all", n = 0;
      if (this.redrawBlock) {
        (!this.redrawBlockRestoreConfig || this.redrawBlockRestoreConfig && (this.redrawBlockRestoreConfig.stage === o && n < this.redrawBlockRestoreConfig.index || a.indexOf(o) < a.indexOf(this.redrawBlockRestoreConfig.stage))) && (this.redrawBlockRestoreConfig = {
          handler: e,
          skipStage: t,
          renderInPosition: i,
          stage: o,
          index: n
        });
        return;
      } else
        ne.elVisible(this.element) ? i ? this.reRenderInPosition(this.refreshPipelines.bind(this, e, o, n, i)) : (this.refreshPipelines(e, o, n, i), e || this.table.columnManager.renderer.renderColumns(), this.renderTable(), s.options.layoutColumnsOnNewData && this.table.columnManager.redraw(!0)) : this.refreshPipelines(e, o, n, i), this.dispatch("data-refreshed");
    }
  }
  refreshPipelines(e, t, i, s) {
    switch (this.dispatch("data-refreshing"), (!e || !this.activeRowsPipeline[0]) && (this.activeRowsPipeline[0] = this.rows.slice(0)), t) {
      case "all":
      case "dataPipeline":
        for (let o = i; o < this.dataPipeline.length; o++) {
          let n = this.dataPipeline[o].handler(this.activeRowsPipeline[o].slice(0));
          this.activeRowsPipeline[o + 1] = n || this.activeRowsPipeline[o].slice(0);
        }
        this.setActiveRows(this.activeRowsPipeline[this.dataPipeline.length]);
      case "display":
        i = 0, this.resetDisplayRows();
      case "displayPipeline":
        for (let o = i; o < this.displayPipeline.length; o++) {
          let n = this.displayPipeline[o].handler((o ? this.getDisplayRows(o - 1) : this.activeRows).slice(0), s);
          this.setDisplayRows(n || this.getDisplayRows(o - 1).slice(0), o);
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
      virtual: wa,
      basic: ya
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
        const o = "calc(100% - " + s + "px)";
        this.element.style.minHeight = t || "calc(100% - " + s + "px)", this.element.style.height = o, this.element.style.maxHeight = o;
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
class Ea extends pe {
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
class xa extends pe {
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
    i = i.filter((o) => {
      var n = s[e];
      return o !== e && (!n || n && !n.includes(o));
    }), i.forEach((o) => {
      var n = this.pseudoTrackers[o].target;
      this.pseudoTrackers[o].target && (this.dispatch(o + "-mouseleave", t, n), this.pseudoTrackers[o].target = null);
    });
  }
  bindSubscriptionWatchers() {
    var e = Object.keys(this.listeners), t = Object.values(this.componentMap);
    for (let i of t)
      for (let s of e) {
        let o = i + "-" + s;
        this.subscriptionChange(o, this.subscriptionChanged.bind(this, i, s));
      }
    this.subscribe("table-destroy", this.clearWatchers.bind(this));
  }
  subscriptionChanged(e, t, i) {
    var s = this.listeners[t].components, o = s.indexOf(e), n = !1;
    i ? o === -1 && (s.push(e), n = !0) : this.subscribed(e + "-" + t) || o > -1 && (s.splice(o, 1), n = !0), (t === "mouseenter" || t === "mouseleave") && !this.pseudoTracking && this.bindPseudoEvents(), n && this.updateEventListeners();
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
      let o = s.classList ? [...s.classList] : [];
      if (o.filter((r) => this.abortClasses.includes(r)).length)
        break;
      let a = o.filter((r) => i.includes(r));
      for (let r of a)
        t[this.componentMap[r]] || (t[this.componentMap[r]] = s);
    }
    return t.group && t.group === t.row && delete t.row, t;
  }
  bindComponents(e, t) {
    var i = Object.keys(t).reverse(), s = this.listeners[e], o = {}, n = {}, a = {};
    for (let r of i) {
      let d, c = t[r], u = this.previousTargets[r];
      if (u && u.target === c)
        d = u.component;
      else
        switch (r) {
          case "row":
          case "group":
            (s.components.includes("row") || s.components.includes("cell") || s.components.includes("group")) && (d = this.table.rowManager.getVisibleRows(!0).find((v) => v.getElement() === c), t.row && t.row.parentNode && t.row.parentNode.closest(".tabulator-row") && (t[r] = !1));
            break;
          case "column":
            s.components.includes("column") && (d = this.table.columnManager.findColumn(c));
            break;
          case "cell":
            s.components.includes("cell") && (o.row instanceof ye ? d = o.row.findCell(c) : t.row && console.warn("Event Target Lookup Error - The row this cell is attached to cannot be found, has the table been reinitialized without being destroyed first?"));
            break;
        }
      d && (o[r] = d, a[r] = {
        target: c,
        component: d
      });
    }
    return this.previousTargets = a, Object.keys(t).forEach((r) => {
      let d = o[r];
      n[r] = d;
    }), n;
  }
  triggerEvents(e, t, i) {
    var s = this.listeners[e];
    for (let o in i)
      i[o] && s.components.includes(o) && this.dispatch(o + "-" + e, t, i[o]);
  }
  clearWatchers() {
    for (let e in this.listeners) {
      let t = this.listeners[e];
      t.handler && (this.el.removeEventListener(e, t.handler), t.handler = null);
    }
  }
}
class ka {
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
class Ra extends pe {
  constructor(e) {
    super(e), this.requestOrder = 0, this.loading = !1;
  }
  initialize() {
  }
  load(e, t, i, s, o, n) {
    var a = ++this.requestOrder;
    if (this.table.destroyed)
      return Promise.resolve();
    if (this.dispatchExternal("dataLoading", e), e && (e.indexOf("{") == 0 || e.indexOf("[") == 0) && (e = JSON.parse(e)), this.confirm("data-loading", [e, t, i, o])) {
      this.loading = !0, o || this.alertLoader(), t = this.chain("data-params", [e, i, o], t || {}, t || {}), t = this.mapParams(t, this.table.options.dataSendParams);
      var r = this.chain("data-load", [e, t, i, o], !1, Promise.resolve([]));
      return r.then((d) => {
        if (this.table.destroyed)
          console.warn("Data Load Response Blocked - Table has been destroyed");
        else {
          !Array.isArray(d) && typeof d == "object" && (d = this.mapParams(d, this.objectInvert(this.table.options.dataReceiveParams)));
          var c = this.chain("data-loaded", [d], null, d);
          a == this.requestOrder ? (this.clearAlert(), c !== !1 && (this.dispatchExternal("dataLoaded", c), this.table.rowManager.setData(c, s, typeof n > "u" ? !s : n))) : console.warn("Data Load Response Blocked - An active data load request was blocked by an attempt to change table data while the request was being made");
        }
      }).catch((d) => {
        console.error("Data Load Error: ", d), this.dispatchExternal("dataLoadError", d), o || this.alertError(), setTimeout(() => {
          this.clearAlert();
        }, this.table.options.dataLoaderErrorTimeout);
      }).finally(() => {
        this.loading = !1;
      });
    } else
      return this.dispatchExternal("dataLoaded", e), e || (e = []), this.table.rowManager.setData(e, s, typeof n > "u" ? !s : n), Promise.resolve();
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
class Ta {
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
    return this.events[t] && this.events[t].forEach((s, o) => {
      let n = s.apply(this.table, e);
      o || (i = n);
    }), i;
  }
  _debugDispatch() {
    var e = Array.from(arguments), t = e[0];
    return e[0] = "ExternalEvent:" + e[0], (this.debug === !0 || this.debug.includes(t)) && console.log(...e), this._dispatch(...arguments);
  }
}
class Sa {
  constructor(e) {
    this.events = {}, this.subscriptionNotifiers = {}, this.dispatch = e ? this._debugDispatch.bind(this) : this._dispatch.bind(this), this.chain = e ? this._debugChain.bind(this) : this._chain.bind(this), this.confirm = e ? this._debugConfirm.bind(this) : this._confirm.bind(this), this.debug = e;
  }
  subscriptionChange(e, t) {
    this.subscriptionNotifiers[e] || (this.subscriptionNotifiers[e] = []), this.subscriptionNotifiers[e].push(t), this.subscribed(e) && this._notifySubscriptionChange(e, !0);
  }
  subscribe(e, t, i = 1e4) {
    this.events[e] || (this.events[e] = []), this.events[e].push({ callback: t, priority: i }), this.events[e].sort((s, o) => s.priority - o.priority), this._notifySubscriptionChange(e, !0);
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
    var o = i;
    return Array.isArray(t) || (t = [t]), this.subscribed(e) ? (this.events[e].forEach((n, a) => {
      o = n.callback.apply(this, t.concat([o]));
    }), o) : typeof s == "function" ? s() : s;
  }
  _confirm(e, t) {
    var i = !1;
    return Array.isArray(t) || (t = [t]), this.subscribed(e) && this.events[e].forEach((s, o) => {
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
class _a extends pe {
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
class La extends pe {
  constructor(e) {
    super(e), this.deps = {}, this.props = {};
  }
  initialize() {
    this.deps = Object.assign({}, this.options("dependencies"));
  }
  lookup(e, t, i) {
    if (Array.isArray(e)) {
      for (const o of e) {
        var s = this.lookup(o, t, !0);
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
function Da(h, e) {
  e && this.table.columnManager.renderer.reinitializeColumnWidths(h), this.table.options.responsiveLayout && this.table.modExists("responsiveLayout", !0) && this.table.modules.responsiveLayout.update();
}
function is(h, e) {
  h.forEach(function(t) {
    t.reinitializeWidth();
  }), this.table.options.responsiveLayout && this.table.modExists("responsiveLayout", !0) && this.table.modules.responsiveLayout.update();
}
function Fa(h, e) {
  var t = 0, i = this.table.rowManager.element.clientWidth, s = 0, o = !1;
  h.forEach((n, a) => {
    n.widthFixed || n.reinitializeWidth(), (this.table.options.responsiveLayout ? n.modules.responsive.visible : n.visible) && (o = n), n.visible && (t += n.getWidth());
  }), o ? (s = i - t + o.getWidth(), this.table.options.responsiveLayout && this.table.modExists("responsiveLayout", !0) && (o.setWidth(0), this.table.modules.responsiveLayout.update()), s > 0 ? o.setWidth(s) : o.reinitializeWidth()) : this.table.options.responsiveLayout && this.table.modExists("responsiveLayout", !0) && this.table.modules.responsiveLayout.update();
}
function Ma(h, e) {
  var t = this.table.rowManager.element.getBoundingClientRect().width, i = 0, s = 0, o = 0, n = 0, a = [], r = [], d = 0, c = 0, u = 0;
  function p(y) {
    var L;
    return typeof y == "string" ? y.indexOf("%") > -1 ? L = t / 100 * parseInt(y) : L = parseInt(y) : L = y, L;
  }
  function v(y, L, _, x) {
    var g = [], f = 0, D = 0, P = 0, S = o, I = 0, z = 0, V = [];
    function A(M) {
      return _ * (M.column.definition.widthGrow || 1);
    }
    function w(M) {
      return p(M.width) - _ * (M.column.definition.widthShrink || 0);
    }
    return y.forEach(function(M, Z) {
      var Q = x ? w(M) : A(M);
      M.column.minWidth >= Q ? g.push(M) : M.column.maxWidth && M.column.maxWidth < Q ? (M.width = M.column.maxWidth, L -= M.column.maxWidth, S -= x ? M.column.definition.widthShrink || 1 : M.column.definition.widthGrow || 1, S && (_ = Math.floor(L / S))) : (V.push(M), z += x ? M.column.definition.widthShrink || 1 : M.column.definition.widthGrow || 1);
    }), g.length ? (g.forEach(function(M) {
      f += x ? M.width - M.column.minWidth : M.column.minWidth, M.width = M.column.minWidth;
    }), D = L - f, P = z ? Math.floor(D / z) : D, I = v(V, D, P, x)) : (I = z ? L - Math.floor(L / z) * z : L, V.forEach(function(M) {
      M.width = x ? w(M) : A(M);
    })), I;
  }
  this.table.options.responsiveLayout && this.table.modExists("responsiveLayout", !0) && this.table.modules.responsiveLayout.update(), this.table.rowManager.element.scrollHeight > this.table.rowManager.element.clientHeight && (t -= this.table.rowManager.element.offsetWidth - this.table.rowManager.element.clientWidth), h.forEach(function(y) {
    var L, _, x;
    y.visible && (L = y.definition.width, _ = parseInt(y.minWidth), L ? (x = p(L), i += x > _ ? x : _, y.definition.widthShrink && (r.push({
      column: y,
      width: x > _ ? x : _
    }), d += y.definition.widthShrink)) : (a.push({
      column: y,
      width: 0
    }), o += y.definition.widthGrow || 1));
  }), s = t - i, n = Math.floor(s / o), u = v(a, s, n, !1), a.length && u > 0 && (a[a.length - 1].width += u), a.forEach(function(y) {
    s -= y.width;
  }), c = Math.abs(u) + s, c > 0 && d && (u = v(r, c, Math.floor(c / d), !0)), u && r.length && (r[r.length - 1].width -= u), a.forEach(function(y) {
    y.column.setWidth(y.width);
  }), r.forEach(function(y) {
    y.column.setWidth(y.width);
  });
}
var Pa = {
  fitData: Da,
  fitDataFill: is,
  fitDataTable: is,
  fitDataStretch: Fa,
  fitColumns: Ma
};
const St = class St extends q {
  constructor(e) {
    super(e, "layout"), this.mode = null, this.registerTableOption("layout", "fitData"), this.registerTableOption("layoutColumnsOnNewData", !1), this.registerColumnOption("widthGrow"), this.registerColumnOption("widthShrink");
  }
  //initialize layout system
  initialize() {
    var e = this.table.options.layout;
    St.modes[e] ? this.mode = e : (console.warn("Layout Error - invalid mode set, defaulting to 'fitData' : " + e), this.mode = "fitData"), this.table.element.setAttribute("tabulator-layout", this.mode), this.subscribe("column-init", this.initializeColumn.bind(this));
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
    this.dispatch("layout-refreshing"), St.modes[this.mode].call(this, this.table.columnManager.columnsByIndex, e), t && this.table.rowManager.normalizeHeight(!0), this.dispatch("layout-refreshed");
  }
};
O(St, "moduleName", "layout"), //load defaults
O(St, "modes", Pa);
let Ai = St;
var za = {
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
const Vt = class Vt extends q {
  constructor(e) {
    super(e), this.locale = "default", this.lang = !1, this.bindings = {}, this.langList = {}, this.registerTableOption("locale", !1), this.registerTableOption("langs", {});
  }
  initialize() {
    this.langList = ne.deepClone(Vt.langs), this.table.options.columnDefaults.headerFilterPlaceholder !== !1 && this.setHeaderFilterPlaceholder(this.table.options.columnDefaults.headerFilterPlaceholder);
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
      for (var o in i)
        typeof i[o] == "object" ? (s[o] || (s[o] = {}), t(i[o], s[o])) : s[o] = i[o];
    }
    if (e === !0 && navigator.language && (e = navigator.language.toLowerCase()), e && !this.langList[e]) {
      let i = e.split("-")[0];
      this.langList[i] ? (console.warn("Localization Error - Exact matching locale not found, using closest match: ", e, i), e = i) : (console.warn("Localization Error - Matching locale not found, using default: ", e), e = "default");
    }
    this.locale = e, this.lang = ne.deepClone(this.langList.default || {}), e != "default" && t(this.langList[e], this.lang), this.dispatchExternal("localized", this.locale, this.lang), this._executeBindings();
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
    var i = t ? e + "|" + t : e, s = i.split("|"), o = this._getLangElement(s, this.locale);
    return o || "";
  }
  //traverse langs object and find localized copy
  _getLangElement(e, t) {
    var i = this.lang;
    return e.forEach(function(s) {
      var o;
      i && (o = i[s], typeof o < "u" ? i = o : i = !1);
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
O(Vt, "moduleName", "localize"), //load defaults
O(Vt, "langs", za);
let Oi = Vt;
class Ls extends q {
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
    var o = this.getConnections(e);
    o.forEach((n) => {
      n.tableComms(this.table.element, t, i, s);
    }), !o.length && e && console.warn("Table Connection Error - No tables matching selector found", e);
  }
  receive(e, t, i, s) {
    if (this.table.modExists(t))
      return this.table.modules[t].commsReceived(e, i, s);
    console.warn("Inter-table Comms Error - no such module:", t);
  }
}
O(Ls, "moduleName", "comms");
var Aa = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  CommsModule: Ls,
  LayoutModule: Ai,
  LocalizeModule: Oi
});
const Te = class Te {
  static findTable(e) {
    var t = Te.registry.lookupTable(e, !0);
    return Array.isArray(t) && !t.length ? !1 : t;
  }
};
O(Te, "registry", {
  tables: [],
  register(e) {
    Te.registry.tables.push(e);
  },
  deregister(e) {
    var t = Te.registry.tables.indexOf(e);
    t > -1 && Te.registry.tables.splice(t, 1);
  },
  lookupTable(e, t) {
    var i = [], s, o;
    if (typeof e == "string") {
      if (s = document.querySelectorAll(e), s.length)
        for (var n = 0; n < s.length; n++)
          o = Te.registry.matchElement(s[n]), o && i.push(o);
    } else typeof HTMLElement < "u" && e instanceof HTMLElement || e instanceof Te ? (o = Te.registry.matchElement(e), o && i.push(o)) : Array.isArray(e) ? e.forEach(function(a) {
      i = i.concat(Te.registry.lookupTable(a));
    }) : t || console.warn("Table Connection Error - Invalid Selector", e);
    return i;
  },
  matchElement(e) {
    return Te.registry.tables.find(function(t) {
      return e instanceof Te ? t === e : t.element === e;
    });
  }
});
let Hi = Te;
const te = class te extends Hi {
  constructor() {
    super();
  }
  static initializeModuleBinder(e) {
    te.modulesRegistered || (te.modulesRegistered = !0, te._registerModules(Aa, !0), e && te._registerModules(e));
  }
  static _extendModule(e, t, i) {
    if (te.moduleBindings[e]) {
      var s = te.moduleBindings[e][t];
      if (s)
        if (typeof i == "object")
          for (let o in i)
            s[o] = i[o];
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
    }), te._registerModule(i);
  }
  static _registerModule(e) {
    Array.isArray(e) || (e = [e]), e.forEach((t) => {
      te._registerModuleBinding(t), te._registerModuleExtensions(t);
    });
  }
  static _registerModuleBinding(e) {
    e.moduleName ? te.moduleBindings[e.moduleName] = e : console.error("Unable to bind module, no moduleName defined", e.moduleName);
  }
  static _registerModuleExtensions(e) {
    var t = e.moduleExtensions;
    if (e.moduleExtensions)
      for (let i in t) {
        let s = t[i];
        if (te.moduleBindings[i])
          for (let o in s)
            te._extendModule(i, o, s[o]);
        else {
          te.moduleExtensions[i] || (te.moduleExtensions[i] = {});
          for (let o in s)
            te.moduleExtensions[i][o] || (te.moduleExtensions[i][o] = {}), Object.assign(te.moduleExtensions[i][o], s[o]);
        }
      }
    te._extendModuleFromQueue(e);
  }
  static _extendModuleFromQueue(e) {
    var t = te.moduleExtensions[e.moduleName];
    if (t)
      for (let i in t)
        te._extendModule(e.moduleName, i, t[i]);
  }
  //ensure that module are bound to instantiated function
  _bindModules() {
    var e = [], t = [], i = [];
    this.modules = {};
    for (var s in te.moduleBindings) {
      let o = te.moduleBindings[s], n = new o(this);
      this.modules[s] = n, o.prototype.moduleCore ? this.modulesCore.push(n) : o.moduleInitOrder ? o.moduleInitOrder < 0 ? e.push(n) : t.push(n) : i.push(n);
    }
    e.sort((o, n) => o.moduleInitOrder > n.moduleInitOrder ? 1 : -1), t.sort((o, n) => o.moduleInitOrder > n.moduleInitOrder ? 1 : -1), this.modulesRegular = e.concat(i.concat(t));
  }
};
O(te, "moduleBindings", {}), O(te, "moduleExtensions", {}), O(te, "modulesRegistered", !1), O(te, "defaultModules", !1);
let $i = te;
class Oa extends pe {
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
const it = class it extends $i {
  static extendModule() {
    it.initializeModuleBinder(), it._extendModule(...arguments);
  }
  static registerModule() {
    it.initializeModuleBinder(), it._registerModule(...arguments);
  }
  constructor(e, t, i) {
    super(), it.initializeModuleBinder(i), this.options = {}, this.columnManager = null, this.rowManager = null, this.footerManager = null, this.alertManager = null, this.vdomHoz = null, this.externalEvents = null, this.eventBus = null, this.interactionMonitor = !1, this.browser = "", this.browserSlow = !1, this.browserMobile = !1, this.rtl = !1, this.originalElement = null, this.componentFunctionBinder = new ka(this), this.dataLoader = !1, this.modules = {}, this.modulesCore = [], this.modulesRegular = [], this.deprecationAdvisor = new _a(this), this.optionsList = new _s(this, "table constructor"), this.dependencyRegistry = new La(this), this.initialized = !1, this.destroyed = !1, this.initializeElement(e) && (this.initializeCoreSystems(t), setTimeout(() => {
      this._create();
    })), this.constructor.registry.register(this);
  }
  initializeElement(e) {
    return typeof HTMLElement < "u" && e instanceof HTMLElement ? (this.element = e, !0) : typeof e == "string" ? (this.element = document.querySelector(e), this.element ? !0 : (console.error("Tabulator Creation Error - no element found matching selector: ", e), !1)) : (console.error("Tabulator Creation Error - Invalid element provided:", e), !1);
  }
  initializeCoreSystems(e) {
    this.columnManager = new va(this), this.rowManager = new Ca(this), this.footerManager = new Ea(this), this.dataLoader = new Ra(this), this.alertManager = new Oa(this), this._bindModules(), this.options = this.optionsList.generate(it.defaultOptions, e), this._clearObjectPointers(), this._mapDeprecatedFunctionality(), this.externalEvents = new Ta(this, this.options, this.options.debugEventsExternal), this.eventBus = new Sa(this.options.debugEventsInternal), this.interactionMonitor = new xa(this), this.dataLoader.initialize(), this.footerManager.initialize(), this.dependencyRegistry.initialize();
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
      for (var o in s)
        typeof s[o] == "object" && i.setAttribute(s[o].name, s[o].value);
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
      this.dataLoader.blockActiveLoad(), typeof e == "string" && (e = JSON.parse(e)), e && e.length > 0 ? e.forEach((o) => {
        var n = this.rowManager.findRow(o[this.options.index]);
        n ? (t++, n.updateData(o).then(() => {
          t--, t || i();
        }).catch((a) => {
          s("Update Error - Unable to update row", o, a);
        })) : s("Update Error - Unable to find row", o);
      }) : (console.warn("Update Error - No data provided"), s("Update Error - No data provided"));
    });
  }
  addData(e, t, i) {
    return this.initGuard(), new Promise((s, o) => {
      this.dataLoader.blockActiveLoad(), typeof e == "string" && (e = JSON.parse(e)), e ? this.rowManager.addRows(e, t, i).then((n) => {
        var a = [];
        n.forEach(function(r) {
          a.push(r.getComponent());
        }), s(a);
      }) : (console.warn("Update Error - No data provided"), o("Update Error - No data provided"));
    });
  }
  //update table data
  updateOrAddData(e) {
    var t = [], i = 0;
    return this.initGuard(), new Promise((s, o) => {
      this.dataLoader.blockActiveLoad(), typeof e == "string" && (e = JSON.parse(e)), e && e.length > 0 ? e.forEach((n) => {
        var a = this.rowManager.findRow(n[this.options.index]);
        i++, a ? a.updateData(n).then(() => {
          i--, t.push(a.getComponent()), i || s(t);
        }) : this.rowManager.addRows(n).then((r) => {
          i--, t.push(r[0].getComponent()), i || s(t);
        });
      }) : (console.warn("Update Error - No data provided"), o("Update Error - No data provided"));
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
    return this.initGuard(), this.columnManager.addColumn(e, t, s).then((o) => o.getComponent());
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
    var s = this.columnManager.findColumn(e), o = this.columnManager.findColumn(t);
    this.initGuard(), s ? o ? this.columnManager.moveColumn(s, o, i) : console.warn("Move Error - No matching column found:", o) : console.warn("Move Error - No matching column found:", e);
  }
  //scroll to column in DOM
  scrollToColumn(e, t, i) {
    return new Promise((s, o) => {
      var n = this.columnManager.findColumn(e);
      return n ? this.columnManager.scrollToColumn(n, t, i) : (console.warn("Scroll Error - No matching column found:", e), Promise.reject("Scroll Error - No matching column found"));
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
O(it, "defaultOptions", pa);
let Bi = it;
var Ot = Bi;
class Ha extends Ot {
  static extendModule() {
    Ot.initializeModuleBinder(ui), Ot._extendModule(...arguments);
  }
  static registerModule() {
    Ot.initializeModuleBinder(ui), Ot._registerModule(...arguments);
  }
  constructor(e, t, i) {
    super(e, t, ui);
  }
}
var Yt = Ha;
function $a(h) {
  const e = B(null), t = B(null), i = B(!1), s = B(!1);
  function o() {
    if (!e.value || !h.data.value) {
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
      } catch (n) {
        console.warn("Error destroying tabulator:", n);
      }
      t.value = null;
    }
    i.value = !1, console.log("🚀 Initializing Tabulator with", h.data.value.length, "rows");
    try {
      const n = {
        data: h.data.value,
        layout: h.layout || "fitColumns",
        // Remove fixed height - let it auto-size based on content
        resizableColumns: !0,
        placeholder: h.placeholder || "No data available",
        headerSortElement: "<span></span>",
        columns: h.columns,
        reactiveData: !0,
        // Add these for better auto-sizing
        layoutColumnsOnNewData: !0,
        autoResize: !0
      };
      h.rowFormatter && (n.rowFormatter = h.rowFormatter), t.value = new Yt(e.value, n), i.value = !0, s.value = !0, console.log("✅ Tabulator initialized successfully");
    } catch (n) {
      console.error("❌ Error creating Tabulator:", n);
    }
  }
  return Fe([() => h.isSuccess.value, e], async ([n, a]) => {
    var r;
    console.log("👀 Watch triggered - isSuccess:", n, "divRef:", !!a, "isTableInitialized:", s.value), n && a && !s.value && (await Zt(), a.offsetParent !== null ? (console.log("🎯 Conditions met, initializing table with", (r = h.data.value) == null ? void 0 : r.length, "rows"), o()) : (console.log("⏸️ Element not visible yet, will retry"), setTimeout(() => {
      a.offsetParent !== null && !s.value && (console.log("🚀 Initializing after visibility check"), o());
    }, 100)));
  }, { immediate: !0 }), Fe(() => h.data.value, async (n) => {
    if (!(!t.value || !n)) {
      console.log("🔄 Data changed, updating table with", n.length, "rows");
      try {
        await Zt(), t.value.setData(n);
      } catch (a) {
        console.warn("Error updating table data:", a), o();
      }
    }
  }, { deep: !0 }), ss(() => {
    console.log("👋 Cleaning up tabulator"), t.value && t.value.destroy();
  }), {
    tableDiv: e,
    tabulator: t,
    isTabulatorReady: i,
    isTableInitialized: s,
    initializeTabulator: o
  };
}
function Ba(h, e) {
  const t = Et(), i = B(null), s = B(!1), o = B(null), n = async (r) => {
    s.value = !0, o.value = null;
    try {
      let d = t.schema("hf").from("market_price").select("symbol, conid, market_price, week_52_high, week_52_low, pe_ratio, eps, market_cap, computed_peg_ratio, last_fetched_at");
      if (r && r > 0)
        console.log(`🔍 Fetching market price for conid: ${r}`), d = d.eq("conid", r);
      else if (e)
        console.log(`🔍 Fetching market price for symbol: ${e}`), d = d.eq("symbol", e);
      else {
        console.log("⚠️ No conid or symbolRoot available"), i.value = null, o.value = "No conid or symbol provided";
        return;
      }
      const { data: c, error: u } = await d.order("id", { ascending: !1 }).limit(1).single();
      if (u)
        throw new Error(`Database error: ${u.message}`);
      if (c)
        i.value = c, console.log(`✅ Market price fetched: $${c.market_price} for ${c.symbol}`);
      else {
        i.value = null;
        const p = r ? `conid: ${r}` : `symbol: ${e}`;
        console.log(`⚠️ No market price found for ${p}`);
      }
    } catch (d) {
      o.value = d instanceof Error ? d.message : "Failed to fetch market price", console.error("❌ Error fetching market price:", d), i.value = null;
    } finally {
      s.value = !1;
    }
  };
  return Fe(
    h,
    (r) => {
      r && r > 0 ? (console.log(`🎯 Conid changed to: ${r}, fetching price...`), n(r)) : e ? (console.log(`🎯 No conid available, using symbolRoot: ${e}`), n(null)) : (console.log("⚠️ No valid conid or symbolRoot available"), i.value = null, o.value = null);
    },
    { immediate: !0 }
  ), {
    marketData: i,
    isLoading: s,
    error: o,
    refetch: () => {
      h.value && h.value > 0 ? n(h.value) : e && n(null);
    }
  };
}
function Na(h, e) {
  const t = Et(), i = B(null), s = B(!1), o = B(null), n = async (r) => {
    s.value = !0, o.value = null;
    try {
      let d = t.schema("hf").from("financial_data").select("symbol, conid, week_52_high, week_52_low, pe_ratio, eps, market_cap, computed_peg_ratio, last_updated_at");
      if (r && r > 0)
        d = d.eq("conid", r);
      else if (e)
        console.log(`🔍 Fetching financial data for symbol: ${e}`), d = d.eq("symbol", e);
      else {
        console.log("⚠️ No conid or symbolRoot available"), i.value = null, o.value = "No conid or symbol provided";
        return;
      }
      const { data: c, error: u } = await d.order("id", { ascending: !1 }).limit(1).single();
      if (u)
        throw new Error(`Database error: ${u.message}`);
      if (c)
        i.value = c, console.log(`✅ Financial data fetched for ${c.symbol}`);
      else {
        i.value = null;
        const p = r ? `conid: ${r}` : `symbol: ${e}`;
        console.log(`⚠️ No financial data found for ${p}`);
      }
    } catch (d) {
      o.value = d instanceof Error ? d.message : "Failed to fetch financial data", console.error("❌ Error fetching financial data:", d), i.value = null;
    } finally {
      s.value = !1;
    }
  };
  return Fe(
    h,
    (r) => {
      r && r > 0 ? (console.log(`🎯 Conid changed to: ${r}, fetching price...`), n(r)) : e ? (console.log(`🎯 No conid available, using symbolRoot: ${e}`), n(null)) : (console.log("⚠️ No valid conid or symbolRoot available"), i.value = null, o.value = null);
    },
    { immediate: !0 }
  ), {
    financialData: i,
    isLoading: s,
    error: o,
    refetch: () => {
      h.value && h.value > 0 ? n(h.value) : e && n(null);
    }
  };
}
function Va(h, e) {
  const t = Et(), i = B(null), s = B(0), o = B(0), n = B([]), a = B(!1), r = B(null), d = se(() => {
    if (n.value.length === 0) return null;
    const u = n.value.reduce((v, y) => v + y.netCost, 0), p = n.value.reduce((v, y) => v + y.totalShares, 0);
    return console.log(`🔢 Calculating overall adjusted average from orders: Total Net Cost = $${u}, Total Shares = ${p}`), p > 0 ? u / p : null;
  }), c = async () => {
    if (!h.value || h.value.length === 0 || !e) {
      i.value = null;
      return;
    }
    a.value = !0, r.value = null;
    try {
      console.log("📊 Calculating average cost price from orders for positions:", h.value.length);
      const u = h.value.map(
        (S) => It({
          internal_account_id: S.internal_account_id,
          symbol: S.symbol,
          contract_quantity: S.contract_quantity ?? S.qty,
          asset_class: S.asset_class,
          conid: S.conid
        })
      );
      console.log("🔑 Generated mapping keys:", u);
      const { data: p, error: v } = await t.schema("hf").from("position_order_mappings").select("mapping_key, order_id").eq("user_id", e).in("mapping_key", u);
      if (v)
        throw new Error(`Failed to fetch order mappings: ${v.message}`);
      const y = p || [];
      console.log("🔗 Found order mappings:", y.length);
      const L = [...new Set(y.map((S) => S.order_id))];
      let _ = [];
      if (L.length > 0) {
        console.log("📦 Fetching orders with IDs:", L);
        const { data: S, error: I } = await t.schema("hf").from("orders").select("*").in("ibOrderID", L);
        if (I)
          throw new Error(`Failed to fetch orders: ${I.message}`);
        _ = (S || []).map((z) => {
          const V = parseFloat(z.quantity) || 0, A = z.assetCategory === "OPT" ? 100 : 1, w = V * A;
          return {
            ibOrderID: z.ibOrderID,
            symbol: z.symbol,
            side: z.buySell,
            // Use buySell from database
            totalQuantity: w,
            avgFillPrice: parseFloat(z.tradePrice) || 0,
            totalCost: parseFloat(z.tradePrice || 0) * w,
            orderType: z.orderType,
            secType: z.assetCategory,
            multiplier: A,
            right: z.putCall,
            // Use putCall from database
            strike: z.strike ? parseFloat(z.strike) : void 0,
            account: z.internal_account_id,
            // Use internal_account_id from database
            orderDate: z.orderDate || z.settleDateTarget || z.created_at
          };
        }), console.log("✅ Fetched orders:", _.length);
      }
      const x = /* @__PURE__ */ new Map();
      y.forEach((S) => {
        x.has(S.mapping_key) || x.set(S.mapping_key, []), x.get(S.mapping_key).push(S.order_id);
      });
      const g = [];
      h.value.forEach((S) => {
        const I = It({
          internal_account_id: S.internal_account_id,
          symbol: S.symbol,
          contract_quantity: S.contract_quantity ?? S.qty,
          asset_class: S.asset_class,
          conid: S.conid
        }), z = x.get(I) || [], V = _.filter((R) => z.includes(R.ibOrderID));
        console.log(`📍 Processing position: ${S.symbol} (${S.legal_entity || S.internal_account_id})`), console.log(`   Attached orders: ${V.length}`);
        const A = [], w = [], M = [], Z = [], Q = [], he = [];
        let ge = 0, ue = 0, we = 0, be = 0, Re = 0, Se = 0;
        V.forEach((R) => {
          const K = R.totalQuantity, ee = R.avgFillPrice * K, Ee = {
            symbol: R.symbol,
            side: R.side,
            quantity: K,
            avgPrice: R.avgFillPrice,
            totalCost: ee,
            secType: R.secType,
            right: R.right,
            strike: R.strike,
            account: R.account,
            orderDate: R.orderDate
          };
          R.secType === "STK" && R.side === "BUY" ? (A.push(Ee), ge += Math.abs(ee), console.log(`   📈 Stock purchase: ${R.symbol} ${R.side} ${K} @ $${R.avgFillPrice} = $${Math.abs(ee).toFixed(2)}`)) : R.secType === "STK" && R.side === "SELL" ? (w.push(Ee), ue += Math.abs(ee), console.log(`   💰 Stock sale: ${R.symbol} ${R.side} ${K} @ $${R.avgFillPrice} = $${Math.abs(ee).toFixed(2)} (proceeds)`)) : R.secType === "OPT" && R.right === "P" && R.side === "SELL" ? (M.push(Ee), we += Math.abs(ee), console.log(`   📉 Put sale: ${R.symbol} SELL PUT @ $${R.strike} ${R.side} ${K} @ $${R.avgFillPrice} = +$${Math.abs(ee).toFixed(2)} (premium)`)) : R.secType === "OPT" && R.right === "P" && R.side === "BUY" ? (Z.push(Ee), be += Math.abs(ee), console.log(`   🔙 Put buyback: ${R.symbol} BUY PUT @ $${R.strike} ${R.side} ${K} @ $${R.avgFillPrice} = -$${Math.abs(ee).toFixed(2)} (close cost)`)) : R.secType === "OPT" && R.right === "C" && R.side === "SELL" ? (Q.push(Ee), Re += Math.abs(ee), console.log(`   📞 Call sale: ${R.symbol} SELL CALL @ $${R.strike} ${R.side} ${K} @ $${R.avgFillPrice} = +$${Math.abs(ee).toFixed(2)} (premium)`)) : R.secType === "OPT" && R.right === "C" && R.side === "BUY" ? (he.push(Ee), Se += Math.abs(ee), console.log(`   🔙 Call buyback: ${R.symbol} BUY CALL @ $${R.strike} ${R.side} ${K} @ $${R.avgFillPrice} = -$${Math.abs(ee).toFixed(2)} (close cost)`)) : console.log(`   ❓ Other order: ${R.symbol} ${R.secType} ${R.side} ${K} @ $${R.avgFillPrice}`);
        });
        const _e = ge - ue, Me = we - be, We = Re - Se, Ge = _e - Me - We;
        let re = 0;
        const Le = A.reduce((R, K) => R + Math.abs(K.quantity), 0), nt = w.reduce((R, K) => R + Math.abs(K.quantity), 0), je = Le - nt;
        je > 0 ? (re = je, console.log(`   ✅ Using shares from stock orders: ${Le} purchased - ${nt} sold = ${re}`)) : Le > 0 ? (re = Le, console.log(`   ✅ Using shares from stock purchases: ${re}`)) : (re = S.accounting_quantity ?? S.qty, console.log(`   ℹ️ No stock orders found, using position quantity: ${re}`));
        const Ue = re > 0 ? Ge / re : 0;
        console.log(`📊 Position Summary for ${S.legal_entity || S.internal_account_id}:`), console.log(`   Stock Purchase Cost: $${ge.toFixed(2)}`), console.log(`   Stock Sale Proceeds: -$${ue.toFixed(2)}`), console.log(`   Net Stock Cost: $${_e.toFixed(2)}`), console.log(`   Put Premium Received: +$${we.toFixed(2)}`), console.log(`   Put Buyback Cost: -$${be.toFixed(2)}`), console.log(`   Net Put Cash Flow: $${Me.toFixed(2)}`), console.log(`   Call Premium Received: +$${Re.toFixed(2)}`), console.log(`   Call Buyback Cost: -$${Se.toFixed(2)}`), console.log(`   Net Call Cash Flow: $${We.toFixed(2)}`), console.log(`   Total Net Cost: $${Ge.toFixed(2)} (Net Stock - Net Put - Net Call)`), console.log(`   Position Shares: ${re}`), console.log(`   Adjusted Avg Price: $${Ue.toFixed(2)} per share`), g.push({
          mainPosition: {
            symbol: S.symbol,
            account: S.legal_entity || S.internal_account_id,
            quantity: re
          },
          orders: V.map((R) => ({
            symbol: R.symbol,
            side: R.side,
            quantity: R.totalQuantity,
            // Already includes multiplier
            avgPrice: R.avgFillPrice,
            totalCost: R.totalCost,
            // Already calculated with multiplier
            secType: R.secType,
            right: R.right,
            strike: R.strike,
            account: R.account,
            orderDate: R.orderDate
          })),
          stockPurchases: A,
          stockPurchaseCost: ge,
          stockSales: w,
          stockSaleProceeds: ue,
          netStockCost: _e,
          putSales: M,
          putPremiumReceived: we,
          putBuybacks: Z,
          putBuybackCost: be,
          callSales: Q,
          callPremiumReceived: Re,
          callBuybacks: he,
          callBuybackCost: Se,
          totalStockCost: _e,
          netPutCashFlow: Me,
          netCallCashFlow: We,
          netCost: Ge,
          totalShares: re,
          adjustedAvgPricePerShare: Ue
        });
      }), n.value = g;
      const f = g.reduce((S, I) => S + I.netCost, 0), D = g.reduce((S, I) => S + I.totalShares, 0), P = D > 0 ? f / D : null;
      s.value = f, o.value = D, i.value = P, P !== null && (console.log(`🎯 Overall Adjusted Average from Orders: $${P.toFixed(2)} per share`), console.log(`   Total Net Cost: $${f.toFixed(2)}`), console.log(`   Total Shares: ${D}`));
    } catch (u) {
      r.value = u instanceof Error ? u.message : "Failed to calculate average cost price from orders", console.error("❌ Error calculating average cost price from orders:", u), i.value = null;
    } finally {
      a.value = !1;
    }
  };
  return Fe(
    () => h.value,
    () => {
      h.value && h.value.length > 0 && e ? c() : i.value = null;
    },
    { immediate: !0, deep: !0 }
  ), {
    averageCostPriceFromOrders: i,
    overallAdjustedAvgPriceFromOrders: d,
    totalNetCost: s,
    totalShares: o,
    orderGroups: n,
    isLoading: a,
    error: r,
    refetch: c
  };
}
function Ia(h, e) {
  const t = Et(), i = B(null), s = B(0), o = B(0), n = B([]), a = B(!1), r = B(null), d = se(() => {
    if (n.value.length === 0) return null;
    const u = n.value.reduce((v, y) => v + y.netCost, 0), p = n.value.reduce((v, y) => v + y.totalShares, 0);
    return console.log(`🔢 Calculating overall adjusted average from orders: Total Net Cost = $${u}, Total Shares = ${p}`), p > 0 ? u / p : null;
  }), c = async () => {
    if (!h.value || h.value.length === 0 || !e) {
      i.value = null;
      return;
    }
    a.value = !0, r.value = null;
    try {
      console.log("📊 Calculating average cost price from orders for positions:", h.value.length);
      const u = h.value.map(
        (S) => It({
          internal_account_id: S.internal_account_id,
          symbol: S.symbol,
          contract_quantity: S.contract_quantity ?? S.qty,
          asset_class: S.asset_class,
          conid: S.conid
        })
      );
      console.log("🔑 Generated mapping keys:", u);
      const { data: p, error: v } = await t.schema("hf").from("position_order_mappings").select("mapping_key, order_id").eq("user_id", e).in("mapping_key", u);
      if (v)
        throw new Error(`Failed to fetch order mappings: ${v.message}`);
      const y = p || [];
      console.log("🔗 Found order mappings:", y.length);
      const L = [...new Set(y.map((S) => S.order_id))];
      let _ = [];
      if (L.length > 0) {
        console.log("📦 Fetching orders with IDs:", L);
        const { data: S, error: I } = await t.schema("hf").from("orders").select("*").in("ibOrderID", L);
        if (I)
          throw new Error(`Failed to fetch orders: ${I.message}`);
        _ = (S || []).map((z) => {
          const V = parseFloat(z.quantity) || 0, A = z.assetCategory === "OPT" ? 100 : 1, w = V * A;
          return {
            ibOrderID: z.ibOrderID,
            symbol: z.symbol,
            side: z.buySell,
            // Use buySell from database
            totalQuantity: w,
            avgFillPrice: parseFloat(z.tradePrice) || 0,
            totalCost: parseFloat(z.tradePrice || 0) * w,
            orderType: z.orderType,
            secType: z.assetCategory,
            multiplier: A,
            right: z.putCall,
            // Use putCall from database
            strike: z.strike ? parseFloat(z.strike) : void 0,
            account: z.internal_account_id,
            // Use internal_account_id from database
            orderDate: z.orderDate || z.settleDateTarget || z.created_at,
            conid: z.conid
            // ADD: Include conid for position matching
          };
        }), console.log("✅ Fetched orders:", _.length);
      }
      const x = /* @__PURE__ */ new Map();
      y.forEach((S) => {
        x.has(S.mapping_key) || x.set(S.mapping_key, []), x.get(S.mapping_key).push(S.order_id);
      });
      const g = [];
      for (const S of h.value) {
        const I = It({
          internal_account_id: S.internal_account_id,
          symbol: S.symbol,
          contract_quantity: S.contract_quantity ?? S.qty,
          asset_class: S.asset_class,
          conid: S.conid
        }), z = x.get(I) || [], V = _.filter((R) => z.includes(R.ibOrderID));
        console.log(`📍 Processing position: ${S.symbol} (${S.legal_entity || S.internal_account_id})`), console.log(`   Attached orders: ${V.length}`);
        const A = [], w = [], M = [], Z = [], Q = [], he = [];
        let ge = 0, ue = 0, we = 0, be = 0, Re = 0, Se = 0;
        for (const R of V) {
          const K = R.totalQuantity, ee = R.avgFillPrice * K, Ee = {
            symbol: R.symbol,
            side: R.side,
            quantity: K,
            avgPrice: R.avgFillPrice,
            totalCost: ee,
            secType: R.secType,
            right: R.right,
            strike: R.strike,
            account: R.account,
            orderDate: R.orderDate
          };
          if (R.secType === "STK" && R.side === "BUY")
            A.push(Ee), ge += Math.abs(ee), console.log(`   📈 Stock purchase: ${R.symbol} ${R.side} ${K} @ $${R.avgFillPrice} = $${Math.abs(ee).toFixed(2)}`);
          else if (R.secType === "STK" && R.side === "SELL")
            w.push(Ee), ue += Math.abs(ee), console.log(`   💰 Stock sale: ${R.symbol} ${R.side} ${K} @ $${R.avgFillPrice} = $${Math.abs(ee).toFixed(2)} (proceeds)`);
          else if (R.secType === "OPT" && R.right === "P" && R.side === "SELL")
            M.push(Ee), we += Math.abs(ee), console.log(`   📉 Put sale: ${R.symbol} SELL PUT @ $${R.strike} ${R.side} ${K} @ $${R.avgFillPrice} = +$${Math.abs(ee).toFixed(2)} (premium)`);
          else if (R.secType === "OPT" && R.right === "P" && R.side === "BUY")
            Z.push(Ee), be += Math.abs(ee), console.log(`   🔙 Put buyback: ${R.symbol} BUY PUT @ $${R.strike} ${R.side} ${K} @ $${R.avgFillPrice} = -$${Math.abs(ee).toFixed(2)} (close cost)`);
          else if (R.secType === "OPT" && R.right === "C" && R.side === "SELL") {
            const Gt = R.totalQuantity / 100, jt = Math.abs(ee);
            console.log(`   📞 Processing Call sale (EXIT TODAY): ${R.symbol} SELL CALL @ $${R.strike}`), console.log(`      Order details: ${Gt} contracts @ $${R.avgFillPrice} = $${jt.toFixed(2)}`);
            let $e = jt, _t = "order-only";
            if (R.conid)
              try {
                const { data: ie, error: Be } = await t.schema("hf").from("positions").select("id, unrealized_pnl, price, market_value").eq("internal_account_id", R.account).eq("contract_quantity", Gt).eq("conid", R.conid).order("id", { ascending: !1 }).limit(1).maybeSingle();
                if (Be)
                  console.warn(`      ⚠️ Error querying position: ${Be.message}`);
                else if (ie && ie.price !== 0 && ie.market_value !== 0 && ie.unrealized_pnl !== null && ie.unrealized_pnl !== void 0)
                  $e = ie.unrealized_pnl, _t = "position", console.log(`      ✅ Valid position found (ID: ${ie.id})`), console.log(`      📊 Price: $${ie.price}, Market Value: $${ie.market_value}`), console.log(`      💰 Using unrealized P&L: $${$e.toFixed(2)} (EXIT TODAY scenario)`);
                else if (ie) {
                  let qe = "";
                  ie.price === 0 ? qe = "price is zero" : ie.market_value === 0 ? qe = "market_value is zero" : (ie.unrealized_pnl === null || ie.unrealized_pnl === void 0) && (qe = "unrealized_pnl is null/undefined"), _t = "order-fallback", console.log(`      ⚠️ Position found (ID: ${ie.id}) but invalid data`), console.log(`      📊 Price: ${ie.price}, Market Value: ${ie.market_value}`), console.log(`      📊 Unrealized P&L: ${ie.unrealized_pnl}`), console.log(`      ❌ Validation failed: ${qe}`), console.log(`      💰 Fallback to order premium: $${$e.toFixed(2)}`);
                } else
                  console.log("      ℹ️ No matching position found"), console.log(`      💰 Using order premium: $${$e.toFixed(2)}`);
              } catch (ie) {
                console.error("      ❌ Exception querying position:", ie);
              }
            else
              console.log(`      ℹ️ No conid available, using order premium: $${$e.toFixed(2)}`);
            const Lt = {
              symbol: R.symbol,
              side: R.side,
              quantity: K,
              avgPrice: R.avgFillPrice,
              totalCost: $e,
              // Use adjusted value (unrealized P&L or order premium)
              secType: R.secType,
              right: R.right,
              strike: R.strike,
              account: R.account,
              orderDate: R.orderDate
            };
            Q.push(Lt), Re += $e, console.log(`      📊 Added to call sales: $${$e.toFixed(2)} (source: ${_t})`);
          } else R.secType === "OPT" && R.right === "C" && R.side === "BUY" ? (he.push(Ee), Se += Math.abs(ee), console.log(`   🔙 Call buyback: ${R.symbol} BUY CALL @ $${R.strike} ${R.side} ${K} @ $${R.avgFillPrice} = -$${Math.abs(ee).toFixed(2)} (close cost)`)) : console.log(`   ❓ Other order: ${R.symbol} ${R.secType} ${R.side} ${K} @ $${R.avgFillPrice}`);
        }
        const _e = ge - ue, Me = we - be, We = Re - Se, Ge = _e - Me - We;
        let re = 0;
        const Le = A.reduce((R, K) => R + Math.abs(K.quantity), 0), nt = w.reduce((R, K) => R + Math.abs(K.quantity), 0), je = Le - nt;
        je > 0 ? (re = je, console.log(`   ✅ Using shares from stock orders: ${Le} purchased - ${nt} sold = ${re}`)) : Le > 0 ? (re = Le, console.log(`   ✅ Using shares from stock purchases: ${re}`)) : (re = S.accounting_quantity ?? S.qty, console.log(`   ℹ️ No stock orders found, using position quantity: ${re}`));
        const Ue = re > 0 ? Ge / re : 0;
        console.log(`📊 Position Summary for ${S.legal_entity || S.internal_account_id}:`), console.log(`   Stock Purchase Cost: $${ge.toFixed(2)}`), console.log(`   Stock Sale Proceeds: -$${ue.toFixed(2)}`), console.log(`   Net Stock Cost: $${_e.toFixed(2)}`), console.log(`   Put Premium Received: +$${we.toFixed(2)}`), console.log(`   Put Buyback Cost: -$${be.toFixed(2)}`), console.log(`   Net Put Cash Flow: $${Me.toFixed(2)}`), console.log(`   Call Premium Received: +$${Re.toFixed(2)}`), console.log(`   Call Buyback Cost: -$${Se.toFixed(2)}`), console.log(`   Net Call Cash Flow: $${We.toFixed(2)}`), console.log(`   Total Net Cost: $${Ge.toFixed(2)} (Net Stock - Net Put - Net Call)`), console.log(`   Position Shares: ${re}`), console.log(`   Adjusted Avg Price: $${Ue.toFixed(2)} per share`), g.push({
          mainPosition: {
            symbol: S.symbol,
            account: S.legal_entity || S.internal_account_id,
            quantity: re
          },
          orders: V.map((R) => ({
            symbol: R.symbol,
            side: R.side,
            quantity: R.totalQuantity,
            // Already includes multiplier
            avgPrice: R.avgFillPrice,
            totalCost: R.totalCost,
            // Already calculated with multiplier
            secType: R.secType,
            right: R.right,
            strike: R.strike,
            account: R.account,
            orderDate: R.orderDate
          })),
          stockPurchases: A,
          stockPurchaseCost: ge,
          stockSales: w,
          stockSaleProceeds: ue,
          netStockCost: _e,
          putSales: M,
          putPremiumReceived: we,
          putBuybacks: Z,
          putBuybackCost: be,
          callSales: Q,
          callPremiumReceived: Re,
          callBuybacks: he,
          callBuybackCost: Se,
          totalStockCost: _e,
          netPutCashFlow: Me,
          netCallCashFlow: We,
          netCost: Ge,
          totalShares: re,
          adjustedAvgPricePerShare: Ue
        });
      }
      n.value = g;
      const f = g.reduce((S, I) => S + I.netCost, 0), D = g.reduce((S, I) => S + I.totalShares, 0), P = D > 0 ? f / D : null;
      s.value = f, o.value = D, i.value = P, P !== null && (console.log(`🎯 Overall Adjusted Average from Orders: $${P.toFixed(2)} per share`), console.log(`   Total Net Cost: $${f.toFixed(2)}`), console.log(`   Total Shares: ${D}`));
    } catch (u) {
      r.value = u instanceof Error ? u.message : "Failed to calculate average cost price from orders", console.error("❌ Error calculating average cost price from orders:", u), i.value = null;
    } finally {
      a.value = !1;
    }
  };
  return Fe(
    () => h.value,
    () => {
      h.value && h.value.length > 0 && e ? c() : i.value = null;
    },
    { immediate: !0, deep: !0 }
  ), {
    averageCostPriceFromOrders: i,
    overallAdjustedAvgPriceFromOrders: d,
    totalNetCost: s,
    totalShares: o,
    orderGroups: n,
    isLoading: a,
    error: r,
    refetch: c
  };
}
function Wa(h, e, t, i = B(void 0), s = B(void 0)) {
  const o = B(null), n = B(null), a = B(null), r = B(null), d = B(!1), c = B(!1), u = B(null), p = () => {
    const y = [
      ...i.value || [],
      ...s.value || []
    ];
    if (y.length === 0)
      return console.log("⚠️ No options positions available for P&L calculation"), null;
    console.log("📊 Calculating options P&L for positions:", y.length);
    let L = 0, _ = 0, x = 0, g = 0;
    const f = [], D = /* @__PURE__ */ new Set(), P = /* @__PURE__ */ new Set();
    y.forEach((V) => {
      const A = V.accounting_quantity ?? V.qty, w = V.legal_entity || V.internal_account_id;
      let M = null, Z = null, Q = "UNKNOWN";
      const he = V.symbol.match(/(\d{4}-\d{2}-\d{2})\s+(\d+(?:\.\d+)?)\s+([CP])/);
      if (he)
        Z = he[1], M = parseFloat(he[2]), Q = he[3] === "C" ? "CALL" : "PUT";
      else {
        const be = V.symbol.match(/([CP])(\d{8})/);
        if (be) {
          Q = be[1] === "C" ? "CALL" : "PUT";
          const Re = be[2];
          M = parseFloat(Re) / 1e3;
        }
      }
      D.add(Q), P.add(A < 0 ? "SHORT" : "LONG");
      const ge = Math.abs(V.computed_cash_flow_on_entry || 0), ue = Math.abs(V.market_value || 0), we = V.unrealized_pnl || 0;
      L += Math.abs(A), _ += ge, x += ue, g += we, f.push({
        account: w,
        strike: M,
        expiry: Z,
        quantity: A,
        premiumReceived: ge,
        currentValue: ue,
        positionPnL: we,
        symbol: V.symbol
      }), console.log(`📍 Position: ${V.symbol} (${w})`), console.log(`   Quantity: ${A}`), console.log(`   Premium Received: $${ge.toFixed(2)}`), console.log(`   Current Value: $${ue.toFixed(2)}`), console.log(`   P&L: $${we.toFixed(2)}`);
    });
    const S = D.size === 1 ? Array.from(D)[0] : "MIXED", I = P.size === 1 ? Array.from(P)[0] : "MIXED", z = _ > 0 ? g / _ * 100 : 0;
    return console.log("💰 Options P&L Summary:"), console.log(`   Total Contracts: ${L}`), console.log(`   Total Premium Received: $${_.toFixed(2)}`), console.log(`   Current Market Liability: $${x.toFixed(2)}`), console.log(`   Unrealized P&L: $${g.toFixed(2)}`), console.log(`   P&L Percentage: ${z.toFixed(2)}%`), {
      totalContracts: L,
      optionType: S,
      positionType: I,
      totalPremiumReceived: _,
      currentMarketLiability: x,
      unrealizedPnL: g,
      pnlPercentage: z,
      positions: f
    };
  }, v = se(() => {
    if (e.value > 0 && h.value !== null && t.value !== null) {
      console.log("📈 Calculating STOCK P&L");
      const y = e.value, L = h.value, _ = t.value, x = y * L, g = y * _, f = g - x, D = x !== 0 ? f / x * 100 : 0;
      return {
        totalShares: y,
        avgCostPerShare: L,
        totalCostBasis: x,
        currentPricePerShare: _,
        currentMarketValue: g,
        unrealizedPnL: f,
        pnlPercentage: D
      };
    } else
      return console.log("📊 No stock positions, calculating OPTIONS P&L"), p();
  });
  return Fe(
    v,
    (y) => {
      y ? "totalShares" in y ? (o.value = y.totalCostBasis, n.value = y.currentMarketValue, a.value = y.unrealizedPnL, r.value = y.pnlPercentage, d.value = y.unrealizedPnL >= 0, console.log("💰 STOCK P&L Calculation:"), console.log(`   Total Shares: ${y.totalShares.toLocaleString()}`), console.log(`   Avg Cost per Share: $${y.avgCostPerShare.toFixed(2)}`), console.log(`   Total Cost Basis: $${y.totalCostBasis.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`), console.log(`   Current Price per Share: $${y.currentPricePerShare.toFixed(2)}`), console.log(`   Current Market Value: $${y.currentMarketValue.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`), console.log(`   Unrealized P&L: ${y.unrealizedPnL >= 0 ? "+" : ""}$${y.unrealizedPnL.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`), console.log(`   P&L Percentage: ${y.pnlPercentage.toFixed(2)}%`)) : (o.value = y.totalPremiumReceived, n.value = y.currentMarketLiability, a.value = y.unrealizedPnL, r.value = y.pnlPercentage, d.value = y.unrealizedPnL >= 0, console.log("💰 OPTIONS P&L Updated:"), console.log(`   Total Contracts: ${y.totalContracts}`), console.log(`   ${y.positionType} ${y.optionType}`), console.log(`   Premium Received: $${y.totalPremiumReceived.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`), console.log(`   Current Liability: $${y.currentMarketLiability.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`), console.log(`   Unrealized P&L: ${y.unrealizedPnL >= 0 ? "+" : ""}$${y.unrealizedPnL.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`), console.log(`   P&L Percentage: ${y.pnlPercentage.toFixed(2)}%`)) : (o.value = null, n.value = null, a.value = null, r.value = null, d.value = !1, console.log("⚠️ P&L Calculation: Missing required data"));
    },
    { immediate: !0 }
  ), {
    totalCostBasis: o,
    currentMarketValue: n,
    unrealizedPnL: a,
    pnlPercentage: r,
    isProfitable: d,
    calculationBreakdown: v,
    isLoading: c,
    error: u
  };
}
function Ga(h, e, t = B("STK")) {
  const i = Et(), s = B(null), o = B(null), n = B(!1), a = B(null);
  async function r(c) {
    try {
      const { data: u, error: p } = await i.schema("hf").from("user_account_alias").select("alias").eq("user_id", e.value).eq("internal_account_id", c).single();
      if (!p && (u != null && u.alias))
        return u.alias;
      const { data: v, error: y } = await i.schema("hf").from("user_accounts_master").select("legal_entity").eq("internal_account_id", c).single();
      return !y && (v != null && v.legal_entity) ? v.legal_entity : c;
    } catch (u) {
      return console.error("Error fetching account display name:", u), c;
    }
  }
  async function d() {
    if (!e.value || !h.value) {
      console.log("⚠️ Missing userId or symbolRoot for exited P&L calculation"), s.value = null, o.value = null;
      return;
    }
    n.value = !0, a.value = null;
    try {
      console.log("🔍 Fetching exited positions P&L for:", {
        symbolRoot: h.value,
        userId: e.value,
        assetClass: t.value
      });
      const c = `%|${h.value}|%|${t.value}|%`, { data: u, error: p } = await i.schema("hf").from("position_order_mappings").select("order_id").eq("user_id", e.value).like("mapping_key", c);
      if (p)
        throw new Error(`Failed to fetch position mappings: ${p.message}`);
      const v = new Set(
        (u || []).map((P) => P.order_id)
      );
      console.log("📎 Found attached order IDs:", v.size);
      const y = `${h.value}%`;
      let L = i.schema("hf").from("orders").select("id, symbol, buySell, quantity, tradePrice, tradeMoney, fifoPnlRealized, dateTime, internal_account_id").like("symbol", y);
      v.size > 0 && (L = L.not("id", "in", `(${Array.from(v).join(",")})`));
      const { data: _, error: x } = await L;
      if (x)
        throw new Error(`Failed to fetch orders: ${x.message}`);
      console.log("📦 Fetched exited orders:", (_ == null ? void 0 : _.length) || 0);
      const g = /* @__PURE__ */ new Map();
      for (const P of _ || []) {
        const S = P.internal_account_id || "Unknown";
        g.has(S) || g.set(S, []), g.get(S).push({
          id: P.id,
          symbol: P.symbol,
          buySell: P.buySell,
          quantity: parseFloat(P.quantity) || 0,
          tradePrice: parseFloat(P.tradePrice) || 0,
          tradeMoney: parseFloat(P.tradeMoney) || 0,
          fifoPnlRealized: parseFloat(P.fifoPnlRealized) || 0,
          dateTime: P.dateTime,
          internal_account_id: S
        });
      }
      const f = [];
      let D = 0;
      for (const [P, S] of g) {
        const I = S.reduce((V, A) => V + A.fifoPnlRealized, 0);
        D += I;
        const z = await r(P);
        f.push({
          internal_account_id: P,
          accountDisplayName: z,
          totalFifoPnlRealized: I,
          orderCount: S.length,
          orders: S
        });
      }
      f.sort((P, S) => P.accountDisplayName.localeCompare(S.accountDisplayName)), s.value = D, o.value = {
        totalFifoPnlRealized: D,
        orderCount: (_ == null ? void 0 : _.length) || 0,
        accountBreakdowns: f
      }, console.log("💰 Exited Positions P&L Summary:"), console.log(`   Total Orders: ${o.value.orderCount}`), console.log(`   Total Accounts: ${f.length}`), console.log(`   Total MTM P&L: $${D.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    } catch (c) {
      console.error("❌ Error calculating exited positions P&L:", c), a.value = c.message, s.value = null, o.value = null;
    } finally {
      n.value = !1;
    }
  }
  return Fe(
    [h, e, t],
    () => {
      d();
    },
    { immediate: !0 }
  ), {
    totalExitedPnL: s,
    exitedOrdersBreakdown: o,
    isLoading: n,
    error: a,
    refetch: d
  };
}
function ja(h, e, t, i, s, o) {
  console.log("🏦 useCapitalUsed initialized");
  const n = se(() => !1), a = se(() => null), r = se(() => {
    const c = h.value;
    if (console.log("🏦 Calculating capital breakdown for asset type:", c), c === "STK") {
      const u = e.value, p = t.value;
      if (p === null || u === 0)
        return console.log("⚠️ Cannot calculate stock capital: missing price or quantity"), null;
      const v = u * p;
      return console.log("📊 Stock capital breakdown:", {
        totalShares: u,
        pricePerShare: p,
        totalCapital: v
      }), {
        assetType: "STK",
        totalShares: u,
        pricePerShare: p,
        totalCapital: v
      };
    }
    return c === "OPT" ? (console.log("⚠️ Options capital calculation not implemented yet"), null) : (console.log("⚠️ Unknown or null asset type, cannot calculate capital"), null);
  }), d = se(() => {
    const c = r.value;
    return c && c.assetType === "STK" ? c.totalCapital : null;
  });
  return console.log("🏦 useCapitalUsed ready"), {
    totalCapitalUsed: d,
    calculationBreakdown: r,
    isLoading: n,
    error: a
  };
}
function Ua(h) {
  const e = Et(), t = so(h), i = oo(h), s = no(h), o = se(() => {
    const g = t.data.value;
    return g || /* @__PURE__ */ new Map();
  }), n = se(() => {
    const g = i.data.value;
    return g || /* @__PURE__ */ new Map();
  }), a = se(() => {
    const g = s.data.value;
    return g || /* @__PURE__ */ new Map();
  }), r = B(/* @__PURE__ */ new Map()), d = B(/* @__PURE__ */ new Map());
  B(/* @__PURE__ */ new Map());
  function c(g) {
    return It({
      internal_account_id: g.internal_account_id,
      symbol: g.symbol,
      contract_quantity: g.contract_quantity,
      asset_class: g.asset_class || "OPT",
      conid: g.conid || ""
    });
  }
  function u(g) {
    if (!g) return null;
    const f = g.match(/^([A-Z]+)\b/);
    return (f == null ? void 0 : f[1]) || null;
  }
  async function p(g, f) {
    if (!h) return [];
    if (d.value.has(g))
      return d.value.get(g) || [];
    try {
      console.log("🔍 Fetching trades for symbol root:", g);
      const { data: D, error: P } = await e.schema("hf").from("trades").select("*").ilike("symbol", `${g}%`);
      if (P)
        throw console.error("❌ Error fetching trades:", P), P;
      const S = (D || []).sort((z, V) => {
        const A = (Z) => {
          if (!Z) return 0;
          const Q = Z.split("/");
          return Q.length !== 3 ? 0 : new Date(parseInt(Q[2]), parseInt(Q[1]) - 1, parseInt(Q[0])).getTime();
        }, w = A(z.tradeDate);
        return A(V.tradeDate) - w;
      });
      console.log(`✅ Fetched ${(S == null ? void 0 : S.length) || 0} trades for ${g}`);
      const I = S || [];
      return d.value.set(g, I), I;
    } catch (D) {
      return console.error("❌ Error fetching trades:", D), [];
    }
  }
  async function v(g, f) {
    if (!h) return [];
    try {
      const { data: D, error: P } = await e.schema("hf").from("orders").select("*").ilike("symbol", `${g}%`).eq("internal_account_id", f);
      if (P) throw P;
      const S = (D || []).sort((z, V) => {
        const A = (Z) => {
          if (!Z) return 0;
          const Q = Z.split("/");
          return Q.length !== 3 ? 0 : new Date(parseInt(Q[2]), parseInt(Q[1]) - 1, parseInt(Q[0])).getTime();
        }, w = A(z.settleDateTarget);
        return A(V.settleDateTarget) - w;
      });
      return D || [];
    } catch (D) {
      return console.error("❌ Error fetching orders:", D), [];
    }
  }
  async function y(g) {
    const f = c(g), D = o.value.get(f);
    if (console.log("🔍 Getting attached trades for key:", f), console.log("🔍 Trade IDs from map:", D ? Array.from(D) : "none"), !D || D.size === 0)
      return [];
    const P = u(g.symbol);
    if (!P) return [];
    const S = await p(P, g.internal_account_id);
    console.log(`📊 Total trades fetched: ${S.length}`), console.log("📊 Sample trade IDs:", S.slice(0, 3).map((z) => z.tradeID));
    const I = S.filter((z) => {
      const V = z.tradeID;
      return V && D.has(String(V));
    });
    return console.log(`✅ Found ${I.length} attached trades`), I;
  }
  async function L(g) {
    const f = c(g), D = a.value.get(f);
    if (!D || D.size === 0) return [];
    const P = u(g.symbol);
    return P ? (await v(P, g.internal_account_id)).filter((I) => I.id && D.has(String(I.id))) : [];
  }
  async function _(g, f) {
    try {
      const D = c(g);
      if (r.value.has(D))
        return r.value.get(D) || [];
      const P = u(g.symbol), S = g.internal_account_id || g.legal_entity;
      if (!P || !S || !h) return [];
      const z = (await ns(
        e,
        P,
        h,
        S
      )).filter((V) => {
        const A = c(V);
        return f.has(A);
      });
      return z.length > 0 && r.value.set(D, z), z;
    } catch (D) {
      return console.error("❌ Error fetching attached positions:", D), [];
    }
  }
  const x = se(() => t.isSuccess.value && i.isSuccess.value);
  return {
    positionTradesMap: o,
    positionPositionsMap: n,
    positionOrdersMap: a,
    getPositionKey: c,
    getAttachedTrades: y,
    getAttachedOrders: L,
    fetchAttachedPositionsForDisplay: _,
    positionTradeMappingsQuery: t,
    positionPositionMappingsQuery: i,
    positionOrderMappingsQuery: s,
    isReady: x,
    refetchMappings: async () => {
      await t.refetch(), await i.refetch();
    },
    fetchTradesForSymbol: p,
    fetchOrdersForSymbol: v,
    savePositionOrderMappings: ao
  };
}
function qa() {
  const h = B(/* @__PURE__ */ new Set()), e = B(/* @__PURE__ */ new Set());
  function t(i, s) {
    e.value.delete(i), h.value.has(i) ? h.value.delete(i) : h.value.add(i);
    const o = (s == null ? void 0 : s.value) || s;
    if (o && typeof o.getRows == "function") {
      const n = o.getRows();
      for (const a of n) {
        const r = a.getData();
        if (r && `${r.internal_account_id || r.legal_entity}|${r.symbol}|${r.accounting_quantity || r.contract_quantity}|${r.asset_class || "OPT"}|${r.conid || ""}` === i) {
          a.reformat();
          break;
        }
      }
    }
  }
  return {
    expandedPositions: h,
    processingPositions: e,
    togglePositionExpansion: t
  };
}
const Ka = {
  key: 0,
  class: "toast-notification"
}, Qa = { class: "calculation-details" }, Xa = { class: "calculation-tabs" }, Ja = { key: 0 }, Ya = {
  key: 0,
  class: "loading-message"
}, Za = {
  key: 1,
  class: "error-message"
}, er = {
  key: 2,
  class: "no-data-message"
}, tr = { key: 3 }, ir = ["onClick"], sr = { class: "toggle-icon" }, or = { class: "orders-count-badge" }, nr = { class: "group-content" }, ar = { class: "parent-stock-container" }, rr = { class: "stock-sections-container" }, lr = { class: "stock-section-half" }, hr = {
  key: 0,
  class: "order-section order-stock-section"
}, dr = {
  class: "order-header",
  style: { display: "flex", "justify-content": "space-between", "align-items": "center" }
}, cr = ["onClick"], ur = { class: "stock-table-wrapper" }, fr = { class: "stock-purchases-table" }, mr = { class: "text-right" }, pr = { class: "text-right" }, gr = { class: "text-right" }, br = { class: "total-row" }, vr = { class: "text-right" }, yr = { class: "text-right" }, wr = {
  key: 1,
  class: "order-section no-orders"
}, Cr = { class: "stock-section-half" }, Er = {
  key: 0,
  class: "order-section order-stock-section"
}, xr = {
  class: "order-header",
  style: { display: "flex", "justify-content": "space-between", "align-items": "center" }
}, kr = ["onClick"], Rr = { class: "stock-table-wrapper" }, Tr = { class: "stock-purchases-table" }, Sr = { class: "text-right" }, _r = { class: "text-right" }, Lr = { class: "text-right" }, Dr = { class: "total-row" }, Fr = { class: "text-right" }, Mr = { class: "text-right" }, Pr = {
  key: 1,
  class: "order-section no-orders"
}, zr = {
  key: 0,
  class: "order-section",
  style: { padding: "1rem" }
}, Ar = { style: { "font-size": "1.1rem", "margin-bottom": "0.75rem" } }, Or = { style: { "margin-bottom": "0.5rem" } }, Hr = { style: { "margin-left": "1rem", color: "#6c757d", "font-size": "0.95rem" } }, $r = { key: 0 }, Br = { style: { "border-top": "1px solid #dee2e6", "margin-top": "0.25rem", "padding-top": "0.25rem", "font-weight": "600", color: "#28a745", "font-size": "1.05rem" } }, Nr = { style: { "margin-left": "1rem", color: "#6c757d", "font-size": "0.95rem" } }, Vr = { key: 0 }, Ir = { style: { "border-top": "1px solid #dee2e6", "margin-top": "0.25rem", "padding-top": "0.25rem", "font-weight": "600", color: "#28a745", "font-size": "1.05rem" } }, Wr = { class: "parent-put-container" }, Gr = { class: "stock-sections-container" }, jr = { class: "stock-section-half" }, Ur = {
  key: 0,
  class: "order-section order-put-section"
}, qr = {
  class: "order-header",
  style: { display: "flex", "justify-content": "space-between", "align-items": "center" }
}, Kr = ["onClick"], Qr = { class: "stock-table-wrapper" }, Xr = { class: "stock-purchases-table" }, Jr = { class: "text-right" }, Yr = { class: "text-right" }, Zr = { class: "text-right" }, el = { class: "total-row" }, tl = { class: "text-right" }, il = { class: "text-right" }, sl = {
  key: 1,
  class: "order-section no-orders"
}, ol = { class: "stock-section-half" }, nl = {
  key: 0,
  class: "order-section order-put-section"
}, al = {
  class: "order-header",
  style: { display: "flex", "justify-content": "space-between", "align-items": "center" }
}, rl = ["onClick"], ll = { class: "stock-table-wrapper" }, hl = { class: "stock-purchases-table" }, dl = { class: "text-right" }, cl = { class: "text-right" }, ul = { class: "text-right" }, fl = { class: "total-row" }, ml = { class: "text-right" }, pl = { class: "text-right" }, gl = {
  key: 1,
  class: "order-section no-orders"
}, bl = {
  key: 0,
  class: "order-section",
  style: { padding: "1rem" }
}, vl = { style: { "font-size": "1.1rem", "margin-bottom": "0.75rem" } }, yl = { style: { "margin-left": "1rem", color: "#6c757d", "font-size": "0.95rem" } }, wl = { key: 0 }, Cl = { key: 1 }, El = { style: { "border-top": "1px solid #dee2e6", "margin-top": "0.25rem", "padding-top": "0.25rem", "font-weight": "600", color: "#ff9800", "font-size": "1.05rem" } }, xl = { class: "parent-call-container" }, kl = { class: "stock-sections-container" }, Rl = { class: "stock-section-half" }, Tl = {
  key: 0,
  class: "order-section order-call-section"
}, Sl = {
  class: "order-header",
  style: { display: "flex", "justify-content": "space-between", "align-items": "center" }
}, _l = ["onClick"], Ll = { class: "stock-table-wrapper" }, Dl = { class: "stock-purchases-table" }, Fl = { class: "text-right" }, Ml = { class: "text-right" }, Pl = { class: "text-right" }, zl = { class: "total-row" }, Al = { class: "text-right" }, Ol = { class: "text-right" }, Hl = {
  key: 1,
  class: "order-section no-orders"
}, $l = { class: "stock-section-half" }, Bl = {
  key: 0,
  class: "order-section order-call-section"
}, Nl = {
  class: "order-header",
  style: { display: "flex", "justify-content": "space-between", "align-items": "center" }
}, Vl = ["onClick"], Il = { class: "stock-table-wrapper" }, Wl = { class: "stock-purchases-table" }, Gl = { class: "text-right" }, jl = { class: "text-right" }, Ul = { class: "text-right" }, ql = { class: "total-row" }, Kl = { class: "text-right" }, Ql = { class: "text-right" }, Xl = {
  key: 1,
  class: "order-section no-orders"
}, Jl = {
  key: 0,
  class: "order-section",
  style: { padding: "1rem" }
}, Yl = { style: { "font-size": "1.1rem", "margin-bottom": "0.75rem" } }, Zl = { style: { "margin-left": "1rem", color: "#6c757d", "font-size": "0.95rem" } }, eh = { key: 0 }, th = { key: 1 }, ih = { style: { "border-top": "1px solid #dee2e6", "margin-top": "0.25rem", "padding-top": "0.25rem", "font-weight": "600", color: "#2196f3", "font-size": "1.05rem" } }, sh = { class: "group-calculation" }, oh = {
  class: "calc-line indent",
  style: { "border-top": "1px solid #dee2e6", "margin-top": "0.5rem", "padding-top": "0.5rem" }
}, nh = { class: "calc-line indent" }, ah = {
  key: 0,
  class: "overall-adjusted-section"
}, rh = { class: "overall-adjusted-header" }, lh = { class: "overall-calculation-breakdown" }, hh = { class: "breakdown-line" }, dh = { class: "breakdown-line" }, ch = { class: "breakdown-line" }, uh = { key: 1 }, fh = {
  key: 0,
  class: "loading-message"
}, mh = {
  key: 1,
  class: "error-message"
}, ph = {
  key: 2,
  class: "no-data-message"
}, gh = { key: 3 }, bh = ["onClick"], vh = { class: "toggle-icon" }, yh = { class: "orders-count-badge" }, wh = { class: "group-content" }, Ch = { class: "parent-stock-container" }, Eh = { class: "stock-sections-container" }, xh = { class: "stock-section-half" }, kh = {
  key: 0,
  class: "order-section order-stock-section"
}, Rh = {
  class: "order-header",
  style: { display: "flex", "justify-content": "space-between", "align-items": "center" }
}, Th = ["onClick"], Sh = { class: "stock-table-wrapper" }, _h = { class: "stock-purchases-table" }, Lh = { class: "text-right" }, Dh = { class: "text-right" }, Fh = { class: "text-right" }, Mh = { class: "total-row" }, Ph = { class: "text-right" }, zh = { class: "text-right" }, Ah = {
  key: 1,
  class: "order-section no-orders"
}, Oh = { class: "stock-section-half" }, Hh = {
  key: 0,
  class: "order-section order-stock-section"
}, $h = {
  class: "order-header",
  style: { display: "flex", "justify-content": "space-between", "align-items": "center" }
}, Bh = ["onClick"], Nh = { class: "stock-table-wrapper" }, Vh = { class: "stock-purchases-table" }, Ih = { class: "text-right" }, Wh = { class: "text-right" }, Gh = { class: "text-right" }, jh = { class: "total-row" }, Uh = { class: "text-right" }, qh = { class: "text-right" }, Kh = {
  key: 1,
  class: "order-section no-orders"
}, Qh = {
  key: 0,
  class: "order-section",
  style: { padding: "1rem" }
}, Xh = { style: { "font-size": "1.1rem", "margin-bottom": "0.75rem" } }, Jh = { style: { "margin-bottom": "0.5rem" } }, Yh = { style: { "margin-left": "1rem", color: "#6c757d", "font-size": "0.95rem" } }, Zh = { key: 0 }, ed = { style: { "border-top": "1px solid #dee2e6", "margin-top": "0.25rem", "padding-top": "0.25rem", "font-weight": "600", color: "#28a745", "font-size": "1.05rem" } }, td = { style: { "margin-left": "1rem", color: "#6c757d", "font-size": "0.95rem" } }, id = { key: 0 }, sd = { style: { "border-top": "1px solid #dee2e6", "margin-top": "0.25rem", "padding-top": "0.25rem", "font-weight": "600", color: "#28a745", "font-size": "1.05rem" } }, od = { class: "parent-put-container" }, nd = { class: "stock-sections-container" }, ad = { class: "stock-section-half" }, rd = {
  key: 0,
  class: "order-section order-put-section"
}, ld = {
  class: "order-header",
  style: { display: "flex", "justify-content": "space-between", "align-items": "center" }
}, hd = ["onClick"], dd = { class: "stock-table-wrapper" }, cd = { class: "stock-purchases-table" }, ud = { class: "text-right" }, fd = { class: "text-right" }, md = { class: "text-right" }, pd = { class: "total-row" }, gd = { class: "text-right" }, bd = { class: "text-right" }, vd = {
  key: 1,
  class: "order-section no-orders"
}, yd = { class: "stock-section-half" }, wd = {
  key: 0,
  class: "order-section order-put-section"
}, Cd = {
  class: "order-header",
  style: { display: "flex", "justify-content": "space-between", "align-items": "center" }
}, Ed = ["onClick"], xd = { class: "stock-table-wrapper" }, kd = { class: "stock-purchases-table" }, Rd = { class: "text-right" }, Td = { class: "text-right" }, Sd = { class: "text-right" }, _d = { class: "total-row" }, Ld = { class: "text-right" }, Dd = { class: "text-right" }, Fd = {
  key: 1,
  class: "order-section no-orders"
}, Md = {
  key: 0,
  class: "order-section",
  style: { padding: "1rem" }
}, Pd = { style: { "font-size": "1.1rem", "margin-bottom": "0.75rem" } }, zd = { style: { "margin-left": "1rem", color: "#6c757d", "font-size": "0.95rem" } }, Ad = { key: 0 }, Od = { key: 1 }, Hd = { style: { "border-top": "1px solid #dee2e6", "margin-top": "0.25rem", "padding-top": "0.25rem", "font-weight": "600", color: "#ff9800", "font-size": "1.05rem" } }, $d = { class: "parent-call-container" }, Bd = { class: "stock-sections-container" }, Nd = { class: "stock-section-half" }, Vd = {
  key: 0,
  class: "order-section order-call-section"
}, Id = {
  class: "order-header",
  style: { display: "flex", "justify-content": "space-between", "align-items": "center" }
}, Wd = ["onClick"], Gd = { class: "stock-table-wrapper" }, jd = { class: "stock-purchases-table" }, Ud = { class: "text-right" }, qd = { class: "text-right" }, Kd = { class: "text-right" }, Qd = { class: "total-row" }, Xd = { class: "text-right" }, Jd = { class: "text-right" }, Yd = {
  key: 1,
  class: "order-section no-orders"
}, Zd = { class: "stock-section-half" }, ec = {
  key: 0,
  class: "order-section order-call-section"
}, tc = {
  class: "order-header",
  style: { display: "flex", "justify-content": "space-between", "align-items": "center" }
}, ic = ["onClick"], sc = { class: "stock-table-wrapper" }, oc = { class: "stock-purchases-table" }, nc = { class: "text-right" }, ac = { class: "text-right" }, rc = { class: "text-right" }, lc = { class: "total-row" }, hc = { class: "text-right" }, dc = { class: "text-right" }, cc = {
  key: 1,
  class: "order-section no-orders"
}, uc = {
  key: 0,
  class: "order-section",
  style: { padding: "1rem" }
}, fc = { style: { "font-size": "1.1rem", "margin-bottom": "0.75rem" } }, mc = { style: { "margin-left": "1rem", color: "#6c757d", "font-size": "0.95rem" } }, pc = { key: 0 }, gc = { key: 1 }, bc = { style: { "border-top": "1px solid #dee2e6", "margin-top": "0.25rem", "padding-top": "0.25rem", "font-weight": "600", color: "#2196f3", "font-size": "1.05rem" } }, vc = { class: "group-calculation" }, yc = {
  class: "calc-line indent",
  style: { "border-top": "1px solid #dee2e6", "margin-top": "0.5rem", "padding-top": "0.5rem" }
}, wc = { class: "calc-line indent" }, Cc = {
  key: 0,
  class: "overall-adjusted-section"
}, Ec = { class: "overall-adjusted-header" }, xc = { class: "overall-calculation-breakdown" }, kc = { class: "breakdown-line" }, Rc = { class: "breakdown-line" }, Tc = { class: "breakdown-line" }, Sc = /* @__PURE__ */ os({
  __name: "CalculationDetails",
  props: {
    showCalculationDetails: { type: Boolean },
    avgPriceCalculationTab: {},
    orderGroups: {},
    overallAdjustedAvgPriceFromOrders: {},
    totalNetCost: {},
    totalShares: {},
    isAvgPriceFromOrdersLoading: { type: Boolean },
    avgPriceFromOrdersError: {},
    orderGroupsExitToday: {},
    overallAdjustedAvgPriceFromOrdersExitToday: {},
    totalNetCostExitToday: {},
    totalSharesExitToday: {},
    isAvgPriceFromOrdersLoadingExitToday: { type: Boolean },
    avgPriceFromOrdersErrorExitToday: {}
  },
  emits: ["update:avgPriceCalculationTab"],
  setup(h, { emit: e }) {
    const t = e, i = B(/* @__PURE__ */ new Set()), s = B(""), o = B(!1);
    function n(x) {
      s.value = x, o.value = !0, setTimeout(() => {
        o.value = !1;
      }, 2e3);
    }
    function a(x) {
      i.value.has(x) ? i.value.delete(x) : i.value.add(x), i.value = new Set(i.value);
    }
    async function r(x, g) {
      try {
        const f = "Date	Quantity	Avg Price	Total Cost", P = L(x).map((A) => {
          const w = y(A.orderDate), M = A.quantity.toLocaleString(), Z = Number(A.avgPrice).toFixed(2), Q = Number(A.totalCost).toFixed(2);
          return `${w}	${M}	${Z}	${Q}`;
        }).join(`
`), S = x.reduce((A, w) => A + w.quantity, 0).toLocaleString(), I = x.reduce((A, w) => A + Number(w.totalCost), 0).toFixed(2), z = `Total	${S}		${I}`, V = `${f}
${P}
${z}`;
        await navigator.clipboard.writeText(V), console.log("✅ Stock purchases copied to clipboard"), n("✅ Stock purchases copied!");
      } catch (f) {
        console.error("Failed to copy to clipboard:", f), n("❌ Failed to copy");
      }
    }
    async function d(x, g) {
      try {
        const f = "Date	Quantity	Avg Price	Total Proceeds", P = L(x).map((A) => {
          const w = y(A.orderDate), M = A.quantity.toLocaleString(), Z = Number(A.avgPrice).toFixed(2), Q = Number(A.totalCost).toFixed(2);
          return `${w}	${M}	${Z}	${Q}`;
        }).join(`
`), S = x.reduce((A, w) => A + w.quantity, 0).toLocaleString(), I = x.reduce((A, w) => A + Number(w.totalCost), 0).toFixed(2), z = `Total	${S}		${I}`, V = `${f}
${P}
${z}`;
        await navigator.clipboard.writeText(V), console.log("✅ Stock sales copied to clipboard"), n("✅ Stock sales copied!");
      } catch (f) {
        console.error("Failed to copy to clipboard:", f), n("❌ Failed to copy");
      }
    }
    async function c(x, g, f) {
      try {
        const D = "Option	Date	Quantity	Avg Price	Total Premium", S = L(x).map((A) => {
          const w = _(A.symbol), M = y(A.orderDate), Z = A.quantity.toLocaleString(), Q = Number(A.avgPrice).toFixed(2), he = Number(A.totalCost).toFixed(2);
          return `${w}	${M}	${Z}	${Q}	${he}`;
        }).join(`
`), z = `Total		${x.reduce((A, w) => A + w.quantity, 0).toLocaleString()}		${Math.abs(f).toFixed(2)}`, V = `${D}
${S}
${z}`;
        await navigator.clipboard.writeText(V), console.log("✅ Put sales copied to clipboard"), n("✅ Put premium copied!");
      } catch (D) {
        console.error("Failed to copy to clipboard:", D), n("❌ Failed to copy");
      }
    }
    async function u(x, g, f) {
      try {
        const D = "Option	Date	Quantity	Avg Price	Total Cost", S = L(x).map((A) => {
          const w = _(A.symbol), M = y(A.orderDate), Z = A.quantity.toLocaleString(), Q = Number(A.avgPrice).toFixed(2), he = Number(A.totalCost).toFixed(2);
          return `${w}	${M}	${Z}	${Q}	${he}`;
        }).join(`
`), z = `Total		${x.reduce((A, w) => A + w.quantity, 0).toLocaleString()}		${Math.abs(f).toFixed(2)}`, V = `${D}
${S}
${z}`;
        await navigator.clipboard.writeText(V), console.log("✅ Put buybacks copied to clipboard"), n("✅ Put buybacks copied!");
      } catch (D) {
        console.error("Failed to copy to clipboard:", D), n("❌ Failed to copy");
      }
    }
    async function p(x, g, f) {
      try {
        const D = "Option	Date	Quantity	Avg Price	Total Premium", S = L(x).map((A) => {
          const w = _(A.symbol), M = y(A.orderDate), Z = A.quantity.toLocaleString(), Q = Number(A.avgPrice).toFixed(2), he = Number(A.totalCost).toFixed(2);
          return `${w}	${M}	${Z}	${Q}	${he}`;
        }).join(`
`), z = `Total		${x.reduce((A, w) => A + w.quantity, 0).toLocaleString()}		${Math.abs(f).toFixed(2)}`, V = `${D}
${S}
${z}`;
        await navigator.clipboard.writeText(V), console.log("✅ Call sales copied to clipboard"), n("✅ Call premium copied!");
      } catch (D) {
        console.error("Failed to copy to clipboard:", D), n("❌ Failed to copy");
      }
    }
    async function v(x, g, f) {
      try {
        const D = "Option	Date	Quantity	Avg Price	Total Cost", S = L(x).map((A) => {
          const w = _(A.symbol), M = y(A.orderDate), Z = A.quantity.toLocaleString(), Q = Number(A.avgPrice).toFixed(2), he = Number(A.totalCost).toFixed(2);
          return `${w}	${M}	${Z}	${Q}	${he}`;
        }).join(`
`), z = `Total		${x.reduce((A, w) => A + w.quantity, 0).toLocaleString()}		${Math.abs(f).toFixed(2)}`, V = `${D}
${S}
${z}`;
        await navigator.clipboard.writeText(V), console.log("✅ Call buybacks copied to clipboard"), n("✅ Call buybacks copied!");
      } catch (D) {
        console.error("Failed to copy to clipboard:", D), n("❌ Failed to copy");
      }
    }
    function y(x) {
      if (!x) return "N/A";
      try {
        const g = x.split("/");
        if (g.length === 3) {
          const f = g[0], D = g[1], P = g[2], S = new Date(parseInt(P), parseInt(D) - 1, parseInt(f)), I = { year: "numeric", month: "short", day: "numeric" };
          return S.toLocaleDateString("en-US", I);
        }
      } catch (g) {
        console.error("Error formatting date:", g);
      }
      return x;
    }
    function L(x) {
      return [...x].sort((g, f) => {
        if (!g.orderDate) return 1;
        if (!f.orderDate) return -1;
        const D = (I) => {
          const z = I.split("/");
          return z.length === 3 ? new Date(parseInt(z[2]), parseInt(z[1]) - 1, parseInt(z[0])) : /* @__PURE__ */ new Date(0);
        }, P = D(g.orderDate);
        return D(f.orderDate).getTime() - P.getTime();
      });
    }
    function _(x) {
      if (!x) return "";
      const g = String(x).trim(), f = g.match(/^([A-Z]+)\s+(\d{6})([CP])(\d{8})$/);
      if (f) {
        f[1];
        const D = f[2], P = f[3], S = f[4], I = D.substring(0, 2), z = D.substring(2, 4), V = D.substring(4, 6), A = `20${I}-${z}-${V}`, w = (parseInt(S, 10) / 1e3).toString();
        return `${A} ${w} ${P}`;
      }
      return g;
    }
    return (x, g) => (E(), C(oe, null, [
      Ie(st, { name: "toast-fade" }, {
        default: ot(() => [
          o.value ? (E(), C("div", Ka, m(s.value), 1)) : U("", !0)
        ]),
        _: 1
      }),
      Ie(st, { name: "slide-fade" }, {
        default: ot(() => [
          He(l("div", Qa, [
            g[59] || (g[59] = l("h2", null, "Average Price calculation details :", -1)),
            l("div", Xa, [
              l("button", {
                class: de(["tab-button", { active: h.avgPriceCalculationTab === "hold-orders" }]),
                onClick: g[0] || (g[0] = (f) => t("update:avgPriceCalculationTab", "hold-orders"))
              }, " Hold orders till expiry ", 2),
              l("button", {
                class: de(["tab-button", { active: h.avgPriceCalculationTab === "exit-orders" }]),
                onClick: g[1] || (g[1] = (f) => t("update:avgPriceCalculationTab", "exit-orders"))
              }, " Exit orders today ", 2)
            ]),
            h.avgPriceCalculationTab === "hold-orders" ? (E(), C("div", Ja, [
              h.isAvgPriceFromOrdersLoading ? (E(), C("div", Ya, [...g[2] || (g[2] = [
                l("span", { class: "loading-spinner" }, "⏳", -1),
                Y(" Loading order data... ", -1)
              ])])) : h.avgPriceFromOrdersError ? (E(), C("div", Za, " ❌ Error loading orders: " + m(h.avgPriceFromOrdersError), 1)) : !h.orderGroups || h.orderGroups.length === 0 ? (E(), C("div", er, [...g[3] || (g[3] = [
                l("p", null, "No order data found for these positions.", -1)
              ])])) : (E(), C("div", tr, [
                (E(!0), C(oe, null, ae(h.orderGroups, (f, D) => {
                  var P, S, I, z, V, A;
                  return E(), C("div", {
                    key: `order-group-${D}`,
                    class: "position-group"
                  }, [
                    l("div", {
                      class: "group-header clickable",
                      onClick: (w) => a(D)
                    }, [
                      l("span", sr, m(i.value.has(D) ? "▼" : "▶"), 1),
                      Y(" Client " + m(D + 1) + ": " + m(f.mainPosition.account) + " ", 1),
                      l("span", or, m((((P = f.stockPurchases) == null ? void 0 : P.length) || 0) + (((S = f.stockSales) == null ? void 0 : S.length) || 0) + (((I = f.putSales) == null ? void 0 : I.length) || 0) + (((z = f.putBuybacks) == null ? void 0 : z.length) || 0) + (((V = f.callSales) == null ? void 0 : V.length) || 0) + (((A = f.callBuybacks) == null ? void 0 : A.length) || 0)) + " orders ", 1)
                    ], 8, ir),
                    Ie(st, { name: "slide-fade" }, {
                      default: ot(() => [
                        He(l("div", nr, [
                          l("div", ar, [
                            g[12] || (g[12] = Y(" Section: A ", -1)),
                            l("div", rr, [
                              l("div", lr, [
                                f.stockPurchases && f.stockPurchases.length > 0 ? (E(), C("div", hr, [
                                  l("div", dr, [
                                    l("span", null, "📍 Stock Purchases (" + m(f.stockPurchases.length) + ")", 1),
                                    l("button", {
                                      class: "copy-button",
                                      onClick: (w) => r(f.stockPurchases),
                                      title: "Copy to clipboard (Excel-ready)"
                                    }, " 📋 Copy ", 8, cr)
                                  ]),
                                  l("div", ur, [
                                    l("table", fr, [
                                      g[6] || (g[6] = l("thead", null, [
                                        l("tr", null, [
                                          l("th", null, "Settlement Date"),
                                          l("th", null, "Quantity"),
                                          l("th", null, "Avg Price"),
                                          l("th", null, "Total Cost")
                                        ])
                                      ], -1)),
                                      l("tbody", null, [
                                        (E(!0), C(oe, null, ae(L(f.stockPurchases), (w, M) => (E(), C("tr", {
                                          key: `stock-${D}-${M}`
                                        }, [
                                          l("td", null, m(y(w.orderDate)), 1),
                                          l("td", mr, m(w.quantity.toLocaleString()), 1),
                                          l("td", pr, "$" + m(Number(w.avgPrice).toFixed(2)), 1),
                                          l("td", gr, "$" + m(Number(w.totalCost).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)
                                        ]))), 128))
                                      ]),
                                      l("tfoot", null, [
                                        l("tr", br, [
                                          g[4] || (g[4] = l("td", null, [
                                            l("strong", null, "Total")
                                          ], -1)),
                                          l("td", vr, [
                                            l("strong", null, m(f.stockPurchases.reduce((w, M) => w + M.quantity, 0).toLocaleString()), 1)
                                          ]),
                                          g[5] || (g[5] = l("td", { class: "text-right" }, "-", -1)),
                                          l("td", yr, [
                                            l("strong", null, "$" + m(f.stockPurchases.reduce((w, M) => w + Number(M.totalCost), 0).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)
                                          ])
                                        ])
                                      ])
                                    ])
                                  ])
                                ])) : (E(), C("div", wr, "No stock purchases found"))
                              ]),
                              l("div", Cr, [
                                f.stockSales && f.stockSales.length > 0 ? (E(), C("div", Er, [
                                  l("div", xr, [
                                    l("span", null, "💰 Stock Sales (" + m(f.stockSales.length) + ")", 1),
                                    l("button", {
                                      class: "copy-button",
                                      onClick: (w) => d(f.stockSales),
                                      title: "Copy to clipboard (Excel-ready)"
                                    }, " 📋 Copy ", 8, kr)
                                  ]),
                                  l("div", Rr, [
                                    l("table", Tr, [
                                      g[9] || (g[9] = l("thead", null, [
                                        l("tr", null, [
                                          l("th", null, "Settlement Date"),
                                          l("th", null, "Quantity"),
                                          l("th", null, "Avg Price"),
                                          l("th", null, "Total Proceeds")
                                        ])
                                      ], -1)),
                                      l("tbody", null, [
                                        (E(!0), C(oe, null, ae(L(f.stockSales), (w, M) => (E(), C("tr", {
                                          key: `stock-sale-${D}-${M}`
                                        }, [
                                          l("td", null, m(y(w.orderDate)), 1),
                                          l("td", Sr, m(w.quantity.toLocaleString()), 1),
                                          l("td", _r, "$" + m(Number(w.avgPrice).toFixed(2)), 1),
                                          l("td", Lr, "$" + m(Number(w.totalCost).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)
                                        ]))), 128))
                                      ]),
                                      l("tfoot", null, [
                                        l("tr", Dr, [
                                          g[7] || (g[7] = l("td", null, [
                                            l("strong", null, "Total")
                                          ], -1)),
                                          l("td", Fr, [
                                            l("strong", null, m(f.stockSales.reduce((w, M) => w + M.quantity, 0).toLocaleString()), 1)
                                          ]),
                                          g[8] || (g[8] = l("td", { class: "text-right" }, "-", -1)),
                                          l("td", Mr, [
                                            l("strong", null, "$" + m(f.stockSales.reduce((w, M) => w + Number(M.totalCost), 0).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)
                                          ])
                                        ])
                                      ])
                                    ])
                                  ])
                                ])) : (E(), C("div", Pr, "No stock sales found"))
                              ])
                            ]),
                            f.netStockCost !== void 0 || f.totalShares ? (E(), C("div", zr, [
                              l("div", Ar, [
                                l("div", Or, [
                                  g[10] || (g[10] = l("div", { style: { "font-weight": "600", color: "#495057", "margin-bottom": "0.25rem" } }, "Net Stock Cost:", -1)),
                                  l("div", Hr, [
                                    l("div", null, "Total Stock Purchases: $" + m(f.stockPurchaseCost.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1),
                                    f.stockSaleProceeds && f.stockSaleProceeds > 0 ? (E(), C("div", $r, "Less: Stock Sales: $" + m(Math.abs(f.stockSaleProceeds).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)) : U("", !0),
                                    l("div", Br, " = $" + m(f.netStockCost.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)
                                  ])
                                ]),
                                l("div", null, [
                                  g[11] || (g[11] = l("div", { style: { "font-weight": "600", color: "#495057", "margin-bottom": "0.25rem" } }, "Current Shares:", -1)),
                                  l("div", Nr, [
                                    l("div", null, "Total Purchased: " + m(f.stockPurchases.reduce((w, M) => w + M.quantity, 0).toLocaleString()) + " shares", 1),
                                    f.stockSales && f.stockSales.length > 0 ? (E(), C("div", Vr, "Less: Sold: " + m(f.stockSales.reduce((w, M) => w + M.quantity, 0).toLocaleString()) + " shares", 1)) : U("", !0),
                                    l("div", Ir, " = " + m(f.totalShares.toLocaleString()) + " shares ", 1)
                                  ])
                                ])
                              ])
                            ])) : U("", !0)
                          ]),
                          l("div", Wr, [
                            g[20] || (g[20] = Y(" Section: B ", -1)),
                            l("div", Gr, [
                              l("div", jr, [
                                f.putSales && f.putSales.length > 0 ? (E(), C("div", Ur, [
                                  l("div", qr, [
                                    l("span", null, "📉 Put Premium Received (" + m(f.putSales.length) + ")", 1),
                                    l("button", {
                                      class: "copy-button",
                                      onClick: (w) => c(f.putSales, D, f.putPremiumReceived),
                                      title: "Copy to clipboard (Excel-ready)"
                                    }, " 📋 Copy ", 8, Kr)
                                  ]),
                                  l("div", Qr, [
                                    l("table", Xr, [
                                      g[15] || (g[15] = l("thead", null, [
                                        l("tr", null, [
                                          l("th", null, "Option"),
                                          l("th", null, "Settlement Date"),
                                          l("th", null, "Quantity"),
                                          l("th", null, "Avg Price"),
                                          l("th", null, "Total Premium")
                                        ])
                                      ], -1)),
                                      l("tbody", null, [
                                        (E(!0), C(oe, null, ae(L(f.putSales), (w, M) => (E(), C("tr", {
                                          key: `put-${D}-${M}`
                                        }, [
                                          l("td", null, m(_(w.symbol)), 1),
                                          l("td", null, m(y(w.orderDate)), 1),
                                          l("td", Jr, m(w.quantity.toLocaleString()), 1),
                                          l("td", Yr, "$" + m(Number(w.avgPrice).toFixed(2)), 1),
                                          l("td", Zr, "$" + m(Number(w.totalCost).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)
                                        ]))), 128))
                                      ]),
                                      l("tfoot", null, [
                                        l("tr", el, [
                                          g[13] || (g[13] = l("td", { colspan: "2" }, [
                                            l("strong", null, "Total")
                                          ], -1)),
                                          l("td", tl, [
                                            l("strong", null, m(f.putSales.reduce((w, M) => w + M.quantity, 0).toLocaleString()), 1)
                                          ]),
                                          g[14] || (g[14] = l("td", { class: "text-right" }, "-", -1)),
                                          l("td", il, [
                                            l("strong", null, "$" + m(Math.abs(f.putPremiumReceived).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)
                                          ])
                                        ])
                                      ])
                                    ])
                                  ])
                                ])) : (E(), C("div", sl, "No put premium received"))
                              ]),
                              l("div", ol, [
                                f.putBuybacks && f.putBuybacks.length > 0 ? (E(), C("div", nl, [
                                  l("div", al, [
                                    l("span", null, "🔄 Put Buybacks (" + m(f.putBuybacks.length) + ")", 1),
                                    l("button", {
                                      class: "copy-button",
                                      onClick: (w) => u(f.putBuybacks, D, f.putBuybackCost),
                                      title: "Copy to clipboard (Excel-ready)"
                                    }, " 📋 Copy ", 8, rl)
                                  ]),
                                  l("div", ll, [
                                    l("table", hl, [
                                      g[18] || (g[18] = l("thead", null, [
                                        l("tr", null, [
                                          l("th", null, "Option"),
                                          l("th", null, "Settlement Date"),
                                          l("th", null, "Quantity"),
                                          l("th", null, "Avg Price"),
                                          l("th", null, "Total Cost")
                                        ])
                                      ], -1)),
                                      l("tbody", null, [
                                        (E(!0), C(oe, null, ae(L(f.putBuybacks), (w, M) => (E(), C("tr", {
                                          key: `put-buyback-${D}-${M}`
                                        }, [
                                          l("td", null, m(_(w.symbol)), 1),
                                          l("td", null, m(y(w.orderDate)), 1),
                                          l("td", dl, m(w.quantity.toLocaleString()), 1),
                                          l("td", cl, "$" + m(Number(w.avgPrice).toFixed(2)), 1),
                                          l("td", ul, "$" + m(Number(w.totalCost).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)
                                        ]))), 128))
                                      ]),
                                      l("tfoot", null, [
                                        l("tr", fl, [
                                          g[16] || (g[16] = l("td", { colspan: "2" }, [
                                            l("strong", null, "Total")
                                          ], -1)),
                                          l("td", ml, [
                                            l("strong", null, m(f.putBuybacks.reduce((w, M) => w + M.quantity, 0).toLocaleString()), 1)
                                          ]),
                                          g[17] || (g[17] = l("td", { class: "text-right" }, "-", -1)),
                                          l("td", pl, [
                                            l("strong", null, "$" + m(Math.abs(f.putBuybackCost).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)
                                          ])
                                        ])
                                      ])
                                    ])
                                  ])
                                ])) : (E(), C("div", gl, "No put buybacks found"))
                              ])
                            ]),
                            f.putSales && f.putSales.length > 0 || f.putBuybacks && f.putBuybacks.length > 0 ? (E(), C("div", bl, [
                              l("div", vl, [
                                l("div", null, [
                                  g[19] || (g[19] = l("div", { style: { "font-weight": "600", color: "#495057", "margin-bottom": "0.25rem" } }, "📊Net Put Cash Flow:", -1)),
                                  l("div", yl, [
                                    f.putPremiumReceived > 0 ? (E(), C("div", wl, "Put Premium Received: $" + m(Math.abs(f.putPremiumReceived).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)) : U("", !0),
                                    f.putBuybackCost && f.putBuybackCost > 0 ? (E(), C("div", Cl, "Less: Put Buyback Cost: $" + m(Math.abs(f.putBuybackCost).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)) : U("", !0),
                                    l("div", El, " = $" + m(f.netPutCashFlow.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)
                                  ])
                                ])
                              ])
                            ])) : U("", !0)
                          ]),
                          l("div", xl, [
                            g[28] || (g[28] = Y(" Section: C ", -1)),
                            l("div", kl, [
                              l("div", Rl, [
                                f.callSales && f.callSales.length > 0 ? (E(), C("div", Tl, [
                                  l("div", Sl, [
                                    l("span", null, "📞 Call Premiums Received (" + m(f.callSales.length) + ")", 1),
                                    l("button", {
                                      class: "copy-button",
                                      onClick: (w) => p(f.callSales, D, f.callPremiumReceived),
                                      title: "Copy to clipboard (Excel-ready)"
                                    }, " 📋 Copy ", 8, _l)
                                  ]),
                                  l("div", Ll, [
                                    l("table", Dl, [
                                      g[23] || (g[23] = l("thead", null, [
                                        l("tr", null, [
                                          l("th", null, "Option"),
                                          l("th", null, "Settlement Date"),
                                          l("th", null, "Quantity"),
                                          l("th", null, "Avg Price"),
                                          l("th", null, "Total Premium")
                                        ])
                                      ], -1)),
                                      l("tbody", null, [
                                        (E(!0), C(oe, null, ae(L(f.callSales), (w, M) => (E(), C("tr", {
                                          key: `call-${D}-${M}`
                                        }, [
                                          l("td", null, m(_(w.symbol)), 1),
                                          l("td", null, m(y(w.orderDate)), 1),
                                          l("td", Fl, m(w.quantity.toLocaleString()), 1),
                                          l("td", Ml, "$" + m(Number(w.avgPrice).toFixed(2)), 1),
                                          l("td", Pl, "$" + m(Number(w.totalCost).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)
                                        ]))), 128))
                                      ]),
                                      l("tfoot", null, [
                                        l("tr", zl, [
                                          g[21] || (g[21] = l("td", { colspan: "2" }, [
                                            l("strong", null, "Total")
                                          ], -1)),
                                          l("td", Al, [
                                            l("strong", null, m(f.callSales.reduce((w, M) => w + M.quantity, 0).toLocaleString()), 1)
                                          ]),
                                          g[22] || (g[22] = l("td", { class: "text-right" }, "-", -1)),
                                          l("td", Ol, [
                                            l("strong", null, "$" + m(Math.abs(f.callPremiumReceived).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)
                                          ])
                                        ])
                                      ])
                                    ])
                                  ])
                                ])) : (E(), C("div", Hl, "No call premium received"))
                              ]),
                              l("div", $l, [
                                f.callBuybacks && f.callBuybacks.length > 0 ? (E(), C("div", Bl, [
                                  l("div", Nl, [
                                    l("span", null, "🔄 Call Buybacks (" + m(f.callBuybacks.length) + ")", 1),
                                    l("button", {
                                      class: "copy-button",
                                      onClick: (w) => v(f.callBuybacks, D, f.callBuybackCost),
                                      title: "Copy to clipboard (Excel-ready)"
                                    }, " 📋 Copy ", 8, Vl)
                                  ]),
                                  l("div", Il, [
                                    l("table", Wl, [
                                      g[26] || (g[26] = l("thead", null, [
                                        l("tr", null, [
                                          l("th", null, "Option"),
                                          l("th", null, "Settlement Date"),
                                          l("th", null, "Quantity"),
                                          l("th", null, "Avg Price"),
                                          l("th", null, "Total Cost")
                                        ])
                                      ], -1)),
                                      l("tbody", null, [
                                        (E(!0), C(oe, null, ae(L(f.callBuybacks), (w, M) => (E(), C("tr", {
                                          key: `call-buyback-${D}-${M}`
                                        }, [
                                          l("td", null, m(_(w.symbol)), 1),
                                          l("td", null, m(y(w.orderDate)), 1),
                                          l("td", Gl, m(w.quantity.toLocaleString()), 1),
                                          l("td", jl, "$" + m(Number(w.avgPrice).toFixed(2)), 1),
                                          l("td", Ul, "$" + m(Number(w.totalCost).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)
                                        ]))), 128))
                                      ]),
                                      l("tfoot", null, [
                                        l("tr", ql, [
                                          g[24] || (g[24] = l("td", { colspan: "2" }, [
                                            l("strong", null, "Total")
                                          ], -1)),
                                          l("td", Kl, [
                                            l("strong", null, m(f.callBuybacks.reduce((w, M) => w + M.quantity, 0).toLocaleString()), 1)
                                          ]),
                                          g[25] || (g[25] = l("td", { class: "text-right" }, "-", -1)),
                                          l("td", Ql, [
                                            l("strong", null, "$" + m(Math.abs(f.callBuybackCost).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)
                                          ])
                                        ])
                                      ])
                                    ])
                                  ])
                                ])) : (E(), C("div", Xl, "No call buybacks found"))
                              ])
                            ]),
                            f.callSales && f.callSales.length > 0 || f.callBuybacks && f.callBuybacks.length > 0 ? (E(), C("div", Jl, [
                              l("div", Yl, [
                                l("div", null, [
                                  g[27] || (g[27] = l("div", { style: { "font-weight": "600", color: "#495057", "margin-bottom": "0.25rem" } }, "📊 Net Call Cash Flow:", -1)),
                                  l("div", Zl, [
                                    f.callPremiumReceived > 0 ? (E(), C("div", eh, "Call Premium Received: $" + m(Math.abs(f.callPremiumReceived).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)) : U("", !0),
                                    f.callBuybackCost && f.callBuybackCost > 0 ? (E(), C("div", th, "Less: Call Buyback Cost: $" + m(Math.abs(f.callBuybackCost).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)) : U("", !0),
                                    l("div", ih, " = $" + m(f.netCallCashFlow.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)
                                  ])
                                ])
                              ])
                            ])) : U("", !0)
                          ]),
                          l("div", sh, [
                            g[29] || (g[29] = l("div", { class: "calc-line" }, [
                              Y("📊 "),
                              l("strong", null, "Calculation:")
                            ], -1)),
                            l("div", oh, [
                              l("strong", null, "Total Net Cost = $" + m(f.netStockCost.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })) + " - $" + m(Math.abs(f.netPutCashFlow || f.putPremiumReceived).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })) + " - $" + m(Math.abs(f.netCallCashFlow || f.callPremiumReceived).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })) + " = $" + m(f.netCost.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)
                            ]),
                            l("div", nh, [
                              l("strong", null, "Adjusted Avg Price = $" + m(f.netCost.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })) + " ÷ " + m(f.totalShares.toLocaleString()) + " = $" + m(f.adjustedAvgPricePerShare.toFixed(2)) + " per share", 1)
                            ])
                          ])
                        ], 512), [
                          [mt, i.value.has(D)]
                        ])
                      ]),
                      _: 2
                    }, 1024)
                  ]);
                }), 128)),
                h.overallAdjustedAvgPriceFromOrders !== null ? (E(), C("div", ah, [
                  l("div", rh, " 🎯 Overall Adjusted Average: $" + m(h.overallAdjustedAvgPriceFromOrders.toFixed(2)) + " per share ", 1),
                  l("div", lh, [
                    l("div", hh, "Total Net Cost = " + m(h.orderGroups.map((f) => `$${f.netCost.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).join(" + ")) + " = $" + m(h.totalNetCost.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1),
                    l("div", dh, "Total Main Qty = " + m(h.orderGroups.map((f) => f.totalShares.toLocaleString()).join(" + ")) + " = " + m(h.totalShares.toLocaleString()), 1),
                    l("div", ch, [
                      l("strong", null, "Overall Adjusted Average = $" + m(h.totalNetCost.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })) + " ÷ " + m(h.totalShares.toLocaleString()) + " = $" + m(h.overallAdjustedAvgPriceFromOrders.toFixed(2)), 1)
                    ])
                  ])
                ])) : U("", !0)
              ]))
            ])) : h.avgPriceCalculationTab === "exit-orders" ? (E(), C("div", uh, [
              h.isAvgPriceFromOrdersLoadingExitToday ? (E(), C("div", fh, [...g[30] || (g[30] = [
                l("span", { class: "loading-spinner" }, "⏳", -1),
                Y(" Loading exit today calculation... ", -1)
              ])])) : h.avgPriceFromOrdersErrorExitToday ? (E(), C("div", mh, " ❌ Error loading exit today data: " + m(h.avgPriceFromOrdersErrorExitToday), 1)) : !h.orderGroupsExitToday || h.orderGroupsExitToday.length === 0 ? (E(), C("div", ph, [...g[31] || (g[31] = [
                l("p", null, "No order data found for exit today calculation.", -1)
              ])])) : (E(), C("div", gh, [
                g[58] || (g[58] = l("div", {
                  class: "info-banner",
                  style: { background: "#fff3cd", "border-left": "4px solid #ffc107", padding: "1rem", "margin-bottom": "1.5rem", "border-radius": "4px" }
                }, [
                  l("strong", null, "ℹ️ Exit Today Calculation:"),
                  Y(" This shows your average cost if you were to exit all positions today. For call options, this uses the current unrealized P&L (current market value) instead of the original premium received. ")
                ], -1)),
                (E(!0), C(oe, null, ae(h.orderGroupsExitToday, (f, D) => {
                  var P, S, I, z, V, A;
                  return E(), C("div", {
                    key: `exit-order-group-${D}`,
                    class: "position-group"
                  }, [
                    l("div", {
                      class: "group-header clickable",
                      onClick: (w) => a(D)
                    }, [
                      l("span", vh, m(i.value.has(D) ? "▼" : "▶"), 1),
                      Y(" Client " + m(D + 1) + ": " + m(f.mainPosition.account) + " ", 1),
                      l("span", yh, m((((P = f.stockPurchases) == null ? void 0 : P.length) || 0) + (((S = f.stockSales) == null ? void 0 : S.length) || 0) + (((I = f.putSales) == null ? void 0 : I.length) || 0) + (((z = f.putBuybacks) == null ? void 0 : z.length) || 0) + (((V = f.callSales) == null ? void 0 : V.length) || 0) + (((A = f.callBuybacks) == null ? void 0 : A.length) || 0)) + " orders ", 1)
                    ], 8, bh),
                    Ie(st, { name: "slide-fade" }, {
                      default: ot(() => [
                        He(l("div", wh, [
                          l("div", Ch, [
                            g[40] || (g[40] = Y(" Section: A ", -1)),
                            l("div", Eh, [
                              l("div", xh, [
                                f.stockPurchases && f.stockPurchases.length > 0 ? (E(), C("div", kh, [
                                  l("div", Rh, [
                                    l("span", null, "📍 Stock Purchases (" + m(f.stockPurchases.length) + ")", 1),
                                    l("button", {
                                      class: "copy-button",
                                      onClick: (w) => r(f.stockPurchases),
                                      title: "Copy to clipboard (Excel-ready)"
                                    }, " 📋 Copy ", 8, Th)
                                  ]),
                                  l("div", Sh, [
                                    l("table", _h, [
                                      g[34] || (g[34] = l("thead", null, [
                                        l("tr", null, [
                                          l("th", null, "Settlement Date"),
                                          l("th", null, "Quantity"),
                                          l("th", null, "Avg Price"),
                                          l("th", null, "Total Cost")
                                        ])
                                      ], -1)),
                                      l("tbody", null, [
                                        (E(!0), C(oe, null, ae(L(f.stockPurchases), (w, M) => (E(), C("tr", {
                                          key: `exit-stock-${D}-${M}`
                                        }, [
                                          l("td", null, m(y(w.orderDate)), 1),
                                          l("td", Lh, m(w.quantity.toLocaleString()), 1),
                                          l("td", Dh, "$" + m(Number(w.avgPrice).toFixed(2)), 1),
                                          l("td", Fh, "$" + m(Number(w.totalCost).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)
                                        ]))), 128))
                                      ]),
                                      l("tfoot", null, [
                                        l("tr", Mh, [
                                          g[32] || (g[32] = l("td", null, [
                                            l("strong", null, "Total")
                                          ], -1)),
                                          l("td", Ph, [
                                            l("strong", null, m(f.stockPurchases.reduce((w, M) => w + M.quantity, 0).toLocaleString()), 1)
                                          ]),
                                          g[33] || (g[33] = l("td", { class: "text-right" }, "-", -1)),
                                          l("td", zh, [
                                            l("strong", null, "$" + m(f.stockPurchases.reduce((w, M) => w + Number(M.totalCost), 0).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)
                                          ])
                                        ])
                                      ])
                                    ])
                                  ])
                                ])) : (E(), C("div", Ah, "No stock purchases found"))
                              ]),
                              l("div", Oh, [
                                f.stockSales && f.stockSales.length > 0 ? (E(), C("div", Hh, [
                                  l("div", $h, [
                                    l("span", null, "💰 Stock Sales (" + m(f.stockSales.length) + ")", 1),
                                    l("button", {
                                      class: "copy-button",
                                      onClick: (w) => d(f.stockSales),
                                      title: "Copy to clipboard (Excel-ready)"
                                    }, " 📋 Copy ", 8, Bh)
                                  ]),
                                  l("div", Nh, [
                                    l("table", Vh, [
                                      g[37] || (g[37] = l("thead", null, [
                                        l("tr", null, [
                                          l("th", null, "Settlement Date"),
                                          l("th", null, "Quantity"),
                                          l("th", null, "Avg Price"),
                                          l("th", null, "Total Proceeds")
                                        ])
                                      ], -1)),
                                      l("tbody", null, [
                                        (E(!0), C(oe, null, ae(L(f.stockSales), (w, M) => (E(), C("tr", {
                                          key: `exit-stock-sale-${D}-${M}`
                                        }, [
                                          l("td", null, m(y(w.orderDate)), 1),
                                          l("td", Ih, m(w.quantity.toLocaleString()), 1),
                                          l("td", Wh, "$" + m(Number(w.avgPrice).toFixed(2)), 1),
                                          l("td", Gh, "$" + m(Number(w.totalCost).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)
                                        ]))), 128))
                                      ]),
                                      l("tfoot", null, [
                                        l("tr", jh, [
                                          g[35] || (g[35] = l("td", null, [
                                            l("strong", null, "Total")
                                          ], -1)),
                                          l("td", Uh, [
                                            l("strong", null, m(f.stockSales.reduce((w, M) => w + M.quantity, 0).toLocaleString()), 1)
                                          ]),
                                          g[36] || (g[36] = l("td", { class: "text-right" }, "-", -1)),
                                          l("td", qh, [
                                            l("strong", null, "$" + m(f.stockSales.reduce((w, M) => w + Number(M.totalCost), 0).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)
                                          ])
                                        ])
                                      ])
                                    ])
                                  ])
                                ])) : (E(), C("div", Kh, "No stock sales found"))
                              ])
                            ]),
                            f.netStockCost !== void 0 || f.totalShares ? (E(), C("div", Qh, [
                              l("div", Xh, [
                                l("div", Jh, [
                                  g[38] || (g[38] = l("div", { style: { "font-weight": "600", color: "#495057", "margin-bottom": "0.25rem" } }, "Net Stock Cost:", -1)),
                                  l("div", Yh, [
                                    l("div", null, "Total Stock Purchases: $" + m(f.stockPurchaseCost.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1),
                                    f.stockSaleProceeds && f.stockSaleProceeds > 0 ? (E(), C("div", Zh, "Less: Stock Sales: $" + m(Math.abs(f.stockSaleProceeds).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)) : U("", !0),
                                    l("div", ed, " = $" + m(f.netStockCost.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)
                                  ])
                                ]),
                                l("div", null, [
                                  g[39] || (g[39] = l("div", { style: { "font-weight": "600", color: "#495057", "margin-bottom": "0.25rem" } }, "Current Shares:", -1)),
                                  l("div", td, [
                                    l("div", null, "Total Purchased: " + m(f.stockPurchases.reduce((w, M) => w + M.quantity, 0).toLocaleString()) + " shares", 1),
                                    f.stockSales && f.stockSales.length > 0 ? (E(), C("div", id, "Less: Sold: " + m(f.stockSales.reduce((w, M) => w + M.quantity, 0).toLocaleString()) + " shares", 1)) : U("", !0),
                                    l("div", sd, " = " + m(f.totalShares.toLocaleString()) + " shares ", 1)
                                  ])
                                ])
                              ])
                            ])) : U("", !0)
                          ]),
                          l("div", od, [
                            g[48] || (g[48] = Y(" Section: B ", -1)),
                            l("div", nd, [
                              l("div", ad, [
                                f.putSales && f.putSales.length > 0 ? (E(), C("div", rd, [
                                  l("div", ld, [
                                    l("span", null, "📉 Put Premium Received (" + m(f.putSales.length) + ")", 1),
                                    l("button", {
                                      class: "copy-button",
                                      onClick: (w) => c(f.putSales, D, f.putPremiumReceived),
                                      title: "Copy to clipboard (Excel-ready)"
                                    }, " 📋 Copy ", 8, hd)
                                  ]),
                                  l("div", dd, [
                                    l("table", cd, [
                                      g[43] || (g[43] = l("thead", null, [
                                        l("tr", null, [
                                          l("th", null, "Option"),
                                          l("th", null, "Settlement Date"),
                                          l("th", null, "Quantity"),
                                          l("th", null, "Avg Price"),
                                          l("th", null, "Total Premium")
                                        ])
                                      ], -1)),
                                      l("tbody", null, [
                                        (E(!0), C(oe, null, ae(L(f.putSales), (w, M) => (E(), C("tr", {
                                          key: `exit-put-${D}-${M}`
                                        }, [
                                          l("td", null, m(_(w.symbol)), 1),
                                          l("td", null, m(y(w.orderDate)), 1),
                                          l("td", ud, m(w.quantity.toLocaleString()), 1),
                                          l("td", fd, "$" + m(Number(w.avgPrice).toFixed(2)), 1),
                                          l("td", md, "$" + m(Number(w.totalCost).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)
                                        ]))), 128))
                                      ]),
                                      l("tfoot", null, [
                                        l("tr", pd, [
                                          g[41] || (g[41] = l("td", { colspan: "2" }, [
                                            l("strong", null, "Total")
                                          ], -1)),
                                          l("td", gd, [
                                            l("strong", null, m(f.putSales.reduce((w, M) => w + M.quantity, 0).toLocaleString()), 1)
                                          ]),
                                          g[42] || (g[42] = l("td", { class: "text-right" }, "-", -1)),
                                          l("td", bd, [
                                            l("strong", null, "$" + m(Math.abs(f.putPremiumReceived).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)
                                          ])
                                        ])
                                      ])
                                    ])
                                  ])
                                ])) : (E(), C("div", vd, "No put premium received"))
                              ]),
                              l("div", yd, [
                                f.putBuybacks && f.putBuybacks.length > 0 ? (E(), C("div", wd, [
                                  l("div", Cd, [
                                    l("span", null, "🔄 Put Buybacks (" + m(f.putBuybacks.length) + ")", 1),
                                    l("button", {
                                      class: "copy-button",
                                      onClick: (w) => u(f.putBuybacks, D, f.putBuybackCost),
                                      title: "Copy to clipboard (Excel-ready)"
                                    }, " 📋 Copy ", 8, Ed)
                                  ]),
                                  l("div", xd, [
                                    l("table", kd, [
                                      g[46] || (g[46] = l("thead", null, [
                                        l("tr", null, [
                                          l("th", null, "Option"),
                                          l("th", null, "Settlement Date"),
                                          l("th", null, "Quantity"),
                                          l("th", null, "Avg Price"),
                                          l("th", null, "Total Cost")
                                        ])
                                      ], -1)),
                                      l("tbody", null, [
                                        (E(!0), C(oe, null, ae(L(f.putBuybacks), (w, M) => (E(), C("tr", {
                                          key: `exit-put-buyback-${D}-${M}`
                                        }, [
                                          l("td", null, m(_(w.symbol)), 1),
                                          l("td", null, m(y(w.orderDate)), 1),
                                          l("td", Rd, m(w.quantity.toLocaleString()), 1),
                                          l("td", Td, "$" + m(Number(w.avgPrice).toFixed(2)), 1),
                                          l("td", Sd, "$" + m(Number(w.totalCost).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)
                                        ]))), 128))
                                      ]),
                                      l("tfoot", null, [
                                        l("tr", _d, [
                                          g[44] || (g[44] = l("td", { colspan: "2" }, [
                                            l("strong", null, "Total")
                                          ], -1)),
                                          l("td", Ld, [
                                            l("strong", null, m(f.putBuybacks.reduce((w, M) => w + M.quantity, 0).toLocaleString()), 1)
                                          ]),
                                          g[45] || (g[45] = l("td", { class: "text-right" }, "-", -1)),
                                          l("td", Dd, [
                                            l("strong", null, "$" + m(Math.abs(f.putBuybackCost).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)
                                          ])
                                        ])
                                      ])
                                    ])
                                  ])
                                ])) : (E(), C("div", Fd, "No put buybacks found"))
                              ])
                            ]),
                            f.putSales && f.putSales.length > 0 || f.putBuybacks && f.putBuybacks.length > 0 ? (E(), C("div", Md, [
                              l("div", Pd, [
                                l("div", null, [
                                  g[47] || (g[47] = l("div", { style: { "font-weight": "600", color: "#495057", "margin-bottom": "0.25rem" } }, "📊Net Put Cash Flow:", -1)),
                                  l("div", zd, [
                                    f.putPremiumReceived > 0 ? (E(), C("div", Ad, "Put Premium Received: $" + m(Math.abs(f.putPremiumReceived).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)) : U("", !0),
                                    f.putBuybackCost && f.putBuybackCost > 0 ? (E(), C("div", Od, "Less: Put Buyback Cost: $" + m(Math.abs(f.putBuybackCost).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)) : U("", !0),
                                    l("div", Hd, " = $" + m(f.netPutCashFlow.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)
                                  ])
                                ])
                              ])
                            ])) : U("", !0)
                          ]),
                          l("div", $d, [
                            g[56] || (g[56] = Y(" Section: C ", -1)),
                            l("div", Bd, [
                              l("div", Nd, [
                                f.callSales && f.callSales.length > 0 ? (E(), C("div", Vd, [
                                  l("div", Id, [
                                    l("span", null, "📞 Call Current Value (" + m(f.callSales.length) + ")", 1),
                                    l("button", {
                                      class: "copy-button",
                                      onClick: (w) => p(f.callSales, D, f.callPremiumReceived),
                                      title: "Copy to clipboard (Excel-ready)"
                                    }, " 📋 Copy ", 8, Wd)
                                  ]),
                                  l("div", Gd, [
                                    l("table", jd, [
                                      g[51] || (g[51] = l("thead", null, [
                                        l("tr", null, [
                                          l("th", null, "Option"),
                                          l("th", null, "Settlement Date"),
                                          l("th", null, "Quantity"),
                                          l("th", null, "Avg Price"),
                                          l("th", null, "Current Value")
                                        ])
                                      ], -1)),
                                      l("tbody", null, [
                                        (E(!0), C(oe, null, ae(L(f.callSales), (w, M) => (E(), C("tr", {
                                          key: `exit-call-${D}-${M}`
                                        }, [
                                          l("td", null, m(_(w.symbol)), 1),
                                          l("td", null, m(y(w.orderDate)), 1),
                                          l("td", Ud, m(w.quantity.toLocaleString()), 1),
                                          l("td", qd, "$" + m(Number(w.avgPrice).toFixed(2)), 1),
                                          l("td", Kd, "$" + m(Number(w.totalCost).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)
                                        ]))), 128))
                                      ]),
                                      l("tfoot", null, [
                                        l("tr", Qd, [
                                          g[49] || (g[49] = l("td", { colspan: "2" }, [
                                            l("strong", null, "Total")
                                          ], -1)),
                                          l("td", Xd, [
                                            l("strong", null, m(f.callSales.reduce((w, M) => w + M.quantity, 0).toLocaleString()), 1)
                                          ]),
                                          g[50] || (g[50] = l("td", { class: "text-right" }, "-", -1)),
                                          l("td", Jd, [
                                            l("strong", null, "$" + m(Math.abs(f.callPremiumReceived).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)
                                          ])
                                        ])
                                      ])
                                    ])
                                  ])
                                ])) : (E(), C("div", Yd, "No call premium received"))
                              ]),
                              l("div", Zd, [
                                f.callBuybacks && f.callBuybacks.length > 0 ? (E(), C("div", ec, [
                                  l("div", tc, [
                                    l("span", null, "🔄 Call Buybacks (" + m(f.callBuybacks.length) + ")", 1),
                                    l("button", {
                                      class: "copy-button",
                                      onClick: (w) => v(f.callBuybacks, D, f.callBuybackCost),
                                      title: "Copy to clipboard (Excel-ready)"
                                    }, " 📋 Copy ", 8, ic)
                                  ]),
                                  l("div", sc, [
                                    l("table", oc, [
                                      g[54] || (g[54] = l("thead", null, [
                                        l("tr", null, [
                                          l("th", null, "Option"),
                                          l("th", null, "Settlement Date"),
                                          l("th", null, "Quantity"),
                                          l("th", null, "Avg Price"),
                                          l("th", null, "Total Cost")
                                        ])
                                      ], -1)),
                                      l("tbody", null, [
                                        (E(!0), C(oe, null, ae(L(f.callBuybacks), (w, M) => (E(), C("tr", {
                                          key: `exit-call-buyback-${D}-${M}`
                                        }, [
                                          l("td", null, m(_(w.symbol)), 1),
                                          l("td", null, m(y(w.orderDate)), 1),
                                          l("td", nc, m(w.quantity.toLocaleString()), 1),
                                          l("td", ac, "$" + m(Number(w.avgPrice).toFixed(2)), 1),
                                          l("td", rc, "$" + m(Number(w.totalCost).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)
                                        ]))), 128))
                                      ]),
                                      l("tfoot", null, [
                                        l("tr", lc, [
                                          g[52] || (g[52] = l("td", { colspan: "2" }, [
                                            l("strong", null, "Total")
                                          ], -1)),
                                          l("td", hc, [
                                            l("strong", null, m(f.callBuybacks.reduce((w, M) => w + M.quantity, 0).toLocaleString()), 1)
                                          ]),
                                          g[53] || (g[53] = l("td", { class: "text-right" }, "-", -1)),
                                          l("td", dc, [
                                            l("strong", null, "$" + m(Math.abs(f.callBuybackCost).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)
                                          ])
                                        ])
                                      ])
                                    ])
                                  ])
                                ])) : (E(), C("div", cc, "No call buybacks found"))
                              ])
                            ]),
                            f.callSales && f.callSales.length > 0 || f.callBuybacks && f.callBuybacks.length > 0 ? (E(), C("div", uc, [
                              l("div", fc, [
                                l("div", null, [
                                  g[55] || (g[55] = l("div", { style: { "font-weight": "600", color: "#495057", "margin-bottom": "0.25rem" } }, "📊 Net Call Cash Flow:", -1)),
                                  l("div", mc, [
                                    f.callPremiumReceived > 0 ? (E(), C("div", pc, "Call Current Value: $" + m(Math.abs(f.callPremiumReceived).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)) : U("", !0),
                                    f.callBuybackCost && f.callBuybackCost > 0 ? (E(), C("div", gc, "Less: Call Buyback Cost: $" + m(Math.abs(f.callBuybackCost).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)) : U("", !0),
                                    l("div", bc, " = $" + m(f.netCallCashFlow.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)
                                  ])
                                ])
                              ])
                            ])) : U("", !0)
                          ]),
                          l("div", vc, [
                            g[57] || (g[57] = l("div", { class: "calc-line" }, [
                              Y("📊 "),
                              l("strong", null, "Calculation:")
                            ], -1)),
                            l("div", yc, [
                              l("strong", null, "Total Net Cost = $" + m(f.netStockCost.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })) + " - $" + m(Math.abs(f.netPutCashFlow || f.putPremiumReceived).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })) + " - $" + m(Math.abs(f.netCallCashFlow || f.callPremiumReceived).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })) + " = $" + m(f.netCost.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)
                            ]),
                            l("div", wc, [
                              l("strong", null, "Adjusted Avg Price = $" + m(f.netCost.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })) + " ÷ " + m(f.totalShares.toLocaleString()) + " = $" + m(f.adjustedAvgPricePerShare.toFixed(2)) + " per share", 1)
                            ])
                          ])
                        ], 512), [
                          [mt, i.value.has(D)]
                        ])
                      ]),
                      _: 2
                    }, 1024)
                  ]);
                }), 128)),
                h.overallAdjustedAvgPriceFromOrdersExitToday !== null ? (E(), C("div", Cc, [
                  l("div", Ec, " 🎯 Overall Adjusted Average (Exit Today): $" + m(h.overallAdjustedAvgPriceFromOrdersExitToday.toFixed(2)) + " per share ", 1),
                  l("div", xc, [
                    l("div", kc, "Total Net Cost = " + m(h.orderGroupsExitToday.map((f) => `$${f.netCost.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).join(" + ")) + " = $" + m(h.totalNetCostExitToday.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1),
                    l("div", Rc, "Total Main Qty = " + m(h.orderGroupsExitToday.map((f) => f.totalShares.toLocaleString()).join(" + ")) + " = " + m(h.totalSharesExitToday.toLocaleString()), 1),
                    l("div", Tc, [
                      l("strong", null, "Overall Adjusted Average = $" + m(h.totalNetCostExitToday.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })) + " ÷ " + m(h.totalSharesExitToday.toLocaleString()) + " = $" + m(h.overallAdjustedAvgPriceFromOrdersExitToday.toFixed(2)), 1)
                    ])
                  ])
                ])) : U("", !0)
              ]))
            ])) : U("", !0)
          ], 512), [
            [mt, h.showCalculationDetails]
          ])
        ]),
        _: 1
      })
    ], 64));
  }
}), Ds = (h, e) => {
  const t = h.__vccOpts || h;
  for (const [i, s] of e)
    t[i] = s;
  return t;
}, _c = /* @__PURE__ */ Ds(Sc, [["__scopeId", "data-v-d1336f50"]]), Lc = { class: "current-positions-for-single-instrument-view" }, Dc = { class: "positions-table-container" }, Fc = { class: "header-section" }, Mc = {
  key: 0,
  class: "loading-state"
}, Pc = {
  key: 1,
  class: "error-state"
}, zc = {
  key: 2,
  class: "summary-section"
}, Ac = { class: "summary-cards" }, Oc = { class: "summary-card card-cyan" }, Hc = {
  key: 0,
  class: "summary-value"
}, $c = {
  key: 1,
  class: "summary-value error"
}, Bc = {
  key: 2,
  class: "summary-value-container-vertical"
}, Nc = { key: 0 }, Vc = { key: 1 }, Ic = { class: "toggle-icon" }, Wc = { class: "summary-card card-blue" }, Gc = { class: "current-pnl-box" }, jc = {
  key: 0,
  class: "summary-value"
}, Uc = {
  key: 1,
  class: "summary-value error"
}, qc = {
  key: 2,
  class: "summary-value-container-vertical"
}, Kc = { key: 0 }, Qc = { class: "pnl-percentage" }, Xc = { key: 1 }, Jc = { class: "toggle-icon" }, Yc = { class: "exited-pnl-box" }, Zc = {
  key: 0,
  class: "summary-value"
}, eu = {
  key: 1,
  class: "summary-value error"
}, tu = {
  key: 2,
  class: "summary-value-container-vertical"
}, iu = { key: 0 }, su = { key: 1 }, ou = { class: "toggle-icon" }, nu = { class: "summary-card highlight-1 card-green" }, au = { class: "summary-value-container" }, ru = { class: "summary-value" }, lu = { class: "accounts-count" }, hu = { class: "toggle-icon" }, du = { class: "summary-card card-purple" }, cu = {
  key: 0,
  class: "summary-value"
}, uu = {
  key: 1,
  class: "summary-value error"
}, fu = {
  key: 2,
  class: "summary-value-container-vertical"
}, mu = { class: "summary-value" }, pu = {
  key: 0,
  class: "52-week-range"
}, gu = { class: "blue_color" }, bu = { class: "blue_color" }, vu = {
  key: 1,
  class: "52-week-range"
}, yu = {
  key: 2,
  class: "timestamp-info"
}, wu = {
  key: 3,
  class: "summary-value"
}, Cu = { class: "summary-card card-orange" }, Eu = {
  key: 0,
  class: "summary-value"
}, xu = {
  key: 1,
  class: "summary-value error"
}, ku = {
  key: 2,
  class: "summary-value-container-vertical"
}, Ru = {
  key: 0,
  style: { "font-size": "1.2rem", "font-weight": "600" }
}, Tu = { key: 1 }, Su = {
  key: 0,
  style: { "font-size": "1.2rem", "font-weight": "600" }
}, _u = { class: "toggle-icon" }, Lu = { key: 1 }, Du = { class: "summary-card card-teal" }, Fu = {
  key: 0,
  class: "summary-value"
}, Mu = {
  key: 1,
  class: "summary-value error"
}, Pu = {
  key: 2,
  class: "summary-value-container-vertical"
}, zu = {
  key: 0,
  class: "subtitle-info",
  style: { "font-size": "0.85rem", color: "#6c757d", "margin-top": "0.25rem" }
}, Au = { class: "blue_color" }, Ou = {
  key: 1,
  class: "subtitle-info",
  style: { "font-size": "0.85rem", color: "#6c757d", "margin-top": "0.25rem" }
}, Hu = { class: "blue_color" }, $u = {
  key: 2,
  class: "subtitle-info",
  style: { "font-size": "0.85rem", color: "#6c757d", "margin-top": "0.25rem" }
}, Bu = { class: "blue_color" }, Nu = { class: "table-wrapper" }, Vu = { class: "pnl-details" }, Iu = {
  key: 0,
  class: "pnl-breakdown"
}, Wu = { class: "pnl-section" }, Gu = { class: "calc-line" }, ju = { class: "calc-line" }, Uu = { class: "calc-line calculation-result" }, qu = { class: "pnl-section" }, Ku = { class: "calc-line" }, Qu = { class: "calc-line calculation-result" }, Xu = { class: "pnl-section highlight-section" }, Ju = { class: "calc-line" }, Yu = { class: "calc-line" }, Zu = {
  key: 1,
  class: "pnl-breakdown"
}, ef = { class: "pnl-section" }, tf = { class: "pnl-section-title" }, sf = { class: "calc-line" }, of = { class: "calc-line" }, nf = { class: "pnl-section-title" }, af = { class: "calc-line" }, rf = { class: "calc-line" }, lf = { class: "calc-line" }, hf = { class: "calc-line calculation-result" }, df = { class: "pnl-section highlight-section" }, cf = { class: "calc-line" }, uf = { class: "calc-line calculation-result" }, ff = {
  class: "calc-line",
  style: { "margin-top": "1rem" }
}, mf = { class: "calc-line calculation-result" }, pf = {
  class: "calc-line",
  style: { "margin-top": "1rem" }
}, gf = { class: "calc-line" }, bf = {
  key: 0,
  class: "calc-line",
  style: { "margin-top": "1rem", color: "#dc3545", "font-weight": "bold" }
}, vf = { class: "exited-pnl-details" }, yf = {
  key: 0,
  class: "exited-pnl-breakdown"
}, wf = { class: "pnl-section" }, Cf = { class: "calc-line" }, Ef = { class: "calc-line" }, xf = { class: "calc-line calculation-result" }, kf = ["onClick"], Rf = { class: "expand-icon" }, Tf = { class: "account-title" }, Sf = { class: "account-summary" }, _f = { class: "account-content" }, Lf = { class: "orders-table-wrapper" }, Df = { class: "modern-table" }, Ff = { class: "text-right" }, Mf = { class: "text-right" }, Pf = { class: "text-right" }, zf = { class: "total-row" }, Af = {
  key: 1,
  class: "no-data-message"
}, Of = { class: "capital-details" }, Hf = {
  key: 0,
  class: "no-data-message"
}, $f = {
  key: 1,
  class: "capital-breakdown"
}, Bf = { class: "capital-section" }, Nf = { class: "calc-line" }, Vf = { class: "calc-line" }, If = { class: "calc-line calculation-result" }, Wf = {
  key: 2,
  class: "capital-breakdown"
}, Gf = { class: "capital-section-title" }, jf = { class: "calc-line" }, Uf = { class: "calc-line" }, qf = { class: "calc-line" }, Kf = { class: "calc-line calculation-result" }, Qf = { class: "capital-section highlight-section" }, Xf = { class: "calc-line" }, Jf = { class: "calc-line calculation-result" }, Yf = { class: "modal-header" }, Zf = { class: "modal-body" }, em = {
  key: 0,
  class: "position-info"
}, tm = { class: "attachment-tabs" }, im = { key: 1 }, sm = { class: "trade-search" }, om = {
  key: 0,
  style: { padding: "1rem", "text-align": "center", color: "#6c757d" }
}, nm = {
  key: 1,
  class: "trades-list"
}, am = ["onClick"], rm = ["checked", "onClick"], lm = { class: "trade-details" }, hm = { class: "trade-primary" }, dm = { style: { color: "#6c757d" } }, cm = { style: { color: "#6c757d" } }, um = { class: "trade-secondary" }, fm = { key: 0 }, mm = { key: 1 }, pm = { style: { color: "#6c757d", "margin-left": "6px" } }, gm = {
  key: 0,
  style: { padding: "1.5rem", "text-align": "center", color: "#6c757d" }
}, bm = { key: 2 }, vm = { class: "trade-search" }, ym = {
  key: 0,
  style: { padding: "1rem", "text-align": "center", color: "#6c757d" }
}, wm = {
  key: 1,
  class: "trades-list"
}, Cm = ["onClick"], Em = ["checked", "onClick"], xm = { class: "trade-details" }, km = { class: "trade-primary" }, Rm = { style: { color: "#6c757d" } }, Tm = { style: { color: "#6c757d" } }, Sm = {
  key: 0,
  class: "expired-badge"
}, _m = { class: "trade-secondary" }, Lm = { key: 0 }, Dm = {
  key: 0,
  style: { padding: "1.5rem", "text-align": "center", color: "#6c757d" }
}, Fm = { key: 3 }, Mm = { class: "trade-search" }, Pm = {
  key: 0,
  style: { padding: "1rem", "text-align": "center", color: "#6c757d" }
}, zm = {
  key: 1,
  class: "trades-list"
}, Am = ["onClick"], Om = ["checked", "onClick"], Hm = { class: "trade-details" }, $m = { class: "trade-primary" }, Bm = { style: { color: "#6c757d" } }, Nm = { style: { color: "#6c757d" } }, Vm = { class: "trade-secondary" }, Im = { key: 0 }, Wm = {
  key: 0,
  style: { padding: "1.5rem", "text-align": "center", color: "#6c757d" }
}, Gm = { class: "modal-footer" }, jm = ["disabled"], Um = /* @__PURE__ */ os({
  __name: "CurrentPositions",
  props: {
    symbolRoot: { default: "META" },
    userId: { default: "4fbec15d-2316-4805-b2a4-5cd2115a5ac8" }
  },
  emits: ["capitalUsedChanged"],
  setup(h, { emit: e }) {
    const t = h, i = B(!1), s = B(!1), o = B(!1), n = B(!1), a = B("hold-orders"), r = e, d = Et();
    B(/* @__PURE__ */ new Set());
    const { data: c, isLoading: u, isError: p, error: v, isSuccess: y, _cleanup: L } = uo(
      t.userId,
      t.symbolRoot
    ), { data: _ } = mo(t.symbolRoot, t.userId), { data: x } = go(t.symbolRoot, t.userId), g = se(() => {
      var b, H;
      const T = (H = (b = c.value) == null ? void 0 : b[0]) == null ? void 0 : H.conid;
      return T ? parseInt(T, 10) : null;
    }), { marketData: f, isLoading: D, error: P } = Ba(g, t.symbolRoot), { financialData: S, isLoading: I, error: z } = Na(g, t.symbolRoot), V = se(() => {
      var T;
      return ((T = f.value) == null ? void 0 : T.market_price) ?? null;
    }), A = se(() => {
      var T;
      return ((T = S.value) == null ? void 0 : T.week_52_high) ?? null;
    }), w = se(() => {
      var T;
      return ((T = S.value) == null ? void 0 : T.week_52_low) ?? null;
    }), M = se(() => {
      var T;
      return ((T = S.value) == null ? void 0 : T.pe_ratio) ?? null;
    }), Z = se(() => {
      var T;
      return ((T = S.value) == null ? void 0 : T.market_cap) ?? null;
    }), Q = se(() => {
      var T;
      return ((T = S.value) == null ? void 0 : T.computed_peg_ratio) ?? null;
    }), he = se(() => {
      var T;
      return ((T = f.value) == null ? void 0 : T.last_fetched_at) ?? null;
    }), ge = se(() => {
      if (!he.value) return null;
      const T = new Date(he.value), H = {
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
      let N = T.toLocaleString("en-US", H).replace(/,(\s+\d)/, " $1");
      return N = N.replace("GMT+5:30", "IST"), N = N.replace("GMT+530", "IST"), N;
    }), {
      overallAdjustedAvgPriceFromOrders: ue,
      totalNetCost: we,
      totalShares: be,
      orderGroups: Re,
      isLoading: Se,
      error: _e
    } = Va(
      c,
      t.userId
    ), {
      overallAdjustedAvgPriceFromOrders: Me,
      totalNetCost: We,
      totalShares: Ge,
      orderGroups: re,
      isLoading: Le,
      error: nt
    } = Ia(
      c,
      t.userId
    ), {
      positionTradesMap: je,
      positionPositionsMap: Ue,
      positionOrdersMap: R,
      getPositionKey: K,
      getAttachedTrades: ee,
      fetchAttachedPositionsForDisplay: Ee,
      fetchTradesForSymbol: Gt,
      fetchOrdersForSymbol: jt,
      getAttachedOrders: $e,
      savePositionOrderMappings: _t,
      isReady: Lt,
      refetchMappings: ie
    } = Ua(t.userId), {
      expandedPositions: Be,
      processingPositions: Dt
    } = qa(), qe = se(() => {
      var H, $, N, k, W;
      if (c.value && c.value.length > 0) {
        const J = (H = c.value[0]) == null ? void 0 : H.asset_class;
        return console.log("👀 Asset type from positions:", J), J || null;
      }
      const T = _.value && _.value.length > 0, b = x.value && x.value.length > 0;
      if (T || b) {
        const J = ((N = ($ = _.value) == null ? void 0 : $[0]) == null ? void 0 : N.asset_class) || ((W = (k = x.value) == null ? void 0 : k[0]) == null ? void 0 : W.asset_class);
        return console.log("👀 Asset type from options:", J), J || "OPT";
      }
      return console.log("👀 Asset type: null (no positions)"), null;
    });
    console.log("👀 Asset type detected:", qe.value);
    const ji = se(() => !c.value || c.value.length === 0 ? 0 : c.value.reduce((T, b) => T + (b.contract_quantity || 0), 0));
    se(() => {
      var b, H;
      if (qe.value === "OPT") {
        const $ = ((b = _.value) == null ? void 0 : b.reduce((k, W) => k + (W.unrealized_pnl || 0), 0)) || 0, N = ((H = x.value) == null ? void 0 : H.reduce((k, W) => k + (W.unrealized_pnl || 0), 0)) || 0;
        return console.log("📊 Options Unrealized P&L - PUT:", $, "CALL:", N, "Total:", $ + N), $ + N;
      }
      if (!c.value || c.value.length === 0) return 0;
      const T = c.value.reduce(($, N) => $ + (N.unrealized_pnl || 0), 0);
      return console.log("📊 Stock Unrealized P&L:", T), T;
    });
    const {
      unrealizedPnL: Pe,
      pnlPercentage: Fs,
      isProfitable: Ne,
      calculationBreakdown: X,
      isLoading: Ms,
      error: Ps
    } = Wa(
      ue,
      se(() => be.value),
      V,
      _,
      x
    ), {
      totalExitedPnL: De,
      exitedOrdersBreakdown: Ut,
      isLoading: zs,
      error: As
    } = Ga(
      se(() => t.symbolRoot),
      se(() => t.userId),
      qe
    ), {
      totalCapitalUsed: si,
      calculationBreakdown: ze,
      isLoading: Os,
      error: Hs
    } = ja(
      qe,
      se(() => ji.value),
      V
    ), qt = B(!1);
    function $s() {
      qt.value = !qt.value;
    }
    function pt(T) {
      if (!T) return [];
      const b = String(T), H = b.match(/^([A-Z]+)\b/), $ = (H == null ? void 0 : H[1]) ?? "", N = b.match(/\s([CP])\b/), k = (N == null ? void 0 : N[1]) ?? "", W = b.match(/\s(\d+(?:\.\d+)?)\s+[CP]\b/), J = (W == null ? void 0 : W[1]) ?? "", ce = b.match(/\b(\d{6})[CP]/), fe = ce ? Ui(ce[1]) : "";
      return [$, fe, J, k].filter(Boolean);
    }
    function Ft(T) {
      var fe;
      if (!T) return [];
      const b = String(T).trim(), H = b.match(/^([A-Z]+)\s*/), $ = (H == null ? void 0 : H[1]) ?? "", N = b.slice(((fe = H == null ? void 0 : H[0]) == null ? void 0 : fe.length) || 0), k = N.match(/(\d{6})([CP])/);
      let W = "", J = "", ce = "";
      if (k) {
        W = Ui(k[1]), J = k[2] === "C" ? "Call" : "Put";
        const ve = N.slice(k[0].length).match(/(\d+)/);
        ve && (ce = (parseInt(ve[1], 10) / 1e3).toString());
      }
      return [$, W, ce, J].filter(Boolean);
    }
    function Ui(T) {
      if (!T || T.length !== 6) return "";
      const b = T.substring(0, 2), H = T.substring(2, 4), $ = T.substring(4, 6);
      return `20${b}-${H}-${$}`;
    }
    function Ve(T) {
      if (!T) return "";
      const b = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(String(T).trim());
      let H;
      if (b) {
        const W = parseInt(b[1]), J = parseInt(b[2]) - 1;
        let ce = parseInt(b[3]);
        ce < 100 && (ce = 2e3 + ce), H = new Date(ce, J, W);
      } else if (H = new Date(T), isNaN(H.getTime())) return String(T);
      const $ = H.getFullYear(), N = (H.getMonth() + 1).toString().padStart(2, "0"), k = H.getDate().toString().padStart(2, "0");
      return `${$}-${N}-${k}`;
    }
    function Bs(T) {
      if (!T) return "";
      const [b] = String(T).trim().split(";"), H = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(b);
      if (H) {
        const N = parseInt(H[1]), k = parseInt(H[2]) - 1;
        let W = parseInt(H[3]);
        return W < 100 && (W = 2e3 + W), new Date(W, k, N).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          timeZone: "America/Los_Angeles"
        });
      }
      const $ = new Date(b);
      return isNaN($.getTime()) ? String(T) : $.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "America/Los_Angeles"
      });
    }
    function Ce(T) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(T);
    }
    function oi(T) {
      return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }).format(T);
    }
    function Ns(T) {
      if (console.log("🔄 Toggle expansion for key:", T), console.log("📊 Before toggle - expanded positions:", Array.from(Be.value)), Be.value.has(T) ? (Be.value.delete(T), console.log("➖ Removed from expanded")) : (Be.value.add(T), console.log("➕ Added to expanded")), console.log("📊 After toggle - expanded positions:", Array.from(Be.value)), console.log("🎯 Tabulator exists?", !!Ae.value), Ae.value) {
        const b = Ae.value.getRows();
        console.log("📋 Total rows:", b.length);
        for (const H of b) {
          const $ = H.getData();
          if ($) {
            const N = ni($);
            if (console.log("🔍 Checking row key:", N, "matches?", N === T), N === T) {
              console.log("✅ Found matching row, reformatting..."), H.reformat();
              break;
            }
          }
        }
      }
    }
    function ni(T) {
      return K(T);
    }
    const Vs = [
      {
        title: "Account",
        field: "legal_entity",
        minWidth: 150,
        headerHozAlign: "left",
        formatter: (T) => {
          const b = T.getRow().getData(), H = T.getValue() || b.internal_account_id;
          if (!Lt.value)
            return console.log("⏳ Formatter called but mappings not ready yet"), `<div style="display: flex; align-items: center; gap: 6px;">
          <span class="expand-arrow">&nbsp;</span>
          <span>${H}</span>
        </div>`;
          const $ = ni(b), N = je.value.get($), k = Ue.value.get($), W = R.value.get($);
          console.log("🎨 Formatter for", $, {
            attachedTradeIds: (N == null ? void 0 : N.size) || 0,
            attachedPositionKeys: (k == null ? void 0 : k.size) || 0,
            attachedOrderIds: (W == null ? void 0 : W.size) || 0,
            isReady: Lt.value
          });
          const J = N && N.size > 0 || k && k.size > 0 || W && W.size > 0, ce = Be.value.has($), fe = J ? `<span class="expand-arrow ${ce ? "expanded" : ""}" data-position-key="${$}" title="${ce ? "Collapse" : "Expand"} attachments">
            ${ce ? "▼" : "▶"}
          </span>` : '<span class="expand-arrow">&nbsp;</span>', at = ((N == null ? void 0 : N.size) || 0) + ((k == null ? void 0 : k.size) || 0) + ((W == null ? void 0 : W.size) || 0), ve = at > 0 ? `<span class="trade-count">(${at})</span>` : "";
          return `
        <div style="display: flex; align-items: center; gap: 6px;">
          ${fe} 
          <button class="attach-trades-btn" title="Attach trades or positions" style="border:none;background:transparent;cursor:pointer;padding:0;margin-right:4px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button> 
          <span>${H}</span>
          ${ve}
        </div>
      `;
        },
        cellClick: (T, b) => {
          const H = T.target, $ = H.closest(".expand-arrow");
          if ($) {
            T.stopPropagation();
            const k = $.getAttribute("data-position-key");
            k && Ns(k);
            return;
          }
          if (H.closest(".attach-trades-btn")) {
            T.stopPropagation();
            const k = b.getRow().getData();
            k && Ws(k, "trades");
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
        formatter: (T) => {
          const b = T.getValue();
          return b != null ? "$" + Number(b).toFixed(2) : "";
        }
      },
      {
        title: "Market Price",
        field: "price",
        minWidth: 100,
        hozAlign: "right",
        headerHozAlign: "right",
        formatter: (T) => {
          const b = T.getValue();
          return b != null ? "$" + Number(b).toFixed(2) : "";
        }
      },
      {
        title: "Market Value",
        field: "market_value",
        minWidth: 150,
        hozAlign: "right",
        headerHozAlign: "right",
        formatter: (T) => {
          const b = T.getValue();
          return b == null ? "" : `<span style="color:${b < 0 ? "#dc3545" : b > 0 ? "#28a745" : "#000"}">$${Number(b).toLocaleString(void 0, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>`;
        },
        bottomCalc: "sum",
        bottomCalcFormatter: (T) => {
          const b = T.getValue();
          return `<span style="color:${b < 0 ? "#dc3545" : b > 0 ? "#28a745" : "#000"}">$${Number(b).toLocaleString(void 0, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>`;
        }
      },
      {
        title: "Unrealized P&L",
        field: "unrealized_pnl",
        minWidth: 150,
        hozAlign: "right",
        headerHozAlign: "right",
        formatter: (T) => {
          const b = T.getValue();
          return b == null ? "" : `<span style="color:${b < 0 ? "#dc3545" : b > 0 ? "#28a745" : "#000"}">$${Number(b).toLocaleString(void 0, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>`;
        },
        bottomCalc: "sum",
        bottomCalcFormatter: (T) => {
          const b = T.getValue();
          return `<span style="color:${b < 0 ? "#dc3545" : b > 0 ? "#28a745" : "#000"}">$${Number(b).toLocaleString(void 0, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>`;
        }
      },
      {
        title: "Entry Cash Flow",
        field: "computed_cash_flow_on_entry",
        minWidth: 100,
        hozAlign: "right",
        headerHozAlign: "right",
        formatter: (T) => {
          const b = T.getValue();
          return b == null ? "" : `<span style="color:${b < 0 ? "#dc3545" : b > 0 ? "#28a745" : "#000"}">$${Number(b).toLocaleString(void 0, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>`;
        },
        bottomCalc: "sum",
        bottomCalcFormatter: (T) => {
          const b = T.getValue();
          return `<span style="color:${b < 0 ? "#dc3545" : b > 0 ? "#28a745" : "#000"}">$${Number(b).toLocaleString(void 0, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>`;
        }
      }
    ], { tableDiv: Is, initializeTabulator: qi, isTableInitialized: ai, tabulator: Ae } = $a({
      data: c,
      columns: Vs,
      isSuccess: y,
      placeholder: "No positions found for this symbol",
      rowFormatter: async (T) => {
        try {
          const b = T.getData(), H = T.getElement();
          if (!b) return;
          const $ = ni(b), N = je.value.get($), k = Ue.value.get($), W = R.value.get($), J = Be.value.has($);
          console.log("🎨 Row formatter running for:", $, {
            isExpanded: J,
            attachedTradeIds: (N == null ? void 0 : N.size) || 0,
            attachedPositionKeys: (k == null ? void 0 : k.size) || 0,
            processing: Dt.value.has($)
          });
          const ce = H.querySelector(".nested-tables-container");
          if (ce && (console.log("🗑️ Removing existing nested container"), ce.remove()), Dt.value.has($)) {
            console.log("⏸️ Position is being processed, skipping");
            return;
          }
          if (J && (N && N.size > 0 || k && k.size > 0 || W && W.size > 0)) {
            console.log("📦 Creating nested tables for:", $), Dt.value.add($);
            try {
              const fe = document.createElement("div");
              if (fe.className = "nested-tables-container", fe.style.cssText = "padding: 1rem; background: #f8f9fa; border-top: 1px solid #dee2e6;", N && N.size > 0) {
                console.log("📊 Adding trades section");
                const ve = document.createElement("h4");
                ve.textContent = `Attached Trades (${N.size})`, ve.style.cssText = "margin: 0 0 0.5rem 0; font-size: 0.9rem; color: #495057;", fe.appendChild(ve);
                const xe = document.createElement("div");
                xe.className = "nested-trades-table", xe.style.cssText = "margin-bottom: 1rem;", fe.appendChild(xe);
                const rt = await ee(b);
                console.log("✅ Got trades data:", rt.length), new Yt(xe, {
                  data: rt,
                  layout: "fitColumns",
                  columns: [
                    {
                      title: "Financial instruments",
                      field: "symbol",
                      widthGrow: 1.8,
                      formatter: (G) => Ft(G.getValue()).map((le) => `<span class="fi-tag">${le}</span>`).join(" ")
                    },
                    {
                      title: "Side",
                      field: "buySell",
                      widthGrow: 1,
                      formatter: (G) => {
                        const j = G.getValue();
                        return `<span class="trade-side-badge ${j === "BUY" ? "trade-buy" : "trade-sell"}">${j}</span>`;
                      }
                    },
                    {
                      title: "Open/Close",
                      field: "openCloseIndicator",
                      widthGrow: 1,
                      formatter: (G) => {
                        const j = G.getValue();
                        return j === "O" ? '<span style="color: #17a2b8; font-weight: bold;">OPEN</span>' : j === "C" ? '<span style="color: #6f42c1; font-weight: bold;">CLOSE</span>' : j;
                      }
                    },
                    {
                      title: "Trade Date",
                      field: "tradeDate",
                      widthGrow: 1,
                      formatter: (G) => Ve(G.getValue()),
                      sorter: (G, j) => {
                        const le = new Date(Ve(G)), bt = new Date(Ve(j));
                        return le.getTime() - bt.getTime();
                      }
                    },
                    {
                      title: "Settlement Date",
                      field: "settleDateTarget",
                      widthGrow: 1,
                      formatter: (G) => Ve(G.getValue()),
                      sorter: (G, j) => {
                        const le = new Date(Ve(G)), bt = new Date(Ve(j));
                        return le.getTime() - bt.getTime();
                      }
                    },
                    {
                      title: "Quantity",
                      field: "quantity",
                      widthGrow: 1,
                      hozAlign: "right",
                      formatter: (G) => {
                        const j = G.getRow().getData(), le = parseFloat((j == null ? void 0 : j.quantity) || 0) || 0, bt = parseFloat((j == null ? void 0 : j.multiplier) || 1) || 1, Ys = le * bt;
                        return oi(Ys);
                      }
                    },
                    {
                      title: "Price",
                      field: "tradePrice",
                      widthGrow: 1,
                      hozAlign: "right",
                      formatter: (G) => Ce(parseFloat(G.getValue()) || 0)
                    },
                    {
                      title: "Total Premium",
                      field: "tradeMoney",
                      widthGrow: 1,
                      hozAlign: "right",
                      formatter: (G) => Ce(parseFloat(G.getValue()) || 0)
                    },
                    {
                      title: "Net Cash",
                      field: "netCash",
                      widthGrow: 1,
                      hozAlign: "right",
                      formatter: (G) => Ce(parseFloat(G.getValue()) || 0)
                    },
                    {
                      title: "MTM PnL",
                      field: "mtmPnl",
                      widthGrow: 1,
                      hozAlign: "right",
                      formatter: (G) => Ce(parseFloat(G.getValue()) || 0)
                    },
                    {
                      title: "Close Price",
                      field: "closePrice",
                      widthGrow: 1,
                      hozAlign: "right",
                      formatter: (G) => Ce(parseFloat(G.getValue()) || 0)
                    }
                  ]
                });
              }
              if (k && k.size > 0) {
                console.log("📊 Adding positions section");
                const ve = document.createElement("h4");
                ve.textContent = `Attached Positions (${k.size})`, ve.style.cssText = "margin: 1rem 0 0.5rem 0; font-size: 0.9rem; color: #495057;", fe.appendChild(ve);
                const xe = document.createElement("div");
                xe.className = "nested-positions-table", fe.appendChild(xe);
                const rt = await Ee(b, k);
                console.log("✅ Got positions data:", rt.length), new Yt(xe, {
                  data: rt,
                  layout: "fitColumns",
                  columns: [
                    {
                      title: "Financial instruments",
                      field: "symbol",
                      widthGrow: 1.8,
                      formatter: (G) => pt(G.getValue()).map((le) => `<span class="fi-tag">${le}</span>`).join(" ")
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
                      formatter: (G) => {
                        const j = G.getValue();
                        return j == null ? "" : `<span style="color:${j < 0 ? "#dc3545" : j > 0 ? "#28a745" : "#000"}">$${Number(j).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>`;
                      }
                    },
                    {
                      title: "Market Value",
                      field: "market_value",
                      widthGrow: 1.5,
                      hozAlign: "right",
                      formatter: (G) => {
                        const j = G.getValue();
                        return j == null ? "" : `<span style="color:${j < 0 ? "#dc3545" : j > 0 ? "#28a745" : "#000"}">$${Number(j).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>`;
                      }
                    },
                    {
                      title: "Unrealized P&L",
                      field: "unrealized_pnl",
                      widthGrow: 1.5,
                      hozAlign: "right",
                      formatter: (G) => {
                        const j = G.getValue();
                        return j == null ? "" : `<span style="color:${j < 0 ? "#dc3545" : j > 0 ? "#28a745" : "#000"}">$${Number(j).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>`;
                      }
                    },
                    {
                      title: "Entry Cash Flow",
                      field: "computed_cash_flow_on_entry",
                      widthGrow: 1,
                      hozAlign: "right",
                      formatter: (G) => {
                        const j = G.getValue();
                        return j == null ? "" : `<span style="color:${j < 0 ? "#dc3545" : j > 0 ? "#28a745" : "#000"}">$${Number(j).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>`;
                      }
                    }
                  ]
                });
              }
              const at = R.value.get($);
              if (console.log("👀 Attached order IDs for", $, at), J && at && at.size > 0) {
                console.log("📦 Adding orders section for:", $);
                const ve = document.createElement("h4");
                ve.textContent = `Attached Orders (${at.size})`, ve.style.cssText = "margin: 1rem 0 0.5rem 0; font-size: 0.9rem; color: #495057;", fe.appendChild(ve);
                const xe = document.createElement("div");
                xe.className = "nested-orders-table", fe.appendChild(xe);
                const rt = await $e(b);
                console.log("✅ Got orders data:", rt.length), new Yt(xe, {
                  data: rt,
                  layout: "fitColumns",
                  columns: [
                    {
                      title: "Financial instruments",
                      field: "symbol",
                      widthGrow: 1.8,
                      formatter: (G) => Ft(G.getValue()).map((le) => `<span class="fi-tag">${le}</span>`).join(" ")
                    },
                    {
                      title: "Side",
                      field: "buySell",
                      widthGrow: 1,
                      formatter: (G) => {
                        const j = G.getValue();
                        return `<span class="trade-side-badge ${j === "BUY" ? "trade-buy" : "trade-sell"}">${j}</span>`;
                      }
                    },
                    {
                      title: "Order Date",
                      field: "dateTime",
                      widthGrow: 1,
                      formatter: (G) => Ve(G.getValue()),
                      sorter: (G, j) => {
                        const le = new Date(Ve(G)), bt = new Date(Ve(j));
                        return le.getTime() - bt.getTime();
                      }
                    },
                    {
                      title: "Accounting Quantity",
                      field: "quantity",
                      widthGrow: 1,
                      hozAlign: "right",
                      //formatter: (cell: any) => formatNumber(parseFloat(cell.getValue()) || 0)
                      formatter: (G) => {
                        const j = G.getValue();
                        if (j == null) return "-";
                        const le = G.getData();
                        return le.assetCategory === "OPT" ? le.quantity * 100 : le.assetCategory === "STK" ? le.quantity * 1 : oi(le.quantity);
                      }
                    },
                    {
                      title: "Trade Price",
                      field: "tradePrice",
                      widthGrow: 1,
                      hozAlign: "right",
                      formatter: (G) => Ce(parseFloat(G.getValue()) || 0)
                    },
                    {
                      title: "Trade Money",
                      field: "tradeMoney",
                      widthGrow: 1,
                      hozAlign: "right",
                      formatter: (G) => Ce(parseFloat(G.getValue()) || 0)
                    },
                    {
                      title: "Settlement Date",
                      field: "settleDateTarget",
                      widthGrow: 1,
                      formatter: (G) => Zi(G.getValue())
                    }
                  ]
                });
              }
              console.log("✅ Appending nested container to row"), H.appendChild(fe);
            } catch (fe) {
              console.error("❌ Error creating nested tables:", fe);
            } finally {
              setTimeout(() => {
                Dt.value.delete($), console.log("✅ Removed from processing");
              }, 100);
            }
          } else
            console.log("ℹ️ Row not expanded or no attachments");
        } catch (b) {
          console.error("❌ Row formatter error:", b);
        }
      }
    }), Ke = B(!1), me = B("trades"), Qe = B(null), Xe = B(null), Je = B(/* @__PURE__ */ new Set()), Kt = B(""), Qt = B(""), Xt = B(""), Ye = B(/* @__PURE__ */ new Set()), Ze = B(/* @__PURE__ */ new Set()), et = B(!1), Mt = B([]), Pt = B([]), zt = B([]);
    function Ki(T) {
      Ye.value.has(T) ? Ye.value.delete(T) : Ye.value.add(T);
    }
    function Qi(T) {
      Ze.value.has(T) ? Ze.value.delete(T) : Ze.value.add(T);
    }
    function Xi(T) {
      Je.value.has(T) ? Je.value.delete(T) : Je.value.add(T);
    }
    async function ri(T) {
      et.value = !0, Mt.value = [];
      try {
        const b = pt(T.symbol)[0] || "";
        if (!b) return;
        const H = await Gt(b, T.internal_account_id), $ = Kt.value.trim().toLowerCase();
        Mt.value = $ ? H.filter((N) => (N.symbol || "").toLowerCase().includes($) || String(N.tradeID || "").toLowerCase().includes($)) : H;
      } catch (b) {
        console.error("❌ loadAttachableTradesForPosition error:", b), Mt.value = [];
      } finally {
        et.value = !1;
      }
    }
    async function li(T) {
      et.value = !0, Pt.value = [];
      try {
        const b = pt(T.symbol)[0] || "";
        if (!b) return;
        const H = T.internal_account_id || T.legal_entity, $ = await ns(d, b, t.userId, H), N = Qt.value.trim().toLowerCase();
        Pt.value = N ? $.filter((k) => (k.symbol || "").toLowerCase().includes(N)) : $;
      } catch (b) {
        console.error("❌ loadAttachablePositionsForPosition error:", b), Pt.value = [];
      } finally {
        et.value = !1;
      }
    }
    async function hi(T) {
      et.value = !0, zt.value = [];
      try {
        const b = pt(T.symbol)[0] || "";
        if (!b) return;
        const H = await jt(b, T.internal_account_id), $ = Xt.value.trim().toLowerCase();
        zt.value = $ ? H.filter((N) => (N.symbol || "").toLowerCase().includes($) || String(N.orderID || "").toLowerCase().includes($)) : H;
      } catch (b) {
        console.error("❌ loadAttachableOrdersForPosition error:", b), zt.value = [];
      } finally {
        et.value = !1;
      }
    }
    async function Ws(T, b = "trades") {
      Qe.value = T, Xe.value = T, me.value = b, Kt.value = "", Qt.value = "", Xt.value = "";
      const H = K(T);
      Ye.value = new Set(je.value.get(H) || []), Ze.value = new Set(Ue.value.get(H) || []), Je.value = new Set(R.value.get(H) || []), Ke.value = !0, b === "trades" ? await ri(T) : b === "positions" ? await li(T) : await hi(T);
    }
    async function Gs() {
      if (!Qe.value || !t.userId) return;
      const T = K(Qe.value);
      try {
        await ro(d, t.userId, T, Ye.value), ie && await ie(), Ke.value = !1, Ae.value && Ae.value.redraw(!0), console.log("✅ Trades attached");
      } catch (b) {
        console.error("❌ Error saving attached trades:", b);
      }
    }
    async function js() {
      if (!Xe.value || !t.userId) return;
      const T = K(Xe.value);
      try {
        await lo(d, t.userId, T, Ze.value), ie && await ie(), Ke.value = !1, Ae.value && Ae.value.redraw(!0), console.log("✅ Positions attached");
      } catch (b) {
        console.error("❌ Error saving attached positions:", b);
      }
    }
    async function Us() {
      if (!Qe.value || !t.userId) return;
      const T = K(Qe.value);
      try {
        await _t(d, t.userId, T, Je.value), ie && await ie(), Ke.value = !1, Ae.value && Ae.value.redraw(!0), console.log("✅ Orders attached");
      } catch (b) {
        console.error("❌ Error saving attached orders:", b);
      }
    }
    function Ji(T) {
      if (T.asset_class !== "OPT") return !1;
      const H = pt(T.symbol)[1];
      if (!H) return !1;
      const $ = new Date(H), N = /* @__PURE__ */ new Date();
      return N.setHours(0, 0, 0, 0), $ < N;
    }
    Fe(Ke, (T) => {
      try {
        T ? document.body.classList.add("modal-open") : document.body.classList.remove("modal-open");
      } catch {
      }
    });
    function qs() {
      i.value = !i.value, i.value && !ai.value && c.value && c.value.length > 0 && (console.log("📊 Details shown, initializing table..."), Zt(() => {
        qi();
      }));
    }
    function Yi() {
      s.value = !s.value;
    }
    function Ks() {
      o.value = !o.value;
    }
    function Qs() {
      n.value = !n.value;
    }
    function Xs(T) {
      if (!T) return "";
      const b = new Date(T);
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: "America/Los_Angeles",
        timeZoneName: "short"
      }).format(b);
    }
    function Zi(T) {
      const b = T;
      if (!b) return "";
      const H = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(String(b).trim());
      let $;
      if (H) {
        const N = Number(H[1]), k = Number(H[2]) - 1;
        let W = Number(H[3]);
        W < 100 && (W += 2e3), $ = new Date(W, k, N);
      } else if ($ = new Date(b), isNaN($.getTime())) return String(b);
      return $.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }
    Fe(Lt, async (T) => {
      console.log("👀 Mappings ready state changed:", T), T && Ae.value && ai.value && (console.log("🔄 Redrawing table with mappings"), Ae.value.redraw(!0));
    }, { immediate: !0 }), Fe(i, async (T) => {
      T && !ai.value && c.value && c.value.length > 0 && (console.log("📊 Details shown via watch, initializing table..."), await Zt(), qi());
    }), Fe(() => si.value, (T) => {
      r("capitalUsedChanged", T);
    }), io(() => {
      console.log("📊 CurrentPositions component mounted");
    }), ss(() => {
      console.log("🧹 Cleaning up CurrentPositions component"), L();
    });
    const gt = B(/* @__PURE__ */ new Set());
    function Js(T) {
      gt.value.has(T) ? gt.value.delete(T) : gt.value.add(T), gt.value = new Set(gt.value);
    }
    return (T, b) => {
      var H, $, N;
      return E(), C("div", Lc, [
        l("div", Dc, [
          l("div", Fc, [
            F(u) ? (E(), C("div", Mc, [
              b[17] || (b[17] = l("div", { class: "spinner" }, null, -1)),
              l("p", null, "Loading positions for " + m(t.symbolRoot) + "...", 1)
            ])) : F(p) ? (E(), C("div", Pc, [
              l("p", null, "❌ Error loading positions: " + m((H = F(v)) == null ? void 0 : H.message), 1)
            ])) : (E(), C("div", zc, [
              l("div", Ac, [
                l("div", Oc, [
                  b[20] || (b[20] = l("div", { class: "summary-label" }, "Capital/margin used", -1)),
                  F(Os) ? (E(), C("div", Hc, [...b[18] || (b[18] = [
                    l("span", { class: "loading-spinner" }, "⏳", -1),
                    Y(" Loading... ", -1)
                  ])])) : F(Hs) ? (E(), C("div", $c, " ❌ Error ")) : (E(), C("div", Bc, [
                    l("div", {
                      class: "summary-value clickable-price",
                      onClick: Qs
                    }, [
                      F(si) !== null ? (E(), C("span", Nc, " $" + m(F(si).toLocaleString(void 0, { minimumFractionDigits: 0, maximumFractionDigits: 0 })), 1)) : (E(), C("span", Vc, "N/A")),
                      l("span", Ic, m(n.value ? "▼" : "▶"), 1)
                    ]),
                    b[19] || (b[19] = l("div", {
                      class: "capital-subtitle",
                      style: { "font-size": "0.85rem", color: "#6c757d", "margin-top": "0.25rem" }
                    }, " Margin: Coming soon... ", -1))
                  ]))
                ]),
                l("div", Wc, [
                  l("div", Gc, [
                    b[22] || (b[22] = l("div", { class: "summary-label" }, "P&L of the current positions", -1)),
                    F(Ms) ? (E(), C("div", jc, [...b[21] || (b[21] = [
                      l("span", { class: "loading-spinner" }, "⏳", -1),
                      Y(" Loading... ", -1)
                    ])])) : F(Ps) ? (E(), C("div", Uc, " ❌ Error ")) : (E(), C("div", qc, [
                      l("div", {
                        class: de(["summary-value clickable-price pnl-value", { profit: F(Ne), loss: !F(Ne) }]),
                        onClick: Ks
                      }, [
                        F(Pe) !== null ? (E(), C("span", Kc, [
                          Y(m(F(Pe) >= 0 ? "+" : "") + "$" + m(F(Pe).toLocaleString(void 0, { minimumFractionDigits: 0, maximumFractionDigits: 0 })) + " ", 1),
                          l("span", Qc, "(" + m(($ = F(Fs)) == null ? void 0 : $.toFixed(2)) + "%)", 1)
                        ])) : (E(), C("span", Xc, "N/A")),
                        l("span", Jc, m(o.value ? "▼" : "▶"), 1)
                      ], 2)
                    ]))
                  ]),
                  l("div", Yc, [
                    b[24] || (b[24] = l("div", { class: "summary-label" }, "P&L of the exited positions", -1)),
                    F(zs) ? (E(), C("div", Zc, [...b[23] || (b[23] = [
                      l("span", { class: "loading-spinner" }, "⏳", -1),
                      Y(" Loading... ", -1)
                    ])])) : F(As) ? (E(), C("div", eu, " ❌ Error ")) : (E(), C("div", tu, [
                      l("div", {
                        class: de(["summary-value clickable-price pnl-value", { profit: (F(De) ?? 0) >= 0, loss: (F(De) ?? 0) < 0 }]),
                        onClick: $s
                      }, [
                        F(De) !== null ? (E(), C("span", iu, m(F(De) >= 0 ? "+" : "") + "$" + m(F(De).toLocaleString(void 0, { minimumFractionDigits: 0, maximumFractionDigits: 0 })), 1)) : (E(), C("span", su, "N/A")),
                        l("span", ou, m(qt.value ? "▼" : "▶"), 1)
                      ], 2)
                    ]))
                  ])
                ]),
                l("div", nu, [
                  b[25] || (b[25] = l("div", { class: "summary-label" }, "Total Contract Quantity", -1)),
                  l("div", au, [
                    l("div", ru, m(ji.value.toLocaleString()), 1),
                    l("div", lu, [
                      l("span", {
                        class: "clickable-accounts",
                        title: "Show positions table for all accounts",
                        onClick: At(qs, ["stop"]),
                        style: { cursor: "pointer", color: "#0d6efd" }
                      }, [
                        Y(" (" + m(((N = F(c)) == null ? void 0 : N.length) || 0) + ") ", 1),
                        l("span", hu, m(i.value ? "▼" : "▶"), 1)
                      ])
                    ])
                  ])
                ]),
                l("div", du, [
                  b[29] || (b[29] = l("div", { class: "summary-label" }, "Current market price", -1)),
                  F(D) ? (E(), C("div", cu, [...b[26] || (b[26] = [
                    l("span", { class: "loading-spinner" }, "⏳", -1),
                    Y(" Loading... ", -1)
                  ])])) : F(P) ? (E(), C("div", uu, " ❌ Error ")) : V.value !== null ? (E(), C("div", fu, [
                    l("div", mu, " $" + m(V.value.toFixed(2)), 1),
                    w.value !== null && A.value !== null ? (E(), C("div", pu, [
                      b[27] || (b[27] = Y(" 52W Range: ", -1)),
                      l("span", gu, "$" + m(w.value.toFixed(2)), 1),
                      b[28] || (b[28] = Y(" - ", -1)),
                      l("span", bu, "$" + m(A.value.toFixed(2)), 1)
                    ])) : (E(), C("div", vu, " 52W Range: N/A ")),
                    ge.value ? (E(), C("div", yu, " Updated: " + m(ge.value), 1)) : U("", !0)
                  ])) : (E(), C("div", wu, " N/A "))
                ]),
                l("div", Cu, [
                  b[33] || (b[33] = l("div", { class: "summary-label" }, "Average cost per share", -1)),
                  F(Se) || F(Le) ? (E(), C("div", Eu, [...b[30] || (b[30] = [
                    l("span", { class: "loading-spinner" }, "⏳", -1),
                    Y(" Loading... ", -1)
                  ])])) : F(_e) || F(nt) ? (E(), C("div", xu, " ❌ Error ")) : (E(), C("div", ku, [
                    l("div", {
                      class: "summary-value average-cost-price clickable-price",
                      onClick: b[0] || (b[0] = (k) => {
                        a.value = "hold-orders", Yi();
                      }),
                      style: { "margin-bottom": "0.5rem" }
                    }, [
                      b[31] || (b[31] = l("span", { style: { "font-size": "0.85rem", color: "#6c757d", display: "block", "margin-bottom": "0.25rem" } }, " If hold till expiry: ", -1)),
                      F(ue) !== null ? (E(), C("span", Ru, " $" + m(F(ue).toFixed(2)), 1)) : (E(), C("span", Tu, "N/A"))
                    ]),
                    l("div", {
                      class: "summary-value average-cost-price clickable-price",
                      onClick: b[1] || (b[1] = (k) => {
                        a.value = "exit-orders", Yi();
                      }),
                      style: { "padding-top": "0.5rem", "border-top": "1px solid #dee2e6" }
                    }, [
                      b[32] || (b[32] = l("span", { style: { "font-size": "0.85rem", color: "#6c757d", display: "block", "margin-bottom": "0.25rem" } }, " If exit today: ", -1)),
                      F(Me) !== null ? (E(), C("span", Su, [
                        Y(" $" + m(F(Me).toFixed(2)) + " ", 1),
                        l("span", _u, m(s.value ? "▼" : "▶"), 1)
                      ])) : (E(), C("span", Lu, "N/A"))
                    ])
                  ]))
                ]),
                l("div", Du, [
                  F(I) ? (E(), C("div", Fu, [...b[34] || (b[34] = [
                    l("span", { class: "loading-spinner" }, "⏳", -1),
                    Y(" Loading... ", -1)
                  ])])) : F(z) ? (E(), C("div", Mu, " ❌ Error ")) : (E(), C("div", Pu, [
                    M.value !== null ? (E(), C("div", zu, [
                      b[35] || (b[35] = Y(" P/E Ratio: ", -1)),
                      l("span", Au, m(M.value.toFixed(2)), 1)
                    ])) : U("", !0),
                    Q.value !== null ? (E(), C("div", Ou, [
                      b[36] || (b[36] = Y(" PEG Ratio: ", -1)),
                      l("span", Hu, m(Q.value.toFixed(2)), 1)
                    ])) : U("", !0),
                    Z.value !== null ? (E(), C("div", $u, [
                      b[37] || (b[37] = Y(" Market Cap: ", -1)),
                      l("span", Bu, "$" + m((Z.value / 1e9).toFixed(2)) + "B", 1)
                    ])) : U("", !0)
                  ]))
                ])
              ]),
              Ie(st, { name: "slide-fade" }, {
                default: ot(() => [
                  He(l("div", Nu, [
                    l("div", {
                      ref_key: "tableDiv",
                      ref: Is
                    }, null, 512)
                  ], 512), [
                    [mt, i.value]
                  ])
                ]),
                _: 1
              }),
              Ie(_c, {
                "show-calculation-details": s.value,
                "avg-price-calculation-tab": a.value,
                "onUpdate:avgPriceCalculationTab": b[2] || (b[2] = (k) => a.value = k),
                "order-groups": F(Re),
                "overall-adjusted-avg-price-from-orders": F(ue),
                "total-net-cost": F(we),
                "total-shares": F(be),
                "is-avg-price-from-orders-loading": F(Se),
                "avg-price-from-orders-error": F(_e),
                "order-groups-exit-today": F(re),
                "overall-adjusted-avg-price-from-orders-exit-today": F(Me),
                "total-net-cost-exit-today": F(We),
                "total-shares-exit-today": F(Ge),
                "is-avg-price-from-orders-loading-exit-today": F(Le),
                "avg-price-from-orders-error-exit-today": F(nt)
              }, null, 8, ["show-calculation-details", "avg-price-calculation-tab", "order-groups", "overall-adjusted-avg-price-from-orders", "total-net-cost", "total-shares", "is-avg-price-from-orders-loading", "avg-price-from-orders-error", "order-groups-exit-today", "overall-adjusted-avg-price-from-orders-exit-today", "total-net-cost-exit-today", "total-shares-exit-today", "is-avg-price-from-orders-loading-exit-today", "avg-price-from-orders-error-exit-today"]),
              Ie(st, { name: "slide-fade" }, {
                default: ot(() => [
                  He(l("div", Vu, [
                    b[42] || (b[42] = l("h2", null, "Profit & Loss Calculation Details:", -1)),
                    F(X) && "totalShares" in F(X) && F(X).totalShares != null ? (E(), C("div", Iu, [
                      l("div", Wu, [
                        b[38] || (b[38] = l("div", { class: "pnl-section-title" }, "📊 Total Cost Basis", -1)),
                        l("div", Gu, " Total Shares = " + m(F(X).totalShares.toLocaleString()), 1),
                        l("div", ju, " Average Cost per Share = $" + m(F(X).avgCostPerShare.toFixed(2)), 1),
                        l("div", Uu, [
                          l("strong", null, "Total Cost Basis = " + m(F(X).totalShares.toLocaleString()) + " × $" + m(F(X).avgCostPerShare.toFixed(2)) + " = $" + m(F(X).totalCostBasis.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)
                        ])
                      ]),
                      l("div", qu, [
                        b[39] || (b[39] = l("div", { class: "pnl-section-title" }, "💰 Current Market Value", -1)),
                        l("div", Ku, " Current Price per Share = $" + m(F(X).currentPricePerShare.toFixed(2)), 1),
                        l("div", Qu, [
                          l("strong", null, "Current Market Value = " + m(F(X).totalShares.toLocaleString()) + " × $" + m(F(X).currentPricePerShare.toFixed(2)) + " = $" + m(F(X).currentMarketValue.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)
                        ])
                      ]),
                      l("div", Xu, [
                        b[40] || (b[40] = l("div", { class: "pnl-section-title" }, "🎯 Unrealized Profit & Loss", -1)),
                        l("div", Ju, [
                          l("strong", {
                            class: de({ "profit-text": F(Ne), "loss-text": !F(Ne) })
                          }, " Unrealized P&L = $" + m(F(X).currentMarketValue.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })) + " - $" + m(F(X).totalCostBasis.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })) + " = " + m(F(Pe) && F(Pe) >= 0 ? "+" : "") + "$" + m(F(X).unrealizedPnL.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 3)
                        ]),
                        l("div", Yu, [
                          l("strong", {
                            class: de({ "profit-text": F(Ne), "loss-text": !F(Ne) })
                          }, " P&L Percentage = (" + m(F(Pe) && F(Pe) >= 0 ? "+" : "") + "$" + m(F(X).unrealizedPnL.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })) + " ÷ $" + m(F(X).totalCostBasis.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })) + ") × 100 = " + m(F(X).pnlPercentage.toFixed(2)) + "% ", 3)
                        ])
                      ])
                    ])) : U("", !0),
                    F(X) && "optionType" in F(X) && F(X).optionType != null ? (E(), C("div", Zu, [
                      l("div", ef, [
                        l("div", tf, "📊 SHORT " + m(F(X).optionType) + " OPTIONS SUMMARY", 1),
                        l("div", sf, " Total Contracts: " + m(F(X).totalContracts.toLocaleString()), 1),
                        l("div", of, " Position Type: " + m(F(X).positionType), 1)
                      ]),
                      (E(!0), C(oe, null, ae(F(X).positions, (k, W) => (E(), C("div", {
                        key: `pos-${W}`,
                        class: "pnl-section"
                      }, [
                        l("div", nf, "Position " + m(W + 1) + ": " + m(k.account) + " - $" + m(k.strike) + " Strike (" + m(k.expiry) + ")", 1),
                        l("div", af, " Contracts Sold: " + m(Math.abs(k.quantity).toLocaleString()), 1),
                        l("div", rf, " Premium Received: $" + m(k.premiumReceived.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1),
                        l("div", lf, " Current Market Value: $" + m(k.currentValue.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1),
                        l("div", hf, [
                          l("strong", {
                            class: de({ "profit-text": k.positionPnL >= 0, "loss-text": k.positionPnL < 0 })
                          }, " P&L: " + m(k.positionPnL >= 0 ? "+" : "") + "$" + m(k.positionPnL.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 3)
                        ])
                      ]))), 128)),
                      l("div", df, [
                        b[41] || (b[41] = l("div", { class: "pnl-section-title" }, "💰 TOTAL CALCULATION", -1)),
                        l("div", cf, " Total Premium Received = " + m(F(X).positions.map((k) => `$${k.premiumReceived.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).join(" + ")), 1),
                        l("div", uf, [
                          l("strong", null, "= $" + m(F(X).totalPremiumReceived.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)
                        ]),
                        l("div", ff, " Current Market Liability = " + m(F(X).positions.map((k) => `$${k.currentValue.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).join(" + ")), 1),
                        l("div", mf, [
                          l("strong", null, "= $" + m(F(X).currentMarketLiability.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)
                        ]),
                        l("div", pf, [
                          l("strong", {
                            class: de({ "profit-text": F(Ne), "loss-text": !F(Ne) })
                          }, " Unrealized P&L = $" + m(F(X).totalPremiumReceived.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })) + " - $" + m(F(X).currentMarketLiability.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })) + " = " + m(F(Pe) && F(Pe) >= 0 ? "+" : "") + "$" + m(F(X).unrealizedPnL.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 3)
                        ]),
                        l("div", gf, [
                          l("strong", {
                            class: de({ "profit-text": F(Ne), "loss-text": !F(Ne) })
                          }, " P&L % = (" + m(F(Pe) && F(Pe) >= 0 ? "+" : "") + "$" + m(F(X).unrealizedPnL.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })) + " ÷ $" + m(F(X).totalPremiumReceived.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })) + ") × 100 = " + m(F(X).pnlPercentage.toFixed(2)) + "% ", 3)
                        ]),
                        F(X).pnlPercentage < -50 ? (E(), C("div", bf, " ⚠️ WARNING: Loss exceeds 50% of premium received! ")) : U("", !0)
                      ])
                    ])) : U("", !0)
                  ], 512), [
                    [mt, o.value]
                  ])
                ]),
                _: 1
              }),
              Ie(st, { name: "slide-fade" }, {
                default: ot(() => [
                  He(l("div", vf, [
                    b[49] || (b[49] = l("h2", null, "Exited Positions P&L Details:", -1)),
                    F(Ut) ? (E(), C("div", yf, [
                      l("div", wf, [
                        b[43] || (b[43] = l("div", { class: "pnl-section-title" }, "📊 Overall Summary", -1)),
                        l("div", Cf, " Total Accounts: " + m(F(Ut).accountBreakdowns.length), 1),
                        l("div", Ef, " Total Orders: " + m(F(Ut).orderCount), 1),
                        l("div", xf, [
                          l("strong", {
                            class: de({ "profit-text": F(De) && F(De) >= 0, "loss-text": F(De) && F(De) < 0 })
                          }, " Total FIFO P&L: " + m(F(De) && F(De) >= 0 ? "+" : "") + "$" + m((F(De) || 0).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 3)
                        ])
                      ]),
                      (E(!0), C(oe, null, ae(F(Ut).accountBreakdowns, (k, W) => (E(), C("div", {
                        key: `account-${W}`,
                        class: "pnl-section account-section"
                      }, [
                        l("div", {
                          class: "pnl-section-title account-header clickable",
                          onClick: (J) => Js(k.internal_account_id)
                        }, [
                          l("span", Rf, m(gt.value.has(k.internal_account_id) ? "▼" : "▶"), 1),
                          l("span", Tf, "📋 " + m(k.accountDisplayName), 1),
                          l("span", Sf, [
                            Y(" (" + m(k.orderCount) + " orders • ", 1),
                            l("span", {
                              class: de({ "profit-text": k.totalFifoPnlRealized >= 0, "loss-text": k.totalFifoPnlRealized < 0 })
                            }, m(k.totalFifoPnlRealized >= 0 ? "+" : "") + "$" + m(k.totalFifoPnlRealized.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 3),
                            b[44] || (b[44] = Y(") ", -1))
                          ])
                        ], 8, kf),
                        Ie(st, { name: "slide-fade" }, {
                          default: ot(() => [
                            He(l("div", _f, [
                              l("div", Lf, [
                                l("table", Df, [
                                  b[47] || (b[47] = l("thead", null, [
                                    l("tr", null, [
                                      l("th", null, "Order Date"),
                                      l("th", null, "Symbol"),
                                      l("th", null, "Side"),
                                      l("th", { class: "text-right" }, "Quantity"),
                                      l("th", { class: "text-right" }, "Trade Price"),
                                      l("th", { class: "text-right" }, "Trade Money"),
                                      l("th", { class: "text-right" }, "FIFO P&L")
                                    ])
                                  ], -1)),
                                  l("tbody", null, [
                                    (E(!0), C(oe, null, ae(k.orders, (J) => (E(), C("tr", {
                                      key: J.id
                                    }, [
                                      l("td", null, m(Bs(J.dateTime)), 1),
                                      l("td", null, [
                                        (E(!0), C(oe, null, ae(Ft(J.symbol), (ce) => (E(), C("span", {
                                          key: ce,
                                          class: "fi-tag position-tag"
                                        }, m(ce), 1))), 128))
                                      ]),
                                      l("td", null, [
                                        l("span", {
                                          class: de(["trade-side-badge", J.buySell.toLowerCase()])
                                        }, m(J.buySell), 3)
                                      ]),
                                      l("td", Ff, m(oi(J.quantity)), 1),
                                      l("td", Mf, m(Ce(J.tradePrice)), 1),
                                      l("td", Pf, m(Ce(J.tradeMoney)), 1),
                                      l("td", {
                                        class: de(["text-right", { "profit-text": J.fifoPnlRealized >= 0, "loss-text": J.fifoPnlRealized < 0 }])
                                      }, m(J.fifoPnlRealized >= 0 ? "+" : "") + m(Ce(J.fifoPnlRealized)), 3)
                                    ]))), 128))
                                  ]),
                                  l("tfoot", null, [
                                    l("tr", zf, [
                                      b[45] || (b[45] = l("td", {
                                        colspan: "5",
                                        class: "total-label"
                                      }, [
                                        l("strong", null, "Total")
                                      ], -1)),
                                      l("td", {
                                        class: de(["text-right total-value", { "profit-text": k.totalFifoPnlRealized >= 0, "loss-text": k.totalFifoPnlRealized < 0 }])
                                      }, [
                                        l("strong", null, m(k.totalFifoPnlRealized >= 0 ? "+" : "") + m(Ce(k.totalFifoPnlRealized)), 1)
                                      ], 2),
                                      b[46] || (b[46] = l("td", null, null, -1))
                                    ])
                                  ])
                                ])
                              ])
                            ], 512), [
                              [mt, gt.value.has(k.internal_account_id)]
                            ])
                          ]),
                          _: 2
                        }, 1024)
                      ]))), 128))
                    ])) : (E(), C("div", Af, [...b[48] || (b[48] = [
                      l("p", null, "No exited positions found", -1)
                    ])]))
                  ], 512), [
                    [mt, qt.value]
                  ])
                ]),
                _: 1
              }),
              Ie(st, { name: "slide-fade" }, {
                default: ot(() => [
                  He(l("div", Of, [
                    b[54] || (b[54] = l("h2", null, "Capital Used Calculation Details:", -1)),
                    F(ze) ? F(ze).assetType === "STK" ? (E(), C("div", $f, [
                      l("div", Bf, [
                        b[51] || (b[51] = l("div", { class: "capital-section-title" }, "📊 STOCK CAPITAL CALCULATION", -1)),
                        l("div", Nf, " Total Shares = " + m(F(ze).totalShares.toLocaleString()), 1),
                        l("div", Vf, " Current Price per Share = $" + m(F(ze).pricePerShare.toFixed(2)), 1),
                        l("div", If, [
                          l("strong", null, " Total Capital Used = " + m(F(ze).totalShares.toLocaleString()) + " × $" + m(F(ze).pricePerShare.toFixed(2)) + " = $" + m(F(ze).totalCapital.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)
                        ])
                      ])
                    ])) : F(ze).assetType === "OPT" ? (E(), C("div", Wf, [
                      b[53] || (b[53] = l("div", { class: "capital-section" }, [
                        l("div", { class: "capital-section-title" }, "📊 OPTIONS CAPITAL CALCULATION"),
                        l("div", { class: "calc-line" }, " Capital = Sum of |Market Value| for all option positions ")
                      ], -1)),
                      (E(!0), C(oe, null, ae(F(ze).positions, (k, W) => (E(), C("div", {
                        key: `cap-${W}`,
                        class: "capital-section"
                      }, [
                        l("div", Gf, " Position " + m(W + 1) + ": " + m(k.account) + " - " + m(k.optionType), 1),
                        l("div", jf, " Symbol: " + m(k.symbol), 1),
                        l("div", Uf, " Quantity: " + m(Math.abs(k.quantity).toLocaleString()) + " contracts ", 1),
                        l("div", qf, " Market Price: $" + m(k.marketPrice.toFixed(2)) + " per contract ", 1),
                        l("div", Kf, [
                          l("strong", null, " Market Value = " + m(Math.abs(k.quantity).toLocaleString()) + " × $" + m(k.marketPrice.toFixed(2)) + " = $" + m(Math.abs(k.marketValue).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)
                        ])
                      ]))), 128)),
                      l("div", Qf, [
                        b[52] || (b[52] = l("div", { class: "capital-section-title" }, "💰 TOTAL CAPITAL USED", -1)),
                        l("div", Xf, " Total = " + m(F(ze).positions.map((k) => `$${Math.abs(k.marketValue).toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).join(" + ")), 1),
                        l("div", Jf, [
                          l("strong", null, " = $" + m(F(ze).totalOptionsCapital.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 1)
                        ])
                      ])
                    ])) : U("", !0) : (E(), C("div", Hf, [...b[50] || (b[50] = [
                      l("p", null, "No capital data available", -1)
                    ])]))
                  ], 512), [
                    [mt, n.value]
                  ])
                ]),
                _: 1
              })
            ]))
          ])
        ]),
        Ke.value ? (E(), C("div", {
          key: 0,
          class: "modal-overlay",
          onClick: b[16] || (b[16] = (k) => Ke.value = !1)
        }, [
          l("div", {
            class: "modal-content trade-attach-modal",
            onClick: b[15] || (b[15] = At(() => {
            }, ["stop"]))
          }, [
            l("div", Yf, [
              b[55] || (b[55] = l("h3", null, "Attach to Position", -1)),
              l("button", {
                class: "modal-close",
                onClick: b[3] || (b[3] = (k) => Ke.value = !1)
              }, "×")
            ]),
            l("div", Zf, [
              Xe.value ? (E(), C("div", em, [
                b[56] || (b[56] = l("strong", null, "Position:", -1)),
                (E(!0), C(oe, null, ae(pt(Xe.value.symbol), (k) => (E(), C("span", {
                  key: k,
                  class: "fi-tag position-tag"
                }, m(k), 1))), 128)),
                Y(" • (Contract Qty: " + m(Xe.value.contract_quantity) + " · Avg price: $" + m(Xe.value.avgPrice) + ") ", 1)
              ])) : U("", !0),
              l("div", tm, [
                l("button", {
                  class: de(["tab-button", { active: me.value === "trades" }]),
                  onClick: b[4] || (b[4] = (k) => {
                    me.value = "trades", ri(Qe.value);
                  })
                }, "Trades", 2),
                l("button", {
                  class: de(["tab-button", { active: me.value === "positions" }]),
                  onClick: b[5] || (b[5] = (k) => {
                    me.value = "positions", li(Xe.value);
                  })
                }, "Positions", 2),
                l("button", {
                  class: de(["tab-button", { active: me.value === "orders" }]),
                  onClick: b[6] || (b[6] = (k) => {
                    me.value = "orders", hi(Qe.value);
                  })
                }, "Orders", 2)
              ]),
              me.value === "trades" ? (E(), C("div", im, [
                l("div", sm, [
                  He(l("input", {
                    "onUpdate:modelValue": b[7] || (b[7] = (k) => Kt.value = k),
                    type: "text",
                    class: "search-input",
                    placeholder: "Search trades (e.g., 'Put' or 'Call, 250')...",
                    onInput: b[8] || (b[8] = (k) => ri(Qe.value))
                  }, null, 544), [
                    [di, Kt.value]
                  ]),
                  b[57] || (b[57] = l("div", { class: "search-hint" }, [
                    Y("💡 "),
                    l("em", null, "Use commas to search multiple terms (AND logic)")
                  ], -1))
                ]),
                et.value ? (E(), C("div", om, "Loading trades...")) : (E(), C("div", nm, [
                  (E(!0), C(oe, null, ae(Mt.value, (k) => (E(), C("div", {
                    key: k.tradeID,
                    class: de(["trade-item", { selected: Ye.value.has(String(k.tradeID)) }]),
                    onClick: (W) => Ki(String(k.tradeID))
                  }, [
                    l("input", {
                      type: "checkbox",
                      checked: Ye.value.has(String(k.tradeID)),
                      onClick: At((W) => Ki(String(k.tradeID)), ["stop"])
                    }, null, 8, rm),
                    l("div", lm, [
                      l("div", hm, [
                        l("span", {
                          class: de(["trade-side", (k.buySell || "").toLowerCase()])
                        }, m(k.buySell), 3),
                        l("strong", null, [
                          (E(!0), C(oe, null, ae(Ft(k.symbol), (W) => (E(), C("span", {
                            key: W,
                            class: "fi-tag position-tag"
                          }, m(W), 1))), 128))
                        ]),
                        l("span", dm, "Qty: " + m(k.quantity), 1),
                        l("span", cm, "· Price: " + m(k.tradePrice), 1)
                      ]),
                      l("div", um, [
                        l("span", null, "Trade date: " + m(Ve(k.tradeDate)), 1),
                        k.assetCategory ? (E(), C("span", fm, "• " + m(k.assetCategory), 1)) : U("", !0),
                        k.description ? (E(), C("span", mm, "• " + m(k.description), 1)) : U("", !0),
                        l("span", pm, "• ID: " + m(k.tradeID), 1)
                      ])
                    ])
                  ], 10, am))), 128)),
                  Mt.value.length === 0 ? (E(), C("div", gm, " No trades found ")) : U("", !0)
                ]))
              ])) : me.value === "positions" ? (E(), C("div", bm, [
                l("div", vm, [
                  He(l("input", {
                    "onUpdate:modelValue": b[9] || (b[9] = (k) => Qt.value = k),
                    type: "text",
                    class: "search-input",
                    placeholder: "Search positions (e.g., 'Put' or 'Call, 250')...",
                    onInput: b[10] || (b[10] = (k) => li(Xe.value))
                  }, null, 544), [
                    [di, Qt.value]
                  ]),
                  b[58] || (b[58] = l("div", { class: "search-hint" }, [
                    Y("💡 "),
                    l("em", null, "Showing positions with same underlying symbol. Use commas to search multiple terms.")
                  ], -1))
                ]),
                et.value ? (E(), C("div", ym, "Loading positions...")) : (E(), C("div", wm, [
                  (E(!0), C(oe, null, ae(Pt.value, (k) => (E(), C("div", {
                    key: F(K)(k),
                    class: de(["trade-item", { selected: Ze.value.has(F(K)(k)), expired: k.asset_class === "OPT" && Ji(k) }]),
                    onClick: (W) => Qi(F(K)(k))
                  }, [
                    l("input", {
                      type: "checkbox",
                      checked: Ze.value.has(F(K)(k)),
                      onClick: At((W) => Qi(F(K)(k)), ["stop"])
                    }, null, 8, Em),
                    l("div", xm, [
                      l("div", km, [
                        l("strong", null, [
                          (E(!0), C(oe, null, ae(pt(k.symbol), (W) => (E(), C("span", {
                            key: W,
                            class: "fi-tag position-tag"
                          }, m(W), 1))), 128))
                        ]),
                        l("span", Rm, "Qty: " + m(k.contract_quantity), 1),
                        l("span", Tm, "· Avg price: " + m(Ce(k.avgPrice)), 1),
                        Ji(k) ? (E(), C("span", Sm, "EXPIRED")) : U("", !0)
                      ]),
                      l("div", _m, [
                        l("span", null, m(k.asset_class), 1),
                        b[59] || (b[59] = l("span", null, "•", -1)),
                        l("span", null, m(k.internal_account_id || k.legal_entity), 1),
                        k.market_value ? (E(), C("span", Lm, "• MV: " + m(Ce(k.market_value)), 1)) : U("", !0),
                        b[60] || (b[60] = l("span", null, " • ", -1)),
                        l("span", null, "Fetched at: " + m(Xs(k.fetched_at)), 1)
                      ])
                    ])
                  ], 10, Cm))), 128)),
                  Pt.value.length === 0 ? (E(), C("div", Dm, " No positions found ")) : U("", !0)
                ]))
              ])) : (E(), C("div", Fm, [
                l("div", Mm, [
                  He(l("input", {
                    "onUpdate:modelValue": b[11] || (b[11] = (k) => Xt.value = k),
                    type: "text",
                    class: "search-input",
                    placeholder: "Search orders (e.g., 'Put' or 'Call, 250')...",
                    onInput: b[12] || (b[12] = (k) => hi(Qe.value))
                  }, null, 544), [
                    [di, Xt.value]
                  ]),
                  b[61] || (b[61] = l("div", { class: "search-hint" }, [
                    Y("💡 "),
                    l("em", null, "Showing orders with same underlying symbol. Use commas to search multiple terms.")
                  ], -1))
                ]),
                et.value ? (E(), C("div", Pm, "Loading orders...")) : (E(), C("div", zm, [
                  (E(!0), C(oe, null, ae(zt.value, (k) => (E(), C("div", {
                    key: k.id,
                    class: de(["trade-item", { selected: Je.value.has(String(k.id)) }]),
                    onClick: (W) => Xi(String(k.id))
                  }, [
                    l("input", {
                      type: "checkbox",
                      checked: Je.value.has(String(k.id)),
                      onClick: At((W) => Xi(String(k.id)), ["stop"])
                    }, null, 8, Om),
                    l("div", Hm, [
                      l("div", $m, [
                        l("strong", null, [
                          (E(!0), C(oe, null, ae(Ft(k.symbol), (W) => (E(), C("span", {
                            key: W,
                            class: "fi-tag position-tag"
                          }, m(W), 1))), 128))
                        ]),
                        l("span", Bm, "Qty: " + m(k.contract_quantity), 1),
                        l("span", Nm, "· Trade price: " + m(Ce(k.tradePrice)), 1)
                      ]),
                      l("div", Vm, [
                        l("span", null, m(k.assetCategory), 1),
                        k.tradeMoney ? (E(), C("span", Im, "• Trade money: " + m(Ce(k.tradeMoney)), 1)) : U("", !0),
                        b[62] || (b[62] = l("span", null, " • ", -1)),
                        l("span", null, "Settlement Date: " + m(Zi(k.settleDateTarget)), 1)
                      ])
                    ])
                  ], 10, Am))), 128)),
                  zt.value.length === 0 ? (E(), C("div", Wm, " No orders found ")) : U("", !0)
                ]))
              ]))
            ]),
            l("div", Gm, [
              l("button", {
                class: "btn btn-secondary",
                onClick: b[13] || (b[13] = (k) => Ke.value = !1)
              }, "Cancel"),
              l("button", {
                class: "btn btn-primary",
                disabled: me.value === "trades" ? Ye.value.size === 0 : me.value === "positions" ? Ze.value.size === 0 : Je.value.size === 0,
                onClick: b[14] || (b[14] = (k) => me.value === "trades" ? Gs() : me.value === "positions" ? js() : Us())
              }, " Attach " + m(me.value === "trades" ? Ye.value.size : me.value === "positions" ? Ze.value.size : Je.value.size) + " " + m(me.value === "trades" ? "Trade(s)" : me.value === "positions" ? "Position(s)" : "Order(s)"), 9, jm)
            ])
          ])
        ])) : U("", !0)
      ]);
    };
  }
}), Ym = /* @__PURE__ */ Ds(Um, [["__scopeId", "data-v-c6d61568"]]);
export {
  Ym as currentPositions,
  Ym as default
};
