
-- =========================================================
-- 1. delivery_otps
-- =========================================================
CREATE TABLE public.delivery_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  otp_hash text NOT NULL,
  phone text NOT NULL,
  expires_at timestamptz NOT NULL,
  verified_at timestamptz,
  attempts int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE INDEX idx_delivery_otps_order ON public.delivery_otps(order_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_otps TO authenticated;
GRANT ALL ON public.delivery_otps TO service_role;
ALTER TABLE public.delivery_otps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage delivery otps"
  ON public.delivery_otps FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- 2. phone_otps
-- =========================================================
CREATE TABLE public.phone_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  otp_hash text NOT NULL,
  purpose text NOT NULL CHECK (purpose IN ('login','reset')),
  expires_at timestamptz NOT NULL,
  verified_at timestamptz,
  attempts int NOT NULL DEFAULT 0,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_phone_otps_phone_purpose ON public.phone_otps(phone, purpose, created_at DESC);
GRANT ALL ON public.phone_otps TO service_role;
ALTER TABLE public.phone_otps ENABLE ROW LEVEL SECURITY;
-- Only service_role accesses this; no client policies.

-- =========================================================
-- 3. site_settings extensions
-- =========================================================
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS admin_sms_recipients text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS admin_sms_new_order_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_sms_low_stock_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS low_stock_threshold int DEFAULT 5;

-- =========================================================
-- 4. Triggers: notify admin SMS
-- =========================================================
CREATE OR REPLACE FUNCTION public.notify_admin_sms_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text := 'https://uizdqqyiqxkcjufkksrc.supabase.co/functions/v1/notify-admin-sms';
  v_anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpemRxcXlpcXhrY2p1Zmtrc3JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0ODE1NjcsImV4cCI6MjA4NzA1NzU2N30.3k_qrziabE9FHHobTYZiDk4mw2CePvutxZzMrijgi4c';
BEGIN
  PERFORM extensions.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_anon),
    body := jsonb_build_object(
      'event','new_order',
      'order_id', NEW.id,
      'order_number', NEW.order_number,
      'total', NEW.total,
      'customer_name', NEW.customer_name,
      'customer_phone', NEW.customer_phone
    )::text
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admin_sms_new_order ON public.orders;
CREATE TRIGGER trg_notify_admin_sms_new_order
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_sms_new_order();

CREATE OR REPLACE FUNCTION public.notify_admin_sms_low_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text := 'https://uizdqqyiqxkcjufkksrc.supabase.co/functions/v1/notify-admin-sms';
  v_anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpemRxcXlpcXhrY2p1Zmtrc3JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0ODE1NjcsImV4cCI6MjA4NzA1NzU2N30.3k_qrziabE9FHHobTYZiDk4mw2CePvutxZzMrijgi4c';
  v_threshold int;
BEGIN
  SELECT COALESCE(low_stock_threshold, 5) INTO v_threshold FROM public.site_settings LIMIT 1;
  IF v_threshold IS NULL THEN v_threshold := 5; END IF;

  -- Fire only when crossing from above->below threshold and stock > 0 (avoid noise on out-of-stock)
  IF NEW.stock IS NULL OR OLD.stock IS NULL THEN RETURN NEW; END IF;
  IF NEW.stock < v_threshold AND OLD.stock >= v_threshold AND NEW.stock > 0 THEN
    PERFORM extensions.http_post(
      url := v_url,
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_anon),
      body := jsonb_build_object(
        'event','low_stock',
        'product_id', NEW.id,
        'product_name', NEW.name,
        'stock', NEW.stock,
        'threshold', v_threshold
      )::text
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admin_sms_low_stock ON public.products;
CREATE TRIGGER trg_notify_admin_sms_low_stock
  AFTER UPDATE OF stock ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_sms_low_stock();
