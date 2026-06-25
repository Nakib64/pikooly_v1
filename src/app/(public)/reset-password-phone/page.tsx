"use client";
import { Suspense } from "react";
import ResetPasswordPhone from "@/views/ResetPasswordPhone";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordPhone />
    </Suspense>
  );
}
