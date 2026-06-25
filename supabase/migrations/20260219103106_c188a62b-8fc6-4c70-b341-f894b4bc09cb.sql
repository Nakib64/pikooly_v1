
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can manage districts" ON public.shipping_districts;
DROP POLICY IF EXISTS "Anyone can view active districts" ON public.shipping_districts;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Admins can manage districts"
ON public.shipping_districts
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active districts"
ON public.shipping_districts
FOR SELECT
TO public
USING (is_active = true);
