/**
 * SwagShop API: a Saucedemo-style store with accounts, catalogue, cart with quantities, coupons,
 * checkout and order history. Session state lives in a signed cookie (see session.ts).
 */
import { type AppApi, bad, bearer, conflict, money2, notFound, nowIso, num, paginate, require as need, route, str, unauthorized, ApiError } from "./http";
import { createHmac } from "node:crypto";

export interface Product {
  id: number;
  sku: string;
  name: string;
  price: number;
  category: string;
  icon: string;
  desc: string;
  stock: number;
  rating: number;
}

export const PRODUCTS: Product[] = [
  { id: 0, sku: "SWG-BAG-001", name: "Trail Runner Backpack", price: 29.99, category: "Bags", icon: "🎒", desc: "Water-resistant 20L pack with a padded laptop sleeve.", stock: 25, rating: 4.6 },
  { id: 1, sku: "SWG-ACC-002", name: "Night Ride Bike Light", price: 9.99, category: "Accessories", icon: "🔦", desc: "USB rechargeable, three modes, clips onto any handlebar.", stock: 120, rating: 4.3 },
  { id: 2, sku: "SWG-APP-003", name: "Classic Cotton Tee", price: 15.99, category: "Apparel", icon: "👕", desc: "Soft ring-spun cotton with a small embroidered logo.", stock: 60, rating: 4.4 },
  { id: 3, sku: "SWG-APP-004", name: "Fleece Zip Jacket", price: 49.99, category: "Apparel", icon: "🧥", desc: "Mid-weight fleece for cold mornings and late commits.", stock: 18, rating: 4.7 },
  { id: 4, sku: "SWG-APP-005", name: "Baby Romper", price: 7.99, category: "Apparel", icon: "🍼", desc: "Snap buttons, breathable fabric, tested by tiny QA engineers.", stock: 40, rating: 4.1 },
  { id: 5, sku: "SWG-APP-006", name: "Red Test Hoodie", price: 15.99, category: "Apparel", icon: "🟥", desc: "A bold hoodie for engineers who like their builds green.", stock: 33, rating: 4.2 },
  { id: 6, sku: "SWG-ACC-007", name: "Mechanical Keycap Set", price: 24.5, category: "Accessories", icon: "⌨️", desc: "Double-shot PBT keycaps, 104 keys, cherry profile.", stock: 15, rating: 4.5 },
  { id: 7, sku: "SWG-ACC-008", name: "Insulated Steel Bottle", price: 18.0, category: "Accessories", icon: "🧴", desc: "750 ml, keeps coffee hot through the longest regression run.", stock: 50, rating: 4.4 },
  { id: 8, sku: "SWG-BAG-009", name: "Laptop Sleeve 14\"", price: 21.99, category: "Bags", icon: "💼", desc: "Neoprene sleeve with a zip pocket for chargers.", stock: 22, rating: 4.0 },
  { id: 9, sku: "SWG-ACC-010", name: "Sticker Pack", price: 4.99, category: "Accessories", icon: "🏷️", desc: "Twelve vinyl stickers: green ticks, red crosses and one flaky test.", stock: 500, rating: 4.8 },
  { id: 10, sku: "SWG-APP-011", name: "Rain Shell Jacket", price: 64.99, category: "Apparel", icon: "🌧️", desc: "Packable waterproof shell with taped seams.", stock: 0, rating: 4.3 },
  { id: 11, sku: "SWG-HOM-012", name: "Desk Plant (Fake)", price: 12.49, category: "Home", icon: "🪴", desc: "Never needs water. Never fails a build.", stock: 70, rating: 3.9 },
];

const PASSWORD = "secret_sauce";
export const USERS: Record<string, { displayName: string; locked?: boolean; slow?: boolean; problem?: boolean; email: string }> = {
  standard_user: { displayName: "Standard User", email: "standard@swagshop.test" },
  locked_out_user: { displayName: "Locked Out User", locked: true, email: "locked@swagshop.test" },
  problem_user: { displayName: "Problem User", problem: true, email: "problem@swagshop.test" },
  performance_glitch_user: { displayName: "Glitchy User", slow: true, email: "glitch@swagshop.test" },
};
const COUPONS: Record<string, { pct?: number; flat?: number; min?: number; label: string }> = {
  SAVE10: { pct: 10, label: "10% off the item total" },
  WELCOME5: { flat: 5, min: 20, label: "$5 off orders over $20" },
};
const TAX_RATE = 0.08;

