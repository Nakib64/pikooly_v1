"use client";
import { Suspense } from "react";
import Auth from "@/views/Auth";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <Auth />
    </Suspense>
  );
}
