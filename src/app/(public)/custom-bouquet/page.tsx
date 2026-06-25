"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const BouquetBuilder = dynamic(() => import("@/views/BouquetBuilder"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <BouquetBuilder />
    </Suspense>
  );
}
