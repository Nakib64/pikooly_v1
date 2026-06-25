CREATE OR REPLACE FUNCTION public.create_checkout_order(_order jsonb)
RETURNS TABLE(id uuid, order_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_user_id uuid;
BEGIN
  IF auth.uid() IS NOT NULL
     AND NULLIF(_order->>'user_id', '') IS NOT NULL
     AND NULLIF(_order->>'user_id', '') = auth.uid()::text THEN
    v_user_id := auth.uid();
  ELSE
    v_user_id := NULL;
  END IF;

  INSERT INTO public.orders (
    customer_name,
    customer_phone,
    customer_email,
    billing_country,
    delivery_address,
    notes,
    recipient_name,
    alt_phone,
    gift_message,
    delivery_date,
    delivery_time,
    delivery_type,
    payment_method,
    subtotal,
    delivery_fee,
    discount,
    total,
    is_preorder,
    advance_amount,
    due_amount,
    user_id,
    order_number,
    affiliate_code,
    affiliate_id,
    district_id
  ) VALUES (
    COALESCE(NULLIF(_order->>'customer_name', ''), 'Guest Customer'),
    COALESCE(NULLIF(_order->>'customer_phone', ''), 'Not provided'),
    NULLIF(_order->>'customer_email', ''),
    COALESCE(NULLIF(_order->>'billing_country', ''), 'Bangladesh'),
    COALESCE(NULLIF(_order->>'delivery_address', ''), 'Not provided'),
    NULLIF(_order->>'notes', ''),
    NULLIF(_order->>'recipient_name', ''),
    NULLIF(_order->>'alt_phone', ''),
    NULLIF(_order->>'gift_message', ''),
    CASE WHEN NULLIF(_order->>'delivery_date', '') IS NULL THEN NULL ELSE (_order->>'delivery_date')::date END,
    NULLIF(_order->>'delivery_time', ''),
    COALESCE(NULLIF(_order->>'delivery_type', ''), 'standard'),
    COALESCE(NULLIF(_order->>'payment_method', ''), 'cod'),
    COALESCE((_order->>'subtotal')::numeric, 0),
    COALESCE((_order->>'delivery_fee')::numeric, 0),
    COALESCE((_order->>'discount')::numeric, 0),
    COALESCE((_order->>'total')::numeric, 0),
    COALESCE((_order->>'is_preorder')::boolean, false),
    COALESCE((_order->>'advance_amount')::numeric, 0),
    COALESCE((_order->>'due_amount')::numeric, 0),
    v_user_id,
    COALESCE(NULLIF(_order->>'order_number', ''), 'temp'),
    NULLIF(_order->>'affiliate_code', ''),
    CASE WHEN NULLIF(_order->>'affiliate_id', '') IS NULL THEN NULL ELSE (_order->>'affiliate_id')::uuid END,
    CASE WHEN NULLIF(_order->>'district_id', '') IS NULL THEN NULL ELSE (_order->>'district_id')::uuid END
  )
  RETURNING * INTO v_order;

  RETURN QUERY SELECT v_order.id, v_order.order_number;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_checkout_order(jsonb) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.can_insert_checkout_order_item(_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = _order_id
      AND (
        o.user_id = auth.uid()
        OR (o.user_id IS NULL AND o.created_at > now() - interval '1 hour')
        OR public.has_role(auth.uid(), 'admin')
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_insert_checkout_order_item(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "Users can insert items for own or recent guest orders" ON public.order_items;
CREATE POLICY "Users can insert items for own or recent guest orders"
ON public.order_items
FOR INSERT
TO public
WITH CHECK (public.can_insert_checkout_order_item(order_id));

NOTIFY pgrst, 'reload schema';