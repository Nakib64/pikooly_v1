import { Metadata } from "next";
import { Suspense } from "react";
import PrivacyPolicy from "@/views/PrivacyPolicy";
import { getSiteMetadata } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return getSiteMetadata("Privacy Policy", "Read the Pikooly Privacy Policy to understand how we collect, protect, and use your personal information.", "/privacy-policy");
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PrivacyPolicy />
    </Suspense>
  );
}
