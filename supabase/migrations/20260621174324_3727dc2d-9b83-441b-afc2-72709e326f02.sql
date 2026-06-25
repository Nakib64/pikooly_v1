ALTER TABLE public.delivery_mode_cities
DROP CONSTRAINT IF EXISTS delivery_mode_cities_mode_id_city_name_key;

DROP INDEX IF EXISTS public.delivery_mode_cities_mode_id_city_name_key;
DROP INDEX IF EXISTS public.delivery_mode_cities_mode_city_thana_key;

CREATE UNIQUE INDEX delivery_mode_cities_mode_city_thana_key
ON public.delivery_mode_cities (mode_id, city_name, COALESCE(thana, ''));
