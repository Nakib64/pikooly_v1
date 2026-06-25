
-- Event Categories (Wedding, Birthday, Corporate, etc.)
CREATE TABLE public.event_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  image_url text,
  icon text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  seo_title text,
  seo_description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Event Packages (pricing packages per category)
CREATE TABLE public.event_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.event_categories(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  original_price numeric,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  image_url text,
  images text[] DEFAULT '{}'::text[],
  is_featured boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  seo_title text,
  seo_description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Event Bookings (customer bookings)
CREATE TABLE public.event_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number text NOT NULL UNIQUE,
  user_id uuid,
  package_id uuid REFERENCES public.event_packages(id) ON DELETE SET NULL,
  category_id uuid REFERENCES public.event_categories(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_email text,
  customer_phone text NOT NULL,
  event_date date NOT NULL,
  event_time text,
  venue_address text NOT NULL,
  guest_count integer,
  special_requests text,
  status text NOT NULL DEFAULT 'pending',
  payment_status text NOT NULL DEFAULT 'unpaid',
  payment_method text NOT NULL DEFAULT 'cod',
  total numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.event_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_bookings ENABLE ROW LEVEL SECURITY;

-- RLS: event_categories
CREATE POLICY "Anyone can view active event categories" ON public.event_categories FOR SELECT TO public USING (is_active = true);
CREATE POLICY "Admins can manage event categories" ON public.event_categories FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS: event_packages
CREATE POLICY "Anyone can view active event packages" ON public.event_packages FOR SELECT TO public USING (is_active = true);
CREATE POLICY "Admins can manage event packages" ON public.event_packages FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS: event_bookings
CREATE POLICY "Anyone can create event bookings" ON public.event_bookings FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Users can view own event bookings" ON public.event_bookings FOR SELECT TO public USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "Admins can manage event bookings" ON public.event_bookings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Triggers for updated_at
CREATE TRIGGER update_event_categories_updated_at BEFORE UPDATE ON public.event_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_event_packages_updated_at BEFORE UPDATE ON public.event_packages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_event_bookings_updated_at BEFORE UPDATE ON public.event_bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Generate booking number
CREATE OR REPLACE FUNCTION public.generate_event_booking_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.booking_number = 'EVT-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_event_booking_number BEFORE INSERT ON public.event_bookings FOR EACH ROW EXECUTE FUNCTION generate_event_booking_number();
