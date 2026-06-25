
-- 1. Orders: remove public SELECT of guest orders (track-order edge function handles lookup via service role)
DROP POLICY IF EXISTS "Anon can view guest orders on insert" ON public.orders;

-- 2. Order items: require the referenced order to belong to the user, or be a very recent guest order
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;
CREATE POLICY "Users can insert items for own or recent guest orders"
ON public.order_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (
        o.user_id = auth.uid()
        OR (o.user_id IS NULL AND o.created_at > now() - interval '1 hour')
      )
  )
);

-- 3. Event bookings: restrict SELECT to the owning authenticated user only (guest lookup must go through server)
DROP POLICY IF EXISTS "Users can view own event bookings" ON public.event_bookings;
CREATE POLICY "Users can view own event bookings"
ON public.event_bookings
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 4. Photo bookings: same restriction
DROP POLICY IF EXISTS "Users can view own photo bookings" ON public.photo_bookings;
CREATE POLICY "Users can view own photo bookings"
ON public.photo_bookings
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 5. Affiliates: remove public SELECT of full row; expose a safe lookup function instead
DROP POLICY IF EXISTS "Anyone can lookup code" ON public.affiliates;

CREATE OR REPLACE FUNCTION public.lookup_affiliate_by_code(_code text)
RETURNS TABLE(id uuid, user_id uuid, status text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, a.user_id, a.status
  FROM public.affiliates a
  WHERE a.code = _code AND a.status = 'approved'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.lookup_affiliate_by_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_affiliate_by_code(text) TO anon, authenticated;

-- 6. Admin activity log: restrict inserts to authenticated users logging their own session
DROP POLICY IF EXISTS "Anyone can insert activity log" ON public.admin_activity_log;
CREATE POLICY "Users can log own activity"
ON public.admin_activity_log
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());
