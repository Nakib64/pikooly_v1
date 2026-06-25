-- Add a SELECT policy for anon users to read orders where user_id IS NULL
-- This allows guest checkout to read back the inserted order via RETURNING
CREATE POLICY "Anon can view guest orders on insert"
ON public.orders
FOR SELECT
TO anon
USING (user_id IS NULL);
