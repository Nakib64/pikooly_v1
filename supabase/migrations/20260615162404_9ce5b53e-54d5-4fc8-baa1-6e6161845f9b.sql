CREATE OR REPLACE FUNCTION public.claim_seller_by_email()
RETURNS public.sellers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
  v_seller public.sellers;
BEGIN
  IF v_user_id IS NULL THEN RETURN NULL; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
  IF v_email IS NULL THEN RETURN NULL; END IF;

  UPDATE public.sellers
     SET user_id = v_user_id, updated_at = now()
   WHERE user_id IS NULL
     AND lower(email) = lower(v_email)
  RETURNING * INTO v_seller;

  RETURN v_seller;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_seller_by_email() TO authenticated;