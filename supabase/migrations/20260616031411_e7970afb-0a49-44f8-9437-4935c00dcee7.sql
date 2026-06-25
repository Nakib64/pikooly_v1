
-- 1. Remove guest-visible orders policy (OrderSuccess uses track-order edge function)
DROP POLICY IF EXISTS "Guests can view their just-created orders" ON public.orders;

-- 2. Tighten bouquet_orders SELECT to only owner (no anonymous guest exposure)
DROP POLICY IF EXISTS "Users can view own bouquet orders" ON public.bouquet_orders;
CREATE POLICY "Users can view own bouquet orders"
  ON public.bouquet_orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = bouquet_orders.order_id
        AND o.user_id = auth.uid()
    )
  );

-- 3. Remove user self-insert on wallet_transactions; only admin / service_role may insert
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.wallet_transactions;

-- 4. Constrain admin_activity_log.action values
ALTER TABLE public.admin_activity_log
  DROP CONSTRAINT IF EXISTS admin_activity_log_action_check;
ALTER TABLE public.admin_activity_log
  ADD CONSTRAINT admin_activity_log_action_check
  CHECK (action IN (
    'login_success','login_failed','logout',
    'password_change','email_change',
    'mfa_enabled','mfa_disabled','mfa_challenge_failed',
    'order_deleted','order_restored','orders_bulk_deleted'
  ));

-- 5. Restrict custom-images uploads to image extensions
DROP POLICY IF EXISTS "Anyone can upload custom images" ON storage.objects;
CREATE POLICY "Anyone can upload custom images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'custom-images'
    AND lower(storage.extension(name)) IN ('jpg','jpeg','png','webp','gif','heic')
  );
