
-- 1. Add can_edit_seo flag on sellers
ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS can_edit_seo boolean NOT NULL DEFAULT false;

-- 2. Add seller ownership + approval on products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS seller_id uuid REFERENCES public.sellers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS rejection_reason text;

CREATE INDEX IF NOT EXISTS idx_products_seller_id ON public.products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_approval_status ON public.products(approval_status);

-- Constrain approval_status values
DO $$ BEGIN
  ALTER TABLE public.products
    ADD CONSTRAINT products_approval_status_check
    CHECK (approval_status IN ('pending', 'approved', 'rejected'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Helper: is current user the owner-seller of this product row?
CREATE OR REPLACE FUNCTION public.is_product_owner_seller(_seller_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sellers s
    WHERE s.id = _seller_id
      AND s.user_id = auth.uid()
      AND s.is_active = true
  );
$$;

-- 4. Guard trigger: force pending + inactive on seller-owned writes;
--    strip SEO fields if seller lacks permission.
CREATE OR REPLACE FUNCTION public.seller_product_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean := public.has_role(auth.uid(), 'admin');
  v_seller public.sellers;
BEGIN
  -- Admins bypass all guards
  IF v_is_admin THEN
    RETURN NEW;
  END IF;

  -- Only enforce when row has a seller_id
  IF NEW.seller_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_seller FROM public.sellers WHERE id = NEW.seller_id;
  IF NOT FOUND OR v_seller.user_id <> auth.uid() THEN
    RETURN NEW; -- RLS will block; nothing to enforce
  END IF;

  -- Force moderation state on seller writes
  NEW.approval_status := 'pending';
  NEW.is_active := false;
  NEW.is_featured := false;
  NEW.rating := 0;
  NEW.review_count := 0;

  -- Strip SEO if not allowed
  IF NOT COALESCE(v_seller.can_edit_seo, false) THEN
    IF TG_OP = 'UPDATE' THEN
      NEW.seo_title := OLD.seo_title;
      NEW.seo_description := OLD.seo_description;
    ELSE
      NEW.seo_title := NULL;
      NEW.seo_description := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seller_product_guard ON public.products;
CREATE TRIGGER trg_seller_product_guard
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.seller_product_guard();

-- 5. RLS: let sellers manage their own products
DROP POLICY IF EXISTS "Sellers can view own products" ON public.products;
CREATE POLICY "Sellers can view own products"
  ON public.products FOR SELECT
  TO authenticated
  USING (
    seller_id IS NOT NULL
    AND public.is_product_owner_seller(seller_id)
  );

DROP POLICY IF EXISTS "Sellers can insert own products" ON public.products;
CREATE POLICY "Sellers can insert own products"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (
    seller_id IS NOT NULL
    AND public.is_product_owner_seller(seller_id)
  );

DROP POLICY IF EXISTS "Sellers can update own products" ON public.products;
CREATE POLICY "Sellers can update own products"
  ON public.products FOR UPDATE
  TO authenticated
  USING (
    seller_id IS NOT NULL
    AND public.is_product_owner_seller(seller_id)
  )
  WITH CHECK (
    seller_id IS NOT NULL
    AND public.is_product_owner_seller(seller_id)
  );

DROP POLICY IF EXISTS "Sellers can delete own products" ON public.products;
CREATE POLICY "Sellers can delete own products"
  ON public.products FOR DELETE
  TO authenticated
  USING (
    seller_id IS NOT NULL
    AND public.is_product_owner_seller(seller_id)
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
