
-- Restore missing triggers (previously existed; functions still present)

-- Auto-generate order_number on new orders
DROP TRIGGER IF EXISTS trg_generate_order_number ON public.orders;
CREATE TRIGGER trg_generate_order_number
BEFORE INSERT ON public.orders
FOR EACH ROW
WHEN (NEW.order_number IS NULL OR NEW.order_number = '' OR NEW.order_number = 'temp')
EXECUTE FUNCTION public.generate_order_number();

-- Auto-generate booking numbers
DROP TRIGGER IF EXISTS trg_generate_event_booking_number ON public.event_bookings;
CREATE TRIGGER trg_generate_event_booking_number
BEFORE INSERT ON public.event_bookings
FOR EACH ROW
WHEN (NEW.booking_number IS NULL OR NEW.booking_number = '' OR NEW.booking_number = 'temp')
EXECUTE FUNCTION public.generate_event_booking_number();

DROP TRIGGER IF EXISTS trg_generate_photo_booking_number ON public.photo_bookings;
CREATE TRIGGER trg_generate_photo_booking_number
BEFORE INSERT ON public.photo_bookings
FOR EACH ROW
WHEN (NEW.booking_number IS NULL OR NEW.booking_number = '' OR NEW.booking_number = 'temp')
EXECUTE FUNCTION public.generate_photo_booking_number();

-- Affiliate commission processing on order status change
DROP TRIGGER IF EXISTS trg_process_affiliate_commission ON public.orders;
CREATE TRIGGER trg_process_affiliate_commission
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.process_affiliate_commission();

-- Notify affiliate when commission credited
DROP TRIGGER IF EXISTS trg_notify_commission_credited ON public.affiliate_commissions;
CREATE TRIGGER trg_notify_commission_credited
AFTER INSERT ON public.affiliate_commissions
FOR EACH ROW
EXECUTE FUNCTION public.notify_commission_credited();

-- Review stats aggregation
DROP TRIGGER IF EXISTS trg_update_product_review_stats ON public.reviews;
CREATE TRIGGER trg_update_product_review_stats
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_product_review_stats();
