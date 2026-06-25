import { useEffect } from "react";
import { useLocation } from "@/lib/router-adapter";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "affiliate_ref";
const TS_KEY = "affiliate_ref_ts";
const CLICK_KEY = "affiliate_click_logged";
const DEFAULT_DAYS = 30;

export const getStoredAffiliateCode = (cookieDays = DEFAULT_DAYS): string | null => {
  try {
    const code = localStorage.getItem(STORAGE_KEY);
    const ts = parseInt(localStorage.getItem(TS_KEY) || "0", 10);
    if (!code || !ts) return null;
    const ageDays = (Date.now() - ts) / (1000 * 60 * 60 * 24);
    if (ageDays > cookieDays) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(TS_KEY);
      return null;
    }
    return code;
  } catch {
    return null;
  }
};

const AffiliateTracker = () => {
  const { search, pathname } = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(search);
    const ref = params.get("ref");
    if (!ref || ref.length < 3 || ref.length > 32) return;
    const code = ref.toUpperCase();
    try {
      localStorage.setItem(STORAGE_KEY, code);
      localStorage.setItem(TS_KEY, Date.now().toString());
    } catch {}
    // De-dupe click per code per 6h
    const last = localStorage.getItem(CLICK_KEY + code);
    if (last && Date.now() - Number(last) < 6 * 60 * 60 * 1000) return;
    (async () => {
      const { data: affRows } = await supabase.rpc("lookup_affiliate_by_code", { _code: code });
      const aff = Array.isArray(affRows) ? affRows[0] : affRows;
      if (!aff?.id) return;
      await supabase.from("affiliate_clicks").insert({
        affiliate_id: aff.id,
        affiliate_code: code,
        user_agent: navigator.userAgent,
        referer: document.referrer || null,
        landing_path: pathname + search,
      });
      try { localStorage.setItem(CLICK_KEY + code, Date.now().toString()); } catch {}
    })();
  }, [search, pathname]);
  return null;
};

export default AffiliateTracker;
