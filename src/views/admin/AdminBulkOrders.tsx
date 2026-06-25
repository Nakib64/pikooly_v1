"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, Mail, Phone, Trash2, MessageSquare, Search } from "lucide-react";

interface Quote {
  id: string;
  product_id: string | null;
  product_name: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  company_name: string | null;
  quantity: number;
  required_by: string | null;
  message: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

const STATUS = ["new", "contacted", "quoted", "won", "lost"];

const statusColor = (s: string) =>
  s === "new" ? "bg-blue-100 text-blue-700" :
  s === "contacted" ? "bg-amber-100 text-amber-700" :
  s === "quoted" ? "bg-purple-100 text-purple-700" :
  s === "won" ? "bg-green-100 text-green-700" :
  "bg-red-100 text-red-700";

const AdminBulkOrders = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editing, setEditing] = useState<Quote | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bulk_quote_requests" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    setRows((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateRow = async (id: string, patch: Partial<Quote>) => {
    const { error } = await supabase.from("bulk_quote_requests" as any).update(patch).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } as Quote : x)));
    toast({ title: "Updated" });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this request?")) return;
    const { error } = await supabase.from("bulk_quote_requests" as any).delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setRows((r) => r.filter((x) => x.id !== id));
  };

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    const matchQ = !q ||
      r.customer_name.toLowerCase().includes(q) ||
      r.customer_phone.toLowerCase().includes(q) ||
      (r.company_name || "").toLowerCase().includes(q) ||
      (r.product_name || "").toLowerCase().includes(q);
    const matchS = statusFilter === "all" || r.status === statusFilter;
    return matchQ && matchS;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Briefcase className="h-5 w-5 sm:h-6 sm:w-6 text-primary" /> Bulk / Corporate Quote Requests
        </h1>
        <span className="text-xs text-muted-foreground">{filtered.length} of {rows.length}</span>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-10" placeholder="Search name / company / product…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ fontSize: 16 }} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground border border-dashed rounded-lg">
          No bulk quote requests yet.
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((r) => (
            <div key={r.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold truncate">{r.customer_name}</h3>
                    {r.company_name && <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{r.company_name}</span>}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide ${statusColor(r.status)}`}>{r.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(r.created_at).toLocaleString()} · Qty: <strong>{r.quantity}</strong>
                    {r.required_by && <> · Need by: {new Date(r.required_by).toLocaleDateString()}</>}
                  </p>
                  {r.product_name && <p className="text-sm mt-1">📦 {r.product_name}</p>}
                  {r.message && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">"{r.message}"</p>}
                </div>
                <Select value={r.status} onValueChange={(v) => updateRow(r.id, { status: v })}>
                  <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap gap-2">
                <a href={`tel:${r.customer_phone}`} className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/70">
                  <Phone className="h-3.5 w-3.5" /> {r.customer_phone}
                </a>
                <a
                  href={`https://wa.me/${r.customer_phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${r.customer_name}, regarding your bulk quote for ${r.product_name || "our product"} (qty ${r.quantity})...`)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200"
                >
                  <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
                </a>
                {r.customer_email && (
                  <a href={`mailto:${r.customer_email}`} className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/70">
                    <Mail className="h-3.5 w-3.5" /> {r.customer_email}
                  </a>
                )}
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setEditing(r)}>Notes</Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => remove(r.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              {r.admin_notes && (
                <p className="text-xs bg-muted/50 rounded-lg p-2 whitespace-pre-wrap"><strong>Internal:</strong> {r.admin_notes}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Internal Notes</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <Label className="text-xs">Notes (only visible to admins)</Label>
              <Textarea
                rows={5}
                style={{ fontSize: 16 }}
                value={editing.admin_notes || ""}
                onChange={(e) => setEditing({ ...editing, admin_notes: e.target.value })}
              />
              <Button
                className="w-full"
                onClick={async () => {
                  await updateRow(editing.id, { admin_notes: editing.admin_notes });
                  setEditing(null);
                }}
              >Save</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBulkOrders;
