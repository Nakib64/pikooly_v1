import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle, Plug } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  formValues: Record<string, any>;
}

const TestR2ConnectionButton = ({ formValues }: Props) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const test = async () => {
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("r2-validate", {
        body: {
          config: {
            r2_account_id: formValues.r2_account_id || "",
            r2_access_key_id: formValues.r2_access_key_id || "",
            r2_secret_access_key: formValues.r2_secret_access_key || "",
            r2_bucket_name: formValues.r2_bucket_name || "",
            r2_public_url: formValues.r2_public_url || "",
            r2_endpoint: formValues.r2_endpoint || "",
          },
        },
      });
      if (error) {
        // supabase.functions.invoke wraps non-2xx responses; try to extract message
        const msg = (error as any)?.context?.body?.message || error.message || "Validation failed";
        setResult({ ok: false, message: msg });
        toast.error(msg);
        return;
      }
      const ok = !!data?.ok;
      const message = data?.message || (ok ? "Connection successful" : "Validation failed");
      setResult({ ok, message });
      if (ok) toast.success(message);
      else toast.error(message);
    } catch (e: any) {
      const msg = e?.message || "Network error";
      setResult({ ok: false, message: msg });
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 space-y-3 border-t border-border pt-6">
      <div>
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Plug className="h-4 w-4" /> Test R2 Connection
        </h4>
        <p className="text-xs text-muted-foreground mt-1">
          Verifies the endpoint, bucket name, access key, and secret by sending a signed HEAD request to your bucket.
        </p>
      </div>

      <Button onClick={test} disabled={loading} variant="outline">
        {loading ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Testing…</>
        ) : (
          <>Test Connection</>
        )}
      </Button>

      {result && (
        <div
          className={`flex items-start gap-2 rounded-md border p-3 text-sm ${
            result.ok
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-destructive/40 bg-destructive/10 text-destructive"
          }`}
        >
          {result.ok ? (
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          )}
          <div className="min-w-0">
            <div className="font-medium">
              {result.ok ? "R2 connection looks good" : "R2 connection failed"}
            </div>
            <div className="text-xs opacity-90 break-words">{result.message}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestR2ConnectionButton;
