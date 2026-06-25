
-- Tighten order items insert: only allow if the order exists
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;
CREATE POLICY "Anyone can create order items"
ON public.order_items
FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id));
