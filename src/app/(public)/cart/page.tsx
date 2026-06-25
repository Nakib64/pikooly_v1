"use client";
import { Suspense } from "react";
import Cart from "@/views/Cart";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <Cart />
    </Suspense>
  );
}
