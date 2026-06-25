
-- Cart add-ons table for admin-managed "Your last minute add-ons" section
CREATE TABLE IF NOT EXISTS public.cart_addons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id)
);

ALTER TABLE public.cart_addons ENABLE ROW LEVEL SECURITY;

-- Public can read active add-ons
CREATE POLICY "Cart addons are viewable by everyone"
ON public.cart_addons FOR SELECT
USING (true);

-- Admins can manage add-ons
CREATE POLICY "Admins can insert cart addons"
ON public.cart_addons FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update cart addons"
ON public.cart_addons FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete cart addons"
ON public.cart_addons FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_cart_addons_updated_at
BEFORE UPDATE ON public.cart_addons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Default site settings for the cart page (skip if already there)
INSERT INTO public.site_settings (key, value) VALUES
  ('cart_express_section_enabled', 'true'),
  ('cart_express_heading', 'Express Delivery'),
  ('cart_addons_enabled', 'true'),
  ('cart_addons_heading', 'Your last minute add-ons'),
  ('cart_savings_enabled', 'true'),
  ('cart_savings_heading', 'You have saved {amount} on this order'),
  ('cart_bill_summary_enabled', 'true'),
  ('cart_bill_summary_heading', 'Bill Summary'),
  ('cart_accent_color', '#0a4d5c'),
  ('cart_addons_bg_color', '#fde9d9'),
  ('cart_savings_bg_color', '#d4edf7')
ON CONFLICT (key) DO NOTHING;
