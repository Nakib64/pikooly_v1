import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CloudUpload, CheckCircle2, AlertCircle, Search } from "lucide-react";

type Target = { table: string; column: string; isArr?: boolean; isSettings?: boolean };
type TargetResult = {
  target: Target;
  status: "pending" | "running" | "done" | "error";
  found: number;
  migrated: number;
  failed: number;
  errors: string[];
  message?: string;
};

export default function MigrateStorageButton() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TargetResult[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [mode, setMode] = useState<"dry" | "live" | null>(null);

  const totals = results.reduce(
    (a, r) => ({
      found: a.found + r.found,
      migrated: a.migrated + r.migrated,
      failed: a.failed + r.failed,
    }),
    { found: 0, migrated: 0, failed: 0 },
  );
  const progress = results.length > 0 ? Math.round((currentIdx / results.length) * 100) : 0;

  const run = async (dryRun: boolean) => {
    setRunning(true);
    setMode(dryRun ? "dry" : "live");
    setResults([]);
    setCurrentIdx(0);

    try {
      // Step 1: fetch target list
      const list = await supabase.functions.invoke("migrate-storage-to-cloudinary", { body: { mode: "list" } });
      if (list.error) throw new Error(list.error.message);
      const targets: Target[] = list.data?.targets ?? [];

      const init: TargetResult[] = targets.map((t) => ({
        target: t, status: "pending", found: 0, migrated: 0, failed: 0, errors: [],
      }));
      setResults(init);

      // Step 2: process one at a time
      for (let i = 0; i < targets.length; i++) {
        setCurrentIdx(i);
        setResults((prev) => prev.map((r, idx) => idx === i ? { ...r, status: "running" } : r));

        const { data, error } = await supabase.functions.invoke("migrate-storage-to-cloudinary", {
          body: { dryRun, target: targets[i] },
        });

        setResults((prev) => prev.map((r, idx) => {
          if (idx !== i) return r;
          if (error || data?.error) {
            return { ...r, status: "error", message: error?.message || data?.error || "Failed" };
          }
          const res = data.result;
          return {
            ...r, status: "done",
            found: res.found, migrated: res.migrated, failed: res.failed,
            errors: res.errors ?? [],
          };
        }));
      }
      setCurrentIdx(targets.length);
      toast.success(dryRun ? "Scan complete" : "Migration complete");
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="rounded-lg border border-border p-4 space-y-4">
      <div className="flex items-start gap-3">
        <CloudUpload className="h-5 w-5 text-primary mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold">Migrate old Supabase images to Cloudinary</h3>
          <p className="text-sm text-muted-foreground">
            Scans the database for old Supabase storage URLs and re-uploads them to Cloudinary.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={running} onClick={() => run(true)}>
          {running && mode === "dry" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
          Scan (dry run)
        </Button>
        <Button disabled={running} onClick={() => run(false)}>
          {running && mode === "live" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CloudUpload className="h-4 w-4 mr-2" />}
          Migrate now
        </Button>
      </div>

      {results.length > 0 && (
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">
                {running ? `Processing ${currentIdx + 1} / ${results.length}…` : `Done · ${results.length} / ${results.length}`}
              </span>
              <span className="text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded border border-border p-2">
              <div className="text-xs text-muted-foreground">Found</div>
              <div className="text-lg font-semibold">{totals.found}</div>
            </div>
            <div className="rounded border border-border p-2 bg-green-50 dark:bg-green-950/30">
              <div className="text-xs text-muted-foreground">Migrated</div>
              <div className="text-lg font-semibold text-green-700 dark:text-green-400">{totals.migrated}</div>
            </div>
            <div className="rounded border border-border p-2 bg-red-50 dark:bg-red-950/30">
              <div className="text-xs text-muted-foreground">Failed</div>
              <div className="text-lg font-semibold text-red-700 dark:text-red-400">{totals.failed}</div>
            </div>
          </div>

          <div className="max-h-80 overflow-auto rounded border border-border bg-muted/30 p-2 text-xs">
            {results.map((r, i) => {
              const key = `${r.target.table}.${r.target.column}`;
              const icon =
                r.status === "running" ? <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" /> :
                r.status === "error" ? <AlertCircle className="h-3.5 w-3.5 text-red-600" /> :
                r.status === "done" ? (r.failed > 0
                  ? <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                  : <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />) :
                <span className="inline-block h-3.5 w-3.5 rounded-full border border-muted-foreground/30" />;
              return (
                <div key={i} className="flex items-start gap-2 py-1 border-b border-border/40 last:border-0">
                  {icon}
                  <div className="flex-1 font-mono">
                    <div className="flex justify-between gap-2">
                      <span>{key}</span>
                      {r.status === "done" && (
                        <span className="text-muted-foreground">
                          found {r.found} · migrated {r.migrated} · failed {r.failed}
                        </span>
                      )}
                    </div>
                    {r.message && <div className="text-red-600 mt-0.5">{r.message}</div>}
                    {r.errors.length > 0 && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-amber-700">
                          {r.errors.length} error{r.errors.length > 1 ? "s" : ""}
                        </summary>
                        <ul className="mt-1 pl-3 space-y-0.5">
                          {r.errors.slice(0, 10).map((e, j) => <li key={j} className="text-red-600">• {e}</li>)}
                          {r.errors.length > 10 && <li className="text-muted-foreground">…and {r.errors.length - 10} more</li>}
                        </ul>
                      </details>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
