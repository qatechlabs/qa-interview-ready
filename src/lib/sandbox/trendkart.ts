/**
 * TrendKart API: a Myntra-style fashion marketplace with guest and account shopping, a filterable
 * catalogue with sizes and stock, bag with quantities, wishlist, coupons, addresses and orders.
 */
import { type AppApi, ApiError, bad, bearer, conflict, notFound, nowIso, num, paginate, require as need, route, str, unauthorized } from "./http";
import { createHmac } from "node:crypto";

export interface TkProduct {
  id: number;
  brand: string;
  name: string;
  cat: "men" | "women";
  type: string;
  mrp: number;
  price: number;
  rating: number;
  ratings: number;
  icon: string;
  color: string;
  sizes: string[];
  oos: string[];
  desc: string;
}
const SZ = ["S", "M", "L", "XL"];
const SHOE = ["6", "7", "8", "9", "10"];
export const PRODUCTS: TkProduct[] = [
  { id: 101, brand: "Roadway", name: "Men Slim Fit Casual Shirt", cat: "men", type: "shirt", mrp: 1499, price: 749, rating: 4.2, ratings: 1284, icon: "👔", color: "Blue", sizes: SZ, oos: ["XL"], desc: "Slim-fit casual shirt in breathable cotton with a button-down collar." },
  { id: 102, brand: "Urbanline", name: "Men Checked Cotton Shirt", cat: "men", type: "shirt", mrp: 1999, price: 1199, rating: 4.4, ratings: 862, icon: "👔", color: "Green", sizes: SZ, oos: [], desc: "Checked cotton shirt, regular fit, with a curved hem." },
  { id: 103, brand: "Nordic Thread", name: "Men Linen Formal Shirt", cat: "men", type: "shirt", mrp: 2599, price: 1819, rating: 4.1, ratings: 311, icon: "👔", color: "White", sizes: SZ, oos: ["S"], desc: "Pure linen formal shirt with mother-of-pearl buttons." },
  { id: 104, brand: "Roadway", name: "Men Printed Round Neck T-shirt", cat: "men", type: "tshirt", mrp: 799, price: 399, rating: 3.9, ratings: 4120, icon: "👕", color: "Black", sizes: SZ, oos: [], desc: "Graphic print tee in 100% cotton, regular fit." },
  { id: 105, brand: "Urbanline", name: "Men Slim Fit Jeans", cat: "men", type: "jeans", mrp: 2499, price: 1374, rating: 4.3, ratings: 2210, icon: "👖", color: "Indigo", sizes: ["28", "30", "32", "34", "36"], oos: ["30"], desc: "Mid-rise slim-fit stretch jeans, light fade." },
  { id: 106, brand: "Kalakari", name: "Women Floral Print Kurta", cat: "women", type: "kurta", mrp: 1899, price: 949, rating: 4.5, ratings: 980, icon: "👗", color: "Pink", sizes: SZ, oos: [], desc: "Straight kurta with floral block print and three-quarter sleeves." },
  { id: 107, brand: "Nordic Thread", name: "Women Oversized Shirt", cat: "women", type: "shirt", mrp: 1599, price: 959, rating: 4.0, ratings: 455, icon: "👚", color: "White", sizes: SZ, oos: ["L"], desc: "Oversized poplin shirt with drop shoulders." },
  { id: 108, brand: "Kalakari", name: "Women Cotton Straight Kurta", cat: "women", type: "kurta", mrp: 1299, price: 779, rating: 4.2, ratings: 1530, icon: "👗", color: "Yellow", sizes: SZ, oos: [], desc: "Solid cotton kurta with side slits and a mandarin collar." },
  { id: 109, brand: "Urbanline", name: "Women High-Rise Jeans", cat: "women", type: "jeans", mrp: 2299, price: 1379, rating: 4.1, ratings: 1710, icon: "👖", color: "Blue", sizes: ["26", "28", "30", "32"], oos: [], desc: "High-rise skinny jeans with stretch denim." },
  { id: 110, brand: "Roadway", name: "Women Striped Shirt", cat: "women", type: "shirt", mrp: 1199, price: 599, rating: 3.8, ratings: 640, icon: "👚", color: "Navy", sizes: SZ, oos: [], desc: "Striped relaxed-fit shirt with a single chest pocket." },
  { id: 111, brand: "Stride", name: "Men Running Shoes", cat: "men", type: "shoes", mrp: 3999, price: 1999, rating: 4.6, ratings: 5320, icon: "👟", color: "Grey", sizes: SHOE, oos: [], desc: "Lightweight mesh runners with a cushioned midsole." },
  { id: 112, brand: "Stride", name: "Women Training Shoes", cat: "women", type: "shoes", mrp: 3499, price: 2449, rating: 4.3, ratings: 1890, icon: "👟", color: "Coral", sizes: SHOE, oos: ["6"], desc: "Stable training shoe with a flat sole and breathable upper." },
  { id: 113, brand: "Roadway", name: "Men Hooded Sweatshirt", cat: "men", type: "sweatshirt", mrp: 1799, price: 1079, rating: 4.4, ratings: 2040, icon: "🧥", color: "Maroon", sizes: SZ, oos: [], desc: "Fleece-lined hoodie with a kangaroo pocket." },
  { id: 114, brand: "Urbanline", name: "Men Chino Trousers", cat: "men", type: "trousers", mrp: 2199, price: 1319, rating: 4.2, ratings: 770, icon: "👖", color: "Beige", sizes: ["30", "32", "34", "36"], oos: ["36"], desc: "Slim chinos in stretch cotton twill." },
  { id: 115, brand: "Nordic Thread", name: "Men Polo T-shirt", cat: "men", type: "tshirt", mrp: 1299, price: 779, rating: 4.3, ratings: 1620, icon: "👕", color: "Olive", sizes: SZ, oos: [], desc: "Pique polo with ribbed collar and cuffs." },
  { id: 116, brand: "Stride", name: "Men Sports Sandals", cat: "men", type: "shoes", mrp: 1999, price: 999, rating: 4.0, ratings: 410, icon: "🩴", color: "Black", sizes: SHOE, oos: [], desc: "Quick-dry sandals with adjustable straps." },
  { id: 117, brand: "Kalakari", name: "Women Anarkali Kurta Set", cat: "women", type: "kurta", mrp: 3499, price: 1749, rating: 4.6, ratings: 2290, icon: "👗", color: "Teal", sizes: SZ, oos: ["XL"], desc: "Flared anarkali kurta with dupatta and palazzos." },
  { id: 118, brand: "Urbanline", name: "Women Denim Jacket", cat: "women", type: "jacket", mrp: 2999, price: 1799, rating: 4.4, ratings: 980, icon: "🧥", color: "Blue", sizes: SZ, oos: [], desc: "Classic cropped denim jacket, medium wash." },
  { id: 119, brand: "Nordic Thread", name: "Women Linen Wide-Leg Trousers", cat: "women", type: "trousers", mrp: 2199, price: 1539, rating: 4.1, ratings: 360, icon: "👖", color: "Sand", sizes: SZ, oos: [], desc: "Breezy wide-leg trousers in linen blend." },
  { id: 120, brand: "Roadway", name: "Women Graphic T-shirt", cat: "women", type: "tshirt", mrp: 699, price: 349, rating: 3.9, ratings: 3100, icon: "👕", color: "White", sizes: SZ, oos: ["S"], desc: "Boxy-fit tee with a front graphic." },
  { id: 121, brand: "Stride", name: "Women Walking Shoes", cat: "women", type: "shoes", mrp: 2999, price: 1499, rating: 4.2, ratings: 1210, icon: "👟", color: "Lavender", sizes: SHOE, oos: [], desc: "Everyday walkers with memory-foam insole." },
  { id: 122, brand: "Velour", name: "Women Satin Slip Dress", cat: "women", type: "dress", mrp: 2799, price: 1399, rating: 4.3, ratings: 540, icon: "👗", color: "Emerald", sizes: SZ, oos: [], desc: "Bias-cut satin slip dress, midi length." },
  { id: 123, brand: "Velour", name: "Women Wrap Dress", cat: "women", type: "dress", mrp: 2499, price: 1749, rating: 4.5, ratings: 820, icon: "👗", color: "Red", sizes: SZ, oos: ["M"], desc: "Printed wrap dress with flutter sleeves." },
  { id: 124, brand: "Velour", name: "Men Bomber Jacket", cat: "men", type: "jacket", mrp: 3999, price: 2399, rating: 4.4, ratings: 450, icon: "🧥", color: "Black", sizes: SZ, oos: [], desc: "Quilted bomber with ribbed trims." },
];
export const SIZES = SZ;
export const COUPONS: Record<string, { pct?: number; flat?: number; min: number; label: string }> = {
  TRENDY10: { pct: 10, min: 0, label: "10% off" },
  FLAT300: { flat: 300, min: 1499, label: "₹300 off on orders above ₹1,499" },
  NEWUSER: { pct: 15, min: 999, label: "15% off for members on orders above ₹999" },
};
export const PRICE_BANDS: [string, string, number, number][] = [["0-999", "₹0 to ₹999", 0, 999], ["1000-1999", "₹1000 to ₹1999", 1000, 1999], ["2000-4999", "₹2000 to ₹4999", 2000, 4999]];
const FREE_DELIVERY_ABOVE = 999;
const DELIVERY_FEE = 99;

