
-- Create shipping_districts table
CREATE TABLE public.shipping_districts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  delivery_fee NUMERIC NOT NULL DEFAULT 0,
  delivery_label TEXT DEFAULT 'Standard Delivery',
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shipping_districts ENABLE ROW LEVEL SECURITY;

-- Anyone can view active districts
CREATE POLICY "Anyone can view active districts"
  ON public.shipping_districts FOR SELECT
  USING (is_active = true);

-- Admins can manage districts
CREATE POLICY "Admins can manage districts"
  ON public.shipping_districts FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_shipping_districts_updated_at
  BEFORE UPDATE ON public.shipping_districts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default districts
INSERT INTO public.shipping_districts (name, delivery_fee, delivery_label, display_order) VALUES
  ('Dhaka', 60, 'Same Day Delivery', 1),
  ('Chattogram', 120, 'Standard Delivery', 2),
  ('Rajshahi', 120, 'Standard Delivery', 3),
  ('Khulna', 120, 'Standard Delivery', 4),
  ('Sylhet', 120, 'Standard Delivery', 5),
  ('Barishal', 120, 'Standard Delivery', 6),
  ('Rangpur', 120, 'Standard Delivery', 7),
  ('Mymensingh', 120, 'Standard Delivery', 8);
