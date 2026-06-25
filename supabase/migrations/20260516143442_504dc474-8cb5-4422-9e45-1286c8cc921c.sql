
-- Enable pg_net for HTTP from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Affiliate clicks tracking
CREATE TABLE IF NOT EXISTS public.affiliate_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL,
  affiliate_code text NOT NULL,
  ip text,
  user_agent text,
  referer text,
  landing_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert clicks"
  ON public.affiliate_clicks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins view all clicks"
  ON public.affiliate_clicks FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Affiliates view own clicks"
  ON public.affiliate_clicks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM affiliates a
    WHERE a.id = affiliate_clicks.affiliate_id AND a.user_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS idx_aff_clicks_aff ON public.affiliate_clicks(affiliate_id, created_at DESC);

-- Trigger function to notify on commission credit via edge function
CREATE OR REPLACE FUNCTION public.notify_commission_credited()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text := 'https://uizdqqyiqxkcjufkksrc.supabase.co/functions/v1/notify-affiliate';
  v_anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpemRxcXlpcXhrY2p1Zmtrc3JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0ODE1NjcsImV4cCI6MjA4NzA1NzU2N30.3k_qrziabE9FHHobTYZiDk4mw2CePvutxZzMrijgi4c';
BEGIN
  PERFORM extensions.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_anon),
    body := jsonb_build_object(
      'event','commission_credited',
      'affiliate_id', NEW.affiliate_id,
      'order_number', NEW.order_number,
      'commission_amount', NEW.commission_amount
    )::text
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_commission_credited ON public.affiliate_commissions;
CREATE TRIGGER trg_commission_credited
AFTER INSERT ON public.affiliate_commissions
FOR EACH ROW EXECUTE FUNCTION public.notify_commission_credited();
