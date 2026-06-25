
-- Photo service packages
CREATE TABLE public.photo_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  short_description TEXT,
  image_url TEXT,
  starting_price NUMERIC NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Photo pricing packages (Basic, Standard, Premium per service)
CREATE TABLE public.photo_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES public.photo_services(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  duration TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Photo bookings
CREATE TABLE public.photo_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number TEXT NOT NULL,
  service_id UUID REFERENCES public.photo_services(id) ON DELETE SET NULL,
  package_id UUID REFERENCES public.photo_packages(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  event_address TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_time TEXT,
  location_type TEXT NOT NULL DEFAULT 'dhaka',
  district TEXT,
  travel_fee NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Portfolio gallery
CREATE TABLE public.photo_portfolio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT '',
  media_type TEXT NOT NULL DEFAULT 'photo',
  media_url TEXT NOT NULL,
  thumbnail_url TEXT,
  video_embed_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Travel conveyance fees by district
CREATE TABLE public.photo_travel_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district TEXT NOT NULL UNIQUE,
  fee NUMERIC NOT NULL DEFAULT 0,
  is_available BOOLEAN NOT NULL DEFAULT false,
  request_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Booking number generator trigger
CREATE OR REPLACE FUNCTION public.generate_photo_booking_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.booking_number = 'PHT-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_photo_booking_number
  BEFORE INSERT ON public.photo_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_photo_booking_number();

-- RLS
ALTER TABLE public.photo_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_travel_fees ENABLE ROW LEVEL SECURITY;

-- photo_services: public read, admin manage
CREATE POLICY "Anyone can view active photo services" ON public.photo_services FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage photo services" ON public.photo_services FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- photo_packages: public read, admin manage
CREATE POLICY "Anyone can view active photo packages" ON public.photo_packages FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage photo packages" ON public.photo_packages FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- photo_bookings: anyone can insert, users see own, admin manage all
CREATE POLICY "Anyone can create photo bookings" ON public.photo_bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view own photo bookings" ON public.photo_bookings FOR SELECT USING ((user_id = auth.uid()) OR (user_id IS NULL));
CREATE POLICY "Admins can manage photo bookings" ON public.photo_bookings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- photo_portfolio: public read, admin manage
CREATE POLICY "Anyone can view active portfolio" ON public.photo_portfolio FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage portfolio" ON public.photo_portfolio FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- photo_travel_fees: public read, admin manage
CREATE POLICY "Anyone can view travel fees" ON public.photo_travel_fees FOR SELECT USING (true);
CREATE POLICY "Admins can manage travel fees" ON public.photo_travel_fees FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
