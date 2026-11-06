export const SITE = {
  name: "QA Interview Ready",
  tagline: "Interview prep for QA engineers, from fresher to architect",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://interview.qatechlabs.com",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "karthik@qatechlabs.com",
  businessName: process.env.NEXT_PUBLIC_BUSINESS_NAME || "QA Tech Labs",
};

/** Number of questions at the start of every level's study path that are free. */
export const FREE_PER_LEVEL = Number(process.env.FREE_QUESTIONS_PER_LEVEL || 8);

export type TierId = "prep" | "pro" | "architect";
export interface Tier {
  id: TierId;
  name: string;
  /** Price in the smallest currency unit (paise for INR). */
  amount: number;
  /** Razorpay order note that identifies the product. */
  productId: string;
  tagline: string;
  /** What this tier adds on top of the one below it. */
  adds: string[];
}

/**
 * Cumulative one-time tiers: each includes everything below it. Amounts can be overridden per tier
 * with PRICE_PREP_AMOUNT / PRICE_PRO_AMOUNT / PRICE_ARCHITECT_AMOUNT (PRICE_AMOUNT still sets Prep).
 */
export const TIERS: Tier[] = [
  {
    id: "prep",
    name: "Prep",
    amount: Number(process.env.PRICE_PREP_AMOUNT || process.env.PRICE_AMOUNT || 99900),
    productId: "qir-prep",
    tagline: "Every interview question, answered",
    adds: ["All questions across all five levels", "60-second answer, explanation, example and code for each", "Study path, flashcards, mock interview rounds and weak-spot drills", "New questions as they're added"],
  },
  {
    id: "pro",
    name: "Pro",
    amount: Number(process.env.PRICE_PRO_AMOUNT || 129900),
    productId: "qir-pro",
    tagline: "Prep + hands-on automation labs",
    adds: ["All live coding labs on the practice apps and real sites", "Runs on GitHub Actions in a repo in your name", "Run reports and Word evidence documents", "Playwright and Selenium Java reference solutions"],
  },
  {
    id: "architect",
    name: "Architect",
    amount: Number(process.env.PRICE_ARCHITECT_AMOUNT || 159900),
    productId: "qir-architect",
    tagline: "Pro + build a framework from scratch",
    adds: ["Framework workspaces for all six applications", "Production-grade framework review (config, page objects, fixtures, tags, CI readiness)", "Reference frameworks to compare against", "Everything added to the platform later"],
  },
];

export const TIER_RANK: Record<TierId, number> = { prep: 0, pro: 1, architect: 2 };
export const isTierId = (x: unknown): x is TierId => x === "prep" || x === "pro" || x === "architect";
export const tier = (id: TierId) => TIERS.find((t) => t.id === id)!;
export const tierAtLeast = (have: TierId, need: TierId) => TIER_RANK[have] >= TIER_RANK[need];
/** Product id of purchases made before tiers existed; they bought everything. */
export const LEGACY_PRODUCT_ID = "qir-lifetime";
export const tierForProduct = (productId: string | undefined): Tier | null => (productId === LEGACY_PRODUCT_ID ? tier("architect") : TIERS.find((t) => t.productId === productId) || null);

/** Entry price, used where one number is shown. */
export const PRICE = {
  get amount() {
    return TIERS[0].amount;
  },
  currency: process.env.PRICE_CURRENCY || "INR",
  label: "One-time payment",
};

export function formatPrice(amount = PRICE.amount, currency = PRICE.currency) {
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: amount % 100 === 0 ? 0 : 2,
  }).format(amount / 100);
}
