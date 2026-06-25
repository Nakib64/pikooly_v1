ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS upazila_id uuid REFERENCES public.upazilas(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_sellers_upazila ON public.sellers(upazila_id);