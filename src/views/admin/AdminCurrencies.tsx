import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useState } from "react";
import { Plus, Trash2, Save, Coins } from "lucide-react";

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  exchange_rate: number;
  is_active: boolean;
  is_default: boolean;
  display_order: number;
}

const AdminCurrencies = () => {
  const queryClient = useQueryClient();
  const [newCurrency, setNewCurrency] = useState({ code: "", name: "", symbol: "", exchange_rate: "1" });

  const { data: currencies = [], isLoading } = useQuery({
    queryKey: ["admin-currencies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("currencies")
        .select("*")
        .order("display_order");
      if (error) throw error;
      return data as Currency[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (currency: Partial<Currency> & { id: string }) => {
      const { error } = await supabase.from("currencies").update(currency).eq("id", currency.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-currencies"] });
      queryClient.invalidateQueries({ queryKey: ["currencies"] });
      toast.success("Currency updated");
    },
    onError: () => toast.error("Failed to update currency"),
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("currencies").insert({
        code: newCurrency.code.toUpperCase(),
        name: newCurrency.name,
        symbol: newCurrency.symbol,
        exchange_rate: parseFloat(newCurrency.exchange_rate) || 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-currencies"] });
      queryClient.invalidateQueries({ queryKey: ["currencies"] });
      setNewCurrency({ code: "", name: "", symbol: "", exchange_rate: "1" });
      toast.success("Currency added");
    },
    onError: () => toast.error("Failed to add currency"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("currencies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-currencies"] });
      queryClient.invalidateQueries({ queryKey: ["currencies"] });
      toast.success("Currency deleted");
    },
    onError: () => toast.error("Failed to delete currency"),
  });

  const setDefault = async (id: string) => {
    // Unset all defaults first
    await supabase.from("currencies").update({ is_default: false }).neq("id", "");
    await supabase.from("currencies").update({ is_default: true }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["admin-currencies"] });
    queryClient.invalidateQueries({ queryKey: ["currencies"] });
    toast.success("Default currency updated");
  };

  return (
    <div className="max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <Coins className="h-6 w-6 text-primary" />
          <h2 className="text-xl sm:text-2xl font-display font-bold">Currencies</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Manage currencies and exchange rates. The default currency is your base price currency (BDT). 
          Exchange rates are relative to the default currency. E.g., if 1 BDT = 0.0084 USD, set USD rate to 0.0084.
        </p>

        {/* Add new currency */}
        <div className="bg-card border border-border rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-sm mb-3">Add New Currency</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Input
              placeholder="Code (EUR)"
              value={newCurrency.code}
              onChange={(e) => setNewCurrency({ ...newCurrency, code: e.target.value })}
              maxLength={5}
            />
            <Input
              placeholder="Name (Euro)"
              value={newCurrency.name}
              onChange={(e) => setNewCurrency({ ...newCurrency, name: e.target.value })}
            />
            <Input
              placeholder="Symbol (€)"
              value={newCurrency.symbol}
              onChange={(e) => setNewCurrency({ ...newCurrency, symbol: e.target.value })}
              maxLength={5}
            />
            <Input
              placeholder="Rate (0.0077)"
              value={newCurrency.exchange_rate}
              onChange={(e) => setNewCurrency({ ...newCurrency, exchange_rate: e.target.value })}
              type="number"
              step="any"
            />
            <Button
              onClick={() => addMutation.mutate()}
              disabled={!newCurrency.code || !newCurrency.name || !newCurrency.symbol || addMutation.isPending}
            >
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
        </div>

        {/* Currency list */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="hidden sm:grid grid-cols-[1fr_1.5fr_0.5fr_1fr_0.8fr_0.5fr_0.5fr] gap-3 p-3 bg-muted/50 text-xs font-semibold text-muted-foreground uppercase">
            <span>Code</span>
            <span>Name</span>
            <span>Symbol</span>
            <span>Exchange Rate</span>
            <span>Default</span>
            <span>Active</span>
            <span></span>
          </div>
          {isLoading ? (
            <div className="space-y-3 p-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg"><div className="h-5 w-12 bg-muted rounded animate-pulse" /><div className="h-4 flex-1 bg-muted rounded animate-pulse" /><div className="h-4 w-20 bg-muted rounded animate-pulse" /><div className="h-5 w-14 bg-muted rounded-full animate-pulse" /></div>)}</div>
          ) : (
            currencies.map((c) => (
              <div key={c.id} className="grid grid-cols-2 sm:grid-cols-[1fr_1.5fr_0.5fr_1fr_0.8fr_0.5fr_0.5fr] gap-3 p-3 border-t border-border items-center">
                <span className="font-mono font-semibold text-sm">{c.code}</span>
                <span className="text-sm">{c.name}</span>
                <span className="text-lg font-semibold">{c.symbol}</span>
                <Input
                  type="number"
                  step="any"
                  defaultValue={c.exchange_rate}
                  className="h-8 text-sm"
                  disabled={c.is_default}
                  onBlur={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val !== c.exchange_rate) {
                      updateMutation.mutate({ id: c.id, exchange_rate: val });
                    }
                  }}
                />
                <Button
                  variant={c.is_default ? "default" : "outline"}
                  size="sm"
                  className="text-xs"
                  onClick={() => !c.is_default && setDefault(c.id)}
                >
                  {c.is_default ? "Default" : "Set Default"}
                </Button>
                <Switch
                  checked={c.is_active}
                  onCheckedChange={(val) => updateMutation.mutate({ id: c.id, is_active: val })}
                />
                {!c.is_default && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10 h-8 w-8"
                    onClick={() => deleteMutation.mutate(c.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
    </div>
  );
};

export default AdminCurrencies;
