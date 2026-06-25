
-- 1. Offer Banners table
CREATE TABLE public.offer_banners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  subtitle TEXT,
  description TEXT,
  logo_url TEXT,
  image_url TEXT,
  link TEXT,
  bg_color TEXT DEFAULT '#f5f0d0',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.offer_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage offer banners" ON public.offer_banners FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active offer banners" ON public.offer_banners FOR SELECT
  USING (is_active = true);

-- 2. Relationship Categories table
CREATE TABLE public.relationship_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT,
  slug TEXT NOT NULL,
  link TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.relationship_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage relationship categories" ON public.relationship_categories FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active relationship categories" ON public.relationship_categories FOR SELECT
  USING (is_active = true);

-- 3. Gifting Stories table
CREATE TABLE public.gifting_stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  label TEXT,
  thumbnail_url TEXT,
  video_url TEXT,
  views_count INTEGER NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.gifting_stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage gifting stories" ON public.gifting_stories FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active gifting stories" ON public.gifting_stories FOR SELECT
  USING (is_active = true);

-- 4. Celebrations table
CREATE TABLE public.celebrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  date_label TEXT NOT NULL,
  image_url TEXT,
  link TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.celebrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage celebrations" ON public.celebrations FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active celebrations" ON public.celebrations FOR SELECT
  USING (is_active = true);
