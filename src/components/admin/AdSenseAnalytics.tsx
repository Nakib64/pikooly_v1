import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, MousePointerClick, Eye, TrendingUp } from "lucide-react";

type Row = {
  id: string;
  event_type: "impression" | "click";
  placement: string;
  page_path: string | null;
  created_at: string;
};

const PLACEMENT_LABELS: Record<string, string> = {
  blog_list_top: "Blog List — Top",
  blog_list_infeed: "Blog List — In-Feed",
  blog_detail_top: "Blog Detail — Top",
  blog_detail_inarticle: "Blog Detail — In-Article",
};

const Stat = ({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: any;
  label: string;
  value: string | number;
  sub?: string;
}) => (
  <div className="p-4 rounded-lg border border-border bg-background">
    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      <Icon className="h-3.5 w-3.5" /> {label}
    </div>
    <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
    {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
  </div>
);

const AdSenseAnalytics = () => {
  const since = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString();
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["ad-events-7d"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ad_events")
        .select("id, event_type, placement, page_path, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return (data || []) as Row[];
    },
    staleTime: 60_000,
  });

  const rows = data || [];

  const stats = useMemo(() => {
    let imp = 0;
    let clk = 0;
    const byPlacement: Record<string, { imp: number; clk: number }> = {};
    const byDay: Record<string, { imp: number; clk: number }> = {};
    for (const r of rows) {
      if (r.event_type === "impression") imp++;
      else if (r.event_type === "click") clk++;
      const p = r.placement || "unknown";
      byPlacement[p] = byPlacement[p] || { imp: 0, clk: 0 };
      if (r.event_type === "impression") byPlacement[p].imp++;
      else byPlacement[p].clk++;
      const day = new Date(r.created_at).toISOString().slice(0, 10);
      byDay[day] = byDay[day] || { imp: 0, clk: 0 };
      if (r.event_type === "impression") byDay[day].imp++;
      else byDay[day].clk++;
    }
    const ctr = imp > 0 ? (clk / imp) * 100 : 0;
    return { imp, clk, ctr, byPlacement, byDay };
  }, [rows]);

  const placementRows = Object.entries(stats.byPlacement).sort(
    (a, b) => b[1].imp - a[1].imp,
  );

  // Build 7-day series
  const days = useMemo(() => {
    const arr: { date: string; imp: number; clk: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      arr.push({ date: key, imp: stats.byDay[key]?.imp || 0, clk: stats.byDay[key]?.clk || 0 });
    }
    return arr;
  }, [stats.byDay]);

  const maxBar = Math.max(1, ...days.map((d) => d.imp));

  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <BarChart3 className="h-4 w-4" /> AdSense Analytics — Last 7 days
        </h4>
        <p className="text-xs text-muted-foreground mt-1">
          Basic on-site tracking (impressions when an ad enters view, clicks when the ad
          area is clicked). For revenue & RPM, check your Google AdSense dashboard.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Stat icon={Eye} label="Impressions" value={stats.imp.toLocaleString()} sub="ads viewed" />
            <Stat icon={MousePointerClick} label="Clicks" value={stats.clk.toLocaleString()} sub="user clicks" />
            <Stat
              icon={TrendingUp}
              label="CTR"
              value={`${stats.ctr.toFixed(2)}%`}
              sub="clicks ÷ impressions"
            />
          </div>

          {/* 7-day bar chart (impressions) */}
          <div className="p-4 rounded-lg border border-border bg-background">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Impressions per day
            </p>
            <div className="flex items-end gap-2 h-32">
              {days.map((d) => (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-primary/80"
                    style={{ height: `${(d.imp / maxBar) * 100}%`, minHeight: d.imp > 0 ? 4 : 0 }}
                    title={`${d.imp} impressions, ${d.clk} clicks`}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {d.date.slice(5)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Per-placement breakdown */}
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold">Placement</th>
                  <th className="text-right px-3 py-2 font-semibold">Impressions</th>
                  <th className="text-right px-3 py-2 font-semibold">Clicks</th>
                  <th className="text-right px-3 py-2 font-semibold">CTR</th>
                </tr>
              </thead>
              <tbody>
                {placementRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                      No ad events recorded yet.
                    </td>
                  </tr>
                ) : (
                  placementRows.map(([p, s]) => (
                    <tr key={p} className="border-t border-border">
                      <td className="px-3 py-2 text-foreground">
                        {PLACEMENT_LABELS[p] || p}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">{s.imp}</td>
                      <td className="px-3 py-2 text-right font-mono">{s.clk}</td>
                      <td className="px-3 py-2 text-right font-mono">
                        {s.imp > 0 ? ((s.clk / s.imp) * 100).toFixed(2) : "0.00"}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default AdSenseAnalytics;
