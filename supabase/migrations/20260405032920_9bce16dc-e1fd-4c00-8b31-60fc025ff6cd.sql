DROP POLICY IF EXISTS "Anyone can view public settings" ON public.site_settings;

CREATE POLICY "Anyone can view public settings"
ON public.site_settings
FOR SELECT
TO public
USING (
  (key NOT IN (
    'eps_password', 'eps_hash_key', 'eps_merchant_id', 'eps_store_id', 'eps_username',
    'stripe_secret_key', 'stripe_public_key',
    'bkash_app_key', 'bkash_app_secret', 'bkash_username', 'bkash_password',
    'nagad_private_key', 'nagad_public_key', 'nagad_merchant_id', 'nagad_merchant_number',
    'ssl_store_id', 'ssl_store_password',
    'paypal_client_secret', 'paypal_client_id', 'paypal_app_id',
    'flutterwave_secret_key', 'flutterwave_public_key', 'flutterwave_encryption_key',
    'social_google_client_id', 'social_google_client_secret',
    'social_facebook_app_id', 'social_facebook_app_secret',
    'social_apple_client_id', 'social_apple_client_secret',
    'nexmo_key', 'license_code',
    'cloudinary_cloud_name', 'cloudinary_api_key', 'cloudinary_api_secret'
  ))
  OR has_role(auth.uid(), 'admin'::app_role)
);