import { Metadata } from "next";
import { Suspense } from "react";
import RefundPolicy from "@/views/RefundPolicy";
import { getSiteMetadata } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return getSiteMetadata("Refund & Return Policy", "Understand our refund and replacement policy for fresh flowers, gifts, cakes, and other items.", "/refund-policy");
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <RefundPolicy />
    </Suspense>
  );
}
