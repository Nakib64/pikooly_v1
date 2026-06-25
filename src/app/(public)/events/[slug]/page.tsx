"use client";
import { Suspense } from "react";
import EventCategoryDetail from "@/views/EventCategoryDetail";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <EventCategoryDetail />
    </Suspense>
  );
}
