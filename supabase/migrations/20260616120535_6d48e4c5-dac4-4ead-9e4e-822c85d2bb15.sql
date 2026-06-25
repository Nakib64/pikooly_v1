CREATE TABLE IF NOT EXISTS public.search_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_key text NOT NULL UNIQUE,
  query_text text NOT NULL,
  count integer NOT NULL DEFAULT 1,
  last_searched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.search_queries TO anon, authenticated;
GRANT ALL ON public.search_queries TO service_role;

ALTER TABLE public.search_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read search queries"
  ON public.search_queries FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert search queries"
  ON public.search_queries FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update search counts"
  ON public.search_queries FOR UPDATE
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_search_queries_count ON public.search_queries (count DESC, last_searched_at DESC);

CREATE OR REPLACE FUNCTION public.log_search_query(_query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text;
  v_clean text;
BEGIN
  v_clean := btrim(_query);
  IF v_clean IS NULL OR length(v_clean) < 2 OR length(v_clean) > 200 THEN RETURN; END IF;
  v_key := lower(v_clean);
  INSERT INTO public.search_queries (query_key, query_text, count, last_searched_at)
  VALUES (v_key, v_clean, 1, now())
  ON CONFLICT (query_key) DO UPDATE
    SET count = public.search_queries.count + 1,
        last_searched_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_search_query(text) TO anon, authenticated;