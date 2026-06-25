CREATE TABLE public.ad_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL CHECK (event_type IN ('impression','click')),
  placement text NOT NULL,
  page_path text,
  slot_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ad_events_created_at_idx ON public.ad_events (created_at DESC);
CREATE INDEX ad_events_placement_idx ON public.ad_events (placement);

GRANT SELECT, INSERT ON public.ad_events TO anon;
GRANT SELECT, INSERT ON public.ad_events TO authenticated;
GRANT ALL ON public.ad_events TO service_role;

ALTER TABLE public.ad_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert ad events"
ON public.ad_events FOR INSERT
TO anon, authenticated
WITH CHECK (event_type IN ('impression','click') AND length(placement) <= 80 AND length(coalesce(page_path,'')) <= 500 AND length(coalesce(slot_id,'')) <= 40);

CREATE POLICY "Admins can read ad events"
ON public.ad_events FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));