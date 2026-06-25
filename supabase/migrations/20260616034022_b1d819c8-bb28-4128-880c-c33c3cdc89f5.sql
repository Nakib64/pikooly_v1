-- 1. Payout method change history
CREATE TABLE IF NOT EXISTS public.seller_payout_method_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  method text NOT NULL,
  details jsonb,
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by uuid
);
CREATE INDEX IF NOT EXISTS idx_spmh_seller ON public.seller_payout_method_history(seller_id, changed_at DESC);

GRANT SELECT, INSERT ON public.seller_payout_method_history TO authenticated;
GRANT ALL ON public.seller_payout_method_history TO service_role;

ALTER TABLE public.seller_payout_method_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers view own payout method history"
  ON public.seller_payout_method_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = seller_id AND s.user_id = auth.uid()));

CREATE POLICY "Admins view all payout method history"
  ON public.seller_payout_method_history FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Sellers insert own payout method history"
  ON public.seller_payout_method_history FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = seller_id AND s.user_id = auth.uid()));

CREATE POLICY "Admins insert payout method history"
  ON public.seller_payout_method_history FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- 2. Seller payouts (admin marks paid)
CREATE TABLE IF NOT EXISTS public.seller_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  method text NOT NULL,
  reference text,
  notes text,
  method_snapshot jsonb,
  paid_at timestamptz NOT NULL DEFAULT now(),
  paid_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_seller_payouts_seller ON public.seller_payouts(seller_id, paid_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_payouts TO authenticated;
GRANT ALL ON public.seller_payouts TO service_role;

ALTER TABLE public.seller_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers view own payouts"
  ON public.seller_payouts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = seller_id AND s.user_id = auth.uid()));

CREATE POLICY "Admins manage payouts"
  ON public.seller_payouts FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- 3. Link orders to payouts (an order can only be in one payout)
CREATE TABLE IF NOT EXISTS public.seller_payout_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id uuid NOT NULL REFERENCES public.seller_payouts(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  seller_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id)
);
CREATE INDEX IF NOT EXISTS idx_spo_payout ON public.seller_payout_orders(payout_id);

GRANT SELECT, INSERT, DELETE ON public.seller_payout_orders TO authenticated;
GRANT ALL ON public.seller_payout_orders TO service_role;

ALTER TABLE public.seller_payout_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers view own payout orders"
  ON public.seller_payout_orders FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.seller_payouts sp
    JOIN public.sellers s ON s.id = sp.seller_id
    WHERE sp.id = payout_id AND s.user_id = auth.uid()
  ));

CREATE POLICY "Admins manage payout orders"
  ON public.seller_payout_orders FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- 4. Trigger: when seller payout method changes, log history + notify seller
CREATE OR REPLACE FUNCTION public.handle_seller_payout_method_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_changed boolean := false;
BEGIN
  IF COALESCE(NEW.payout_method,'') IS DISTINCT FROM COALESCE(OLD.payout_method,'')
     OR COALESCE(NEW.bkash_number,'') IS DISTINCT FROM COALESCE(OLD.bkash_number,'')
     OR COALESCE(NEW.bank_name,'') IS DISTINCT FROM COALESCE(OLD.bank_name,'')
     OR COALESCE(NEW.bank_account_name,'') IS DISTINCT FROM COALESCE(OLD.bank_account_name,'')
     OR COALESCE(NEW.bank_account_number,'') IS DISTINCT FROM COALESCE(OLD.bank_account_number,'')
     OR COALESCE(NEW.bank_branch,'') IS DISTINCT FROM COALESCE(OLD.bank_branch,'')
     OR COALESCE(NEW.bank_routing_number,'') IS DISTINCT FROM COALESCE(OLD.bank_routing_number,'') THEN
    v_changed := true;
  END IF;

  IF v_changed THEN
    INSERT INTO public.seller_payout_method_history (seller_id, method, details, changed_by)
    VALUES (
      NEW.id,
      COALESCE(NEW.payout_method, 'none'),
      jsonb_build_object(
        'bkash_number', NEW.bkash_number,
        'bank_name', NEW.bank_name,
        'bank_account_name', NEW.bank_account_name,
        'bank_account_number', NEW.bank_account_number,
        'bank_branch', NEW.bank_branch,
        'bank_routing_number', NEW.bank_routing_number
      ),
      auth.uid()
    );

    INSERT INTO public.seller_notifications (seller_id, type, message)
    VALUES (
      NEW.id,
      'payout_method_updated',
      'Your payout method has been updated to ' || COALESCE(NEW.payout_method, 'none') || '.'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seller_payout_method_change ON public.sellers;
CREATE TRIGGER trg_seller_payout_method_change
AFTER UPDATE ON public.sellers
FOR EACH ROW EXECUTE FUNCTION public.handle_seller_payout_method_change();

-- 5. Trigger: when admin creates payout, notify seller
CREATE OR REPLACE FUNCTION public.notify_seller_payout_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.seller_notifications (seller_id, type, message)
  VALUES (
    NEW.seller_id,
    'payout_paid',
    'Payment received: ৳' || NEW.amount::text || ' via ' || NEW.method ||
    CASE WHEN NEW.reference IS NOT NULL AND NEW.reference <> '' THEN ' (Ref: ' || NEW.reference || ')' ELSE '' END
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seller_payout_paid ON public.seller_payouts;
CREATE TRIGGER trg_seller_payout_paid
AFTER INSERT ON public.seller_payouts
FOR EACH ROW EXECUTE FUNCTION public.notify_seller_payout_paid();