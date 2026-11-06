export const SITE = {
  name: "QA Interview Ready",
  tagline: "Interview prep for QA engineers, from fresher to architect",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://interview.qatechlabs.com",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@qatechlabs.com",
  businessName: process.env.NEXT_PUBLIC_BUSINESS_NAME || "QA Tech Labs",
};

/** Number of questions at the start of every level's study path that are free. */
export const FREE_PER_LEVEL = Number(process.env.FREE_QUESTIONS_PER_LEVEL || 8);

/** Price in the smallest currency unit (paise for INR). */
export const PRICE = {
  amount: Number(process.env.PRICE_AMOUNT || 49900),
  currency: process.env.PRICE_CURRENCY || "INR",
  productId: "qir-lifetime",
  label: "Lifetime access",
};

export function formatPrice(amount = PRICE.amount, currency = PRICE.currency) {
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: amount % 100 === 0 ? 0 : 2,
  }).format(amount / 100);
}
