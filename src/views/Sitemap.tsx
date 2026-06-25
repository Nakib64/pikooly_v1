"use client";
import { useEffect, useState } from "react";
import { Link } from "@/lib/router-adapter";
import { ChevronRight, Home } from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";

interface Section {
  id: string;
  title: string;
  sort_order: number;
  is_active: boolean;
}
interface LinkRow {
  id: string;
  section_id: string;
  label: string;
  url: string;
  sort_order: number;
  is_active: boolean;
}

const SitemapPage = () => {
  const [sections, setSections] = useState<Section[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);

  useEffect(() => {
    document.title = "Sitemap | Pikooly";
    (async () => {
      const [s, l] = await Promise.all([
        supabase.from("sitemap_sections").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("sitemap_links").select("*").eq("is_active", true).order("sort_order"),
      ]);
      setSections((s.data as Section[]) || []);
      setLinks((l.data as LinkRow[]) || []);
    })();
  }, []);

  const LinkCol = ({ items }: { items: { label: string; url: string }[] }) => {
    if (items.length === 0) {
      return <p className="px-4 py-4 text-sm text-muted-foreground">No links added.</p>;
    }
    const mid = Math.ceil(items.length / 2);
    const cols = [items.slice(0, mid), items.slice(mid)];
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 px-4 py-4">
        {cols.map((col, ci) => (
          <ul key={ci} className="space-y-2">
            {col.map((l, i) => (
              <li key={i}>
                <Link to={l.url} className="text-sm text-primary hover:underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        ))}
      </div>
    );
  };

  return (
    <div className="section-container py-6 md:py-10">
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
        <Link to="/" className="inline-flex items-center gap-1 text-primary hover:underline">
          <Home size={14} /> Home
        </Link>
        <ChevronRight size={14} />
        <span className="text-foreground">Sitemap</span>
      </nav>

      <h1 className="text-2xl md:text-3xl font-display font-semibold text-center text-primary mb-6">
        Sitemap
      </h1>

      <div className="max-w-5xl mx-auto border border-border rounded-lg overflow-hidden bg-card">
        {sections.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Sitemap is being prepared.</p>
        ) : (
          <Accordion type="single" collapsible defaultValue={sections[0]?.id} className="w-full">
            {sections.map((s, idx) => {
              const items = links
                .filter((l) => l.section_id === s.id)
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((l) => ({ label: l.label, url: l.url }));
              return (
                <AccordionItem
                  key={s.id}
                  value={s.id}
                  className={idx === sections.length - 1 ? "border-b-0" : "border-b border-border"}
                >
                  <AccordionTrigger className="px-4 py-3 text-base font-medium hover:no-underline bg-muted/40 data-[state=open]:bg-muted">
                    {s.title}
                  </AccordionTrigger>
                  <AccordionContent className="p-0">
                    <LinkCol items={items} />
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>
    </div>
  );
};

export default SitemapPage;
