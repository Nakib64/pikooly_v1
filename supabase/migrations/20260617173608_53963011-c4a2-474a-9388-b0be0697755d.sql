
ALTER TABLE public.site_settings
  DROP COLUMN IF EXISTS admin_sms_recipients,
  DROP COLUMN IF EXISTS admin_sms_new_order_enabled,
  DROP COLUMN IF EXISTS admin_sms_low_stock_enabled,
  DROP COLUMN IF EXISTS low_stock_threshold;

-- Recreate low-stock trigger to read threshold from key-value settings
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
  v_val text;
BEGIN
  SELECT value INTO v_val FROM public.site_settings WHERE key = 'low_stock_threshold' LIMIT 1;
  v_threshold := COALESCE(NULLIF(v_val, '')::int, 5);

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
