
-- Add allow_custom_image flag to categories
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS allow_custom_image boolean NOT NULL DEFAULT false;

-- Add custom_images column to order_items to store uploaded image URLs
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS custom_images text[] DEFAULT '{}'::text[];

-- Create storage bucket for customer uploaded custom images
INSERT INTO storage.buckets (id, name, public) VALUES ('custom-images', 'custom-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to upload to custom-images bucket
CREATE POLICY "Anyone can upload custom images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'custom-images');

-- Allow anyone to view custom images
CREATE POLICY "Anyone can view custom images"
ON storage.objects FOR SELECT
USING (bucket_id = 'custom-images');
