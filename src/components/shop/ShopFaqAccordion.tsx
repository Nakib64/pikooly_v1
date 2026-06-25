import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface Faq {
  question: string;
  answer: string;
}

interface ShopFaqAccordionProps {
  faqs: Faq[];
  contentName?: string;
}

const ShopFaqAccordion = ({ faqs, contentName }: ShopFaqAccordionProps) => {
  if (!Array.isArray(faqs) || faqs.length === 0) return null;
  return (
    <div className="mt-6 mb-6">
      <div className="text-center mb-4">
        <h2 className="text-xl md:text-2xl font-display font-semibold text-foreground">
          Frequently Asked Questions
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Find answers to common questions about {contentName}
        </p>
      </div>
      <div className="max-w-3xl mx-auto">
        <Accordion type="single" collapsible className="w-full space-y-3">
          {faqs.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="border border-border/60 rounded-xl px-5 bg-card shadow-sm data-[state=open]:shadow-md transition-shadow duration-200"
            >
              <AccordionTrigger className="text-sm md:text-base font-medium text-left text-foreground py-4 hover:no-underline">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground pb-4 leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
};

export default ShopFaqAccordion;
