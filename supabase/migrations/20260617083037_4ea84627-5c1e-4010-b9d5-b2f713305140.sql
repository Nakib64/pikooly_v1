
-- 1. Column
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS assigned_seller_id uuid REFERENCES public.sellers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_orders_assigned_seller ON public.orders(assigned_seller_id);

-- 2. Finder function: pick a seller matching district + at least one category
CREATE OR REPLACE FUNCTION public.find_seller_for_order(_district_id uuid, _category_ids uuid[])
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
      _category_ids IS NULL
      OR array_length(_category_ids, 1) IS NULL
      OR EXISTS (
        SELECT 1 FROM public.seller_categories sc
        WHERE sc.seller_id = s.id AND sc.category_id = ANY(_category_ids)
      )
    )
  ORDER BY (
    SELECT count(*) FROM public.seller_categories sc
    WHERE sc.seller_id = s.id AND sc.category_id = ANY(COALESCE(_category_ids, ARRAY[]::uuid[]))
  ) DESC, s.created_at ASC
  LIMIT 1;
$$;

-- 3. Trigger fn on order_items: when an item is inserted, assign seller if order has none
CREATE OR REPLACE FUNCTION public.auto_assign_seller_on_order_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_cats uuid[];
  v_seller_id uuid;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = NEW.order_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  IF v_order.assigned_seller_id IS NOT NULL THEN RETURN NEW; END IF;
  IF v_order.district_id IS NULL THEN RETURN NEW; END IF;

  -- Collect categories from all items of this order
  SELECT COALESCE(array_agg(DISTINCT pc.category_id), ARRAY[]::uuid[])
    INTO v_cats
  FROM public.order_items oi
  LEFT JOIN public.product_categories pc ON pc.product_id = oi.product_id
  WHERE oi.order_id = NEW.order_id AND pc.category_id IS NOT NULL;

  -- Fallback: products.category_id
  IF v_cats IS NULL OR array_length(v_cats, 1) IS NULL THEN
    SELECT COALESCE(array_agg(DISTINCT p.category_id), ARRAY[]::uuid[])
      INTO v_cats
    FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = NEW.order_id AND p.category_id IS NOT NULL;
  END IF;

  v_seller_id := public.find_seller_for_order(v_order.district_id, v_cats);
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

DROP TRIGGER IF EXISTS trg_auto_assign_seller ON public.order_items;
CREATE TRIGGER trg_auto_assign_seller
AFTER INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_seller_on_order_item();

-- 4. Helper: is current user the assigned seller for an order?
CREATE OR REPLACE FUNCTION public.is_assigned_seller(_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.sellers s ON s.id = o.assigned_seller_id
    WHERE o.id = _order_id
      AND s.user_id = auth.uid()
      AND s.is_active = true
  )
$$;

-- 5. RLS: assigned seller can view/update orders, and view items
DROP POLICY IF EXISTS "Assigned seller views orders" ON public.orders;
CREATE POLICY "Assigned seller views orders" ON public.orders
FOR SELECT
USING (
  assigned_seller_id IS NOT NULL
  AND deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.sellers s
    WHERE s.id = orders.assigned_seller_id AND s.user_id = auth.uid() AND s.is_active = true
  )
);

DROP POLICY IF EXISTS "Assigned seller updates orders" ON public.orders;
CREATE POLICY "Assigned seller updates orders" ON public.orders
FOR UPDATE
USING (
  assigned_seller_id IS NOT NULL
  AND deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.sellers s
    WHERE s.id = orders.assigned_seller_id AND s.user_id = auth.uid() AND s.is_active = true
  )
)
WITH CHECK (
  assigned_seller_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.sellers s
    WHERE s.id = orders.assigned_seller_id AND s.user_id = auth.uid() AND s.is_active = true
  )
);

DROP POLICY IF EXISTS "Assigned seller views order items" ON public.order_items;
CREATE POLICY "Assigned seller views order items" ON public.order_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.sellers s ON s.id = o.assigned_seller_id
    WHERE o.id = order_items.order_id
      AND s.user_id = auth.uid()
      AND s.is_active = true
      AND o.deleted_at IS NULL
  )
);
