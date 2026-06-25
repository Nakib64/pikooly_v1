"use client";
import { Suspense } from "react";
import AuthReset from "@/views/AuthReset";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AuthReset />
    </Suspense>
  );
}
