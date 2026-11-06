import { LegalPage } from "@/components/LegalPage";
import { SITE } from "@/lib/config";

export const metadata = { title: "Privacy policy" };

export default function Page() {
  return (
    <LegalPage
      title="Privacy policy"
      updated="6 November 2026"
      body={`We collect as little as possible.

- **No account.** There is no sign-up. Your progress, bookmarks and practice-again list are stored only in your own browser (localStorage) and never sent to us.
- **Purchases.** When you buy, Razorpay processes the payment. We receive your email address and payment ID from Razorpay to confirm the purchase and let you restore access.
- **Access cookie.** After purchase we set one secure cookie in your browser that proves you have access. It contains your email and payment ID, signed so it can't be forged.
- **Hosting logs.** Our hosting provider (Vercel) keeps standard server logs such as IP address and pages requested, for security and reliability.

We don't sell your data or use advertising trackers. To ask about or delete your data, write to ${SITE.supportEmail}.`}
    />
  );
}
