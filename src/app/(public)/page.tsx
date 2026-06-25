import { Metadata } from "next";
import { Suspense } from "react";
import Index from "@/views/Index";
import { getSiteMetadata } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return getSiteMetadata(undefined, undefined, "/");
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Index />
    </Suspense>
  );
}
