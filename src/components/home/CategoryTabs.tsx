import { memo } from "react";
import { Flower2 } from "lucide-react";
import { getOptimizedCloudinaryUrl } from "@/lib/imageUtils";

interface Tab {
  id: string;
  label: string;
  icon: React.ElementType | null;
  imageUrl?: string | null;
}

interface CategoryTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

const CategoryTabs = memo(({ tabs, activeTab, onTabChange }: CategoryTabsProps) => {
  return (
    <div className="relative mb-5 lg:mb-7 border-b border-border/50">
      <div className="flex w-full overflow-x-auto scrollbar-hide snap-x snap-mandatory gap-0">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex shrink-0 snap-start items-center gap-1.5 px-4 py-3 text-[13px] font-medium whitespace-nowrap transition-all duration-200 md:px-5 md:py-3.5 md:text-sm border-b-2 -mb-[1px] ${
                isActive
                  ? "border-primary text-primary font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.imageUrl ? (
                <img src={getOptimizedCloudinaryUrl(tab.imageUrl, 40)} alt="" className="w-4 h-4 md:w-5 md:h-5 rounded object-cover" loading="lazy" decoding="async" width={20} height={20} />
              ) : tab.icon ? (
                <tab.icon size={14} />
              ) : (
                <Flower2 size={14} />
              )}
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
});

CategoryTabs.displayName = "CategoryTabs";

export default CategoryTabs;
