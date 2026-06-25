import { Skeleton } from "@/components/ui/skeleton";

const ProductCardSkeleton = () => (
  <div className="bg-card rounded-xl sm:rounded-2xl overflow-hidden border border-border/50 flex flex-col">
    <Skeleton className="aspect-square w-full rounded-none" />
    <div className="p-2.5 sm:p-3 md:p-4 flex flex-col flex-1 gap-2">
      <Skeleton className="h-3.5 w-full" />
      <Skeleton className="h-3.5 w-2/3" />
      <div className="flex items-center gap-2 mt-1">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-3.5 w-14" />
      </div>
      <Skeleton className="h-9 sm:h-10 w-full rounded-lg mt-auto" />
    </div>
  </div>
);

const CategoryGridSkeleton = () => (
  <section className="py-4 sm:py-6 md:py-8 lg:py-10 section-container">
    <Skeleton className="h-6 md:h-9 w-48 mx-auto mb-4 md:mb-6" />
    <div className="grid grid-cols-4 gap-3 sm:gap-4 md:flex md:justify-center md:gap-5 lg:gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-2">
          <Skeleton className="w-full aspect-square md:w-24 md:h-24 rounded-2xl" />
          <Skeleton className="h-3.5 w-14" />
        </div>
      ))}
    </div>
  </section>
);

const BlogCardSkeleton = () => (
  <div className="bg-card rounded-2xl overflow-hidden border border-border/50">
    <Skeleton className="aspect-[16/10] w-full rounded-none" />
    <div className="p-4 space-y-2.5">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-3.5 w-full" />
      <Skeleton className="h-3.5 w-3/4" />
    </div>
  </div>
);

const ProductDetailSkeleton = () => (
  <main className="section-container py-4 md:py-8 pb-24 md:pb-10">
    <Skeleton className="h-4 w-48 mb-4 sm:mb-6" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
      <div>
        <Skeleton className="aspect-square w-full rounded-xl mb-3" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg flex-shrink-0" />
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-7 w-32" />
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="w-4 h-4 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex items-center gap-3 pt-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>
        <div className="flex gap-3 pt-2">
          <Skeleton className="h-12 flex-1 rounded-lg" />
          <Skeleton className="h-12 flex-1 rounded-lg" />
        </div>
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    </div>
  </main>
);

const AdminTableSkeleton = ({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) => (
  <div className="bg-card rounded-xl border border-border overflow-hidden">
    <div className="p-4 border-b border-border">
      <Skeleton className="h-5 w-32" />
    </div>
    <div className="divide-y divide-border">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 p-4">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={`h-4 ${c === 0 ? "w-1/4" : c === cols - 1 ? "w-16" : "flex-1"}`} />
          ))}
        </div>
      ))}
    </div>
  </div>
);

const AdminDashboardSkeleton = () => (
  <div className="space-y-6">
    <Skeleton className="h-8 w-40" />
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-card rounded-xl border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-4 rounded" />
          </div>
          <Skeleton className="h-7 w-24" />
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-card rounded-xl border border-border p-4">
        <Skeleton className="h-5 w-32 mb-4" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
      <div className="bg-card rounded-xl border border-border p-4">
        <Skeleton className="h-5 w-32 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const AccountSkeleton = () => (
  <main className="section-container py-6 md:py-10 pb-24 md:pb-10">
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="w-16 h-16 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
        <Skeleton className="h-px w-full" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <Skeleton className="h-6 w-32" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-card rounded-xl border border-border p-4 space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  </main>
);

const HeroSkeleton = () => (
  <section className="section-container py-3 sm:py-5 lg:py-7">
    <Skeleton className="w-full aspect-[16/7] sm:aspect-[16/6] lg:aspect-[16/5.5] xl:aspect-[16/5] rounded-2xl sm:rounded-[24px] lg:rounded-[28px]" />
  </section>
);

const HorizontalScrollSkeleton = ({ count = 6, aspect = "aspect-square", widthClass = "w-[44vw] sm:w-[180px] md:w-[200px] lg:w-[210px]" }: { count?: number; aspect?: string; widthClass?: string }) => (
  <section className="py-3 sm:py-5 section-container">
    <Skeleton className="h-6 w-40 mb-4" />
    <div className="flex gap-3 sm:gap-4 overflow-hidden pb-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`${widthClass} shrink-0 space-y-2`}>
          <Skeleton className={`w-full ${aspect} rounded-2xl`} />
          <Skeleton className="h-3 w-3/4" />
        </div>
      ))}
    </div>
  </section>
);

const OfferBannersSkeleton = () => (
  <section className="py-3 sm:py-5 md:py-7 section-container">
    <Skeleton className="h-6 w-40 mb-4" />
    <div className="flex gap-3 sm:gap-4 md:gap-5 overflow-hidden pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="min-w-[280px] w-[80vw] sm:w-[340px] md:flex-1 h-[90px] sm:h-[100px] md:h-[110px] rounded-2xl" />
      ))}
    </div>
  </section>
);

const AffiliateSkeleton = () => (
  <main className="container max-w-5xl mx-auto px-4 py-6 space-y-6">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-4 w-72" />
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-card rounded-xl border border-border p-4 space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-6 w-24" />
        </div>
      ))}
    </div>
    <Skeleton className="h-32 w-full rounded-xl" />
    <Skeleton className="h-64 w-full rounded-xl" />
  </main>
);

export {
  ProductCardSkeleton,
  HeroSkeleton,
  HorizontalScrollSkeleton,
  OfferBannersSkeleton,
  AffiliateSkeleton,
  CategoryGridSkeleton,
  BlogCardSkeleton,
  ProductDetailSkeleton,
  AdminTableSkeleton,
  AdminDashboardSkeleton,
  AccountSkeleton,
};
