"use client";
import { Suspense } from "react";
import AboutUs from "@/views/AboutUs";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AboutUs />
    </Suspense>
  );
}
