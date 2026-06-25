import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useReducedMotion, setReducedMotionPreference } from "@/hooks/useReducedMotion";

const ReduceMotionToggle = () => {
  const reduced = useReducedMotion();
  const [hasOverride, setHasOverride] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setHasOverride(window.localStorage.getItem("reduceMotion") !== null);
  }, []);

  const onChange = (checked: boolean) => {
    setReducedMotionPreference(checked);
    setHasOverride(true);
  };

  const onReset = () => {
    setReducedMotionPreference(null);
    setHasOverride(false);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4 sm:p-5">
      <h2 className="text-base font-display font-semibold text-foreground mb-3 flex items-center gap-2">
        <Sparkles size={18} className="text-primary" />
        Preferences
      </h2>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Reduce motion</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Turn off bottom-nav and page transition animations.
            {hasOverride ? (
              <button
                type="button"
                onClick={onReset}
                className="ml-1 text-primary underline underline-offset-2"
              >
                Use system setting
              </button>
            ) : (
              <span className="ml-1 italic">Following your system setting.</span>
            )}
          </p>
        </div>
        <Switch checked={reduced} onCheckedChange={onChange} aria-label="Reduce motion" />
      </div>
    </div>
  );
};

export default ReduceMotionToggle;
