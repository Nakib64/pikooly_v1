import { useState } from "react";
import { useSearchParams, useNavigate } from "@/lib/router-adapter";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const AuthReset = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token");
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!token) { toast.error("Missing reset token"); return; }
    if (pwd.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (pwd !== pwd2) { toast.error("Passwords do not match"); return; }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("auth-verify-token", { body: { token, new_password: pwd } });
    if (error || !data?.success) { toast.error(data?.error || error?.message || "Reset failed"); setLoading(false); return; }
    toast.success("Password updated. Signing you in…");
    if (data.token_hash) {
      const { error: vErr } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: data.otp_type || "magiclink" });
      if (!vErr) { navigate("/account"); return; }
    }
    navigate("/auth");
  };

  if (!token) return <div className="min-h-[45vh] flex items-center justify-center"><p>Invalid reset link.</p></div>;

  return (
    <div className="min-h-[45vh] flex items-center justify-center p-6">
      <div className="max-w-sm w-full space-y-4">
        <h1 className="text-2xl font-semibold text-center">Set a new password</h1>
        <div><Label>New password</Label><Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} /></div>
        <div><Label>Confirm password</Label><Input type="password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} /></div>
        <Button className="w-full" onClick={submit} disabled={loading}>{loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Update password</Button>
      </div>
    </div>
  );
};

export default AuthReset;
