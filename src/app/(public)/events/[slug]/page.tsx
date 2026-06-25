"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const EventCategoryDetail = dynamic(() => import("@/views/EventCategoryDetail"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <EventCategoryDetail />
    </Suspense>
  );
}
