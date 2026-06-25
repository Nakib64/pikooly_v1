import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Plus, Trash2, Star, X, Check } from "lucide-react";
import { toast } from "sonner";

interface SavedAddressesProps {
  userId: string;
}

const SavedAddresses = ({ userId }: SavedAddressesProps) => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ label: "Home", full_name: "", phone: "", address: "", district: "" });
  const [saving, setSaving] = useState(false);

  const { data: addresses = [] } = useQuery({
    queryKey: ["saved-addresses", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_addresses")
        .select("*")
        .eq("user_id", userId)
        .order("is_default", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleAdd = async () => {
    if (!form.full_name.trim() || !form.phone.trim() || !form.address.trim()) {
      toast.error("Please fill all required fields");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("saved_addresses").insert({
        user_id: userId,
        label: form.label,
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        district: form.district.trim() || null,
        is_default: addresses.length === 0,
      });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["saved-addresses", userId] });
      queryClient.invalidateQueries({ queryKey: ["checkout-default-address"] });
      setForm({ label: "Home", full_name: "", phone: "", address: "", district: "" });
      setShowForm(false);
      toast.success("Address saved!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("saved_addresses").delete().eq("id", id);
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ["saved-addresses", userId] });
      queryClient.invalidateQueries({ queryKey: ["checkout-default-address"] });
      toast.success("Address deleted");
    }
  };

  const setDefault = async (id: string) => {
    await supabase.from("saved_addresses").update({ is_default: false }).eq("user_id", userId);
    await supabase.from("saved_addresses").update({ is_default: true }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["saved-addresses", userId] });
    queryClient.invalidateQueries({ queryKey: ["checkout-default-address"] });
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-display font-semibold text-foreground flex items-center gap-2">
          <MapPin size={18} className="text-primary" />
          Saved Addresses
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancel" : "Add New"}
        </button>
      </div>

      {showForm && (
        <div className="mb-4 p-3 sm:p-4 bg-muted/50 rounded-xl space-y-3 border border-border/50">
          <div className="flex gap-2">
            {["Home", "Office", "Other"].map((l) => (
              <button
                key={l}
                onClick={() => setForm({ ...form, label: l })}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${form.label === l ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              placeholder="Full Name *"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-border focus:border-primary outline-none text-sm"
            />
            <input
              placeholder="Phone *"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-border focus:border-primary outline-none text-sm"
            />
          </div>
          <input
            placeholder="Full Address *"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-border focus:border-primary outline-none text-sm"
          />
          <input
            placeholder="District"
            value={form.district}
            onChange={(e) => setForm({ ...form, district: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-border focus:border-primary outline-none text-sm"
          />
          <button
            onClick={handleAdd}
            disabled={saving}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <Check size={15} />
            {saving ? "Saving..." : "Save Address"}
          </button>
        </div>
      )}

      {addresses.length === 0 && !showForm ? (
        <p className="text-sm text-muted-foreground text-center py-6">No saved addresses</p>
      ) : (
        <div className="space-y-2.5">
          {addresses.map((addr: any) => (
            <div key={addr.id} className="flex items-start gap-3 p-3 rounded-xl border border-border/50 hover:border-border transition-colors">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <MapPin size={16} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{addr.label}</span>
                  {addr.is_default && (
                    <span className="text-[10px] font-medium text-accent bg-accent/10 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                      <Star size={9} /> Default
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium text-foreground mt-1">{addr.full_name}</p>
                <p className="text-xs text-muted-foreground">{addr.address}</p>
                <p className="text-xs text-muted-foreground">{addr.phone}{addr.district ? ` • ${addr.district}` : ""}</p>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                {!addr.is_default && (
                  <button onClick={() => setDefault(addr.id)} className="p-1.5 text-muted-foreground hover:text-accent rounded-md hover:bg-muted transition-colors" title="Set as default">
                    <Star size={14} />
                  </button>
                )}
                <button onClick={() => handleDelete(addr.id)} className="p-1.5 text-muted-foreground hover:text-destructive rounded-md hover:bg-muted transition-colors" title="Delete">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedAddresses;
