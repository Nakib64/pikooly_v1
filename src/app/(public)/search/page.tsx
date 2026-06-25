"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const Search = dynamic(() => import("@/views/Search"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <Search />
    </Suspense>
  );
}
