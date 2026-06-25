import { Metadata } from "next";
import { Suspense } from "react";
import Reviews from "@/views/Reviews";
import { getSiteMetadata } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return getSiteMetadata("Customer Reviews", "Read verified ratings and reviews from happy Pikooly customers sharing their flower and gift delivery experiences.", "/reviews");
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Reviews />
    </Suspense>
  );
}
