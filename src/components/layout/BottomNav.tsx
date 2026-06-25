import { Link, useLocation } from "@/lib/router-adapter";
import { Home, Gift, User, Flower2, Zap } from "lucide-react";
import { useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type NavItem = {
  key: string;
  to: string;
  label: string;
  icon: typeof Home;
  /** Returns true if this tab should be highlighted for the current location. */
  match: (pathname: string, search: string) => boolean;
};

const BottomNav = () => {
  const location = useLocation();
  const { t } = useLanguage();
  const reduced = useReducedMotion();

  const hideBottomNav =
    location.pathname.startsWith("/checkout") ||
    location.pathname.startsWith("/product/") ||
    location.pathname.startsWith("/cart");

  const items: NavItem[] = useMemo(
    () => [
      {
        key: "home",
        to: "/",
        label: t("home"),
        icon: Home,
        match: (p) => p === "/",
      },
      {
        key: "same-day",
        to: "/shop?same_day=true",
        label: "Same Day",
        icon: Zap,
        match: (p, s) => p === "/shop" && new URLSearchParams(s).get("same_day") === "true",
      },
      {
        key: "custom",
        to: "/custom-bouquet",
        label: "Custom",
        icon: Flower2,
        match: (p) => p === "/custom-bouquet" || p.startsWith("/custom-bouquet/"),
      },
      {
        key: "all-gifts",
        to: "/all-gifts",
        label: "All Gifts",
        icon: Gift,
        match: (p) => p === "/all-gifts" || p.startsWith("/all-gifts/"),
      },
      {
        key: "account",
        to: "/account",
        label: t("account"),
        icon: User,
        match: (p) => p === "/account" || p.startsWith("/account/"),
      },
    ],
    [t]
  );

  // Compute the single active key. Matches are checked in priority order so
  // direct-link / refresh always lands on a single highlighted tab.
  const activeKey = useMemo(() => {
    const found = items.find((it) => it.match(location.pathname, location.search));
    return found?.key ?? null;
  }, [items, location.pathname, location.search]);

  const iconSize = 21;
  const strokeW = 1.5;
  const activeStrokeW = 1.9;

  // Animation classes are gated by `reduced` so reduced-motion users get a
  // calm, instant UI.
  // Snappy transitions — 150ms keeps the UI feeling instant on first tap while
  // still providing a polished feedback animation. Reduced-motion users skip
  // animations entirely.
  const transitionItem = reduced ? "" : "transition-colors duration-150 ease-out active:scale-95";
  const transitionIconWrap = reduced
    ? ""
    : "transition-transform duration-150 ease-out";
  const transitionLabel = reduced ? "" : "transition-colors duration-150";
  const transitionDot = reduced ? "" : "transition-all duration-150 ease-out";

  const itemClass = (active: boolean) =>
    `group relative flex flex-col items-center justify-center gap-[2px] ${transitionItem} min-w-[44px] min-h-[50px] ${
      active ? "text-primary" : "text-muted-foreground hover:text-foreground"
    }`;

  const iconWrapClass = (active: boolean) => {
    if (reduced) return "relative flex items-center justify-center";
    return `relative flex items-center justify-center ${transitionIconWrap} ${
      active ? "-translate-y-0.5 scale-110" : "scale-100 group-active:scale-95"
    }`;
  };

  const labelClass = (active: boolean) =>
    `text-[10px] leading-none tracking-wide ${transitionLabel} ${
      active ? "font-semibold opacity-100" : "font-medium opacity-80"
    }`;

  const ActiveDot = ({ active }: { active: boolean }) => (
    <span
      className={`absolute -bottom-1 h-[3px] rounded-full bg-primary ${transitionDot} ${
        active ? "w-4 opacity-100" : "w-0 opacity-0"
      }`}
    />
  );

  const isCustomActive = activeKey === "custom";

  if (hideBottomNav) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      aria-label="Primary"
    >
      <div className="relative border-t border-border/50 bg-background/95 backdrop-blur-md shadow-[0_-2px_12px_rgba(0,0,0,0.05)]">
        <div className="grid grid-cols-5 h-[64px]">
          {items.map((item) => {
            const active = activeKey === item.key;
            const Icon = item.icon;

            // Center "Custom" cell renders the floating circular button.
            if (item.key === "custom") {
              return (
                <div
                  key={item.key}
                  className="relative flex flex-col items-center justify-end pb-1"
                >
                  {!reduced && (
                    <span
                      aria-hidden
                      className="absolute -top-3 w-[46px] h-[46px] rounded-full bg-primary/30 animate-ping opacity-60 pointer-events-none"
                      style={{ animationDuration: "2.4s" }}
                    />
                  )}
                  <Link
                    to={item.to}
                    aria-current={active ? "page" : undefined}
                    className={`absolute -top-3 flex items-center justify-center w-[46px] h-[46px] rounded-full shadow-lg ${
                      reduced
                        ? ""
                        : "transition-transform duration-150 ease-out active:scale-90"
                    } ${
                      active
                        ? `bg-primary text-primary-foreground ${
                            reduced ? "" : "-translate-y-0.5 shadow-primary/40 shadow-xl"
                          }`
                        : "bg-primary/90 text-primary-foreground hover:bg-primary"
                    }`}
                  >
                    <Icon
                      size={20}
                      strokeWidth={1.8}
                      className={
                        reduced
                          ? ""
                          : `transition-transform duration-500 ease-out ${
                              isCustomActive ? "rotate-[360deg]" : "group-hover:rotate-12"
                            }`
                      }
                    />
                    <span className="absolute inset-0 rounded-full border-[3px] border-background" />
                  </Link>
                  <span className={labelClass(active)}>{item.label}</span>
                </div>
              );
            }

            return (
              <Link
                key={item.key}
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={itemClass(active)}
              >
                <span className={iconWrapClass(active)}>
                  <Icon size={iconSize} strokeWidth={active ? activeStrokeW : strokeW} />
                </span>
                <span className={labelClass(active)}>{item.label}</span>
                <ActiveDot active={active} />
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
