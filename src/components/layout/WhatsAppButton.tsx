import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useLocation } from "@/lib/router-adapter";
import whatsappIcon from "@/assets/whatsapp.png";

const WhatsAppButton = () => {
  const { settings } = useSiteSettings();
  const { pathname } = useLocation();
  const whatsappNumber = settings.whatsapp_number || "";

  if (!whatsappNumber) return null;

  const cleanNumber = whatsappNumber.replace(/[^0-9]/g, "");

  // Lift above the sticky step navigator on the Custom Bouquet page
  const liftedForBouquet = pathname.startsWith("/custom-bouquet");

  return (
    <a
      href={`https://wa.me/${cleanNumber}?text=Hi%20Pikooly!%20I'd%20like%20to%20order`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Live chat on WhatsApp"
      className={`group fixed ${liftedForBouquet ? "bottom-[140px]" : "bottom-[80px]"} md:bottom-6 right-4 z-40 flex items-center justify-center w-12 h-12 rounded-full bg-white shadow-[0_8px_20px_-6px_rgba(16,150,70,0.55)] hover:shadow-[0_12px_24px_-6px_rgba(16,150,70,0.7)] hover:scale-105 active:scale-95 transition-all duration-300`}
    >
      <span
        aria-hidden
        className="absolute inset-0 rounded-full bg-[hsl(142,70%,45%)] opacity-40 animate-ping pointer-events-none"
        style={{ animationDuration: "2.4s" }}
      />

      <img
        src={whatsappIcon.src}
        alt=""
        aria-hidden="true"
        className="relative w-12 h-12 object-contain"
      />

      <span aria-hidden className="absolute top-0 right-0 flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75 animate-ping" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-white" />
      </span>

      <span className="absolute right-full mr-2 px-2.5 py-1 rounded-md bg-foreground text-background text-xs font-medium whitespace-nowrap opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 pointer-events-none shadow-md">
        Live chat
      </span>
    </a>
  );
};

export default WhatsAppButton;
