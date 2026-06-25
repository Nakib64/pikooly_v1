"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const Reviews = dynamic(() => import("@/views/Reviews"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <Reviews />
    </Suspense>
  );
}
