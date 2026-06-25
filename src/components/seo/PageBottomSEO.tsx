import { useState } from "react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface PageBottomSEOProps {
  prefix: string; // e.g. "events", "photography", "bouquet"
  defaultTitle?: string;
  defaultDescription?: string;
}

const PageBottomSEO = ({ prefix, defaultTitle, defaultDescription }: PageBottomSEOProps) => {
  const { settings } = useSiteSettings();
  const [expanded, setExpanded] = useState(false);

  const title = settings[`${prefix}_page_title`] || defaultTitle || "";
  const description = settings[`${prefix}_page_description`] || defaultDescription || "";
  const image1 = settings[`${prefix}_page_image_1`];
  const image2 = settings[`${prefix}_page_image_2`];
  const image3 = settings[`${prefix}_page_image_3`];
  const motto = settings[`${prefix}_page_motto`] || "";

  // Build FAQ items dynamically
  const faqItems: { question: string; answer: string }[] = [];
  for (let i = 1; i <= 20; i++) {
    const q = settings[`${prefix}_page_faq_${i}_question`];
    const a = settings[`${prefix}_page_faq_${i}_answer`];
    if (q && a) faqItems.push({ question: q, answer: a });
  }

  const images = [image1, image2, image3].filter(Boolean) as string[];
  const hasContent = title || description || faqItems.length > 0 || images.length > 0;

  if (!hasContent) return null;

  return (
    <section className="py-6 sm:py-8 md:py-10 lg:py-12 section-container" aria-label={title || "About this service"}>
      {/* Title */}
      {title && (
        <h2 className="section-heading font-display font-bold text-foreground mb-3 sm:mb-4">
          {title}
        </h2>
      )}

      {/* Description with Read More */}
      {description && (
        <>
          <div
            className={`text-[13px] sm:text-sm md:text-[15px] lg:text-base text-muted-foreground leading-relaxed sm:leading-[1.8] rich-text-content ${!expanded ? "line-clamp-2" : ""}`}
            dangerouslySetInnerHTML={{ __html: description }}
          />
          <div className="text-center mt-4">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-primary font-semibold text-sm sm:text-base hover:underline underline-offset-4"
            >
              {expanded ? "Read Less" : "Read More..."}
            </button>
          </div>
        </>
      )}

      {/* 3 Images + Motto */}
      {(images.length > 0 || motto) && (
        <div className="mt-6 sm:mt-8">
          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
              {images.map((img, i) => (
                <div key={i} className="aspect-[4/3] rounded-xl overflow-hidden">
                  <img
                    src={img}
                    alt={`${title || prefix} image ${i + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              ))}
            </div>
          )}
          {motto && (
            <p className="text-center text-sm sm:text-base md:text-lg font-medium text-foreground mt-4 sm:mt-5 italic">
              "{motto}"
            </p>
          )}
        </div>
      )}

      {/* FAQ Section */}
      {faqItems.length > 0 && (
        <div className="mt-8 sm:mt-10">
          <h3 className="section-heading font-display font-semibold text-foreground mb-4 sm:mb-5 text-center">
            Frequently Asked Questions
          </h3>
          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="space-y-2 sm:space-y-3">
              {faqItems.map((item, i) => (
                <AccordionItem
                  key={i}
                  value={`faq-${i}`}
                  className="border border-border/50 rounded-xl px-3 sm:px-4 bg-card data-[state=open]:border-primary/30 transition-all"
                >
                  <AccordionTrigger className="text-xs sm:text-sm md:text-base font-medium text-foreground hover:no-underline py-3 sm:py-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-secondary text-muted-foreground text-[10px] sm:text-xs font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-left">{item.question}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-xs sm:text-sm text-muted-foreground pb-3 sm:pb-4 pl-8 sm:pl-10 leading-relaxed">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      )}
    </section>
  );
};

export default PageBottomSEO;