const ACCOUNTS: Record<string, { name: string; password: string; phone: string }> = {
  "arya@trendkart.test": { name: "Arya Sen", password: "Trendy@123", phone: "9876543210" },
  "dev@trendkart.test": { name: "Dev Kapoor", password: "Trendy@123", phone: "9876501234" },
};

export interface BagLine {
  lineId: number;
  id: number;
  size: string;
  qty: number;
}
export interface Address {
  id: number;
  name: string;
  phone: string;
  line1: string;
  city: string;
  state: string;
  pincode: string;
  type: "home" | "office";
  default: boolean;
}
export interface TkOrder {
  id: string;
  placedAt: string;
  user: string | null;
  items: { id: number; brand: string; name: string; size: string; qty: number; price: number }[];
  address: Omit<Address, "id" | "default"> | null;
  payment: string;
  totals: Totals;
  status: "confirmed" | "cancelled";
}
export interface Totals {
  mrp: number;
  discount: number;
  coupon: number;
  delivery: number;
  total: number;
  count: number;
}
export interface TkState {
  user: string | null;
  registered: Record<string, { name: string; password: string; phone: string }>;
  bag: BagLine[];
  wishlist: number[];
  coupon: string | null;
  addresses: Address[];
  orders: TkOrder[];
  seq: number;
}
const initial = (): TkState => ({ user: null, registered: {}, bag: [], wishlist: [], coupon: null, addresses: [], orders: [], seq: 1 });

