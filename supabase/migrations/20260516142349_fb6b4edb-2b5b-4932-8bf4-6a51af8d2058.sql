
-- =========================================================
-- AFFILIATE PROGRAM
-- =========================================================

-- 1. Global settings (single row)
CREATE TABLE public.affiliate_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bonus_type text NOT NULL DEFAULT 'percentage', -- 'percentage' | 'fixed'
  bonus_value numeric NOT NULL DEFAULT 5, -- 5% or 50 BDT
  min_cashout numeric NOT NULL DEFAULT 500,
  cookie_days integer NOT NULL DEFAULT 30,
  program_enabled boolean NOT NULL DEFAULT true,
  terms text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.affiliate_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view affiliate settings" ON public.affiliate_settings FOR SELECT USING (true);
CREATE POLICY "Admins manage affiliate settings" ON public.affiliate_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
INSERT INTO public.affiliate_settings (bonus_type, bonus_value) VALUES ('percentage', 5);

-- 2. Affiliates (one per user, requires admin approval)
CREATE TABLE public.affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected' | 'suspended'
  full_name text,
  email text,
  phone text,
  payout_method text, -- 'bkash' | 'nagad' | 'bank'
  payout_details text,
  -- per-affiliate overrides (null = use global)
  custom_bonus_type text,
  custom_bonus_value numeric,
  total_earned numeric NOT NULL DEFAULT 0,
  total_paid numeric NOT NULL DEFAULT 0,
  pending_balance numeric NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  admin_notes text,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own affiliate" ON public.affiliates FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users apply as affiliate" ON public.affiliates FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own affiliate" ON public.affiliates FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage affiliates" ON public.affiliates FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can lookup code" ON public.affiliates FOR SELECT USING (status = 'approved');
CREATE TRIGGER update_affiliates_updated_at BEFORE UPDATE ON public.affiliates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Commissions (one per delivered+paid order)
CREATE TABLE public.affiliate_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  order_id uuid NOT NULL UNIQUE,
  order_number text,
  order_total numeric NOT NULL DEFAULT 0,
  bonus_type text NOT NULL,
  bonus_value numeric NOT NULL,
  commission_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'credited', -- 'credited' | 'cancelled'
  credited_to_wallet boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Affiliates view own commissions" ON public.affiliate_commissions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_id AND a.user_id = auth.uid()));
CREATE POLICY "Admins manage commissions" ON public.affiliate_commissions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 4. Cashout requests
CREATE TABLE public.affiliate_cashouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  method text NOT NULL, -- 'bkash' | 'nagad' | 'bank' | 'wallet'
  account_details text,
  status text NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'paid' | 'rejected'
  admin_notes text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.affiliate_cashouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Affiliates view own cashouts" ON public.affiliate_cashouts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Affiliates request cashout" ON public.affiliate_cashouts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage cashouts" ON public.affiliate_cashouts FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER update_affiliate_cashouts_updated_at BEFORE UPDATE ON public.affiliate_cashouts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Add affiliate_code to orders to attribute referrals
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS affiliate_code text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS affiliate_id uuid;
CREATE INDEX IF NOT EXISTS idx_orders_affiliate_id ON public.orders(affiliate_id);

-- 6. Trigger: when order becomes delivered + paid, credit commission + wallet
CREATE OR REPLACE FUNCTION public.process_affiliate_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_aff public.affiliates%ROWTYPE;
  v_settings public.affiliate_settings%ROWTYPE;
  v_btype text;
  v_bvalue numeric;
  v_commission numeric;
  v_new_balance numeric;
BEGIN
  -- Only fire when order transitions to delivered + paid
  IF NEW.status <> 'delivered' OR NEW.payment_status <> 'paid' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'delivered' AND OLD.payment_status = 'paid' THEN RETURN NEW; END IF;
  IF NEW.affiliate_id IS NULL THEN RETURN NEW; END IF;

  -- Skip if already credited
  IF EXISTS (SELECT 1 FROM affiliate_commissions WHERE order_id = NEW.id) THEN RETURN NEW; END IF;

  SELECT * INTO v_aff FROM affiliates WHERE id = NEW.affiliate_id AND status = 'approved';
  IF NOT FOUND THEN RETURN NEW; END IF;

  SELECT * INTO v_settings FROM affiliate_settings LIMIT 1;
  v_btype := COALESCE(v_aff.custom_bonus_type, v_settings.bonus_type, 'percentage');
  v_bvalue := COALESCE(v_aff.custom_bonus_value, v_settings.bonus_value, 5);

  IF v_btype = 'fixed' THEN
    v_commission := v_bvalue;
  ELSE
    v_commission := ROUND((NEW.total * v_bvalue / 100)::numeric, 2);
  END IF;

  IF v_commission <= 0 THEN RETURN NEW; END IF;

  -- Insert commission
  INSERT INTO affiliate_commissions (affiliate_id, order_id, order_number, order_total, bonus_type, bonus_value, commission_amount)
  VALUES (v_aff.id, NEW.id, NEW.order_number, NEW.total, v_btype, v_bvalue, v_commission);

  -- Update affiliate totals
  UPDATE affiliates SET total_earned = total_earned + v_commission, pending_balance = pending_balance + v_commission WHERE id = v_aff.id;

  -- Credit wallet (auto-create if missing)
  INSERT INTO wallets (user_id, balance) VALUES (v_aff.user_id, v_commission)
  ON CONFLICT (user_id) DO UPDATE SET balance = wallets.balance + EXCLUDED.balance, updated_at = now()
  RETURNING balance INTO v_new_balance;

  INSERT INTO wallet_transactions (user_id, type, amount, balance_after, description, reference_id, status)
  VALUES (v_aff.user_id, 'affiliate_bonus', v_commission, v_new_balance, 'Affiliate bonus for order ' || NEW.order_number, NEW.id::text, 'completed');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_affiliate_commission ON public.orders;
CREATE TRIGGER trg_orders_affiliate_commission
  AFTER INSERT OR UPDATE OF status, payment_status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.process_affiliate_commission();
