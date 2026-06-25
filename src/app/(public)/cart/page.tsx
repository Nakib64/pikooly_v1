import { Metadata } from "next";
import { Suspense } from "react";
import Cart from "@/views/Cart";
import { getSiteMetadata } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return getSiteMetadata("Shopping Cart", "Review your selected flowers, cakes, and gifts before heading to checkout.", "/cart");
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Cart />
    </Suspense>
  );
}
