import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NotificationTemplatesEditor from "@/components/admin/NotificationTemplatesEditor";
import { RefreshCw, Eye } from "lucide-react";
import { format } from "date-fns";

interface Log {
  id: string;
  event_key: string | null;
  provider: string;
  target_type: string;
  target_value: string | null;
  title: string | null;
  body: string | null;
  status: string;
  tokens_total: number;
  tokens_success: number;
  tokens_failed: number;
  response: any;
  error: string | null;
  payload: any;
  created_at: string;
}

const statusColor = (s: string) =>
  s === "success" ? "default" : s === "partial" ? "secondary" : s === "skipped" ? "outline" : "destructive";

export default function AdminNotificationLogs() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Log | null>(null);

  const load = async () => {
    setLoading(true);
    let q = supabase.from("notification_logs").select("*").order("created_at", { ascending: false }).limit(200);
    if (statusFilter !== "all") q = q.eq("status", statusFilter);
    if (search.trim()) q = q.ilike("event_key", `%${search.trim()}%`);
    const { data } = await q;
    setLogs((data as Log[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold">Notifications</h1>
        <p className="text-sm text-muted-foreground">Push notification templates & delivery history</p>
      </div>

      <Tabs defaultValue="logs">
        <TabsList>
          <TabsTrigger value="logs">Delivery Logs</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-4">
          <NotificationTemplatesEditor />
        </TabsContent>

        <TabsContent value="logs" className="mt-4 space-y-4">
        <div className="flex justify-end">
          <Button onClick={load} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-3 mb-4">
          <Input
            placeholder="Search event key…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            className="max-w-xs"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="skipped">Skipped</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Sent / Total</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No logs yet</TableCell></TableRow>
              )}
              {logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs whitespace-nowrap">{format(new Date(l.created_at), "MMM dd, HH:mm:ss")}</TableCell>
                  <TableCell><code className="text-xs">{l.event_key || "—"}</code></TableCell>
                  <TableCell className="text-xs">
                    <div>{l.target_type}</div>
                    {l.target_value && <div className="text-muted-foreground truncate max-w-[180px]">{l.target_value}</div>}
                  </TableCell>
                  <TableCell className="text-sm max-w-[240px] truncate">{l.title || "—"}</TableCell>
                  <TableCell><Badge variant={statusColor(l.status) as any}>{l.status}</Badge></TableCell>
                  <TableCell className="text-right text-sm">
                    {l.tokens_success}/{l.tokens_total}
                    {l.tokens_failed > 0 && <span className="text-destructive ml-1">({l.tokens_failed} failed)</span>}
                  </TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" onClick={() => setSelected(l)}><Eye className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Notification Detail</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div><strong>Event:</strong> {selected.event_key || "—"}</div>
              <div><strong>Target:</strong> {selected.target_type} {selected.target_value && `→ ${selected.target_value}`}</div>
              <div><strong>Title:</strong> {selected.title}</div>
              <div><strong>Body:</strong> {selected.body}</div>
              <div><strong>Status:</strong> <Badge variant={statusColor(selected.status) as any}>{selected.status}</Badge></div>
              <div><strong>Counts:</strong> total {selected.tokens_total}, success {selected.tokens_success}, failed {selected.tokens_failed}</div>
              {selected.error && (
                <div>
                  <strong className="text-destructive">Error:</strong>
                  <pre className="bg-destructive/10 p-2 rounded text-xs overflow-auto mt-1">{selected.error}</pre>
                </div>
              )}
              <div>
                <strong>Payload:</strong>
                <pre className="bg-muted p-2 rounded text-xs overflow-auto mt-1">{JSON.stringify(selected.payload, null, 2)}</pre>
              </div>
              <div>
                <strong>Response:</strong>
                <pre className="bg-muted p-2 rounded text-xs overflow-auto mt-1 max-h-72">{JSON.stringify(selected.response, null, 2)}</pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
