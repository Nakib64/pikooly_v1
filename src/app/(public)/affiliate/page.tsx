import { Metadata } from "next";
import { Suspense } from "react";
import Affiliate from "@/views/Affiliate";
import { getSiteMetadata } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return getSiteMetadata("Affiliate Program", "Join the Pikooly affiliate program and earn commission by recommending fresh flowers and gifts to your audience.", "/affiliate");
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Affiliate />
    </Suspense>
  );
}
