import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SellerRecord {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  phone: string;
  district_id: string;
  is_active: boolean;
  avatar_url?: string | null;
  name_updated_at?: string | null;
  phone_updated_at?: string | null;
  password_changed_at?: string | null;
  avatar_updated_at?: string | null;
  created_at?: string | null;
  payout_method?: string | null;
  bkash_number?: string | null;
  bank_name?: string | null;
  bank_account_name?: string | null;
  bank_account_number?: string | null;
  bank_branch?: string | null;
  bank_routing_number?: string | null;
  payout_updated_at?: string | null;
  can_edit_seo?: boolean | null;
}

const SELLER_COLS =
  "id, user_id, name, email, phone, district_id, is_active, avatar_url, name_updated_at, phone_updated_at, password_changed_at, avatar_updated_at, created_at, payout_method, bkash_number, bank_name, bank_account_name, bank_account_number, bank_branch, bank_routing_number, payout_updated_at, can_edit_seo";

export const useSeller = () => {
  const { user, loading: authLoading } = useAuth();
  const [seller, setSeller] = useState<SellerRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("sellers")
      .select(SELLER_COLS)
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) setSeller(data as SellerRecord);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setSeller(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      let { data } = await supabase
        .from("sellers")
        .select(SELLER_COLS)
        .eq("user_id", user.id)
        .maybeSingle();

      // Fallback: claim by email (security-definer RPC links user_id)
      if (!data && user.email) {
        const { data: claimed } = await supabase.rpc("claim_seller_by_email");
        if (claimed) data = claimed as any;
      }

      // Fallback: if there is pending signup data stored from the signup form
      // (link-based verification flow), create the pending seller record now.
      if (!data) {
        try {
          const raw = localStorage.getItem("pending_seller_signup");
          if (raw) {
            const pending = JSON.parse(raw);
            if (!pending.email || pending.email === user.email) {
              await supabase.rpc("create_pending_seller", {
                _district_id: pending.district_id,
                _category_ids: pending.category_ids || [],
                _trade_license: pending.trade_license || null,
                _subcategory_ids:
                  pending.subcategory_ids && pending.subcategory_ids.length > 0
                    ? pending.subcategory_ids
                    : null,
              } as any);
              localStorage.removeItem("pending_seller_signup");
              const { data: created } = await supabase
                .from("sellers")
                .select(SELLER_COLS)
                .eq("user_id", user.id)
                .maybeSingle();
              if (created) data = created as any;
            }
          }
        } catch {
          // Ignore — admin can still set up the seller manually.
        }
      }

      if (!cancelled) {
        setSeller((data as SellerRecord) || null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  // Refresh seller when window regains focus (catches admin activation)
  useEffect(() => {
    if (!user) return;
    const onFocus = () => { refresh(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [user, refresh]);

  // Subscribe to realtime updates on this seller's row
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`seller-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "sellers", filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.new) setSeller(payload.new as SellerRecord);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return { seller, loading: authLoading || loading, isSeller: !!seller, refresh };
};
