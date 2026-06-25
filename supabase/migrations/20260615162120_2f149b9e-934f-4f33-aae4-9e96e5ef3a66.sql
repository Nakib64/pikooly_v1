-- 1) Add 'seller' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'seller';

-- 2) Add district_id to orders (links to shipping_districts)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS district_id uuid REFERENCES public.shipping_districts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_orders_district_id ON public.orders(district_id);

-- 3) sellers table
CREATE TABLE IF NOT EXISTS public.sellers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  district_id uuid NOT NULL REFERENCES public.shipping_districts(id) ON DELETE RESTRICT,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sellers_district_unique UNIQUE (district_id)
);
CREATE INDEX IF NOT EXISTS idx_sellers_user_id ON public.sellers(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sellers TO authenticated;
GRANT ALL ON public.sellers TO service_role;

ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage sellers"
  ON public.sellers FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Sellers view own record"
  ON public.sellers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Sellers update own record"
  ON public.sellers FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_sellers_updated_at
  BEFORE UPDATE ON public.sellers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) seller_notifications table
CREATE TABLE IF NOT EXISTS public.seller_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  order_number text,
  district_name text,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'new_order',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_seller_notif_seller_id ON public.seller_notifications(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_notif_read ON public.seller_notifications(seller_id, read);
CREATE INDEX IF NOT EXISTS idx_seller_notif_created ON public.seller_notifications(created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_notifications TO authenticated;
GRANT ALL ON public.seller_notifications TO service_role;

ALTER TABLE public.seller_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage seller notifications"
  ON public.seller_notifications FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Sellers view own notifications"
  ON public.seller_notifications FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.sellers s
    WHERE s.id = seller_notifications.seller_id AND s.user_id = auth.uid()
  ));

CREATE POLICY "Sellers update own notifications"
  ON public.seller_notifications FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.sellers s
    WHERE s.id = seller_notifications.seller_id AND s.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.sellers s
    WHERE s.id = seller_notifications.seller_id AND s.user_id = auth.uid()
  ));

-- 5) Realtime
ALTER TABLE public.seller_notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.seller_notifications;