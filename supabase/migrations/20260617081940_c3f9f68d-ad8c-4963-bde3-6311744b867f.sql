
-- 1. Add new columns to sellers
ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS trade_license_number text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS sellers_trade_license_unique
  ON public.sellers (trade_license_number)
  WHERE trade_license_number IS NOT NULL;

-- 2. seller_categories link table
CREATE TABLE IF NOT EXISTS public.seller_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (seller_id, category_id)
);

GRANT SELECT ON public.seller_categories TO anon;
GRANT SELECT, INSERT, DELETE ON public.seller_categories TO authenticated;
GRANT ALL ON public.seller_categories TO service_role;

ALTER TABLE public.seller_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read seller_categories"
  ON public.seller_categories FOR SELECT
  USING (true);

CREATE POLICY "Sellers manage own categories"
  ON public.seller_categories FOR ALL
  USING (EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = seller_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = seller_id AND s.user_id = auth.uid()));

CREATE POLICY "Admins manage seller_categories"
  ON public.seller_categories FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. RPC: self-service create pending seller after email verification
CREATE OR REPLACE FUNCTION public.create_pending_seller(
  _district_id uuid,
  _category_ids uuid[],
  _trade_license text DEFAULT NULL
) RETURNS public.sellers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
  v_name text;
  v_phone text;
  v_existing public.sellers;
  v_new public.sellers;
  v_cat uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _district_id IS NULL THEN
    RAISE EXCEPTION 'District is required';
  END IF;
  IF _category_ids IS NULL OR array_length(_category_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'At least one category is required';
  END IF;

  SELECT email, COALESCE(raw_user_meta_data->>'full_name', email), raw_user_meta_data->>'phone'
    INTO v_email, v_name, v_phone
  FROM auth.users WHERE id = v_user_id;

  -- If a record already exists for this user, return it
  SELECT * INTO v_existing FROM public.sellers WHERE user_id = v_user_id LIMIT 1;
  IF FOUND THEN
    RETURN v_existing;
  END IF;

  INSERT INTO public.sellers (
    user_id, name, email, phone, district_id, is_active, status, trade_license_number
  ) VALUES (
    v_user_id,
    COALESCE(v_name, 'Seller'),
    v_email,
    COALESCE(v_phone, 'Not provided'),
    _district_id,
    false,
    'pending',
    NULLIF(trim(COALESCE(_trade_license, '')), '')
  )
  RETURNING * INTO v_new;

  FOREACH v_cat IN ARRAY _category_ids LOOP
    INSERT INTO public.seller_categories (seller_id, category_id)
    VALUES (v_new.id, v_cat)
    ON CONFLICT DO NOTHING;
  END LOOP;

  RETURN v_new;
END;
$$;

-- 4. Allow authenticated sellers to insert seller_categories rows for their own seller record
-- (covered by "Sellers manage own categories" above)
