"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "@/lib/router-adapter";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const AuthVerify = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token");
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) { setState("error"); setError("Missing token"); return; }
    (async () => {
      const { data, error } = await supabase.functions.invoke("auth-verify-token", { body: { token } });
      if (error || !data?.success) { setState("error"); setError(data?.error || error?.message || "Invalid link"); return; }
      if (data.token_hash) {
        const { error: vErr } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: data.otp_type || "magiclink" });
        if (vErr) { setState("error"); setError(vErr.message); return; }
      }
      setState("ok");
      setTimeout(() => navigate(data.purpose === "seller_verify" ? "/seller/dashboard" : "/account"), 800);
    })();
  }, [token]);

  return (
    <div className="min-h-[45vh] flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center space-y-4">
        {state === "loading" && (<><Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" /><p>Verifying your email…</p></>)}
        {state === "ok" && (<><CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" /><h1 className="text-xl font-semibold">Email verified!</h1><p className="text-sm text-muted-foreground">Redirecting…</p></>)}
        {state === "error" && (<><XCircle className="w-12 h-12 text-destructive mx-auto" /><h1 className="text-xl font-semibold">Verification failed</h1><p className="text-sm text-muted-foreground">{error}</p><Button onClick={() => navigate("/auth")}>Back to login</Button></>)}
      </div>
    </div>
  );
};

export default AuthVerify;
