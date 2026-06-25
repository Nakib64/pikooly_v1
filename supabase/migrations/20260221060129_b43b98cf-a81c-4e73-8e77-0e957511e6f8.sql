
-- Create sliders table
CREATE TABLE public.sliders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  link TEXT DEFAULT '/shop',
  bg_color TEXT DEFAULT '#d4e8d0',
  cta_text TEXT DEFAULT 'ORDER NOW',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sliders ENABLE ROW LEVEL SECURITY;

-- Admin can manage
CREATE POLICY "Admins can manage sliders"
ON public.sliders
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view active sliders
CREATE POLICY "Anyone can view active sliders"
ON public.sliders
FOR SELECT
USING (is_active = true);

-- Trigger for updated_at
CREATE TRIGGER update_sliders_updated_at
BEFORE UPDATE ON public.sliders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for slider images
INSERT INTO storage.buckets (id, name, public) VALUES ('sliders', 'sliders', true);

-- Storage policies
CREATE POLICY "Anyone can view slider images"
ON storage.objects FOR SELECT
USING (bucket_id = 'sliders');

CREATE POLICY "Admins can upload slider images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'sliders' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update slider images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'sliders' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete slider images"
ON storage.objects FOR DELETE
USING (bucket_id = 'sliders' AND has_role(auth.uid(), 'admin'::app_role));
