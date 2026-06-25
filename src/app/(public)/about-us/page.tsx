"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const AboutUs = dynamic(() => import("@/views/AboutUs"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AboutUs />
    </Suspense>
  );
}
