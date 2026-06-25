-- Add bulk order fields to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS bulk_order_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bulk_min_quantity integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS bulk_pricing_tiers jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Bulk quote requests
CREATE TABLE IF NOT EXISTS public.bulk_quote_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid,
  product_name text,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  company_name text,
  quantity integer NOT NULL,
  required_by date,
  message text,
  status text NOT NULL DEFAULT 'new',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bulk_quote_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit bulk quote"
  ON public.bulk_quote_requests FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins manage bulk quote requests"
  ON public.bulk_quote_requests FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_bulk_quote_requests_updated_at
  BEFORE UPDATE ON public.bulk_quote_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();