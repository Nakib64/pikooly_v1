"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  LogIn, LogOut, ShieldX, KeyRound, Mail, ShieldCheck, ShieldOff, AlertCircle, RefreshCw,
} from "lucide-react";
import { format } from "date-fns";

interface LogRow {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  description: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

const ACTION_META: Record<string, { label: string; icon: React.ElementType; tone: string }> = {
  login_success: { label: "Login", icon: LogIn, tone: "text-emerald-600 bg-emerald-500/10" },
  login_failed: { label: "Failed login", icon: ShieldX, tone: "text-destructive bg-destructive/10" },
  logout: { label: "Logout", icon: LogOut, tone: "text-muted-foreground bg-muted" },
  password_change: { label: "Password changed", icon: KeyRound, tone: "text-blue-600 bg-blue-500/10" },
  email_change: { label: "Email changed", icon: Mail, tone: "text-blue-600 bg-blue-500/10" },
  mfa_enabled: { label: "2FA enabled", icon: ShieldCheck, tone: "text-emerald-600 bg-emerald-500/10" },
  mfa_disabled: { label: "2FA disabled", icon: ShieldOff, tone: "text-amber-600 bg-amber-500/10" },
  mfa_challenge_failed: { label: "2FA failed", icon: AlertCircle, tone: "text-destructive bg-destructive/10" },
};

const PAGE_SIZE = 50;

const AdminActivityLog = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    let query = supabase
      .from("admin_activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);
    if (actionFilter !== "all") query = query.eq("action", actionFilter);
    const { data, error } = await query;
    setLoading(false);
    if (error) {
      toast({ title: "Failed to load activity", description: error.message, variant: "destructive" });
      return;
    }
    setRows((data ?? []) as LogRow[]);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionFilter]);

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      (r.user_email ?? "").toLowerCase().includes(s) ||
      (r.description ?? "").toLowerCase().includes(s) ||
      (r.action ?? "").toLowerCase().includes(s)
    );
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold">Activity Log</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Recent admin login history and account / security changes.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-2" disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Search email, action, description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:max-w-xs"
            />
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="sm:max-w-[220px]">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {Object.entries(ACTION_META).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <CardDescription>
            Showing latest {PAGE_SIZE} entries. Older logs remain in the database.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No activity matches your filters.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((r) => {
                const meta = ACTION_META[r.action] ?? {
                  label: r.action,
                  icon: AlertCircle,
                  tone: "text-muted-foreground bg-muted",
                };
                const Icon = meta.icon;
                return (
                  <li key={r.id} className="px-4 py-3 flex items-start gap-3">
                    <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full shrink-0 ${meta.tone}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="font-medium text-sm">{meta.label}</span>
                        {r.user_email && (
                          <span className="text-xs text-muted-foreground truncate">{r.user_email}</span>
                        )}
                      </div>
                      {r.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.description}</p>
                      )}
                      <p className="text-[11px] text-muted-foreground/80 mt-1">
                        {format(new Date(r.created_at), "MMM d, yyyy • h:mm a")}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminActivityLog;
