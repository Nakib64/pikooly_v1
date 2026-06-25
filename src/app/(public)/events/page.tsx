import { Metadata } from "next";
import { Suspense } from "react";
import Events from "@/views/Events";
import { getSiteMetadata } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return getSiteMetadata("Events", "Explore event decoration services for weddings, corporate functions, birthdays, and parties with Pikooly.", "/events");
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Events />
    </Suspense>
  );
}
