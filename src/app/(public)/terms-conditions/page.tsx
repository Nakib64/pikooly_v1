import { Metadata } from "next";
import { Suspense } from "react";
import TermsConditions from "@/views/TermsConditions";
import { getSiteMetadata } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return getSiteMetadata("Terms & Conditions", "Read our terms of service and conditions for placing orders, payments, deliveries, and using Pikooly services.", "/terms-conditions");
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <TermsConditions />
    </Suspense>
  );
}
