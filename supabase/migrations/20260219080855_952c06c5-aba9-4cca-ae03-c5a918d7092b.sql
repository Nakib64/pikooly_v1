
-- Allow guest checkout: allow inserts where user_id is null (guest) or matches auth.uid()
DROP POLICY IF EXISTS "Users can create orders" ON public.orders;
CREATE POLICY "Anyone can create orders"
ON public.orders
FOR INSERT
WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

-- Allow guest order items insert
DROP POLICY IF EXISTS "Users can create order items" ON public.order_items;
CREATE POLICY "Anyone can create order items"
ON public.order_items
FOR INSERT
WITH CHECK (true);
