"use client";
import { Suspense } from "react";
import BouquetBuilder from "@/views/BouquetBuilder";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <BouquetBuilder />
    </Suspense>
  );
}
