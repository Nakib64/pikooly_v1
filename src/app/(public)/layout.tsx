"use client";

import { Suspense, lazy } from "react";
import { usePathname } from "next/navigation";
import Header from "@/components/layout/Header";
import PageSkeleton from "@/components/layout/PageSkeleton";
import PageTransition from "@/components/layout/PageTransition";
import ScrollToTop from "@/components/layout/ScrollToTop";
import NavigationProgress from "@/components/layout/NavigationProgress";
import AdConsentBanner from "@/components/ads/AdConsentBanner";
import AffiliateTracker from "@/components/layout/AffiliateTracker";

const Footer = lazy(() => import("@/components/layout/Footer"));
const BottomNav = lazy(() => import("@/components/layout/BottomNav"));
const WhatsAppButton = lazy(() => import("@/components/layout/WhatsAppButton"));

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideFooter = pathname === "/checkout";
  const hideWhatsApp = pathname?.startsWith("/product/");
  const hideHeader = pathname === "/blog" || pathname?.startsWith("/blog/");

  return (
    <>
      <AdConsentBanner />
      <Suspense fallback={null}>
        <ScrollToTop />
        <NavigationProgress />
        <AffiliateTracker />
      </Suspense>
      <Suspense fallback={null}>
        {!hideHeader && <Header />}
      </Suspense>
      <div className={hideHeader ? "" : "pt-[var(--mobile-header-offset,0px)] md:pt-0"}>
        <Suspense fallback={<PageSkeleton />}>
          <PageTransition>{children}</PageTransition>
        </Suspense>
      </div>
      {!hideFooter && (
        <Suspense fallback={null}>
          <Footer />
        </Suspense>
      )}
      <Suspense fallback={null}>
        <BottomNav />
      </Suspense>
      {!hideWhatsApp && (
        <Suspense fallback={null}>
          <WhatsAppButton />
        </Suspense>
      )}
    </>
  );
}
