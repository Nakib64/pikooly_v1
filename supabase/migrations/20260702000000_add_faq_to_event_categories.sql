ALTER TABLE public.event_categories 
ADD COLUMN IF NOT EXISTS faq jsonb DEFAULT '[]'::jsonb;
