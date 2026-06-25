
ALTER TABLE public.categories 
ADD COLUMN short_description text,
ADD COLUMN long_description text,
ADD COLUMN faq jsonb DEFAULT '[]'::jsonb;
