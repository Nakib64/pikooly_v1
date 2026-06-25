ALTER TABLE public.sellers ALTER COLUMN district_id DROP NOT NULL;
ALTER TABLE public.sellers DROP CONSTRAINT IF EXISTS sellers_district_id_fkey;
ALTER TABLE public.sellers ADD CONSTRAINT sellers_district_id_fkey FOREIGN KEY (district_id) REFERENCES public.shipping_districts(id) ON DELETE SET NULL;