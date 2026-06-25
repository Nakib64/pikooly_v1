-- Add new array column for multi-select category types
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS category_types text[] NOT NULL DEFAULT ARRAY[]::text[];

-- Backfill from existing single category_type column
UPDATE public.categories 
SET category_types = ARRAY[category_type]
WHERE category_type IS NOT NULL AND category_type != '' AND (category_types IS NULL OR array_length(category_types, 1) IS NULL);

-- Index for faster array lookups
CREATE INDEX IF NOT EXISTS idx_categories_category_types ON public.categories USING GIN (category_types);