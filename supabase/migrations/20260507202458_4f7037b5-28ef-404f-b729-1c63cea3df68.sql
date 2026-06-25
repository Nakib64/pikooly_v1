
-- 3 Delivery Modes
CREATE TABLE public.delivery_modes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  icon text,
  badge_text text,
  delivery_time text NOT NULL DEFAULT '',
  charge_type text NOT NULL DEFAULT 'flat',
  flat_charge numeric NOT NULL DEFAULT 0,
  min_charge numeric NOT NULL DEFAULT 0,
  max_charge numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.delivery_modes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view delivery modes" ON public.delivery_modes FOR SELECT USING (true);
CREATE POLICY "Admins manage delivery modes" ON public.delivery_modes FOR ALL
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_delivery_modes_updated BEFORE UPDATE ON public.delivery_modes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Cities served per mode
CREATE TABLE public.delivery_mode_cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mode_id uuid NOT NULL REFERENCES public.delivery_modes(id) ON DELETE CASCADE,
  city_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mode_id, city_name)
);
ALTER TABLE public.delivery_mode_cities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view delivery cities" ON public.delivery_mode_cities FOR SELECT USING (true);
CREATE POLICY "Admins manage delivery cities" ON public.delivery_mode_cities FOR ALL
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- Category to mode mapping
CREATE TABLE public.category_delivery_modes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL UNIQUE,
  mode_id uuid NOT NULL REFERENCES public.delivery_modes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.category_delivery_modes ENABLE ROW LEVEL SECURITY;