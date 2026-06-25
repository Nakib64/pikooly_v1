
-- 1. Gift items catalog
CREATE TABLE public.loyalty_gift_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  image_url text,
  estimated_value numeric NOT NULL DEFAULT 0,
  stock integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.loyalty_gift_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loyalty_gift_items TO authenticated;
GRANT ALL ON public.loyalty_gift_items TO service_role;

ALTER TABLE public.loyalty_gift_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone view active gift items"
  ON public.loyalty_gift_items FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins manage gift items"
  ON public.loyalty_gift_items FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_loyalty_gift_items_updated_at
  BEFORE UPDATE ON public.loyalty_gift_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Program settings (single row)
CREATE TABLE public.loyalty_program_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled boolean NOT NULL DEFAULT true,
  public_title text NOT NULL DEFAULT 'Loyalty Gift Program',
  public_subtitle text DEFAULT 'Be one of our top customers and win exclusive gifts',
  public_description text,
  banner_image_url text,
  draw_batch_size integer NOT NULL DEFAULT 1000,
  winners_per_batch integer NOT NULL DEFAULT 5,
  min_orders_to_qualify integer NOT NULL DEFAULT 3,
  show_on_homepage boolean NOT NULL DEFAULT true,
  gift_card_message text DEFAULT 'Thank you for being a loyal customer! Please accept this gift as a token of our appreciation.',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.loyalty_program_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loyalty_program_settings TO authenticated;
GRANT ALL ON public.loyalty_program_settings TO service_role;

ALTER TABLE public.loyalty_program_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone view loyalty settings"
  ON public.loyalty_program_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins manage loyalty settings"
  ON public.loyalty_program_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_loyalty_program_settings_updated_at
  BEFORE UPDATE ON public.loyalty_program_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.loyalty_program_settings DEFAULT VALUES;

-- 3. Winners log
CREATE TABLE public.loyalty_winners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  delivery_address text,
  order_id uuid,
  order_number text,
  gift_item_id uuid REFERENCES public.loyalty_gift_items(id) ON DELETE SET NULL,
  gift_name text,
  gift_card_message text,
  batch_number integer,
  total_orders_at_draw integer NOT NULL DEFAULT 0,
  dispatch_status text NOT NULL DEFAULT 'pending', -- pending | dispatched | delivered
  dispatched_at timestamptz,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.loyalty_winners TO authenticated;
GRANT ALL ON public.loyalty_winners TO service_role;

ALTER TABLE public.loyalty_winners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage winners"
  ON public.loyalty_winners FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users view own winner record"
  ON public.loyalty_winners FOR SELECT
  USING (auth.uid() = user_id);

CREATE TRIGGER update_loyalty_winners_updated_at
  BEFORE UPDATE ON public.loyalty_winners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_loyalty_winners_user ON public.loyalty_winners(user_id);
CREATE INDEX idx_loyalty_winners_status ON public.loyalty_winners(dispatch_status);
