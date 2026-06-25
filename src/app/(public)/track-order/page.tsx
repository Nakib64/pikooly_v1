import { Metadata } from "next";
import { Suspense } from "react";
import TrackOrder from "@/views/TrackOrder";
import { getSiteMetadata } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return getSiteMetadata("Track Your Order", "Track the status of your flower or gift delivery order in real-time on Pikooly.", "/track-order");
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <TrackOrder />
    </Suspense>
  );
}