interface CartLine {
  id: number;
  qty: number;
}
interface Info {
  firstName: string;
  lastName: string;
  postalCode: string;
}
interface Order {
  id: string;
  placedAt: string;
  user: string;
  items: { id: number; name: string; price: number; qty: number }[];
  info: Info;
  subtotal: number;
  discount: number;
  coupon: string | null;
  tax: number;
  total: number;
  status: "placed" | "cancelled";
  payment: string;
}
export interface SwagState {
  user: string | null;
  cart: CartLine[];
  info: Info | null;
  coupon: string | null;
  orders: Order[];
  seq: number;
}
const initial = (): SwagState => ({ user: null, cart: [], info: null, coupon: null, orders: [], seq: 1000 });

const tokenFor = (user: string) => `swg.${user}.${createHmac("sha256", process.env.ACCESS_TOKEN_SECRET || "sandbox-dev-secret-change-me").update(`swg:${user}`).digest("base64url").slice(0, 16)}`;
const userFromToken = (t: string) => {
  const m = /^swg\.([a-z_]+)\.(.+)$/.exec(t);
  return m && USERS[m[1]] && tokenFor(m[1]) === t ? m[1] : null;
};

const product = (id: number) => PRODUCTS.find((p) => p.id === id);
const publicUser = (u: string) => ({ username: u, displayName: USERS[u].displayName, email: USERS[u].email, slow: !!USERS[u].slow, problem: !!USERS[u].problem });

function currentUser(c: { state: SwagState; headers: Headers }): string {
  const t = bearer(c.headers);
  if (t) {
    const u = userFromToken(t);
    if (!u) throw unauthorized("Invalid bearer token");
    return u;
  }
  if (!c.state.user) throw unauthorized("Log in first: POST /auth/login");
  return c.state.user;
}

export function cartView(s: SwagState) {
  const items = s.cart
    .map((l) => {
      const p = product(l.id)!;
      return { productId: p.id, sku: p.sku, name: p.name, price: p.price, qty: l.qty, lineTotal: money2(p.price * l.qty) };
    })
    .filter((x) => x.name);
  const subtotal = money2(items.reduce((a, x) => a + x.lineTotal, 0));
  let discount = 0;
  if (s.coupon && COUPONS[s.coupon]) {
    const cp = COUPONS[s.coupon];
    discount = cp.pct ? money2((subtotal * cp.pct) / 100) : Math.min(subtotal, cp.flat ?? 0);
  }
  const tax = money2((subtotal - discount) * TAX_RATE);
  const total = money2(subtotal - discount + tax);
  return { items, count: items.reduce((a, x) => a + x.qty, 0), subtotal, coupon: s.coupon, discount, tax, total };
}

export const CATEGORIES = Array.from(new Set(PRODUCTS.map((p) => p.category))).sort();

export function listProducts(q: { q?: string; category?: string; sort?: string; problem?: boolean }) {
  let list = PRODUCTS.slice();
  if (q.q) {
    const words = q.q.toLowerCase().split(/\s+/).filter(Boolean);
    list = list.filter((p) => words.every((w) => `${p.name} ${p.desc} ${p.category} ${p.sku}`.toLowerCase().includes(w)));
  }
  if (q.category) list = list.filter((p) => p.category.toLowerCase() === q.category!.toLowerCase());
  const sort = q.sort || "az";
  if (!q.problem) {
    if (sort === "az") list.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "za") list.sort((a, b) => b.name.localeCompare(a.name));
    if (sort === "lohi") list.sort((a, b) => a.price - b.price || a.name.localeCompare(b.name));
    if (sort === "hilo") list.sort((a, b) => b.price - a.price || a.name.localeCompare(b.name));
  }
  return list;
}

