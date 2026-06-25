
-- Drop ALL existing policies on orders and recreate as PERMISSIVE (default)
DROP POLICY IF EXISTS "Admins can manage orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;

-- Recreate as PERMISSIVE (default behavior)
CREATE POLICY "Admins can manage orders"
ON public.orders
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own orders"
ON public.orders
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can create orders"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

-- Same fix for order_items
DROP POLICY IF EXISTS "Admins can manage order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;

CREATE POLICY "Admins can manage order items"
ON public.order_items
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own order items"
ON public.order_items
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
));

CREATE POLICY "Anyone can create order items"
ON public.order_items
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
