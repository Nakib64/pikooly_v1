
-- Tracking number on orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_number text;

-- Status history
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  changed_by uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.order_status_history TO authenticated;
GRANT ALL ON public.order_status_history TO service_role;

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage status history"
ON public.order_status_history FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Sellers view district status history"
ON public.order_status_history FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.orders o
  WHERE o.id = order_status_history.order_id
    AND o.district_id IS NOT NULL
    AND public.is_seller_for_district(o.district_id)
));

CREATE POLICY "Sellers insert district status history"
ON public.order_status_history FOR INSERT
TO authenticated
WITH CHECK (
  changed_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_status_history.order_id
      AND o.district_id IS NOT NULL
      AND public.is_seller_for_district(o.district_id)
  )
);

CREATE POLICY "Users view own order status history"
ON public.order_status_history FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.orders o
  WHERE o.id = order_status_history.order_id
    AND o.user_id = auth.uid()
    AND o.deleted_at IS NULL
));

CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON public.order_status_history(order_id, created_at DESC);
