-- Email SMTP settings (single row, admin-only)
CREATE TABLE IF NOT EXISTS public.email_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'gmail',
  smtp_host text NOT NULL DEFAULT 'smtp.gmail.com',
  smtp_port integer NOT NULL DEFAULT 587,
  smtp_secure boolean NOT NULL DEFAULT false,
  smtp_username text NOT NULL,
  smtp_password text NOT NULL,
  from_email text NOT NULL,
  from_name text NOT NULL DEFAULT 'Pikooly',
  reply_to text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_settings TO authenticated;
GRANT ALL ON public.email_settings TO service_role;

ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage email settings" ON public.email_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_email_settings_updated
  BEFORE UPDATE ON public.email_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Email templates (subject + html body, editable from admin)
CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL UNIQUE,
  name text NOT NULL,
  subject text NOT NULL,
  html_body text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_templates TO authenticated;
GRANT ALL ON public.email_templates TO service_role;

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage email templates" ON public.email_templates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_email_templates_updated
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default templates
INSERT INTO public.email_templates (template_key, name, subject, html_body, description) VALUES
  ('verify_signup', 'Account Verification', 'Verify your {{site_name}} account',
   '<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#1d1d1f"><h1 style="font-size:24px;margin:0 0 16px">Welcome to {{site_name}}</h1><p style="font-size:15px;line-height:1.6;color:#424245">Hi {{name}}, please click the button below to verify your email and activate your account.</p><p style="margin:28px 0"><a href="{{action_url}}" style="background:#0071e3;color:#fff;padding:12px 24px;border-radius:980px;text-decoration:none;font-weight:500;display:inline-block">Verify Email</a></p><p style="font-size:13px;color:#86868b">Or copy this link: {{action_url}}</p><p style="font-size:13px;color:#86868b">This link expires in 24 hours.</p></div>',
   'Sent when a new user signs up'),
  ('reset_password', 'Password Reset', 'Reset your {{site_name}} password',
   '<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#1d1d1f"><h1 style="font-size:24px;margin:0 0 16px">Reset your password</h1><p style="font-size:15px;line-height:1.6;color:#424245">Hi {{name}}, click below to set a new password.</p><p style="margin:28px 0"><a href="{{action_url}}" style="background:#0071e3;color:#fff;padding:12px 24px;border-radius:980px;text-decoration:none;font-weight:500;display:inline-block">Reset Password</a></p><p style="font-size:13px;color:#86868b">If you did not request this, ignore this email. Link expires in 1 hour.</p></div>',
   'Sent for password reset requests'),
  ('seller_verify', 'Seller Account Verification', 'Verify your {{site_name}} seller account',
   '<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#1d1d1f"><h1 style="font-size:24px;margin:0 0 16px">Welcome Seller</h1><p style="font-size:15px;line-height:1.6;color:#424245">Hi {{name}}, confirm your email to access the seller dashboard.</p><p style="margin:28px 0"><a href="{{action_url}}" style="background:#0071e3;color:#fff;padding:12px 24px;border-radius:980px;text-decoration:none;font-weight:500;display:inline-block">Verify & Continue</a></p><p style="font-size:13px;color:#86868b">Link expires in 24 hours.</p></div>',
   'Sent on seller signup'),
  ('login_otp', 'Login OTP', 'Your {{site_name}} login code',
   '<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#1d1d1f"><h1 style="font-size:24px;margin:0 0 16px">Your login code</h1><p style="font-size:15px;line-height:1.6;color:#424245">Hi {{name}}, use this code to sign in:</p><p style="font-size:32px;font-weight:600;letter-spacing:8px;text-align:center;margin:28px 0;color:#0071e3">{{otp_code}}</p><p style="font-size:13px;color:#86868b">Code expires in 10 minutes. Never share this code.</p></div>',
   'OTP code for magic login')
ON CONFLICT (template_key) DO NOTHING;

-- Verification tokens (signup confirm, password reset, login OTP)
CREATE TABLE IF NOT EXISTS public.email_verification_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  otp_code text,
  purpose text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evt_token ON public.email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_evt_email_purpose ON public.email_verification_tokens(email, purpose);

GRANT SELECT ON public.email_verification_tokens TO authenticated;
GRANT ALL ON public.email_verification_tokens TO service_role;

ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all tokens" ON public.email_verification_tokens
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Email send log
CREATE TABLE IF NOT EXISTS public.custom_email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email text NOT NULL,
  subject text NOT NULL,
  template_key text,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.custom_email_log TO authenticated;
GRANT ALL ON public.custom_email_log TO service_role;

ALTER TABLE public.custom_email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view email log" ON public.custom_email_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