const byId = (id: number) => PRODUCTS.find((p) => p.id === id);
export const off = (p: TkProduct) => Math.round((1 - p.price / p.mrp) * 100);
const accounts = (s: TkState) => ({ ...ACCOUNTS, ...s.registered });
const tokenFor = (email: string) => `tk.${Buffer.from(email).toString("base64url")}.${createHmac("sha256", process.env.ACCESS_TOKEN_SECRET || "sandbox-dev-secret-change-me").update(`tk:${email}`).digest("base64url").slice(0, 16)}`;

function userOf(c: { state: TkState; headers: Headers }): string | null {
  const t = bearer(c.headers);
  if (t) {
    const m = /^tk\.([A-Za-z0-9_-]+)\.(.+)$/.exec(t);
    const email = m ? Buffer.from(m[1], "base64url").toString() : "";
    if (!m || tokenFor(email) !== t || !accounts(c.state)[email]) throw unauthorized("Invalid bearer token");
    return email;
  }
  return c.state.user;
}
const mustUser = (c: { state: TkState; headers: Headers }) => {
  const u = userOf(c);
  if (!u) throw unauthorized("Log in first: POST /auth/login");
  return u;
};
const publicUser = (s: TkState, email: string) => ({ email, name: accounts(s)[email].name, phone: accounts(s)[email].phone });

