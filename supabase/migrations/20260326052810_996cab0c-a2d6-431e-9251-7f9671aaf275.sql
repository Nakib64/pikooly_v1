
DROP POLICY "Anyone can insert push subscriptions" ON public.push_subscriptions;

CREATE POLICY "Authenticated users can insert push subscriptions"
ON public.push_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
