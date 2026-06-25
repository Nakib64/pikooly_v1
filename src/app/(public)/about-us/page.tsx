import { Metadata } from "next";
import { Suspense } from "react";
import AboutUs from "@/views/AboutUs";
import { getSiteMetadata } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return getSiteMetadata("About Us", "Learn more about Pikooly, our mission, values, and how we bring beautiful flowers and gifts to your doorstep.", "/about-us");
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AboutUs />
    </Suspense>
  );
}
