import { Metadata } from "next";
import { Suspense } from "react";
import Checkout from "@/views/Checkout";
import { getSiteMetadata } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return getSiteMetadata("Checkout", "Complete your order details, delivery address, and payment securely on Pikooly.", "/checkout");
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Checkout />
    </Suspense>
  );
}
