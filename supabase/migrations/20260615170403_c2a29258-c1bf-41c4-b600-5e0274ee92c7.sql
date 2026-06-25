
-- Helper: returns true if current user is an active seller for given district
CREATE OR REPLACE FUNCTION public.is_seller_for_district(_district_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sellers
    WHERE user_id = auth.uid()
      AND is_active = true
      AND district_id = _district_id
  )
$$;

-- Allow sellers to view orders in their district
DROP POLICY IF EXISTS "Sellers view district orders" ON public.orders;
CREATE POLICY "Sellers view district orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  district_id IS NOT NULL
  AND deleted_at IS NULL
  AND public.is_seller_for_district(district_id)
);

-- Allow sellers to update orders in their district (status updates)
DROP POLICY IF EXISTS "Sellers update district orders" ON public.orders;
CREATE POLICY "Sellers update district orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  district_id IS NOT NULL
  AND deleted_at IS NULL
  AND public.is_seller_for_district(district_id)
)
WITH CHECK (
  district_id IS NOT NULL
  AND public.is_seller_for_district(district_id)
);

-- Also allow sellers to view order_items for orders they can view
DROP POLICY IF EXISTS "Sellers view district order items" ON public.order_items;
CREATE POLICY "Sellers view district order items"
ON public.order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND o.district_id IS NOT NULL
      AND o.deleted_at IS NULL
      AND public.is_seller_for_district(o.district_id)
  )
);
