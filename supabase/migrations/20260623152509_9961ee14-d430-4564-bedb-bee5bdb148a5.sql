
UPDATE public.bouquet_flowers bf SET
  same_day_districts = COALESCE(ARRAY(SELECT d FROM unnest(bf.same_day_districts) d WHERE d IN (SELECT name FROM public.shipping_districts)), '{}'),
  next_day_districts = COALESCE(ARRAY(SELECT d FROM unnest(bf.next_day_districts) d WHERE d IN (SELECT name FROM public.shipping_districts)), '{}'),
  available_districts = COALESCE(ARRAY(SELECT d FROM unnest(bf.available_districts) d WHERE d IN (SELECT name FROM public.shipping_districts)), '{}'),
  same_day_thanas = COALESCE(ARRAY(
    SELECT t FROM unnest(bf.same_day_thanas) t
    WHERE EXISTS (SELECT 1 FROM public.upazilas u JOIN public.shipping_districts sd ON sd.id=u.district_id WHERE sd.name=split_part(t,'||',1) AND u.name=split_part(t,'||',2))
  ), '{}'),
  next_day_thanas = COALESCE(ARRAY(
    SELECT t FROM unnest(bf.next_day_thanas) t
    WHERE EXISTS (SELECT 1 FROM public.upazilas u JOIN public.shipping_districts sd ON sd.id=u.district_id WHERE sd.name=split_part(t,'||',1) AND u.name=split_part(t,'||',2))
  ), '{}');
