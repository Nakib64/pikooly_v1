"use client";
import { Suspense } from "react";
import AuthVerify from "@/views/AuthVerify";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AuthVerify />
    </Suspense>
  );
}
