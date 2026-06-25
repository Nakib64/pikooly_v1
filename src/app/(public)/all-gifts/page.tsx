"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const AllGifts = dynamic(() => import("@/views/AllGifts"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AllGifts />
    </Suspense>
  );
}
