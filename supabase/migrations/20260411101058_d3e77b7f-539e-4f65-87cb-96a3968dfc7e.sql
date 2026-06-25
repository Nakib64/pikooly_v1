
CREATE TABLE public.popular_gifting (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  image_url TEXT,
  link TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.popular_gifting ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active popular gifting items"
ON public.popular_gifting FOR SELECT
USING (true);

CREATE POLICY "Admins can manage popular gifting items"
ON public.popular_gifting FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_popular_gifting_updated_at
BEFORE UPDATE ON public.popular_gifting
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
