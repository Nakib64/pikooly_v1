"use client";
import { Suspense } from "react";
import AllGifts from "@/views/AllGifts";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AllGifts />
    </Suspense>
  );
}
