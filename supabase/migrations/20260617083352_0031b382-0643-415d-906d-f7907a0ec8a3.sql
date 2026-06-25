
CREATE TABLE IF NOT EXISTS public.seller_subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  subcategory_id uuid NOT NULL REFERENCES public.subcategories(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (seller_id, subcategory_id)
);

GRANT SELECT ON public.seller_subcategories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.seller_subcategories TO authenticated;
GRANT ALL ON public.seller_subcategories TO service_role;

ALTER TABLE public.seller_subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view seller subcategories"
ON public.seller_subcategories FOR SELECT USING (true);

CREATE POLICY "Sellers manage own subcategories"
ON public.seller_subcategories FOR ALL
USING (EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = seller_subcategories.seller_id AND s.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = seller_subcategories.seller_id AND s.user_id = auth.uid()));

CREATE POLICY "Admins manage seller subcategories"
ON public.seller_subcategories FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_seller_subcategories_seller ON public.seller_subcategories(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_subcategories_sub ON public.seller_subcategories(subcategory_id);

-- Update create_pending_seller to accept subcategories
CREATE OR REPLACE FUNCTION public.create_pending_seller(
  _district_id uuid,
  _category_ids uuid[],
  _trade_license text DEFAULT NULL,
  _subcategory_ids uuid[] DEFAULT NULL
)
RETURNS sellers
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
  v_sub uuid;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _district_id IS NULL THEN RAISE EXCEPTION 'District is required'; END IF;
  IF _category_ids IS NULL OR array_length(_category_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'At least one category is required';
  END IF;

  SELECT email, COALESCE(raw_user_meta_data->>'full_name', email), raw_user_meta_data->>'phone'
    INTO v_email, v_name, v_phone
  FROM auth.users WHERE id = v_user_id;

  SELECT * INTO v_existing FROM public.sellers WHERE user_id = v_user_id LIMIT 1;
  IF FOUND THEN RETURN v_existing; END IF;

  INSERT INTO public.sellers (
    user_id, name, email, phone, district_id, is_active, status, trade_license_number
  ) VALUES (
    v_user_id, COALESCE(v_name, 'Seller'), v_email, COALESCE(v_phone, 'Not provided'),
    _district_id, false, 'pending',
    NULLIF(trim(COALESCE(_trade_license, '')), '')
  )
  RETURNING * INTO v_new;

  FOREACH v_cat IN ARRAY _category_ids LOOP
    INSERT INTO public.seller_categories (seller_id, category_id)
    VALUES (v_new.id, v_cat) ON CONFLICT DO NOTHING;
  END LOOP;

  IF _subcategory_ids IS NOT NULL AND array_length(_subcategory_ids, 1) IS NOT NULL THEN
    FOREACH v_sub IN ARRAY _subcategory_ids LOOP
      INSERT INTO public.seller_subcategories (seller_id, subcategory_id)
      VALUES (v_new.id, v_sub) ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  RETURN v_new;
END;
$$;

-- Improved finder: prefer subcategory match, then category match
CREATE OR REPLACE FUNCTION public.find_seller_for_order(_district_id uuid, _category_ids uuid[], _subcategory_ids uuid[] DEFAULT NULL)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id
  FROM public.sellers s
  WHERE s.is_active = true
    AND COALESCE(s.status, 'pending') = 'approved'
    AND s.district_id = _district_id
    AND (
      _category_ids IS NULL OR array_length(_category_ids, 1) IS NULL
      OR EXISTS (SELECT 1 FROM public.seller_categories sc WHERE sc.seller_id = s.id AND sc.category_id = ANY(_category_ids))
    )
  ORDER BY
    (SELECT count(*) FROM public.seller_subcategories ss
       WHERE ss.seller_id = s.id AND ss.subcategory_id = ANY(COALESCE(_subcategory_ids, ARRAY[]::uuid[]))) DESC,
    (SELECT count(*) FROM public.seller_categories sc
       WHERE sc.seller_id = s.id AND sc.category_id = ANY(COALESCE(_category_ids, ARRAY[]::uuid[]))) DESC,
    s.created_at ASC
  LIMIT 1;
$$;

-- Update trigger to also collect subcategories
CREATE OR REPLACE FUNCTION public.auto_assign_seller_on_order_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_cats uuid[];
  v_subs uuid[];
  v_seller_id uuid;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = NEW.order_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  IF v_order.assigned_seller_id IS NOT NULL THEN RETURN NEW; END IF;
  IF v_order.district_id IS NULL THEN RETURN NEW; END IF;

  SELECT COALESCE(array_agg(DISTINCT pc.category_id), ARRAY[]::uuid[])
    INTO v_cats
  FROM public.order_items oi
  LEFT JOIN public.product_categories pc ON pc.product_id = oi.product_id
  WHERE oi.order_id = NEW.order_id AND pc.category_id IS NOT NULL;

  IF v_cats IS NULL OR array_length(v_cats, 1) IS NULL THEN
    SELECT COALESCE(array_agg(DISTINCT p.category_id), ARRAY[]::uuid[])
      INTO v_cats
    FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = NEW.order_id AND p.category_id IS NOT NULL;
  END IF;

  SELECT COALESCE(array_agg(DISTINCT ps.subcategory_id), ARRAY[]::uuid[])
    INTO v_subs
  FROM public.order_items oi
  LEFT JOIN public.product_subcategories ps ON ps.product_id = oi.product_id
  WHERE oi.order_id = NEW.order_id AND ps.subcategory_id IS NOT NULL;

  IF v_subs IS NULL OR array_length(v_subs, 1) IS NULL THEN
    SELECT COALESCE(array_agg(DISTINCT p.subcategory_id), ARRAY[]::uuid[])
      INTO v_subs
    FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = NEW.order_id AND p.subcategory_id IS NOT NULL;
  END IF;

  v_seller_id := public.find_seller_for_order(v_order.district_id, v_cats, v_subs);
  IF v_seller_id IS NULL THEN RETURN NEW; END IF;

  UPDATE public.orders SET assigned_seller_id = v_seller_id, updated_at = now() WHERE id = NEW.order_id;

  INSERT INTO public.seller_notifications (seller_id, type, message, order_id, order_number)
  VALUES (v_seller_id, 'new_order',
          'New order ' || COALESCE(v_order.order_number, '') || ' assigned to you',
          v_order.id, v_order.order_number);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;
