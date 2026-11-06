import { LegalPage } from "@/components/LegalPage";
import { SITE } from "@/lib/config";

export const metadata = { title: "Delivery policy" };

export default function Page() {
  return (
    <LegalPage
      title="Delivery policy"
      updated="6 November 2026"
      body={`${SITE.name} is a digital product. Nothing is shipped physically.

Access is delivered instantly in your browser as soon as your payment succeeds. If access doesn't unlock, use Restore access on the Pricing page with your email and payment ID, or write to ${SITE.supportEmail} and we'll sort it out within one working day.`}
    />
  );
}
