const defaultFaqItems = [
  { question: "What is Pikooly?", answer: "Pikooly is your trusted online destination for fresh flowers, delicious cakes, and thoughtful gifts in Bangladesh." },
  { question: "Do you offer same-day delivery?", answer: "Yes! We offer same-day delivery in Dhaka for orders placed before 3 PM." },
  { question: "Are the flowers fresh?", answer: "Absolutely! We source our flowers from the finest local and imported suppliers. Every bouquet is handcrafted fresh on the day of delivery." },
];
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQSection = () => {
  const { ref, isVisible } = useScrollAnimation();
  const { settings } = useSiteSettings();
  const { t } = useLanguage();

  const sectionTitle = settings.faq_section_title || t("faq");
  const sectionSubtitle = settings.faq_section_subtitle || t("faq_subtitle");

  // Build FAQ items from settings dynamically (unlimited)
  const dynamicFaqs: { question: string; answer: string }[] = [];
  for (let i = 1; i <= 100; i++) {
    const q = settings[`faq_${i}_question`];
    const a = settings[`faq_${i}_answer`];
    if (q && a) dynamicFaqs.push({ question: q, answer: a });
  }

  const faqItems = dynamicFaqs.length > 0 ? dynamicFaqs : defaultFaqItems;

  return (
    <section ref={ref} className="pt-2 sm:pt-3 md:pt-4 pb-4 sm:pb-6 md:pb-8 lg:pb-10 section-container" aria-label="Frequently Asked Questions">
      <div className="max-w-3xl mx-auto">
        <div className="mb-4 sm:mb-6 md:mb-8 text-center">

          <span className="gold-rule mb-2.5">Need Help?</span>
          <h2 className="display-heading text-foreground" style={{ fontSize: "clamp(1.5rem, 3vw + 0.5rem, 2.5rem)" }}>
            {sectionTitle}
          </h2>
          <p className="text-muted-foreground text-xs sm:text-sm">
            {sectionSubtitle}
          </p>
        </div>

        <Accordion type="single" collapsible className="space-y-2 sm:space-y-3">
          {faqItems.map((item, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="border border-border/50 rounded-xl px-3 sm:px-4 bg-card data-[state=open]:border-primary/30 transition-all"
            >
              <AccordionTrigger className="text-xs sm:text-sm md:text-base font-medium text-foreground hover:no-underline py-3 sm:py-4 [&[data-state=open]>svg]:rotate-180">
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
    </section>
  );
};

export default FAQSection;
