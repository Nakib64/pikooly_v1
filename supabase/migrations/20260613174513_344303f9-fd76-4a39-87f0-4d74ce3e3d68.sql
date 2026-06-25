
CREATE TABLE public.sitemap_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sitemap_sections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sitemap_sections TO authenticated;
GRANT ALL ON public.sitemap_sections TO service_role;

ALTER TABLE public.sitemap_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active sitemap sections"
  ON public.sitemap_sections FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage sitemap sections"
  ON public.sitemap_sections FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.sitemap_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.sitemap_sections(id) ON DELETE CASCADE,
  label text NOT NULL,
  url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sitemap_links TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sitemap_links TO authenticated;
GRANT ALL ON public.sitemap_links TO service_role;

ALTER TABLE public.sitemap_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view sitemap links"
  ON public.sitemap_links FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage sitemap links"
  ON public.sitemap_links FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_sitemap_sections_updated_at
  BEFORE UPDATE ON public.sitemap_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sitemap_links_updated_at
  BEFORE UPDATE ON public.sitemap_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