export const swagshopApi: AppApi<SwagState> = {
  id: "swagshop",
  initial,
  routes: [
    route("GET", "/", () => ({
      name: "SwagShop API",
      version: "1.0",
      auth: "POST /auth/login sets a session cookie and returns a bearer token; either works.",
      endpoints: [
        "POST /auth/login {username, password}",
        "POST /auth/logout",
        "GET /me",
        "GET /products?q=&category=&sort=az|za|lohi|hilo&page=&limit=",
        "GET /products/:id",
        "GET /categories",
        "GET /cart",
        "POST /cart/items {productId, qty?}",
        "PATCH /cart/items/:productId {qty}",
        "DELETE /cart/items/:productId",
        "DELETE /cart",
        "POST /cart/coupon {code}",
        "DELETE /cart/coupon",
        "PUT /checkout/info {firstName, lastName, postalCode}",
        "GET /checkout/summary",
        "POST /orders {payment?}",
        "GET /orders",
        "GET /orders/:id",
        "POST /orders/:id/cancel",
        "POST /reset",
      ],
    })),
    route("POST", "/auth/login", (c) => {
      const { username, password } = need(c.body, ["username", "password"]);
      const u = USERS[username];
      if (!u || password !== PASSWORD) throw new ApiError(401, "invalid_credentials", "Username and password do not match any user in this service");
      if (u.locked) throw new ApiError(423, "locked", "Sorry, this user has been locked out.");
      c.state.user = username;
      c.touch();
      return { user: publicUser(username), token: tokenFor(username) };
    }),
    route("POST", "/auth/logout", (c) => {
      c.state.user = null;
      c.state.cart = [];
      c.state.info = null;
      c.state.coupon = null;
      c.touch();
      return { ok: true };
    }),
    route("GET", "/me", (c) => {
      const u = currentUser(c);
      return { user: publicUser(u), orders: c.state.orders.filter((o) => o.user === u).length };
    }),
    route("GET", "/categories", () => ({ items: CATEGORIES.map((name) => ({ name, count: PRODUCTS.filter((p) => p.category === name).length })) })),
    route("GET", "/products", (c) => {
      const problem = c.state.user === "problem_user";
      const sort = c.query.get("sort") || "az";
      if (!["az", "za", "lohi", "hilo"].includes(sort)) throw bad("sort must be one of az, za, lohi, hilo");
      const list = listProducts({ q: c.query.get("q") || "", category: c.query.get("category") || "", sort, problem });
      return { ...paginate(list, c.query, 12), sort, categories: CATEGORIES };
    }),
    route("GET", "/products/:id", (c, p) => {
      const prod = product(num(p.id));
      if (!prod) throw notFound(`Product ${p.id}`);
      return { ...prod, inStock: prod.stock > 0 };
    }),
    route("GET", "/cart", (c) => {
      currentUser(c);
      return cartView(c.state);
    }),
    route("POST", "/cart/items", (c) => {
      currentUser(c);
      const id = num(c.body.productId);
      if (Number.isNaN(id)) throw bad("'productId' (number) is required");
      const prod = product(id);
      if (!prod) throw notFound(`Product ${id}`);
      const qty = c.body.qty === undefined ? 1 : num(c.body.qty);
      if (!Number.isInteger(qty) || qty < 1 || qty > 5) throw bad("'qty' must be an integer between 1 and 5");
      if (prod.stock <= 0) throw conflict(`${prod.name} is out of stock`);
      const line = c.state.cart.find((l) => l.id === id);
      if (line) line.qty = Math.min(5, line.qty + qty);
      else c.state.cart.push({ id, qty });
      c.touch();
      c.status = 201;
      return cartView(c.state);
    }),
    route("PATCH", "/cart/items/:productId", (c, p) => {
      currentUser(c);
      const id = num(p.productId);
      const line = c.state.cart.find((l) => l.id === id);
      if (!line) throw notFound(`Cart item ${p.productId}`);
      const qty = num(c.body.qty);
      if (!Number.isInteger(qty) || qty < 0 || qty > 5) throw bad("'qty' must be an integer between 0 and 5 (0 removes the item)");
      if (qty === 0) c.state.cart = c.state.cart.filter((l) => l.id !== id);
      else line.qty = qty;
      c.touch();
      return cartView(c.state);
    }),
    route("DELETE", "/cart/items/:productId", (c, p) => {
      currentUser(c);
      const id = num(p.productId);
      if (!c.state.cart.some((l) => l.id === id)) throw notFound(`Cart item ${p.productId}`);
      c.state.cart = c.state.cart.filter((l) => l.id !== id);
      if (!c.state.cart.length) c.state.coupon = null;
      c.touch();
      return cartView(c.state);
    }),
    route("DELETE", "/cart", (c) => {
      currentUser(c);
      c.state.cart = [];
      c.state.coupon = null;
      c.touch();
      return cartView(c.state);
    }),
    route("POST", "/cart/coupon", (c) => {
      currentUser(c);
      const code = str(c.body.code).toUpperCase();
      const cp = COUPONS[code];
      if (!cp) throw new ApiError(400, "invalid_coupon", `Coupon ${code || "(empty)"} is not valid`);
      const view = cartView({ ...c.state, coupon: null });
      if (!view.items.length) throw bad("Add items to the cart before applying a coupon");
      if (cp.min && view.subtotal < cp.min) throw new ApiError(400, "coupon_minimum", `${code} needs an item total of at least $${cp.min.toFixed(2)}`);
      c.state.coupon = code;
      c.touch();
      return { ...cartView(c.state), couponLabel: cp.label };
    }),
    route("DELETE", "/cart/coupon", (c) => {
      currentUser(c);
      c.state.coupon = null;
      c.touch();
      return cartView(c.state);
    }),
    route("PUT", "/checkout/info", (c) => {
      currentUser(c);
      const body = { ...c.body };
      if (body.first) body.firstName = body.first;
      if (body.last) body.lastName = body.last;
      if (body.zip) body.postalCode = body.zip;
      const missing = (["firstName", "lastName", "postalCode"] as const).find((f) => !str(body[f]));
      if (missing) throw bad(`Error: ${missing === "firstName" ? "First Name" : missing === "lastName" ? "Last Name" : "Postal Code"} is required`, { field: missing });
      c.state.info = { firstName: str(body.firstName), lastName: str(body.lastName), postalCode: str(body.postalCode) };
      c.touch();
      return { info: c.state.info };
    }),
    route("GET", "/checkout/summary", (c) => {
      currentUser(c);
      return { ...cartView(c.state), info: c.state.info };
    }),
    route("POST", "/orders", (c) => {
      const u = currentUser(c);
      const view = cartView(c.state);
      if (!view.items.length) throw bad("Your cart is empty");
      const info = c.state.info ?? (str(c.body.firstName) ? { firstName: str(c.body.firstName), lastName: str(c.body.lastName), postalCode: str(c.body.postalCode) } : null);
      if (!info || !info.firstName || !info.lastName || !info.postalCode) throw bad("Checkout information is missing: PUT /checkout/info first");
      const payment = str(c.body.payment) || "card";
      if (!["card", "upi", "cod"].includes(payment)) throw bad("payment must be card, upi or cod");
      const id = `SWG-${++c.state.seq}`;
      const order: Order = { id, placedAt: nowIso(), user: u, items: view.items.map((i) => ({ id: i.productId, name: i.name, price: i.price, qty: i.qty })), info, subtotal: view.subtotal, discount: view.discount, coupon: view.coupon, tax: view.tax, total: view.total, status: "placed", payment };
      c.state.orders.unshift(order);
      c.state.orders = c.state.orders.slice(0, 12);
      c.state.cart = [];
      c.state.coupon = null;
      c.state.info = null;
      c.touch();
      c.status = 201;
      return { order };
    }),
    route("GET", "/orders", (c) => {
      const u = currentUser(c);
      return { items: c.state.orders.filter((o) => o.user === u) };
    }),
    route("GET", "/orders/:id", (c, p) => {
      const u = currentUser(c);
      const o = c.state.orders.find((x) => x.id === p.id && x.user === u);
      if (!o) throw notFound(`Order ${p.id}`);
      return { order: o };
    }),
    route("POST", "/orders/:id/cancel", (c, p) => {
      const u = currentUser(c);
      const o = c.state.orders.find((x) => x.id === p.id && x.user === u);
      if (!o) throw notFound(`Order ${p.id}`);
      if (o.status === "cancelled") throw conflict(`Order ${p.id} is already cancelled`);
      o.status = "cancelled";
      c.touch();
      return { order: o };
    }),
    route("POST", "/reset", (c) => {
      c.replace(initial());
      return { ok: true };
    }),
  ],
};
