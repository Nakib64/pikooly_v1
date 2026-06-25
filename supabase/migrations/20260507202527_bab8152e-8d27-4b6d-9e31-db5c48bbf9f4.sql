
CREATE POLICY "Anyone view cat delivery modes" ON public.category_delivery_modes FOR SELECT USING (true);
CREATE POLICY "Admins manage cat delivery modes" ON public.category_delivery_modes FOR ALL
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_cat_delivery_modes_updated BEFORE UPDATE ON public.category_delivery_modes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.delivery_modes (key, name, icon, badge_text, delivery_time, charge_type, flat_charge, min_charge, max_charge, sort_order) VALUES
('fast','Fast Delivery','rocket',NULL,'2-3 Hours','range',0,250,450,1),
('standard','Standard Delivery','package',NULL,'1-3 Days','flat',120,0,0,2),
('premium','Premium Safe Delivery','shield','Protected Packaging Included','2-4 Days','range',0,450,550,3);

INSERT INTO public.delivery_mode_cities (mode_id, city_name)
SELECT m.id, c.city FROM public.delivery_modes m,
  (VALUES ('Dhaka'),('Chattogram'),('Barisal'),('Sylhet'),('Comilla'),('Rajshahi'),('Jessore')) AS c(city)
WHERE m.key='fast';