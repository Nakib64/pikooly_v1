
CREATE TABLE public.home_living_gifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  image_url TEXT,
  link TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.home_living_gifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active home living gifts"
  ON public.home_living_gifts
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage home living gifts"
  ON public.home_living_gifts
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