export function totals(s: TkState): Totals {
  let mrp = 0;
  let price = 0;
  for (const it of s.bag) {
    const p = byId(it.id);
    if (!p) continue;
    mrp += p.mrp * it.qty;
    price += p.price * it.qty;
  }
  let coupon = 0;
  const cp = s.coupon ? COUPONS[s.coupon] : null;
  if (cp) coupon = cp.pct ? Math.round((price * cp.pct) / 100) : Math.min(price, cp.flat ?? 0);
  const delivery = s.bag.length && price - coupon < FREE_DELIVERY_ABOVE ? DELIVERY_FEE : 0;
  return { mrp, discount: mrp - price, coupon, delivery, total: price - coupon + delivery, count: s.bag.reduce((a, x) => a + x.qty, 0) };
}
export function bagView(s: TkState) {
  const items = s.bag
    .map((l) => {
      const p = byId(l.id)!;
      return p && { lineId: l.lineId, productId: p.id, brand: p.brand, name: p.name, icon: p.icon, size: l.size, qty: l.qty, price: p.price, mrp: p.mrp, lineTotal: p.price * l.qty };
    })
    .filter(Boolean);
  return { items, coupon: s.coupon, couponLabel: s.coupon ? COUPONS[s.coupon]?.label : null, totals: totals(s) };
}

export function matches(p: TkProduct, q: { q?: string; brand?: string; price?: string; gender?: string; type?: string; size?: string }) {
  const words = (q.q || "").toLowerCase().split(/\s+/).filter(Boolean);
  const hay = `${p.brand} ${p.name} ${p.cat} ${p.type} ${p.color}`.toLowerCase().replace(/t-shirt/g, "tshirt");
  const ok = words.every((w0) => {
    const w = w0.replace(/s$/, "").replace(/t-shirt/, "tshirt");
    if (w === "men") return p.cat === "men";
    if (w === "women") return p.cat === "women";
    return hay.split(/[^a-z0-9]+/).some((h) => h === w || h.startsWith(w));
  });
  if (!ok) return false;
  if (q.brand && !q.brand.split(",").includes(p.brand)) return false;
  if (q.price) {
    const band = PRICE_BANDS.find((b) => b[0] === q.price);
    if (band && (p.price < band[2] || p.price > band[3])) return false;
  }
  if (q.gender && p.cat !== q.gender) return false;
  if (q.type && p.type !== q.type) return false;
  if (q.size && (!p.sizes.includes(q.size) || p.oos.includes(q.size))) return false;
  return true;
}
export function sortList(list: TkProduct[], sort: string) {
  const l = list.slice();
  if (sort === "price_asc") l.sort((a, b) => a.price - b.price);
  if (sort === "price_desc") l.sort((a, b) => b.price - a.price);
  if (sort === "rating") l.sort((a, b) => b.rating - a.rating);
  if (sort === "discount") l.sort((a, b) => off(b) - off(a));
  if (sort === "popular") l.sort((a, b) => b.ratings - a.ratings);
  return l;
}
const publicProduct = (p: TkProduct) => ({ ...p, discount: off(p), inStockSizes: p.sizes.filter((s) => !p.oos.includes(s)) });

