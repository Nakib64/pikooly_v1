
-- Backfill shipping_districts from delivery_mode_cities so seller dropdown works
INSERT INTO public.shipping_districts (name, delivery_fee, is_active, display_order)
SELECT DISTINCT dmc.city_name, COALESCE(dm.min_charge, 0), true, 0
FROM public.delivery_mode_cities dmc
LEFT JOIN public.delivery_modes dm ON dm.id = dmc.mode_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.shipping_districts sd
  WHERE lower(sd.name) = lower(dmc.city_name)
);

-- Trigger to auto-create shipping_districts when a city is added in Admin → Shipping
CREATE OR REPLACE FUNCTION public.sync_shipping_district_from_city()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fee numeric;
BEGIN
  SELECT COALESCE(NEW.charge_override, dm.min_charge, 0) INTO v_fee
  FROM public.delivery_modes dm WHERE dm.id = NEW.mode_id;

  INSERT INTO public.shipping_districts (name, delivery_fee, is_active, display_order)
  SELECT NEW.city_name, COALESCE(v_fee, 0), true, 0
  WHERE NOT EXISTS (
    SELECT 1 FROM public.shipping_districts sd
    WHERE lower(sd.name) = lower(NEW.city_name)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_shipping_district ON public.delivery_mode_cities;
CREATE TRIGGER trg_sync_shipping_district
AFTER INSERT ON public.delivery_mode_cities
FOR EACH ROW EXECUTE FUNCTION public.sync_shipping_district_from_city();
