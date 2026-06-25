ALTER TABLE public.products ADD COLUMN allow_custom_image boolean NOT NULL DEFAULT false;
ALTER TABLE public.products ADD COLUMN allow_custom_text boolean NOT NULL DEFAULT false;