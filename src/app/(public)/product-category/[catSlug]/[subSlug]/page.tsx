"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const Shop = dynamic(() => import("@/views/Shop"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <Shop />
    </Suspense>
  );
}