export const trendkartApi: AppApi<TkState> = {
  id: "trendkart",
  initial,
  routes: [
    route("GET", "/", () => ({
      name: "TrendKart API",
      version: "1.0",
      auth: "Guests can browse and shop. POST /auth/login (arya@trendkart.test / Trendy@123) or /auth/register for orders history, addresses and member coupons.",
      endpoints: [
        "POST /auth/login {email, password}",
        "POST /auth/register {name, email, password, phone?}",
        "POST /auth/logout",
        "GET /me",
        "GET /products?q=&brand=&price=0-999|1000-1999|2000-4999&gender=men|women&type=&size=&sort=recommended|price_asc|price_desc|rating|discount|popular&page=&limit=",
        "GET /products/:id",
        "GET /bag",
        "POST /bag/items {productId, size, qty?}",
        "PATCH /bag/items/:lineId {qty?, size?}",
        "DELETE /bag/items/:lineId",
        "POST /bag/coupon {code}",
        "DELETE /bag/coupon",
        "GET /wishlist",
        "POST /wishlist {productId}",
        "DELETE /wishlist/:productId",
        "POST /wishlist/:productId/move-to-bag {size}",
        "GET /addresses",
        "POST /addresses {name, phone, line1, city, state, pincode, type?}",
        "DELETE /addresses/:id",
        "POST /orders {addressId? | address{...}, payment: upi|card|cod}",
        "GET /orders",
        "GET /orders/:id",
        "POST /orders/:id/cancel",
        "POST /reset",
      ],
    })),
    route("POST", "/auth/register", (c) => {
      const { name, email, password } = need(c.body, ["name", "email", "password"]);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw bad("Enter a valid email", { field: "email" });
      if (password.length < 8 || !/[A-Z]/.test(password) || !/\d/.test(password)) throw bad("Password needs 8+ characters with an uppercase letter and a digit", { field: "password" });
      if (accounts(c.state)[email.toLowerCase()]) throw conflict("An account with this email already exists");
      const phone = str(c.body.phone);
      if (phone && !/^\d{10}$/.test(phone)) throw bad("Phone must be 10 digits", { field: "phone" });
      c.state.registered[email.toLowerCase()] = { name, password, phone };
      c.state.user = email.toLowerCase();
      c.touch();
      c.status = 201;
      return { user: publicUser(c.state, email.toLowerCase()), token: tokenFor(email.toLowerCase()) };
    }),
    route("POST", "/auth/login", (c) => {
      const { email, password } = need(c.body, ["email", "password"]);
      const acc = accounts(c.state)[email.toLowerCase()];
      if (!acc || acc.password !== password) throw new ApiError(401, "invalid_credentials", "Incorrect email or password");
      c.state.user = email.toLowerCase();
      c.touch();
      return { user: publicUser(c.state, email.toLowerCase()), token: tokenFor(email.toLowerCase()) };
    }),
    route("POST", "/auth/logout", (c) => {
      c.state.user = null;
      c.touch();
      return { ok: true };
    }),
    route("GET", "/me", (c) => {
      const u = mustUser(c);
      return { user: publicUser(c.state, u), orders: c.state.orders.filter((o) => o.user === u).length, addresses: c.state.addresses.length };
    }),
    route("GET", "/products", (c) => {
      const q = { q: c.query.get("q") || "", brand: c.query.get("brand") || "", price: c.query.get("price") || "", gender: c.query.get("gender") || "", type: c.query.get("type") || "", size: c.query.get("size") || "" };
      const sort = c.query.get("sort") || "recommended";
      if (!["recommended", "price_asc", "price_desc", "rating", "discount", "popular"].includes(sort)) throw bad("Unknown sort");
      const all = PRODUCTS.filter((p) => matches(p, { q: q.q }));
      const list = sortList(
        PRODUCTS.filter((p) => matches(p, q)),
        sort,
      );
      const brands = Array.from(new Set(all.map((p) => p.brand)))
        .sort()
        .map((name) => ({ name, count: all.filter((p) => p.brand === name).length }));
      const types = Array.from(new Set(all.map((p) => p.type))).sort();
      return { ...paginate(list.map(publicProduct), c.query, 24, 50), sort, query: q, facets: { brands, types, priceBands: PRICE_BANDS.map((b) => ({ id: b[0], label: b[1] })), genders: ["men", "women"] } };
    }),
    route("GET", "/products/:id", (c, p) => {
      const prod = byId(num(p.id));
      if (!prod) throw notFound(`Product ${p.id}`);
      const similar = PRODUCTS.filter((x) => x.id !== prod.id && x.type === prod.type).slice(0, 4).map((x) => ({ id: x.id, brand: x.brand, name: x.name, price: x.price }));
      return { product: publicProduct(prod), similar, wishlisted: c.state.wishlist.includes(prod.id) };
    }),
    route("GET", "/bag", (c) => bagView(c.state)),
    route("POST", "/bag/items", (c) => {
      const id = num(c.body.productId);
      const prod = byId(id);
      if (Number.isNaN(id)) throw bad("'productId' is required");
      if (!prod) throw notFound(`Product ${id}`);
      const size = str(c.body.size);
      if (!size) throw bad("Please select a size", { field: "size" });
      if (!prod.sizes.includes(size)) throw bad(`Size ${size} is not available for this product; sizes: ${prod.sizes.join(", ")}`, { field: "size" });
      if (prod.oos.includes(size)) throw conflict(`Size ${size} is out of stock`);
      const qty = c.body.qty === undefined ? 1 : num(c.body.qty);
      if (!Number.isInteger(qty) || qty < 1 || qty > 5) throw bad("'qty' must be 1 to 5");
      const ex = c.state.bag.find((x) => x.id === id && x.size === size);
      if (ex) ex.qty = Math.min(5, ex.qty + qty);
      else c.state.bag.push({ lineId: c.state.seq++, id, size, qty });
      c.touch();
      c.status = 201;
      return bagView(c.state);
    }),
    route("PATCH", "/bag/items/:lineId", (c, p) => {
      const line = c.state.bag.find((x) => String(x.lineId) === p.lineId);
      if (!line) throw notFound(`Bag item ${p.lineId}`);
      if (c.body.qty !== undefined) {
        const qty = num(c.body.qty);
        if (!Number.isInteger(qty) || qty < 1 || qty > 5) throw bad("'qty' must be 1 to 5");
        line.qty = qty;
      }
      if (c.body.size !== undefined) {
        const size = str(c.body.size);
        const prod = byId(line.id)!;
        if (!prod.sizes.includes(size)) throw bad(`Size ${size} is not available`);
        if (prod.oos.includes(size)) throw conflict(`Size ${size} is out of stock`);
        line.size = size;
      }
      c.touch();
      return bagView(c.state);
    }),
    route("DELETE", "/bag/items/:lineId", (c, p) => {
      if (!c.state.bag.some((x) => String(x.lineId) === p.lineId)) throw notFound(`Bag item ${p.lineId}`);
      c.state.bag = c.state.bag.filter((x) => String(x.lineId) !== p.lineId);
      if (!c.state.bag.length) c.state.coupon = null;
      c.touch();
      return bagView(c.state);
    }),
    route("POST", "/bag/coupon", (c) => {
      const code = str(c.body.code).toUpperCase();
      const cp = COUPONS[code];
      const t = totals({ ...c.state, coupon: null });
      const price = t.mrp - t.discount;
      if (!cp) {
        c.state.coupon = null;
        c.touch();
        throw new ApiError(400, "invalid_coupon", "Invalid coupon code");
      }
      if (code === "NEWUSER" && !userOf(c)) throw new ApiError(401, "members_only", "NEWUSER is for logged-in members");
      if (price < cp.min) {
        c.state.coupon = null;
        c.touch();
        throw new ApiError(400, "coupon_minimum", `Add items worth ₹${(cp.min - price).toLocaleString("en-IN")} more to use ${code}`);
      }
      c.state.coupon = code;
      c.touch();
      return { ...bagView(c.state), message: `Coupon ${code} applied` };
    }),
    route("DELETE", "/bag/coupon", (c) => {
      c.state.coupon = null;
      c.touch();
      return bagView(c.state);
    }),
    route("GET", "/wishlist", (c) => ({ items: c.state.wishlist.map((id) => byId(id)).filter(Boolean).map((p) => publicProduct(p!)) })),
    route("POST", "/wishlist", (c) => {
      const id = num(c.body.productId);
      if (!byId(id)) throw notFound(`Product ${c.body.productId}`);
      if (!c.state.wishlist.includes(id)) c.state.wishlist.push(id);
      c.touch();
      c.status = 201;
      return { items: c.state.wishlist };
    }),
    route("DELETE", "/wishlist/:productId", (c, p) => {
      const id = num(p.productId);
      if (!c.state.wishlist.includes(id)) throw notFound(`Wishlist item ${p.productId}`);
      c.state.wishlist = c.state.wishlist.filter((x) => x !== id);
      c.touch();
      return { items: c.state.wishlist };
    }),
    route("POST", "/wishlist/:productId/move-to-bag", (c, p) => {
      const id = num(p.productId);
      const prod = byId(id);
      if (!c.state.wishlist.includes(id) || !prod) throw notFound(`Wishlist item ${p.productId}`);
      const size = str(c.body.size);
      if (!prod.sizes.includes(size)) throw bad("Please select a valid size", { sizes: prod.sizes });
      if (prod.oos.includes(size)) throw conflict(`Size ${size} is out of stock`);
      c.state.wishlist = c.state.wishlist.filter((x) => x !== id);
      const ex = c.state.bag.find((x) => x.id === id && x.size === size);
      if (ex) ex.qty = Math.min(5, ex.qty + 1);
      else c.state.bag.push({ lineId: c.state.seq++, id, size, qty: 1 });
      c.touch();
      return bagView(c.state);
    }),
    route("GET", "/addresses", (c) => {
      mustUser(c);
      return { items: c.state.addresses };
    }),
    route("POST", "/addresses", (c) => {
      mustUser(c);
      const f = need(c.body, ["name", "phone", "line1", "city", "state", "pincode"]);
      if (!/^\d{10}$/.test(f.phone)) throw bad("Phone must be 10 digits", { field: "phone" });
      if (!/^\d{6}$/.test(f.pincode)) throw bad("Pincode must be 6 digits", { field: "pincode" });
      const type = str(c.body.type) === "office" ? "office" : "home";
      const a: Address = { id: c.state.seq++, name: f.name, phone: f.phone, line1: f.line1, city: f.city, state: f.state, pincode: f.pincode, type, default: !c.state.addresses.length };
      c.state.addresses.push(a);
      c.state.addresses = c.state.addresses.slice(-5);
      c.touch();
      c.status = 201;
      return { address: a };
    }),
    route("DELETE", "/addresses/:id", (c, p) => {
      mustUser(c);
      if (!c.state.addresses.some((a) => String(a.id) === p.id)) throw notFound(`Address ${p.id}`);
      c.state.addresses = c.state.addresses.filter((a) => String(a.id) !== p.id);
      c.touch();
      return { ok: true };
    }),
    route("POST", "/orders", (c) => {
      const u = userOf(c);
      const view = bagView(c.state);
      if (!view.items.length) throw bad("Your bag is empty");
      const payment = str(c.body.payment) || "upi";
      if (!["upi", "card", "cod"].includes(payment)) throw bad("payment must be upi, card or cod");
      let address: TkOrder["address"] = null;
      if (c.body.addressId !== undefined) {
        const a = c.state.addresses.find((x) => String(x.id) === str(c.body.addressId));
        if (!a) throw notFound(`Address ${c.body.addressId}`);
        address = { name: a.name, phone: a.phone, line1: a.line1, city: a.city, state: a.state, pincode: a.pincode, type: a.type };
      } else if (c.body.address && typeof c.body.address === "object") {
        const a = c.body.address as Record<string, unknown>;
        const f = need(a, ["name", "phone", "line1", "city", "state", "pincode"]);
        if (!/^\d{6}$/.test(f.pincode)) throw bad("Pincode must be 6 digits", { field: "pincode" });
        address = { name: f.name, phone: f.phone, line1: f.line1, city: f.city, state: f.state, pincode: f.pincode, type: str(a.type) === "office" ? "office" : "home" };
      } else if (c.state.addresses.length) {
        const a = c.state.addresses.find((x) => x.default) ?? c.state.addresses[0];
        address = { name: a.name, phone: a.phone, line1: a.line1, city: a.city, state: a.state, pincode: a.pincode, type: a.type };
      }
      if (payment === "cod" && view.totals.total > 5000) throw bad("Cash on delivery is available only for orders up to ₹5,000");
      const order: TkOrder = { id: `TK${String(Date.now()).slice(-6)}${c.state.seq++}`, placedAt: nowIso(), user: u, items: view.items.map((i) => ({ id: i!.productId, brand: i!.brand, name: i!.name, size: i!.size, qty: i!.qty, price: i!.price })), address, payment, totals: view.totals, status: "confirmed" };
      c.state.orders.unshift(order);
      c.state.orders = c.state.orders.slice(0, 10);
      c.state.bag = [];
      c.state.coupon = null;
      c.touch();
      c.status = 201;
      return { order };
    }),
    route("GET", "/orders", (c) => {
      const u = userOf(c);
      return { items: c.state.orders.filter((o) => (u ? o.user === u || o.user === null : o.user === null)) };
    }),
    route("GET", "/orders/:id", (c, p) => {
      const o = c.state.orders.find((x) => x.id === p.id);
      if (!o) throw notFound(`Order ${p.id}`);
      return { order: o };
    }),
    route("POST", "/orders/:id/cancel", (c, p) => {
      const o = c.state.orders.find((x) => x.id === p.id);
      if (!o) throw notFound(`Order ${p.id}`);
      if (o.status === "cancelled") throw conflict("Order is already cancelled");
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
