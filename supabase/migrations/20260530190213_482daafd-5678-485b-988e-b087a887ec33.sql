-- Add customer confirmation fields to loyalty_winners
ALTER TABLE public.loyalty_winners
  ADD COLUMN IF NOT EXISTS customer_confirmed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS confirmation_photo_url text,
  ADD COLUMN IF NOT EXISTS customer_feedback text,
  ADD COLUMN IF NOT EXISTS pickup_instructions text;

-- Allow winners to update their own confirmation fields
CREATE POLICY "Users confirm own gift receipt"
ON public.loyalty_winners
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
