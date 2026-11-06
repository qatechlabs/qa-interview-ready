import { LegalPage } from "@/components/LegalPage";
import { SITE, formatPrice } from "@/lib/config";

export const metadata = { title: "Terms of service" };

export default function Page() {
  return (
    <LegalPage
      title="Terms of service"
      updated="6 November 2026"
      body={`${SITE.name} is operated by ${SITE.businessName}. By using the site you agree to these terms.

**What you get.** Free visitors can read the free questions of every level. Buying full access (currently ${formatPrice()}, one-time) unlocks all questions on the site for personal use, with no expiry.

**Personal licence.** Access is for one person. Don't share, resell, scrape or republish the paid content.

**Accuracy.** We work hard to keep answers correct and current, but interview content is guidance, not a guarantee of any result. Tools and versions change; check official documentation for production work.

**Payments.** Payments are processed by Razorpay. We don't see or store your card or UPI details.

**Changes.** We may update content, features and these terms. Material changes will be posted on this page.

**Contact.** ${SITE.supportEmail}`}
    />
  );
}
