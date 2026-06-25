CREATE POLICY "Guests can view their just-created orders"
ON public.orders
FOR SELECT
TO anon, authenticated
USING (user_id IS NULL AND deleted_at IS NULL AND created_at > (now() - interval '1 hour'));