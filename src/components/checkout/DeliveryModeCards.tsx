import { Rocket, Package, Shield, Truck } from "lucide-react";
import type { DeliveryGroup } from "@/hooks/useCheckoutDelivery";

const ICONS: Record<string, any> = { rocket: Rocket, package: Package, shield: Shield, truck: Truck };

interface Props {
  groups: DeliveryGroup[];
  formatPrice: (n: number) => string;
}

const DeliveryModeCards = ({ groups }: Props) => {
  if (!groups.length) return null;
  const isSplit = groups.length > 1;
  // Policy: only ONE shipping charge applies (the highest). Others are free.
  const maxCharge = Math.max(...groups.map((g) => g.charge));
  let chargedShown = false;

  return (
    <div className="rounded-lg border border-border bg-muted/30 divide-y divide-border overflow-hidden">
      {groups.map((g) => {
        const Icon = ICONS[g.mode.icon || "truck"] || Truck;
        const isCharged = !chargedShown && g.charge === maxCharge;
        if (isCharged) chargedShown = true;
        return (
          <div key={g.mode.id} className="flex items-center gap-2.5 px-3 py-2.5">
            <Icon className="h-4 w-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-tight truncate">
                {g.mode.name}
                <span className="text-muted-foreground font-normal"> · {g.mode.delivery_time}</span>
              </p>
              {isSplit && (
                <p className="text-[11px] text-muted-foreground truncate">
                  {g.productNames.length} item{g.productNames.length > 1 ? "s" : ""}
                </p>
              )}
            </div>
            <p className="text-sm font-semibold text-primary tabular-nums shrink-0">
              {isCharged ? `৳${g.charge}` : "Free"}
            </p>
          </div>
        );
      })}
      {isSplit && (
        <p className="px-3 py-1.5 text-[11px] text-muted-foreground bg-background/50">
          Ships in {groups.length} parts · only one shipping charge applies
        </p>
      )}
    </div>
  );
};

export default DeliveryModeCards;
