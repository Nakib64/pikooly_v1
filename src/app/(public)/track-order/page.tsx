"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const TrackOrder = dynamic(() => import("@/views/TrackOrder"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <TrackOrder />
    </Suspense>
  );
}
