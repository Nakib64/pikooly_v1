
-- Device tokens
CREATE TABLE public.device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id uuid REFERENCES public.sellers(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  platform text NOT NULL DEFAULT 'web',
  device_info jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX device_tokens_user_idx ON public.device_tokens(user_id);
CREATE INDEX device_tokens_seller_idx ON public.device_tokens(seller_id);
CREATE INDEX device_tokens_active_idx ON public.device_tokens(is_active);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_tokens TO authenticated;
GRANT ALL ON public.device_tokens TO service_role;
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own tokens"
  ON public.device_tokens FOR ALL TO authenticated
  USING (user_id = auth.uid() OR seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid()))
  WITH CHECK (user_id = auth.uid() OR seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid()));

CREATE POLICY "Admins manage all device tokens"
  ON public.device_tokens FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_device_tokens_updated_at BEFORE UPDATE ON public.device_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notification templates
CREATE TABLE public.notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL UNIQUE,
  label text NOT NULL,
  title_template text NOT NULL DEFAULT '',
  body_template text NOT NULL DEFAULT '',
  click_url_template text DEFAULT '/',
  variables text[] NOT NULL DEFAULT ARRAY[]::text[],
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.notification_templates TO anon, authenticated;
GRANT ALL ON public.notification_templates TO service_role;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read templates"
  ON public.notification_templates FOR SELECT
  USING (true);

CREATE POLICY "Admins manage templates"
  ON public.notification_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_notification_templates_updated_at BEFORE UPDATE ON public.notification_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.notification_templates (event_key, label, title_template, body_template, click_url_template, variables) VALUES
  ('order_placed', 'Order Placed', 'Order Placed', 'Hi {{customer_name}}, your order {{order_number}} has been placed.', '/account', ARRAY['customer_name','order_number','order_total']),
  ('order_confirmed', 'Order Confirmed', 'Order Confirmed', 'Hi {{customer_name}}, your order {{order_number}} is confirmed.', '/account', ARRAY['customer_name','order_number']),
  ('order_on_the_way', 'Order On The Way', 'Order On The Way', 'Hi {{customer_name}}, your order {{order_number}} is on the way.', '/account', ARRAY['customer_name','order_number']),
  ('order_delivered', 'Order Delivered', 'Order Delivered', 'Hi {{customer_name}}, your order {{order_number}} has been delivered.', '/account', ARRAY['customer_name','order_number']),
  ('order_cancelled', 'Order Cancelled', 'Order Cancelled', 'Hi {{customer_name}}, your order {{order_number}} was cancelled.', '/account', ARRAY['customer_name','order_number']),
  ('admin_new_order', 'New Order (Admin)', 'New Order Received', 'New order {{order_number}} from {{customer_name}} totalling {{order_total}}.', '/admin/orders', ARRAY['customer_name','order_number','order_total']),
  ('seller_new_order', 'New Order (Seller)', 'New Order Assigned', 'You have a new order {{order_number}} for {{customer_name}}.', '/seller/dashboard', ARRAY['customer_name','order_number']),
  ('offer_promo', 'Offer / Promo', '{{title}}', '{{body}}', '/', ARRAY['title','body']);

-- Notification logs
CREATE TABLE public.notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text,
  provider text NOT NULL DEFAULT 'fcm',
  target_type text NOT NULL,
  target_value text,
  title text,
  body text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  tokens_total int NOT NULL DEFAULT 0,
  tokens_success int NOT NULL DEFAULT 0,
  tokens_failed int NOT NULL DEFAULT 0,
  response jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  triggered_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notification_logs_created_idx ON public.notification_logs(created_at DESC);
CREATE INDEX notification_logs_event_idx ON public.notification_logs(event_key);
CREATE INDEX notification_logs_status_idx ON public.notification_logs(status);

GRANT SELECT ON public.notification_logs TO authenticated;
GRANT ALL ON public.notification_logs TO service_role;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view logs"
  ON public.notification_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage logs"
  ON public.notification_logs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
