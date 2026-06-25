
CREATE OR REPLACE FUNCTION public.update_product_review_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update for the affected product_id
  UPDATE products SET
    review_count = (SELECT COUNT(*) FROM reviews WHERE product_id = COALESCE(NEW.product_id, OLD.product_id) AND is_approved = true),
    rating = (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE product_id = COALESCE(NEW.product_id, OLD.product_id) AND is_approved = true)
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  RETURN NULL;
END;
$$;

CREATE TRIGGER update_product_review_stats_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_product_review_stats();
