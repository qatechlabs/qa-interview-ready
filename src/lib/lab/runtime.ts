/**
 * A small, Playwright-compatible test runtime that drives a same-origin iframe.
 * It implements the parts of the Playwright API that interview scenarios need:
 * page navigation, user-facing locators, actions with auto-waiting, and
 * web-first assertions with retries. Everything runs in the learner's browser.
 */

export type LogKind = "step" | "pass" | "fail" | "info" | "error" | "test";
export interface LogEntry {
  kind: LogKind;
  text: string;
  ms?: number;
}

export interface RunOptions {
  frame: HTMLIFrameElement;
  /** Base URL of the practice app, e.g. /sandbox/swagshop/ */
  base: string;
  slowMo: number;
  timeout: number;
  onLog: (e: LogEntry) => void;
  signal: { aborted: boolean };
}

export interface RunResult {
  ok: boolean;
  error?: string;
  assertions: { passed: number; failed: number; matchers: string[] };
  tests: { name: string; ok: boolean; error?: string }[];
  durationMs: number;
}

class LabError extends Error {
  /** true when the failure was already written to the log by an assertion */
  logged = false;
  constructor(message: string, logged = false) {
    super(message);
    this.name = "Error";
    this.logged = logged;
  }
}
class AbortedError extends Error {
  constructor() {
    super("Run stopped");
    this.name = "Aborted";
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const norm = (s: string | null | undefined) => (s || "").replace(/\s+/g, " ").trim();

type TextMatcher = string | RegExp;
function textMatches(actual: string, expected: TextMatcher, exact = false) {
  const a = norm(actual);
  if (expected instanceof RegExp) return expected.test(a);
  const e = norm(expected);
  return exact ? a === e : a.toLowerCase().includes(e.toLowerCase());
}
function describe(m: TextMatcher) {
  return m instanceof RegExp ? m.toString() : JSON.stringify(m);
}

// ---------- accessibility helpers ----------

const IMPLICIT_ROLES: Record<string, string> = {
  BUTTON: "button", A: "link", SELECT: "combobox", TEXTAREA: "textbox", IMG: "img", H1: "heading", H2: "heading",
  H3: "heading", H4: "heading", H5: "heading", H6: "heading", LI: "listitem", UL: "list", OL: "list", NAV: "navigation",
  TABLE: "table", TR: "row", TD: "cell", TH: "columnheader", OPTION: "option", FORM: "form", MAIN: "main", HEADER: "banner",
  DIALOG: "dialog", ASIDE: "complementary", TBODY: "rowgroup", THEAD: "rowgroup",
};

function roleOf(el: Element): string | null {
  const explicit = el.getAttribute("role");
  if (explicit) return explicit.split(" ")[0];
  const tag = el.tagName;
  if (tag === "A") return el.hasAttribute("href") ? "link" : null;
  if (tag === "INPUT") {
    const t = (el.getAttribute("type") || "text").toLowerCase();
    if (["button", "submit", "reset", "image"].includes(t)) return "button";
    if (t === "checkbox") return "checkbox";
    if (t === "radio") return "radio";
    if (t === "search") return "searchbox";
    if (t === "range") return "slider";
    if (t === "number") return "spinbutton";
    if (["text", "email", "tel", "url", ""].includes(t)) return "textbox";
    return null;
  }
  return IMPLICIT_ROLES[tag] || null;
}

function labelText(el: Element): string {
  const doc = el.ownerDocument;
  const id = el.getAttribute("id");
  const parts: string[] = [];
  if (id) doc.querySelectorAll(`label[for="${CSS.escape(id)}"]`).forEach((l) => parts.push(norm(l.textContent)));
  const wrap = el.closest("label");
  if (wrap) parts.push(norm(wrap.textContent));
  return parts.filter(Boolean).join(" ");
}

function accessibleName(el: Element): string {
  const aria = el.getAttribute("aria-label");
  if (aria) return norm(aria);
  const by = el.getAttribute("aria-labelledby");
  if (by) {
    return norm(by.split(/\s+/).map((i) => el.ownerDocument.getElementById(i)?.textContent || "").join(" "));
  }
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") {
    const t = (el.getAttribute("type") || "").toLowerCase();
    if (["button", "submit", "reset"].includes(t)) return norm((el as HTMLInputElement).value || el.getAttribute("title") || "");
    const l = labelText(el);
    if (l) return l;
    return norm(el.getAttribute("title") || el.getAttribute("placeholder") || "");
  }
  if (tag === "IMG") return norm(el.getAttribute("alt") || el.getAttribute("title") || "");
  const text = norm(el.textContent);
  return text || norm(el.getAttribute("title") || "");
}

function isVisible(el: Element): boolean {
  const win = el.ownerDocument.defaultView;
  if (!win || !el.isConnected) return false;
  const style = win.getComputedStyle(el);
  if (style.visibility === "hidden" || style.display === "none") return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

function isEnabled(el: Element) {
  return !(el as HTMLButtonElement).disabled && el.getAttribute("aria-disabled") !== "true" && !el.closest("fieldset[disabled]");
}

function isChecked(el: Element) {
  if (el instanceof el.ownerDocument.defaultView!.HTMLInputElement) return el.checked;
  return el.getAttribute("aria-checked") === "true" || el.getAttribute("aria-pressed") === "true";
}

// ---------- selector engine ----------

type Query = (roots: Element[]) => Element[];

function uniq(list: Element[]) {
  return Array.from(new Set(list));
}

function allDescendants(roots: Element[], includeSelf = false) {
  const out: Element[] = [];
  for (const r of roots) {
    if (includeSelf) out.push(r);
    r.querySelectorAll("*").forEach((e) => out.push(e));
  }
  return uniq(out);
}

function cssQuery(selector: string): Query {
  const s = selector.trim();
  if (s.startsWith("text=")) return textQuery(s.slice(5).replace(/^["']|["']$/g, ""), { exact: /^["']/.test(s.slice(5)) });
  if (s.startsWith("xpath=") || s.startsWith("//") || s.startsWith("(//")) {
    const xp = s.startsWith("xpath=") ? s.slice(6) : s;
    return (roots) => {
      const out: Element[] = [];
      for (const r of roots) {
        const doc = r.ownerDocument;
        const res = doc.evaluate(xp, r, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        for (let i = 0; i < res.snapshotLength; i++) {
          const n = res.snapshotItem(i);
          if (n && n.nodeType === 1) out.push(n as Element);
        }
      }
      return uniq(out);
    };
  }
  const css = s.startsWith("css=") ? s.slice(4) : s;
  // Playwright pseudo-classes that are not CSS: :has-text("x"), :text("x"), :visible
  const pseudo = css.match(/^(.*?):(has-text|text)\((["'])(.*)\3\)(.*)$/);
  if (pseudo) {
    const [, before, kind, , txt, after] = pseudo;
    const baseSel = (before || "*") + (after || "");
    return (roots) =>
      uniq(roots.flatMap((r) => Array.from(r.querySelectorAll(baseSel)))).filter((e) =>
        kind === "has-text" ? textMatches(e.textContent || "", txt) : textMatches(e.textContent || "", txt),
      );
  }
  const visibleOnly = /:visible$/.test(css);
  const clean = css.replace(/:visible$/, "");
  return (roots) => {
    let out: Element[];
    try {
      out = uniq(roots.flatMap((r) => Array.from(r.querySelectorAll(clean))));
    } catch {
      throw new LabError(`Invalid selector: ${selector}`);
    }
    return visibleOnly ? out.filter(isVisible) : out;
  };
}

function textQuery(text: TextMatcher, opts: { exact?: boolean } = {}): Query {
  return (roots) => {
    const els = allDescendants(roots).filter((e) => !["SCRIPT", "STYLE", "HEAD", "TITLE", "HTML", "BODY"].includes(e.tagName));
    const hits = els.filter((e) => textMatches(e.textContent || "", text, opts.exact) || (e instanceof HTMLInputElement && ["button", "submit"].includes(e.type) && textMatches(e.value, text, opts.exact)));
    // keep the deepest matching elements only
    return hits.filter((e) => !hits.some((o) => o !== e && e.contains(o)));
  };
}

interface RoleOptions {
  name?: TextMatcher;
  exact?: boolean;
  level?: number;
  checked?: boolean;
  disabled?: boolean;
  pressed?: boolean;
  selected?: boolean;
  includeHidden?: boolean;
}

function roleQuery(role: string, opts: RoleOptions = {}): Query {
  return (roots) =>
    allDescendants(roots).filter((e) => {
      if (roleOf(e) !== role) return false;
      if (!opts.includeHidden && !isVisible(e)) return false;
      if (opts.level && /^H[1-6]$/.test(e.tagName) && Number(e.tagName[1]) !== opts.level) return false;
      if (opts.checked !== undefined && isChecked(e) !== opts.checked) return false;
      if (opts.pressed !== undefined && (e.getAttribute("aria-pressed") === "true") !== opts.pressed) return false;
      if (opts.disabled !== undefined && !isEnabled(e) !== opts.disabled) return false;
      if (opts.name !== undefined && !textMatches(accessibleName(e), opts.name, opts.exact)) return false;
      return true;
    });
}

function labelQuery(text: TextMatcher, opts: { exact?: boolean } = {}): Query {
  return (roots) => {
    const out: Element[] = [];
    for (const r of roots) {
      const doc = r.ownerDocument;
      doc.querySelectorAll("label").forEach((l) => {
        if (!textMatches(l.textContent || "", text, opts.exact)) return;
        const target = (l as HTMLLabelElement).control || (l.getAttribute("for") ? doc.getElementById(l.getAttribute("for")!) : null);
        if (target && (r === target || r.contains(target))) out.push(target);
      });
      r.querySelectorAll("[aria-label]").forEach((e) => {
        if (textMatches(e.getAttribute("aria-label") || "", text, opts.exact) && ["INPUT", "SELECT", "TEXTAREA"].includes(e.tagName)) out.push(e);
      });
    }
    return uniq(out);
  };
}

function attrQuery(attrs: string[], value: TextMatcher, exact = false): Query {
  return (roots) =>
    allDescendants(roots).filter((e) => attrs.some((a) => e.hasAttribute(a) && textMatches(e.getAttribute(a) || "", value, exact || (typeof value === "string" && a.startsWith("data-")))));
}

// ---------- runtime ----------

export function createRuntime(opts: RunOptions) {
  const { frame, onLog, signal } = opts;
  const stats = { passed: 0, failed: 0, matchers: [] as string[] };
  let navCounter = 0;

  const check = () => {
    if (signal.aborted) throw new AbortedError();
  };
  const doc = () => {
    const d = frame.contentDocument;
    if (!d) throw new LabError("The practice app is not loaded. Call page.goto('/') first.");
    return d;
  };
  const win = () => frame.contentWindow as (Window & typeof globalThis) | null;

  function resolveUrl(url: string) {
    const base = new URL(opts.base, location.origin);
    if (/^https?:\/\//i.test(url)) {
      const u = new URL(url);
      if (u.origin !== location.origin) {
        throw new LabError(
          `This lab runs against the hosted practice app, so external sites like ${u.host} are not loaded. Use a relative path such as page.goto('/') or page.goto('/inventory').`,
        );
      }
      return u.toString();
    }
    const path = url.startsWith("#") ? url.slice(1) : url.startsWith("/") ? url : "/" + url;
    return `${base.toString()}?nav=${++navCounter}#${path === "/" ? "" : path}`;
  }

  function waitForLoad(target: string) {
    return new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new LabError(`page.goto: timed out loading ${target}`)), opts.timeout * 2);
      frame.onload = () => {
        clearTimeout(t);
        frame.onload = null;
        resolve();
      };
    });
  }

  let highlightEl: HTMLElement | null = null;
  function highlight(el: Element | null) {
    const d = frame.contentDocument;
    if (!d) return;
    if (!highlightEl || highlightEl.ownerDocument !== d) {
      highlightEl = d.createElement("div");
      highlightEl.setAttribute("data-lab-highlight", "");
      highlightEl.style.cssText =
        "position:fixed;pointer-events:none;z-index:2147483647;border:2px solid #f43f5e;background:rgba(244,63,94,.12);border-radius:4px;transition:all .12s ease;display:none";
    }
    if (!el) {
      highlightEl.style.display = "none";
      return;
    }
    if (!highlightEl.isConnected) d.body.appendChild(highlightEl);
    const r = el.getBoundingClientRect();
    Object.assign(highlightEl.style, { display: "block", left: r.left - 3 + "px", top: r.top - 3 + "px", width: r.width + 6 + "px", height: r.height + 6 + "px" });
  }

  async function poll<T>(fn: () => T | undefined, timeout: number, describeFailure: () => string): Promise<T> {
    const start = Date.now();
    let lastErr: unknown;
    for (;;) {
      check();
      try {
        const v = fn();
        if (v !== undefined) return v;
      } catch (e) {
        if (e instanceof LabError && /strict mode|Invalid selector/.test(e.message)) throw e;
        lastErr = e;
      }
      if (Date.now() - start > timeout) {
        const msg = describeFailure();
        throw new LabError(lastErr instanceof Error && !msg ? lastErr.message : msg);
      }
      await sleep(60);
    }
  }

  // ----- Locator -----
  interface FilterOpts {
    hasText?: TextMatcher;
    hasNotText?: TextMatcher;
    has?: Locator;
    hasNot?: Locator;
    visible?: boolean;
  }

  class Locator {
    constructor(
      private readonly chain: Query[],
      readonly description: string,
    ) {}

    _all(): Element[] {
      const d = frame.contentDocument;
      if (!d || !d.documentElement) return [];
      let roots: Element[] = [d.documentElement];
      for (const q of this.chain) roots = q(roots);
      return roots.filter((e) => !e.hasAttribute("data-lab-highlight"));
    }

    private derive(q: Query, desc: string) {
      return new Locator([...this.chain, q], `${this.description}.${desc}`);
    }

    locator(selector: string | Locator, o?: FilterOpts): Locator {
      if (selector instanceof Locator) {
        const sub = selector;
        return this.derive((roots) => sub._all().filter((e) => roots.some((r) => r !== e && r.contains(e))), `locator(${sub.description})`);
      }
      const l = this.derive(cssQuery(selector), `locator(${JSON.stringify(selector)})`);
      return o ? l.filter(o) : l;
    }
    getByRole(role: string, o?: RoleOptions) {
      return this.derive(roleQuery(role, o), `getByRole(${JSON.stringify(role)}${o ? ", " + fmtOpts(o) : ""})`);
    }
    getByText(t: TextMatcher, o?: { exact?: boolean }) {
      return this.derive(textQuery(t, o), `getByText(${describe(t)})`);
    }
    getByLabel(t: TextMatcher, o?: { exact?: boolean }) {
      return this.derive(labelQuery(t, o), `getByLabel(${describe(t)})`);
    }
    getByPlaceholder(t: TextMatcher, o?: { exact?: boolean }) {
      return this.derive(attrQuery(["placeholder"], t, o?.exact), `getByPlaceholder(${describe(t)})`);
    }
    getByTestId(t: TextMatcher) {
      return this.derive(attrQuery(["data-testid", "data-test", "data-test-id"], t, true), `getByTestId(${describe(t)})`);
    }
    getByAltText(t: TextMatcher, o?: { exact?: boolean }) {
      return this.derive(attrQuery(["alt"], t, o?.exact), `getByAltText(${describe(t)})`);
    }
    getByTitle(t: TextMatcher, o?: { exact?: boolean }) {
      return this.derive(attrQuery(["title"], t, o?.exact), `getByTitle(${describe(t)})`);
    }
    filter(o: FilterOpts = {}) {
      return this.derive(
        (roots) =>
          roots.filter((e) => {
            if (o.hasText !== undefined && !textMatches(e.textContent || "", o.hasText)) return false;
            if (o.hasNotText !== undefined && textMatches(e.textContent || "", o.hasNotText)) return false;
            if (o.has && !o.has._all().some((c) => e.contains(c))) return false;
            if (o.hasNot && o.hasNot._all().some((c) => e.contains(c))) return false;
            if (o.visible !== undefined && isVisible(e) !== o.visible) return false;
            return true;
          }),
        `filter(${fmtOpts(o)})`,
      );
    }
    nth(i: number) {
      return this.derive((roots) => {
        const idx = i < 0 ? roots.length + i : i;
        return roots[idx] ? [roots[idx]] : [];
      }, `nth(${i})`);
    }
    first() {
      return this.nth(0);
    }
    last() {
      return this.nth(-1);
    }
    and(other: Locator) {
      return this.derive((roots) => roots.filter((e) => other._all().includes(e)), `and(${other.description})`);
    }
    or(other: Locator) {
      return new Locator([() => uniq([...this._all(), ...other._all()])], `${this.description}.or(${other.description})`);
    }

    /** Waits for exactly one element that satisfies the condition. */
    async _one(action: string, cond: (e: Element) => string | null, timeout = opts.timeout): Promise<Element> {
      let reason = "no element matched";
      const el = await poll(
        () => {
          const all = this._all();
          if (all.length > 1) {
            throw new LabError(
              `${action}: strict mode violation: ${this.description} resolved to ${all.length} elements. Make the locator more specific, or use .first(), .nth(i) or .filter().`,
            );
          }
          if (!all.length) {
            reason = "no element matched";
            return undefined;
          }
          const problem = cond(all[0]);
          if (problem) {
            reason = problem;
            return undefined;
          }
          return all[0];
        },
        timeout,
        () => `${action}: timed out after ${timeout}ms waiting for ${this.description} (${reason})`,
      );
      return el;
    }

    private async act(name: string, cond: (e: Element) => string | null, fn: (el: Element) => void | Promise<void>, label?: string) {
      const started = Date.now();
      const el = await this._one(name, cond);
      el.scrollIntoView({ block: "center", inline: "nearest" });
      highlight(el);
      if (opts.slowMo) await sleep(opts.slowMo);
      check();
      await fn(el);
      highlight(null);
      onLog({ kind: "step", text: label || `${this.description}.${name}()`, ms: Date.now() - started });
      await sleep(30);
    }

    async click(o: { force?: boolean } = {}) {
      await this.act(
        "click",
        (e) => (!isVisible(e) && !o.force ? "element is not visible" : !isEnabled(e) && !o.force ? "element is disabled" : null),
        (el) => {
          const w = el.ownerDocument.defaultView!;
          (el as HTMLElement).focus?.();
          for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup"]) el.dispatchEvent(new w.MouseEvent(type, { bubbles: true, cancelable: true, view: w }));
          (el as HTMLElement).click();
        },
      );
    }
    async dblclick() {
      await this.click();
      await this.click();
    }
    async hover() {
      await this.act("hover", (e) => (isVisible(e) ? null : "element is not visible"), (el) => {
        const w = el.ownerDocument.defaultView!;
        for (const type of ["pointerover", "mouseover", "mouseenter", "mousemove"]) el.dispatchEvent(new w.MouseEvent(type, { bubbles: true, view: w }));
      });
    }
    async fill(value: string) {
      if (typeof value !== "string") throw new LabError(`fill: expected a string value, got ${typeof value}`);
      await this.act(
        "fill",
        (e) => (!isVisible(e) ? "element is not visible" : !isEnabled(e) ? "element is disabled" : !isEditable(e) ? "element is not an <input>, <textarea> or [contenteditable]" : null),
        (el) => setValue(el, value),
        `${this.description}.fill(${JSON.stringify(value)})`,
      );
    }
    async clear() {
      await this.fill("");
    }
    async pressSequentially(text: string, o: { delay?: number } = {}) {
      await this.act("pressSequentially", (e) => (isEditable(e) ? null : "element is not editable"), async (el) => {
        const input = el as HTMLInputElement;
        input.focus();
        for (const ch of text) {
          setValue(el, input.value + ch, false);
          if (o.delay) await sleep(o.delay);
        }
        input.dispatchEvent(new (el.ownerDocument.defaultView!.Event)("change", { bubbles: true }));
      }, `${this.description}.pressSequentially(${JSON.stringify(text)})`);
    }
    async type(text: string) {
      await this.pressSequentially(text);
    }
    async press(key: string) {
      await this.act("press", (e) => (isVisible(e) ? null : "element is not visible"), (el) => pressKey(el, key), `${this.description}.press(${JSON.stringify(key)})`);
    }
    async check() {
      await this.setChecked(true);
    }
    async uncheck() {
      await this.setChecked(false);
    }
    async setChecked(state: boolean) {
      await this.act(state ? "check" : "uncheck", (e) => (isVisible(e) ? (isEnabled(e) ? null : "element is disabled") : "element is not visible"), (el) => {
        if (isChecked(el) !== state) (el as HTMLElement).click();
        if (isChecked(el) !== state) throw new LabError(`${state ? "check" : "uncheck"}: clicking did not change the checked state`);
      });
    }
    async selectOption(value: string | string[] | { label?: string; value?: string; index?: number }) {
      let picked: string[] = [];
      await this.act("selectOption", (e) => (e.tagName !== "SELECT" ? "element is not a <select>" : isEnabled(e) ? null : "element is disabled"), (el) => {
        const sel = el as HTMLSelectElement;
        const wanted = Array.isArray(value) ? value : [value];
        const opts2 = Array.from(sel.options);
        const matched = wanted.map((w) => {
          const o =
            typeof w === "string"
              ? opts2.find((o) => o.value === w) || opts2.find((o) => norm(o.label) === norm(w))
              : opts2.find((o, i) => (w.value !== undefined ? o.value === w.value : w.label !== undefined ? norm(o.label) === norm(w.label) : i === w.index));
          if (!o) throw new LabError(`selectOption: no option matching ${JSON.stringify(w)}. Options are: ${opts2.map((o) => `"${o.value}" (${norm(o.label)})`).join(", ")}`);
          return o;
        });
        opts2.forEach((o) => (o.selected = matched.includes(o)));
        picked = matched.map((o) => o.value);
        const W = el.ownerDocument.defaultView!;
        sel.dispatchEvent(new W.Event("input", { bubbles: true }));
        sel.dispatchEvent(new W.Event("change", { bubbles: true }));
      }, `${this.description}.selectOption(${JSON.stringify(value)})`);
      return picked;
    }
    async focus() {
      await this.act("focus", () => null, (el) => (el as HTMLElement).focus());
    }
    async scrollIntoViewIfNeeded() {
      await this.act("scrollIntoViewIfNeeded", () => null, () => undefined);
    }
    async screenshot() {
      onLog({ kind: "info", text: `${this.description}.screenshot() is a no-op in the browser lab` });
      return new Uint8Array();
    }
    async waitFor(o: { state?: "attached" | "detached" | "visible" | "hidden"; timeout?: number } = {}) {
      const state = o.state || "visible";
      const t = o.timeout ?? opts.timeout;
      await poll(
        () => {
          const all = this._all();
          if (state === "attached") return all.length ? true : undefined;
          if (state === "detached") return all.length ? undefined : true;
          if (state === "visible") return all.some(isVisible) ? true : undefined;
          return all.every((e) => !isVisible(e)) ? true : undefined;
        },
        t,
        () => `waitFor: timed out after ${t}ms waiting for ${this.description} to be ${state}`,
      );
      onLog({ kind: "step", text: `${this.description}.waitFor({ state: "${state}" })` });
    }

    // ----- queries (wait for attach, no strictness for counts) -----
    async count() {
      await sleep(0);
      check();
      return this._all().length;
    }
    async all() {
      return this._all().map((_, i) => this.nth(i));
    }
    async textContent() {
      const el = await this._one("textContent", () => null);
      return el.textContent;
    }
    async innerText() {
      const el = await this._one("innerText", () => null);
      return norm((el as HTMLElement).innerText ?? el.textContent);
    }
    async innerHTML() {
      const el = await this._one("innerHTML", () => null);
      return el.innerHTML;
    }
    async inputValue() {
      const el = await this._one("inputValue", (e) => ("value" in e ? null : "element is not an input"));
      return (el as HTMLInputElement).value;
    }
    async getAttribute(name: string) {
      const el = await this._one("getAttribute", () => null);
      return el.getAttribute(name);
    }
    async allTextContents() {
      check();
      return this._all().map((e) => e.textContent || "");
    }
    async allInnerTexts() {
      check();
      return this._all().map((e) => norm((e as HTMLElement).innerText ?? e.textContent));
    }
    async isVisible() {
      const all = this._all();
      if (all.length > 1) throw new LabError(`isVisible: strict mode violation: ${this.description} resolved to ${all.length} elements`);
      return all.length === 1 && isVisible(all[0]);
    }
    async isHidden() {
      return !(await this.isVisible());
    }
    async isEnabled() {
      return isEnabled(await this._one("isEnabled", () => null));
    }
    async isDisabled() {
      return !(await this.isEnabled());
    }
    async isChecked() {
      return isChecked(await this._one("isChecked", () => null));
    }
    async isEditable() {
      return isEditable(await this._one("isEditable", () => null));
    }
    toString() {
      return this.description;
    }
  }

  function fmtOpts(o: object) {
    return (
      "{ " +
      Object.entries(o)
        .map(([k, v]) => `${k}: ${v instanceof RegExp ? v.toString() : v instanceof Locator ? v.description : JSON.stringify(v)}`)
        .join(", ") +
      " }"
    );
  }

  function isEditable(e: Element) {
    return (["INPUT", "TEXTAREA", "SELECT"].includes(e.tagName) && !(e as HTMLInputElement).readOnly) || (e as HTMLElement).isContentEditable;
  }

  function setValue(el: Element, value: string, change = true) {
    const W = el.ownerDocument.defaultView!;
    (el as HTMLElement).focus();
    if ((el as HTMLElement).isContentEditable) {
      el.textContent = value;
    } else {
      const proto = el.tagName === "TEXTAREA" ? W.HTMLTextAreaElement.prototype : el.tagName === "SELECT" ? W.HTMLSelectElement.prototype : W.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, "value")!.set!;
      setter.call(el, value);
    }
    el.dispatchEvent(new W.Event("input", { bubbles: true }));
    if (change) el.dispatchEvent(new W.Event("change", { bubbles: true }));
  }

  function pressKey(el: Element, key: string) {
    const W = el.ownerDocument.defaultView!;
    const parts = key.split("+");
    const k = parts[parts.length - 1];
    const init = { key: k, bubbles: true, cancelable: true, ctrlKey: parts.includes("Control"), shiftKey: parts.includes("Shift"), altKey: parts.includes("Alt"), metaKey: parts.includes("Meta") };
    (el as HTMLElement).focus?.();
    const down = el.dispatchEvent(new W.KeyboardEvent("keydown", init));
    if (down && k === "Enter") {
      const form = (el as HTMLInputElement).form || el.closest("form");
      if (form && el.tagName !== "TEXTAREA") form.requestSubmit();
      else if (el.tagName === "BUTTON" || el.tagName === "A") (el as HTMLElement).click();
    }
    if (down && k.length === 1 && isEditable(el) && !init.ctrlKey && !init.metaKey) setValue(el, (el as HTMLInputElement).value + k, false);
    if (down && k === "Backspace" && isEditable(el)) setValue(el, (el as HTMLInputElement).value.slice(0, -1), false);
    el.dispatchEvent(new W.KeyboardEvent("keyup", init));
  }

  const root = new Locator([], "page");
  const mk = (q: Query, d: string) => new Locator([q], d);

  // ----- Page -----
  const page = {
    async goto(url: string) {
      check();
      const target = resolveUrl(url);
      const started = Date.now();
      const loaded = waitForLoad(url);
      frame.src = target;
      await loaded;
      await sleep(Math.min(opts.slowMo, 250));
      onLog({ kind: "step", text: `page.goto(${JSON.stringify(url)})`, ms: Date.now() - started });
      return null;
    },
    async reload() {
      const loaded = waitForLoad("reload");
      win()?.location.reload();
      await loaded;
      onLog({ kind: "step", text: "page.reload()" });
    },
    async goBack() {
      win()?.history.back();
      await sleep(150);
      onLog({ kind: "step", text: "page.goBack()" });
    },
    async goForward() {
      win()?.history.forward();
      await sleep(150);
      onLog({ kind: "step", text: "page.goForward()" });
    },
    url() {
      const w = win();
      if (!w) return "about:blank";
      const u = new URL(w.location.href);
      u.searchParams.delete("nav");
      return u.toString().replace("?#", "#");
    },
    async title() {
      return doc().title;
    },
    async content() {
      return doc().documentElement.outerHTML;
    },
    async waitForTimeout(ms: number) {
      const end = Date.now() + ms;
      while (Date.now() < end) {
        check();
        await sleep(Math.min(100, end - Date.now()));
      }
    },
    async waitForURL(pattern: TextMatcher | ((u: URL) => boolean), o: { timeout?: number } = {}) {
      const t = o.timeout ?? opts.timeout;
      await poll(() => (urlMatches(page.url(), pattern) ? true : undefined), t, () => `waitForURL: timed out after ${t}ms waiting for ${String(pattern)}, current URL is ${page.url()}`);
      onLog({ kind: "step", text: `page.waitForURL(${String(pattern)})` });
    },
    async waitForLoadState() {
      await sleep(50);
    },
    async waitForSelector(selector: string, o: { state?: "attached" | "detached" | "visible" | "hidden"; timeout?: number } = {}) {
      const l = page.locator(selector);
      await l.waitFor(o);
      return l;
    },
    locator: (s: string, o?: FilterOpts) => root.locator(s, o),
    getByRole: (r: string, o?: RoleOptions) => mk(roleQuery(r, o), `getByRole(${JSON.stringify(r)}${o ? ", " + fmtOpts(o) : ""})`),
    getByText: (t: TextMatcher, o?: { exact?: boolean }) => mk(textQuery(t, o), `getByText(${describe(t)})`),
    getByLabel: (t: TextMatcher, o?: { exact?: boolean }) => mk(labelQuery(t, o), `getByLabel(${describe(t)})`),
    getByPlaceholder: (t: TextMatcher, o?: { exact?: boolean }) => mk(attrQuery(["placeholder"], t, o?.exact), `getByPlaceholder(${describe(t)})`),
    getByTestId: (t: TextMatcher) => mk(attrQuery(["data-testid", "data-test", "data-test-id"], t, true), `getByTestId(${describe(t)})`),
    getByAltText: (t: TextMatcher, o?: { exact?: boolean }) => mk(attrQuery(["alt"], t, o?.exact), `getByAltText(${describe(t)})`),
    getByTitle: (t: TextMatcher, o?: { exact?: boolean }) => mk(attrQuery(["title"], t, o?.exact), `getByTitle(${describe(t)})`),
    click: (s: string) => page.locator(s).click(),
    fill: (s: string, v: string) => page.locator(s).fill(v),
    type: (s: string, v: string) => page.locator(s).pressSequentially(v),
    press: (s: string, k: string) => page.locator(s).press(k),
    check: (s: string) => page.locator(s).check(),
    uncheck: (s: string) => page.locator(s).uncheck(),
    hover: (s: string) => page.locator(s).hover(),
    selectOption: (s: string, v: string | string[]) => page.locator(s).selectOption(v),
    textContent: (s: string) => page.locator(s).textContent(),
    innerText: (s: string) => page.locator(s).innerText(),
    inputValue: (s: string) => page.locator(s).inputValue(),
    isVisible: (s: string) => page.locator(s).isVisible(),
    async $$eval<T>(s: string, fn: (els: Element[]) => T) {
      return fn(page.locator(s)._all());
    },
    async $eval<T>(s: string, fn: (el: Element) => T) {
      const all = page.locator(s)._all();
      if (!all.length) throw new LabError(`$eval: no element matches ${s}`);
      return fn(all[0]);
    },
    async evaluate<T>(fn: (() => T) | string) {
      const w = win();
      if (!w) throw new LabError("evaluate: no page loaded");
      return typeof fn === "string" ? (w as unknown as { eval: (s: string) => T }).eval(fn) : fn.call(w);
    },
    async screenshot() {
      onLog({ kind: "info", text: "page.screenshot() is a no-op in the browser lab" });
      return new Uint8Array();
    },
    keyboard: {
      async press(key: string) {
        const el = frame.contentDocument?.activeElement || frame.contentDocument?.body;
        if (el) pressKey(el, key);
        onLog({ kind: "step", text: `keyboard.press(${JSON.stringify(key)})` });
        await sleep(30);
      },
      async type(text: string) {
        const el = frame.contentDocument?.activeElement;
        if (el && isEditable(el)) setValue(el, (el as HTMLInputElement).value + text);
        onLog({ kind: "step", text: `keyboard.type(${JSON.stringify(text)})` });
      },
    },
    on() {
      onLog({ kind: "info", text: "page.on() listeners are not needed here: the practice apps use in-page dialogs, not browser alerts." });
    },
    async setViewportSize() {
      onLog({ kind: "info", text: "setViewportSize() is ignored: the preview pane sets the size." });
    },
    async close() {},
  };

  function urlMatches(url: string, p: TextMatcher | ((u: URL) => boolean)) {
    if (typeof p === "function") return p(new URL(url));
    if (p instanceof RegExp) return p.test(url);
    if (p.includes("*")) {
      const re = new RegExp("^" + p.split("**").map((s) => s.split("*").map((x) => x.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join("[^/]*")).join(".*") + "$");
      return re.test(url);
    }
    return url === p || url.endsWith(p) || url.endsWith("#" + p);
  }

  // ----- expect -----
  type AsyncMatcher = (...args: unknown[]) => Promise<void>;

  function deepEqual(a: unknown, b: unknown): boolean {
    if (Object.is(a, b)) return true;
    if (typeof a !== "object" || typeof b !== "object" || !a || !b) return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    const ka = Object.keys(a as object), kb = Object.keys(b as object);
    if (ka.length !== kb.length) return false;
    return ka.every((k) => deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
  }
  const fmt = (v: unknown) => {
    try {
      return typeof v === "string" ? JSON.stringify(v) : v instanceof RegExp ? v.toString() : JSON.stringify(v);
    } catch {
      return String(v);
    }
  };

  function record(ok: boolean, name: string, text: string) {
    stats.matchers.push(name);
    if (ok) {
      stats.passed++;
      onLog({ kind: "pass", text });
    } else {
      stats.failed++;
      onLog({ kind: "fail", text });
    }
  }

  function expect(actual: unknown, message?: string | { timeout?: number }) {
    const customMsg = typeof message === "string" ? message : undefined;
    const timeout = typeof message === "object" && message?.timeout ? message.timeout : opts.timeout;
    const build = (negate: boolean) => {
      const label = (m: string, arg?: string) => `expect(${actual instanceof Locator ? actual.description : actual === page ? "page" : fmt(actual)})${negate ? ".not" : ""}.${m}(${arg ?? ""})`;

      if (actual instanceof Locator) {
        const loc = actual;
        const retry = async (name: string, arg: string, test: () => { pass: boolean; got: string } | undefined) => {
          check();
          let last = { pass: false, got: "element not found" };
          const deadline = Date.now() + timeout;
          for (;;) {
            check();
            let r: { pass: boolean; got: string } | undefined;
            try {
              r = test();
            } catch (e) {
              if (e instanceof LabError && /strict mode/.test(e.message)) throw e;
              r = undefined;
            }
            if (r) last = r;
            if (r && r.pass !== negate) {
              record(true, name, label(name, arg));
              return;
            }
            if (Date.now() > deadline) break;
            await sleep(80);
          }
          const text = `${label(name, arg)} failed after ${timeout}ms. Received: ${last.got}`;
          record(false, name, customMsg ? `${customMsg}: ${text}` : text);
          throw new LabError(customMsg ? `${customMsg}\n${text}` : text, true);
        };
        const single = () => {
          const all = loc._all();
          if (all.length > 1) throw new LabError(`strict mode violation: ${loc.description} resolved to ${all.length} elements`);
          return all[0];
        };
        const textOf = (e: Element) => norm((e as HTMLElement).innerText ?? e.textContent);
        const m: Record<string, AsyncMatcher> = {
          toBeVisible: () => retry("toBeVisible", "", () => { const e = single(); return { pass: !!e && isVisible(e), got: e ? (isVisible(e) ? "visible" : "hidden") : "element not found" }; }),
          toBeHidden: () => retry("toBeHidden", "", () => { const e = single(); return { pass: !e || !isVisible(e), got: e ? (isVisible(e) ? "visible" : "hidden") : "not found" }; }),
          toBeAttached: () => retry("toBeAttached", "", () => { const n = loc._all().length; return { pass: n > 0, got: `${n} elements` }; }),
          toBeEnabled: () => retry("toBeEnabled", "", () => { const e = single(); return e ? { pass: isEnabled(e), got: isEnabled(e) ? "enabled" : "disabled" } : undefined; }),
          toBeDisabled: () => retry("toBeDisabled", "", () => { const e = single(); return e ? { pass: !isEnabled(e), got: isEnabled(e) ? "enabled" : "disabled" } : undefined; }),
          toBeChecked: () => retry("toBeChecked", "", () => { const e = single(); return e ? { pass: isChecked(e), got: isChecked(e) ? "checked" : "unchecked" } : undefined; }),
          toBeEditable: () => retry("toBeEditable", "", () => { const e = single(); return e ? { pass: isEditable(e), got: isEditable(e) ? "editable" : "not editable" } : undefined; }),
          toBeEmpty: () => retry("toBeEmpty", "", () => { const e = single(); if (!e) return undefined; const v = "value" in e ? (e as HTMLInputElement).value : textOf(e); return { pass: !v, got: fmt(v) }; }),
          toBeFocused: () => retry("toBeFocused", "", () => { const e = single(); return e ? { pass: e.ownerDocument.activeElement === e, got: e.ownerDocument.activeElement === e ? "focused" : "not focused" } : undefined; }),
          toHaveText: (exp) => retry("toHaveText", fmt(exp), () => {
            if (Array.isArray(exp)) { const t = loc._all().map(textOf); return { pass: t.length === exp.length && t.every((x, i) => textMatches(x, exp[i] as TextMatcher, true)), got: fmt(t) }; }
            const e = single(); return e ? { pass: textMatches(textOf(e), exp as TextMatcher, true), got: fmt(textOf(e)) } : undefined;
          }),
          toContainText: (exp) => retry("toContainText", fmt(exp), () => {
            if (Array.isArray(exp)) { const t = loc._all().map(textOf); return { pass: exp.every((x) => t.some((y) => textMatches(y, x as TextMatcher))), got: fmt(t) }; }
            const e = single(); return e ? { pass: textMatches(textOf(e), exp as TextMatcher), got: fmt(textOf(e)) } : undefined;
          }),
          toHaveValue: (exp) => retry("toHaveValue", fmt(exp), () => { const e = single(); if (!e) return undefined; const v = (e as HTMLInputElement).value; return { pass: exp instanceof RegExp ? exp.test(v) : v === exp, got: fmt(v) }; }),
          toHaveCount: (exp) => retry("toHaveCount", fmt(exp), () => { const n = loc._all().length; return { pass: n === exp, got: String(n) }; }),
          toHaveAttribute: (name, val) => retry("toHaveAttribute", fmt(name) + (val !== undefined ? ", " + fmt(val) : ""), () => {
            const e = single(); if (!e) return undefined; const v = e.getAttribute(name as string);
            return { pass: val === undefined ? v !== null : val instanceof RegExp ? v !== null && val.test(v) : v === val, got: fmt(v) };
          }),
          toHaveClass: (exp) => retry("toHaveClass", fmt(exp), () => { const e = single(); if (!e) return undefined; const c = e.getAttribute("class") || ""; return { pass: exp instanceof RegExp ? exp.test(c) : c.split(/\s+/).includes(String(exp)) || c === exp, got: fmt(c) }; }),
          toHaveId: (exp) => retry("toHaveId", fmt(exp), () => { const e = single(); return e ? { pass: e.id === exp, got: fmt(e.id) } : undefined; }),
          toHaveCSS: (prop, val) => retry("toHaveCSS", fmt(prop) + ", " + fmt(val), () => { const e = single(); if (!e) return undefined; const v = e.ownerDocument.defaultView!.getComputedStyle(e).getPropertyValue(prop as string); return { pass: val instanceof RegExp ? val.test(v) : v === val, got: fmt(v) }; }),
          toHaveAccessibleName: (exp) => retry("toHaveAccessibleName", fmt(exp), () => { const e = single(); return e ? { pass: textMatches(accessibleName(e), exp as TextMatcher, true), got: fmt(accessibleName(e)) } : undefined; }),
        };
        return m;
      }

      if (actual === page) {
        const retry = async (name: string, arg: string, test: () => { pass: boolean; got: string }) => {
          const deadline = Date.now() + timeout;
          let last = test();
          while (last.pass === negate && Date.now() < deadline) {
            check();
            await sleep(80);
            last = test();
          }
          const ok = last.pass !== negate;
          const text = ok ? label(name, arg) : `${label(name, arg)} failed. Received: ${last.got}`;
          record(ok, name, text);
          if (!ok) throw new LabError(customMsg ? `${customMsg}\n${text}` : text, true);
        };
        return {
          toHaveURL: (exp: unknown) => retry("toHaveURL", fmt(exp), () => ({ pass: urlMatches(page.url(), exp as TextMatcher), got: page.url() })),
          toHaveTitle: (exp: unknown) => retry("toHaveTitle", fmt(exp), () => { const t = frame.contentDocument?.title || ""; return { pass: textMatches(t, exp as TextMatcher, true), got: fmt(t) }; }),
        } as Record<string, AsyncMatcher>;
      }

      // generic (synchronous) matchers
      const sync = (name: string, arg: string, pass: boolean) => {
        const ok = pass !== negate;
        const text = ok ? label(name, arg) : `${label(name, arg)} failed. Received: ${fmt(actual)}`;
        record(ok, name, customMsg && !ok ? `${customMsg}: ${text}` : text);
        if (!ok) throw new LabError(customMsg ? `${customMsg}\n${text}` : text, true);
      };
      const a = actual as never;
      return {
        toBe: (e: unknown) => sync("toBe", fmt(e), Object.is(actual, e)),
        toEqual: (e: unknown) => sync("toEqual", fmt(e), deepEqual(actual, e)),
        toStrictEqual: (e: unknown) => sync("toStrictEqual", fmt(e), deepEqual(actual, e)),
        toBeTruthy: () => sync("toBeTruthy", "", !!actual),
        toBeFalsy: () => sync("toBeFalsy", "", !actual),
        toBeNull: () => sync("toBeNull", "", actual === null),
        toBeUndefined: () => sync("toBeUndefined", "", actual === undefined),
        toBeDefined: () => sync("toBeDefined", "", actual !== undefined),
        toBeNaN: () => sync("toBeNaN", "", Number.isNaN(actual)),
        toBeGreaterThan: (e: number) => sync("toBeGreaterThan", fmt(e), a > e),
        toBeGreaterThanOrEqual: (e: number) => sync("toBeGreaterThanOrEqual", fmt(e), a >= e),
        toBeLessThan: (e: number) => sync("toBeLessThan", fmt(e), a < e),
        toBeLessThanOrEqual: (e: number) => sync("toBeLessThanOrEqual", fmt(e), a <= e),
        toBeCloseTo: (e: number, digits = 2) => sync("toBeCloseTo", fmt(e), Math.abs((actual as number) - e) < Math.pow(10, -digits) / 2),
        toContain: (e: unknown) => sync("toContain", fmt(e), typeof actual === "string" ? actual.includes(e as string) : Array.isArray(actual) && actual.includes(e)),
        toContainEqual: (e: unknown) => sync("toContainEqual", fmt(e), Array.isArray(actual) && actual.some((x) => deepEqual(x, e))),
        toHaveLength: (e: number) => sync("toHaveLength", fmt(e), (actual as { length?: number })?.length === e),
        toMatch: (e: RegExp | string) => sync("toMatch", fmt(e), typeof actual === "string" && (e instanceof RegExp ? e.test(actual) : actual.includes(e))),
        toBeInstanceOf: (c: new (...x: unknown[]) => unknown) => sync("toBeInstanceOf", c?.name, actual instanceof c),
        toHaveProperty: (k: string) => sync("toHaveProperty", fmt(k), actual != null && k in (actual as object)),
      } as Record<string, (...args: never[]) => void>;
    };
    const positive = build(false) as Record<string, unknown>;
    positive.not = build(true);
    return positive;
  }
  expect.soft = expect;
  expect.poll = (fn: () => unknown | Promise<unknown>, o: { timeout?: number } = {}) => {
    const t = o.timeout ?? opts.timeout;
    const mkPoll = (negate: boolean) =>
      new Proxy({}, {
        get(_, name: string) {
          return async (...args: unknown[]) => {
            const deadline = Date.now() + t;
            let lastErr: unknown;
            for (;;) {
              check();
              const v = await fn();
              const matchers = expect(v) as Record<string, unknown>;
              const target = (negate ? matchers.not : matchers) as Record<string, (...a: unknown[]) => void>;
              // run silently first; only record the final outcome
              const saved = { ...stats, matchers: [...stats.matchers] };
              try {
                target[name](...args);
                return;
              } catch (e) {
                Object.assign(stats, saved);
                lastErr = e;
              }
              if (Date.now() > deadline) throw lastErr;
              await sleep(100);
            }
          };
        },
      });
    const p = mkPoll(false) as Record<string, unknown>;
    p.not = mkPoll(true);
    return p;
  };

  return { page, expect, stats, highlight };
}

// ---------- project files and module loading ----------

/** A virtual project: path (e.g. "tests/login.spec.ts") to source. */
export type ProjectFiles = Record<string, string>;

export const SPEC_RE = /\.(spec|test)\.[cm]?[jt]sx?$/;
const CONFIG_RE = /(^|\/)playwright\.config\.[cm]?[jt]s$/;

export function normalizePath(p: string) {
  const parts: string[] = [];
  for (const seg of p.replace(/\\/g, "/").split("/")) {
    if (!seg || seg === ".") continue;
    if (seg === "..") parts.pop();
    else parts.push(seg);
  }
  return parts.join("/");
}

function dirname(p: string) {
  const i = p.lastIndexOf("/");
  return i < 0 ? "" : p.slice(0, i);
}

export function resolveModule(files: ProjectFiles, from: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith(".")) base = normalizePath(dirname(from) + "/" + spec);
  else if (spec.startsWith("/")) base = normalizePath(spec);
  else if (spec.startsWith("@/") || spec.startsWith("~/")) base = normalizePath(spec.slice(2));
  else base = normalizePath(spec); // bare path such as "pages/login.page"
  const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.mjs`, `${base}/index.ts`, `${base}/index.js`];
  for (const c of candidates) if (c in files) return c;
  return null;
}

type Sucrase = typeof import("sucrase");
let sucrase: Promise<Sucrase> | null = null;
const loadSucrase = () => (sucrase ||= import("sucrase"));

function compileFile(s: Sucrase, code: string, file: string) {
  try {
    return s.transform(code, { transforms: ["typescript", "imports"], disableESTransforms: true, filePath: file, preserveDynamicImport: true }).code;
  } catch (e) {
    const err = e as Error & { loc?: { line: number; column: number } };
    throw new LabError(`${file}: syntax error${err.loc ? ` on line ${err.loc.line}` : ""}: ${err.message.replace(/\s*\(\d+:\d+\)$/, "")}`);
  }
}

/** Kept for callers that only have a single file of code. */
export async function compile(code: string): Promise<string> {
  return compileFile(await loadSucrase(), code, "tests/example.spec.ts");
}

// ---------- fixtures ----------

type AnyFn = (...args: unknown[]) => unknown;
type FixtureFn = (deps: Record<string, unknown>, use: (value: unknown) => Promise<void>) => Promise<unknown> | unknown;
interface FixtureDef {
  name: string;
  fn?: FixtureFn;
  value?: unknown;
  deps: string[];
}
type FixtureDefs = Record<string, FixtureDef>;

/** Names destructured from a function's first parameter: `async ({ page, loginPage }, use) => ...` */
export function paramNames(fn: AnyFn): string[] | null {
  const src = fn.toString();
  const m = src.match(/^[^(]*\(\s*\{([^}]*)\}/) || src.match(/^\s*(?:async\s*)?\(\s*\{([^}]*)\}/);
  if (!m) {
    // no destructuring: either no params (`async () =>`) or a plain identifier
    if (/^\s*(?:async\s*)?\(\s*\)/.test(src) || /^\s*(?:async\s*)?function[^(]*\(\s*\)/.test(src) || /^\s*(?:async\s*)?\(\s*use\b/.test(src)) return [];
    return null;
  }
  return m[1]
    .split(",")
    .map((s) => s.trim().replace(/[:=][\s\S]*$/, "").trim())
    .filter((s) => s && !s.startsWith("..."));
}

function toFixtureDefs(obj: Record<string, unknown>): FixtureDefs {
  const out: FixtureDefs = {};
  for (const [name, raw] of Object.entries(obj)) {
    const v = Array.isArray(raw) && raw.length === 2 && raw[1] && typeof raw[1] === "object" && !Array.isArray(raw[1]) ? raw[0] : raw;
    if (typeof v === "function") out[name] = { name, fn: v as FixtureFn, deps: paramNames(v as AnyFn) || [] };
    else out[name] = { name, value: v, deps: [] };
  }
  return out;
}

// ---------- test registry ----------

type TestFn = (fixtures: Record<string, unknown>) => Promise<void> | void;
interface TestEntry {
  name: string;
  fn: TestFn;
  only?: boolean;
  skip?: boolean;
  defs: FixtureDefs;
  file: string;
}
interface Hook {
  prefix: string;
  fn: TestFn;
  defs: FixtureDefs;
}
class SkipSignal extends Error {
  constructor(reason = "") {
    super(reason);
    this.name = "Skip";
  }
}

export interface ProjectRunOptions extends RunOptions {
  beforeEachTest: () => Promise<void>;
}

export async function runProject(input: ProjectFiles, o: ProjectRunOptions): Promise<RunResult> {
  const started = Date.now();
  const rt = createRuntime(o);
  const files: ProjectFiles = {};
  for (const [p, c] of Object.entries(input)) files[normalizePath(p)] = c;

  const tests: TestEntry[] = [];
  const beforeEach: Hook[] = [];
  const afterEach: Hook[] = [];
  const results: RunResult["tests"] = [];
  let prefix = "";
  let currentFile = "";
  let currentTitle = "";

  const consoleProxy = {
    log: (...a: unknown[]) => o.onLog({ kind: "info", text: a.map((x) => (typeof x === "string" ? x : safeJson(x))).join(" ") }),
    info: (...a: unknown[]) => consoleProxy.log(...a),
    warn: (...a: unknown[]) => consoleProxy.log(...a),
    error: (...a: unknown[]) => consoleProxy.log(...a),
    debug: (...a: unknown[]) => consoleProxy.log(...a),
    table: (x: unknown) => consoleProxy.log(x),
  };

  function makeTest(defs: FixtureDefs): AnyFn & Record<string, unknown> {
    const register = (name: string, fn: TestFn, extra: Partial<TestEntry> = {}) => {
      if (typeof fn !== "function") throw new LabError(`test("${name}"): the second argument must be a function`);
      tests.push({ name: prefix + name, fn, defs, file: currentFile, ...extra });
    };
    const describe = Object.assign(
      (name: string, fn: () => void) => {
        const prev = prefix;
        prefix = `${prefix}${name} › `;
        try {
          fn();
        } finally {
          prefix = prev;
        }
      },
      {
        only: (name: string, fn: () => void) => describe(name, fn),
        skip: (name: string) => o.onLog({ kind: "info", text: `skipped describe: ${name}` }),
        serial: undefined as unknown,
        parallel: undefined as unknown,
        configure: () => undefined,
      },
    );
    describe.serial = describe;
    describe.parallel = describe;
    const t = Object.assign((name: string, fn: TestFn) => register(name, fn), {
      only: (name: string, fn: TestFn) => register(name, fn, { only: true }),
      skip: (name?: string | boolean, fn?: TestFn) => {
        if (typeof name === "string" && fn) return register(name, fn, { skip: true });
        if (name === undefined || name === true) throw new SkipSignal();
      },
      fixme: (name: string, fn: TestFn) => register(name, fn, { skip: true }),
      fail: () => undefined,
      slow: () => undefined,
      describe,
      beforeEach: (fn: TestFn) => beforeEach.push({ prefix, fn, defs }),
      afterEach: (fn: TestFn) => afterEach.push({ prefix, fn, defs }),
      beforeAll: (fn: TestFn) => beforeEach.push({ prefix, fn, defs }),
      afterAll: () => undefined,
      step: async (name: string, fn: () => Promise<unknown>) => {
        o.onLog({ kind: "info", text: `step: ${name}` });
        return fn();
      },
      setTimeout: () => undefined,
      info: () => ({ title: currentTitle, titlePath: [currentTitle], annotations: [], project: { name: "lab" }, config: {}, retry: 0, outputPath: () => "" }),
      use: (obj: Record<string, unknown>) => {
        Object.assign(defs, toFixtureDefs(obj));
      },
      extend: (obj: Record<string, unknown>) => {
        if (!obj || typeof obj !== "object") throw new LabError("test.extend() expects an object of fixtures, e.g. test.extend({ loginPage: async ({ page }, use) => { ... } })");
        return makeTest({ ...defs, ...toFixtureDefs(obj) });
      },
      expect: rt.expect,
    });
    return t as unknown as AnyFn & Record<string, unknown>;
  }

  const baseTest = makeTest({});
  const builtins: Record<string, unknown> = {
    "@playwright/test": { test: baseTest, expect: rt.expect, devices: {}, defineConfig: (c: unknown) => c, default: baseTest },
    playwright: { chromium: {}, devices: {} },
  };
  builtins["playwright/test"] = builtins["@playwright/test"];

  // ----- module loader -----
  const s = await loadSucrase();
  const cache = new Map<string, { exports: Record<string, unknown> }>();
  const FunctionCtor = Function;
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as typeof Function;
  const ARGS = ["require", "module", "exports", "console", "page", "expect", "test", "window", "document", "localStorage", "sessionStorage"];

  function makeRequire(from: string, stack: string[]) {
    return (spec: string) => {
      if (spec in builtins) return builtins[spec];
      const target = resolveModule(files, from, spec);
      if (!target) {
        const known = Object.keys(files).filter((f) => !SPEC_RE.test(f)).join(", ") || "none";
        throw new LabError(`${from}: cannot find module '${spec}'. Files in this project: ${known}. Use a relative path such as '../pages/login.page'.`);
      }
      if (stack.includes(target)) throw new LabError(`Circular import: ${[...stack, target].join(" → ")}`);
      return loadModule(target, [...stack, from]).exports;
    };
  }

  function loadModule(path: string, stack: string[]) {
    const hit = cache.get(path);
    if (hit) return hit;
    const mod = { exports: {} as Record<string, unknown> };
    cache.set(path, mod);
    const js = compileFile(s, files[path], path);
    let fn: AnyFn;
    try {
      fn = new FunctionCtor(...ARGS, `"use strict";\n{\n${js}\n}`) as AnyFn;
    } catch (e) {
      if (e instanceof SyntaxError && /await/.test(e.message)) throw new LabError(`${path}: top-level await is only allowed in test files (*.spec.ts). Put the code inside a test or a function.`);
      throw new LabError(`${path}: ${(e as Error).message}`);
    }
    const prevFile = currentFile;
    currentFile = path;
    try {
      fn(makeRequire(path, stack), mod, mod.exports, consoleProxy, rt.page, rt.expect, baseTest, undefined, undefined, undefined, undefined);
    } catch (e) {
      if (e instanceof LabError || e instanceof AbortedError) throw e;
      throw new LabError(`${path}: ${errMsg(e)}`);
    } finally {
      currentFile = prevFile;
    }
    return mod;
  }

  async function loadSpec(path: string) {
    const js = compileFile(s, files[path], path);
    let fn: AnyFn;
    try {
      fn = new AsyncFunction(...ARGS, `"use strict";\n{\n${js}\n}`) as AnyFn;
    } catch (e) {
      throw new LabError(`${path}: ${(e as Error).message}`);
    }
    const mod = { exports: {} as Record<string, unknown> };
    currentFile = path;
    try {
      await fn(makeRequire(path, []), mod, mod.exports, consoleProxy, rt.page, rt.expect, baseTest, undefined, undefined, undefined, undefined);
    } catch (e) {
      if (e instanceof LabError || e instanceof AbortedError) throw e;
      throw new LabError(`${path}: ${errMsg(e)}`);
    } finally {
      currentFile = "";
    }
  }

  // ----- fixture resolution -----
  const BASE_FIXTURES: Record<string, unknown> = { page: rt.page, expect: rt.expect, context: { pages: () => [rt.page], newPage: async () => rt.page, clearCookies: async () => undefined }, browser: {}, browserName: "chromium", baseURL: o.base, request: undefined };

  async function buildFixtures(defs: FixtureDefs, wanted: string[] | null, teardowns: (() => Promise<void>)[]) {
    const built = new Map<string, unknown>();
    const resolving = new Set<string>();
    const get = async (name: string): Promise<unknown> => {
      if (built.has(name)) return built.get(name);
      if (name in BASE_FIXTURES) return BASE_FIXTURES[name];
      const def = defs[name];
      if (!def) {
        const have = Object.keys(defs);
        throw new LabError(`Unknown fixture "${name}". ${have.length ? `Available custom fixtures: ${have.join(", ")}.` : ""} Define it with test.extend({ ${name}: async ({ page }, use) => { /* set up */ await use(value); /* tear down */ } })`);
      }
      if (!def.fn) {
        built.set(name, def.value);
        return def.value;
      }
      if (resolving.has(name)) throw new LabError(`Fixture "${name}" depends on itself`);
      resolving.add(name);
      const deps: Record<string, unknown> = {};
      for (const d of def.deps) deps[d] = await get(d);
      resolving.delete(name);
      let resolveValue!: (v: unknown) => void;
      let rejectValue!: (e: unknown) => void;
      let used = false;
      const valueP = new Promise<unknown>((res, rej) => {
        resolveValue = res;
        rejectValue = rej;
      });
      let resume!: () => void;
      const gate = new Promise<void>((r) => (resume = r));
      const use = async (v: unknown) => {
        used = true;
        resolveValue(v);
        await gate;
      };
      const run = Promise.resolve()
        .then(() => def.fn!(deps, use))
        .then(() => {
          if (!used) rejectValue(new LabError(`Fixture "${name}" finished without calling use(). Call "await use(value)" to hand the value to the test.`));
        })
        .catch((e) => {
          if (!used) rejectValue(e);
          else throw e;
        });
      const value = await valueP;
      built.set(name, value);
      teardowns.push(async () => {
        resume();
        await run;
      });
      return value;
    };
    const names = wanted ?? [...Object.keys(BASE_FIXTURES), ...Object.keys(defs)];
    const out: Record<string, unknown> = {};
    for (const n of names) out[n] = await get(n);
    return out;
  }

  const wantedFor = (fns: AnyFn[]): string[] | null => {
    const all = new Set<string>();
    for (const f of fns) {
      const p = paramNames(f);
      if (p === null) return null;
      p.forEach((n) => all.add(n));
    }
    return Array.from(all);
  };

  // ----- run -----
  let ok = true;
  let error: string | undefined;
  try {
    const specs = Object.keys(files)
      .filter((f) => SPEC_RE.test(f) && !CONFIG_RE.test(f))
      .sort();
    const runnable = specs.length ? specs : Object.keys(files).length === 1 ? Object.keys(files) : [];
    if (!runnable.length) throw new LabError("No test files found. Name your test files *.spec.ts (for example tests/login.spec.ts).");

    await o.beforeEachTest();
    for (const f of runnable) await loadSpec(f);

    const only = tests.filter((t) => t.only);
    const toRun = only.length ? only : tests;
    if (!toRun.length) o.onLog({ kind: "info", text: "No test() blocks were registered." });
    let first = true;
    for (const t of toRun) {
      if (t.skip) {
        o.onLog({ kind: "info", text: `skipped: ${t.name}` });
        continue;
      }
      if (!first) await o.beforeEachTest();
      first = false;
      o.onLog({ kind: "test", text: t.name });
      currentTitle = t.name;
      const teardowns: (() => Promise<void>)[] = [];
      const before = beforeEach.filter((h) => t.name.startsWith(h.prefix));
      const after = afterEach.filter((h) => t.name.startsWith(h.prefix)).reverse();
      const defs = { ...t.defs };
      for (const h of [...before, ...after]) Object.assign(defs, h.defs, t.defs);
      try {
        const wanted = wantedFor([t.fn as AnyFn, ...before.map((h) => h.fn as AnyFn), ...after.map((h) => h.fn as AnyFn)]);
        const fx = await buildFixtures(defs, wanted, teardowns);
        for (const b of before) await b.fn(fx);
        await t.fn(fx);
        for (const a of after) await a.fn(fx);
        results.push({ name: t.name, ok: true });
      } catch (e) {
        if (e instanceof AbortedError) throw e;
        if (e instanceof SkipSignal) {
          o.onLog({ kind: "info", text: `skipped: ${t.name}${e.message ? ` (${e.message})` : ""}` });
          continue;
        }
        const msg = errMsg(e);
        if (!(e instanceof LabError && e.logged)) o.onLog({ kind: "error", text: msg });
        results.push({ name: t.name, ok: false, error: msg });
        ok = false;
        error = error || msg;
      } finally {
        for (const td of teardowns.reverse()) {
          try {
            await td();
          } catch (e) {
            if (e instanceof AbortedError) throw e;
            const msg = `fixture teardown failed: ${errMsg(e)}`;
            if (!(e instanceof LabError && e.logged)) o.onLog({ kind: "error", text: msg });
            ok = false;
            error = error || msg;
          }
        }
      }
    }
  } catch (e) {
    ok = false;
    error = errMsg(e);
    if (!(e instanceof LabError && e.logged)) o.onLog({ kind: "error", text: error });
  } finally {
    rt.highlight(null);
  }
  return { ok, error, assertions: rt.stats, tests: results, durationMs: Date.now() - started };
}

/** Runs a single test file. */
export function runCode(code: string, o: ProjectRunOptions): Promise<RunResult> {
  return runProject({ "tests/example.spec.ts": code }, o);
}

function errMsg(e: unknown) {
  if (e instanceof Error) return e.name === "Error" || e.name === "Aborted" ? e.message : `${e.name}: ${e.message}`;
  return String(e);
}
function safeJson(x: unknown) {
  try {
    return JSON.stringify(x);
  } catch {
    return String(x);
  }
}
