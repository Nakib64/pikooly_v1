import { Metadata } from "next";
import { Suspense } from "react";
import ContactUs from "@/views/ContactUs";
import { getSiteMetadata } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return getSiteMetadata("Contact Us", "Get in touch with Pikooly customer support. We are here to help you with your orders, feedback, and flower delivery inquiries.", "/contact-us");
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ContactUs />
    </Suspense>
  );
}
