import { Metadata } from "next";
import { Suspense } from "react";
import Shop from "@/views/Shop";
import { getSiteMetadata } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return getSiteMetadata("Shop", "Browse and order fresh flower bouquets, gifts, and delicious cakes for delivery across Bangladesh.", "/shop");
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Shop />
    </Suspense>
  );
}
