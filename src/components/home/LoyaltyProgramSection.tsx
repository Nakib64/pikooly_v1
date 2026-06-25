import { getOptimizedImageUrl } from "@/lib/imageUtils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Gift, Sparkles } from "lucide-react";

const LoyaltyProgramSection = () => {
  const { data: settings } = useQuery({
    queryKey: ["loyalty-program-public"],
    queryFn: async () => {
      const { data } = await supabase.from("loyalty_program_settings").select("*").limit(1).maybeSingle();
      return data;
    },
  });

  const { data: gifts = [] } = useQuery({
    queryKey: ["loyalty-gifts-public"],
    queryFn: async () => {
      const { data } = await supabase
        .from("loyalty_gift_items")
        .select("id, name, image_url, estimated_value")
        .eq("is_active", true)
        .order("display_order")
        .limit(8);
      return data || [];
    },
  });

  if (!settings || !settings.is_enabled || !settings.show_on_homepage) return null;

  return (
    <section className="py-8 sm:py-12 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="rounded-2xl bg-card border border-primary/20 overflow-hidden shadow-sm">
          <div className="grid md:grid-cols-2 gap-0">
            {/* Left: text */}
            <div className="p-5 sm:p-8 flex flex-col justify-center">
              <div className="inline-flex items-center gap-1.5 self-start bg-primary/10 text-primary px-2.5 py-1 rounded-full text-xs font-medium mb-3">
                <Sparkles className="h-3 w-3" />
                Loyalty Rewards
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 flex items-center gap-2">
                <Trophy className="h-6 w-6 text-primary" />
                {settings.public_title}
              </h2>
              {settings.public_subtitle && (
                <p className="text-sm sm:text-base text-muted-foreground mb-3">{settings.public_subtitle}</p>
              )}
              {settings.public_description && (
                <p className="text-sm text-foreground/80 mb-4 leading-relaxed">{settings.public_description}</p>
              )}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-lg font-bold text-primary">{settings.winners_per_batch}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Winners</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-lg font-bold text-primary">{settings.draw_batch_size}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Orders</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-lg font-bold text-primary">{settings.min_orders_to_qualify}+</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">To Qualify</p>
                </div>
              </div>
            </div>

            {/* Right: gifts preview */}
            <div className="bg-muted/30 p-5 sm:p-6">
              {settings.banner_image_url ? (
                <img src={getOptimizedImageUrl(settings.banner_image_url, { width: 800 })} alt={settings.public_title} className="w-full h-full object-cover rounded-xl max-h-64" loading="lazy" />
              ) : (
                <>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <Gift className="h-3.5 w-3.5" />
                    Featured Gifts
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {gifts.slice(0, 6).map((g) => (
                      <div key={g.id} className="bg-background rounded-lg overflow-hidden border border-border">
                        {g.image_url ? (
                          <img src={getOptimizedImageUrl(g.image_url, { width: 240 })} alt={g.name} className="w-full aspect-square object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full aspect-square bg-muted flex items-center justify-center">
                            <Gift className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="p-1.5">
                          <p className="text-[11px] font-medium truncate">{g.name}</p>
                        </div>
                      </div>
                    ))}
                    {gifts.length === 0 && (
                      <div className="col-span-full text-center py-6 text-xs text-muted-foreground">
                        Gifts coming soon
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LoyaltyProgramSection;
