DROP TRIGGER IF EXISTS trg_enforce_activity_log_user_email ON public.admin_activity_log;
CREATE TRIGGER trg_enforce_activity_log_user_email
BEFORE INSERT OR UPDATE ON public.admin_activity_log
FOR EACH ROW EXECUTE FUNCTION public.enforce_activity_log_user_email();