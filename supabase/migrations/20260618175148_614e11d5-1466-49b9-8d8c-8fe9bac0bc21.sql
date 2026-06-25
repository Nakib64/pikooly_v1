-- 1) Prevent user_email spoofing in admin_activity_log
CREATE OR REPLACE FUNCTION public.enforce_activity_log_user_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.user_id IS NULL OR NEW.user_id <> auth.uid() THEN
    NEW.user_id := auth.uid();
  END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  NEW.user_email := v_email;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_activity_log_user_email_trg ON public.admin_activity_log;
CREATE TRIGGER enforce_activity_log_user_email_trg
BEFORE INSERT OR UPDATE ON public.admin_activity_log
FOR EACH ROW EXECUTE FUNCTION public.enforce_activity_log_user_email();

-- 2) Realtime channel RLS for order + seller notification topics
-- Helper to check if calling user owns the order behind a topic like "order:<uuid>"
CREATE OR REPLACE FUNCTION public.can_subscribe_realtime_topic(_topic text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RETURN false; END IF;
  IF public.has_role(v_uid, 'admin') THEN RETURN true; END IF;

  -- order topics: "orders:<uuid>" or "order:<uuid>"
  IF _topic ~ '^(orders?:)[0-9a-fA-F-]{36}$' THEN
    v_id := substring(_topic from '[0-9a-fA-F-]{36}$')::uuid;
    RETURN EXISTS (
      SELECT 1 FROM public.orders o WHERE o.id = v_id AND o.user_id = v_uid
    ) OR EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.sellers s ON s.id = o.assigned_seller_id
      WHERE o.id = v_id AND s.user_id = v_uid AND s.is_active = true
    );
  END IF;

  -- seller notification topics: "seller_notifications:<seller_uuid>" or "seller:<seller_uuid>"
  IF _topic ~ '^(seller_notifications:|seller:)[0-9a-fA-F-]{36}$' THEN
    v_id := substring(_topic from '[0-9a-fA-F-]{36}$')::uuid;
    RETURN EXISTS (
      SELECT 1 FROM public.sellers s
      WHERE s.id = v_id AND s.user_id = v_uid AND s.is_active = true
    );
  END IF;

  -- Default: deny realtime subscriptions for sensitive topics. Allow other named channels.
  -- Block any topic that contains the word "orders" or "seller_notifications"
  IF _topic ILIKE '%orders%' OR _topic ILIKE '%seller_notifications%' THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- Enable RLS on realtime.messages (no-op if already enabled)
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can subscribe allowed topics" ON realtime.messages;
CREATE POLICY "Authenticated users can subscribe allowed topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (public.can_subscribe_realtime_topic(realtime.topic()));