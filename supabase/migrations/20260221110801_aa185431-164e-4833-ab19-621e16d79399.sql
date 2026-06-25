
-- Fix all public SELECT policies to be PERMISSIVE

-- PRODUCTS
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
CREATE POLICY "Anyone can view active products" ON public.products FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products" ON public.products FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- CATEGORIES
DROP POLICY IF EXISTS "Anyone can view active categories" ON public.categories;
CREATE POLICY "Anyone can view active categories" ON public.categories FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- SLIDERS
DROP POLICY IF EXISTS "Anyone can view active sliders" ON public.sliders;
CREATE POLICY "Anyone can view active sliders" ON public.sliders FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage sliders" ON public.sliders;
CREATE POLICY "Admins can manage sliders" ON public.sliders FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- BLOGS
DROP POLICY IF EXISTS "Anyone can view published blogs" ON public.blogs;
CREATE POLICY "Anyone can view published blogs" ON public.blogs FOR SELECT USING (is_published = true);

DROP POLICY IF EXISTS "Admins can manage blogs" ON public.blogs;
CREATE POLICY "Admins can manage blogs" ON public.blogs FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- SITE_SETTINGS
DROP POLICY IF EXISTS "Anyone can view settings" ON public.site_settings;
CREATE POLICY "Anyone can view settings" ON public.site_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage settings" ON public.site_settings;
CREATE POLICY "Admins can manage settings" ON public.site_settings FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- PRODUCT_CATEGORIES
DROP POLICY IF EXISTS "Anyone can view product categories" ON public.product_categories;
CREATE POLICY "Anyone can view product categories" ON public.product_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage product categories" ON public.product_categories;
CREATE POLICY "Admins can manage product categories" ON public.product_categories FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- COUPONS
DROP POLICY IF EXISTS "Anyone can view active coupons" ON public.coupons;
CREATE POLICY "Anyone can view active coupons" ON public.coupons FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupons;
CREATE POLICY "Admins can manage coupons" ON public.coupons FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- CURRENCIES
DROP POLICY IF EXISTS "Anyone can view active currencies" ON public.currencies;
CREATE POLICY "Anyone can view active currencies" ON public.currencies FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage currencies" ON public.currencies;
CREATE POLICY "Admins can manage currencies" ON public.currencies FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- SHIPPING_DISTRICTS
DROP POLICY IF EXISTS "Anyone can view active districts" ON public.shipping_districts;
CREATE POLICY "Anyone can view active districts" ON public.shipping_districts FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage districts" ON public.shipping_districts;
CREATE POLICY "Admins can manage districts" ON public.shipping_districts FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- REVIEWS
DROP POLICY IF EXISTS "Anyone can view approved reviews" ON public.reviews;
CREATE POLICY "Anyone can view approved reviews" ON public.reviews FOR SELECT USING (is_approved = true);

DROP POLICY IF EXISTS "Admins can manage reviews" ON public.reviews;
CREATE POLICY "Admins can manage reviews" ON public.reviews FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can create reviews" ON public.reviews;
CREATE POLICY "Authenticated users can create reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

-- SUBCATEGORIES
DROP POLICY IF EXISTS "Anyone can view active subcategories" ON public.subcategories;
CREATE POLICY "Anyone can view active subcategories" ON public.subcategories FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage subcategories" ON public.subcategories;
CREATE POLICY "Admins can manage subcategories" ON public.subcategories FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ORDERS
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
CREATE POLICY "Anyone can create orders" ON public.orders FOR INSERT WITH CHECK ((user_id IS NULL) OR (auth.uid() = user_id));

DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anon can view guest orders on insert" ON public.orders;
CREATE POLICY "Anon can view guest orders on insert" ON public.orders FOR SELECT USING (user_id IS NULL);

DROP POLICY IF EXISTS "Admins can manage orders" ON public.orders;
CREATE POLICY "Admins can manage orders" ON public.orders FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ORDER_ITEMS
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;
CREATE POLICY "Anyone can create order items" ON public.order_items FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
CREATE POLICY "Users can view own order items" ON public.order_items FOR SELECT USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage order items" ON public.order_items;
CREATE POLICY "Admins can manage order items" ON public.order_items FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- NEWSLETTER_SUBSCRIBERS
DROP POLICY IF EXISTS "Anyone can subscribe" ON public.newsletter_subscribers;
CREATE POLICY "Anyone can subscribe" ON public.newsletter_subscribers FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view all subscribers" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Admins can manage subscribers" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Admins can update subscribers" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Admins can delete subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Admins can manage subscribers" ON public.newsletter_subscribers FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- PROFILES
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- USER_ROLES
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
