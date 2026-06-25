"use client";
import { Suspense } from "react";
import Reviews from "@/views/Reviews";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <Reviews />
    </Suspense>
  );
}
