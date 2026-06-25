"use client";
import { Suspense } from "react";
import TrackOrder from "@/views/TrackOrder";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <TrackOrder />
    </Suspense>
  );
}
