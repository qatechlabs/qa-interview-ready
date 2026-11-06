import { LegalPage } from "@/components/LegalPage";
import { SITE } from "@/lib/config";

export const metadata = { title: "Contact us" };

export default function Page() {
  return (
    <LegalPage
      title="Contact us"
      updated="6 November 2026"
      body={`Questions, payment problems, refunds, or a question you think we should add? We'd love to hear from you.

**Email:** ${SITE.supportEmail}

**Business:** ${SITE.businessName}

We reply within one working day.`}
    />
  );
}
