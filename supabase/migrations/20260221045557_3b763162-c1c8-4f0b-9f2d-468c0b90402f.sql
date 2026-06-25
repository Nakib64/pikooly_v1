
ALTER TABLE public.categories 
ADD COLUMN category_type text NOT NULL DEFAULT 'category';

COMMENT ON COLUMN public.categories.category_type IS 'Type: occasion or category';
