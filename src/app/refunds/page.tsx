import { LegalPage } from "@/components/LegalPage";
import { SITE } from "@/lib/config";

export const metadata = { title: "Refund and cancellation policy" };

export default function Page() {
  return (
    <LegalPage
      title="Refund and cancellation policy"
      updated="6 November 2026"
      body={`Full access is a one-time purchase, so there is no subscription to cancel.

**7-day refund.** If you're not happy, email ${SITE.supportEmail} within 7 days of purchase with your payment ID and we'll refund you in full. Refunds go back to the original payment method through Razorpay and usually arrive within 5–7 working days.

After 7 days, purchases are non-refundable except where the law requires otherwise. Access ends when a refund is issued.

You can try the free questions in every level before buying.`}
    />
  );
}
