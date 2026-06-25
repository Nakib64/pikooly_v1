import { useState } from "react";

import { useSiteSettings } from "@/hooks/useSiteSettings";
import medal1 from "@/assets/medal-1.png";
import medal2 from "@/assets/medal-2.png";

const AboutSection = () => {
  const [expanded, setExpanded] = useState(false);
  const { settings } = useSiteSettings();

  const title = settings.about_title || "Pikooly: Online Flower Shop in Bangladesh";
  const fullContent = (settings.about_short_text || "") + (settings.about_full_text || "");

  return (
    <section className="pt-3 sm:pt-4 md:pt-6 pb-1 section-container" aria-label="About Pikooly" style={{ contain: "layout style" }}>
      <div className="mb-1.5 sm:mb-2">
        <h2 className="text-foreground font-bold leading-tight text-[15px] sm:text-base md:text-[17px]">
          {title}
        </h2>
      </div>
      <div
        className={`text-[13px] sm:text-sm md:text-[15px] text-muted-foreground leading-relaxed sm:leading-[1.7] rich-text-content text-justify hyphens-auto ${!expanded ? "line-clamp-2" : ""}`}
        dangerouslySetInnerHTML={{ __html: fullContent }}
      />
      <div className="text-center mt-1.5 sm:mt-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-muted-foreground text-[13px] sm:text-sm underline underline-offset-4 hover:text-foreground transition-colors"
        >
          {expanded ? "Read Less" : "Read More..."}
        </button>
      </div>

      <div className="flex items-center gap-3 sm:gap-4 mt-2 sm:mt-3">
        <img src={medal1.src} alt="Pikooly Badge" width="140" height="48" className="w-[100px] h-[34px] sm:w-[130px] sm:h-[44px] md:w-[150px] md:h-[50px] object-contain" loading="lazy" decoding="async" />
        <img src={medal2.src} alt="Pikooly Badge" width="140" height="48" className="w-[100px] h-[34px] sm:w-[130px] sm:h-[44px] md:w-[150px] md:h-[50px] object-contain" loading="lazy" decoding="async" />
      </div>
    </section>

  );
};

export default AboutSection;
