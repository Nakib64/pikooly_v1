import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@/lib/router-adapter";
import { supabase } from "@/integrations/supabase/client";
import {
  Trophy,
  Gift,
  Package,
  CheckCircle2,
  Clock,
  Truck,
  ChevronRight,
  Sparkles,
  ShoppingBag,
  Users,
  ListChecks,
} from "lucide-react";
import { format } from "date-fns";

interface Props {
  userId: string;
}

const statusConfig: Record<string, { label: string; icon: any; className: string }> = {
  pending: {
    label: "Pending Dispatch",
    icon: Clock,
    className: "bg-amber-400/15 text-amber-300 border-amber-400/30",
  },
  dispatched: {
    label: "On the Way",
    icon: Truck,
    className: "bg-blue-400/15 text-blue-300 border-blue-400/30",
  },
  delivered: {
    label: "Delivered",
    icon: CheckCircle2,
    className: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30",
  },
};

type TabKey = "how" | "gifts" | "winners";

const LoyaltyRewardsSection = ({ userId }: Props) => {
  const [tab, setTab] = useState<TabKey>("gifts");

  const { data: settings } = useQuery({
    queryKey: ["loyalty-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("loyalty_program_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: gifts = [] } = useQuery({
    queryKey: ["loyalty-gifts-active"],
    queryFn: async () => {
      const { data } = await supabase
        .from("loyalty_gift_items")
        .select("id, name, image_url, estimated_value, stock")
        .eq("is_active", true)
        .order("display_order");
      return data || [];
    },
  });

  const { data: orderCount = 0 } = useQuery({
    queryKey: ["loyalty-order-count", userId],
    queryFn: async () => {
      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .neq("status", "cancelled");
      return count || 0;
    },
  });

  const { data: winners = [], isLoading } = useQuery({
    queryKey: ["loyalty-winners-mine", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loyalty_winners")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: recentWinners = [] } = useQuery({
    queryKey: ["loyalty-winners-recent"],
    queryFn: async () => {
      const { data } = await supabase
        .from("loyalty_winners")
        .select("id, customer_name, batch_number, total_orders_at_draw, gift_name, delivery_address, created_at")
        .order("created_at", { ascending: false })
        .limit(6);
      return data || [];
    },
  });

  if (isLoading || !settings) return null;

  const target = settings.min_orders_to_qualify || 5;
  const progress = Math.min(100, Math.round((orderCount / target) * 100));
  const qualified = orderCount >= target;
  const remaining = Math.max(0, target - orderCount);

  const TabBtn = ({ id, label }: { id: TabKey; label: string }) => (
    <button
      onClick={() => setTab(id)}
      className={`px-4 py-1.5 rounded-full text-xs font-medium border transition ${
        tab === id
          ? "bg-amber-400/90 text-[#1a1a2e] border-amber-300 shadow-[0_0_18px_rgba(234,179,8,0.35)]"
          : "bg-transparent text-amber-100/80 border-amber-400/30 hover:bg-amber-400/10"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div
      className="relative rounded-2xl p-4 sm:p-6 overflow-hidden border border-amber-400/20"
      style={{
        background:
          "radial-gradient(120% 80% at 50% 0%, #16264a 0%, #0b1730 55%, #070f24 100%)",
        boxShadow: "0 10px 40px -10px rgba(0,0,0,0.6)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(60% 40% at 50% 0%, rgba(234,179,8,0.14) 0%, rgba(0,0,0,0) 70%)",
        }}
      />

      <div className="relative">
        {/* Hero */}
        <div className="text-center pt-2 pb-5">
          <div className="text-3xl sm:text-4xl mb-2">🏆</div>
          <h2 className="text-xl sm:text-2xl font-display font-bold text-amber-300 tracking-wide">
            {settings.public_title || "Loyalty Gift Program"}
          </h2>
          {settings.public_subtitle && (
            <p className="text-xs sm:text-sm text-slate-300/80 mt-1.5 max-w-md mx-auto">
              {settings.public_subtitle}
            </p>
          )}
        </div>

        {/* Progress card */}
        <div className="rounded-xl border border-amber-400/20 bg-[#0d1a36]/70 p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-amber-200 tracking-wide">Your Progress</span>
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-200">
              <Trophy size={11} /> Loyal
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-300 mb-2">
            <span>
              Total Orders: <b className="text-amber-100">{orderCount}</b>
            </span>
            <span>
              Target: <b className="text-amber-100">{target}</b>{" "}
              {qualified && <span className="text-emerald-300">✓</span>}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-amber-400/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-amber-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div
            className={`mt-3 rounded-lg px-3 py-2 text-xs border flex items-center gap-2 ${
              qualified
                ? "bg-emerald-400/10 border-emerald-400/30 text-emerald-200"
                : "bg-amber-400/10 border-amber-400/30 text-amber-100"
            }`}
          >
            {qualified ? (
              <>
                <CheckCircle2 size={14} />
                You're eligible for the draw! Your name will be in the next batch.
              </>
            ) : (
              <>
                <Sparkles size={14} />
                {remaining} more order{remaining === 1 ? "" : "s"} to qualify for the draw.
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          <TabBtn id="how" label="How it works" />
          <TabBtn id="gifts" label="Gifts" />
          <TabBtn id="winners" label="Winners" />
        </div>

        {/* Tab content */}
        {tab === "how" && (
          <div>
            <h3 className="text-xs font-semibold text-amber-200 tracking-wide mb-3 flex items-center gap-1.5">
              <ListChecks size={14} /> Steps
            </h3>
            <div className="space-y-2">
              {[
                {
                  t: "Place Orders",
                  d: `Complete at least ${target} successful orders. Cancelled orders do not count.`,
                },
                {
                  t: "Become Eligible",
                  d: "Once you reach the target, your name is automatically added to every upcoming draw.",
                },
                {
                  t: "Draw & Winners",
                  d: `A draw runs after every ${settings.draw_batch_size} orders. ${settings.winners_per_batch} lucky winners receive surprise gifts.`,
                },
                {
                  t: "Receive Your Gift",
                  d: "Winners get their gift delivered to their address along with a special card.",
                },
              ].map((s, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-amber-400/15 bg-[#0d1a36]/70 p-3 flex gap-3"
                >
                  <div className="w-7 h-7 shrink-0 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-200 text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-amber-50">{s.t}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{s.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "gifts" && (
          <div>
            <h3 className="text-xs font-semibold text-amber-200 tracking-wide mb-3 flex items-center gap-1.5">
              <Gift size={14} /> This Month's Gifts
            </h3>
            {gifts.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-6">Gifts coming soon.</p>
            ) : (
              <div className="space-y-2">
                {gifts.map((g: any) => (
                  <div
                    key={g.id}
                    className="rounded-xl border border-amber-400/15 bg-[#0d1a36]/70 p-2.5 flex items-center gap-3"
                  >
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-400/20 to-amber-600/10 border border-amber-400/30 flex items-center justify-center shrink-0 overflow-hidden">
                      {g.image_url ? (
                        <img src={g.image_url} alt={g.name} className="w-full h-full object-cover" />
                      ) : (
                        <Gift size={20} className="text-amber-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-amber-50 truncate">{g.name}</p>
                      <p className="text-xs text-amber-200/90">
                        Value: ৳{Number(g.estimated_value || 0).toLocaleString()}
                      </p>
                      <p className="text-[11px] text-slate-400">Stock: {g.stock} remaining</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "winners" && (
          <div>
            <h3 className="text-xs font-semibold text-amber-200 tracking-wide mb-3 flex items-center gap-1.5">
              <Users size={14} /> Recent Winners
            </h3>
            {recentWinners.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-6">No winners yet.</p>
            ) : (
              <div className="space-y-2">
                {recentWinners.map((w: any) => (
                  <div
                    key={w.id}
                    className="rounded-xl border border-amber-400/15 bg-[#0d1a36]/70 p-3 flex items-center gap-3"
                  >
                    <div className="w-9 h-9 shrink-0 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-200 text-xs font-bold flex items-center justify-center uppercase">
                      {(w.customer_name || "?").charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-amber-50 truncate">{w.customer_name}</p>
                      <p className="text-[11px] text-slate-400">
                        {w.batch_number ? `Batch #${w.batch_number} · ` : ""}
                        {w.total_orders_at_draw} orders
                        {w.delivery_address ? ` · ${String(w.delivery_address).split(",").pop()?.trim()}` : ""}
                      </p>
                    </div>
                    <p className="text-[11px] text-amber-200/90 text-right shrink-0 max-w-[40%] truncate">
                      {w.gift_name}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}


        {/* CTA */}
        <div className="mt-5 rounded-xl border border-amber-400/25 bg-[#0d1a36]/70 p-5 text-center">
          <h4 className="text-base font-display font-bold text-amber-300 mb-1">Place More Orders</h4>
          <p className="text-xs text-slate-300 mb-3">
            Every new order adds a draw entry. Boost your chances of winning!
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-300 text-[#1a1a2e] text-sm font-semibold shadow-[0_0_25px_rgba(234,179,8,0.4)] hover:opacity-90 transition"
          >
            <ShoppingBag size={14} />
            Order Now
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoyaltyRewardsSection;
