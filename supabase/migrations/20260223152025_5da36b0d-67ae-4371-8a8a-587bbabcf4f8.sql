-- Add category column to blogs table
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS category text DEFAULT 'General';