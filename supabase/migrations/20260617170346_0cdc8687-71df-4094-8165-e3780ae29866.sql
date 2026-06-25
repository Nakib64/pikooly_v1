
DROP FUNCTION IF EXISTS public.find_seller_for_order(uuid, uuid[], uuid[]);

CREATE FUNCTION public.find_seller_for_order(
  _district_id uuid,
  _category_ids uuid[],
  _subcategory_ids uuid[]
)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id
  FROM public.sellers s
  WHERE s.is_active = true
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

  SELECT p.seller_id
    INTO v_seller_id
  FROM public.order_items oi
  JOIN public.products p ON p.id = oi.product_id
  JOIN public.sellers s ON s.id = p.seller_id
  WHERE oi.order_id = NEW.order_id
    AND p.seller_id IS NOT NULL
    AND s.is_active = true
  ORDER BY oi.created_at ASC
  LIMIT 1;

  IF v_seller_id IS NULL THEN
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
  END IF;

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

WITH picks AS (
  SELECT DISTINCT ON (o.id) o.id AS order_id, p.seller_id
  FROM public.orders o
  JOIN public.order_items oi ON oi.order_id = o.id
  JOIN public.products p ON p.id = oi.product_id
  JOIN public.sellers s ON s.id = p.seller_id
  WHERE o.assigned_seller_id IS NULL
    AND p.seller_id IS NOT NULL
    AND s.is_active = true
  ORDER BY o.id, oi.created_at ASC
)
UPDATE public.orders o
SET assigned_seller_id = picks.seller_id, updated_at = now()
FROM picks
WHERE o.id = picks.order_id;

INSERT INTO public.seller_notifications (seller_id, type, message, order_id, order_number)
SELECT o.assigned_seller_id, 'new_order',
       'New order ' || COALESCE(o.order_number, '') || ' assigned to you',
       o.id, o.order_number
FROM public.orders o
WHERE o.assigned_seller_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.seller_notifications n
    WHERE n.order_id = o.id AND n.seller_id = o.assigned_seller_id AND n.type = 'new_order'
  );
