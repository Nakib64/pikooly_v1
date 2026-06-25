"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const ContactUs = dynamic(() => import("@/views/ContactUs"), { ssr: false });
export default function Page() {
  return (
    <Suspense fallback={null}>
      <ContactUs />
    </Suspense>
  );
}
