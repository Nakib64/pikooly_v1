"use client";
import { Suspense } from "react";
import ContactUs from "@/views/ContactUs";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <ContactUs />
    </Suspense>
  );
}
