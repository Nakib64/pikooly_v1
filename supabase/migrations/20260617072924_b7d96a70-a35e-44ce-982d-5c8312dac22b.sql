CREATE OR REPLACE FUNCTION public.get_remittance_checkout_order(_order_id uuid)
RETURNS TABLE(
  id uuid,
  order_number text,
  total numeric,
  advance_amount numeric,
  is_preorder boolean,
  notes text,
  payment_method text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.id,
    o.order_number,
    o.total,
    o.advance_amount,
    o.is_preorder,
    o.notes,
    o.payment_method
  FROM public.orders o
  WHERE o.id = _order_id
    AND COALESCE(o.payment_method, '') LIKE 'remittance%'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_remittance_checkout_order(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_remittance_payment(
  _order_id uuid,
  _service_key text,
  _service_label text,
  _method_key text,
  _method_label text,
  _mtcn text,
  _proof_url text,
  _ai_line text DEFAULT ''
)
RETURNS TABLE(order_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_note text;
BEGIN
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = _order_id
    AND COALESCE(payment_method, '') LIKE 'remittance%'
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Remittance order not found';
  END IF;

  IF NULLIF(trim(COALESCE(_service_key, '')), '') IS NULL
     OR NULLIF(trim(COALESCE(_method_key, '')), '') IS NULL
     OR NULLIF(trim(COALESCE(_mtcn, '')), '') IS NULL
     OR NULLIF(trim(COALESCE(_proof_url, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Missing remittance payment details';
  END IF;

  v_note := format(
    'Global Remittance via %s → %s | Ref: %s | Proof: %s%s',
    COALESCE(NULLIF(trim(_service_label), ''), trim(_service_key)),
    COALESCE(NULLIF(trim(_method_label), ''), trim(_method_key)),
    trim(_mtcn),
    trim(_proof_url),
    COALESCE(_ai_line, '')
  );

  UPDATE public.orders
  SET
    payment_method = 'remittance:' || trim(_service_key) || ':' || trim(_method_key),
    notes = concat_ws(E'\n', NULLIF(v_order.notes, ''), v_note),
    updated_at = now()
  WHERE id = v_order.id;

  RETURN QUERY SELECT v_order.order_number;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_remittance_payment(uuid, text, text, text, text, text, text, text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';