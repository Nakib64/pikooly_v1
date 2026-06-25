import { motion } from "framer-motion";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const PageLoader = () => {
  const { settings } = useSiteSettings();
  const brandName = settings.store_name || settings.site_title || "Pikooly";
  const letter = (brandName.trim()[0] || "P").toUpperCase();

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 sm:gap-5 md:gap-6 px-4 bg-background/80 backdrop-blur-sm pointer-events-none">
      <motion.div
        className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 flex items-center justify-center"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Outer soft glow */}
        <motion.div
          className="absolute inset-0 rounded-full blur-2xl"
          style={{
            background:
              "radial-gradient(circle, hsl(var(--primary) / 0.45) 0%, transparent 70%)",
          }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.9, 0.6] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Rotating gradient ring */}
        <motion.div
          className="absolute inset-0 rounded-full p-[2px]"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0%, hsl(var(--primary)) 35%, hsl(var(--primary-glow)) 55%, transparent 80%)",
            WebkitMask:
              "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))",
            mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
        />

        {/* Inner static track */}
        <div className="absolute inset-[6px] rounded-full border border-border/60 bg-background/80 backdrop-blur-sm shadow-inner" />

        {/* Letter with subtle pulse */}
        <motion.span
          className="relative text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-none bg-clip-text text-transparent"
          style={{
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
            backgroundImage:
              "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary-glow)) 100%)",
            letterSpacing: "-0.04em",
          }}
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          {letter}
        </motion.span>

        {/* Orbit dot */}
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: 360 }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
        >
          <div
            className="absolute left-1/2 -top-1 -translate-x-1/2 w-2 h-2 rounded-full"
            style={{
              background: "hsl(var(--primary))",
              boxShadow: "0 0 12px hsl(var(--primary) / 0.8)",
            }}
          />
        </motion.div>
      </motion.div>

      {/* Animated dots */}
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-primary/60"
            animate={{ opacity: [0.2, 1, 0.2], y: [0, -3, 0] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default PageLoader;
